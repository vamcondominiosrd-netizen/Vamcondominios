"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
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
import EmptyState from "@/components/vam/enterprise/EmptyState";

type CanalPlantilla = "WHATSAPP" | "CORREO" | "SMS" | "NOTIFICACION";

type Plantilla = {
  id: number;
  client_id: number | null;
  empresa_id: number;
  sucursal_id: number;
  condominio_id: number;
  nombre: string;
  descripcion: string | null;
  canal: CanalPlantilla;
  asunto: string | null;
  contenido: string;
  activa: boolean;
  es_predeterminada: boolean;
  created_at: string;
  updated_at: string;
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
  canal: "WHATSAPP" as CanalPlantilla,
  asunto: "",
  contenido:
    "Estimado(a) {{propietario}}, le informamos que la unidad {{unidad}} mantiene un balance vencido de RD$ {{balance}}, correspondiente al período {{periodo_inicial}} hasta {{periodo_final}}. Agradecemos ponerse al día.",
  activa: true,
  es_predeterminada: false,
};

const VARIABLES = [
  "{{propietario}}",
  "{{unidad}}",
  "{{condominio}}",
  "{{balance}}",
  "{{periodo_inicial}}",
  "{{periodo_final}}",
  "{{dias_vencido}}",
  "{{fecha_vencimiento}}",
];

function textoCanal(canal: CanalPlantilla) {
  const textos: Record<CanalPlantilla, string> = {
    WHATSAPP: "WhatsApp",
    CORREO: "Correo",
    SMS: "SMS",
    NOTIFICACION: "Notificación",
  };

  return textos[canal];
}

export default function CobrosPlantillasPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [contexto, setContexto] = useState<CondominioContexto>({
    client_id: null,
    empresa_id: null,
    sucursal_id: null,
  });

  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCanal, setFiltroCanal] = useState("TODOS");

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
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

    cargarTodo(id);
  }, []);

  async function cargarTodo(id = condominioId) {
    if (!id) return;

    setLoading(true);
    setError("");
    setMensaje("");

    const [condominioResp, plantillasResp] = await Promise.all([
      supabase
        .from("condominios")
        .select("client_id, empresa_id, sucursal_id")
        .eq("id", Number(id))
        .maybeSingle(),

      supabase
        .from("cobros_plantillas")
        .select("*")
        .eq("condominio_id", Number(id))
        .order("es_predeterminada", { ascending: false })
        .order("activa", { ascending: false })
        .order("nombre", { ascending: true }),
    ]);

    if (condominioResp.error) {
      setError(
        "No se pudo cargar el contexto del condominio: " +
          condominioResp.error.message
      );
      setLoading(false);
      return;
    }

    setContexto({
      client_id: condominioResp.data?.client_id ?? null,
      empresa_id: condominioResp.data?.empresa_id ?? null,
      sucursal_id: condominioResp.data?.sucursal_id ?? null,
    });

    if (plantillasResp.error) {
      setPlantillas([]);
      setError(
        "No se pudieron cargar las plantillas: " +
          plantillasResp.error.message
      );
    } else {
      setPlantillas((plantillasResp.data || []) as Plantilla[]);
    }

    setLoading(false);
  }

  const plantillasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return plantillas.filter((item) => {
      const coincideBusqueda =
        !texto ||
        [
          item.nombre,
          item.descripcion || "",
          item.asunto || "",
          item.contenido,
          textoCanal(item.canal),
        ]
          .join(" ")
          .toLowerCase()
          .includes(texto);

      const coincideCanal =
        filtroCanal === "TODOS" || item.canal === filtroCanal;

      return coincideBusqueda && coincideCanal;
    });
  }, [plantillas, busqueda, filtroCanal]);

  const activas = plantillas.filter((item) => item.activa).length;
  const inactivas = plantillas.length - activas;
  const predeterminadas = plantillas.filter(
    (item) => item.es_predeterminada
  ).length;

  function limpiarFormulario() {
    setForm(FORM_INICIAL);
  }

  function insertarVariable(variable: string) {
    setForm((actual) => ({
      ...actual,
      contenido: `${actual.contenido}${actual.contenido ? " " : ""}${variable}`,
    }));
  }

  function editarPlantilla(plantilla: Plantilla) {
    setForm({
      id: plantilla.id,
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion || "",
      canal: plantilla.canal,
      asunto: plantilla.asunto || "",
      contenido: plantilla.contenido,
      activa: plantilla.activa,
      es_predeterminada: plantilla.es_predeterminada,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validarFormulario() {
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
      alert("Debe indicar el nombre de la plantilla.");
      return false;
    }

    if (!form.contenido.trim()) {
      alert("Debe escribir el contenido del mensaje.");
      return false;
    }

    if (form.canal === "CORREO" && !form.asunto.trim()) {
      alert("Para una plantilla de correo debe indicar el asunto.");
      return false;
    }

    return true;
  }

  async function guardarPlantilla() {
    if (!validarFormulario()) return;

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      if (form.es_predeterminada) {
        const consulta = supabase
          .from("cobros_plantillas")
          .update({ es_predeterminada: false })
          .eq("condominio_id", Number(condominioId))
          .eq("canal", form.canal);

        if (form.id) {
          consulta.neq("id", form.id);
        }

        const { error: errorPredeterminada } = await consulta;

        if (errorPredeterminada) {
          throw new Error(
            "No se pudo actualizar la plantilla predeterminada: " +
              errorPredeterminada.message
          );
        }
      }

      const registro = {
        client_id: contexto.client_id,
        empresa_id: contexto.empresa_id,
        sucursal_id: contexto.sucursal_id,
        condominio_id: Number(condominioId),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        canal: form.canal,
        asunto: form.canal === "CORREO" ? form.asunto.trim() || null : null,
        contenido: form.contenido.trim(),
        activa: form.activa,
        es_predeterminada: form.es_predeterminada,
      };

      const respuesta = form.id
        ? await supabase
            .from("cobros_plantillas")
            .update(registro)
            .eq("id", form.id)
            .eq("condominio_id", Number(condominioId))
        : await supabase.from("cobros_plantillas").insert([registro]);

      if (respuesta.error) {
        throw new Error(respuesta.error.message);
      }

      setMensaje(
        form.id
          ? "Plantilla actualizada correctamente."
          : "Plantilla creada correctamente."
      );

      limpiarFormulario();
      await cargarTodo(condominioId);
    } catch (err: any) {
      setError(
        "No se pudo guardar la plantilla: " +
          (err?.message || "Error desconocido")
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(plantilla: Plantilla) {
    const { error: cambioError } = await supabase
      .from("cobros_plantillas")
      .update({
        activa: !plantilla.activa,
        es_predeterminada: !plantilla.activa
          ? plantilla.es_predeterminada
          : false,
      })
      .eq("id", plantilla.id)
      .eq("condominio_id", Number(condominioId));

    if (cambioError) {
      alert("No se pudo cambiar el estado: " + cambioError.message);
      return;
    }

    await cargarTodo(condominioId);
  }

  async function marcarPredeterminada(plantilla: Plantilla) {
    if (!plantilla.activa) {
      alert("Primero debe activar la plantilla.");
      return;
    }

    const { error: limpiarError } = await supabase
      .from("cobros_plantillas")
      .update({ es_predeterminada: false })
      .eq("condominio_id", Number(condominioId))
      .eq("canal", plantilla.canal)
      .neq("id", plantilla.id);

    if (limpiarError) {
      alert(
        "No se pudo actualizar la plantilla predeterminada: " +
          limpiarError.message
      );
      return;
    }

    const { error: marcarError } = await supabase
      .from("cobros_plantillas")
      .update({ es_predeterminada: true })
      .eq("id", plantilla.id)
      .eq("condominio_id", Number(condominioId));

    if (marcarError) {
      alert(
        "No se pudo marcar como predeterminada: " + marcarError.message
      );
      return;
    }

    await cargarTodo(condominioId);
  }

  async function eliminarPlantilla(plantilla: Plantilla) {
    const confirmar = confirm(
      `¿Desea eliminar la plantilla "${plantilla.nombre}"?\n\n` +
        "Si está asignada a un agente, no podrá eliminarse."
    );

    if (!confirmar) return;

    const { count, error: usoError } = await supabase
      .from("cobros_agentes")
      .select("id", { count: "exact", head: true })
      .eq("condominio_id", Number(condominioId))
      .eq("plantilla_id", plantilla.id);

    if (usoError) {
      alert("No se pudo validar el uso de la plantilla: " + usoError.message);
      return;
    }

    if (Number(count || 0) > 0) {
      alert(
        "Esta plantilla está asignada a uno o más agentes. Desasígnela o desactívela."
      );
      return;
    }

    const { error: eliminarError } = await supabase
      .from("cobros_plantillas")
      .delete()
      .eq("id", plantilla.id)
      .eq("condominio_id", Number(condominioId));

    if (eliminarError) {
      alert("No se pudo eliminar la plantilla: " + eliminarError.message);
      return;
    }

    if (form.id === plantilla.id) limpiarFormulario();

    await cargarTodo(condominioId);
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
        title="Plantillas de Cobro"
        subtitle={`Mensajes reutilizables por canal. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={FileText}
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
          title="Plantillas"
          value={String(plantillas.length)}
          subtitle="Configuradas"
          icon={FileText}
          tone="blue"
        />

        <StatCard
          title="Activas"
          value={String(activas)}
          subtitle="Disponibles para agentes"
          icon={CheckCircle2}
          tone="green"
        />

        <StatCard
          title="Inactivas"
          value={String(inactivas)}
          subtitle="Fuera de uso"
          icon={CircleOff}
          tone="slate"
        />

        <StatCard
          title="Predeterminadas"
          value={String(predeterminadas)}
          subtitle="Una por canal"
          icon={FileText}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[440px_1fr]">
        <SectionCard
          title={form.id ? "Editar plantilla" : "Nueva plantilla"}
          subtitle="Configure el contenido y las variables del mensaje."
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Nombre *
              </label>
              <input
                value={form.nombre}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    nombre: e.target.value,
                  }))
                }
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Ej. Aviso de deuda vencida"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
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
                rows={2}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm"
                placeholder="Uso de esta plantilla."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Canal *
              </label>
              <select
                value={form.canal}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    canal: e.target.value as CanalPlantilla,
                    asunto:
                      e.target.value === "CORREO" ? actual.asunto : "",
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

            {form.canal === "CORREO" && (
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Asunto *
                </label>
                <input
                  value={form.asunto}
                  onChange={(e) =>
                    setForm((actual) => ({
                      ...actual,
                      asunto: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Ej. Aviso de balance pendiente"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Contenido *
              </label>
              <textarea
                value={form.contenido}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    contenido: e.target.value,
                  }))
                }
                rows={9}
                className="w-full resize-y rounded-xl border px-4 py-3 text-sm"
                placeholder="Escriba el mensaje que recibirá el propietario."
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-black uppercase text-slate-500">
                Variables disponibles
              </p>

              <div className="flex flex-wrap gap-2">
                {VARIABLES.map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => insertarVariable(variable)}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.activa}
                  onChange={(e) =>
                    setForm((actual) => ({
                      ...actual,
                      activa: e.target.checked,
                      es_predeterminada: e.target.checked
                        ? actual.es_predeterminada
                        : false,
                    }))
                  }
                />

                <span className="text-sm font-bold text-slate-700">
                  Plantilla activa
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-xl border bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.es_predeterminada}
                  disabled={!form.activa}
                  onChange={(e) =>
                    setForm((actual) => ({
                      ...actual,
                      es_predeterminada: e.target.checked,
                    }))
                  }
                />

                <span className="text-sm font-bold text-slate-700">
                  Predeterminada
                </span>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={guardarPlantilla}
                disabled={guardando}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
              >
                <Save className="h-4 w-4" />
                {guardando
                  ? "Guardando..."
                  : form.id
                    ? "Actualizar plantilla"
                    : "Crear plantilla"}
              </button>

              {form.id && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="rounded-xl border bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Plantillas configuradas"
          subtitle="Cada plantilla pertenece exclusivamente al condominio activo."
        >
          <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
            <div className="flex items-center rounded-xl border bg-white px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar plantilla..."
                className="w-full bg-transparent px-3 py-3 text-sm outline-none"
              />
            </div>

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
              Cargando plantillas...
            </div>
          ) : plantillasFiltradas.length === 0 ? (
            <EmptyState
              title="Sin plantillas"
              description="No existen plantillas que coincidan con los filtros."
            />
          ) : (
            <div className="space-y-4">
              {plantillasFiltradas.map((plantilla) => (
                <article
                  key={plantilla.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">
                          {plantilla.nombre}
                        </h3>

                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-black text-blue-700">
                          {textoCanal(plantilla.canal)}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            plantilla.activa
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {plantilla.activa ? "ACTIVA" : "INACTIVA"}
                        </span>

                        {plantilla.es_predeterminada && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-700">
                            PREDETERMINADA
                          </span>
                        )}
                      </div>

                      {plantilla.descripcion && (
                        <p className="mt-2 text-sm text-slate-600">
                          {plantilla.descripcion}
                        </p>
                      )}

                      {plantilla.asunto && (
                        <div className="mt-3 rounded-xl border bg-slate-50 p-3">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Asunto
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {plantilla.asunto}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 rounded-xl border bg-slate-50 p-4">
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                          {plantilla.contenido}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!plantilla.es_predeterminada && plantilla.activa && (
                        <button
                          type="button"
                          onClick={() => marcarPredeterminada(plantilla)}
                          className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-200"
                        >
                          Predeterminada
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => cambiarEstado(plantilla)}
                        className={`rounded-xl px-3 py-2 text-xs font-black ${
                          plantilla.activa
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }`}
                      >
                        {plantilla.activa ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => editarPlantilla(plantilla)}
                        className="inline-flex items-center gap-1 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                      >
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarPlantilla(plantilla)}
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
