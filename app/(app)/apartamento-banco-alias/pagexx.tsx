"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/app/lib/supabaseClient";

type BancoRow = {
  fecha_posteo: string | null;
  monto_transaccion: number;
  no_serial: string;
  descripcion: string;
};

export default function ImportarArchivoBancoPage() {
  const [rows, setRows] = useState<BancoRow[]>([]);
  const [loading, setLoading] = useState(false);

  function normalizarFecha(value: any) {
    if (!value) return null;

    if (typeof value === "number") {
      const fecha = XLSX.SSF.parse_date_code(value);
      if (!fecha) return null;
      const yyyy = fecha.y;
      const mm = String(fecha.m).padStart(2, "0");
      const dd = String(fecha.d).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }

    const d = new Date(value);
    if (isNaN(d.getTime())) return null;

    return d.toISOString().slice(0, 10);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet);

      const mapped: BancoRow[] = json.map((r) => ({
        fecha_posteo: normalizarFecha(r["Fecha Posteo"]),
        monto_transaccion: Number(r["Monto Transacción"] || 0),
        no_serial: String(r["No Serial"] || ""),
        descripcion: String(r["Descripción"] || ""),
      }));

      setRows(mapped);
    };

    reader.readAsArrayBuffer(file);
  }

  async function guardarEnSupabase() {
    if (rows.length === 0) {
      alert("No hay datos para importar.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("archivo_banco").insert(rows);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Error al guardar los datos: " + error.message);
      return;
    }

    alert("Archivo importado correctamente.");
    setRows([]);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar Archivo del Banco</h1>
        <p className="text-gray-600">
          Suba el archivo Excel enviado por el banco para copiarlo a la tabla archivo_banco.
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-white">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="block w-full"
        />
      </div>

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Vista previa: {rows.length} registros
            </h2>

            <button
              onClick={guardarEnSupabase}
              disabled={loading}
              className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar en Archivo Banco"}
            </button>
          </div>

          <div className="overflow-auto border rounded-lg bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Fecha Posteo</th>
                  <th className="p-2 border">Monto Transacción</th>
                  <th className="p-2 border">No Serial</th>
                  <th className="p-2 border">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="p-2 border">{r.fecha_posteo}</td>
                    <td className="p-2 border text-right">
                      RD${r.monto_transaccion.toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 border">{r.no_serial}</td>
                    <td className="p-2 border">{r.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
