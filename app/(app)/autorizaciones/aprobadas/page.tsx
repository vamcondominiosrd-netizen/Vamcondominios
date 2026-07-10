"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, QrCode, DoorOpen } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Solicitud = {
  id: number;
  condominio_id: number;
  codigo_autorizacion: string | null;
  condominio: string | null;
  unidad: string | null;
  propietario: string | null;
  tipo_solicitud: string | null;
  fecha_programada: string;
  hora_entrada: string | null;
  hora_salida_estimada: string | null;
  nombre_visitante: string | null;
  cedula_visitante: string | null;
  telefono_visitante: string | null;
  empresa: string | null;
  vehiculo_placa: string | null;
  estado: string | null;
  requiere_excepcion: boolean | null;
  motivo_excepcion: string | null;
};

export default function SolicitudesAprobadasPage() {
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
        fecha_programada,
        hora_entrada,
        hora_salida_estimada,
        nombre_visitante,
        cedula_visitante,
        telefono_visitante,
        empresa,
        vehiculo_placa,
        estado,
        requiere_excepcion,
        motivo_excepcion
      `)
      .eq("estado", "Aprobada")
      .order("fecha_programada", { ascending: true });

    if (error) {
      console.error("Error cargando aprobadas:", error);
      alert("Error cargando solicitudes aprobadas");
    } else {
      setSolicitudes(data || []);
    }

    setLoading(false);
  }

  async function registrarEntrada(item: Solicitud) {
    const confirmar = confirm(
      `¿Registrar entrada para ${item.nombre_visitante || "visitante"}?`
    );
    if (!confirmar) return;

    const fechaEntrada = new Date().toISOString();

    const { error: accesoError } = await supabase
      .from("autorizaciones_accesos")
      .insert({
        autorizacion_id: item.id,
        condominio_id: item.condominio_id,
        tipo_movimiento: "Entrada",
        registrado_por: "Seguridad",
        observacion: "Entrada registrada desde solicitudes aprobadas.",
      });

    if (accesoError) {
      console.error("Error registrando entrada:", accesoError);
      alert("Error registrando entrada");
      return;
    }

    const { error: updateError } = await supabase
      .from("autorizaciones")
      .update({
        estado: "En Proceso",
        fecha_entrada: fechaEntrada,
        usuario_entrada: "Seguridad",
      })
      .eq("id", item.id);

    if (updateError) {
      console.error("Error actualizando estado:", updateError);
      alert("Entrada registrada, pero no se actualizó el estado.");
      return;
    }

    await cargarSolicitudes();

    alert("Entrada registrada correctamente.");
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
              Solicitudes Aprobadas
            </h1>
            <p className="text-sm text-slate-500">
              Autorizaciones listas para validar entrada.
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
              Autorizaciones aprobadas
            </h2>
            <p className="text-sm text-slate-500">
              Total aprobadas: {solicitudes.length}
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
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Placa</th>
                  <th className="px-4 py-3">Excepción</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Cargando solicitudes aprobadas...
                    </td>
                  </tr>
                ) : solicitudes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay solicitudes aprobadas.
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
                          {item.hora_entrada || "--:--"} -{" "}
                          {item.hora_salida_estimada || "--:--"}
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
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.vehiculo_placa || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {item.requiere_excepcion ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            Sí
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/autorizaciones/qr/${item.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <QrCode className="h-4 w-4" />
                            QR
                          </Link>

                          <button
                            onClick={() => registrarEntrada(item)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            <DoorOpen className="h-4 w-4" />
                            Entrada
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