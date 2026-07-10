"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Solicitud = {
  id: number;
  codigo_autorizacion: string | null;
  condominio: string | null;
  unidad: string | null;
  propietario: string | null;
  tipo_solicitud: string | null;
  nombre_visitante: string | null;
  cedula_visitante: string | null;
  empresa: string | null;
  vehiculo_placa: string | null;
  fecha_entrada: string | null;
  fecha_salida: string | null;
  usuario_entrada: string | null;
  usuario_salida: string | null;
  tiempo_total_minutos: number | null;
};

export default function AutorizacionesFinalizadasPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);

  async function cargarSolicitudes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("autorizaciones")
      .select(`
        id,
        codigo_autorizacion,
        condominio,
        unidad,
        propietario,
        tipo_solicitud,
        nombre_visitante,
        cedula_visitante,
        empresa,
        vehiculo_placa,
        fecha_entrada,
        fecha_salida,
        usuario_entrada,
        usuario_salida,
        tiempo_total_minutos
      `)
      .eq("estado", "Finalizada")
      .order("fecha_salida", { ascending: false });

    if (error) {
      console.error("Error cargando finalizadas:", error);
      alert("Error cargando solicitudes finalizadas");
    } else {
      setSolicitudes(data || []);
    }

    setLoading(false);
  }

  function formatoFecha(fecha: string | null) {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleString("es-DO");
  }

  function formatoTiempo(minutos: number | null) {
    const total = Number(minutos || 0);
    const horas = Math.floor(total / 60);
    const mins = total % 60;

    if (horas <= 0) return `${mins} min`;
    return `${horas}h ${mins}m`;
  }

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const finalizadasHoy = solicitudes.filter((item) => {
    if (!item.fecha_salida) return false;

    const salida = new Date(item.fecha_salida);
    const hoy = new Date();

    return (
      salida.getFullYear() === hoy.getFullYear() &&
      salida.getMonth() === hoy.getMonth() &&
      salida.getDate() === hoy.getDate()
    );
  }).length;

  const tiempoPromedio =
    solicitudes.length > 0
      ? Math.round(
          solicitudes.reduce(
            (acc, item) => acc + Number(item.tiempo_total_minutos || 0),
            0
          ) / solicitudes.length
        )
      : 0;

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
              Solicitudes Finalizadas
            </h1>
            <p className="text-sm text-slate-500">
              Historial de autorizaciones cerradas con entrada, salida y tiempo de permanencia.
            </p>
          </div>

          <button
            onClick={cargarSolicitudes}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </button>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-green-100 p-3 text-green-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-slate-900">
                {solicitudes.length}
              </span>
            </div>
            <h2 className="mt-4 font-bold text-slate-900">
              Total Finalizadas
            </h2>
            <p className="text-sm text-slate-500">
              Autorizaciones cerradas
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-slate-900">
                {finalizadasHoy}
              </span>
            </div>
            <h2 className="mt-4 font-bold text-slate-900">
              Finalizadas Hoy
            </h2>
            <p className="text-sm text-slate-500">
              Salidas registradas hoy
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-slate-900">
                {formatoTiempo(tiempoPromedio)}
              </span>
            </div>
            <h2 className="mt-4 font-bold text-slate-900">
              Tiempo Promedio
            </h2>
            <p className="text-sm text-slate-500">
              Permanencia promedio
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-bold text-slate-900">
              Historial finalizado
            </h2>
            <p className="text-sm text-slate-500">
              Total registros: {solicitudes.length}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Condominio</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Propietario</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Visitante</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Placa</th>
                  <th className="px-4 py-3">Entrada</th>
                  <th className="px-4 py-3">Salida</th>
                  <th className="px-4 py-3">Tiempo</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Cargando solicitudes finalizadas...
                    </td>
                  </tr>
                ) : solicitudes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay solicitudes finalizadas.
                    </td>
                  </tr>
                ) : (
                  solicitudes.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.codigo_autorizacion || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.condominio || "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.unidad || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.propietario || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.tipo_solicitud || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.nombre_visitante || "-"}
                        <br />
                        <span className="text-xs text-slate-500">
                          {item.cedula_visitante || ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.empresa || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.vehiculo_placa || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatoFecha(item.fecha_entrada)}
                        <br />
                        <span className="text-xs text-slate-500">
                          {item.usuario_entrada || ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatoFecha(item.fecha_salida)}
                        <br />
                        <span className="text-xs text-slate-500">
                          {item.usuario_salida || ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {formatoTiempo(item.tiempo_total_minutos)}
                        </span>
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