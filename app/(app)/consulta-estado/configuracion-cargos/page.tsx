"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  CircleDollarSign,
  Clock,
  PlayCircle,
  Save,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type ConfigCobro = {
  id: number;
  cuota_ordinaria: number | null;
  dia_limite_pago: number | null;
  dia_inicio_mora: number | null;
  porcentaje_mora: number | null;
  mora_activa: boolean | null;
};

type ConfigGeneracion = {
  id: number;
  activo: boolean | null;
  dia_generacion: number | null;
  dia_vencimiento: number | null;
  tipo_cargo: string | null;
  nota: string | null;
};

type ResumenCargo = {
  periodo: string;
  cantidad: number;
  total: number;
  totalPagado: number;
  totalBalance: number;
  unidadesEsperadas: number;
  unidadesGeneradas: number;
  unidadesPendientes: number;
};

function periodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function dinero(valor: string | number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function nombrePeriodo(periodo: string) {
  if (!periodo || !periodo.includes("-")) return periodo || "-";

  const [anio, mes] = periodo.split("-");
  const fecha = new Date(Number(anio), Number(mes) - 1, 1);

  return fecha.toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });
}

function moverPeriodo(periodo: string, meses: number) {
  if (!periodo || !periodo.includes("-")) return periodoActual();

  const [anio, mes] = periodo.split("-");
  const fecha = new Date(Number(anio), Number(mes) - 1 + meses, 1);

  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

function periodoSiguiente(periodo: string) {
  return moverPeriodo(periodo, 1);
}

export default function ConfiguracionCargosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [configId, setConfigId] = useState<number | null>(null);
  const [cuotaOrdinaria, setCuotaOrdinaria] = useState("");
  const [diaLimitePago, setDiaLimitePago] = useState("5");
  const [diaInicioMora, setDiaInicioMora] = useState("10");
  const [porcentajeMora, setPorcentajeMora] = useState("5");
  const [moraActiva, setMoraActiva] = useState(false);

  const [configGeneracionId, setConfigGeneracionId] = useState<number | null>(
    null
  );
  const [generacionActiva, setGeneracionActiva] = useState(true);
  const [diaGeneracion, setDiaGeneracion] = useState("1");
  const [diaVencimiento, setDiaVencimiento] = useState("5");
  const [tipoCargo, setTipoCargo] = useState("ORDINARIO");
  const [notaGeneracion, setNotaGeneracion] = useState(
    "Generación automática mensual"
  );

  const [resumenCargo, setResumenCargo] = useState<ResumenCargo | null>(null);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);

  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(periodoActual());

  const periodo = periodoSeleccionado;

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) cargarTodo(id);
  }, []);

  useEffect(() => {
    if (condominioId) cargarResumenPeriodo(condominioId, periodoSeleccionado);
  }, [periodoSeleccionado, condominioId, tipoCargo]);

  async function cargarTodo(id: string) {
    setLoading(true);
    await Promise.all([
      cargarConfiguracionCobro(id),
      cargarConfiguracionGeneracion(id),
      cargarResumenPeriodo(id),
    ]);
    setLoading(false);
  }

  async function cargarConfiguracionCobro(id: string) {
    const { data, error } = await supabase
      .from("configuracion_cargos")
      .select("*")
      .eq("condominio_id", Number(id))
      .maybeSingle();

    if (error) {
      alert("Error cargando configuración de cobro: " + error.message);
      return;
    }

    const config = data as ConfigCobro | null;

    if (config) {
      setConfigId(config.id);
      setCuotaOrdinaria(String(config.cuota_ordinaria || 0));
      setDiaLimitePago(String(config.dia_limite_pago || 5));
      setDiaInicioMora(String(config.dia_inicio_mora || 10));
      setPorcentajeMora(String(config.porcentaje_mora || 5));
      setMoraActiva(config.mora_activa || false);
    }
  }

  async function cargarConfiguracionGeneracion(id: string) {
    const { data, error } = await supabase
      .from("configuracion_cargos_mensuales")
      .select("*")
      .eq("condominio_id", Number(id))
      .maybeSingle();

    if (error) {
      alert("Error cargando generación automática: " + error.message);
      return;
    }

    const config = data as ConfigGeneracion | null;

    if (config) {
      setConfigGeneracionId(config.id);
      setGeneracionActiva(config.activo ?? true);
      setDiaGeneracion(String(config.dia_generacion || 1));
      setDiaVencimiento(String(config.dia_vencimiento || 5));
      setTipoCargo(config.tipo_cargo || "ORDINARIO");
      setNotaGeneracion(config.nota || "Generación automática mensual");
    }
  }

  async function consultarResumenPeriodo(
    id: string,
    periodoConsulta = periodoSeleccionado
  ): Promise<ResumenCargo | null> {
    const [cargosRespuesta, unidadesRespuesta] = await Promise.all([
      supabase
        .from("cargos_periodicos")
        .select("unidad_id,monto,monto_pagado,balance,tipo_cargo")
        .eq("condominio_id", Number(id))
        .eq("periodo", periodoConsulta),
      supabase
        .from("unidades")
        .select("id", { count: "exact", head: true })
        .eq("condominio_id", Number(id))
        .eq("activa", true)
        .gt("cuota_mensual_actual", 0),
    ]);

    if (cargosRespuesta.error) {
      alert(
        "Error cargando resumen del período: " +
          cargosRespuesta.error.message
      );
      return null;
    }

    if (unidadesRespuesta.error) {
      alert(
        "Error contando las unidades activas: " +
          unidadesRespuesta.error.message
      );
      return null;
    }

    const registros = (cargosRespuesta.data || []) as {
      unidad_id: number | null;
      monto: number | null;
      monto_pagado: number | null;
      balance: number | null;
      tipo_cargo: string | null;
    }[];

    const unidadesEsperadas = Number(unidadesRespuesta.count || 0);
    const unidadesGeneradas = new Set(
      registros
        .filter(
          (item) =>
            item.unidad_id !== null &&
            item.tipo_cargo === tipoCargo
        )
        .map((item) => Number(item.unidad_id))
    ).size;

    return {
      periodo: periodoConsulta,
      cantidad: registros.length,
      total: registros.reduce(
        (sum, item) => sum + Number(item.monto || 0),
        0
      ),
      totalPagado: registros.reduce(
        (sum, item) => sum + Number(item.monto_pagado || 0),
        0
      ),
      totalBalance: registros.reduce(
        (sum, item) => sum + Number(item.balance || 0),
        0
      ),
      unidadesEsperadas,
      unidadesGeneradas,
      unidadesPendientes: Math.max(
        unidadesEsperadas - unidadesGeneradas,
        0
      ),
    };
  }

  async function cargarResumenPeriodo(
    id: string,
    periodoConsulta = periodoSeleccionado
  ) {
    const resumen = await consultarResumenPeriodo(id, periodoConsulta);
    if (resumen) setResumenCargo(resumen);
  }

  function validarReglasCobro() {
    if (!condominioId) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return false;
    }

    if (!cuotaOrdinaria || Number(cuotaOrdinaria) <= 0) {
      alert("Debe indicar una cuota ordinaria mensual válida.");
      return false;
    }

    if (
      !diaLimitePago ||
      Number(diaLimitePago) < 1 ||
      Number(diaLimitePago) > 28
    ) {
      alert("El día límite de pago debe estar entre 1 y 28.");
      return false;
    }

    if (
      !diaInicioMora ||
      Number(diaInicioMora) < 1 ||
      Number(diaInicioMora) > 28
    ) {
      alert("El día de inicio de mora debe estar entre 1 y 28.");
      return false;
    }

    if (!porcentajeMora || Number(porcentajeMora) < 0) {
      alert("Debe indicar el porcentaje de mora.");
      return false;
    }

    return true;
  }

  function validarGeneracion() {
    if (
      !diaGeneracion ||
      Number(diaGeneracion) < 1 ||
      Number(diaGeneracion) > 28
    ) {
      alert("El día de generación debe estar entre 1 y 28.");
      return false;
    }

    if (
      !diaVencimiento ||
      Number(diaVencimiento) < 1 ||
      Number(diaVencimiento) > 28
    ) {
      alert("El día de vencimiento debe estar entre 1 y 28.");
      return false;
    }

    if (!tipoCargo.trim()) {
      alert("Debe indicar el tipo de cargo.");
      return false;
    }

    return true;
  }

  async function guardarConfiguracion() {
    if (!validarReglasCobro() || !validarGeneracion()) return;

    setGuardando(true);

    const registroCobro = {
      condominio_id: Number(condominioId),
      cuota_ordinaria: Number(cuotaOrdinaria),
      dia_limite_pago: Number(diaLimitePago),
      dia_inicio_mora: Number(diaInicioMora),
      porcentaje_mora: Number(porcentajeMora),
      mora_activa: moraActiva,
      activa: true,
    };

    if (configId) {
      const { error } = await supabase
        .from("configuracion_cargos")
        .update(registroCobro)
        .eq("id", configId)
        .eq("condominio_id", Number(condominioId));

      if (error) {
        setGuardando(false);
        alert("Error actualizando reglas de cobro: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("configuracion_cargos").insert([
        registroCobro,
      ]);

      if (error) {
        setGuardando(false);
        alert("Error guardando reglas de cobro: " + error.message);
        return;
      }
    }

    const registroGeneracion = {
      condominio_id: Number(condominioId),
      activo: generacionActiva,
      dia_generacion: Number(diaGeneracion),
      dia_vencimiento: Number(diaVencimiento),
      tipo_cargo: tipoCargo,
      nota: notaGeneracion,
    };

    if (configGeneracionId) {
      const { error } = await supabase
        .from("configuracion_cargos_mensuales")
        .update(registroGeneracion)
        .eq("id", configGeneracionId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error actualizando generación automática: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("configuracion_cargos_mensuales")
        .insert([registroGeneracion]);

      setGuardando(false);

      if (error) {
        alert("Error guardando generación automática: " + error.message);
        return;
      }
    }

    alert("Configuración guardada correctamente.");
    cargarTodo(condominioId);
  }

  async function generarCargosPeriodo() {
    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!validarGeneracion()) return;

    const fechaPeriodo = `${periodoSeleccionado}-01`;

    const resumenAntes = await consultarResumenPeriodo(
      condominioId,
      periodoSeleccionado
    );

    if (!resumenAntes) return;

    setResumenCargo(resumenAntes);

    if (resumenAntes.unidadesEsperadas === 0) {
      alert(
        "No existen unidades activas con cuota mensual configurada para este condominio."
      );
      return;
    }

    if (resumenAntes.unidadesPendientes === 0) {
      alert(
        `El período ${periodoSeleccionado} ya está completo.\n\n` +
          `Unidades generadas: ${resumenAntes.unidadesGeneradas} de ${resumenAntes.unidadesEsperadas}\n` +
          `Total facturado: RD$ ${dinero(resumenAntes.total)}`
      );
      return;
    }

    const accion =
      resumenAntes.unidadesGeneradas > 0
        ? "completarán los cargos faltantes"
        : "generarán los cargos";

    const confirmar = confirm(
      `Se ${accion} del período ${periodoSeleccionado}.\n\n` +
        `Condominio: ${condominioNombre || condominioId}\n` +
        `Unidades esperadas: ${resumenAntes.unidadesEsperadas}\n` +
        `Unidades ya generadas: ${resumenAntes.unidadesGeneradas}\n` +
        `Unidades pendientes: ${resumenAntes.unidadesPendientes}\n\n` +
        "La operación solo afectará el condominio activo. ¿Desea continuar?"
    );

    if (!confirmar) return;

    setGenerando(true);

    const { data, error } = await supabase.rpc(
      "vam_generar_cargos_condominio_mes_admin",
      {
        p_condominio_id: Number(condominioId),
        p_fecha: fechaPeriodo,
      }
    );

    if (error) {
      setGenerando(false);
      alert("Error generando cargos: " + error.message);
      return;
    }

    const resumenDespues = await consultarResumenPeriodo(
      condominioId,
      periodoSeleccionado
    );

    if (resumenDespues) setResumenCargo(resumenDespues);

    setGenerando(false);

    if (!resumenDespues) return;

    const resultado = data as {
      cargos_insertados?: number;
      descuentos_insertados?: number;
    } | null;

    if (resumenDespues.unidadesPendientes > 0) {
      alert(
        `El proceso terminó, pero el período continúa incompleto.\n\n` +
          `Unidades generadas: ${resumenDespues.unidadesGeneradas} de ${resumenDespues.unidadesEsperadas}\n` +
          `Unidades pendientes: ${resumenDespues.unidadesPendientes}\n\n` +
          "Revise las unidades pendientes y sus cuotas mensuales."
      );
      return;
    }

    alert(
      `Generación finalizada correctamente.\n\n` +
        `Condominio: ${condominioNombre || condominioId}\n` +
        `Período: ${periodoSeleccionado}\n` +
        `Unidades generadas: ${resumenDespues.unidadesGeneradas} de ${resumenDespues.unidadesEsperadas}\n` +
        `Cargos nuevos: ${Number(resultado?.cargos_insertados || 0)}\n` +
        `Descuentos nuevos: ${Number(resultado?.descuentos_insertados || 0)}\n` +
        `Total facturado: RD$ ${dinero(resumenDespues.total)}`
    );
  }

  const estadoGeneracion = generacionActiva ? "Activa" : "Inactiva";
  const resumenCantidad = resumenCargo?.cantidad || 0;
  const resumenTotal = resumenCargo?.total || 0;
  const resumenPagado = resumenCargo?.totalPagado || 0;
  const resumenBalance = resumenCargo?.totalBalance || 0;
  const unidadesEsperadas = resumenCargo?.unidadesEsperadas || 0;
  const unidadesGeneradas = resumenCargo?.unidadesGeneradas || 0;
  const unidadesPendientes = resumenCargo?.unidadesPendientes || 0;
  const periodoCompleto =
    unidadesEsperadas > 0 && unidadesPendientes === 0;
  const periodoParcial =
    unidadesGeneradas > 0 && unidadesPendientes > 0;
  const estadoPeriodo = periodoCompleto
    ? "Generado"
    : periodoParcial
      ? "Parcial"
      : "Sin generar";
  const bloqueoGeneracion =
    generando || loading || periodoCompleto || !generacionActiva;
  const proximoPeriodo = periodoSiguiente(periodoSeleccionado);

  const proximaLectura = useMemo(() => {
    return `Día ${diaGeneracion || 1} de cada mes`;
  }, [diaGeneracion]);

  return (
    <PageContainer>
      <PageHeader
        title="Configuración de Cargos"
        subtitle="Centro de configuración de cobros, mora y generación automática mensual."
        badge="SaaS Financiero"
        icon={CircleDollarSign}
        action={
          <div className="flex flex-col gap-2 md:flex-row">
            <button
              onClick={generarCargosPeriodo}
              disabled={bloqueoGeneracion}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              {periodoCompleto ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {generando
                ? "Generando..."
                : periodoCompleto
                  ? `Generado ${periodoSeleccionado}`
                  : periodoParcial
                    ? "Completar cargos"
                    : "Generar cargos"}
            </button>

            <button
              onClick={guardarConfiguracion}
              disabled={guardando || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
            >
              <Save className="h-4 w-4" />
              {guardando ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Cuota ordinaria"
          value={`RD$ ${dinero(cuotaOrdinaria)}`}
          subtitle="Monto mensual base"
          icon={CircleDollarSign}
          tone="green"
        />

        <StatCard
          title="Generación"
          value={estadoGeneracion}
          subtitle={proximaLectura}
          icon={generacionActiva ? CheckCircle : Clock}
          tone={generacionActiva ? "green" : "slate"}
        />

        <StatCard
          title="Mes activo"
          value={nombrePeriodo(periodo)}
          subtitle={`${periodo} · ${unidadesGeneradas}/${unidadesEsperadas} unidades`}
          icon={CalendarDays}
          tone="blue"
        />

        <StatCard
          title="Estado del período"
          value={estadoPeriodo}
          subtitle={`Facturado RD$ ${dinero(resumenTotal)}`}
          icon={periodoCompleto ? CheckCircle : Clock}
          tone={periodoCompleto ? "green" : "amber"}
        />
      </div>

      <SectionCard
        title="Mes de Cargo Activo"
        subtitle="Seleccione el mes operativo que se va a consultar o generar. Después de generar, este panel presenta el mes generado y su estado real en cargos_periodicos."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="xl:col-span-1">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Selector del mes de cargo activo
            </label>

            <input
              type="month"
              value={periodoSeleccionado}
              onChange={(e) => setPeriodoSeleccionado(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPeriodoSeleccionado(moverPeriodo(periodoSeleccionado, -1))}
                className="rounded-xl border bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                Mes anterior
              </button>

              <button
                type="button"
                onClick={() => setPeriodoSeleccionado(proximoPeriodo)}
                className="rounded-xl border bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                Próximo mes
              </button>
            </div>
          </div>

          <div className="xl:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Mes activo seleccionado
            </p>

            <h2 className="mt-1 text-3xl font-black capitalize text-blue-950">
              {nombrePeriodo(periodoSeleccionado)}
            </h2>

            <div className="mt-4 flex flex-wrap gap-2 text-sm font-black">
              <span className="rounded-full bg-white px-4 py-2 text-blue-800">
                Período {periodoSeleccionado}
              </span>

              <span
                className={`rounded-full px-4 py-2 ${
                  periodoCompleto
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {estadoPeriodo}
              </span>

              <span className="rounded-full bg-white px-4 py-2 text-blue-800">
                {unidadesGeneradas}/{unidadesEsperadas} unidades
              </span>

              <span className="rounded-full bg-white px-4 py-2 text-blue-800">
                RD$ {dinero(resumenTotal)}
              </span>
            </div>
          </div>

          <div className="xl:col-span-1 rounded-2xl border bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Acción del mes activo
            </p>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {periodoCompleto ? (
                <>
                  El período <strong>{periodoSeleccionado}</strong> está completo
                  con <strong>{unidadesGeneradas} de {unidadesEsperadas} unidades</strong>
                  y un total de <strong>RD$ {dinero(resumenTotal)}</strong>.
                </>
              ) : periodoParcial ? (
                <>
                  El período está parcialmente generado. Faltan{" "}
                  <strong>{unidadesPendientes} unidades</strong>. El botón completará
                  únicamente los cargos faltantes del condominio activo.
                </>
              ) : (
                <>
                  El botón generará cargos para{" "}
                  <strong>{nombrePeriodo(periodoSeleccionado)}</strong> usando la
                  configuración mensual del condominio activo.
                </>
              )}
            </p>

            <button
              type="button"
              onClick={generarCargosPeriodo}
              disabled={bloqueoGeneracion}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {periodoCompleto ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {generando
                ? "Generando..."
                : periodoCompleto
                  ? `Generado ${periodoSeleccionado}`
                  : periodoParcial
                    ? `Completar ${periodoSeleccionado}`
                    : `Generar ${periodoSeleccionado}`}
            </button>
          </div>
        </div>
      </SectionCard>

      {loading ? (
        <SectionCard>
          <div className="p-6 text-sm text-slate-500">
            Cargando configuración...
          </div>
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="xl:col-span-2 space-y-5">
            <SectionCard
              title="Reglas de Cobro"
              subtitle={`Condominio activo: ${
                condominioNombre || "No seleccionado"
              }`}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Cuota ordinaria mensual RD$ *
                  </label>

                  <input
                    type="number"
                    value={cuotaOrdinaria}
                    onChange={(e) => setCuotaOrdinaria(e.target.value)}
                    placeholder="Ejemplo: 4500"
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Día límite de pago *
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={diaLimitePago}
                    onChange={(e) => {
                      setDiaLimitePago(e.target.value);
                      setDiaVencimiento(e.target.value);
                    }}
                    placeholder="Ejemplo: 5"
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Día máximo recomendado para pagar sin recargo.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Día inicio mora *
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={diaInicioMora}
                    onChange={(e) => setDiaInicioMora(e.target.value)}
                    placeholder="Ejemplo: 10"
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Día desde el cual se podrá aplicar mora.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Porcentaje mora %
                  </label>

                  <input
                    type="number"
                    value={porcentajeMora}
                    onChange={(e) => setPorcentajeMora(e.target.value)}
                    placeholder="Ejemplo: 5"
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Porcentaje que se aplicará sobre el cargo pendiente.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Aplicar mora automática
                  </label>

                  <select
                    value={moraActiva ? "SI" : "NO"}
                    onChange={(e) => setMoraActiva(e.target.value === "SI")}
                    className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                  >
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Generación Automática Mensual"
              subtitle="Controla cuándo el sistema crea los cargos de mantenimiento de cada período."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Generación automática
                  </label>

                  <select
                    value={generacionActiva ? "SI" : "NO"}
                    onChange={(e) =>
                      setGeneracionActiva(e.target.value === "SI")
                    }
                    className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                  >
                    <option value="SI">Activa</option>
                    <option value="NO">Inactiva</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Tipo de cargo
                  </label>

                  <select
                    value={tipoCargo}
                    onChange={(e) => setTipoCargo(e.target.value)}
                    className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                  >
                    <option value="ORDINARIO">ORDINARIO</option>
                    <option value="EXTRAORDINARIO">EXTRAORDINARIO</option>
                    <option value="RESERVA">RESERVA</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Día de generación
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={diaGeneracion}
                    onChange={(e) => setDiaGeneracion(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Ejemplo: día 1 para generar al inicio del mes.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Día de vencimiento
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={diaVencimiento}
                    onChange={(e) => setDiaVencimiento(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Normalmente debe coincidir con el día límite de pago.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Nota
                  </label>

                  <input
                    type="text"
                    value={notaGeneracion}
                    onChange={(e) => setNotaGeneracion(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                    placeholder="Generación automática mensual"
                  />
                </div>
              </div>
            </SectionCard>
          </section>

          <section className="space-y-5">
            <SectionCard title="Estado del Sistema" subtitle="Lectura rápida.">
              <div className="space-y-3">
                <InfoLine
                  label="Generación"
                  value={estadoGeneracion}
                  success={generacionActiva}
                />
                <InfoLine label="Día generación" value={diaGeneracion || "-"} />
                <InfoLine label="Día vencimiento" value={diaVencimiento || "-"} />
                <InfoLine label="Mora" value={moraActiva ? "Activa" : "Inactiva"} />
                <InfoLine label="Mes activo" value={nombrePeriodo(periodo)} />
                <InfoLine label="Período seleccionado" value={periodo} />
                <InfoLine
                  label="Estado período"
                  value={estadoPeriodo}
                  success={periodoCompleto}
                />
                <InfoLine
                  label="Unidades esperadas"
                  value={String(unidadesEsperadas)}
                  success={unidadesEsperadas > 0}
                />
                <InfoLine
                  label="Unidades generadas"
                  value={String(unidadesGeneradas)}
                  success={periodoCompleto}
                />
                <InfoLine
                  label="Unidades pendientes"
                  value={String(unidadesPendientes)}
                  success={unidadesPendientes === 0 && unidadesEsperadas > 0}
                />
                <InfoLine
                  label="Total facturado"
                  value={`RD$ ${dinero(resumenTotal)}`}
                  success={resumenTotal > 0}
                />
                <InfoLine
                  label="Total pagado"
                  value={`RD$ ${dinero(resumenPagado)}`}
                  success={resumenPagado > 0}
                />
                <InfoLine
                  label="Balance pendiente"
                  value={`RD$ ${dinero(resumenBalance)}`}
                  success={resumenBalance === 0 && resumenCantidad > 0}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Acciones"
              subtitle="Operaciones manuales para administración."
            >
              <div className="space-y-3">
                <button
                  onClick={guardarConfiguracion}
                  disabled={guardando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
                >
                  <Save className="h-4 w-4" />
                  {guardando ? "Guardando..." : "Guardar configuración"}
                </button>

                <button
                  onClick={generarCargosPeriodo}
                  disabled={bloqueoGeneracion}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {periodoCompleto ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  {generando
                    ? "Generando..."
                    : periodoCompleto
                      ? `Período ${periodoSeleccionado} generado`
                      : periodoParcial
                        ? `Completar cargos ${periodoSeleccionado}`
                        : `Generar cargos ${periodoSeleccionado}`}
                </button>

                <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                  El botón manual usa una función administrativa segura y afecta
                  únicamente el condominio activo. Si el período está parcial,
                  completa solo las unidades faltantes.
                </p>
              </div>
            </SectionCard>
          </section>
        </div>
      )}

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <h3 className="mb-1 font-black">Nota operativa</h3>

        <p className="text-sm">
          La sección Generación Automática Mensual mantiene su configuración original.
          El campo Mes de Cargo Activo controla el período operativo visible del módulo.
          Al generar un nuevo período, el panel queda mostrando el mes generado, su estado, cantidad de cargos y total facturado.
          Ejemplo: 2026-07 con día 1 envía 2026-07-01.
        </p>
      </div>
    </PageContainer>
  );
}

function InfoLine({
  label,
  value,
  success = false,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span
        className={`text-sm font-black ${
          success ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
