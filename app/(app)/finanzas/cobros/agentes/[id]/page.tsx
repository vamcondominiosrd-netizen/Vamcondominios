"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  History,
  ListChecks,
  RefreshCw,
  Save,
  ShieldOff,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Agente = {
  id: number;
  condominio_id: number;
  nombre: string;
  descripcion: string | null;
  tipo_agente: string;
  canal: string;
  activo: boolean;
  prioridad: number;
  maximo_envios_mes: number;
  dias_espera_entre_envios: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  plantilla_id: number | null;
};

type Horario = {
  id: number;
  agente_id: number;
  condominio_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
};

type Condicion = {
  id: number;
  agente_id: number;
  condominio_id: number;
  dias_vencido_minimo: number;
  dias_vencido_maximo: number | null;
  monto_minimo: number;
  monto_maximo: number | null;
  cantidad_periodos_minima: number;
  cantidad_periodos_maxima: number | null;
  incluir_pendientes: boolean;
  incluir_parciales: boolean;
  solo_unidades_activas: boolean;
  solo_propietarios_activos: boolean;
  activo: boolean;
};

const DIAS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

const CONDICION_INICIAL = {
  dias_vencido_minimo: "1",
  dias_vencido_maximo: "",
  monto_minimo: "0",
  monto_maximo: "",
  cantidad_periodos_minima: "1",
  cantidad_periodos_maxima: "",
  incluir_pendientes: true,
  incluir_parciales: true,
  solo_unidades_activas: true,
  solo_propietarios_activos: true,
  activo: true,
};

const HORARIO_INICIAL = {
  dia_semana: "1",
  hora_inicio: "08:00",
  hora_fin: "17:00",
  activo: true,
};

function horaCorta(valor?: string | null) {
  if (!valor) return "-";
  return String(valor).slice(0, 5);
}

export default function ConfigurarAgentePage() {
  const params = useParams();
  const agenteId = String(params?.id || "");

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [agente, setAgente] = useState<Agente | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [condicionId, setCondicionId] = useState<number | null>(null);

  const [horarioForm, setHorarioForm] = useState(HORARIO_INICIAL);
  const [condicionForm, setCondicionForm] = useState(CONDICION_INICIAL);

  const [loading, setLoading] = useState(true);
  const [guardandoHorario, setGuardandoHorario] = useState(false);
  const [guardandoCondicion, setGuardandoCondicion] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id || !agenteId) {
      setError("No se pudo identificar el condominio o el agente.");
      setLoading(false);
      return;
    }

    cargarTodo(id, agenteId);
  }, [agenteId]);

  async function cargarTodo(
    idCondominio = condominioId,
    idAgente = agenteId
  ) {
    if (!idCondominio || !idAgente) return;

    setLoading(true);
    setError("");
    setMensaje("");

    const [agenteResp, horariosResp, condicionResp] = await Promise.all([
      supabase
        .from("cobros_agentes")
        .select("*")
        .eq("id", Number(idAgente))
        .eq("condominio_id", Number(idCondominio))
        .maybeSingle(),

      supabase
        .from("cobros_agentes_horarios")
        .select("*")
        .eq("agente_id", Number(idAgente))
        .eq("condominio_id", Number(idCondominio))
        .order("dia_semana", { ascending: true })
        .order("hora_inicio", { ascending: true }),

      supabase
        .from("cobros_agentes_condiciones")
        .select("*")
        .eq("agente_id", Number(idAgente))
        .eq("condominio_id", Number(idCondominio))
        .maybeSingle(),
    ]);

    if (agenteResp.error) {
      setAgente(null);
      setError("No se pudo cargar el agente: " + agenteResp.error.message);
    } else {
      setAgente((agenteResp.data || null) as Agente | null);
    }

    if (horariosResp.error) {
      setHorarios([]);
      setError("No se pudieron cargar los horarios: " + horariosResp.error.message);
    } else {
      setHorarios((horariosResp.data || []) as Horario[]);
    }

    if (condicionResp.error) {
      setError(
        "No se pudieron cargar las condiciones: " + condicionResp.error.message
      );
    } else if (condicionResp.data) {
      const item = condicionResp.data as Condicion;
      setCondicionId(item.id);
      setCondicionForm({
        dias_vencido_minimo: String(item.dias_vencido_minimo),
        dias_vencido_maximo:
          item.dias_vencido_maximo === null
            ? ""
            : String(item.dias_vencido_maximo),
        monto_minimo: String(item.monto_minimo),
        monto_maximo:
          item.monto_maximo === null ? "" : String(item.monto_maximo),
        cantidad_periodos_minima: String(item.cantidad_periodos_minima),
        cantidad_periodos_maxima:
          item.cantidad_periodos_maxima === null
            ? ""
            : String(item.cantidad_periodos_maxima),
        incluir_pendientes: item.incluir_pendientes,
        incluir_parciales: item.incluir_parciales,
        solo_unidades_activas: item.solo_unidades_activas,
        solo_propietarios_activos: item.solo_propietarios_activos,
        activo: item.activo,
      });
    } else {
      setCondicionId(null);
      setCondicionForm(CONDICION_INICIAL);
    }

    setLoading(false);
  }

  const horariosActivos = useMemo(
    () => horarios.filter((item) => item.activo).length,
    [horarios]
  );

  function validarHorario() {
    if (!horarioForm.hora_inicio || !horarioForm.hora_fin) {
      alert("Debe indicar hora inicial y final.");
      return false;
    }

    if (horarioForm.hora_fin <= horarioForm.hora_inicio) {
      alert("La hora final debe ser mayor que la hora inicial.");
      return false;
    }

    return true;
  }

  async function guardarHorario() {
    if (!validarHorario()) return;

    setGuardandoHorario(true);
    setMensaje("");
    setError("");

    const { error: guardarError } = await supabase
      .from("cobros_agentes_horarios")
      .insert([
        {
          agente_id: Number(agenteId),
          condominio_id: Number(condominioId),
          dia_semana: Number(horarioForm.dia_semana),
          hora_inicio: horarioForm.hora_inicio,
          hora_fin: horarioForm.hora_fin,
          activo: horarioForm.activo,
        },
      ]);

    setGuardandoHorario(false);

    if (guardarError) {
      setError("No se pudo guardar el horario: " + guardarError.message);
      return;
    }

    setMensaje("Horario agregado correctamente.");
    setHorarioForm(HORARIO_INICIAL);
    await cargarTodo(condominioId, agenteId);
  }

  async function cambiarEstadoHorario(horario: Horario) {
    const { error: cambioError } = await supabase
      .from("cobros_agentes_horarios")
      .update({ activo: !horario.activo })
      .eq("id", horario.id)
      .eq("agente_id", Number(agenteId))
      .eq("condominio_id", Number(condominioId));

    if (cambioError) {
      alert("No se pudo cambiar el estado: " + cambioError.message);
      return;
    }

    await cargarTodo(condominioId, agenteId);
  }

  async function eliminarHorario(horario: Horario) {
    const confirmar = confirm(
      `¿Desea eliminar el horario de ${
        DIAS.find((d) => d.value === horario.dia_semana)?.label || "este día"
      }?`
    );

    if (!confirmar) return;

    const { error: eliminarError } = await supabase
      .from("cobros_agentes_horarios")
      .delete()
      .eq("id", horario.id)
      .eq("agente_id", Number(agenteId))
      .eq("condominio_id", Number(condominioId));

    if (eliminarError) {
      alert("No se pudo eliminar el horario: " + eliminarError.message);
      return;
    }

    await cargarTodo(condominioId, agenteId);
  }

  function validarCondiciones() {
    const diasMin = Number(condicionForm.dias_vencido_minimo || 0);
    const diasMax = condicionForm.dias_vencido_maximo
      ? Number(condicionForm.dias_vencido_maximo)
      : null;

    const montoMin = Number(condicionForm.monto_minimo || 0);
    const montoMax = condicionForm.monto_maximo
      ? Number(condicionForm.monto_maximo)
      : null;

    const periodosMin = Number(condicionForm.cantidad_periodos_minima || 0);
    const periodosMax = condicionForm.cantidad_periodos_maxima
      ? Number(condicionForm.cantidad_periodos_maxima)
      : null;

    if (diasMin < 0 || montoMin < 0 || periodosMin < 1) {
      alert("Revise los valores mínimos configurados.");
      return false;
    }

    if (diasMax !== null && diasMax < diasMin) {
      alert("El máximo de días no puede ser menor que el mínimo.");
      return false;
    }

    if (montoMax !== null && montoMax < montoMin) {
      alert("El monto máximo no puede ser menor que el mínimo.");
      return false;
    }

    if (periodosMax !== null && periodosMax < periodosMin) {
      alert("El máximo de períodos no puede ser menor que el mínimo.");
      return false;
    }

    if (
      !condicionForm.incluir_pendientes &&
      !condicionForm.incluir_parciales
    ) {
      alert("Debe incluir al menos cargos pendientes o parciales.");
      return false;
    }

    return true;
  }

  async function guardarCondiciones() {
    if (!validarCondiciones()) return;

    setGuardandoCondicion(true);
    setMensaje("");
    setError("");

    const registro = {
      agente_id: Number(agenteId),
      condominio_id: Number(condominioId),
      dias_vencido_minimo: Number(
        condicionForm.dias_vencido_minimo || 0
      ),
      dias_vencido_maximo: condicionForm.dias_vencido_maximo
        ? Number(condicionForm.dias_vencido_maximo)
        : null,
      monto_minimo: Number(condicionForm.monto_minimo || 0),
      monto_maximo: condicionForm.monto_maximo
        ? Number(condicionForm.monto_maximo)
        : null,
      cantidad_periodos_minima: Number(
        condicionForm.cantidad_periodos_minima || 1
      ),
      cantidad_periodos_maxima: condicionForm.cantidad_periodos_maxima
        ? Number(condicionForm.cantidad_periodos_maxima)
        : null,
      incluir_pendientes: condicionForm.incluir_pendientes,
      incluir_parciales: condicionForm.incluir_parciales,
      solo_unidades_activas: condicionForm.solo_unidades_activas,
      solo_propietarios_activos: condicionForm.solo_propietarios_activos,
      activo: condicionForm.activo,
    };

    const respuesta = condicionId
      ? await supabase
          .from("cobros_agentes_condiciones")
          .update(registro)
          .eq("id", condicionId)
          .eq("agente_id", Number(agenteId))
          .eq("condominio_id", Number(condominioId))
      : await supabase.from("cobros_agentes_condiciones").insert([registro]);

    setGuardandoCondicion(false);

    if (respuesta.error) {
      setError("No se pudieron guardar las condiciones: " + respuesta.error.message);
      return;
    }

    setMensaje("Condiciones guardadas correctamente.");
    await cargarTodo(condominioId, agenteId);
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
        title={agente ? `Configurar: ${agente.nombre}` : "Configurar agente"}
        subtitle={`Horarios y condiciones de evaluación. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={SlidersHorizontal}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/finanzas/cobros/agentes"
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>

            <button
              type="button"
              onClick={() => cargarTodo()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
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

      {loading ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">
          Cargando configuración del agente...
        </div>
      ) : !agente ? (
        <EmptyState
          title="Agente no encontrado"
          description="El agente no existe o no pertenece al condominio activo."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              title="Estado"
              value={agente.activo ? "Activo" : "Inactivo"}
              subtitle={agente.canal}
              icon={agente.activo ? CheckCircle2 : Bot}
              tone={agente.activo ? "green" : "slate"}
            />

            <StatCard
              title="Horarios"
              value={String(horariosActivos)}
              subtitle={`${horarios.length} configurado(s)`}
              icon={Clock3}
              tone="blue"
            />

            <StatCard
              title="Prioridad"
              value={String(agente.prioridad)}
              subtitle="Escala de 1 a 10"
              icon={SlidersHorizontal}
              tone="amber"
            />

            <StatCard
              title="Máximo mensual"
              value={String(agente.maximo_envios_mes)}
              subtitle={`${agente.dias_espera_entre_envios} día(s) entre envíos`}
              icon={CalendarClock}
              tone="slate"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard
              title="Horarios de ejecución"
              subtitle="Defina los días y horas en que el agente puede operar."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <select
                  value={horarioForm.dia_semana}
                  onChange={(e) =>
                    setHorarioForm((actual) => ({
                      ...actual,
                      dia_semana: e.target.value,
                    }))
                  }
                  className="rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  {DIAS.map((dia) => (
                    <option key={dia.value} value={dia.value}>
                      {dia.label}
                    </option>
                  ))}
                </select>

                <input
                  type="time"
                  value={horarioForm.hora_inicio}
                  onChange={(e) =>
                    setHorarioForm((actual) => ({
                      ...actual,
                      hora_inicio: e.target.value,
                    }))
                  }
                  className="rounded-xl border px-4 py-3 text-sm"
                />

                <input
                  type="time"
                  value={horarioForm.hora_fin}
                  onChange={(e) =>
                    setHorarioForm((actual) => ({
                      ...actual,
                      hora_fin: e.target.value,
                    }))
                  }
                  className="rounded-xl border px-4 py-3 text-sm"
                />

                <button
                  type="button"
                  onClick={guardarHorario}
                  disabled={guardandoHorario}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
                >
                  <Save className="h-4 w-4" />
                  {guardandoHorario ? "Guardando..." : "Agregar"}
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {horarios.length === 0 ? (
                  <EmptyState
                    title="Sin horarios"
                    description="Todavía no existen horarios configurados."
                  />
                ) : (
                  horarios.map((horario) => (
                    <article
                      key={horario.id}
                      className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-black text-slate-900">
                          {
                            DIAS.find(
                              (dia) => dia.value === horario.dia_semana
                            )?.label
                          }
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {horaCorta(horario.hora_inicio)} a{" "}
                          {horaCorta(horario.hora_fin)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => cambiarEstadoHorario(horario)}
                          className={`rounded-xl px-3 py-2 text-xs font-black ${
                            horario.activo
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {horario.activo ? "Activo" : "Inactivo"}
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarHorario(horario)}
                          className="rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Condiciones de evaluación"
              subtitle="Determine qué deudas puede tomar este agente."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CampoNumero
                  label="Días vencidos mínimos"
                  value={condicionForm.dias_vencido_minimo}
                  onChange={(value) =>
                    setCondicionForm((actual) => ({
                      ...actual,
                      dias_vencido_minimo: value,
                    }))
                  }
                />

                <CampoNumero
                  label="Días vencidos máximos"
                  value={condicionForm.dias_vencido_maximo}
                  onChange={(value) =>
                    setCondicionForm((actual) => ({
                      ...actual,
                      dias_vencido_maximo: value,
                    }))
                  }
                  opcional
                />

                <CampoNumero
                  label="Monto mínimo"
                  value={condicionForm.monto_minimo}
                  onChange={(value) =>
                    setCondicionForm((actual) => ({
                      ...actual,
                      monto_minimo: value,
                    }))
                  }
                />

                <CampoNumero
                  label="Monto máximo"
                  value={condicionForm.monto_maximo}
                  onChange={(value) =>
                    setCondicionForm((actual) => ({
                      ...actual,
                      monto_maximo: value,
                    }))
                  }
                  opcional
                />

                <CampoNumero
                  label="Períodos mínimos"
                  value={condicionForm.cantidad_periodos_minima}
                  onChange={(value) =>
                    setCondicionForm((actual) => ({
                      ...actual,
                      cantidad_periodos_minima: value,
                    }))
                  }
                />

                <CampoNumero
                  label="Períodos máximos"
                  value={condicionForm.cantidad_periodos_maxima}
                  onChange={(value) =>
                    setCondicionForm((actual) => ({
                      ...actual,
                      cantidad_periodos_maxima: value,
                    }))
                  }
                  opcional
                />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <CheckCampo
                  label="Incluir pendientes"
                  checked={condicionForm.incluir_pendientes}
                  onChange={(checked) =>
                    setCondicionForm((actual) => ({
                      ...actual,
                      incluir_pendientes: checked,
                    }))
                  }
                />

                <CheckCampo
                  label="Incluir parciales"
                  checked={condicionForm.incluir_parciales}
                  onChange={(checked) =>
                    setCondicionForm((actual) => ({
                      ...actual,
                      incluir_parciales: checked,
                    }))
                  }
                />

                <CheckCampo
                  label="Solo unidades activas"
                  checked={condicionForm.solo_unidades_activas}
                  onChange={(checked) =>
                    setCondicionForm((actual) => ({
                      ...actual,
                      solo_unidades_activas: checked,
                    }))
                  }
                />

                <CheckCampo
                  label="Solo propietarios activos"
                  checked={condicionForm.solo_propietarios_activos}
                  onChange={(checked) =>
                    setCondicionForm((actual) => ({
                      ...actual,
                      solo_propietarios_activos: checked,
                    }))
                  }
                />

                <CheckCampo
                  label="Condición activa"
                  checked={condicionForm.activo}
                  onChange={(checked) =>
                    setCondicionForm((actual) => ({
                      ...actual,
                      activo: checked,
                    }))
                  }
                />
              </div>

              <button
                type="button"
                onClick={guardarCondiciones}
                disabled={guardandoCondicion}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
              >
                <Save className="h-4 w-4" />
                {guardandoCondicion
                  ? "Guardando..."
                  : "Guardar condiciones"}
              </button>
            </SectionCard>
          </div>
        </>
      )}
    </PageContainer>
  );
}

function CampoNumero({
  label,
  value,
  onChange,
  opcional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  opcional?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
        {opcional ? " (opcional)" : ""}
      </label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm"
      />
    </div>
  );
}

function CheckCampo({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border bg-slate-50 px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm font-bold text-slate-700">{label}</span>
    </label>
  );
}
