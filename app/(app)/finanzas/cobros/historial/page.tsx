"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  FileText,
  History,
  ListChecks,
  MailCheck,
  RefreshCw,
  Search,
  ShieldOff,
  Smartphone,
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

type EstadoEnvio =
  | "PENDIENTE"
  | "ENVIANDO"
  | "ENVIADO"
  | "ENTREGADO"
  | "LEIDO"
  | "FALLIDO"
  | "CANCELADO";

type HistorialEnvio = {
  id: number;
  cola_mensaje_id: number;
  agente_id: number;
  condominio_id: number;
  unidad_id: number;
  propietario_id: number;
  canal: "WHATSAPP" | "CORREO" | "SMS" | "NOTIFICACION";
  destino: string;
  proveedor: string | null;
  proveedor_mensaje_id: string | null;
  estado: EstadoEnvio;
  solicitud: Record<string, unknown> | null;
  respuesta: Record<string, unknown> | null;
  codigo_error: string | null;
  mensaje_error: string | null;
  fecha_envio: string | null;
  fecha_entrega: string | null;
  fecha_lectura: string | null;
  created_at: string;
  updated_at: string;
  unidad_codigo: string;
  propietario_nombre: string;
  agente_nombre: string;
  balance_vencido: number;
  contenido: string;
  asunto: string | null;
};

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

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function claseEstado(estado: EstadoEnvio) {
  if (estado === "LEIDO") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (estado === "ENTREGADO") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (estado === "ENVIADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (estado === "FALLIDO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (estado === "CANCELADO") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (estado === "ENVIANDO") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function CobrosHistorialPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [envios, setEnvios] = useState<HistorialEnvio[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroCanal, setFiltroCanal] = useState("TODOS");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [seleccionado, setSeleccionado] = useState<HistorialEnvio | null>(null);
  const [loading, setLoading] = useState(true);
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

    cargarHistorial(id);
  }, []);

  async function cargarHistorial(id = condominioId) {
    if (!id) return;

    setLoading(true);
    setError("");

    const { data, error: consultaError } = await supabase
      .from("cobros_envios")
      .select(
        `
        id,
        cola_mensaje_id,
        agente_id,
        condominio_id,
        unidad_id,
        propietario_id,
        canal,
        destino,
        proveedor,
        proveedor_mensaje_id,
        estado,
        solicitud,
        respuesta,
        codigo_error,
        mensaje_error,
        fecha_envio,
        fecha_entrega,
        fecha_lectura,
        created_at,
        updated_at,
        unidades (
          codigo,
          propietario_nombre
        ),
        cobros_agentes (
          nombre
        ),
        cobros_cola_mensajes (
          balance_vencido,
          contenido,
          asunto
        )
      `
      )
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (consultaError) {
      setEnvios([]);
      setError(
        "No se pudo cargar el historial de envíos: " + consultaError.message
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

      const colaRelacion = Array.isArray(item.cobros_cola_mensajes)
        ? item.cobros_cola_mensajes[0]
        : item.cobros_cola_mensajes;

      return {
        id: Number(item.id),
        cola_mensaje_id: Number(item.cola_mensaje_id),
        agente_id: Number(item.agente_id),
        condominio_id: Number(item.condominio_id),
        unidad_id: Number(item.unidad_id),
        propietario_id: Number(item.propietario_id),
        canal: item.canal,
        destino: String(item.destino || ""),
        proveedor: item.proveedor || null,
        proveedor_mensaje_id: item.proveedor_mensaje_id || null,
        estado: item.estado,
        solicitud: item.solicitud || null,
        respuesta: item.respuesta || null,
        codigo_error: item.codigo_error || null,
        mensaje_error: item.mensaje_error || null,
        fecha_envio: item.fecha_envio || null,
        fecha_entrega: item.fecha_entrega || null,
        fecha_lectura: item.fecha_lectura || null,
        created_at: String(item.created_at || ""),
        updated_at: String(item.updated_at || ""),
        unidad_codigo: unidadRelacion?.codigo || "-",
        propietario_nombre:
          unidadRelacion?.propietario_nombre || "Sin propietario",
        agente_nombre: agenteRelacion?.nombre || "Agente no identificado",
        balance_vencido: Number(colaRelacion?.balance_vencido || 0),
        contenido: String(colaRelacion?.contenido || ""),
        asunto: colaRelacion?.asunto || null,
      } satisfies HistorialEnvio;
    });

    setEnvios(lista);
    setLoading(false);
  }

  const enviosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return envios.filter((item) => {
      const fechaBase = (item.fecha_envio || item.created_at || "").slice(0, 10);

      const coincideBusqueda =
        !texto ||
        [
          item.unidad_codigo,
          item.propietario_nombre,
          item.destino,
          item.agente_nombre,
          item.proveedor || "",
          item.proveedor_mensaje_id || "",
          item.mensaje_error || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(texto);

      const coincideEstado =
        filtroEstado === "TODOS" || item.estado === filtroEstado;

      const coincideCanal =
        filtroCanal === "TODOS" || item.canal === filtroCanal;

      const coincideDesde = !fechaDesde || fechaBase >= fechaDesde;
      const coincideHasta = !fechaHasta || fechaBase <= fechaHasta;

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideCanal &&
        coincideDesde &&
        coincideHasta
      );
    });
  }, [
    envios,
    busqueda,
    filtroEstado,
    filtroCanal,
    fechaDesde,
    fechaHasta,
  ]);

  const enviados = envios.filter((item) => item.estado === "ENVIADO").length;
  const entregados = envios.filter(
    (item) => item.estado === "ENTREGADO"
  ).length;
  const leidos = envios.filter((item) => item.estado === "LEIDO").length;
  const fallidos = envios.filter((item) => item.estado === "FALLIDO").length;

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
        title="Historial de Envíos"
        subtitle={`Trazabilidad de mensajes procesados. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={History}
        actions={
          <button
            type="button"
            onClick={() => cargarHistorial()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Enviados"
          value={String(enviados)}
          subtitle="Aceptados por el proveedor"
          icon={CheckCircle2}
          tone="green"
        />

        <StatCard
          title="Entregados"
          value={String(entregados)}
          subtitle="Confirmados en destino"
          icon={MailCheck}
          tone="blue"
        />

        <StatCard
          title="Leídos"
          value={String(leidos)}
          subtitle="Confirmación de lectura"
          icon={Eye}
          tone="amber"
        />

        <StatCard
          title="Fallidos"
          value={String(fallidos)}
          subtitle="Requieren revisión"
          icon={XCircle}
          tone="red"
        />
      </div>

      <SectionCard
        title="Registros de envío"
        subtitle="Consulta técnica y operativa de cada comunicación."
      >
        <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_190px_190px_170px_170px]">
          <div className="flex items-center rounded-xl border bg-white px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por unidad, propietario, destino, agente o proveedor..."
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
            <option value="ENVIANDO">Enviando</option>
            <option value="ENVIADO">Enviados</option>
            <option value="ENTREGADO">Entregados</option>
            <option value="LEIDO">Leídos</option>
            <option value="FALLIDO">Fallidos</option>
            <option value="CANCELADO">Cancelados</option>
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

          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="rounded-xl border bg-white px-4 py-3 text-sm"
            title="Fecha desde"
          />

          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-xl border bg-white px-4 py-3 text-sm"
            title="Fecha hasta"
          />
        </div>

        {loading ? (
          <div className="rounded-xl border bg-slate-50 p-8 text-center text-sm text-slate-500">
            Cargando historial...
          </div>
        ) : enviosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin registros"
            description="No existen envíos que coincidan con los filtros seleccionados."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Unidad / propietario</th>
                  <th className="px-4 py-3">Canal / destino</th>
                  <th className="px-4 py-3">Agente</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-center">Detalle</th>
                </tr>
              </thead>

              <tbody className="divide-y bg-white">
                {enviosFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-800">
                        {fechaHora(item.fecha_envio || item.created_at)}
                      </p>
                      {item.fecha_entrega && (
                        <p className="mt-1 text-xs text-slate-500">
                          Entregado: {fechaHora(item.fecha_entrega)}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-black text-slate-900">
                        {item.unidad_codigo}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        {item.propietario_nombre}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                        <span className="font-black text-slate-800">
                          {item.canal}
                        </span>
                      </div>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {item.destino}
                      </p>
                    </td>

                    <td className="px-4 py-4 font-semibold text-slate-700">
                      {item.agente_nombre}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-700">
                        {item.proveedor || "Sin proveedor"}
                      </p>
                      {item.proveedor_mensaje_id && (
                        <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                          {item.proveedor_mensaje_id}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${claseEstado(
                          item.estado
                        )}`}
                      >
                        {item.estado}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right font-black text-red-700">
                      RD$ {dinero(item.balance_vencido)}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSeleccionado(item)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {seleccionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Detalle del envío
                </h2>
                <p className="text-sm text-slate-500">
                  Unidad {seleccionado.unidad_codigo}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSeleccionado(null)}
                className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Dato label="Propietario" value={seleccionado.propietario_nombre} />
                <Dato label="Destino" value={seleccionado.destino} />
                <Dato label="Canal" value={seleccionado.canal} />
                <Dato label="Estado" value={seleccionado.estado} />
                <Dato label="Agente" value={seleccionado.agente_nombre} />
                <Dato
                  label="Balance vencido"
                  value={`RD$ ${dinero(seleccionado.balance_vencido)}`}
                />
                <Dato
                  label="Fecha de envío"
                  value={fechaHora(seleccionado.fecha_envio)}
                />
                <Dato
                  label="Fecha de entrega"
                  value={fechaHora(seleccionado.fecha_entrega)}
                />
                <Dato
                  label="Fecha de lectura"
                  value={fechaHora(seleccionado.fecha_lectura)}
                />
                <Dato
                  label="Proveedor"
                  value={seleccionado.proveedor || "-"}
                />
              </div>

              {seleccionado.asunto && (
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Asunto
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {seleccionado.asunto}
                  </p>
                </div>
              )}

              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-500">
                  Mensaje
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                  {seleccionado.contenido || "Sin contenido disponible."}
                </p>
              </div>

              {(seleccionado.codigo_error || seleccionado.mensaje_error) && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-black text-red-800">
                    Error del envío
                  </p>
                  <p className="mt-2 text-sm text-red-700">
                    {seleccionado.codigo_error
                      ? `[${seleccionado.codigo_error}] `
                      : ""}
                    {seleccionado.mensaje_error || "Sin detalle."}
                  </p>
                </div>
              )}

              {seleccionado.respuesta && (
                <div className="rounded-xl border bg-slate-950 p-4">
                  <p className="text-xs font-black uppercase text-slate-300">
                    Respuesta técnica
                  </p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-100">
                    {JSON.stringify(seleccionado.respuesta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function Dato({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}
