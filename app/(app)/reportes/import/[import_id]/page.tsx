"use client";

export const runtime = "edge";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ReporteImportPage() {
  const params = useParams();
  const importId = Number((params as any)?.import_id);

  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!Number.isFinite(importId) || importId <= 0) {
      setMsg(`import_id inválido en la URL: "${(params as any)?.import_id}"`);
      return;
    }

    setLoading(true);
    setMsg(null);

    const res = await fetch(`/api/reportes/import/${importId}`);
    const out = await res.json();

    setLoading(false);

    if (!res.ok) {
      setMsg(out?.error || "Error cargando reporte");
      return;
    }

    setData(out);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importId]);

  const s = data?.summary;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border shadow-sm p-4">
        <h1 className="text-xl font-semibold text-slate-800">
          Reporte de Validación — Import #{Number.isFinite(importId) ? importId : "?"}
        </h1>

        {loading && <p className="text-sm text-slate-600 mt-2">Cargando...</p>}

        {msg && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-slate-700">
            {msg}
          </div>
        )}
      </div>

      {s && (
        <div className="rounded-2xl bg-white border shadow-sm p-4 text-sm text-slate-700">
          <div><b>Transacciones:</b> {s.tx_total}</div>
          <div><b>OK:</b> {s.ok_total}</div>
          <div><b>Revisar:</b> {s.revisar_total}</div>
          <div><b>Total Banco:</b> RD$ {Number(s.total_banco).toFixed(2)}</div>
          <div><b>Total OK:</b> RD$ {Number(s.total_ok).toFixed(2)}</div>
          <div><b>Total Revisar:</b> RD$ {Number(s.total_revisar).toFixed(2)}</div>
          <div><b>OK sin unidad:</b> {s.ok_sin_unidad}</div>
          <div><b>Duplicados hash:</b> {s.duplicados_hash}</div>
        </div>
      )}
    </div>
  );
}
