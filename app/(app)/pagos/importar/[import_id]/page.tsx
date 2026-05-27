"use client";

export const runtime = "edge";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Row = {
  transaction_id: number;
  fecha: string | null;
  monto: number;
  referencia: string | null;
  descripcion: string | null;
  condominio_id?: number | null;
  unidad_codigo: string | null;
  estado: string;
  confianza: string;
  nota: string | null;
};

export default function ReviewPage() {
  const params = useParams<{ import_id: string }>();
  const importId = Number(params?.import_id);

  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [unidades, setUnidades] = useState<{ id: number; codigo: string }[]>([]);

  // ✅ Botón APLICAR
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);

    const res = await fetch(`/api/bank-import/${importId}`);
    const out = await res.json();

    setLoading(false);

    if (!res.ok) {
      setMsg(out?.error || "Error cargando import");
      return;
    }

    setRows(out.rows || []);

    // ✅ cargar unidades del condominio
    const condo = out.rows?.[0]?.condominio_id ?? null;
    if (condo) {
      const ures = await fetch(`/api/unidades/by-condominio?condominio_id=${condo}`);
      const uout = await ures.json();
      if (ures.ok) setUnidades(uout.unidades || []);
    } else {
      setUnidades([]);
    }
  }

  async function aplicar() {
    setApplyMsg(null);
    setApplying(true);

    const res = await fetch("/api/bank-import/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ import_id: importId }),
    });

    const out = await res.json();
    setApplying(false);

    if (!res.ok) {
      setApplyMsg(out?.error || "Error aplicando");
      return;
    }

    setApplyMsg(`✅ Aplicado. Pagos creados: ${out.inserted}`);
  }

  async function guardarAlias(row: Row) {
    // Solo permitir alias si ya está OK y tiene unidad
    if (row.estado !== "OK" || !row.unidad_codigo) {
      alert("Primero asigna la unidad para que quede OK.");
      return;
    }

    const condo = rows?.[0]?.condominio_id ?? null;
    if (!condo) {
      alert("No se encontró condominio_id.");
      return;
    }

    // Buscar unidad_id por codigo
    const u = unidades.find((x) => x.codigo === row.unidad_codigo);
    if (!u) {
      alert("No se encontró unidad_id para ese código. Revisa el catálogo de unidades.");
      return;
    }

    // Alias recomendado: una parte estable del texto
    const alias_text = prompt(
      "¿Qué texto quieres guardar como alias?\n\nSugerencia: usa un nombre o número de cuenta que se repita.",
      row.descripcion ?? ""
    );

    if (!alias_text || !alias_text.trim()) return;

    const res = await fetch("/api/bank-alias/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: 1, // ✅ por ahora fijo
        condominio_id: condo,
        alias_text: alias_text.trim(),
        unidad_id: u.id,
        unidad_codigo: u.codigo,
      }),
    });

    const out = await res.json();
    if (!res.ok) {
      alert(out?.error || "Error guardando alias");
      return;
    }

    alert("✅ Alias guardado. En la próxima importación se marcará OK automáticamente.");
  }

  useEffect(() => {
    if (importId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importId]);

  const ok = rows.filter((r) => r.estado === "OK").length;
  const revisar = rows.filter((r) => r.estado !== "OK").length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border shadow-sm p-4">
        <h1 className="text-xl font-semibold text-slate-800">Revisión Import #{importId}</h1>

        {/* ✅ BOTÓN APLICAR */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <button
            onClick={aplicar}
            disabled={applying}
            className="rounded-xl bg-amber-500 text-white px-4 py-2 text-sm disabled:opacity-60"
          >
            {applying ? "Aplicando..." : "APLICAR (crear pagos)"}
          </button>

          {applyMsg && <div className="text-sm text-slate-700">{applyMsg}</div>}
        </div>

        <p className="text-sm text-slate-600 mt-3">
          {loading ? "Cargando..." : `OK: ${ok} · Revisar: ${revisar} · Total: ${rows.length}`}
        </p>

        {msg && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-slate-700">
            {msg}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white border shadow-sm p-4 text-sm text-slate-700">
        Filas: {rows.length} | Unidades cargadas: {unidades.length} | Condo: {rows?.[0]?.condominio_id ?? "?"}
      </div>

      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-left">Unidad</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.transaction_id} className="border-t">
                  <td className="px-4 py-3">{r.fecha ?? "-"}</td>

                  <td className="px-4 py-3 text-right">RD$ {Number(r.monto).toFixed(2)}</td>

                  <td className="px-4 py-3">
                    {r.estado === "OK" ? (
                      <span className="font-medium">{r.unidad_codigo ?? "-"}</span>
                    ) : (
                      <select
                        className="border rounded-lg px-2 py-1 text-sm"
                        defaultValue=""
                        onChange={async (e) => {
                          const unidadId = Number(e.target.value);
                          const u = unidades.find((x) => x.id === unidadId);
                          if (!u) return;

                          const res = await fetch("/api/bank-match/update", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              transaction_id: r.transaction_id,
                              unidad_id: u.id,
                              unidad_codigo: u.codigo,
                            }),
                          });

                          const out = await res.json();
                          if (!res.ok) {
                            alert(out?.error || "Error actualizando match");
                            return;
                          }

                          await load();
                        }}
                      >
                        <option value="">Elegir…</option>
                        {unidades.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.codigo}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-lg border text-xs">
                      {r.estado} ({r.confianza})
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div>{r.descripcion ?? "-"}</div>

                    {/* ✅ Guardar alias */}
                    <div className="mt-2">
                      <button
                        type="button"
                        className="text-xs underline text-slate-600"
                        onClick={() => guardarAlias(r)}
                      >
                        Guardar alias
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No hay datos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
