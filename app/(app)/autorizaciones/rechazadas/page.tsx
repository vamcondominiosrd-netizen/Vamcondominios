"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, XCircle } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type SolicitudRechazada = {
  id: number;
  codigo_autorizacion: string | null;
  condominio: string | null;
  unidad: string | null;
  propietario: string | null;
  tipo_solicitud: string | null;
  fecha_programada: string | null;
  hora_entrada: string | null;
  nombre_visitante: string | null;
  cedula_visitante: string | null;
  empresa: string | null;
  vehiculo_placa: string | null;
  motivo_rechazo: string | null;
  observacion_admin: string | null;
  rechazado_por: string | null;
  fecha_rechazo: string | null;
};

export default function SolicitudesRechazadasPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudRechazada[]>([]);
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
        fecha_programada,
        hora_entrada,
        nombre_visitante,
        cedula_visitante,
        empresa,
        vehiculo_placa,
        motivo_rechazo,
        observacion_admin,
        rechazado_por,
        fecha_rechazo
      `)
      .eq("estado", "Rechazada")
      .order("fecha_rechazo", { ascending: false });

    if (error) {
      console.error("Error cargando rechazadas:", error);
      alert("Error cargando solicitudes rechazadas");
    } else {
      setSolicitudes(data || []);
    }

    setLoading(false);
  }

  function formatoFecha(fecha: string | null) {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleString("es-DO");
  }

  useEffect(() => {
    cargarSolicitudes();
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
              Solicitudes Rechazadas
            </h1>
            <p className="text-sm text-slate-500">
              Historial de solicitudes no aprobadas por administración.
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
              <div className="rounded-2xl bg-red-100 p-3 text-red-700">
                <XCircle className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-slate-900">
                {solicitudes.length}
              </span>
            </div>
            <h2 className="mt-4 font-bold text-slate-900">
              Total Rechazadas
            </h2>
            <p className="text-sm text-slate-500">
              Solicitudes no aprobadas
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-bold text-slate-900">
              Listado de rechazos
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
                  <th className="px-4 py-3">Fecha/Hora</th>
                  <th className="px-4 py-3">Visitante</th>
                  <th className="px-4 py-3">Empresa/Placa</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Rechazado Por</th>
                  <th className="px-4 py-3">Fecha Rechazo</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Cargando solicitudes rechazadas...
                    </td>
                  </tr>
                ) : solicitudes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay solicitudes rechazadas.
                    </td>
                  </tr>
                ) : (
                  solicitudes.map((item, index) => (
                    <tr
                      key={`${item.id}-${item.codigo_autorizacion}-${index}`}
                      className="border-t"
                    >
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
                        {item.fecha_programada || "-"}
                        <br />
                        <span className="text-xs text-slate-500">
                          {item.hora_entrada || "--:--"}
                        </span>
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
                        <br />
                        <span className="text-xs text-slate-500">
                          {item.vehiculo_placa || ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.motivo_rechazo ||
                          item.observacion_admin ||
                          "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.rechazado_por || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatoFecha(item.fecha_rechazo)}
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