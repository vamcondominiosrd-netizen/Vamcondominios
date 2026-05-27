"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { supabase } from "@/app/lib/supabaseClient";

type ParsedRow = {
  fecha: string | null;
  monto: number;
  referencia: string | null;
  descripcion: string | null;
};

function excelDateToISO(v: any): string | null {
  if (v == null || v === "") return null;

  // Si viene como número excel (ej: 46024)
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const yyyy = String(d.y).padStart(4, "0");
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Si viene como string (ya formateado)
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;

    // si ya es YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // intentar parse normal
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return dt.toISOString();
    return s;
  }

  // si viene como Date
  if (v instanceof Date) {
    return v.toISOString();
  }

  return String(v);
}

export default function ImportarPagosPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [condominioId, setCondominioId] = useState<number>(2); // por defecto Lote 11 (condominio_id=2)
  const [clientId] = useState<number>(1); // por ahora fijo
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleUpload() {
    setMsg(null);

    if (!file) {
      setMsg("Selecciona un archivo Excel primero.");
      return;
    }

    setLoading(true);

    try {
      // 1) Sacar UUID del usuario logueado (IMPORTANTE para uploaded_by)
      const { data: s, error: sErr } = await supabase.auth.getSession();
      if (sErr) throw new Error(sErr.message);

      const uid = s.session?.user?.id;
      if (!uid) {
        setLoading(false);
        setMsg("No hay sesión. Inicia sesión y vuelve a intentar.");
        return;
      }

      // 2) Leer excel en el navegador
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];

      // Convierte a JSON (usa encabezados de la primera fila)
      const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // 3) Mapear columnas (ajusta aquí si tu banco cambia nombres)
      // Ejemplo que tú mostraste:
      // "Fecha Posteo", "Monto Transacción", "No. Referencia", "Descripción"
      const rows: ParsedRow[] = raw
        .map((r) => {
          const fecha = excelDateToISO(r["Fecha Posteo"] ?? r["Fecha"] ?? r["fecha"]);
          const monto = Number(r["Monto Transacción"] ?? r["Monto"] ?? r["monto"]);
          const referenciaRaw = r["No. Referencia"] ?? r["Referencia"] ?? r["referencia"] ?? "";
          const descripcionRaw = r["Descripción"] ?? r["Descripcion"] ?? r["descripcion"] ?? "";

          if (!monto || isNaN(monto)) return null;

          return {
            fecha,
            monto,
            referencia: String(referenciaRaw || "").trim() || null,
            descripcion: String(descripcionRaw || "").trim() || null,
          } as ParsedRow;
        })
        .filter(Boolean) as ParsedRow[];

      if (rows.length === 0) {
        setLoading(false);
        setMsg("No pude leer filas válidas del Excel. Revisa columnas y montos.");
        return;
      }

      // 4) Enviar al backend
      const res = await fetch("/api/bank-import/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          condominio_id: condominioId,
          filename: file.name,
          uploaded_by: uid, // ✅ UUID requerido por tu tabla
          rows,
        }),
      });

      const out = await res.json();

      if (!res.ok) {
        setLoading(false);
        setMsg(out?.error || "Error subiendo archivo");
        return;
      }

      setLoading(false);
      setMsg(`✅ Import creado: #${out.import_id} | Transacciones: ${out.inserted_transactions} | Auto OK: ${out.auto_ok}`);

      // ir directo a la revisión
      router.push(`/pagos/importar/${out.import_id}`);
    } catch (e: any) {
      setLoading(false);
      setMsg(e?.message || "Error inesperado");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border shadow-sm p-4">
        <h1 className="text-xl font-semibold text-slate-800">Importar Pagos (Banco)</h1>
        <p className="text-sm text-slate-600 mt-2">
          Sube el Excel del banco. El sistema creará una importación y te llevará a la pantalla de revisión.
        </p>

        <div className="mt-4 grid gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-slate-700">Condominio ID:</label>
            <input
              type="number"
              className="border rounded-lg px-3 py-2 text-sm w-32"
              value={condominioId}
              onChange={(e) => setCondominioId(Number(e.target.value))}
            />
            <span className="text-xs text-slate-500">(Ej: Lote 11 = 2)</span>
          </div>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
          />

          <button
            onClick={handleUpload}
            disabled={loading}
            className="rounded-xl bg-amber-500 text-white px-4 py-2 text-sm disabled:opacity-60 w-fit"
          >
            {loading ? "Subiendo..." : "Subir Excel y crear importación"}
          </button>

          {msg && (
            <div className="rounded-xl bg-slate-50 border p-3 text-sm text-slate-700">
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
