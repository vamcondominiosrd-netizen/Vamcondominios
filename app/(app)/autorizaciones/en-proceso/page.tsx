"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, DoorClosed } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Solicitud = {
  id: number;
  condominio_id: number;
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
  usuario_entrada: string | null;
};

export default function EnProcesoPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);

  async function cargarSolicitudes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("autorizaciones")
      .select(`
        id,
        condominio_id,
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
        usuario_entrada
      `)
      .eq("estado", "En Proceso")
      .order("fecha_entrada", { ascending: false });

    if (error) {
      console.error("Error cargando autorizaciones en proceso:", error);
      alert("Error cargando autorizaciones en proceso");
    } else {
      setSolicitudes(data || []);
    }

    setLoading(false);
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

  async function registrarSalida(item: Solicitud) {
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
        observacion: "Salida registrada desde En Proceso.",
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
      alert("Salida registrada, pero no se actualizó el estado.");
      return;
    }

    await cargarSolicitudes();
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
              En Proceso / Dentro del Condominio
            </h1>
            <p className="text-sm text-slate-500">
              Personas autorizadas que ya registraron entrada y aún no tienen salida.
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
              Actualmente dentro
            </h2>
            <p className="text-sm text-slate-500">
              Total dentro: {solicitudes.length}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Condominio</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Visitante</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Placa</th>
                  <th className="px-4 py-3">Entrada</th>
                  <th className="px-4 py-3">Tiempo</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      Cargando autorizaciones en proceso...
                    </td>
                  </tr>
                ) : solicitudes.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      No hay personas dentro del condominio.
                    </td>
                  </tr>
                ) : (
                  solicitudes.map((item) => {
                    const minutos = minutosDentro(item.fecha_entrada);

                    return (
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
                          {item.nombre_visitante || "-"}
                          <br />
                          <span className="text-xs text-slate-500">
                            {item.cedula_visitante || ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.tipo_solicitud || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.empresa || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.vehiculo_placa || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.fecha_entrada
                            ? new Date(item.fecha_entrada).toLocaleString("es-DO")
                            : "-"}
                          <br />
                          <span className="text-xs text-slate-500">
                            {item.usuario_entrada || ""}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            {formatoTiempo(minutos)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => registrarSalida(item)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            <DoorClosed className="h-4 w-4" />
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