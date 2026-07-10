"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type PerfilUsuario = {
  condominio_id: number | null;
  condominio: string | null;
  nombre?: string | null;
  rol?: string | null;
};

type CondominioInfo = {
  id: number;
  nombre: string | null;
  logo_url?: string | null;
};

type CuentaBancaria = {
  id: number;
  condominio_id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
  tipo_cuenta: string | null;
  moneda: string | null;
  activa: boolean | null;
};

type CierreBancario = {
  id?: number;
  condominio_id?: number | null;
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

type GastoRelacionado = {
  id: number;
  proveedor?: string | null;
  concepto?: string | null;
  descripcion?: string | null;
  detalle_gasto?: string | null;
  categoria?: string | null;
  total?: number | string | null;
  monto?: number | string | null;
  itbis?: number | string | null;
  no_factura?: string | null;
  ncf?: string | null;
  metodo_pago?: string | null;
  numero_cheque?: string | null;
  fecha_pago?: string | null;
  cheque_url?: string | null;
};

type MovimientoBanco = {
  id: number;
  condominio_id: number | null;
  cuenta_bancaria_id: number | null;
  fecha_movimiento: string | null;
  periodo: string | null;
  tipo_movimiento: string | null;
  origen: string | null;
  referencia_id: number | null;
  descripcion: string | null;
  monto: number | string | null;
  conciliado?: boolean | null;
  referencia_banco?: string | null;
  numero_documento?: string | null;
  beneficiario?: string | null;
  fecha_banco?: string | null;
  estado_banco?: string | null;
  saldo_movimiento?: number | string | null;
};

type DetalleGasto = {
  id: string;
  fecha: string;
  concepto: string;
  proveedor: string;
  numeroDocumento: string;
  factura: string;
  ncf: string;
  monto: number;
};

type CargoBanco = {
  id: string;
  fecha: string;
  concepto: string;
  referencia: string;
  monto: number;
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
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);

  return d.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizarTexto(value: any): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function limpiarTexto(value: any, fallback = "-"): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function periodoActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nombrePeriodo(periodo: string): string {
  if (!periodo || !periodo.includes("-")) return periodo;

  const [year, month] = periodo.split("-");
  const fecha = new Date(Number(year), Number(month) - 1, 1);

  const mes = fecha.toLocaleDateString("es-DO", { month: "long" });
  return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${year}`;
}

function rangoPeriodo(periodo: string) {
  const [yearRaw, monthRaw] = String(periodo || "").split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return { desde: `${periodo}-01`, hasta: `${periodo}-31`, cierre: `${periodo}-30` };
  }

  const desde = `${year}-${String(month).padStart(2, "0")}-01`;
  const siguiente = new Date(year, month, 1);
  const hasta = `${siguiente.getFullYear()}-${String(siguiente.getMonth() + 1).padStart(2, "0")}-01`;
  const ultimoDia = new Date(year, month, 0);
  const cierre = `${ultimoDia.getFullYear()}-${String(ultimoDia.getMonth() + 1).padStart(2, "0")}-${String(ultimoDia.getDate()).padStart(2, "0")}`;

  return { desde, hasta, cierre };
}

function generarPeriodosHistoricos(cantidadMeses = 36): string[] {
  const hoy = new Date();
  const periodos: string[] = [];

  for (let i = 0; i < cantidadMeses; i++) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    periodos.push(`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`);
  }

  return periodos;
}

function esMovimientoActivo(row: MovimientoBanco): boolean {
  return normalizarTexto(row.estado_banco).toUpperCase() !== "ANULADO";
}

function tipoMovimiento(row: MovimientoBanco): string {
  return normalizarTexto(row.tipo_movimiento).toUpperCase();
}

function esCargoBanco(row: MovimientoBanco): boolean {
  const texto = normalizarTexto([
    row.origen,
    row.descripcion,
    row.beneficiario,
    row.numero_documento,
    row.referencia_banco,
  ].join(" "));

  return (
    !row.referencia_id ||
    texto.includes("impuesto") ||
    texto.includes("cargo bancario") ||
    texto.includes("cargos bancarios") ||
    texto.includes("comision") ||
    texto.includes("comisión") ||
    texto.includes("ajuste bancario") ||
    texto.includes("ajuste_bancario") ||
    texto.includes("itbis banco")
  );
}

function perteneceAlPeriodo(row: MovimientoBanco, periodo: string): boolean {
  if (String(row.periodo || "").slice(0, 7) === periodo) return true;

  const fecha = String(row.fecha_movimiento || row.fecha_banco || "").slice(0, 7);
  return fecha === periodo;
}

export default function ResumenFinancieroPropietariosPage() {
  const [loading, setLoading] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [condominio, setCondominio] = useState<CondominioInfo | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancaria | null>(null);
  const [periodos, setPeriodos] = useState<CierreBancario[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>(periodoActual());

  const [cierre, setCierre] = useState<CierreBancario | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoBanco[]>([]);
  const [gastosRelacionados, setGastosRelacionados] = useState<Map<number, GastoRelacionado>>(new Map());

  const periodosDisponibles = useMemo(() => {
    const existentes = periodos.map((p) => p.periodo).filter(Boolean);
    return Array.from(new Set([...existentes, ...generarPeriodosHistoricos(24)])).sort((a, b) => b.localeCompare(a));
  }, [periodos]);

  const ingresos = useMemo(
    () => movimientos.filter((m) => tipoMovimiento(m) === "INGRESO"),
    [movimientos]
  );

  const egresos = useMemo(
    () => movimientos.filter((m) => tipoMovimiento(m) === "EGRESO"),
    [movimientos]
  );

  const gastosOperativos = useMemo(() => egresos.filter((m) => !esCargoBanco(m)), [egresos]);
  const cargosBancarios = useMemo(() => egresos.filter((m) => esCargoBanco(m)), [egresos]);

  const detalleGastos = useMemo<DetalleGasto[]>(() => {
    return gastosOperativos.map((m) => {
      const gasto = m.referencia_id ? gastosRelacionados.get(Number(m.referencia_id)) : null;
      const concepto = limpiarTexto(
        gasto?.concepto || gasto?.descripcion || gasto?.detalle_gasto || m.descripcion,
        "Gasto operativo"
      );
      const proveedor = limpiarTexto(gasto?.proveedor || m.beneficiario, "Proveedor / beneficiario");
      const numeroDocumento = limpiarTexto(
        gasto?.numero_cheque || m.numero_documento || m.referencia_banco,
        "-"
      );

      return {
        id: `gasto-${m.id}`,
        fecha: formatDate(m.fecha_movimiento || m.fecha_banco),
        concepto,
        proveedor,
        numeroDocumento,
        factura: limpiarTexto(gasto?.no_factura, "-"),
        ncf: limpiarTexto(gasto?.ncf, "-"),
        monto: toNumber(m.monto),
      };
    });
  }, [gastosOperativos, gastosRelacionados]);

  const detalleCargosBanco = useMemo<CargoBanco[]>(() => {
    return cargosBancarios.map((m) => ({
      id: `cargo-${m.id}`,
      fecha: formatDate(m.fecha_movimiento || m.fecha_banco),
      concepto: limpiarTexto(m.descripcion || m.origen, "Cargo / impuesto bancario"),
      referencia: limpiarTexto(m.numero_documento || m.referencia_banco, "-"),
      monto: toNumber(m.monto),
    }));
  }, [cargosBancarios]);

  const totalIngresosDetalle = useMemo(
    () => ingresos.reduce((acc, m) => acc + toNumber(m.monto), 0),
    [ingresos]
  );

  const totalGastosOperativos = useMemo(
    () => detalleGastos.reduce((acc, item) => acc + toNumber(item.monto), 0),
    [detalleGastos]
  );

  const totalCargosBancarios = useMemo(
    () => detalleCargosBanco.reduce((acc, item) => acc + toNumber(item.monto), 0),
    [detalleCargosBanco]
  );

  const totalEgresos = totalGastosOperativos + totalCargosBancarios;

  const balanceInicial = useMemo(() => {
    const valorCierre = toNumber(cierre?.balance_inicial);
    return valorCierre;
  }, [cierre]);

  const totalIngresosPeriodo = useMemo(() => {
    const valorCierre = toNumber(cierre?.total_ingresos);
    return valorCierre > 0 || totalIngresosDetalle === 0 ? valorCierre : totalIngresosDetalle;
  }, [cierre, totalIngresosDetalle]);

  const totalGastosPeriodo = useMemo(() => {
    const valorCierre = toNumber(cierre?.total_gastos);
    return valorCierre > 0 || totalEgresos === 0 ? valorCierre : totalEgresos;
  }, [cierre, totalEgresos]);

  const balanceFinal = useMemo(() => {
    const valorCierre = toNumber(cierre?.balance_final);
    if (valorCierre !== 0) return valorCierre;
    return balanceInicial + totalIngresosPeriodo - totalGastosPeriodo;
  }, [cierre, balanceInicial, totalIngresosPeriodo, totalGastosPeriodo]);

  const balanceCalculado = balanceInicial + totalIngresosPeriodo - totalEgresos;
  const diferencia = balanceFinal - balanceCalculado;
  const fechaCierreTexto = formatDate(rangoPeriodo(periodoSeleccionado).cierre);

  useEffect(() => {
    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (perfil?.condominio_id && cuenta?.id && periodoSeleccionado) {
      consultarPeriodo(periodoSeleccionado, perfil.condominio_id, cuenta.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoSeleccionado, perfil?.condominio_id, cuenta?.id]);

  async function inicializar() {
    setLoading(true);
    setError(null);

    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const periodoUrl = params.get("periodo");
        if (periodoUrl && /^\d{4}-\d{2}$/.test(periodoUrl)) {
          setPeriodoSeleccionado(periodoUrl);
        }
      }

      const contexto = await obtenerContextoUsuario();

      if (!contexto.condominio_id) {
        setError("No se pudo identificar el condominio activo del usuario logueado.");
        setLoading(false);
        return;
      }

      setPerfil(contexto);

      const condominioInfo = await cargarCondominio(contexto.condominio_id);
      setCondominio(condominioInfo);

      const cuentaActiva = await cargarCuentaBancariaActiva(contexto.condominio_id);
      setCuenta(cuentaActiva);

      await cargarPeriodos(contexto.condominio_id);
    } catch (err: any) {
      setError(err?.message || "Error cargando el reporte resumido.");
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
    if (!user) throw new Error("No hay usuario logueado.");

    let perfilEncontrado: any = null;

    async function intentarPerfil(campo: string, valor: string) {
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq(campo, valor).maybeSingle();
        if (!error && data) return data;
      } catch {
        return null;
      }
      return null;
    }

    perfilEncontrado = await intentarPerfil("id", user.id);
    if (!perfilEncontrado) perfilEncontrado = await intentarPerfil("user_id", user.id);
    if (!perfilEncontrado && user.email) perfilEncontrado = await intentarPerfil("email", user.email);

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
          const posibleId = parsed?.id ?? parsed?.condominio_id ?? parsed?.id_condominio ?? parsed?.condominioId ?? raw;
          const numeroId = Number(posibleId);

          if (Number.isFinite(numeroId) && numeroId > 0) {
            condominioId = numeroId;
            nombreCondominio = parsed?.nombre ?? parsed?.condominio ?? parsed?.nombre_condominio ?? parsed?.condominio_nombre ?? nombreCondominio;
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
      return { condominio_id: null, condominio: null };
    }

    return {
      condominio_id: Number(condominioId),
      condominio: nombreCondominio || null,
      nombre: perfilEncontrado?.full_name || perfilEncontrado?.nombre || null,
      rol: perfilEncontrado?.role || perfilEncontrado?.rol || null,
    };
  }

  async function cargarCondominio(condominioId: number): Promise<CondominioInfo | null> {
    try {
      const { data, error } = await supabase
        .from("condominios")
        .select("id, nombre, logo_url")
        .eq("id", condominioId)
        .maybeSingle();

      if (error) {
        console.warn("No se pudo cargar condominio:", error.message);
        return null;
      }

      return (data as CondominioInfo) || null;
    } catch (err) {
      console.warn("Error cargando condominio:", err);
      return null;
    }
  }

  async function cargarCuentaBancariaActiva(condominioId: number): Promise<CuentaBancaria | null> {
    try {
      const { data, error } = await supabase
        .from("cuentas_bancarias")
        .select("id, condominio_id, nombre_banco, numero_cuenta, tipo_cuenta, moneda, activa")
        .eq("condominio_id", condominioId)
        .eq("activa", true)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("No se pudo cargar cuenta bancaria activa:", error.message);
        return null;
      }

      return (data as CuentaBancaria) || null;
    } catch (err) {
      console.warn("Error cargando cuenta bancaria activa:", err);
      return null;
    }
  }

  async function cargarPeriodos(condominioId: number) {
    try {
      const { data, error } = await supabase
        .from("banco_cierres_mensuales")
        .select("*")
        .eq("condominio_id", condominioId)
        .order("periodo", { ascending: false });

      if (error) {
        console.warn("No se pudieron cargar cierres bancarios:", error.message);
        setPeriodos([]);
        return;
      }

      setPeriodos((data || []) as CierreBancario[]);
    } catch (err) {
      console.warn("Error cargando periodos bancarios:", err);
      setPeriodos([]);
    }
  }

  async function consultarPeriodo(periodo: string, condominioId: number, cuentaBancariaId: number) {
    setConsultando(true);
    setError(null);

    try {
      const [cierreData, movimientosData] = await Promise.all([
        buscarCierre(periodo, condominioId, cuentaBancariaId),
        cargarMovimientos(periodo, condominioId, cuentaBancariaId),
      ]);

      setCierre(cierreData);
      setMovimientos(movimientosData);
      await cargarGastosRelacionados(movimientosData);
    } catch (err: any) {
      setError(err?.message || "Error consultando el periodo.");
    } finally {
      setConsultando(false);
    }
  }

  async function buscarCierre(
    periodo: string,
    condominioId: number,
    cuentaBancariaId: number
  ): Promise<CierreBancario | null> {
    try {
      let { data, error } = await supabase
        .from("banco_cierres_mensuales")
        .select("*")
        .eq("condominio_id", condominioId)
        .eq("cuenta_bancaria_id", cuentaBancariaId)
        .eq("periodo", periodo)
        .maybeSingle();

      if (!error && !data) {
        const fallback = await supabase
          .from("banco_cierres_mensuales")
          .select("*")
          .eq("condominio_id", condominioId)
          .eq("periodo", periodo)
          .limit(1)
          .maybeSingle();

        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.warn("No se pudo cargar cierre bancario:", error.message);
        return null;
      }

      if (data) return data as CierreBancario;

      const balanceAnterior = await buscarBalanceAnterior(periodo, condominioId, cuentaBancariaId);
      return {
        condominio_id: condominioId,
        cuenta_bancaria_id: cuentaBancariaId,
        periodo,
        balance_inicial: balanceAnterior,
        total_ingresos: 0,
        total_gastos: 0,
        balance_final: balanceAnterior,
        estado: "SIN_CIERRE",
        fecha_cierre: null,
      };
    } catch (err) {
      console.warn("Error cargando cierre bancario:", err);
      return null;
    }
  }

  async function buscarBalanceAnterior(periodo: string, condominioId: number, cuentaBancariaId: number) {
    try {
      let { data, error } = await supabase
        .from("banco_cierres_mensuales")
        .select("periodo, balance_final")
        .eq("condominio_id", condominioId)
        .eq("cuenta_bancaria_id", cuentaBancariaId)
        .lt("periodo", periodo)
        .order("periodo", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && !data) {
        const fallback = await supabase
          .from("banco_cierres_mensuales")
          .select("periodo, balance_final")
          .eq("condominio_id", condominioId)
          .lt("periodo", periodo)
          .order("periodo", { ascending: false })
          .limit(1)
          .maybeSingle();

        data = fallback.data;
        error = fallback.error;
      }

      if (error) return 0;
      return toNumber(data?.balance_final);
    } catch {
      return 0;
    }
  }

  async function cargarMovimientos(
    periodo: string,
    condominioId: number,
    cuentaBancariaId: number
  ): Promise<MovimientoBanco[]> {
    const { desde, hasta } = rangoPeriodo(periodo);
    const resultados: MovimientoBanco[] = [];
    const vistos = new Set<string>();

    async function agregar(query: any) {
      const { data, error } = await query.order("fecha_movimiento", { ascending: true }).order("id", { ascending: true }).limit(5000);
      if (error) {
        console.warn("No se pudieron cargar movimientos:", error.message);
        return;
      }

      (data || []).forEach((row: MovimientoBanco) => {
        const key = String(row.id || `${row.fecha_movimiento}-${row.tipo_movimiento}-${row.monto}-${row.descripcion}`);
        if (vistos.has(key)) return;
        vistos.add(key);
        resultados.push(row);
      });
    }

    await agregar(
      supabase
        .from("banco_movimientos")
        .select("*")
        .eq("condominio_id", condominioId)
        .eq("cuenta_bancaria_id", cuentaBancariaId)
        .eq("periodo", periodo)
    );

    await agregar(
      supabase
        .from("banco_movimientos")
        .select("*")
        .eq("condominio_id", condominioId)
        .eq("periodo", periodo)
    );

    await agregar(
      supabase
        .from("banco_movimientos")
        .select("*")
        .eq("condominio_id", condominioId)
        .eq("cuenta_bancaria_id", cuentaBancariaId)
        .gte("fecha_movimiento", desde)
        .lt("fecha_movimiento", hasta)
    );

    return resultados.filter((row) => esMovimientoActivo(row) && perteneceAlPeriodo(row, periodo));
  }

  async function cargarGastosRelacionados(movimientosData: MovimientoBanco[]) {
    const ids = Array.from(
      new Set(
        movimientosData
          .filter((m) => tipoMovimiento(m) === "EGRESO")
          .map((m) => Number(m.referencia_id || 0))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    );

    if (ids.length === 0) {
      setGastosRelacionados(new Map());
      return;
    }

    try {
      const { data, error } = await supabase
        .from("gastos")
        .select("id, proveedor, concepto, descripcion, detalle_gasto, categoria, total, monto, itbis, no_factura, ncf, metodo_pago, numero_cheque, fecha_pago, cheque_url")
        .in("id", ids);

      if (error) {
        console.warn("No se pudieron cargar gastos relacionados:", error.message);
        setGastosRelacionados(new Map());
        return;
      }

      const map = new Map<number, GastoRelacionado>();
      (data || []).forEach((row: any) => {
        map.set(Number(row.id), row as GastoRelacionado);
      });

      setGastosRelacionados(map);
    } catch (err) {
      console.warn("Error cargando gastos relacionados:", err);
      setGastosRelacionados(new Map());
    }
  }

  function imprimirReporte() {
    window.print();
  }

  function recargar() {
    if (perfil?.condominio_id && cuenta?.id) {
      consultarPeriodo(periodoSeleccionado, perfil.condominio_id, cuenta.id);
    }
  }

  const estadoPeriodo = String(cierre?.estado || "SIN_CIERRE").toUpperCase();
  const condominioNombre = condominio?.nombre || perfil?.condominio || "Condominio";
  const cuentaTexto = cuenta
    ? `${cuenta.nombre_banco || "Banco"} - ${cuenta.numero_cuenta || "Sin número"}`
    : "Cuenta bancaria no identificada";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-slate-600">Cargando resumen financiero...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:px-0 print:py-0">
      <style jsx global>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0.45in;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
          }

          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-text-xs {
            font-size: 10px !important;
          }

          .print-table th,
          .print-table td {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-5xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Resumen Financiero Mensual</h1>
          <p className="mt-1 text-sm text-slate-500">Reporte resumido para propietarios desde Control Bancario.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="text-sm font-medium text-slate-700">
            Periodo
            <select
              value={periodoSeleccionado}
              onChange={(e) => setPeriodoSeleccionado(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {periodosDisponibles.map((p) => (
                <option key={p} value={p}>
                  {nombrePeriodo(p)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={recargar}
            disabled={consultando}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {consultando ? "Consultando..." : "Actualizar"}
          </button>

          <button
            type="button"
            onClick={imprimirReporte}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Imprimir / PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="no-print mx-auto mb-4 max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <main className="print-card mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm print:p-0">
        <header className="print-avoid-break border-b-4 border-blue-900 pb-5">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-900">VAM Administradora de Condominios</p>
              <h2 className="mt-2 text-2xl font-black uppercase text-slate-950">Resumen Financiero Mensual para Propietarios</h2>
              <p className="mt-2 text-sm text-slate-600">Reporte resumido basado en los movimientos reales del Control Bancario.</p>
            </div>

            {condominio?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={condominio.logo_url} alt="Logo" className="h-16 max-w-[130px] object-contain" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-900 text-lg font-black text-white">VAM</div>
            )}
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-2">
            <div><span className="font-bold text-slate-900">Condominio:</span> {condominioNombre}</div>
            <div><span className="font-bold text-slate-900">Periodo:</span> {nombrePeriodo(periodoSeleccionado)}</div>
            <div><span className="font-bold text-slate-900">Cuenta bancaria:</span> {cuentaTexto}</div>
            <div><span className="font-bold text-slate-900">Fecha del reporte:</span> {formatDate(new Date().toISOString())}</div>
            <div><span className="font-bold text-slate-900">Estado del periodo:</span> {estadoPeriodo === "SIN_CIERRE" ? "SIN CIERRE" : estadoPeriodo}</div>
            <div><span className="font-bold text-slate-900">Balance al:</span> {fechaCierreTexto}</div>
          </div>
        </header>

        <section className="print-avoid-break mt-6">
          <h3 className="mb-3 text-base font-black uppercase tracking-wide text-slate-900">1. Resumen general del mes</h3>

          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Balance inicial</p>
              <p className="mt-2 text-lg font-black text-slate-900">{formatMoney(balanceInicial)}</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase text-emerald-700">Ingresos</p>
              <p className="mt-2 text-lg font-black text-emerald-800">{formatMoney(totalIngresosPeriodo)}</p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold uppercase text-red-700">Gastos operativos</p>
              <p className="mt-2 text-lg font-black text-red-800">{formatMoney(totalGastosOperativos)}</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-700">Impuestos / cargos</p>
              <p className="mt-2 text-lg font-black text-amber-800">{formatMoney(totalCargosBancarios)}</p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase text-blue-700">Balance final</p>
              <p className="mt-2 text-lg font-black text-blue-900">{formatMoney(balanceFinal)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200">
            <table className="print-table w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700">Balance inicial al 01/{periodoSeleccionado.slice(5, 7)}/{periodoSeleccionado.slice(0, 4)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatMoney(balanceInicial)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700">Total ingresos del mes</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatMoney(totalIngresosPeriodo)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700">Total gastos operativos pagados</td>
                  <td className="px-4 py-3 text-right font-bold text-red-700">{formatMoney(totalGastosOperativos)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700">Cargos / impuestos bancarios</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700">{formatMoney(totalCargosBancarios)}</td>
                </tr>
                <tr className="bg-blue-900 text-white">
                  <td className="px-4 py-3 text-base font-black">Balance al {fechaCierreTexto}</td>
                  <td className="px-4 py-3 text-right text-base font-black">{formatMoney(balanceFinal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="print-avoid-break mt-6">
          <h3 className="mb-3 text-base font-black uppercase tracking-wide text-slate-900">2. Ingresos recibidos</h3>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-bold text-emerald-900">Ingresos por mantenimiento y otros conceptos</p>
              <p className="text-xl font-black text-emerald-800">{formatMoney(totalIngresosPeriodo)}</p>
            </div>
            <p className="mt-2 text-xs text-emerald-800">Los ingresos corresponden a los movimientos bancarios registrados como ingresos durante el periodo indicado.</p>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-4">
            <h3 className="text-base font-black uppercase tracking-wide text-slate-900">3. Detalle de gastos operativos</h3>
            <p className="text-sm font-black text-red-700">Total: {formatMoney(totalGastosOperativos)}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="print-table w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3">Concepto / Factura</th>
                  <th className="px-3 py-3">Proveedor / Beneficiario</th>
                  <th className="px-3 py-3">No. cheque / doc.</th>
                  <th className="px-3 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {detalleGastos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-5 text-center text-slate-500">No hay gastos operativos registrados para este periodo.</td>
                  </tr>
                ) : (
                  detalleGastos.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-3 whitespace-nowrap">{item.fecha}</td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-900">{item.concepto}</div>
                        {(item.factura !== "-" || item.ncf !== "-") && (
                          <div className="mt-1 text-[11px] text-slate-500">Factura: {item.factura} {item.ncf !== "-" ? `| NCF: ${item.ncf}` : ""}</div>
                        )}
                      </td>
                      <td className="px-3 py-3">{item.proveedor}</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{item.numeroDocumento}</td>
                      <td className="px-3 py-3 text-right font-bold text-red-700 whitespace-nowrap">{formatMoney(item.monto)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="print-avoid-break mt-6">
          <div className="mb-3 flex items-end justify-between gap-4">
            <h3 className="text-base font-black uppercase tracking-wide text-slate-900">4. Cargos e impuestos bancarios</h3>
            <p className="text-sm font-black text-amber-700">Total: {formatMoney(totalCargosBancarios)}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="print-table w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3">Concepto</th>
                  <th className="px-3 py-3">Referencia</th>
                  <th className="px-3 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {detalleCargosBanco.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-5 text-center text-slate-500">No hay cargos o impuestos bancarios registrados para este periodo.</td>
                  </tr>
                ) : (
                  detalleCargosBanco.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-3 whitespace-nowrap">{item.fecha}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{item.concepto}</td>
                      <td className="px-3 py-3">{item.referencia}</td>
                      <td className="px-3 py-3 text-right font-bold text-amber-700 whitespace-nowrap">{formatMoney(item.monto)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="print-avoid-break mt-6 rounded-2xl border-2 border-blue-900">
          <div className="bg-blue-900 px-4 py-3 text-white">
            <h3 className="text-base font-black uppercase tracking-wide">5. Cuadre final del mes</h3>
          </div>

          <table className="print-table w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-700">Balance inicial</td>
                <td className="px-4 py-3 text-right font-bold">{formatMoney(balanceInicial)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-700">Más total ingresos</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatMoney(totalIngresosPeriodo)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-700">Menos gastos operativos</td>
                <td className="px-4 py-3 text-right font-bold text-red-700">{formatMoney(totalGastosOperativos)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-700">Menos cargos / impuestos bancarios</td>
                <td className="px-4 py-3 text-right font-bold text-amber-700">{formatMoney(totalCargosBancarios)}</td>
              </tr>
              <tr className="bg-slate-100">
                <td className="px-4 py-3 text-base font-black text-slate-900">Balance al {fechaCierreTexto}</td>
                <td className="px-4 py-3 text-right text-base font-black text-blue-900">{formatMoney(balanceFinal)}</td>
              </tr>
              {Math.abs(diferencia) > 0.01 && (
                <tr className="bg-amber-50">
                  <td className="px-4 py-3 font-bold text-amber-800">Diferencia contra balance calculado</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-800">{formatMoney(diferencia)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="print-avoid-break mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
            <p className="font-bold uppercase text-slate-900">Nota</p>
            <p className="mt-2">Este reporte resume los movimientos bancarios registrados durante el periodo indicado, tomando como base el Control Bancario del condominio. Para cualquier aclaración, favor contactar a la administración.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 text-center">
            <div className="mt-10 border-t border-slate-400 pt-3">
              <p className="font-bold text-slate-900">VAM Administradora de Condominios</p>
              <p className="text-xs text-slate-500">Administración</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
