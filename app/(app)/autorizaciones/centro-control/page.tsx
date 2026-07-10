"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  QrCode,
  Users,
  DoorOpen,
  DoorClosed,
  AlertTriangle,
  Eye,
  Phone,
  Printer,
  LogOut,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type PersonaDentro = {
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

export default function CentroControlAccesosPage() {
  const [personas, setPersonas] = useState<PersonaDentro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  function obtenerCondominioActivo() {
    return Number(
      localStorage.getItem("condominio_id") ||
        localStorage.getItem("condominioId") ||
        0
    );
  }

  async function cargarPersonasDentro() {
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
      .order("fecha_entrada", { ascending: false });

    if (condominioId) {
      query = query.eq("condominio_id", condominioId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error cargando personas dentro:", error);
      alert("Error cargando personas dentro del condominio");
    } else {
      setPersonas(data || []);
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

  function estadoTiempo(minutos: number) {
    if (minutos >= 240) {
      return {
        texto: "Excedido",
        clase: "bg-red-100 text-red-700",
      };
    }

    if (minutos >= 180) {
      return {
        texto: "Próximo",
        clase: "bg-amber-100 text-amber-700",
      };
    }

    return {
      texto: "Normal",
      clase: "bg-green-100 text-green-700",
    };
  }

  async function registrarSalida(item: PersonaDentro) {
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
        observacion: "Salida registrada desde Centro de Control.",
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

    await cargarPersonasDentro();
    alert("Salida registrada correctamente.");
  }

  useEffect(() => {
    cargarPersonasDentro();
  }, []);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    if (!q) return personas;

    return personas.filter((item) => {
      return (
        item.codigo_autorizacion?.toLowerCase().includes(q) ||
        item.unidad?.toLowerCase().includes(q) ||
        item.propietario?.toLowerCase().includes(q) ||
        item.nombre_visitante?.toLowerCase().includes(q) ||
        item.cedula_visitante?.toLowerCase().includes(q) ||
        item.empresa?.toLowerCase().includes(q) ||
        item.vehiculo_placa?.toLowerCase().includes(q)
      );
    });
  }, [busqueda, personas]);

  const tecnicos = personas.filter((p) =>
    `${p.tipo_visitante || ""} ${p.tipo_solicitud || ""}`
      .toLowerCase()
      .includes("técnico")
  ).length;

  const proveedores = personas.filter((p) =>
    `${p.tipo_visitante || ""} ${p.empresa || ""}`
      .toLowerCase()
      .includes("proveedor")
  ).length;

  const entregas = personas.filter((p) =>
    `${p.tipo_solicitud || ""}`.toLowerCase().includes("entrega")
  ).length;

  const excedidos = personas.filter(
    (p) => minutosDentro(p.fecha_entrada) >= 240
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/autorizaciones"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al módulo
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
              Centro de Control de Accesos
            </h1>
            <p className="text-sm text-slate-500">
              Panel operativo para seguridad: personas dentro, entradas, salidas,
              QR y alertas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={cargarPersonasDentro}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>

            <Link
              href="/autorizaciones/escanear-qr"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
            >
              <QrCode className="h-4 w-4" />
              Escanear QR
            </Link>

            <Link
              href="/autorizaciones/entrada-manual"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Entrada Manual
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResumenCard
            titulo="Personas Dentro"
            valor={personas.length}
            descripcion="Sin salida registrada"
            icono={Users}
          />

          <ResumenCard
            titulo="Técnicos"
            valor={tecnicos}
            descripcion="Visitantes técnicos"
            icono={Users}
          />

          <ResumenCard
            titulo="Entregas"
            valor={entregas}
            descripcion="Entregas activas"
            icono={DoorOpen}
          />

          <ResumenCard
            titulo="Tiempo Excedido"
            valor={excedidos}
            descripcion="Más de 4 horas dentro"
            icono={AlertTriangle}
          />
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
              Personas Dentro
            </button>
            <Link
              href="/autorizaciones/entradas"
              className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Entradas Hoy
            </Link>
            <Link
              href="/autorizaciones/salidas"
              className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Salidas Hoy
            </Link>
            <Link
              href="/autorizaciones/alertas"
              className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Alertas
            </Link>
            <Link
              href="/autorizaciones/historial-accesos"
              className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Historial
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar visitante, cédula, unidad, empresa, placa o código..."
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-bold text-slate-900">
              Personas Dentro del Condominio
            </h2>
            <p className="text-sm text-slate-500">
              Personas con entrada registrada y sin salida.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Hora Entrada</th>
                  <th className="px-4 py-3">Tiempo</th>
                  <th className="px-4 py-3">Visitante</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Propietario</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Cargando personas dentro...
                    </td>
                  </tr>
                ) : filtradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay personas dentro del condominio.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((item, index) => {
                    const minutos = minutosDentro(item.fecha_entrada);
                    const estado = estadoTiempo(minutos);

                    return (
                      <tr
                        key={`${item.id}-${item.codigo_autorizacion}-${index}`}
                        className="border-t"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.fecha_entrada
                            ? new Date(item.fecha_entrada).toLocaleTimeString(
                                "es-DO",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "--:--"}
                          <br />
                          <span className="text-xs text-slate-500">
                            {item.usuario_entrada || ""}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${estado.clase}`}>
                            {formatoTiempo(minutos)}
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
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.unidad || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.propietario || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.tipo_visitante ||
                            item.tipo_solicitud ||
                            "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${estado.clase}`}>
                            {estado.texto}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button className="rounded-lg border p-2 text-slate-700 hover:bg-slate-100">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => registrarSalida(item)}
                              className="rounded-lg bg-slate-900 p-2 text-white hover:bg-slate-800"
                            >
                              <LogOut className="h-4 w-4" />
                            </button>
                            <a
                              href={
                                item.telefono_visitante
                                  ? `tel:${item.telefono_visitante}`
                                  : "#"
                              }
                              className="rounded-lg border p-2 text-slate-700 hover:bg-slate-100"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                            <button className="rounded-lg border p-2 text-slate-700 hover:bg-slate-100">
                              <Printer className="h-4 w-4" />
                            </button>
                          </div>
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

function ResumenCard({
  titulo,
  valor,
  descripcion,
  icono: Icon,
}: {
  titulo: string;
  valor: number;
  descripcion: string;
  icono: any;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
          <Icon className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold text-slate-900">{valor}</span>
      </div>
      <h2 className="mt-4 font-bold text-slate-900">{titulo}</h2>
      <p className="text-sm text-slate-500">{descripcion}</p>
    </div>
  );
}