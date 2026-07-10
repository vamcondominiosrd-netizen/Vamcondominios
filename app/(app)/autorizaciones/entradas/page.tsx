"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, DoorOpen, RefreshCw } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type EntradaHoy = {
  id: number;
  autorizacion_id: number;
  condominio_id: number;
  tipo_movimiento: string;
  fecha_movimiento: string;
  hora_movimiento: string | null;
  registrado_por: string | null;
  observacion: string | null;
  autorizaciones: {
    codigo_autorizacion: string | null;
    condominio: string | null;
    unidad: string | null;
    propietario: string | null;
    tipo_solicitud: string | null;
    nombre_visitante: string | null;
    cedula_visitante: string | null;
    empresa: string | null;
    vehiculo_placa: string | null;
  } | null;
};

export default function EntradasHoyPage() {
  const [entradas, setEntradas] = useState<EntradaHoy[]>([]);
  const [loading, setLoading] = useState(true);

  function fechaHoyISO() {
    return new Date().toISOString().slice(0, 10);
  }

  async function cargarEntradas() {
    setLoading(true);

    const { data, error } = await supabase
      .from("autorizaciones_accesos")
      .select(`
        id,
        autorizacion_id,
        condominio_id,
        tipo_movimiento,
        fecha_movimiento,
        hora_movimiento,
        registrado_por,
        observacion,
        autorizaciones (
          codigo_autorizacion,
          condominio,
          unidad,
          propietario,
          tipo_solicitud,
          nombre_visitante,
          cedula_visitante,
          empresa,
          vehiculo_placa
        )
      `)
      .eq("tipo_movimiento", "Entrada")
      .eq("fecha_movimiento", fechaHoyISO())
      .order("hora_movimiento", { ascending: false });

    if (error) {
      console.error("Error cargando entradas:", error);
      alert("Error cargando entradas de hoy");
    } else {
      setEntradas((data || []) as EntradaHoy[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    cargarEntradas();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/autorizaciones"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al módulo
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              Entradas de Hoy
            </h1>
            <p className="text-sm text-slate-500">
              Personas, técnicos, proveedores y servicios que ingresaron hoy.
            </p>
          </div>

          <button
            onClick={cargarEntradas}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </button>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                <DoorOpen className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-slate-900">
                {entradas.length}
              </span>
            </div>
            <h2 className="mt-4 font-bold text-slate-900">
              Total Entradas
            </h2>
            <p className="text-sm text-slate-500">
              Registradas en el día
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-bold text-slate-900">
              Listado de entradas
            </h2>
            <p className="text-sm text-slate-500">
              Fecha: {fechaHoyISO()}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Condominio</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Propietario</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Visitante</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Placa</th>
                  <th className="px-4 py-3">Registrado Por</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Cargando entradas...
                    </td>
                  </tr>
                ) : entradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay entradas registradas hoy.
                    </td>
                  </tr>
                ) : (
                  entradas.map((item, index) => (
                    <tr
                      key={`${item.id}-${item.autorizacion_id}-${index}`}
                      className="border-t"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.hora_movimiento || "--:--"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.autorizaciones?.codigo_autorizacion || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.autorizaciones?.condominio || "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.autorizaciones?.unidad || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.autorizaciones?.propietario || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.autorizaciones?.tipo_solicitud || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.autorizaciones?.nombre_visitante || "-"}
                        <br />
                        <span className="text-xs text-slate-500">
                          {item.autorizaciones?.cedula_visitante || ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.autorizaciones?.empresa || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.autorizaciones?.vehiculo_placa || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.registrado_por || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}