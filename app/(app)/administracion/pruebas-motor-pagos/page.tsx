"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Condominio = { id: number; nombre?: string | null; descripcion?: string | null };
type Unidad = { id: number; codigo: string; propietario_nombre?: string | null };
type Cuenta = {
  id: number;
  nombre_banco?: string | null;
  banco?: string | null;
  banco_nombre?: string | null;
  numero_cuenta?: string | null;
  no_cuenta?: string | null;
  cuenta?: string | null;
  activa?: boolean | null;
};

type AnalisisRow = {
  tipo: string;
  tabla: string;
  registro_id: string;
  unidad: string | null;
  periodo: string | null;
  monto: number | null;
  resultado: string;
  detalle: string | null;
};

type PagoRow = {
  id: number;
  unidad_id: number;
  fecha_pago: string;
  periodo: string | null;
  monto: number;
  descripcion: string | null;
  referencia: string | null;
  cuenta_bancaria_id: number | null;
  unidad_codigo?: string | null;
  propietario_nombre?: string | null;
};

type CargoRow = {
  id: number;
  unidad_id: number;
  periodo: string;
  monto: number;
  monto_pagado: number;
  balance: number;
  estado: string;
  unidad_codigo?: string | null;
};

type BancoRow = {
  id: number;
  fecha_movimiento: string;
  periodo: string;
  tipo_movimiento: string;
  origen: string;
  descripcion: string | null;
  monto: number;
  numero_documento: string | null;
  referencia_banco: string | null;
  estado_banco: string | null;
};

type CierreRow = {
  id: number;
  periodo: string;
  balance_inicial: number;
  total_ingresos: number;
  total_gastos: number;
  balance_final: number;
  origen_balance: string | null;
  estado: string;
};

type LogRow = {
  id: number;
  tipo_proceso: string;
  tabla_afectada: string | null;
  registro_id: string | null;
  resultado: string;
  detalle: string | null;
  created_at: string;
};

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

function dinero(valor: number | null | undefined) {
  return moneda.format(Number(valor || 0));
}

function nombreCuenta(c: Cuenta) {
  const banco = c.nombre_banco || c.banco || c.banco_nombre || "Banco";
  const numero = c.numero_cuenta || c.no_cuenta || c.cuenta || "";
  return `${banco}${numero ? " - " + numero : ""}`;
}

function periodoActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function cardClass(tone: "blue" | "green" | "red" | "amber" | "slate" = "slate") {
  const map = {
    blue: "border-blue-100 bg-blue-50/70 text-blue-900",
    green: "border-emerald-100 bg-emerald-50/70 text-emerald-900",
    red: "border-red-100 bg-red-50/70 text-red-900",
    amber: "border-amber-100 bg-amber-50/70 text-amber-900",
    slate: "border-slate-200 bg-white text-slate-900",
  };
  return `rounded-2xl border p-4 shadow-sm ${map[tone]}`;
}

export default function PruebasMotorPagosPage() {
  const [condominioActual, setCondominioActual] = useState<Condominio | null>(null);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [periodoDesde, setPeriodoDesde] = useState("2026-05");
  const [periodoHasta, setPeriodoHasta] = useState(periodoActual());
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [monto, setMonto] = useState("4750");
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [referencia, setReferencia] = useState(`PRUEBA-${Date.now()}`);

  const [tab, setTab] = useState<"analisis" | "pagos" | "cargos" | "banco" | "cierres" | "log">("analisis");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [bitacora, setBitacora] = useState<string[]>([]);

  const [analisis, setAnalisis] = useState<AnalisisRow[]>([]);
  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [cargos, setCargos] = useState<CargoRow[]>([]);
  const [banco, setBanco] = useState<BancoRow[]>([]);
  const [cierres, setCierres] = useState<CierreRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);

  function log(texto: string) {
    setBitacora((prev) => [`${new Date().toLocaleTimeString()} - ${texto}`, ...prev].slice(0, 100));
  }

  const resumen = useMemo(() => {
    const pagosTotal = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const bancoTotal = banco
      .filter((b) => b.tipo_movimiento === "INGRESO")
      .reduce((acc, b) => acc + Number(b.monto || 0), 0);
    const cargosPendientes = cargos.filter((c) => Number(c.balance || 0) > 0).length;
    const errores = analisis.length;
    return { pagosTotal, bancoTotal, cargosPendientes, errores };
  }, [pagos, banco, cargos, analisis]);

  useEffect(() => {
    cargarCatalogos();
  }, []);

  useEffect(() => {
    if (condominioId) {
      cargarUnidadesYCuentas();
    }
  }, [condominioId]);

  async function cargarCatalogos() {
    setMensaje("");

    try {
      let cid: string | null = null;

      // 1) Intentar desde localStorage/sessionStorage, según cómo el sistema guarde el condominio activo.
      if (typeof window !== "undefined") {
        const posiblesKeys = [
          "condominio_id",
          "condominioId",
          "selectedCondominioId",
          "vam_condominio_id",
          "condominioActivoId",
        ];

        for (const key of posiblesKeys) {
          const valor = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
          if (valor && Number(valor) > 0) {
            cid = valor;
            break;
          }
        }
      }

      // 2) Si no está en storage, buscarlo en el perfil del usuario logueado.
      if (!cid) {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;

        if (userId) {
          const { data: perfil } = await supabase
            .from("profiles")
            .select("condominio_id")
            .eq("id", userId)
            .maybeSingle();

          if (perfil?.condominio_id) cid = String(perfil.condominio_id);
        }
      }

      // 3) Fallback controlado para desarrollo local si no se pudo resolver.
      // En producción debe venir del condominio logueado.
      if (!cid) {
        cid = "15";
        setMensaje("No se pudo detectar el condominio logueado. Usando Lote 4 temporalmente para pruebas.");
      }

      setCondominioId(cid);

      const { data: condo } = await supabase
        .from("condominios")
        .select("id,nombre,descripcion")
        .eq("id", Number(cid))
        .maybeSingle();

      if (condo) {
        setCondominioActual(condo as Condominio);
      } else {
        setCondominioActual({ id: Number(cid), nombre: `Condominio ${cid}` });
      }
    } catch (err: any) {
      setMensaje(`Error detectando condominio logueado: ${err.message || String(err)}`);
    }
  }

  async function cargarUnidadesYCuentas() {
    const cid = Number(condominioId);
    log(`Cargando unidades y cuentas bancarias del condominio ${cid}...`);

    const [{ data: und, error: errorUnidades }, { data: ctas, error: errorCuentas }] = await Promise.all([
      supabase
        .from("unidades")
        .select("id,codigo,propietario_nombre")
        .eq("condominio_id", cid)
        .eq("activa", true)
        .order("codigo"),
      // Importante: usamos select('*') porque la tabla cuentas_bancarias del proyecto
      // usa nombre_banco, numero_cuenta y otros campos; en algunos módulos viejos
      // se intentaba leer banco/nombre_banco juntos y eso dejaba el combo vacío.
      supabase
        .from("cuentas_bancarias")
        .select("*")
        .eq("condominio_id", cid)
        .order("id"),
    ]);

    if (errorUnidades) {
      setMensaje(`Error cargando unidades: ${errorUnidades.message}`);
      log(`ERROR unidades: ${errorUnidades.message}`);
      return;
    }

    if (errorCuentas) {
      setMensaje(`Error cargando cuentas bancarias: ${errorCuentas.message}`);
      log(`ERROR cuentas bancarias: ${errorCuentas.message}`);
      return;
    }

    const unidadesData = (und || []) as Unidad[];
    const cuentasData = ((ctas || []) as Cuenta[]).filter((c) => c.activa !== false);

    setUnidades(unidadesData);
    setCuentas(cuentasData);

    log(`Unidades cargadas: ${unidadesData.length}. Cuentas bancarias cargadas: ${cuentasData.length}.`);

    if (!unidadId || !unidadesData.some((u) => String(u.id) === unidadId)) {
      setUnidadId(unidadesData.length > 0 ? String(unidadesData[0].id) : "");
    }

    if (!cuentaId || !cuentasData.some((c) => String(c.id) === cuentaId)) {
      setCuentaId(cuentasData.length > 0 ? String(cuentasData[0].id) : "");
    }

    if (cuentasData.length === 0) {
      setMensaje("No hay cuentas bancarias activas para el condominio logueado. Revise Configuración > Cuentas Bancarias.");
    }
  }

  async function cargarDatos() {
    setLoading(true);
    setMensaje("");
    log("Cargando datos actuales de las tablas del motor...");

    const cid = Number(condominioId);
    const uid = unidadId ? Number(unidadId) : null;

    try {
      const [{ data: ana, error: eAna }, { data: pgs, error: ePagos }, { data: cgs, error: eCargos }, { data: bmov, error: eBanco }, { data: cls, error: eCierres }, { data: lgs, error: eLogs }] = await Promise.all([
        supabase.rpc("analizar_motor_pagos", {
          p_condominio_id: cid,
          p_periodo_desde: periodoDesde,
          p_periodo_hasta: periodoHasta,
          p_unidad_id: uid,
        }),
        supabase
          .from("pagos")
          .select("id,unidad_id,fecha_pago,periodo,monto,descripcion,referencia,cuenta_bancaria_id")
          .eq("condominio_id", cid)
          .gte("periodo", periodoDesde)
          .lte("periodo", periodoHasta)
          .order("fecha_pago", { ascending: false }),
        supabase
          .from("cargos_periodicos")
          .select("id,unidad_id,periodo,monto,monto_pagado,balance,estado")
          .eq("condominio_id", cid)
          .gte("periodo", periodoDesde)
          .lte("periodo", periodoHasta)
          .order("periodo"),
        supabase
          .from("banco_movimientos")
          .select("id,fecha_movimiento,periodo,tipo_movimiento,origen,descripcion,monto,numero_documento,referencia_banco,estado_banco")
          .eq("condominio_id", cid)
          .gte("periodo", periodoDesde)
          .lte("periodo", periodoHasta)
          .order("fecha_movimiento", { ascending: false }),
        supabase
          .from("banco_cierres_mensuales")
          .select("id,periodo,balance_inicial,total_ingresos,total_gastos,balance_final,origen_balance,estado")
          .eq("condominio_id", cid)
          .gte("periodo", periodoDesde)
          .lte("periodo", periodoHasta)
          .order("periodo"),
        supabase
          .from("motor_pagos_log")
          .select("id,tipo_proceso,tabla_afectada,registro_id,resultado,detalle,created_at")
          .eq("condominio_id", cid)
          .order("id", { ascending: false })
          .limit(30),
      ]);

      if (eAna) throw eAna;
      if (ePagos) throw ePagos;
      if (eCargos) throw eCargos;
      if (eBanco) throw eBanco;
      if (eCierres) throw eCierres;
      if (eLogs) throw eLogs;

      const unidadMap = new Map(
        unidades.map((u) => [
          Number(u.id),
          { codigo: u.codigo, propietario_nombre: u.propietario_nombre || null },
        ])
      );

      const pagosConUnidad = ((pgs || []) as PagoRow[])
        .filter((p) => !uid || Number(p.unidad_id) === uid)
        .map((p) => ({
          ...p,
          unidad_codigo: unidadMap.get(Number(p.unidad_id))?.codigo || String(p.unidad_id),
          propietario_nombre: unidadMap.get(Number(p.unidad_id))?.propietario_nombre || null,
        }));

      const cargosConUnidad = ((cgs || []) as CargoRow[])
        .filter((c) => !uid || Number(c.unidad_id) === uid)
        .map((c) => ({
          ...c,
          unidad_codigo: unidadMap.get(Number(c.unidad_id))?.codigo || String(c.unidad_id),
        }));

      setAnalisis((ana || []) as AnalisisRow[]);
      setPagos(pagosConUnidad);
      setCargos(cargosConUnidad);
      setBanco((bmov || []) as BancoRow[]);
      setCierres((cls || []) as CierreRow[]);
      setLogs((lgs || []) as LogRow[]);
      setMensaje("Datos cargados correctamente.");
      log("Datos cargados correctamente.");
    } catch (err: any) {
      setMensaje(`Error cargando datos: ${err.message || String(err)}`);
      log(`ERROR cargando datos: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function ejecutarReproceso() {
    setLoading(true);
    setMensaje("");
    log("Iniciando reproceso por período...");

    try {
      const { data, error } = await supabase.rpc("reprocesar_pagos_condominio", {
        p_condominio_id: Number(condominioId),
        p_periodo_desde: periodoDesde,
        p_periodo_hasta: periodoHasta,
        p_unidad_id: unidadId ? Number(unidadId) : null,
      });
      if (error) throw error;
      log(`Reproceso finalizado: ${JSON.stringify(data)}`);
      setMensaje("Reproceso finalizado. Recargando tablas...");
      await cargarDatos();
    } catch (err: any) {
      setMensaje(`Error en reproceso: ${err.message || String(err)}`);
      log(`ERROR reproceso: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function ejecutarPruebaPago() {
    setLoading(true);
    setMensaje("");
    log("Paso 1: Validando datos de prueba...");

    const unidadSeleccionada = unidadId || (unidades.length > 0 ? String(unidades[0].id) : "");
    const cuentaSeleccionada = cuentaId || (cuentas.length > 0 ? String(cuentas[0].id) : "");

    if (!unidadId && unidadSeleccionada) setUnidadId(unidadSeleccionada);
    if (!cuentaId && cuentaSeleccionada) setCuentaId(cuentaSeleccionada);

    const faltantes: string[] = [];
    if (!condominioId) faltantes.push("condominio logueado");
    if (!unidadSeleccionada) faltantes.push("unidad");
    if (!cuentaSeleccionada) faltantes.push("cuenta bancaria");
    if (!fechaPago) faltantes.push("fecha de pago");
    if (!monto || Number(monto) <= 0) faltantes.push("monto válido");

    if (faltantes.length > 0) {
      const detalle = `Faltan datos para ejecutar la prueba: ${faltantes.join(", ")}.`;
      setMensaje(detalle);
      log(`ERROR: ${detalle}`);
      setLoading(false);
      return;
    }

    try {
      log(`Paso 1 OK: condominio=${condominioId}, unidad=${unidadSeleccionada}, cuenta=${cuentaSeleccionada}, fecha=${fechaPago}, monto=${monto}`);
      log("Paso 2: Ejecutando función registrar_pago_mantenimiento_completo...");
      const { data, error } = await supabase.rpc("registrar_pago_mantenimiento_completo", {
        p_condominio_id: Number(condominioId),
        p_unidad_id: Number(unidadSeleccionada),
        p_fecha_pago: fechaPago,
        p_monto: Number(monto),
        p_metodo_pago: metodoPago,
        p_referencia: referencia,
        p_cuenta_bancaria_id: Number(cuentaSeleccionada),
        p_comprobante_url: null,
        p_tipo_fondo: "ORDINARIO",
      });

      if (error) throw error;
      log(`Paso 3: Pago procesado correctamente: ${JSON.stringify(data)}`);
      setReferencia(`PRUEBA-${Date.now()}`);
      setMensaje("Prueba ejecutada correctamente. Recargando tablas afectadas...");
      await cargarDatos();
    } catch (err: any) {
      setMensaje(`Error ejecutando prueba: ${err.message || String(err)}`);
      log(`ERROR prueba pago: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  function exportarBitacora() {
    const texto = bitacora.join("\n");
    navigator.clipboard?.writeText(texto);
    setMensaje("Bitácora copiada al portapapeles.");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Administración</p>
              <h1 className="text-2xl font-bold text-slate-900">Motor de Pagos VAM</h1>
              <p className="mt-1 text-sm text-slate-500">Pruebas, análisis y reproceso de pagos con validación de tablas afectadas.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={cargarDatos} disabled={loading} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Analizar</button>
              <button onClick={ejecutarReproceso} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">Reprocesar</button>
              <button onClick={ejecutarPruebaPago} disabled={loading} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Ejecutar prueba</button>
            </div>
          </div>
        </div>

        {mensaje && <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">{mensaje}</div>}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className={cardClass("blue")}><p className="text-xs font-semibold uppercase">Pagos</p><p className="mt-2 text-2xl font-bold">{pagos.length}</p><p className="text-sm">{dinero(resumen.pagosTotal)}</p></div>
          <div className={cardClass("green")}><p className="text-xs font-semibold uppercase">Banco ingresos</p><p className="mt-2 text-2xl font-bold">{banco.filter(b => b.tipo_movimiento === "INGRESO").length}</p><p className="text-sm">{dinero(resumen.bancoTotal)}</p></div>
          <div className={cardClass("amber")}><p className="text-xs font-semibold uppercase">Cargos pendientes</p><p className="mt-2 text-2xl font-bold">{resumen.cargosPendientes}</p><p className="text-sm">Balances abiertos</p></div>
          <div className={cardClass(resumen.errores ? "red" : "slate")}><p className="text-xs font-semibold uppercase">Alertas análisis</p><p className="mt-2 text-2xl font-bold">{resumen.errores}</p><p className="text-sm">Inconsistencias</p></div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-700">Condominio logueado</span>
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                {condominioActual?.nombre || condominioActual?.descripcion || (condominioId ? `Condominio ${condominioId}` : "Detectando condominio...")}
              </div>
            </label>
            <label className="space-y-1 text-sm"><span className="font-semibold text-slate-700">Unidad</span><select value={unidadId} onChange={(e) => setUnidadId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Todas</option>{unidades.map(u => <option key={u.id} value={u.id}>{u.codigo} - {u.propietario_nombre || "Sin propietario"}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span className="font-semibold text-slate-700">Desde</span><input type="month" value={periodoDesde} onChange={(e) => setPeriodoDesde(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <label className="space-y-1 text-sm"><span className="font-semibold text-slate-700">Hasta</span><input type="month" value={periodoHasta} onChange={(e) => setPeriodoHasta(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Prueba controlada de pago</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <label className="space-y-1 text-sm"><span className="font-semibold text-slate-700">Cuenta bancaria</span><select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2">{cuentas.length === 0 ? <option value="">No hay cuenta bancaria disponible</option> : cuentas.map(c => <option key={c.id} value={c.id}>{nombreCuenta(c)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span className="font-semibold text-slate-700">Fecha pago</span><input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <label className="space-y-1 text-sm"><span className="font-semibold text-slate-700">Monto</span><input value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <label className="space-y-1 text-sm"><span className="font-semibold text-slate-700">Método</span><input value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <label className="space-y-1 text-sm"><span className="font-semibold text-slate-700">Referencia</span><input value={referencia} onChange={(e) => setReferencia(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
            {[
              ["analisis", "Análisis"], ["pagos", "Pagos"], ["cargos", "Cargos"], ["banco", "Banco"], ["cierres", "Cierres"], ["log", "Bitácora"]
            ].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key as any)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{label}</button>
            ))}
          </div>

          <div className="p-4">
            {tab === "analisis" && <TablaAnalisis rows={analisis} />}
            {tab === "pagos" && <TablaPagos rows={pagos} />}
            {tab === "cargos" && <TablaCargos rows={cargos} />}
            {tab === "banco" && <TablaBanco rows={banco} />}
            {tab === "cierres" && <TablaCierres rows={cierres} />}
            {tab === "log" && <div className="space-y-4"><div className="flex justify-end"><button onClick={exportarBitacora} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Copiar bitácora</button></div><TablaLogs rows={logs} /><div className="rounded-2xl bg-slate-950 p-4 text-xs text-slate-100"><p className="mb-2 font-bold">Bitácora de pantalla</p>{bitacora.length === 0 ? <p>Sin eventos todavía.</p> : bitacora.map((b, i) => <p key={i}>{b}</p>)}</div></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty() { return <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">No hay datos para mostrar.</p>; }
function TableWrap({ children }: { children: React.ReactNode }) { return <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table></div>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="whitespace-nowrap bg-slate-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="whitespace-nowrap px-4 py-3 text-slate-700">{children}</td>; }

function TablaAnalisis({ rows }: { rows: AnalisisRow[] }) {
  if (!rows.length) return <Empty />;
  return <TableWrap><thead><tr><Th>Tipo</Th><Th>Tabla</Th><Th>ID</Th><Th>Unidad</Th><Th>Período</Th><Th>Monto</Th><Th>Resultado</Th><Th>Detalle</Th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{rows.map((r, i) => <tr key={i}><Td>{r.tipo}</Td><Td>{r.tabla}</Td><Td>{r.registro_id}</Td><Td>{r.unidad || "-"}</Td><Td>{r.periodo || "-"}</Td><Td>{dinero(r.monto)}</Td><Td><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">{r.resultado}</span></Td><Td>{r.detalle || "-"}</Td></tr>)}</tbody></TableWrap>;
}
function TablaPagos({ rows }: { rows: PagoRow[] }) {
  if (!rows.length) return <Empty />;
  return <TableWrap><thead><tr><Th>ID</Th><Th>Unidad</Th><Th>Fecha</Th><Th>Período</Th><Th>Monto</Th><Th>Referencia</Th><Th>Descripción</Th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{rows.map(r => <tr key={r.id}><Td>{r.id}</Td><Td>{r.unidad_codigo || r.unidad_id}</Td><Td>{r.fecha_pago}</Td><Td>{r.periodo || "-"}</Td><Td>{dinero(r.monto)}</Td><Td>{r.referencia || "-"}</Td><Td>{r.descripcion || "-"}</Td></tr>)}</tbody></TableWrap>;
}
function TablaCargos({ rows }: { rows: CargoRow[] }) {
  if (!rows.length) return <Empty />;
  return <TableWrap><thead><tr><Th>ID</Th><Th>Unidad</Th><Th>Período</Th><Th>Monto</Th><Th>Pagado</Th><Th>Balance</Th><Th>Estado</Th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{rows.map(r => <tr key={r.id}><Td>{r.id}</Td><Td>{r.unidad_codigo || r.unidad_id}</Td><Td>{r.periodo}</Td><Td>{dinero(r.monto)}</Td><Td>{dinero(r.monto_pagado)}</Td><Td>{dinero(r.balance)}</Td><Td>{r.estado}</Td></tr>)}</tbody></TableWrap>;
}
function TablaBanco({ rows }: { rows: BancoRow[] }) {
  if (!rows.length) return <Empty />;
  return <TableWrap><thead><tr><Th>ID</Th><Th>Fecha</Th><Th>Período</Th><Th>Tipo</Th><Th>Origen</Th><Th>Monto</Th><Th>Documento</Th><Th>Referencia</Th><Th>Estado</Th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{rows.map(r => <tr key={r.id}><Td>{r.id}</Td><Td>{r.fecha_movimiento}</Td><Td>{r.periodo}</Td><Td>{r.tipo_movimiento}</Td><Td>{r.origen}</Td><Td>{dinero(r.monto)}</Td><Td>{r.numero_documento || "-"}</Td><Td>{r.referencia_banco || "-"}</Td><Td>{r.estado_banco || "-"}</Td></tr>)}</tbody></TableWrap>;
}
function TablaCierres({ rows }: { rows: CierreRow[] }) {
  if (!rows.length) return <Empty />;
  return <TableWrap><thead><tr><Th>ID</Th><Th>Período</Th><Th>Inicial</Th><Th>Ingresos</Th><Th>Gastos</Th><Th>Final</Th><Th>Origen</Th><Th>Estado</Th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{rows.map(r => <tr key={r.id}><Td>{r.id}</Td><Td>{r.periodo}</Td><Td>{dinero(r.balance_inicial)}</Td><Td>{dinero(r.total_ingresos)}</Td><Td>{dinero(r.total_gastos)}</Td><Td>{dinero(r.balance_final)}</Td><Td>{r.origen_balance || "-"}</Td><Td>{r.estado}</Td></tr>)}</tbody></TableWrap>;
}
function TablaLogs({ rows }: { rows: LogRow[] }) {
  if (!rows.length) return <Empty />;
  return <TableWrap><thead><tr><Th>ID</Th><Th>Fecha</Th><Th>Proceso</Th><Th>Tabla</Th><Th>Registro</Th><Th>Resultado</Th><Th>Detalle</Th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{rows.map(r => <tr key={r.id}><Td>{r.id}</Td><Td>{new Date(r.created_at).toLocaleString()}</Td><Td>{r.tipo_proceso}</Td><Td>{r.tabla_afectada || "-"}</Td><Td>{r.registro_id || "-"}</Td><Td>{r.resultado}</Td><Td>{r.detalle || "-"}</Td></tr>)}</tbody></TableWrap>;
}
