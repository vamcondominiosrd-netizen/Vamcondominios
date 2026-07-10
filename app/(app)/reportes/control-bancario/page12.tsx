"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type PeriodoBancario = {
  id?: number;
  condominio_id?: number | null;
  condominio?: string | null;
  cuenta_bancaria_id?: number | null;
  periodo: string;
  balance_inicial: number | string | null;
  total_ingresos: number | string | null;
  total_gastos: number | string | null;
  balance_final: number | string | null;
  estado: string | null;
  fecha_cierre?: string | null;
  origen_balance?: string | null;
};

type MovimientoIngreso = {
  id: string;
  fecha: string;
  unidad: string;
  propietario: string;
  concepto: string;
  referencia: string;
  monto: number;
  fuente: string;
};

type MovimientoGasto = {
  id: string;
  fecha: string;
  proveedor: string;
  categoria: string;
  concepto: string;
  metodo_pago: string;
  referencia: string;
  monto: number;
  fuente: string;
};

type PerfilUsuario = {
  condominio_id: number | null;
  condominio: string | null;
  nombre?: string | null;
  rol?: string | null;
};

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

function toNumber(value: any): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const limpio = String(value)
    .replace("RD$", "")
    .replace("$", "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();

  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: any): string {
  return moneda.format(toNumber(value));
}

function formatDate(value: any): string {
  if (!value) return "";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString("es-DO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function periodoActual(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function generarPeriodosHistoricos(cantidadMeses = 36): string[] {
  const hoy = new Date();
  const periodos: string[] = [];

  for (let i = 0; i < cantidadMeses; i++) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    periodos.push(`${year}-${month}`);
  }

  return periodos;
}

function nombrePeriodo(periodo: string): string {
  if (!periodo || !periodo.includes("-")) return periodo;

  const [year, month] = periodo.split("-");
  const fecha = new Date(Number(year), Number(month) - 1, 1);

  const mes = fecha.toLocaleDateString("es-DO", {
    month: "long",
  });

  return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${year}`;
}

function normalizarTexto(value: any): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function perteneceAlPeriodo(row: any, periodo: string): boolean {
  const posiblesPeriodos = [
    row.periodo,
    row.periodo_pago,
    row.periodo_mantenimiento,
    row.periodo_cargo,
    row.mes,
    row.mes_pago,
    row.mes_pagado,
  ]
    .filter(Boolean)
    .map((x) => String(x).slice(0, 7));

  if (posiblesPeriodos.includes(periodo)) return true;

  const posiblesFechas = [
    row.fecha_pago,
    row.fecha_gasto,
    row.fecha_movimiento,
    row.fecha_posteo,
    row.fecha_transaccion,
    row.fecha,
    row.created_at,
    row.fecha_registro,
  ].filter(Boolean);

  return posiblesFechas.some((f) => String(f).slice(0, 7) === periodo);
}

function limpiarTexto(value: any, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const txt = String(value).trim();
  return txt || fallback;
}

function estadoClase(estado: string | null | undefined): string {
  const e = String(estado || "").toUpperCase();

  if (e === "CERRADO") return "bg-emerald-100 text-emerald-800";
  if (e === "ABIERTO") return "bg-amber-100 text-amber-800";
  if (e === "SIN_CIERRE") return "bg-slate-100 text-slate-700";

  return "bg-slate-100 text-slate-700";
}

function estadoTexto(estado: string | null | undefined): string {
  const e = String(estado || "").toUpperCase();

  if (e === "SIN_CIERRE") return "Sin cierre bancario";
  if (!e) return "Sin estado";

  return e;
}

export default function EstadoFinancieroBancarioPage() {
  const [loading, setLoading] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominioNombre, setCondominioNombre] = useState<string>("");

  const [periodos, setPeriodos] = useState<PeriodoBancario[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>(
    periodoActual()
  );

  const [periodoData, setPeriodoData] = useState<PeriodoBancario | null>(null);
  const [ingresos, setIngresos] = useState<MovimientoIngreso[]>([]);
  const [gastos, setGastos] = useState<MovimientoGasto[]>([]);

  const periodoMap = useMemo(() => {
    const map = new Map<string, PeriodoBancario>();

    periodos.forEach((p) => {
      if (p.periodo) map.set(p.periodo, p);
    });

    return map;
  }, [periodos]);

  const periodosDisponibles = useMemo(() => {
    const historicos = generarPeriodosHistoricos(36);
    const existentes = periodos.map((p) => p.periodo).filter(Boolean);

    return Array.from(new Set([...historicos, ...existentes])).sort((a, b) =>
      b.localeCompare(a)
    );
  }, [periodos]);

  const totalIngresosDetalle = useMemo(
    () => ingresos.reduce((acc, item) => acc + toNumber(item.monto), 0),
    [ingresos]
  );

  const totalGastosDetalle = useMemo(
    () => gastos.reduce((acc, item) => acc + toNumber(item.monto), 0),
    [gastos]
  );

  const balanceInicial = toNumber(periodoData?.balance_inicial);
  const totalIngresosPeriodo = toNumber(periodoData?.total_ingresos);
  const totalGastosPeriodo = toNumber(periodoData?.total_gastos);
  const balanceFinal = toNumber(periodoData?.balance_final);

  const balanceCalculado =
    balanceInicial + totalIngresosPeriodo - totalGastosPeriodo;

  const diferenciaConciliacion = balanceFinal - balanceCalculado;

  const diferenciaIngresosDetalle = totalIngresosPeriodo - totalIngresosDetalle;
  const diferenciaGastosDetalle = totalGastosPeriodo - totalGastosDetalle;

  const esPeriodoSinCierre =
    String(periodoData?.estado || "").toUpperCase() === "SIN_CIERRE";

  useEffect(() => {
    inicializar();
  }, []);

  useEffect(() => {
    if (condominioId && periodoSeleccionado && condominioNombre) {
      consultarReporte(periodoSeleccionado, condominioId, condominioNombre);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoSeleccionado, condominioId, condominioNombre]);

  async function inicializar() {
    setLoading(true);
    setError(null);

    try {
      const contexto = await obtenerContextoUsuario();

      if (!contexto.condominio_id) {
        setError(
          "No se pudo identificar el condominio activo. Revisa que el usuario tenga condominio_id en profiles o que el sistema tenga un condominio seleccionado."
        );
        setLoading(false);
        return;
      }

      const nombre = contexto.condominio || "Condominio";

      setPerfil(contexto);
      setCondominioId(contexto.condominio_id);
      setCondominioNombre(nombre);

      await cargarPeriodos(contexto.condominio_id, nombre);
      await consultarReporte(periodoSeleccionado, contexto.condominio_id, nombre);
    } catch (err: any) {
      setError(err?.message || "Error cargando el reporte financiero.");
    } finally {
      setLoading(false);
    }
  }

  async function obtenerContextoUsuario(): Promise<PerfilUsuario> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("No hay usuario logueado.");
    }

    const emailUsuario = user.email || "";

    async function buscarPerfilPorCampo(campo: string, valor: string) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq(campo, valor)
          .maybeSingle();

        if (error) {
          console.warn(`No se pudo buscar profiles por ${campo}:`, error.message);
          return null;
        }

        return data;
      } catch (err) {
        console.warn(`Error buscando perfil por ${campo}:`, err);
        return null;
      }
    }

    let perfilEncontrado: any = null;

    perfilEncontrado = await buscarPerfilPorCampo("id", user.id);

    if (!perfilEncontrado) {
      perfilEncontrado = await buscarPerfilPorCampo("user_id", user.id);
    }

    if (!perfilEncontrado) {
      perfilEncontrado = await buscarPerfilPorCampo("auth_id", user.id);
    }

    if (!perfilEncontrado && emailUsuario) {
      perfilEncontrado = await buscarPerfilPorCampo("email", emailUsuario);
    }

    let condominioId =
      perfilEncontrado?.condominio_id ??
      perfilEncontrado?.id_condominio ??
      perfilEncontrado?.condominioId ??
      null;

    let nombreCondominio =
      perfilEncontrado?.condominio ??
      perfilEncontrado?.nombre_condominio ??
      perfilEncontrado?.condominio_nombre ??
      null;

    if (!condominioId && typeof window !== "undefined") {
      const posiblesKeys = [
        "condominio_id",
        "condominioId",
        "selectedCondominioId",
        "vam_condominio_id",
        "condominio_actual",
        "vam_condominio_actual",
        "condominioSeleccionado",
        "selectedCondominio",
        "condominio",
      ];

      for (const key of posiblesKeys) {
        const raw = localStorage.getItem(key);

        if (!raw) continue;

        try {
          const parsed = JSON.parse(raw);

          const posibleId =
            parsed?.id ??
            parsed?.condominio_id ??
            parsed?.id_condominio ??
            parsed?.condominioId ??
            raw;

          const numeroId = Number(posibleId);

          if (Number.isFinite(numeroId) && numeroId > 0) {
            condominioId = numeroId;

            nombreCondominio =
              parsed?.nombre ??
              parsed?.condominio ??
              parsed?.nombre_condominio ??
              parsed?.condominio_nombre ??
              nombreCondominio;

            break;
          }
        } catch {
          const numeroId = Number(raw);

          if (Number.isFinite(numeroId) && numeroId > 0) {
            condominioId = numeroId;
            break;
          }
        }
      }
    }

    if (!condominioId) {
      return {
        condominio_id: null,
        condominio: null,
      };
    }

    try {
      const { data: condominioInfo, error: errorCondominio } = await supabase
        .from("condominios")
        .select("*")
        .eq("id", condominioId)
        .maybeSingle();

      if (!errorCondominio && condominioInfo) {
        nombreCondominio =
          condominioInfo.nombre ??
          condominioInfo.condominio ??
          condominioInfo.descripcion ??
          nombreCondominio;
      }
    } catch (err) {
      console.warn("No se pudo cargar el nombre del condominio:", err);
    }

    return {
      condominio_id: Number(condominioId),
      condominio: nombreCondominio || "Condominio",
      nombre:
        perfilEncontrado?.nombre ??
        perfilEncontrado?.name ??
        perfilEncontrado?.full_name ??
        null,
      rol: perfilEncontrado?.rol ?? perfilEncontrado?.role ?? null,
    };
  }

async function obtenerCuentaBancariaActiva(
    pCondominioId: number
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from("cuentas_bancarias")
        .select("id")
        .eq("condominio_id", pCondominioId)
        .eq("activa", true)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("No se pudo cargar la cuenta bancaria activa:", error.message);
        return null;
      }

      const cuentaId = Number(data?.id || 0);
      return Number.isFinite(cuentaId) && cuentaId > 0 ? cuentaId : null;
    } catch (err) {
      console.warn("Error cargando cuenta bancaria activa:", err);
      return null;
    }
  }

  async function cargarPeriodos(
    pCondominioId: number,
    pCondominioNombre: string
  ) {
    try {
      const { data, error } = await supabase
        .from("banco_cierres_mensuales")
        .select("*")
        .eq("condominio_id", pCondominioId)
        .order("periodo", { ascending: false });

      if (error) {
        console.warn("Error cargando cierres bancarios mensuales:", error.message);
        setPeriodos([]);
        return;
      }

      const registros = ((data || []) as PeriodoBancario[]).map((row) => ({
        ...row,
        condominio: row.condominio || pCondominioNombre,
      }));

      const sinDuplicados = new Map<string, PeriodoBancario>();

      registros.forEach((p) => {
        if (!p.periodo) return;

        const key = `${p.periodo}-${p.cuenta_bancaria_id || 0}`;
        if (!sinDuplicados.has(key)) sinDuplicados.set(key, p);
      });

      setPeriodos(
        Array.from(sinDuplicados.values()).sort((a, b) =>
          b.periodo.localeCompare(a.periodo)
        )
      );
    } catch (err) {
      console.warn("Error cargando cierres bancarios mensuales:", err);
      setPeriodos([]);
    }
  }

  async function buscarPeriodoBancario(
    periodo: string,
    pCondominioId: number,
    pCondominioNombre: string,
    pCuentaBancariaId?: number | null
  ): Promise<PeriodoBancario | null> {
    try {
      async function ejecutarConsulta(filtrarCuenta: boolean) {
        let query = supabase
          .from("banco_cierres_mensuales")
          .select("*")
          .eq("condominio_id", pCondominioId)
          .eq("periodo", periodo);

        if (filtrarCuenta && pCuentaBancariaId) {
          query = query.eq("cuenta_bancaria_id", pCuentaBancariaId);
        }

        return await query
          .order("cuenta_bancaria_id", { ascending: true })
          .limit(1)
          .maybeSingle();
      }

      let { data, error } = await ejecutarConsulta(true);

      // Respaldo: si no encuentra cierre con la cuenta activa, busca el cierre
      // del periodo por condominio. Esto evita que el reporte quede vacío si
      // cuenta_bancaria_id quedó nulo o diferente en cierres históricos.
      if (!error && !data && pCuentaBancariaId) {
        const fallback = await ejecutarConsulta(false);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.warn("Error buscando cierre bancario mensual:", error.message);
        return null;
      }

      if (!data) return null;

      return {
        ...(data as PeriodoBancario),
        condominio: (data as any).condominio || pCondominioNombre,
      };
    } catch (err) {
      console.warn("Error buscando cierre bancario mensual:", err);
      return null;
    }
  }

  async function buscarBalanceInicialFallback(
    periodo: string,
    pCondominioId: number,
    pCuentaBancariaId?: number | null
  ): Promise<number> {
    try {
      async function ejecutarConsulta(filtrarCuenta: boolean) {
        let query = supabase
          .from("banco_cierres_mensuales")
          .select("periodo, balance_final, estado, condominio_id, cuenta_bancaria_id")
          .eq("condominio_id", pCondominioId)
          .lt("periodo", periodo);

        if (filtrarCuenta && pCuentaBancariaId) {
          query = query.eq("cuenta_bancaria_id", pCuentaBancariaId);
        }

        return await query
          .order("periodo", { ascending: false })
          .limit(1)
          .maybeSingle();
      }

      let { data, error } = await ejecutarConsulta(true);

      if (!error && !data && pCuentaBancariaId) {
        const fallback = await ejecutarConsulta(false);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.warn("No se pudo buscar balance anterior:", error.message);
        return 0;
      }

      return toNumber(data?.balance_final);
    } catch (err) {
      console.warn("Error buscando balance anterior:", err);
      return 0;
    }
  }

  function normalizarPeriodoBancario(
    row: PeriodoBancario,
    periodo: string,
    pCondominioId: number,
    pCondominioNombre: string,
    balanceAnterior: number,
    ingresosData: MovimientoIngreso[],
    gastosData: MovimientoGasto[]
  ): PeriodoBancario {
    const totalIngresosCalculado = ingresosData.reduce(
      (acc, item) => acc + toNumber(item.monto),
      0
    );

    const totalGastosCalculado = gastosData.reduce(
      (acc, item) => acc + toNumber(item.monto),
      0
    );

    const estado = String(row.estado || "ABIERTO").toUpperCase();

    let balanceInicialFinal = toNumber(row.balance_inicial);
    let totalIngresosFinal = toNumber(row.total_ingresos);
    let totalGastosFinal = toNumber(row.total_gastos);
    let balanceFinalFinal = toNumber(row.balance_final);

    const sinBalanceInicial =
      row.balance_inicial === null ||
      row.balance_inicial === undefined ||
      row.balance_inicial === "";

    const sinIngresosPeriodo =
      row.total_ingresos === null ||
      row.total_ingresos === undefined ||
      row.total_ingresos === "" ||
      (totalIngresosFinal === 0 && totalIngresosCalculado > 0);

    const sinGastosPeriodo =
      row.total_gastos === null ||
      row.total_gastos === undefined ||
      row.total_gastos === "" ||
      (totalGastosFinal === 0 && totalGastosCalculado > 0);

    const sinBalanceFinal =
      row.balance_final === null ||
      row.balance_final === undefined ||
      row.balance_final === "";

    if (sinBalanceInicial) {
      balanceInicialFinal = balanceAnterior;
    }

    // Regla importante:
    // banco_cierres_mensuales guarda el balance inicial y el cierre.
    // banco_movimientos guarda los ingresos/egresos reales del estado de cuenta.
    // Si el cierre está abierto o quedó con totales 0, usamos el detalle real de movimientos.
    if (estado !== "CERRADO" || sinIngresosPeriodo) {
      totalIngresosFinal = totalIngresosCalculado;
    }

    if (estado !== "CERRADO" || sinGastosPeriodo) {
      totalGastosFinal = totalGastosCalculado;
    }

    const balanceCalculadoFinal =
      balanceInicialFinal + totalIngresosFinal - totalGastosFinal;

    if (estado !== "CERRADO" || sinBalanceFinal || balanceFinalFinal === 0) {
      balanceFinalFinal = balanceCalculadoFinal;
    }

    return {
      ...row,
      condominio_id: row.condominio_id ?? pCondominioId,
      condominio: row.condominio || pCondominioNombre,
      periodo,
      balance_inicial: balanceInicialFinal,
      total_ingresos: totalIngresosFinal,
      total_gastos: totalGastosFinal,
      balance_final: balanceFinalFinal,
      estado: row.estado || "ABIERTO",
      origen_balance:
        row.origen_balance ||
        (balanceAnterior > 0 ? "CIERRE_ANTERIOR" : "REGISTRO_PERIODO"),
    };
  }

  async function consultarReporte(
    periodo: string,
    pCondominioId = condominioId,
    pCondominioNombre = condominioNombre
  ) {
    if (!pCondominioId) return;

    setConsultando(true);
    setError(null);

    try {
      const cuentaActivaId = await obtenerCuentaBancariaActiva(pCondominioId);
      const periodoRow = await buscarPeriodoBancario(
        periodo,
        pCondominioId,
        pCondominioNombre,
        cuentaActivaId
      );

      const cuentaReporteId =
        Number(periodoRow?.cuenta_bancaria_id || 0) > 0
          ? Number(periodoRow?.cuenta_bancaria_id)
          : cuentaActivaId;

      const ingresosData = await cargarIngresos(
        periodo,
        pCondominioId,
        cuentaReporteId
      );
      const gastosData = await cargarGastos(
        periodo,
        pCondominioId,
        cuentaReporteId
      );

      const balanceAnterior = await buscarBalanceInicialFallback(
        periodo,
        pCondominioId,
        cuentaReporteId
      );

      setIngresos(ingresosData);
      setGastos(gastosData);

      if (periodoRow) {
        const normalizado = normalizarPeriodoBancario(
          periodoRow,
          periodo,
          pCondominioId,
          pCondominioNombre,
          balanceAnterior,
          ingresosData,
          gastosData
        );

        setPeriodoData(normalizado);
      } else {
        const totalIngresosCalculado = ingresosData.reduce(
          (acc, item) => acc + toNumber(item.monto),
          0
        );

        const totalGastosCalculado = gastosData.reduce(
          (acc, item) => acc + toNumber(item.monto),
          0
        );

        const balanceFinalCalculado =
          balanceAnterior + totalIngresosCalculado - totalGastosCalculado;

        setPeriodoData({
          condominio_id: pCondominioId,
          condominio: pCondominioNombre,
          cuenta_bancaria_id: cuentaReporteId,
          periodo,
          balance_inicial: balanceAnterior,
          total_ingresos: totalIngresosCalculado,
          total_gastos: totalGastosCalculado,
          balance_final: balanceFinalCalculado,
          estado: "SIN_CIERRE",
          fecha_cierre: null,
          origen_balance:
            balanceAnterior > 0 ? "CIERRE_ANTERIOR" : "CALCULADO",
        });
      }
    } catch (err: any) {
      setError(err?.message || "Error consultando el reporte.");
    } finally {
      setConsultando(false);
    }
  }

  function rangoPeriodo(periodo: string) {
    const [yearRaw, monthRaw] = String(periodo || "").split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return { desde: `${periodo}-01`, hasta: `${periodo}-31` };
    }

    const desde = `${year}-${String(month).padStart(2, "0")}-01`;
    const siguiente = new Date(year, month, 1);
    const hasta = `${siguiente.getFullYear()}-${String(
      siguiente.getMonth() + 1
    ).padStart(2, "0")}-01`;

    return { desde, hasta };
  }

  function tipoMovimientoEs(row: any, tipo: "INGRESO" | "EGRESO") {
    const valor = normalizarTexto(row?.tipo_movimiento).toUpperCase();
    return valor === tipo;
  }

  function movimientoActivo(row: any) {
    return normalizarTexto(row?.estado_banco).toUpperCase() !== "ANULADO";
  }

  async function cargarMovimientosBancarios(
    periodo: string,
    pCondominioId: number,
    pCuentaBancariaId?: number | null
  ): Promise<any[]> {
    const { desde, hasta } = rangoPeriodo(periodo);
    const resultados: any[] = [];
    const vistos = new Set<string>();

    async function agregarConsulta(nombre: string, query: any) {
      const { data, error } = await query
        .order("fecha_movimiento", { ascending: true })
        .order("id", { ascending: true })
        .limit(5000);

      if (error) {
        console.warn(`No se pudieron cargar movimientos bancarios (${nombre}):`, error.message);
        return;
      }

      (data || []).forEach((row: any) => {
        const key = String(row.id ?? `${row.fecha_movimiento}-${row.monto}-${row.descripcion}`);
        if (vistos.has(key)) return;
        vistos.add(key);
        resultados.push(row);
      });
    }

    // 1) Consulta ideal: condominio + cuenta + periodo.
    if (pCuentaBancariaId) {
      await agregarConsulta(
        "condominio-cuenta-periodo",
        supabase
          .from("banco_movimientos")
          .select("*")
          .eq("condominio_id", pCondominioId)
          .eq("cuenta_bancaria_id", pCuentaBancariaId)
          .eq("periodo", periodo)
      );
    }

    // 2) Respaldo: condominio + periodo, sin cuenta bancaria.
    await agregarConsulta(
      "condominio-periodo",
      supabase
        .from("banco_movimientos")
        .select("*")
        .eq("condominio_id", pCondominioId)
        .eq("periodo", periodo)
    );

    // 3) Respaldo adicional: condominio + cuenta + fecha_movimiento.
    if (pCuentaBancariaId) {
      await agregarConsulta(
        "condominio-cuenta-fecha",
        supabase
          .from("banco_movimientos")
          .select("*")
          .eq("condominio_id", pCondominioId)
          .eq("cuenta_bancaria_id", pCuentaBancariaId)
          .gte("fecha_movimiento", desde)
          .lt("fecha_movimiento", hasta)
      );
    }

    // 4) Último respaldo: condominio + fecha_movimiento.
    await agregarConsulta(
      "condominio-fecha",
      supabase
        .from("banco_movimientos")
        .select("*")
        .eq("condominio_id", pCondominioId)
        .gte("fecha_movimiento", desde)
        .lt("fecha_movimiento", hasta)
    );

    return resultados.filter((row) => movimientoActivo(row) && perteneceAlPeriodo(row, periodo));
  }

  async function cargarIngresos(
    periodo: string,
    pCondominioId: number,
    pCuentaBancariaId?: number | null
  ): Promise<MovimientoIngreso[]> {
    try {
      const movimientos = await cargarMovimientosBancarios(
        periodo,
        pCondominioId,
        pCuentaBancariaId
      );

      return movimientos
        .filter((row: any) => tipoMovimientoEs(row, "INGRESO"))
        .map((row: any) => ({
          id: `banco-${row.id}`,
          fecha: formatDate(row.fecha_movimiento || row.fecha_banco || row.created_at),
          unidad: limpiarTexto(row.numero_documento, "N/D"),
          propietario: limpiarTexto(row.beneficiario, "N/D"),
          concepto: limpiarTexto(row.descripcion, "Ingreso bancario"),
          referencia: limpiarTexto(
            row.referencia_banco || row.numero_documento || row.referencia_id,
            "N/D"
          ),
          monto: toNumber(row.monto),
          fuente: limpiarTexto(row.origen, "Banco"),
        }))
        .filter((row: MovimientoIngreso) => row.monto > 0);
    } catch (err) {
      console.warn("Error cargando ingresos bancarios:", err);
      return [];
    }
  }

  async function cargarGastos(
    periodo: string,
    pCondominioId: number,
    pCuentaBancariaId?: number | null
  ): Promise<MovimientoGasto[]> {
    try {
      const movimientos = await cargarMovimientosBancarios(
        periodo,
        pCondominioId,
        pCuentaBancariaId
      );

      return movimientos
        .filter((row: any) => tipoMovimientoEs(row, "EGRESO"))
        .map((row: any) => ({
          id: `banco-${row.id}`,
          fecha: formatDate(row.fecha_movimiento || row.fecha_banco || row.created_at),
          proveedor: limpiarTexto(row.beneficiario, "N/D"),
          categoria: limpiarTexto(row.origen, "Banco"),
          concepto: limpiarTexto(row.descripcion, "Egreso bancario"),
          metodo_pago: limpiarTexto(row.origen, "N/D"),
          referencia: limpiarTexto(
            row.referencia_banco || row.numero_documento || row.referencia_id,
            "N/D"
          ),
          monto: toNumber(row.monto),
          fuente: "Banco movimientos",
        }))
        .filter((row: MovimientoGasto) => row.monto > 0);
    } catch (err) {
      console.warn("Error cargando egresos bancarios:", err);
      return [];
    }
  }

  
  function imprimirReporte() {
    window.print();
  }

  function recargar() {
    if (periodoSeleccionado && condominioId) {
      consultarReporte(periodoSeleccionado, condominioId, condominioNombre);
    }
  }

  const observacionGerencial = useMemo(() => {
    if (!periodoData) {
      return "No hay información disponible para el periodo seleccionado.";
    }

    if (esPeriodoSinCierre) {
      if (balanceInicial > 0 && totalIngresosPeriodo === 0 && totalGastosPeriodo === 0) {
        return `El periodo ${nombrePeriodo(
          periodoSeleccionado
        )} todavía no tiene cierre bancario registrado. El sistema tomó como balance inicial el último balance anterior disponible por ${formatMoney(
          balanceInicial
        )}.`;
      }

      if (totalIngresosPeriodo === 0 && totalGastosPeriodo === 0) {
        return `El periodo ${nombrePeriodo(
          periodoSeleccionado
        )} todavía no tiene cierre bancario registrado en el sistema. No se encontraron ingresos ni gastos detallados para este mes.`;
      }

      return `El periodo ${nombrePeriodo(
        periodoSeleccionado
      )} todavía no tiene cierre bancario registrado. El sistema presenta un reporte calculado con los movimientos disponibles: ingresos por ${formatMoney(
        totalIngresosPeriodo
      )}, gastos por ${formatMoney(
        totalGastosPeriodo
      )} y balance final estimado de ${formatMoney(balanceFinal)}.`;
    }

    if (totalIngresosPeriodo === 0 && totalGastosPeriodo === 0) {
      return `Durante el periodo ${nombrePeriodo(
        periodoSeleccionado
      )}, el condominio mantuvo un balance final de ${formatMoney(
        balanceFinal
      )}, sin movimientos registrados de ingresos ni gastos en el periodo consultado.`;
    }

    return `Durante el periodo ${nombrePeriodo(
      periodoSeleccionado
    )}, el condominio inició con un balance de ${formatMoney(
      balanceInicial
    )}, recibió ingresos por ${formatMoney(
      totalIngresosPeriodo
    )}, realizó gastos por ${formatMoney(
      totalGastosPeriodo
    )} y cerró con un balance final de ${formatMoney(balanceFinal)}.`;
  }, [
    periodoData,
    esPeriodoSinCierre,
    periodoSeleccionado,
    balanceInicial,
    totalIngresosPeriodo,
    totalGastosPeriodo,
    balanceFinal,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-slate-600">
            Cargando Estado Financiero Bancario...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-area {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-5">
        <div className="no-print flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Finanzas</p>
            <h1 className="text-2xl font-bold text-slate-900">
              Estado Financiero Bancario
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Reporte gerencial para propietarios, directivas y administración.
            </p>
            {perfil?.nombre && (
              <p className="mt-1 text-xs text-slate-400">
                Usuario: {perfil.nombre}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Periodo
              </label>
              <select
                value={periodoSeleccionado}
                onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 md:w-64"
              >
                {periodosDisponibles.map((periodo) => {
                  const existente = periodoMap.get(periodo);

                  return (
                    <option key={periodo} value={periodo}>
                      {nombrePeriodo(periodo)} -{" "}
                      {existente?.estado || "Sin cierre"}
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              onClick={recargar}
              disabled={consultando}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {consultando ? "Consultando..." : "Consultar"}
            </button>

            <button
              type="button"
              onClick={imprimirReporte}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Imprimir / PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="no-print rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {esPeriodoSinCierre && (
          <div className="no-print rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Este periodo no tiene cierre en{" "}
            <strong>banco_cierres_mensuales</strong>. El reporte se está mostrando
            calculado con los movimientos reales de banco encontrados y el último
            balance anterior disponible.
          </div>
        )}

        <div className="print-area rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
          <div className="border-b border-slate-200 pb-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                  VAM
                </div>

                <h2 className="mt-4 text-2xl font-bold text-slate-900">
                  VAM Administradora de Condominios
                </h2>

                <p className="mt-1 text-lg font-semibold text-slate-700">
                  Estado Financiero Bancario del Condominio
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:min-w-80">
                <div className="flex justify-between gap-4">
                  <span className="font-semibold">Condominio:</span>
                  <span className="text-right">{condominioNombre}</span>
                </div>

                <div className="mt-2 flex justify-between gap-4">
                  <span className="font-semibold">Periodo:</span>
                  <span>{nombrePeriodo(periodoSeleccionado)}</span>
                </div>

                <div className="mt-2 flex justify-between gap-4">
                  <span className="font-semibold">Estado:</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${estadoClase(
                      periodoData?.estado
                    )}`}
                  >
                    {estadoTexto(periodoData?.estado)}
                  </span>
                </div>

                <div className="mt-2 flex justify-between gap-4">
                  <span className="font-semibold">Fecha emisión:</span>
                  <span>{formatDate(new Date())}</span>
                </div>

                {periodoData?.fecha_cierre && (
                  <div className="mt-2 flex justify-between gap-4">
                    <span className="font-semibold">Fecha cierre:</span>
                    <span>{formatDate(periodoData.fecha_cierre)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!periodoData ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              No hay información disponible para el periodo seleccionado.
            </div>
          ) : (
            <>
              <div className="mt-6">
                <h3 className="text-lg font-bold text-slate-900">
                  Resumen ejecutivo
                </h3>

                <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {observacionGerencial}
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-medium text-slate-500">
                    Balance inicial
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {formatMoney(balanceInicial)}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-sm font-medium text-emerald-700">
                    Ingresos
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-800">
                    {formatMoney(totalIngresosPeriodo)}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <p className="text-sm font-medium text-red-700">Gastos</p>
                  <p className="mt-2 text-2xl font-bold text-red-800">
                    {formatMoney(totalGastosPeriodo)}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <p className="text-sm font-medium text-blue-700">
                    Balance final
                  </p>
                  <p className="mt-2 text-2xl font-bold text-blue-900">
                    {formatMoney(balanceFinal)}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    Conciliación bancaria
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="px-5 py-3 font-medium text-slate-700">
                          Balance inicial del banco
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">
                          {formatMoney(balanceInicial)}
                        </td>
                      </tr>

                      <tr className="border-b border-slate-100">
                        <td className="px-5 py-3 font-medium text-slate-700">
                          Más ingresos identificados
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-700">
                          {formatMoney(totalIngresosPeriodo)}
                        </td>
                      </tr>

                      <tr className="border-b border-slate-100">
                        <td className="px-5 py-3 font-medium text-slate-700">
                          Menos gastos pagados
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-red-700">
                          {formatMoney(totalGastosPeriodo)}
                        </td>
                      </tr>

                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="px-5 py-3 font-bold text-slate-900">
                          Balance final calculado
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900">
                          {formatMoney(balanceCalculado)}
                        </td>
                      </tr>

                      <tr>
                        <td className="px-5 py-3 font-bold text-slate-900">
                          Diferencia de conciliación
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-bold ${
                            Math.abs(diferenciaConciliacion) < 0.01
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}
                        >
                          {formatMoney(diferenciaConciliacion)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {!esPeriodoSinCierre &&
                (Math.abs(diferenciaIngresosDetalle) > 0.01 ||
                  Math.abs(diferenciaGastosDetalle) > 0.01) && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Atención: los totales del periodo bancario pueden diferir
                    del detalle encontrado. Ingresos periodo:{" "}
                    <strong>{formatMoney(totalIngresosPeriodo)}</strong> /
                    detalle:{" "}
                    <strong>{formatMoney(totalIngresosDetalle)}</strong>.
                    Gastos periodo:{" "}
                    <strong>{formatMoney(totalGastosPeriodo)}</strong> /
                    detalle: <strong>{formatMoney(totalGastosDetalle)}</strong>.
                  </div>
                )}

              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    Detalle de ingresos
                  </h3>

                  <span className="text-sm font-semibold text-emerald-700">
                    Total detalle: {formatMoney(totalIngresosDetalle)}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Unidad</th>
                        <th className="px-4 py-3">Propietario</th>
                        <th className="px-4 py-3">Concepto</th>
                        <th className="px-4 py-3">Referencia</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                      </tr>
                    </thead>

                    <tbody>
                      {ingresos.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-6 text-center text-slate-500"
                          >
                            No hay ingresos detallados para este periodo.
                          </td>
                        </tr>
                      ) : (
                        ingresos.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3">{item.fecha}</td>
                            <td className="px-4 py-3">{item.unidad}</td>
                            <td className="px-4 py-3">{item.propietario}</td>
                            <td className="px-4 py-3">{item.concepto}</td>
                            <td className="px-4 py-3">{item.referencia}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                              {formatMoney(item.monto)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    Detalle de gastos
                  </h3>

                  <span className="text-sm font-semibold text-red-700">
                    Total detalle: {formatMoney(totalGastosDetalle)}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Proveedor</th>
                        <th className="px-4 py-3">Categoría</th>
                        <th className="px-4 py-3">Concepto</th>
                        <th className="px-4 py-3">Método</th>
                        <th className="px-4 py-3">Referencia</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                      </tr>
                    </thead>

                    <tbody>
                      {gastos.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-6 text-center text-slate-500"
                          >
                            No hay gastos detallados para este periodo.
                          </td>
                        </tr>
                      ) : (
                        gastos.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3">{item.fecha}</td>
                            <td className="px-4 py-3">{item.proveedor}</td>
                            <td className="px-4 py-3">{item.categoria}</td>
                            <td className="px-4 py-3">{item.concepto}</td>
                            <td className="px-4 py-3">{item.metodo_pago}</td>
                            <td className="px-4 py-3">{item.referencia}</td>
                            <td className="px-4 py-3 text-right font-semibold text-red-700">
                              {formatMoney(item.monto)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-10 grid gap-6 md:grid-cols-3">
                <div className="border-t border-slate-300 pt-3 text-center">
                  <p className="font-semibold text-slate-900">Preparado por</p>
                  <p className="mt-1 text-sm text-slate-500">Administración</p>
                </div>

                <div className="border-t border-slate-300 pt-3 text-center">
                  <p className="font-semibold text-slate-900">Revisado por</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Tesorero / Directiva
                  </p>
                </div>

                <div className="border-t border-slate-300 pt-3 text-center">
                  <p className="font-semibold text-slate-900">Aprobado por</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Presidente / Junta de Condominio
                  </p>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
                Reporte generado por VAM Administradora de Condominios.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}