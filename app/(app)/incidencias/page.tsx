"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Eye,
  FileText,
  Megaphone,
  Package,
  RefreshCw,
  Send,
  Wrench,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Incidencia = {
  id: number;
  propietario_id: number | null;
  condominio_id: number | null;
  condominio: string | null;
  unidad_id?: number | null;
  no_apartamento: string | null;
  nombre_propietario: string | null;
  telefono: string | null;
  titulo: string | null;
  descripcion: string | null;
  categoria: string | null;
  prioridad: string | null;
  foto_url: string | null;
  estado: string | null;
  origen: string | null;
  comentario_admin: string | null;
  fecha_cierre: string | null;
  created_at: string | null;
  responsable?: string | null;
  fecha_estimada_solucion?: string | null;
};

function fecha(valor: string | null | undefined) {
  if (!valor) return "-";

  const limpio = String(valor).split("T")[0];
  const partes = limpio.split("-");

  if (partes.length !== 3) return limpio;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function colorEstado(estado: string | null | undefined) {
  if (estado === "Pendiente") {
    return "border-yellow-100 bg-yellow-50 text-yellow-700";
  }

  if (estado === "En proceso") {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }

  if (estado === "Resuelto") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (estado === "Cerrado") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (estado === "Rechazado") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-orange-100 bg-orange-50 text-orange-700";
}

function colorPrioridad(prioridad: string | null | undefined) {
  if (prioridad === "Urgente") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  if (prioridad === "Alta") {
    return "border-orange-100 bg-orange-50 text-orange-700";
  }

  if (prioridad === "Baja") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  return "border-blue-100 bg-blue-50 text-blue-700";
}

export default function IncidenciasPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [comentarios, setComentarios] = useState<Record<number, string>>({});
  const [responsables, setResponsables] = useState<Record<number, string>>({});
  const [fechasSolucion, setFechasSolucion] = useState<Record<number, string>>(
    {},
  );

  const [filtroEstado, setFiltroEstado] = useState("");

  const estados = [
    "Pendiente",
    "En proceso",
    "Resuelto",
    "Cerrado",
    "Rechazado",
  ];

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id || !Number(id)) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarIncidencias(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarIncidencias(id: string) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) {
      setIncidencias([]);
      return;
    }

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("incidencias")
      .select("*")
      .eq("condominio_id", condominioIdNumero)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando incidencias: " + error.message);
      setIncidencias([]);
      return;
    }

    const lista = ((data as Incidencia[]) || []).filter(
      (i) => Number(i.condominio_id) === condominioIdNumero,
    );

    setIncidencias(lista);

    const nuevosComentarios: Record<number, string> = {};
    const nuevosResponsables: Record<number, string> = {};
    const nuevasFechas: Record<number, string> = {};

    lista.forEach((i) => {
      nuevosComentarios[i.id] = i.comentario_admin || "";
      nuevosResponsables[i.id] = i.responsable || "";
      nuevasFechas[i.id] = i.fecha_estimada_solucion || "";
    });

    setComentarios(nuevosComentarios);
    setResponsables(nuevosResponsables);
    setFechasSolucion(nuevasFechas);
  }

  async function refrescar() {
    if (!condominioId || !Number(condominioId)) return;

    await cargarIncidencias(condominioId);
  }

  async function actualizarIncidencia(id: number, nuevoEstado: string) {
    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    const comentario = comentarios[id] || "";
    const responsable = responsables[id] || "";
    const fechaEstimada = fechasSolucion[id] || null;

    const updateData: any = {
      estado: nuevoEstado,
      comentario_admin: comentario,
      responsable,
      fecha_estimada_solucion: fechaEstimada,
    };

    if (nuevoEstado === "Resuelto" || nuevoEstado === "Cerrado") {
      updateData.fecha_cierre = new Date().toISOString();
    }

    const { error } = await supabase
      .from("incidencias")
      .update(updateData)
      .eq("id", id)
      .eq("condominio_id", condominioIdNumero);

    if (error) {
      setMensaje("Error actualizando incidencia: " + error.message);
      return;
    }

    setMensaje("Incidencia actualizada correctamente.");
    await cargarIncidencias(condominioId);
  }

  const incidenciasSeguras = useMemo(() => {
    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) return [];

    return incidencias.filter(
      (i) => Number(i.condominio_id) === condominioIdNumero,
    );
  }, [incidencias, condominioId]);

  const incidenciasFiltradas = useMemo(() => {
    return incidenciasSeguras.filter((i) => {
      return filtroEstado === "" || i.estado === filtroEstado;
    });
  }, [incidenciasSeguras, filtroEstado]);

  const abiertas = incidenciasFiltradas.filter(
    (i) => i.estado !== "Resuelto" && i.estado !== "Cerrado",
  ).length;

  const resueltas = incidenciasFiltradas.filter(
    (i) => i.estado === "Resuelto" || i.estado === "Cerrado",
  ).length;

  const urgentes = incidenciasFiltradas.filter(
    (i) => i.prioridad === "Urgente" || i.prioridad === "Alta",
  ).length;

  return (
    <PageContainer>
      <ModuleMenu
        title="Operaciones"
        subtitle="Gestión operativa del condominio: incidencias, reservas, anuncios, documentos, mantenimiento e inventario."
        tone="orange"
        items={[
          {
            href: "/operaciones",
            label: "Inicio operaciones",
            icon: ClipboardList,
          },
          {
            href: "/incidencias",
            label: "Incidencias",
            icon: AlertTriangle,
          },
          {
            href: "/reservas-areas",
            label: "Reservas",
            icon: CalendarDays,
          },
          {
            href: "/anuncios",
            label: "Anuncios",
            icon: Megaphone,
          },
          {
            href: "/documentos",
            label: "Documentos",
            icon: FileText,
          },
          {
            href: "/trabajos-tecnicos",
            label: "Mantenimiento",
            icon: Wrench,
          },
          {
            href: "/administracion/inventario",
            label: "Inventario",
            icon: Package,
          },
        ]}
      />

      <ModuleToolbar
        title="Incidencias de Propietarios"
        subtitle={`Gestión y seguimiento de incidencias reportadas desde VAM Móvil. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={AlertTriangle}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Resumen de incidencias"
        subtitle="Indicadores principales del estado operativo."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoCompacta
            label="Total incidencias"
            value={`${incidenciasFiltradas.length}`}
          />

          <InfoCompacta label="Abiertas" value={`${abiertas}`} />

          <InfoCompacta
            label="Resueltas / cerradas"
            value={`${resueltas}`}
          />

          <InfoCompacta label="Urgentes / altas" value={`${urgentes}`} />
        </div>
      </SectionCard>

      <SectionCard
        title="Filtros"
        subtitle="Filtre las incidencias por estado."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
              {incidenciasFiltradas.length} registro(s)
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Estado
            </label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Todos</option>

              {estados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setFiltroEstado("")}
              className="w-full rounded-xl bg-slate-700 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Limpiar filtro
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Listado de incidencias"
        subtitle="Revise cada incidencia, asigne responsable y actualice su estado."
      >
        {loading ? (
          <div className="rounded-2xl border bg-slate-50 p-6 text-sm font-semibold text-slate-500">
            Cargando incidencias...
          </div>
        ) : incidenciasFiltradas.length === 0 ? (
          <EmptyState
            title="Sin incidencias"
            description="No hay incidencias registradas para este condominio o filtro seleccionado."
          />
        ) : (
          <div className="space-y-4">
            {incidenciasFiltradas.map((i) => (
              <div
                key={i.id}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${colorEstado(
                          i.estado,
                        )}`}
                      >
                        {i.estado || "Sin estado"}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${colorPrioridad(
                          i.prioridad,
                        )}`}
                      >
                        {i.prioridad || "Sin prioridad"}
                      </span>

                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                        #{i.id}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900">
                      {i.titulo || "Incidencia sin título"}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {i.condominio || condominioNombre || "Condominio"} | Apto.{" "}
                      {i.no_apartamento || "-"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Propietario:{" "}
                      <strong>{i.nombre_propietario || "-"}</strong>
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Categoría: <strong>{i.categoria || "-"}</strong>
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-sm text-slate-500">Fecha reporte</p>
                    <p className="font-black text-slate-900">
                      {fecha(i.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-700">
                    Descripción
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {i.descripcion || "-"}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  <Detalle label="Teléfono" value={i.telefono || "-"} />
                  <Detalle label="Origen" value={i.origen || "-"} />
                  <Detalle
                    label="Responsable actual"
                    value={i.responsable || "-"}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {i.foto_url ? (
                    <Link
                      href={i.foto_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      <Eye className="h-4 w-4" />
                      Ver evidencia
                    </Link>
                  ) : (
                    <span className="inline-flex rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-400">
                      Sin evidencia
                    </span>
                  )}
                </div>

                {i.comentario_admin && (
                  <div className="mt-4 rounded-2xl border bg-white p-4">
                    <p className="text-sm font-black text-slate-700">
                      Comentario administración
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {i.comentario_admin}
                    </p>
                  </div>
                )}

                {i.estado !== "Cerrado" && i.estado !== "Resuelto" && (
                  <div className="mt-5 space-y-4 border-t pt-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-slate-700">
                          Responsable
                        </label>

                        <input
                          type="text"
                          value={responsables[i.id] || ""}
                          onChange={(e) =>
                            setResponsables({
                              ...responsables,
                              [i.id]: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border px-4 py-3 text-sm"
                          placeholder="Persona asignada"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-bold text-slate-700">
                          Fecha estimada solución
                        </label>

                        <input
                          type="date"
                          value={fechasSolucion[i.id] || ""}
                          onChange={(e) =>
                            setFechasSolucion({
                              ...fechasSolucion,
                              [i.id]: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border px-4 py-3 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-bold text-slate-700">
                        Comentario administrativo
                      </label>

                      <textarea
                        value={comentarios[i.id] || ""}
                        onChange={(e) =>
                          setComentarios({
                            ...comentarios,
                            [i.id]: e.target.value,
                          })
                        }
                        className="min-h-24 w-full rounded-xl border px-4 py-3 text-sm"
                        placeholder="Respuesta o seguimiento"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          actualizarIncidencia(i.id, "En proceso")
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-700"
                      >
                        <Send className="h-4 w-4" />
                        En proceso
                      </button>

                      <button
                        type="button"
                        onClick={() => actualizarIncidencia(i.id, "Resuelto")}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                      >
                        Resolver
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          actualizarIncidencia(i.id, "Rechazado")
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function InfoCompacta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <h3 className="mt-1 text-lg font-black text-slate-900">{value}</h3>
    </div>
  );
}

function Detalle({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  );
}