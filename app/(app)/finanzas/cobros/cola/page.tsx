"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FileText,
  History,
  ListChecks,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldOff,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type EstadoCola =
  | "PENDIENTE"
  | "PROCESANDO"
  | "ENVIADO"
  | "FALLIDO"
  | "REINTENTO"
  | "CANCELADO"
  | "OMITIDO";

type ColaMensaje = {
  id: number;
  ejecucion_id: number | null;
  agente_id: number;
  plantilla_id: number | null;
  condominio_id: number;
  unidad_id: number;
  propietario_id: number;
  canal: "WHATSAPP" | "CORREO" | "SMS" | "NOTIFICACION";
  destino: string;
  asunto: string | null;
  contenido: string;
  balance_vencido: number;
  cantidad_periodos: number;
  periodo_inicial: string | null;
  periodo_final: string | null;
  fecha_vencimiento_mas_antigua: string | null;
  dias_vencido: number;
  programado_para: string;
  estado: EstadoCola;
  intentos: number;
  maximo_intentos: number;
  clave_deduplicacion: string;
  ultimo_error: string | null;
  enviado_at: string | null;
  cancelado_at: string | null;
  created_at: string;
  updated_at: string;
  unidad_codigo: string;
  propietario_nombre: string;
  agente_nombre: string;
  plantilla_nombre: string | null;
};

function dinero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaHora(valor?: string | null) {
  if (!valor) return "-";

  return new Date(valor).toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function claseEstado(estado: EstadoCola) {
  if (estado === "ENVIADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (estado === "PENDIENTE") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (estado === "PROCESANDO") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (estado === "REINTENTO") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (estado === "FALLIDO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

export default function CobrosColaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [mensajes, setMensajes] = useState<ColaMensaje[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroCanal, setFiltroCanal] = useState("TODOS");

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setError("No se encontró el condominio activo.");
      setLoading(false);
      return;
    }

    cargarMensajes(id);
  }, []);

  async function cargarMensajes(id = condominioId) {
    if (!id) return;

    setLoading(true);
    setError("");
    setMensaje("");

    const { data, error: consultaError } = await supabase
      .from("cobros_cola_mensajes")
      .select(
        `
        id,
        ejecucion_id,
        agente_id,
        plantilla_id,
        condominio_id,
        unidad_id,
        propietario_id,
        canal,
        destino,
        asunto,
        contenido,
        balance_vencido,
        cantidad_periodos,
        periodo_inicial,
        periodo_final,
        fecha_vencimiento_mas_antigua,
        dias_vencido,
        programado_para,
        estado,
        intentos,
        maximo_intentos,
        clave_deduplicacion,
        ultimo_error,
        enviado_at,
        cancelado_at,
        created_at,
        updated_at,
        unidades (
          codigo,
          propietario_nombre
        ),
        cobros_agentes (
          nombre
        ),
        cobros_plantillas (
          nombre
        )
      `
      )
      .eq("condominio_id", Number(id))
      .order("programado_para", { ascending: true })
      .order("id", { ascending: false });

    if (consultaError) {
      setMensajes([]);
      setError(
        "No se pudo cargar la cola de mensajes: " + consultaError.message
      );
      setLoading(false);
      return;
    }

    const lista = (data || []).map((item: any) => {
      const unidadRelacion = Array.isArray(item.unidades)
        ? item.unidades[0]
        : item.unidades;

      const agenteRelacion = Array.isArray(item.cobros_agentes)
        ? item.cobros_agentes[0]
        : item.cobros_agentes;

      const plantillaRelacion = Array.isArray(item.cobros_plantillas)
        ? item.cobros_plantillas[0]
        : item.cobros_plantillas;

      return {
        id: Number(item.id),
        ejecucion_id: item.ejecucion_id ? Number(item.ejecucion_id) : null,
        agente_id: Number(item.agente_id),
        plantilla_id: item.plantilla_id ? Number(item.plantilla_id) : null,
        condominio_id: Number(item.condominio_id),
        unidad_id: Number(item.unidad_id),
        propietario_id: Number(item.propietario_id),
        canal: item.canal,
        destino: String(item.destino || ""),
        asunto: item.asunto || null,
        contenido: String(item.contenido || ""),
        balance_vencido: Number(item.balance_vencido || 0),
        cantidad_periodos: Number(item.cantidad_periodos || 0),
        periodo_inicial: item.periodo_inicial || null,
        periodo_final: item.periodo_final || null,
        fecha_vencimiento_mas_antigua:
          item.fecha_vencimiento_mas_antigua || null,
        dias_vencido: Number(item.dias_vencido || 0),
        programado_para: String(item.programado_para || ""),
        estado: item.estado,
        intentos: Number(item.intentos || 0),
        maximo_intentos: Number(item.maximo_intentos || 0),
        clave_deduplicacion: String(item.clave_deduplicacion || ""),
        ultimo_error: item.ultimo_error || null,
        enviado_at: item.enviado_at || null,
        cancelado_at: item.cancelado_at || null,
        created_at: String(item.created_at || ""),
        updated_at: String(item.updated_at || ""),
        unidad_codigo: unidadRelacion?.codigo || "-",
        propietario_nombre:
          unidadRelacion?.propietario_nombre || "Sin propietario",
        agente_nombre: agenteRelacion?.nombre || "Agente no identificado",
        plantilla_nombre: plantillaRelacion?.nombre || null,
      } satisfies ColaMensaje;
    });

    setMensajes(lista);
    setLoading(false);
  }

  const mensajesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return mensajes.filter((item) => {
      const coincideBusqueda =
        !texto ||
        [
          item.unidad_codigo,
          item.propietario_nombre,
          item.destino,
          item.agente_nombre,
          item.plantilla_nombre || "",
          item.contenido,
        ]
          .join(" ")
          .toLowerCase()
          .includes(texto);

      const coincideEstado =
        filtroEstado === "TODOS" || item.estado === filtroEstado;

      const coincideCanal =
        filtroCanal === "TODOS" || item.canal === filtroCanal;

      return coincideBusqueda && coincideEstado && coincideCanal;
    });
  }, [mensajes, busqueda, filtroEstado, filtroCanal]);

  const pendientes = mensajes.filter(
    (item) => item.estado === "PENDIENTE"
  ).length;

  const reintentos = mensajes.filter(
    (item) => item.estado === "REINTENTO"
  ).length;

  const fallidos = mensajes.filter(
    (item) => item.estado === "FALLIDO"
  ).length;

  const enviados = mensajes.filter(
    (item) => item.estado === "ENVIADO"
  ).length;

  async function cancelarMensaje(item: ColaMensaje) {
    if (!["PENDIENTE", "REINTENTO", "FALLIDO"].includes(item.estado)) {
      alert("Solo se pueden cancelar mensajes pendientes, fallidos o en reintento.");
      return;
    }

    const confirmar = confirm(
      `¿Desea cancelar el mensaje de la unidad ${item.unidad_codigo}?`
    );

    if (!confirmar) return;

    const { error: cancelarError } = await supabase
      .from("cobros_cola_mensajes")
      .update({
        estado: "CANCELADO",
        cancelado_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (cancelarError) {
      alert("No se pudo cancelar el mensaje: " + cancelarError.message);
      return;
    }

    setMensaje("Mensaje cancelado correctamente.");
    await cargarMensajes(condominioId);
  }

  async function reintentarMensaje(item: ColaMensaje) {
    if (!["FALLIDO", "CANCELADO", "OMITIDO"].includes(item.estado)) {
      alert("Este mensaje no está disponible para reintento.");
      return;
    }

    const confirmar = confirm(
      `¿Desea devolver a la cola el mensaje de la unidad ${item.unidad_codigo}?`
    );

    if (!confirmar) return;

    const { error: reintentoError } = await supabase
      .from("cobros_cola_mensajes")
      .update({
        estado: "REINTENTO",
        programado_para: new Date().toISOString(),
        cancelado_at: null,
        ultimo_error: null,
      })
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (reintentoError) {
      alert("No se pudo programar el reintento: " + reintentoError.message);
      return;
    }

    setMensaje("Mensaje colocado nuevamente en la cola.");
    await cargarMensajes(condominioId);
  }

  async function eliminarMensaje(item: ColaMensaje) {
    if (!["CANCELADO", "OMITIDO"].includes(item.estado)) {
      alert("Solo se pueden eliminar mensajes cancelados u omitidos.");
      return;
    }

    const confirmar = confirm(
      `¿Desea eliminar definitivamente este registro de la cola?\n\nUnidad: ${item.unidad_codigo}`
    );

    if (!confirmar) return;

    const { error: eliminarError } = await supabase
      .from("cobros_cola_mensajes")
      .delete()
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (eliminarError) {
      alert("No se pudo eliminar el mensaje: " + eliminarError.message);
      return;
    }

    setMensaje("Registro eliminado de la cola.");
    await cargarMensajes(condominioId);
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Cobros Inteligentes"
        subtitle="Gestión de deuda, automatizaciones y seguimiento de comunicaciones."
        tone="blue"
        items={[
          {
            href: "/finanzas/cobros",
            label: "Resumen",
            icon: CircleDollarSign,
          },
          {
            href: "/finanzas/cobros/cuentas",
            label: "Cuentas por cobrar",
            icon: Users,
          },
          {
            href: "/finanzas/cobros/agentes",
            label: "Agentes",
            icon: Bot,
          },
          {
            href: "/finanzas/cobros/plantillas",
            label: "Plantillas",
            icon: FileText,
          },
          {
            href: "/finanzas/cobros/exclusiones",
            label: "Exclusiones",
            icon: ShieldOff,
          },
          {
            href: "/finanzas/cobros/cola",
            label: "Cola",
            icon: ListChecks,
          },
          {
            href: "/finanzas/cobros/historial",
            label: "Historial",
            icon: History,
          },
        ]}
      />

      <ModuleToolbar
        title="Cola de Mensajes"
        subtitle={`Mensajes pendientes, procesados y reintentos. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={ListChecks}
        actions={
          <button
            type="button"
            onClick={() => cargarMensajes()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        }
      />

      {mensaje && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Pendientes"
          value={String(pendientes)}
          subtitle="Esperando procesamiento"
          icon={Clock3}
          tone="blue"
        />

        <StatCard
          title="Reintentos"
          value={String(reintentos)}
          subtitle="Programados nuevamente"
          icon={RotateCcw}
          tone="amber"
        />

        <StatCard
          title="Fallidos"
          value={String(fallidos)}
          subtitle="Requieren revisión"
          icon={XCircle}
          tone="red"
        />

        <StatCard
          title="Enviados"
          value={String(enviados)}
          subtitle="Procesados correctamente"
          icon={ListChecks}
          tone="green"
        />
      </div>

      <SectionCard
        title="Mensajes en cola"
        subtitle="Esta pantalla administra la cola; no realiza el envío directo al proveedor."
      >
        <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_210px_210px]">
          <div className="flex items-center rounded-xl border bg-white px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por unidad, propietario, destino o agente..."
              className="w-full bg-transparent px-3 py-3 text-sm outline-none"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="PROCESANDO">Procesando</option>
            <option value="REINTENTO">Reintentos</option>
            <option value="FALLIDO">Fallidos</option>
            <option value="ENVIADO">Enviados</option>
            <option value="CANCELADO">Cancelados</option>
            <option value="OMITIDO">Omitidos</option>
          </select>

          <select
            value={filtroCanal}
            onChange={(e) => setFiltroCanal(e.target.value)}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            <option value="TODOS">Todos los canales</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="CORREO">Correo</option>
            <option value="SMS">SMS</option>
            <option value="NOTIFICACION">Notificación</option>
          </select>
        </div>

        {loading ? (
          <div className="rounded-xl border bg-slate-50 p-8 text-center text-sm text-slate-500">
            Cargando cola de mensajes...
          </div>
        ) : mensajesFiltrados.length === 0 ? (
          <EmptyState
            title="Sin mensajes"
            description="No existen mensajes que coincidan con los filtros seleccionados."
          />
        ) : (
          <div className="space-y-4">
            {mensajesFiltrados.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">
                        {item.unidad_codigo}
                      </h3>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${claseEstado(
                          item.estado
                        )}`}
                      >
                        {item.estado}
                      </span>

                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-black text-blue-700">
                        {item.canal}
                      </span>
                    </div>

                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      {item.propietario_nombre}
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <Dato
                        label="Destino"
                        value={item.destino || "Sin destino"}
                      />
                      <Dato label="Agente" value={item.agente_nombre} />
                      <Dato
                        label="Programado"
                        value={fechaHora(item.programado_para)}
                      />
                      <Dato
                        label="Intentos"
                        value={`${item.intentos} de ${item.maximo_intentos}`}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Dato
                        label="Balance vencido"
                        value={`RD$ ${dinero(item.balance_vencido)}`}
                        tone="red"
                      />
                      <Dato
                        label="Períodos"
                        value={`${item.periodo_inicial || "-"} a ${
                          item.periodo_final || "-"
                        }`}
                      />
                      <Dato
                        label="Antigüedad"
                        value={`${item.dias_vencido} días`}
                      />
                    </div>

                    {item.asunto && (
                      <div className="mt-3 rounded-xl border bg-slate-50 p-3">
                        <p className="text-xs font-black uppercase text-slate-500">
                          Asunto
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {item.asunto}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 rounded-xl border bg-slate-50 p-4">
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                        {item.contenido}
                      </p>
                    </div>

                    {item.ultimo_error && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <p className="font-black">Último error</p>
                        <p className="mt-1">{item.ultimo_error}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {["PENDIENTE", "REINTENTO", "FALLIDO"].includes(
                      item.estado
                    ) && (
                      <button
                        type="button"
                        onClick={() => cancelarMensaje(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200"
                      >
                        <XCircle className="h-4 w-4" />
                        Cancelar
                      </button>
                    )}

                    {["FALLIDO", "CANCELADO", "OMITIDO"].includes(
                      item.estado
                    ) && (
                      <button
                        type="button"
                        onClick={() => reintentarMensaje(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-200"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reintentar
                      </button>
                    )}

                    {["CANCELADO", "OMITIDO"].includes(item.estado) && (
                      <button
                        type="button"
                        onClick={() => eliminarMensaje(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 flex-none" />
          <p>
            <strong>Importante:</strong> la cola administra los mensajes
            preparados por los agentes. El envío real se habilitará cuando se
            configure el proveedor de WhatsApp, correo o SMS.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}

function Dato({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "red";
}) {
  const clase =
    tone === "red"
      ? "border-red-100 bg-red-50 text-red-700"
      : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-xl border px-3 py-3 ${clase}`}>
      <p className="text-xs font-black uppercase opacity-70">{label}</p>
      <p className="mt-1 break-words text-sm font-black">{value}</p>
    </div>
  );
}
