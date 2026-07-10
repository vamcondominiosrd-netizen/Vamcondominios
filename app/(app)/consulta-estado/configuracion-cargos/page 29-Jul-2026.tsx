"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle,
  CircleDollarSign,
  Clock,
  Percent,
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

function fechaActualISO() {
  return new Date().toISOString().split("T")[0];
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

  const periodo = periodoActual();

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) cargarTodo(id);
  }, []);

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

  async function cargarResumenPeriodo(id: string) {
    const { data, error } = await supabase
      .from("cargos")
      .select("monto_base")
      .eq("condominio_id", Number(id))
      .eq("periodo", periodo)
      .eq("activo", true);

    if (error) {
      alert("Error cargando resumen del período: " + error.message);
      return;
    }

    const registros = (data || []) as { monto_base: number | null }[];

    setResumenCargo({
      periodo,
      cantidad: registros.length,
      total: registros.reduce(
        (sum, item) => sum + Number(item.monto_base || 0),
        0
      ),
    });
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

    const confirmar = confirm(
      `Se intentará generar los cargos del período ${periodo}.\n\n` +
        "La función evita duplicados por unidad y período.\n\n" +
        "¿Desea continuar?"
    );

    if (!confirmar) return;

    setGenerando(true);

    const { error } = await supabase.rpc("generar_cargos_mensuales", {
      p_fecha: fechaActualISO(),
    });

    setGenerando(false);

    if (error) {
      alert("Error generando cargos: " + error.message);
      return;
    }

    alert("Proceso de generación ejecutado correctamente.");
    cargarResumenPeriodo(condominioId);
  }

  const estadoGeneracion = generacionActiva ? "Activa" : "Inactiva";
  const resumenCantidad = resumenCargo?.cantidad || 0;
  const resumenTotal = resumenCargo?.total || 0;

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
              disabled={generando || loading}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
            >
              <PlayCircle className="h-4 w-4" />
              {generando ? "Generando..." : "Generar cargos"}
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
          title="Período actual"
          value={periodo}
          subtitle={`${resumenCantidad} cargos generados`}
          icon={CalendarDays}
          tone="blue"
        />

        <StatCard
          title="Total facturado"
          value={`RD$ ${dinero(resumenTotal)}`}
          subtitle="Período actual"
          icon={BarChart3}
          tone="amber"
        />
      </div>

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
                <InfoLine label="Período actual" value={periodo} />
                <InfoLine
                  label="Cargos generados"
                  value={String(resumenCantidad)}
                  success={resumenCantidad > 0}
                />
                <InfoLine
                  label="Total facturado"
                  value={`RD$ ${dinero(resumenTotal)}`}
                  success={resumenTotal > 0}
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
                  disabled={generando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
                >
                  <PlayCircle className="h-4 w-4" />
                  {generando ? "Generando..." : "Generar cargos del período"}
                </button>
              </div>
            </SectionCard>
          </section>
        </div>
      )}

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <h3 className="mb-1 font-black">Nota operativa</h3>

        <p className="text-sm">
          La función automática genera cargos solo cuando el día actual coincide
          con el día de generación configurado para el condominio. El sistema
          evita duplicados por unidad y período.
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
