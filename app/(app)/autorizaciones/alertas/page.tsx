"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Alerta = {
  id: number;
  condominio_id: number;
  codigo_autorizacion: string | null;
  condominio: string | null;
  unidad: string | null;
  propietario: string | null;
  tipo_solicitud: string | null;
  tipo_visitante: string | null;
  nombre_visitante: string | null;
  cedula_visitante: string | null;
  telefono_visitante: string | null;
  empresa: string | null;
  vehiculo_placa: string | null;
  fecha_entrada: string | null;
  hora_salida_estimada: string | null;
  usuario_entrada: string | null;
};

export default function AlertasAccesoPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  function obtenerCondominioActivo() {
    return Number(
      localStorage.getItem("condominio_id") ||
        localStorage.getItem("condominioId") ||
        0
    );
  }

  function minutosDentro(fechaEntrada: string | null) {
    if (!fechaEntrada) return 0;

    const entrada = new Date(fechaEntrada).getTime();
    const ahora = new Date().getTime();

    return Math.max(0, Math.floor((ahora - entrada) / 60000));
  }

  function formatoTiempo(minutos: number) {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;

    if (horas <= 0) return `${mins} min`;
    return `${horas}h ${mins}m`;
  }

  async function cargarAlertas() {
    setLoading(true);

    const condominioId = obtenerCondominioActivo();

    let query = supabase
      .from("autorizaciones")
      .select(`
        id,
        condominio_id,
        codigo_autorizacion,
        condominio,
        unidad,
        propietario,
        tipo_solicitud,
        tipo_visitante,
        nombre_visitante,
        cedula_visitante,
        telefono_visitante,
        empresa,
        vehiculo_placa,
        fecha_entrada,
        hora_salida_estimada,
        usuario_entrada
      `)
      .eq("estado", "En Proceso")
      .order("fecha_entrada", { ascending: true });

    if (condominioId) {
      query = query.eq("condominio_id", condominioId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error cargando alertas:", error);
      alert("Error cargando alertas");
    } else {
      const filtradas = (data || []).filter(
        (item) => minutosDentro(item.fecha_entrada) >= 240
      );

      setAlertas(filtradas);
    }

    setLoading(false);
  }

  async function registrarSalida(item: Alerta) {
    const confirmar = confirm(
      `¿Registrar salida para ${item.nombre_visitante || "visitante"}?`
    );

    if (!confirmar) return;

    const fechaSalida = new Date();
    const minutos = minutosDentro(item.fecha_entrada);

    const { error: accesoError } = await supabase
      .from("autorizaciones_accesos")
      .insert({
        autorizacion_id: item.id,
        condominio_id: item.condominio_id,
        tipo_movimiento: "Salida",
        registrado_por: "Seguridad",
        observacion: "Salida registrada desde Alertas.",
      });

    if (accesoError) {
      console.error("Error registrando salida:", accesoError);
      alert("Error registrando salida");
      return;
    }

    const { error: updateError } = await supabase
      .from("autorizaciones")
      .update({
        estado: "Finalizada",
        fecha_salida: fechaSalida.toISOString(),
        usuario_salida: "Seguridad",
        tiempo_total_minutos: minutos,
      })
      .eq("id", item.id);

    if (updateError) {
      console.error("Error actualizando autorización:", updateError);
      alert("Salida registrada, pero no se actualizó la autorización.");
      return;
    }

    await cargarAlertas();
    alert("Salida registrada correctamente.");
  }

  useEffect(() => {
    cargarAlertas();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/autorizaciones/centro-control"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Centro de Control
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              Alertas de Acceso
            </h1>
            <p className="text-sm text-slate-500">
              Personas dentro del condominio por más de 4 horas.
            </p>
          </div>

          <button
            onClick={cargarAlertas}
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
                <AlertTriangle className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-slate-900">
                {alertas.length}
              </span>
            </div>
            <h2 className="mt-4 font-bold text-slate-900">
              Alertas Activas
            </h2>
            <p className="text-sm text-slate-500">
              Tiempo excedido
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-bold text-slate-900">
              Listado de alertas
            </h2>
            <p className="text-sm text-slate-500">
              Regla actual: más de 4 horas dentro.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Tiempo Dentro</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Propietario</th>
                  <th className="px-4 py-3">Visitante</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Entrada</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Cargando alertas...
                    </td>
                  </tr>
                ) : alertas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay alertas activas.
                    </td>
                  </tr>
                ) : (
                  alertas.map((item, index) => {
                    const minutos = minutosDentro(item.fecha_entrada);

                    return (
                      <tr
                        key={`${item.id}-${item.codigo_autorizacion}-${index}`}
                        className="border-t bg-red-50/40"
                      >
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            {formatoTiempo(minutos)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.codigo_autorizacion || "-"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.unidad || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.propietario || "-"}
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
                          {item.tipo_visitante || item.tipo_solicitud || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.fecha_entrada
                            ? new Date(item.fecha_entrada).toLocaleString(
                                "es-DO"
                              )
                            : "-"}
                          <br />
                          <span className="text-xs text-slate-500">
                            {item.usuario_entrada || ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => registrarSalida(item)}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Registrar Salida
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}