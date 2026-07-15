"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CalendarDays,
  CircleDollarSign,
  Edit3,
  FileText,
  History,
  ListChecks,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldOff,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";
import StatCard from "@/components/vam/enterprise/StatCard";

type Unidad = {
  id: number;
  condominio_id: number;
  codigo: string;
  propietario_id: number | null;
  propietario_nombre: string | null;
  activa: boolean | null;
};

type Agente = {
  id: number;
  nombre: string;
  activo: boolean;
};

type Exclusion = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  propietario_id: number | null;
  agente_id: number | null;
  motivo: string;
  observacion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
  unidad_codigo: string;
  propietario_nombre: string;
  agente_nombre: string | null;
};

const FORM_INICIAL = {
  id: null as number | null,
  unidad_id: "",
  agente_id: "",
  motivo: "",
  observacion: "",
  fecha_inicio: new Date().toISOString().slice(0, 10),
  fecha_fin: "",
  activa: true,
};

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  return String(valor).split("T")[0];
}

function estadoVigencia(exclusion: Exclusion) {
  const hoy = new Date().toISOString().slice(0, 10);

  if (!exclusion.activa) return "INACTIVA";
  if (exclusion.fecha_inicio > hoy) return "PROGRAMADA";
  if (exclusion.fecha_fin && exclusion.fecha_fin < hoy) return "VENCIDA";
  return "VIGENTE";
}

function claseVigencia(estado: string) {
  if (estado === "VIGENTE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (estado === "PROGRAMADA") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (estado === "VENCIDA") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

export default function CobrosExclusionesPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [exclusiones, setExclusiones] = useState<Exclusion[]>([]);

  const [form, setForm] = useState(FORM_INICIAL);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

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

    const [unidadesResp, agentesResp, exclusionesResp] = await Promise.all([
      supabase
        .from("unidades")
        .select(
          "id, condominio_id, codigo, propietario_id, propietario_nombre, activa"
        )
        .eq("condominio_id", Number(id))
        .eq("activa", true)
        .order("codigo", { ascending: true }),

      supabase
        .from("cobros_agentes")
        .select("id, nombre, activo")
        .eq("condominio_id", Number(id))
        .order("nombre", { ascending: true }),

      supabase
        .from("cobros_exclusiones")
        .select(
          `
          id,
          condominio_id,
          unidad_id,
          propietario_id,
          agente_id,
          motivo,
          observacion,
          fecha_inicio,
          fecha_fin,
          activa,
          created_at,
          updated_at,
          unidades (
            codigo,
            propietario_nombre
          ),
          cobros_agentes (
            nombre
          )
        `
        )
        .eq("condominio_id", Number(id))
        .order("activa", { ascending: false })
        .order("fecha_inicio", { ascending: false })
        .order("id", { ascending: false }),
    ]);

    if (unidadesResp.error) {
      setUnidades([]);
      setError("No se pudieron cargar las unidades: " + unidadesResp.error.message);
    } else {
      setUnidades((unidadesResp.data || []) as Unidad[]);
    }

    if (agentesResp.error) {
      setAgentes([]);
      setError("No se pudieron cargar los agentes: " + agentesResp.error.message);
    } else {
      setAgentes((agentesResp.data || []) as Agente[]);
    }

    if (exclusionesResp.error) {
      setExclusiones([]);
      setError(
        "No se pudieron cargar las exclusiones: " +
          exclusionesResp.error.message
      );
    } else {
      const lista = (exclusionesResp.data || []).map((item: any) => {
        const unidadRelacion = Array.isArray(item.unidades)
          ? item.unidades[0]
          : item.unidades;

        const agenteRelacion = Array.isArray(item.cobros_agentes)
          ? item.cobros_agentes[0]
          : item.cobros_agentes;

        return {
          id: Number(item.id),
          condominio_id: Number(item.condominio_id),
          unidad_id: Number(item.unidad_id),
          propietario_id: item.propietario_id
            ? Number(item.propietario_id)
            : null,
          agente_id: item.agente_id ? Number(item.agente_id) : null,
          motivo: String(item.motivo || ""),
          observacion: item.observacion || null,
          fecha_inicio: String(item.fecha_inicio || ""),
          fecha_fin: item.fecha_fin || null,
          activa: Boolean(item.activa),
          created_at: String(item.created_at || ""),
          updated_at: String(item.updated_at || ""),
          unidad_codigo: unidadRelacion?.codigo || "-",
          propietario_nombre:
            unidadRelacion?.propietario_nombre || "Sin propietario",
          agente_nombre: agenteRelacion?.nombre || null,
        } satisfies Exclusion;
      });

      setExclusiones(lista);
    }

    setLoading(false);
  }

  const unidadSeleccionada = useMemo(
    () => unidades.find((item) => String(item.id) === form.unidad_id) || null,
    [unidades, form.unidad_id]
  );

  const exclusionesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return exclusiones.filter((item) => {
      const estado = estadoVigencia(item);

      const coincideBusqueda =
        !texto ||
        [
          item.unidad_codigo,
          item.propietario_nombre,
          item.motivo,
          item.observacion || "",
          item.agente_nombre || "Todos los agentes",
        ]
          .join(" ")
          .toLowerCase()
          .includes(texto);

      const coincideEstado =
        filtroEstado === "TODOS" || estado === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [exclusiones, busqueda, filtroEstado]);

  const vigentes = exclusiones.filter(
    (item) => estadoVigencia(item) === "VIGENTE"
  ).length;

  const programadas = exclusiones.filter(
    (item) => estadoVigencia(item) === "PROGRAMADA"
  ).length;

  const vencidas = exclusiones.filter(
    (item) => estadoVigencia(item) === "VENCIDA"
  ).length;

  function limpiarFormulario() {
    setForm({
      ...FORM_INICIAL,
      fecha_inicio: new Date().toISOString().slice(0, 10),
    });
  }

  function editarExclusion(exclusion: Exclusion) {
    setForm({
      id: exclusion.id,
      unidad_id: String(exclusion.unidad_id),
      agente_id: exclusion.agente_id ? String(exclusion.agente_id) : "",
      motivo: exclusion.motivo,
      observacion: exclusion.observacion || "",
      fecha_inicio: exclusion.fecha_inicio,
      fecha_fin: exclusion.fecha_fin || "",
      activa: exclusion.activa,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validarFormulario() {
    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return false;
    }

    if (!form.unidad_id) {
      alert("Debe seleccionar una unidad.");
      return false;
    }

    if (!form.motivo.trim()) {
      alert("Debe indicar el motivo de la exclusión.");
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

  async function guardarExclusion() {
    if (!validarFormulario()) return;

    const unidad = unidades.find(
      (item) => String(item.id) === form.unidad_id
    );

    if (!unidad || Number(unidad.condominio_id) !== Number(condominioId)) {
      alert("La unidad seleccionada no pertenece al condominio activo.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const registro = {
      condominio_id: Number(condominioId),
      unidad_id: Number(form.unidad_id),
      propietario_id: unidad.propietario_id || null,
      agente_id: form.agente_id ? Number(form.agente_id) : null,
      motivo: form.motivo.trim(),
      observacion: form.observacion.trim() || null,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      activa: form.activa,
    };

    const respuesta = form.id
      ? await supabase
          .from("cobros_exclusiones")
          .update(registro)
          .eq("id", form.id)
          .eq("condominio_id", Number(condominioId))
      : await supabase.from("cobros_exclusiones").insert([registro]);

    setGuardando(false);

    if (respuesta.error) {
      setError("No se pudo guardar la exclusión: " + respuesta.error.message);
      return;
    }

    setMensaje(
      form.id
        ? "Exclusión actualizada correctamente."
        : "Exclusión registrada correctamente."
    );

    limpiarFormulario();
    await cargarTodo(condominioId);
  }

  async function cambiarEstado(exclusion: Exclusion) {
    const { error: cambioError } = await supabase
      .from("cobros_exclusiones")
      .update({ activa: !exclusion.activa })
      .eq("id", exclusion.id)
      .eq("condominio_id", Number(condominioId));

    if (cambioError) {
      alert("No se pudo cambiar el estado: " + cambioError.message);
      return;
    }

    await cargarTodo(condominioId);
  }

  async function eliminarExclusion(exclusion: Exclusion) {
    const confirmar = confirm(
      `¿Desea eliminar la exclusión de la unidad ${exclusion.unidad_codigo}?`
    );

    if (!confirmar) return;

    const { error: eliminarError } = await supabase
      .from("cobros_exclusiones")
      .delete()
      .eq("id", exclusion.id)
      .eq("condominio_id", Number(condominioId));

    if (eliminarError) {
      alert("No se pudo eliminar la exclusión: " + eliminarError.message);
      return;
    }

    if (form.id === exclusion.id) limpiarFormulario();

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
        title="Exclusiones de Cobro"
        subtitle={`Pausa temporal o permanente de comunicaciones. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={ShieldOff}
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
          title="Exclusiones"
          value={String(exclusiones.length)}
          subtitle="Registros configurados"
          icon={ShieldOff}
          tone="blue"
        />

        <StatCard
          title="Vigentes"
          value={String(vigentes)}
          subtitle="Pausas actualmente activas"
          icon={ShieldOff}
          tone="green"
        />

        <StatCard
          title="Programadas"
          value={String(programadas)}
          subtitle="Pendientes de iniciar"
          icon={CalendarDays}
          tone="amber"
        />

        <StatCard
          title="Vencidas"
          value={String(vencidas)}
          subtitle="Fuera del período"
          icon={CalendarDays}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[430px_1fr]">
        <SectionCard
          title={form.id ? "Editar exclusión" : "Nueva exclusión"}
          subtitle="La exclusión puede afectar a todos los agentes o a uno específico."
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Unidad *
              </label>
              <select
                value={form.unidad_id}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    unidad_id: e.target.value,
                  }))
                }
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              >
                <option value="">Seleccione una unidad</option>
                {unidades.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.codigo} -{" "}
                    {unidad.propietario_nombre || "Sin propietario"}
                  </option>
                ))}
              </select>
            </div>

            {unidadSeleccionada && (
              <div className="rounded-xl border bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase text-slate-500">
                  Unidad seleccionada
                </p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  {unidadSeleccionada.codigo} -{" "}
                  {unidadSeleccionada.propietario_nombre || "Sin propietario"}
                </p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Aplicar a
              </label>
              <select
                value={form.agente_id}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    agente_id: e.target.value,
                  }))
                }
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              >
                <option value="">Todos los agentes</option>
                {agentes.map((agente) => (
                  <option key={agente.id} value={agente.id}>
                    {agente.nombre}
                    {!agente.activo ? " (inactivo)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Motivo *
              </label>
              <input
                value={form.motivo}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    motivo: e.target.value,
                  }))
                }
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Ej. Acuerdo de pago vigente"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Observación
              </label>
              <textarea
                value={form.observacion}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    observacion: e.target.value,
                  }))
                }
                rows={3}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm"
                placeholder="Detalle administrativo de la exclusión."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Fecha inicial *
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
                <label className="mb-1 block text-sm font-semibold">
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

            <label className="flex items-center gap-3 rounded-xl border bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={form.activa}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    activa: e.target.checked,
                  }))
                }
              />
              <span className="text-sm font-bold text-slate-700">
                Exclusión activa
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={guardarExclusion}
                disabled={guardando}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
              >
                <Save className="h-4 w-4" />
                {guardando
                  ? "Guardando..."
                  : form.id
                    ? "Actualizar exclusión"
                    : "Registrar exclusión"}
              </button>

              {form.id && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Exclusiones registradas"
          subtitle="Las unidades excluidas no deben entrar en la cola del agente aplicable."
        >
          <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
            <div className="flex items-center rounded-xl border bg-white px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por unidad, propietario, motivo o agente..."
                className="w-full bg-transparent px-3 py-3 text-sm outline-none"
              />
            </div>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="VIGENTE">Vigentes</option>
              <option value="PROGRAMADA">Programadas</option>
              <option value="VENCIDA">Vencidas</option>
              <option value="INACTIVA">Inactivas</option>
            </select>
          </div>

          {loading ? (
            <div className="rounded-xl border bg-slate-50 p-8 text-center text-sm text-slate-500">
              Cargando exclusiones...
            </div>
          ) : exclusionesFiltradas.length === 0 ? (
            <EmptyState
              title="Sin exclusiones"
              description="No existen exclusiones que coincidan con los filtros."
            />
          ) : (
            <div className="space-y-4">
              {exclusionesFiltradas.map((exclusion) => {
                const estado = estadoVigencia(exclusion);

                return (
                  <article
                    key={exclusion.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">
                            {exclusion.unidad_codigo}
                          </h3>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${claseVigencia(
                              estado
                            )}`}
                          >
                            {estado}
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {exclusion.propietario_nombre}
                        </p>

                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="rounded-xl border bg-slate-50 p-3">
                            <p className="text-xs font-black uppercase text-slate-500">
                              Motivo
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-800">
                              {exclusion.motivo}
                            </p>
                          </div>

                          <div className="rounded-xl border bg-slate-50 p-3">
                            <p className="text-xs font-black uppercase text-slate-500">
                              Aplica a
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-800">
                              {exclusion.agente_nombre || "Todos los agentes"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                            Desde {fechaCorta(exclusion.fecha_inicio)}
                          </span>
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                            Hasta {fechaCorta(exclusion.fecha_fin)}
                          </span>
                        </div>

                        {exclusion.observacion && (
                          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                            {exclusion.observacion}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => cambiarEstado(exclusion)}
                          className={`rounded-xl px-3 py-2 text-xs font-black ${
                            exclusion.activa
                              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          }`}
                        >
                          {exclusion.activa ? "Desactivar" : "Activar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => editarExclusion(exclusion)}
                          className="inline-flex items-center gap-1 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                        >
                          <Edit3 className="h-4 w-4" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarExclusion(exclusion)}
                          className="inline-flex items-center gap-1 rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
