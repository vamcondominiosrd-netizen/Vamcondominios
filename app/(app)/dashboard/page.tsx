"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { getCondominioActual } from "../../lib/condominioActual";

export default function DashboardPage() {

  const router = useRouter();

  const condominio =
    getCondominioActual();

  const [totalUnidades, setTotalUnidades] =
    useState(0);

  const [totalPagos, setTotalPagos] =
    useState(0);

  const [totalGastos, setTotalGastos] =
    useState(0);

  const [balanceBanco, setBalanceBanco] =
    useState(0);

  const [pendienteTesorero, setPendienteTesorero] =
    useState(0);

  const [pendientePresidente, setPendientePresidente] =
    useState(0);

  const [pendienteTesoreria, setPendienteTesoreria] =
    useState(0);

  const [morosidad, setMorosidad] =
    useState(0);

  useEffect(() => {

    if (!condominio.id) {

      router.push("/login");

      return;
    }

    cargarDashboard();

  }, []);

  async function cargarDashboard() {

    // TOTAL UNIDADES

    const {
      count: unidadesCount
    } = await supabase
      .from("unidades")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "condominio_id",
        condominio.id
      );

    setTotalUnidades(
      unidadesCount || 0
    );

    // PAGOS

    const {
      data: pagosData
    } = await supabase
      .from("pagos")
      .select("monto")
      .eq(
        "condominio_id",
        condominio.id
      );

    const pagosTotal =
      pagosData?.reduce(
        (
          acc: number,
          item: any
        ) =>
          acc +
          Number(
            item.monto || 0
          ),
        0
      ) || 0;

    setTotalPagos(
      pagosTotal
    );

    // GASTOS

    const {
      data: gastosData
    } = await supabase
      .from("gastos")
      .select("total")
      .eq(
        "condominio_id",
        condominio.id
      )
      .eq(
        "pagado",
        true
      );

    const gastosTotal =
      gastosData?.reduce(
        (
          acc: number,
          item: any
        ) =>
          acc +
          Number(
            item.total || 0
          ),
        0
      ) || 0;

    setTotalGastos(
      gastosTotal
    );

    // BALANCE BANCO

    setBalanceBanco(
      pagosTotal -
        gastosTotal
    );

    // TESORERO

    const {
      count:
        tesoreroCount
    } = await supabase
      .from("gastos")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "condominio_id",
        condominio.id
      )
      .eq(
        "estado",
        "Pendiente aprobación tesorero"
      );

    setPendienteTesorero(
      tesoreroCount || 0
    );

    // PRESIDENTE

    const {
      count:
        presidenteCount
    } = await supabase
      .from("gastos")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "condominio_id",
        condominio.id
      )
      .eq(
        "estado",
        "Aprobado por tesorero"
      );

    setPendientePresidente(
      presidenteCount || 0
    );

    // TESORERIA

    const {
      count:
        tesoreriaCount
    } = await supabase
      .from("gastos")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "condominio_id",
        condominio.id
      )
      .eq(
        "estado",
        "Aprobado por presidente"
      );

    setPendienteTesoreria(
      tesoreriaCount || 0
    );

    // MOROSIDAD

    const {
      data: cargosData
    } = await supabase
      .from("cargos")
      .select("balance_pendiente")
      .eq(
        "condominio_id",
        condominio.id
      );

    const moraTotal =
      cargosData?.reduce(
        (
          acc: number,
          item: any
        ) =>
          acc +
          Number(
            item.balance_pendiente ||
              0
          ),
        0
      ) || 0;

    setMorosidad(
      moraTotal
    );
  }

  if (!condominio.id) {
    return null;
  }

  return (
    <main className="p-6 space-y-6">

      <div className="flex items-center gap-4">

        {condominio.logoUrl && (

          <img
            src={
              condominio.logoUrl
            }
            alt={
              condominio.nombre
            }
            className="h-20 w-20 object-contain rounded-xl border bg-white p-2"
          />

        )}

        <div>

          <h1 className="text-3xl font-bold text-slate-800">
            Dashboard Financiero
          </h1>

          <p className="text-slate-500">
            {condominio.nombre}
          </p>

        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <Card
          title="Total Unidades"
          value={String(
            totalUnidades
          )}
          color="text-slate-800"
        />

        <Card
          title="Ingresos"
          value={`RD$ ${totalPagos.toLocaleString()}`}
          color="text-green-700"
        />

        <Card
          title="Gastos"
          value={`RD$ ${totalGastos.toLocaleString()}`}
          color="text-red-700"
        />

        <Card
          title="Balance Banco"
          value={`RD$ ${balanceBanco.toLocaleString()}`}
          color="text-blue-700"
        />

      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <Card
          title="Pendiente Tesorero"
          value={String(
            pendienteTesorero
          )}
          color="text-yellow-700"
        />

        <Card
          title="Pendiente Presidente"
          value={String(
            pendientePresidente
          )}
          color="text-indigo-700"
        />

        <Card
          title="Pendiente Tesorería"
          value={String(
            pendienteTesoreria
          )}
          color="text-orange-700"
        />

        <Card
          title="Morosidad"
          value={`RD$ ${morosidad.toLocaleString()}`}
          color="text-red-800"
        />

      </div>

    </main>
  );
}

function Card({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {

  return (

    <div className="bg-white rounded-2xl shadow p-6 border">

      <p className="text-slate-500 text-sm mb-2">
        {title}
      </p>

      <h2
        className={`text-3xl font-bold ${color}`}
      >
        {value}
      </h2>

    </div>

  );
}