"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { getCondominioActual } from "../../lib/condominioActual";

export default function DashboardPage() {
  const router = useRouter();

  const condominio = getCondominioActual();

  const [totalUnidades, setTotalUnidades] = useState(0);
  const [totalPagos, setTotalPagos] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);

  useEffect(() => {
    if (!condominio.id) {
      router.push("/login");
      return;
    }

    cargarDashboard();
  }, []);

  async function cargarDashboard() {

    // TOTAL UNIDADES
    const { count: unidadesCount } = await supabase
      .from("unidades")
      .select("*", { count: "exact", head: true })
      .eq("condominio_id", condominio.id);

    setTotalUnidades(unidadesCount || 0);

    // TOTAL PAGOS
    const { data: pagosData } = await supabase
      .from("pagos")
      .select("monto")
      .eq("condominio_id", condominio.id);

    const pagosTotal =
      pagosData?.reduce(
        (acc: number, item: any) => acc + Number(item.monto || 0),
        0
      ) || 0;

    setTotalPagos(pagosTotal);

    // TOTAL GASTOS
    const { data: gastosData } = await supabase
      .from("gastos")
      .select("monto")
      .eq("condominio_id", condominio.id);

    const gastosTotal =
      gastosData?.reduce(
        (acc: number, item: any) => acc + Number(item.monto || 0),
        0
      ) || 0;

    setTotalGastos(gastosTotal);
  }

  if (!condominio.id) {
    return null;
  }

  return (
    <main className="p-6">

      <div className="flex items-center gap-4 mb-8">

        {condominio.logoUrl && (
          <img
            src={condominio.logoUrl}
            alt={condominio.nombre}
            className="h-20 w-20 object-contain rounded-xl border bg-white p-2"
          />
        )}

        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Dashboard
          </h1>

          <p className="text-slate-500">
            {condominio.nombre}
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white rounded-2xl shadow p-6 border">
          <p className="text-slate-500 text-sm mb-2">
            Total Unidades
          </p>

          <h2 className="text-4xl font-bold text-slate-800">
            {totalUnidades}
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border">
          <p className="text-slate-500 text-sm mb-2">
            Total Pagos
          </p>

          <h2 className="text-4xl font-bold text-green-600">
            RD$ {totalPagos.toLocaleString()}
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border">
          <p className="text-slate-500 text-sm mb-2">
            Total Gastos
          </p>

          <h2 className="text-4xl font-bold text-red-600">
            RD$ {totalGastos.toLocaleString()}
          </h2>
        </div>

      </div>

    </main>
  );
}