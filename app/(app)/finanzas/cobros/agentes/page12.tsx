"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  CircleOff,
  Edit3,
  FileText,
  History,
  ListChecks,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldOff,
  Trash2,
  Users,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type Agente = {
  id: number;
  client_id: number | null;
  empresa_id: number;
  sucursal_id: number;
  condominio_id: number;
  plantilla_id: number | null;
  nombre: string;
  descripcion: string | null;
  tipo_agente:
    | "RECORDATORIO_PREVENTIVO"
    | "COBRO_VENCIDO"
    | "COBRO_MORA"
    | "SEGUIMIENTO";
  canal: "WHATSAPP" | "CORREO" | "SMS" | "NOTIFICACION";
  activo: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  prioridad: number;
  maximo_envios_mes: number;
  dias_espera_entre_envios: number;
  created_at: string;
};

type Plantilla = {
  id: number;
  nombre: string;
  canal: string;
  activa: boolean;
};

type CondominioContexto = {
  client_id: number | null;
  empresa_id: number | null;
  sucursal_id: number | null;
};

const FORM_INICIAL = {
  id: null as number | null,
  nombre: "",
  descripcion: "",
  tipo_agente: "COBRO_VENCIDO" as Agente["tipo_agente"],
  canal: "WHATSAPP" as Agente["canal"],
  plantilla_id: "",
  activo: false,
  fecha_inicio: "",
  fecha_fin: "",
  prioridad: "1",
  maximo_envios_mes: "4",
  dias_espera_entre_envios: "7",
};

function textoTipo(tipo: Agente["tipo_agente"]) {
  const textos: Record<Agente["tipo_agente"], string> = {
    RECORDATORIO_PREVENTIVO: "Recordatorio preventivo",
    COBRO_VENCIDO: "Cobro vencido",
    COBRO_MORA: "Cobro en mora",
    SEGUIMIENTO: "Seguimiento",
  };

  return textos[tipo];
}

export default function CobrosAgentesPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [contexto, setContexto] = useState<CondominioContexto>({
    client_id: null,
    empresa_id: null,
    sucursal_id: null,
  });

  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
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

    cargarTodo(id);
  }, []);

  async function cargarTodo(id = condominioId) {
    if (!id) return;

    setLoading(true);
    setError("");

    const [condominioResp, agentesResp, plantillasResp] = await Promise.all([
      supabase
        .from("condominios")
        .select("client_id, empresa_id, sucursal_id")
        .eq("id", Number(id))
        .maybeSingle(),
      supabase
        .from("cobros_agentes")
        .select("*")
        .eq("condominio_id", Number(id))
        .order("prioridad", { ascending: true })
        .order("nombre", { ascending: true }),
      supabase
        .from("cobros_plantillas")
        .select("id, nombre, canal, activa")
        .eq("condominio_id", Number(id))
        .eq("activa", true)
        .order("nombre", { ascending: true }),
    ]);

    if (condominioResp.error) {
      setError(
        `No se pudo cargar el contexto del condominio: ${condominioResp.error.message}`
      );
      setLoading(false);
      return;
    }

    setContexto({
      client_id: condominioResp.data?.client_id ?? null,
      empresa_id: condominioResp.data?.empresa_id ?? null,
      sucursal_id: condominioResp.data?.sucursal_id ?? null,
    });

    if (agentesResp.error) {
      setError(`No se pudieron cargar los agentes: ${agentesResp.error.message}`);
      setAgentes([]);
    } else {
      setAgentes((agentesResp.data || []) as Agente[]);
    }

    if (plantillasResp.error) {
      setError(
        `No se pudieron cargar las plantillas: ${plantillasResp.error.message}`
      );
      setPlantillas([]);
    } else {
      setPlantillas((plantillasResp.data || []) as Plantilla[]);
    }

    setLoading(false);
  }

  const agentesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return agentes;

    return agentes.filter((agente) =>
      [
        agente.nombre,
        agente.descripcion || "",
        textoTipo(agente.tipo_agente),
        agente.canal,
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto)
    );
  }, [agentes, busqueda]);

  const activos = agentes.filter((item) => item.activo).length;
  const inactivos = agentes.length - activos;
  const conPlantilla = agentes.filter((item) => item.plantilla_id).length;

  function limpiarFormulario() {
    setForm(FORM_INICIAL);
  }

  function editarAgente(agente: Agente) {
    setForm({
      id: agente.id,
      nombre: agente.nombre,
      descripcion: agente.descripcion || "",
      tipo_agente: agente.tipo_agente,
      canal: agente.canal,
      plantilla_id: agente.plantilla_id ? String(agente.plantilla_id) : "",
      activo: agente.activo,
      fecha_inicio: agente.fecha_inicio || "",
      fecha_fin: agente.fecha_fin || "",
      prioridad: String(agente.prioridad),
      maximo_envios_mes: String(agente.maximo_envios_mes),
      dias_espera_entre_envios: String(agente.dias_espera_entre_envios),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validar() {
    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return false;
    }

    if (!contexto.empresa_id || !contexto.sucursal_id) {
      alert(
        "El condominio no tiene empresa o sucursal asignada. Revise su configuración."
      );
      return false;
    }

    if (!form.nombre.trim()) {
      alert("Debe indicar el nombre del agente.");
      return false;
    }

    if (Number(form.prioridad) < 1 || Number(form.prioridad) > 10) {
      alert("La prioridad debe estar entre 1 y 10.");
      return false;
    }

    if (Number(form.maximo_envios_mes) < 1) {
      alert("El máximo de envíos mensuales debe ser mayor que cero.");
      return false;
    }

    if (Number(form.dias_espera_entre_envios) < 0) {
      alert("Los días de espera no pueden ser negativos.");
      return false;
    }

    if (
      form.fecha_inicio &&
      form.fecha_fin &&
      form.fecha_fin < form.fecha_inicio
    ) {
      alert("La fecha final no puede ser anterior a la fecha inicial.");
      return false;
    }

    return true;
  }

  async function guardarAgente() {
    if (!validar()) return;

    setGuardando(true);

    const registro = {
      client_id: contexto.client_id,
      empresa_id: contexto.empresa_id,
      sucursal_id: contexto.sucursal_id,
      condominio_id: Number(condominioId),
      plantilla_id: form.plantilla_id ? Number(form.plantilla_id) : null,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      tipo_agente: form.tipo_agente,
      canal: form.canal,
      activo: form.activo,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      prioridad: Number(form.prioridad),
      maximo_envios_mes: Number(form.maximo_envios_mes),
      dias_espera_entre_envios: Number(form.dias_espera_entre_envios),
    };

    const respuesta = form.id
      ? await supabase
          .from("cobros_agentes")
          .update(registro)
          .eq("id", form.id)
          .eq("condominio_id", Number(condominioId))
      : await supabase.from("cobros_agentes").insert([registro]);

    setGuardando(false);

    if (respuesta.error) {
      alert(`No se pudo guardar el agente: ${respuesta.error.message}`);
      return;
    }

    alert(form.id ? "Agente actualizado correctamente." : "Agente creado correctamente.");
    limpiarFormulario();
    cargarTodo(condominioId);
  }

  async function cambiarEstado(agente: Agente) {
    if (!agente.activo && !agente.plantilla_id) {
      alert("Antes de activar el agente debe asignarle una plantilla.");
      return;
    }

    const { error: cambioError } = await supabase
      .from("cobros_agentes")
      .update({ activo: !agente.activo })
      .eq("id", agente.id)
      .eq("condominio_id", Number(condominioId));

    if (cambioError) {
      alert(`No se pudo cambiar el estado: ${cambioError.message}`);
      return;
    }

    cargarTodo(condominioId);
  }

  async function eliminarAgente(agente: Agente) {
    const confirmar = confirm(
      `¿Desea eliminar el agente "${agente.nombre}"?\n\n` +
        "También se eliminarán sus horarios y condiciones."
    );

    if (!confirmar) return;

    const { error: eliminarError } = await supabase
      .from("cobros_agentes")
      .delete()
      .eq("id", agente.id)
      .eq("condominio_id", Number(condominioId));

    if (eliminarError) {
      alert(`No se pudo eliminar el agente: ${eliminarError.message}`);
      return;
    }

    if (form.id === agente.id) limpiarFormulario();
    cargarTodo(condominioId);
  }

  const plantillasDelCanal = plantillas.filter(
    (plantilla) => plantilla.canal === form.canal
  );

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
        title="Agentes de Cobro"
        subtitle={`Configuración de agentes automatizados. Condominio: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={Bot}
        actions={
          <button
            type="button"
            onClick={() => cargarTodo()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Agentes configurados"
          value={String(agentes.length)}
          subtitle={condominioNombre || "Condominio activo"}
          icon={Bot}
          tone="blue"
        />

        <StatCard
          title="Agentes activos"
          value={String(activos)}
          subtitle="Habilitados para operar"
          icon={CheckCircle2}
          tone="green"
        />

        <StatCard
          title="Agentes inactivos"
          value={String(inactivos)}
          subtitle="Sin ejecución automática"
          icon={CircleOff}
          tone="slate"
        />

        <StatCard
          title="Con plantilla"
          value={String(conPlantilla)}
          subtitle="Listos para completar"
          icon={Settings2}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
        <SectionCard
          title={form.id ? "Editar agente" : "Nuevo agente"}
          subtitle="Los agentes se crean inactivos hasta completar su configuración."
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Nombre del agente *
              </label>
              <input
                value={form.nombre}
                onChange={(e) =>
                  setForm((actual) => ({ ...actual, nombre: e.target.value }))
                }
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Ejemplo: Cobro semanal de vencidos"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Descripción
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    descripcion: e.target.value,
                  }))
                }
                rows={3}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm"
                placeholder="Objetivo y alcance del agente."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Tipo de agente
                </label>
                <select
                  value={form.tipo_agente}
                  onChange={(e) =>
                    setForm((actual) => ({
                      ...actual,
                      tipo_agente: e.target.value as Agente["tipo_agente"],
                    }))
                  }
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  <option value="RECORDATORIO_PREVENTIVO">
                    Recordatorio preventivo
                  </option>
                  <option value="COBRO_VENCIDO">Cobro vencido</option>
                  <option value="COBRO_MORA">Cobro en mora</option>
                  <option value="SEGUIMIENTO">Seguimiento</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Canal
                </label>
                <select
                  value={form.canal}
                  onChange={(e) =>
                    setForm((actual) => ({
                      ...actual,
                      canal: e.target.value as Agente["canal"],
                      plantilla_id: "",
                    }))
                  }
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="CORREO">Correo</option>
                  <option value="SMS">SMS</option>
                  <option value="NOTIFICACION">Notificación</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Plantilla
              </label>
              <select
                value={form.plantilla_id}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    plantilla_id: e.target.value,
                  }))
                }
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              >
                <option value="">Sin plantilla asignada</option>
                {plantillasDelCanal.map((plantilla) => (
                  <option key={plantilla.id} value={plantilla.id}>
                    {plantilla.nombre}
                  </option>
                ))}
              </select>

              {plantillasDelCanal.length === 0 && (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  No existen plantillas activas para este canal.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Prioridad
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.prioridad}
                  onChange={(e) =>
                    setForm((actual) => ({
                      ...actual,
                      prioridad: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Máximo mensual
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.maximo_envios_mes}
                  onChange={(e) =>
                    setForm((actual) => ({
                      ...actual,
                      maximo_envios_mes: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Días entre mensajes
              </label>
              <input
                type="number"
                min={0}
                value={form.dias_espera_entre_envios}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    dias_espera_entre_envios: e.target.value,
                  }))
                }
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Fecha inicial
                </label>
                <input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) =>
                    setForm((actual) => ({
                      ...actual,
                      fecha_inicio: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Fecha final
                </label>
                <input
                  type="date"
                  value={form.fecha_fin}
                  onChange={(e) =>
                    setForm((actual) => ({
                      ...actual,
                      fecha_fin: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Estado inicial
              </label>
              <select
                value={form.activo ? "ACTIVO" : "INACTIVO"}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    activo: e.target.value === "ACTIVO",
                  }))
                }
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              >
                <option value="INACTIVO">Inactivo</option>
                <option value="ACTIVO">Activo</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={guardarAgente}
                disabled={guardando}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
              >
                <Save className="h-4 w-4" />
                {guardando
                  ? "Guardando..."
                  : form.id
                  ? "Actualizar agente"
                  : "Crear agente"}
              </button>

              {form.id && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="rounded-xl border bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Agentes configurados"
          subtitle="Cada agente pertenece exclusivamente al condominio activo."
        >
          <div className="mb-4 flex items-center rounded-xl border bg-white px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar agente..."
              className="w-full bg-transparent px-3 py-3 text-sm outline-none"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border bg-slate-50 p-8 text-center text-sm text-slate-500">
              Cargando agentes...
            </div>
          ) : agentesFiltrados.length === 0 ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-8 text-center">
              <Bot className="mx-auto h-10 w-10 text-blue-600" />
              <p className="mt-3 font-black text-blue-900">
                No hay agentes configurados.
              </p>
              <p className="mt-1 text-sm text-blue-700">
                Cree el primer agente desde el formulario.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {agentesFiltrados.map((agente) => (
                <article
                  key={agente.id}
                  className="rounded-2xl border bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-900">
                          {agente.nombre}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            agente.activo
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {agente.activo ? "ACTIVO" : "INACTIVO"}
                        </span>

                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-black text-blue-700">
                          {agente.canal}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-600">
                        {agente.descripcion || "Sin descripción"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                          {textoTipo(agente.tipo_agente)}
                        </span>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                          Prioridad {agente.prioridad}
                        </span>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                          Máx. {agente.maximo_envios_mes}/mes
                        </span>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                          Espera {agente.dias_espera_entre_envios} día(s)
                        </span>
                        <span
                          className={`rounded-lg px-2.5 py-1.5 ${
                            agente.plantilla_id
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {agente.plantilla_id
                            ? "Plantilla asignada"
                            : "Sin plantilla"}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/finanzas/cobros/agentes/${agente.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                      >
                        <CalendarClock className="h-4 w-4" />
                        Configurar
                      </Link>

                      <button
                        type="button"
                        onClick={() => cambiarEstado(agente)}
                        className={`rounded-xl px-3 py-2 text-xs font-black ${
                          agente.activo
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }`}
                      >
                        {agente.activo ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => editarAgente(agente)}
                        className="inline-flex items-center gap-1 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                      >
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarAgente(agente)}
                        className="inline-flex items-center gap-1 rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
