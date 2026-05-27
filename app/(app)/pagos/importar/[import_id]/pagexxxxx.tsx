"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Row = {
  transaction_id: number;
  fecha: string | null;
  monto: number;
  referencia: string | null;
  descripcion: string | null;
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
  }

  useEffect(() => {
    if (importId) load();
  }, [importId]);

  const ok = rows.filter((r) => r.estado === "OK").length;
  const revisar = rows.filter((r) => r.estado !== "OK").length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border shadow-sm p-4">
        <h1 className="text-xl font-semibold text-slate-800">
          Revisión Import #{importId}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {loading ? "Cargando..." : `OK: ${ok} · Revisar: ${revisar} · Total: ${rows.length}`}
        </p>

        {msg && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-slate-700">
            {msg}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="p-4 border-b text-sm text-slate-600">
          Transacciones del banco (staging)
        </div>

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
                  <td className="px-4 py-3">{r.unidad_codigo ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-lg border text-xs">
                      {r.estado} ({r.confianza})
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.descripcion ?? "-"}</td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-500 text-center">
                    No hay datos para este import.
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
