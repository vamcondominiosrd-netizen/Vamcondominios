"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Unidad = {
  id: number;
  codigo: string;
};

type Cargo = {
  id: number;
  periodo: string;
  concepto: string;
  tipo_cargo: string;
  monto: number;
  monto_pagado: number;
  balance: number;
  estado: string;
};

export default function EstadoCuentaPage() {

  const [condominioId, setCondominioId] =
    useState("");

  const [unidades, setUnidades] =
    useState<Unidad[]>([]);

  const [unidadId, setUnidadId] =
    useState("");

  const [cargos, setCargos] =
    useState<Cargo[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {

    const id =
      localStorage.getItem("condominio_id");

    if (!id) return;

    setCondominioId(id);

    cargarUnidades(id);

  }, []);

  async function cargarUnidades(id: string) {

    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .order("codigo");

    if (error) {
      alert(error.message);
      return;
    }

    setUnidades(data || []);
  }

  async function cargarEstadoCuenta(
    unidad: string
  ) {

    setLoading(true);

    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select(`
        id,
        periodo,
        concepto,
        tipo_cargo,
        monto,
        monto_pagado,
        balance,
        estado
      `)
      .eq("condominio_id", Number(condominioId))
      .eq("unidad_id", Number(unidad))
      .order("anio", {
        ascending: true,
      })
      .order("mes", {
        ascending: true,
      });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setCargos(data || []);
  }

  const totalFacturado =
    cargos.reduce(
      (sum, c) =>
        sum + Number(c.monto || 0),
      0
    );

  const totalPagado =
    cargos.reduce(
      (sum, c) =>
        sum +
        Number(
          c.monto_pagado || 0
        ),
      0
    );

  const balancePendiente =
    cargos.reduce(
      (sum, c) =>
        sum + Number(c.balance || 0),
      0
    );

  return (
    <div className="space-y-6">

      <div className="bg-white rounded-2xl border shadow-sm p-5">

        <h1 className="text-3xl font-bold">
          Estado de Cuenta
        </h1>

      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <select
            value={unidadId}
            onChange={(e) => {

              setUnidadId(
                e.target.value
              );

              cargarEstadoCuenta(
                e.target.value
              );
            }}
            className="border rounded-xl px-4 py-3"
          >

            <option value="">
              Seleccione unidad
            </option>

            {unidades.map((u) => (
              <option
                key={u.id}
                value={u.id}
              >
                {u.codigo}
              </option>
            ))}

          </select>

          <div className="bg-slate-50 rounded-xl p-4 border">

            <p className="text-sm text-slate-500">
              Total facturado
            </p>

            <h2 className="text-2xl font-bold mt-2">
              RD$ {totalFacturado.toLocaleString()}
            </h2>

          </div>

          <div className="bg-slate-50 rounded-xl p-4 border">

            <p className="text-sm text-slate-500">
              Balance pendiente
            </p>

            <h2 className="text-2xl font-bold text-red-600 mt-2">
              RD$ {balancePendiente.toLocaleString()}
            </h2>

          </div>

        </div>

      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        <div className="p-4 border-b">

          <h2 className="font-bold">
            Detalle mensual
          </h2>

        </div>

        {loading ? (

          <div className="p-6">
            Cargando...
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-50">

                <tr>

                  <th className="px-4 py-3 text-left">
                    Periodo
                  </th>

                  <th className="px-4 py-3 text-left">
                    Concepto
                  </th>

                  <th className="px-4 py-3 text-left">
                    Tipo
                  </th>

                  <th className="px-4 py-3 text-right">
                    Facturado
                  </th>

                  <th className="px-4 py-3 text-right">
                    Pagado
                  </th>

                  <th className="px-4 py-3 text-right">
                    Balance
                  </th>

                  <th className="px-4 py-3 text-center">
                    Estado
                  </th>

                </tr>

              </thead>

              <tbody>

                {cargos.map((c) => (

                  <tr
                    key={c.id}
                    className="border-t hover:bg-slate-50"
                  >

                    <td className="px-4 py-3 font-medium">
                      {c.periodo}
                    </td>

                    <td className="px-4 py-3">
                      {c.concepto}
                    </td>

                    <td className="px-4 py-3">
                      {c.tipo_cargo}
                    </td>

                    <td className="px-4 py-3 text-right">
                      RD$ {Number(c.monto).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right text-green-600 font-bold">
                      RD$ {Number(c.monto_pagado).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right text-red-600 font-bold">
                      RD$ {Number(c.balance).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-center">

                      <span
                        className={
                          c.estado === "PAGADO"
                            ? "bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold"
                            : c.estado === "PARCIAL"
                            ? "bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-xs font-bold"
                            : "bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-bold"
                        }
                      >

                        {c.estado}

                      </span>

                    </td>

                  </tr>

                ))}

                {!loading &&
                  cargos.length === 0 && (

                  <tr>

                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No hay cargos generados.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}