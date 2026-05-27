"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Kpis = {
  unidades_activas: number;
  ingresos_mes: number;
  gastos_mes: number;
};

function money(n: number) {
  return `RD$ ${Number(n || 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white border shadow-sm p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-800">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      const condominioIdStr = localStorage.getItem("condominio_id");
      const condominioId = condominioIdStr ? Number(condominioIdStr) : null;

      const { data, error } = await supabase.rpc("get_dashboard_kpis", {
        p_condominio_id: condominioId,
      });

      if (error) {
        setMsg(error.message);
        setKpis(null);
      } else {
        // Supabase devuelve array (una fila)
        const row = Array.isArray(data) ? data[0] : data;
        setKpis({
          unidades_activas: Number(row?.unidades_activas ?? 0),
          ingresos_mes: Number(row?.ingresos_mes ?? 0),
          gastos_mes: Number(row?.gastos_mes ?? 0),
        });
      }

      setLoading(false);
    })();
  }, []);

  const balance = (kpis?.ingresos_mes ?? 0) - (kpis?.gastos_mes ?? 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border shadow-sm p-4">
        <h1 className="text-xl font-semibold text-slate-800">Dashboard financiero</h1>
        <p className="text-sm text-slate-500 mt-1">
          Resumen del mes actual (filtrado por el condominio seleccionado).
        </p>

        {msg && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-slate-700">
            {msg}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Cargando KPIs...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Unidades activas" value={`${kpis?.unidades_activas ?? 0}`} />
          <Card title="Ingresos del mes" value={money(kpis?.ingresos_mes ?? 0)} />
          <Card title="Gastos del mes" value={money(kpis?.gastos_mes ?? 0)} />
          <Card title="Balance del mes" value={money(balance)} sub="Ingresos - Gastos" />
        </div>
      )}
    </div>
  );
}
