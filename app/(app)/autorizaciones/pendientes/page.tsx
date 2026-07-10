"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Solicitud = {
  id: number;
  codigo_autorizacion: string | null;
  condominio: string | null;
  unidad: string | null;
  propietario: string | null;
  tipo_solicitud: string | null;
  fecha_programada: string;
  hora_entrada: string | null;
  nombre_visitante: string | null;
  cedula_visitante: string | null;
  vehiculo_placa: string | null;
  estado: string | null;
  balance_pendiente: number | null;
  meses_atraso: number | null;
  estado_financiero: string | null;
};

export default function SolicitudesPendientesPage() {
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
        fecha_programada,
        hora_entrada,
        nombre_visitante,
        cedula_visitante,
        vehiculo_placa,
        estado,
        balance_pendiente,
        meses_atraso,
        estado_financiero
      `)
      .eq("estado", "Pendiente")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando pendientes:", error);
      alert("Error cargando solicitudes pendientes");
    } else {
      setSolicitudes(data || []);
    }

    setLoading(false);
  }

  async function aprobarSolicitud(id: number) {
    const confirmar = confirm("¿Desea aprobar esta solicitud?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("autorizaciones")
      .update({
        estado: "Aprobada",
        aprobado_por: "Administrador",
        fecha_aprobacion: new Date().toISOString(),
        observacion_admin: "Solicitud aprobada desde pendientes.",
      })
      .eq("id", id);

    if (error) {
      console.error("Error aprobando:", error);
      alert("Error aprobando solicitud");
      return;
    }

    await cargarSolicitudes();
  }

  async function rechazarSolicitud(id: number) {
    const motivo = prompt("Indique el motivo del rechazo:");
    if (!motivo) return;

    const { error } = await supabase
      .from("autorizaciones")
      .update({
        estado: "Rechazada",
        rechazado_por: "Administrador",
        fecha_rechazo: new Date().toISOString(),
        motivo_rechazo: motivo,
        observacion_admin: motivo,
      })
      .eq("id", id);

    if (error) {
      console.error("Error rechazando:", error);
      alert("Error rechazando solicitud");
      return;
    }

    await cargarSolicitudes();
  }

  async function aprobarExcepcion(id: number) {
    const motivo = prompt("Motivo de aprobación por excepción:");
    if (!motivo) return;

    const { error } = await supabase
      .from("autorizaciones")
      .update({
        estado: "Aprobada",
        requiere_excepcion: true,
        motivo_excepcion: motivo,
        aprobado_por: "Administrador",
        fecha_aprobacion: new Date().toISOString(),
        observacion_admin: `Aprobada por excepción: ${motivo}`,
      })
      .eq("id", id);

    if (error) {
      console.error("Error aprobando excepción:", error);
      alert("Error aprobando por excepción");
      return;
    }

    await cargarSolicitudes();
  }

  function claseFinanciera(balance: number | null, meses: number | null) {
    const b = Number(balance || 0);
    const m = Number(meses || 0);

    if (b <= 0 && m <= 0) return "bg-green-100 text-green-700";
    if (m <= 2) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  }

  function textoFinanciero(balance: number | null, meses: number | null) {
    const b = Number(balance || 0);
    const m = Number(meses || 0);

    if (b <= 0 && m <= 0) return "Al día";
    if (m <= 2) return "Con observación";
    return "Con atraso";
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
              Solicitudes Pendientes
            </h1>
            <p className="text-sm text-slate-500">
              Revisión, aprobación, rechazo y aprobación por excepción.
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

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-bold text-slate-900">
              Pendientes de aprobación
            </h2>
            <p className="text-sm text-slate-500">
              Total pendientes: {solicitudes.length}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Condominio</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Propietario</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Fecha/Hora</th>
                  <th className="px-4 py-3">Visitante</th>
                  <th className="px-4 py-3">Placa</th>
                  <th className="px-4 py-3">Estado Financiero</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Cargando solicitudes...
                    </td>
                  </tr>
                ) : solicitudes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay solicitudes pendientes.
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
                        {item.fecha_programada}
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
                        {item.vehiculo_placa || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${claseFinanciera(
                            item.balance_pendiente,
                            item.meses_atraso
                          )}`}
                        >
                          {textoFinanciero(
                            item.balance_pendiente,
                            item.meses_atraso
                          )}
                        </span>
                        <div className="mt-1 text-xs text-slate-500">
                          RD${" "}
                          {Number(item.balance_pendiente || 0).toLocaleString(
                            "es-DO"
                          )}{" "}
                          / {item.meses_atraso || 0} meses
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => aprobarSolicitud(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Aprobar
                          </button>

                          <button
                            onClick={() => aprobarExcepcion(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            Excepción
                          </button>

                          <button
                            onClick={() => rechazarSolicitud(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                            Rechazar
                          </button>
                        </div>
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