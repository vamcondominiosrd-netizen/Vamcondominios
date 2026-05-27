"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Gasto = {
  id: number;
  fecha: string;
  concepto: string;
  detalle_gasto: string;
  total: number;
  estado: string;
  factura_url: string | null;
  cheque_url?: string | null;
  numero_cheque?: string | null;
  fecha_pago?: string | null;

  catalogo_proveedores?: {
    nombre_proveedor: string;
  };
};

export default function AprobacionPresidentePage() {

  const [condominioNombre, setCondominioNombre] =
    useState("");

  const [gastos, setGastos] =
    useState<Gasto[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {

    const nombre =
      localStorage.getItem(
        "condominio_nombre"
      ) || "";

    setCondominioNombre(nombre);

    if (nombre) {
      cargarPendientes(nombre);
    }

  }, []);

  async function cargarPendientes(
    nombre: string
  ) {

    setLoading(true);

    const { data, error } =
      await supabase
        .from("gastos")
        .select(`
          id,
          fecha,
          concepto,
          detalle_gasto,
          total,
          estado,
          factura_url,
          cheque_url,
          numero_cheque,
          fecha_pago,
          catalogo_proveedores(nombre_proveedor)
        `)
        .eq(
          "condominio",
          nombre
        )
        .eq(
          "estado",
          "Aprobado por tesorero"
        )
        .order(
          "fecha",
          {
            ascending: false,
          }
        );

    setLoading(false);

    if (error) {

      alert(
        "Error cargando pagos: " +
          error.message
      );

      return;
    }

    setGastos(
      (data as Gasto[]) || []
    );
  }

  async function aprobar(
    g: Gasto
  ) {

    const confirmar =
      confirm(
        `¿Aprobar este pago?\n\n${g.concepto}`
      );

    if (!confirmar) return;

    const { error } =
      await supabase
        .from("gastos")
        .update({
          aprobado_presidente:
            true,

          fecha_aprobacion_presidente:
            new Date().toISOString(),

          estado:
            "Aprobado por presidente",
        })
        .eq("id", g.id)
        .eq(
          "condominio",
          condominioNombre
        );

    if (error) {

      alert(
        "Error aprobando: " +
          error.message
      );

      return;
    }

    alert(
      "Pago aprobado por presidente."
    );

    cargarPendientes(
      condominioNombre
    );
  }

  async function rechazar(
    g: Gasto
  ) {

    const motivo =
      prompt(
        "Indique el motivo del rechazo:"
      );

    if (!motivo) return;

    const { error } =
      await supabase
        .from("gastos")
        .update({
          estado:
            "Rechazado por presidente",

          detalle_gasto:
            `${g.detalle_gasto || ""}

Motivo rechazo presidente:
${motivo}`,
        })
        .eq("id", g.id)
        .eq(
          "condominio",
          condominioNombre
        );

    if (error) {

      alert(
        "Error rechazando: " +
          error.message
      );

      return;
    }

    alert(
      "Pago rechazado."
    );

    cargarPendientes(
      condominioNombre
    );
  }

  const totalPendiente =
    gastos.reduce(
      (sum, g) =>
        sum +
        Number(g.total || 0),
      0
    );

  return (
    <div className="space-y-6">

      <div className="bg-white rounded-2xl border shadow-sm p-5">

        <h1 className="text-3xl font-bold">
          Aprobación Presidente
        </h1>

        <p className="text-slate-500 mt-1">

          Condominio activo:
          {" "}

          <strong>
            {condominioNombre}
          </strong>

        </p>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-white rounded-2xl border shadow-sm p-5">

          <p className="text-sm text-slate-500">
            Solicitudes pendientes
          </p>

          <h2 className="text-2xl font-bold">
            {gastos.length}
          </h2>

        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">

          <p className="text-sm text-slate-500">
            Monto pendiente
          </p>

          <h2 className="text-2xl font-bold text-red-700">

            RD$

            {totalPendiente.toLocaleString(
              "es-DO",
              {
                minimumFractionDigits: 2,
              }
            )}

          </h2>

        </div>

      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        <div className="p-4 border-b">

          <h2 className="font-bold">
            Pagos aprobados por tesorería
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
                    Fecha
                  </th>

                  <th className="px-4 py-3 text-left">
                    Proveedor
                  </th>

                  <th className="px-4 py-3 text-left">
                    Concepto
                  </th>

                  <th className="px-4 py-3 text-right">
                    Total
                  </th>

                  <th className="px-4 py-3 text-center">
                    Factura
                  </th>

                  <th className="px-4 py-3 text-center">
                    Acción
                  </th>

                </tr>

              </thead>

              <tbody>

                {gastos.map(
                  (g) => (

                    <tr
                      key={g.id}
                      className="border-t"
                    >

                      <td className="px-4 py-3">
                        {g.fecha}
                      </td>

                      <td className="px-4 py-3">

                        {
                          g
                            .catalogo_proveedores
                            ?.nombre_proveedor
                        }

                      </td>

                      <td className="px-4 py-3">
                        {g.concepto}
                      </td>

                      <td className="px-4 py-3 text-right font-bold">

                        RD$

                        {Number(
                          g.total
                        ).toLocaleString(
                          "es-DO",
                          {
                            minimumFractionDigits: 2,
                          }
                        )}

                      </td>

                      <td className="px-4 py-3 text-center">

                        {g.factura_url ? (

                          <a
                            href={
                              g.factura_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-900 text-white px-3 py-1 rounded-lg"
                          >
                            Ver
                          </a>

                        ) : (

                          "Sin factura"

                        )}

                      </td>

                      <td className="px-4 py-3 text-center">

                        <div className="flex gap-2 justify-center">

                          <button
                            onClick={() =>
                              aprobar(g)
                            }
                            className="bg-green-700 text-white px-3 py-1 rounded-lg"
                          >
                            Aprobar
                          </button>

                          <button
                            onClick={() =>
                              rechazar(g)
                            }
                            className="bg-red-700 text-white px-3 py-1 rounded-lg"
                          >
                            Rechazar
                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )}

                {gastos.length ===
                  0 && (

                  <tr>

                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay pagos pendientes para aprobación presidencial.
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