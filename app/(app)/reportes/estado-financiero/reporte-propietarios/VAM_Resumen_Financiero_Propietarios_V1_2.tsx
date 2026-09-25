"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  advertencia?: string;
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

function mostrarMonto(value: number | null): string {
  return value === null ? "No disponible" : formatMoney(value);
}

function centavos(value: unknown): number {
  return Math.round(toNumber(value) * 100);
}

function desdeCentavos(value: number): number {
  return value / 100;
}

function totalizarMovimientos(rows: MovimientoBanco[]): number {
  // El tipo INGRESO/EGRESO determina el sentido; monto es la magnitud.
  // Una partida con signo negativo se muestra como anomalía a investigar.
  return desdeCentavos(rows.reduce((total, row) => total + Math.abs(centavos(row.monto)), 0));
}

function diferenciaMonetaria(a: number, b: number): number {
  return desdeCentavos(centavos(a) - centavos(b));
}

function formatDate(value: any): string {
  if (!value) return "-";
  // Las fechas DATE de Supabase deben interpretarse como día local, no UTC:
  // new Date("2026-08-31") mostraría 30/08 en República Dominicana.
  const soloFecha = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  const d = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
    : new Date(value);
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

/**
 * Ordena los gastos por el número de cheque o documento.
 * Los valores que no contienen números se colocan al final.
 */
function compararNumeroDocumento(a: string, b: string): number {
  const textoA = limpiarTexto(a, "");
  const textoB = limpiarTexto(b, "");

  const numeroA = (textoA.match(/\d+/g) || []).join("");
  const numeroB = (textoB.match(/\d+/g) || []).join("");

  if (numeroA && numeroB) {
    const comparacionNumerica = numeroA.localeCompare(numeroB, "es", {
      numeric: true,
      sensitivity: "base",
    });

    if (comparacionNumerica !== 0) return comparacionNumerica;
  } else if (numeroA) {
    return -1;
  } else if (numeroB) {
    return 1;
  }

  return textoA.localeCompare(textoB, "es", {
    numeric: true,
    sensitivity: "base",
  });
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

function esCajaChica(row: MovimientoBanco): boolean {
  const texto = normalizarTexto([
    row.origen,
    row.descripcion,
    row.beneficiario,
    row.numero_documento,
    row.referencia_banco,
  ].join(" "));

  return (
    texto.includes("caja chica") ||
    texto.includes("caja_chica") ||
    texto.includes("fondo de caja chica") ||
    texto.includes("reposicion de caja chica") ||
    texto.includes("reposición de caja chica")
  );
}

function esCargoBanco(row: MovimientoBanco): boolean {
  // El origen es determinante: el cheque 398 paga un impuesto DGII operativo,
  // NO es una comisión debitada automáticamente por el banco.
  if (esCajaChica(row)) return false;
  const origen = normalizarTexto(row.origen).replace(/\s+/g, "_").toUpperCase();
  if (["CHEQUE", "PAGO_PROVEEDOR", "GASTO", "PAGO_GASTO", "GASTO_OPERATIVO"].includes(origen)) return false;
  if (["CARGO_BANCARIO", "COMISION_BANCARIA", "IMPUESTO_BANCARIO"].includes(origen)) return true;
  // Solo textos inequívocamente bancarios para registros antiguos sin origen específico.
  if (!origen || ["BANCO", "AJUSTE_BANCARIO"].includes(origen)) {
    const descripcion = normalizarTexto(row.descripcion);
    return /(?:cargo bancario|cargos bancarios|comision bancaria|comisiones bancarias|itbis banco|tarifa bancaria|db comisiones)/.test(descripcion);
  }
  // Origen desconocido: no inventar una categoría.
  return false;
}

function esOrigenDeGasto(row: MovimientoBanco): boolean {
  const origen = normalizarTexto(row.origen).replace(/\s+/g, "_").toUpperCase();
  return ["CHEQUE", "PAGO_PROVEEDOR", "GASTO", "PAGO_GASTO", "GASTO_OPERATIVO"].includes(origen);
}

function gastoCoincideMovimiento(row: MovimientoBanco, gasto: GastoRelacionado | undefined): boolean {
  if (!gasto || !esOrigenDeGasto(row)) return false;
  // Nunca enriquecer con un gasto de otro documento por simple coincidencia de ID.
  const chequeMovimiento = limpiarTexto(row.numero_documento, "");
  const chequeGasto = limpiarTexto(gasto.numero_cheque, "");
  if (chequeMovimiento && chequeGasto && chequeMovimiento !== chequeGasto) return false;
  const importeGasto = gasto.total !== null && gasto.total !== undefined
    ? gasto.total : gasto.monto;
  if (importeGasto === null || importeGasto === undefined) return false;
  return Math.abs(centavos(importeGasto)) === Math.abs(centavos(row.monto));
}

function esGastoOperativo(row: MovimientoBanco): boolean {
  if (esCajaChica(row)) return true;
  const origen = normalizarTexto(row.origen);
  const texto = normalizarTexto(`${row.descripcion || ""} ${row.beneficiario || ""}`);
  return /(?:gasto|nomina|nómina|solicitud.pago|cheque|proveedor|suplidor|reposicion|reposición)/.test(origen) ||
    /(?:cheque pagado|nomina|nómina|pago factura|caja chica|pago proveedor|pago suplidor)/.test(texto);
}

function fechaEfectiva(row: MovimientoBanco): string {
  return String(row.fecha_banco || row.fecha_movimiento || "").slice(0, 10);
}

function perteneceAlPeriodo(row: MovimientoBanco, periodo: string): boolean {
  const fecha = fechaEfectiva(row);
  // Fecha bancaria prevalece; jamás incluir una partida de otro mes por período contable.
  return fecha ? fecha.slice(0, 7) === periodo : String(row.periodo || "").slice(0, 7) === periodo;
}

function diferenciaImportante(value: number | null): boolean {
  return value !== null && Math.abs(centavos(value)) > 0;
}

export default function ResumenFinancieroPropietariosPage() {
  const [loading, setLoading] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [condominio, setCondominio] = useState<CondominioInfo | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancaria | null>(null);
  const [cuentasDisponibles, setCuentasDisponibles] = useState<CuentaBancaria[]>([]);
  const [periodos, setPeriodos] = useState<CierreBancario[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>(periodoActual());

  const [cierre, setCierre] = useState<CierreBancario | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoBanco[]>([]);
  const [gastosRelacionados, setGastosRelacionados] = useState<Map<number, GastoRelacionado>>(new Map());
  const consultaActual = useRef(0);

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

  const gastosOperativos = useMemo(() => egresos.filter((m) => !esCargoBanco(m) && esGastoOperativo(m)), [egresos]);
  const cargosBancarios = useMemo(() => egresos.filter((m) => esCargoBanco(m)), [egresos]);
  const egresosPorClasificar = useMemo(
    () => egresos.filter((m) => !esCargoBanco(m) && !esGastoOperativo(m)),
    [egresos],
  );

  const detalleGastos = useMemo<DetalleGasto[]>(() => {
    return gastosOperativos
      .map((m) => {
        const gastoCandidato = m.referencia_id ? gastosRelacionados.get(Number(m.referencia_id)) : undefined;
        const gasto = gastoCoincideMovimiento(m, gastoCandidato) ? gastoCandidato : undefined;
        const diferenciaMontoInterno = gasto && gasto.monto !== null && gasto.monto !== undefined &&
          gasto.total !== null && gasto.total !== undefined &&
          centavos(gasto.monto) !== centavos(gasto.total);
        const advertencia = gastoCandidato && !gasto
          ? "Vínculo al gasto sin validar: el documento o importe no coincide. Se usa el movimiento bancario."
          : diferenciaMontoInterno
            ? "Revisar gasto: el monto y el total registrados en gastos difieren; se conserva el valor del movimiento bancario."
            : undefined;
        const concepto = limpiarTexto(
          gasto?.concepto || gasto?.descripcion || gasto?.detalle_gasto || m.descripcion,
          esCajaChica(m) ? "Caja chica" : "Gasto operativo"
        );
        const proveedor = limpiarTexto(
          gasto?.proveedor || (normalizarTexto(m.descripcion).includes("nomina")
            ? "Nómina / beneficiario no consignado"
            : m.beneficiario), "Proveedor / beneficiario");
        const numeroDocumento = limpiarTexto(
          gasto?.numero_cheque || m.numero_documento || m.referencia_banco,
          "-"
        );

        return {
          id: `gasto-${m.id}`,
          fecha: formatDate(m.fecha_banco || m.fecha_movimiento),
          concepto,
          proveedor,
          numeroDocumento,
          factura: limpiarTexto(gasto?.no_factura, "-"),
          ncf: limpiarTexto(gasto?.ncf, "-"),
          monto: Math.abs(toNumber(m.monto)),
          advertencia,
        };
      })
      .sort((a, b) => {
        const porNumeroCheque = compararNumeroDocumento(
          a.numeroDocumento,
          b.numeroDocumento
        );

        if (porNumeroCheque !== 0) return porNumeroCheque;

        return a.id.localeCompare(b.id, "es", {
          numeric: true,
          sensitivity: "base",
        });
      });
  }, [gastosOperativos, gastosRelacionados]);

  const detalleCargosBanco = useMemo<CargoBanco[]>(() => {
    return cargosBancarios.map((m) => ({
      id: `cargo-${m.id}`,
      fecha: formatDate(m.fecha_banco || m.fecha_movimiento),
      concepto: limpiarTexto(m.descripcion || m.origen, "Cargo / impuesto bancario"),
      referencia: limpiarTexto(m.numero_documento || m.referencia_banco, "-"),
      monto: Math.abs(toNumber(m.monto)),
    }));
  }, [cargosBancarios]);

  // Base monetaria única para el detalle: banco_movimientos de la cuenta seleccionada,
  // fecha de posteo bancaria y exclusivamente movimientos no anulados.
  const totalIngresosDetalle = useMemo(() => totalizarMovimientos(ingresos), [ingresos]);
  const totalGastosOperativos = useMemo(() => totalizarMovimientos(gastosOperativos), [gastosOperativos]);
  const totalCargosBancarios = useMemo(() => totalizarMovimientos(cargosBancarios), [cargosBancarios]);
  const totalSinClasificar = useMemo(() => totalizarMovimientos(egresosPorClasificar), [egresosPorClasificar]);
  const totalEgresos = useMemo(() => totalizarMovimientos(egresos), [egresos]);
  const vinculosGastosSinValidar = gastosOperativos.filter((m) => m.referencia_id &&
    !gastoCoincideMovimiento(m, gastosRelacionados.get(Number(m.referencia_id)))).length;
  const montosGastoDivergentes = gastosOperativos.filter((m) => {
    const g = m.referencia_id ? gastosRelacionados.get(Number(m.referencia_id)) : undefined;
    return gastoCoincideMovimiento(m, g) && g && g.monto !== null && g.monto !== undefined &&
      g.total !== null && g.total !== undefined && centavos(g.monto) !== centavos(g.total);
  }).length;

  // Nunca sustituir un total del cierre que vale 0 por un importe calculado.
  // Tampoco inventar saldo inicial/final si NO existe cierre para esta cuenta.
  const balanceInicial = cierre && cierre.balance_inicial !== null ? toNumber(cierre.balance_inicial) : null;
  const totalIngresosPeriodo = totalIngresosDetalle;
  const balanceFinal = cierre && cierre.balance_final !== null ? toNumber(cierre.balance_final) : null;
  const balanceCalculado = balanceInicial === null
    ? null
    : desdeCentavos(centavos(balanceInicial) + centavos(totalIngresosDetalle) - centavos(totalEgresos));
  const diferencia = balanceFinal !== null && balanceCalculado !== null
    ? diferenciaMonetaria(balanceFinal, balanceCalculado) : null;
  const diferenciaIngresos = cierre && cierre.total_ingresos !== null
    ? diferenciaMonetaria(toNumber(cierre.total_ingresos), totalIngresosDetalle) : null;
  const diferenciaEgresos = cierre && cierre.total_gastos !== null
    ? diferenciaMonetaria(toNumber(cierre.total_gastos), totalEgresos) : null;
  const diferenciaFormulaCierre = balanceFinal !== null && balanceInicial !== null &&
    cierre?.total_ingresos !== null && cierre?.total_gastos !== null && cierre
    ? diferenciaMonetaria(balanceFinal,
      desdeCentavos(centavos(balanceInicial) + centavos(cierre.total_ingresos) - centavos(cierre.total_gastos)))
    : null;
  const pendientesConciliar = movimientos.filter((m) => m.conciliado !== true).length;
  const montosNegativos = movimientos.filter((m) => centavos(m.monto) < 0).length;
  const tiposDesconocidos = movimientos.filter((m) => !["INGRESO", "EGRESO"].includes(tipoMovimiento(m))).length;
  const hayDiferencias = !cierre || [diferencia, diferenciaIngresos, diferenciaEgresos, diferenciaFormulaCierre]
    .some((valor) => valor === null || diferenciaImportante(valor)) || egresosPorClasificar.length > 0 ||
    montosNegativos > 0 || tiposDesconocidos > 0 || vinculosGastosSinValidar > 0;
  const estadoRevision = !cierre ? "SIN CIERRE PARA ESTA CUENTA" :
    hayDiferencias ? "DIFERENCIAS EN CONTROL BANCARIO" :
    pendientesConciliar > 0 ? "MOVIMIENTOS PENDIENTES DE CONCILIAR" :
    "CUADRE INTERNO SIN DIFERENCIAS";
  const totalNoClasificados = egresosPorClasificar.length;
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

      const cuentasActivas = await cargarCuentasBancariasActivas(contexto.condominio_id);
      setCuentasDisponibles(cuentasActivas);
      setCuenta(cuentasActivas[0] || null);
      if (!cuentasActivas.length) {
        setError("No hay cuentas bancarias activas accesibles para este condominio.");
      }

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

  async function cargarCuentasBancariasActivas(condominioId: number): Promise<CuentaBancaria[]> {
    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select("id, condominio_id, nombre_banco, numero_cuenta, tipo_cuenta, moneda, activa")
      .eq("condominio_id", condominioId)
      .eq("activa", true)
      .order("id", { ascending: true });
    if (error) throw new Error("No se pudieron consultar las cuentas bancarias: " + error.message);
    return (data || []) as CuentaBancaria[];
  }

  async function cargarPeriodos(condominioId: number) {
    const { data, error } = await supabase.from("banco_cierres_mensuales")
      .select("*").eq("condominio_id", condominioId)
      .order("periodo", { ascending: false });
    if (error) throw new Error("No se pudieron consultar los períodos bancarios: " + error.message);
    setPeriodos((data || []) as CierreBancario[]);
  }

  async function consultarPeriodo(periodo: string, condominioId: number, cuentaBancariaId: number) {
    const solicitud = ++consultaActual.current;
    setConsultando(true);
    setError(null);
    // Nunca mostrar/importar en la vista previa datos de otra cuenta o período.
    setCierre(null);
    setMovimientos([]);
    setGastosRelacionados(new Map());

    try {
      const [cierreData, movimientosData] = await Promise.all([
        buscarCierre(periodo, condominioId, cuentaBancariaId),
        cargarMovimientos(periodo, condominioId, cuentaBancariaId),
      ]);
      const gastosData = await cargarGastosRelacionados(movimientosData);
      if (consultaActual.current !== solicitud) return;
      setCierre(cierreData);
      setMovimientos(movimientosData);
      setGastosRelacionados(gastosData);
    } catch (err: any) {
      if (consultaActual.current === solicitud) {
        setError(err?.message || "Error consultando el período.");
      }
    } finally {
      if (consultaActual.current === solicitud) setConsultando(false);
    }
  }

  async function buscarCierre(
    periodo: string,
    condominioId: number,
    cuentaBancariaId: number
  ): Promise<CierreBancario | null> {
    const { data, error } = await supabase
      .from("banco_cierres_mensuales")
      .select("*")
      .eq("condominio_id", condominioId)
      .eq("cuenta_bancaria_id", cuentaBancariaId)
      .eq("periodo", periodo)
      .maybeSingle();
    if (error) throw new Error("Error consultando el cierre de la cuenta seleccionada: " + error.message);
    // Prohibido tomar el cierre de otra cuenta o generar un cierre ficticio.
    return data ? (data as CierreBancario) : null;
  }

  async function cargarMovimientos(
    periodo: string,
    condominioId: number,
    cuentaBancariaId: number
  ): Promise<MovimientoBanco[]> {
    const { desde, hasta } = rangoPeriodo(periodo);
    const resultados: MovimientoBanco[] = [];
    const vistos = new Set<number>();
    const tamano = 1000;

    async function agregar(crearConsulta: () => any, etiqueta: string) {
      for (let pagina = 0; ; pagina++) {
        const { data, error } = await crearConsulta()
          .order("id", { ascending: true })
          .range(pagina * tamano, (pagina + 1) * tamano - 1);
        if (error) throw new Error(`Error consultando ${etiqueta}: ${error.message}`);
        const filas = (data || []) as MovimientoBanco[];
        filas.forEach((row) => {
          if (!vistos.has(row.id)) {
            vistos.add(row.id);
            resultados.push(row);
          }
        });
        if (filas.length < tamano) break;
      }
    }

    const base = () => supabase.from("banco_movimientos").select("*")
      .eq("condominio_id", condominioId).eq("cuenta_bancaria_id", cuentaBancariaId);
    // Cohortes excluyentes: fecha del banco, fecha interna si no hay fecha banco,
    // período textual SOLO si no existe ninguna de las dos fechas.
    await agregar(() => base().gte("fecha_banco", desde).lt("fecha_banco", hasta), "fecha bancaria");
    await agregar(() => base().is("fecha_banco", null)
      .gte("fecha_movimiento", desde).lt("fecha_movimiento", hasta), "fecha de movimiento");
    await agregar(() => base().is("fecha_banco", null).is("fecha_movimiento", null)
      .eq("periodo", periodo), "movimientos sin fecha");

    return resultados
      .filter((row) => esMovimientoActivo(row) && perteneceAlPeriodo(row, periodo))
      .sort((a, b) => fechaEfectiva(a).localeCompare(fechaEfectiva(b)) || a.id - b.id);
  }

  async function cargarGastosRelacionados(movimientosData: MovimientoBanco[]): Promise<Map<number, GastoRelacionado>> {
    // Los egresos CHEQUE/PAGO_PROVEEDOR de este flujo sí están relacionados
    // con gastos; validar número de cheque y total antes de usar sus metadatos.
    // Otros orígenes pueden referirse a pagos/solicitudes de tablas distintas.
    const ids = Array.from(new Set(movimientosData
      .filter((m) => tipoMovimiento(m) === "EGRESO" && esOrigenDeGasto(m))
      .map((m) => Number(m.referencia_id || 0))
      .filter((id) => Number.isFinite(id) && id > 0)));
    if (!ids.length) return new Map();

    const gastos = new Map<number, GastoRelacionado>();
    for (let inicio = 0; inicio < ids.length; inicio += 200) {
      const { data, error } = await supabase.from("gastos")
        .select("id, proveedor, concepto, descripcion, detalle_gasto, categoria, total, monto, itbis, no_factura, ncf, metodo_pago, numero_cheque, fecha_pago, cheque_url")
        .in("id", ids.slice(inicio, inicio + 200));
      if (error) throw new Error("No se pudieron consultar los gastos relacionados: " + error.message);
      (data || []).forEach((row: any) => gastos.set(Number(row.id), row as GastoRelacionado));
    }
    return gastos;
  }

  function imprimirReporte() {
    if (consultando || loading || error || !cuenta) return;
    // Abre la vista previa nativa del navegador; seleccionar "Guardar como PDF".
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
    <div id="reporte-propietarios-print-root" className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:px-0 print:py-0 print:min-h-0">
      <style jsx global>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0.25in;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden !important;
          }

          #reporte-propietarios-print-root,
          #reporte-propietarios-print-root * {
            visibility: visible !important;
          }

          #reporte-propietarios-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          .no-print {
            display: none !important;
            visibility: hidden !important;
          }

          .print-card {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
          }

          .print-avoid-break {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .print-keep-together {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-text-xs {
            font-size: 9px !important;
          }

          .print-card {
            font-size: 10px !important;
            line-height: 1.22 !important;
          }

          .print-header {
            padding-bottom: 8px !important;
            border-bottom-width: 2px !important;
          }

          .print-header-title {
            font-size: 17px !important;
            line-height: 1.05 !important;
            margin-top: 4px !important;
          }

          .print-header-subtitle {
            font-size: 10px !important;
            margin-top: 3px !important;
          }

          .print-logo-img {
            height: 42px !important;
            max-width: 92px !important;
          }

          .print-logo-box {
            height: 42px !important;
            width: 42px !important;
            border-radius: 10px !important;
            font-size: 13px !important;
          }

          .print-meta {
            margin-top: 5px !important;
            gap: 4px !important;
            padding: 7px !important;
            border-radius: 10px !important;
            font-size: 9.5px !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .print-section {
            margin-top: 7px !important;
          }

          .print-section h3 {
            font-size: 11px !important;
            margin-bottom: 5px !important;
            letter-spacing: .025em !important;
          }

          .print-summary-cards {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 4px !important;
            margin-bottom: 6px !important;
          }

          .print-summary-cards > div {
            padding: 6px !important;
            border-radius: 9px !important;
          }

          .print-summary-cards p:first-child {
            font-size: 7.5px !important;
            line-height: 1 !important;
          }

          .print-summary-cards p:last-child {
            font-size: 10.5px !important;
            line-height: 1.05 !important;
            margin-top: 3px !important;
          }

          .print-table {
            font-size: 9.2px !important;
            line-height: 1.14 !important;
          }

          .print-table th,
          .print-table td {
            padding: 3px 5px !important;
            vertical-align: top !important;
          }


          .print-table,
          .print-table thead,
          .print-table tbody,
          .print-table tr,
          .print-table th,
          .print-table td {
            visibility: visible !important;
          }

          .print-table thead {
            display: table-header-group !important;
          }

          .print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-table thead th {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }

          .print-compact-box {
            padding: 7px !important;
            border-radius: 10px !important;
          }

          .print-cuadre-title {
            padding: 6px 8px !important;
          }

          .print-note-signature {
            margin-top: 9px !important;
            gap: 8px !important;
            grid-template-columns: 1.2fr .8fr !important;
          }

          .print-signature-line {
            margin-top: 24px !important;
            padding-top: 5px !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-5xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Resumen Financiero Mensual</h1>
          <p className="mt-1 text-sm text-slate-500">V1.2 · Reporte para propietarios, con revisión de diferencias por cuenta y período.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="text-sm font-medium text-slate-700">
            Cuenta bancaria
            <select
              value={cuenta?.id || ""}
              onChange={(e) => setCuenta(cuentasDisponibles.find((item) => item.id === Number(e.target.value)) || null)}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {cuentasDisponibles.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre_banco || "Banco"} · {item.numero_cuenta || "Sin número"}</option>
              ))}
            </select>
          </label>
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
            disabled={consultando || loading || Boolean(error) || !cuenta || !perfil}
            title="Se abrirá la vista previa del navegador; seleccione Guardar como PDF."
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="no-print mx-auto mb-4 max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="no-print mx-auto mb-4 max-w-5xl rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        «Imprimir / Guardar PDF» abre la vista previa de impresión. Seleccione «Guardar como PDF» como destino.
        El cuadre interno no prueba por sí solo que los datos coincidan con el estado de cuenta externo.
      </div>

      {!error && !consultando && cuenta && <main className="print-card mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm print:p-0">
        <header className="print-header border-b-4 border-blue-900 pb-5">
          <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
            Estado de revisión: {estadoRevision}. Estado en control: {estadoPeriodo}.
            {pendientesConciliar > 0 ? ` ${pendientesConciliar} movimiento(s) sin marca de conciliación.` : ""}
            {montosNegativos > 0 ? ` ${montosNegativos} monto(s) negativos: revisar su naturaleza.` : ""}
            {tiposDesconocidos > 0 ? ` ${tiposDesconocidos} movimiento(s) sin tipo INGRESO/EGRESO: no incluidos en totales.` : ""}
            {" "}Conciliación con extracto externo: NO VERIFICADA en este reporte.
          </p>
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-900">VAM Administradora de Condominios</p>
              <h2 className="print-header-title mt-2 text-2xl font-black uppercase text-slate-950">Resumen Financiero Mensual para Propietarios</h2>
              <p className="print-header-subtitle mt-2 text-sm text-slate-600">Movimientos registrados en VAM, exclusivamente para la cuenta y fecha de posteo indicadas. V1.2.</p>
            </div>

            {condominio?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={condominio.logo_url} alt="Logo" className="print-logo-img h-16 max-w-[130px] object-contain" />
            ) : (
              <div className="print-logo-box flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-900 text-lg font-black text-white">VAM</div>
            )}
          </div>

          <div className="print-meta mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-2">
            <div><span className="font-bold text-slate-900">Condominio:</span> {condominioNombre}</div>
            <div><span className="font-bold text-slate-900">Periodo:</span> {nombrePeriodo(periodoSeleccionado)}</div>
            <div><span className="font-bold text-slate-900">Cuenta bancaria:</span> {cuentaTexto}</div>
            <div><span className="font-bold text-slate-900">Fecha del reporte:</span> {formatDate(new Date().toISOString())}</div>
            <div><span className="font-bold text-slate-900">Estado del periodo:</span> {estadoPeriodo === "SIN_CIERRE" ? "SIN CIERRE" : estadoPeriodo}</div>
            <div><span className="font-bold text-slate-900">Fecha de corte:</span> {fechaCierreTexto}</div>
          </div>
        </header>

        <section className="print-section mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <p className="font-bold">Control de diferencias · Cuenta ID {cuenta?.id || "-"} · Movimientos leídos: {movimientos.length}</p>
          <p className="mt-1">Ingreso cierre vs. detalle: {mostrarMonto(diferenciaIngresos)} · Gasto cierre vs. detalle: {mostrarMonto(diferenciaEgresos)} · Diferencia saldo final: {mostrarMonto(diferencia)}.</p>
          <p className="mt-1">Egresos sin clasificar: {totalNoClasificados} · Sin conciliar: {pendientesConciliar} · Montos negativos: {montosNegativos} · Tipos desconocidos: {tiposDesconocidos}.</p>
          <p className="mt-1">Vínculos con gastos sin validar: {vinculosGastosSinValidar} · Gastos cuyo campo monto difiere de total: {montosGastoDivergentes}. Los importes del reporte siempre provienen del movimiento bancario.</p>
          <p className="mt-1 font-semibold text-amber-800">Extracto bancario independiente: no cargado ni verificado por esta pantalla.</p>
        </section>

        <section className="print-section mt-6">
          <h3 className="mb-3 text-base font-black uppercase tracking-wide text-slate-900">1. Resumen general del mes</h3>

          <div className="print-summary-cards grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Balance inicial</p>
              <p className="mt-2 text-lg font-black text-slate-900">{mostrarMonto(balanceInicial)}</p>
            </div>

            <div className="print-compact-box rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
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

            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
              <p className="text-xs font-bold uppercase text-purple-700">Egresos por clasificar</p>
              <p className="mt-2 text-lg font-black text-purple-900">{formatMoney(totalSinClasificar)}</p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase text-blue-700">Balance final</p>
              <p className="mt-2 text-lg font-black text-blue-900">{mostrarMonto(balanceFinal)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200">
            <table className="print-table w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700">Balance inicial al 01/{periodoSeleccionado.slice(5, 7)}/{periodoSeleccionado.slice(0, 4)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{mostrarMonto(balanceInicial)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700">Total ingresos del mes</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatMoney(totalIngresosPeriodo)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700">Total gastos operativos registrados</td>
                  <td className="px-4 py-3 text-right font-bold text-red-700">{formatMoney(totalGastosOperativos)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700">Cargos / impuestos bancarios</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700">{formatMoney(totalCargosBancarios)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700">Otros egresos pendientes de clasificar</td>
                  <td className="px-4 py-3 text-right font-bold text-purple-800">{formatMoney(totalSinClasificar)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700">Total egresos del mes</td>
                  <td className="px-4 py-3 text-right font-bold">{formatMoney(totalEgresos)}</td>
                </tr>
                <tr className="bg-blue-900 text-white">
                  <td className="px-4 py-3 text-base font-black">Saldo de cierre del Control Bancario al {fechaCierreTexto}</td>
                  <td className="px-4 py-3 text-right text-base font-black">{mostrarMonto(balanceFinal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="print-section mt-6">
          <h3 className="mb-3 text-base font-black uppercase tracking-wide text-slate-900">2. Ingresos recibidos</h3>
          <div className="print-compact-box rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-bold text-emerald-900">Ingresos por mantenimiento y otros conceptos</p>
              <p className="text-xl font-black text-emerald-800">{formatMoney(totalIngresosPeriodo)}</p>
            </div>
              <p className="mt-2 text-xs text-emerald-800">Suma de ingresos registrados en banco_movimientos para la cuenta seleccionada y su fecha bancaria. No representa validación del CSV externo.</p>
          </div>
        </section>

        <section className="print-section mt-6">
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
                        {item.advertencia && (
                          <div className="mt-1 text-[10px] font-semibold text-amber-800">{item.advertencia}</div>
                        )}
                      </td>
                      <td className="px-3 py-3">{item.proveedor}</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{item.numeroDocumento}</td>
                      <td className="px-3 py-3 text-right font-bold text-red-700 whitespace-nowrap">{formatMoney(Math.abs(toNumber(item.monto)))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="print-section mt-6">
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
                      <td className="px-3 py-3 text-right font-bold text-amber-700 whitespace-nowrap">{formatMoney(Math.abs(toNumber(item.monto)))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="print-section mt-6">
          <h3 className="mb-3 text-base font-black uppercase tracking-wide text-slate-900">5. Egresos pendientes de clasificar · {formatMoney(totalSinClasificar)}</h3>
          {egresosPorClasificar.length === 0 ? (
            <p className="rounded-xl border p-3 text-xs text-slate-600">Sin egresos por clasificar.</p>
          ) : (
            <table className="print-table w-full border-collapse text-xs">
              <thead className="bg-purple-50"><tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-left">Documento</th>
                <th className="px-3 py-2 text-right">Monto</th>
              </tr></thead>
              <tbody>{egresosPorClasificar.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">{formatDate(fechaEfectiva(item))}</td>
                  <td className="px-3 py-2">{item.descripcion || item.origen || "Sin descripción"}</td>
                  <td className="px-3 py-2">{item.numero_documento || item.referencia_banco || "-"}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(Math.abs(toNumber(item.monto)))}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </section>

        <section className="print-section print-keep-together mt-6 rounded-2xl border-2 border-blue-900">
          <div className="print-cuadre-title bg-blue-900 px-4 py-3 text-white">
            <h3 className="text-base font-black uppercase tracking-wide">6. Cuadre y diferencias del mes</h3>
          </div>

          <table className="print-table w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-700">Balance inicial</td>
                <td className="px-4 py-3 text-right font-bold">{mostrarMonto(balanceInicial)}</td>
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
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-700">Menos egresos sin clasificar</td>
                <td className="px-4 py-3 text-right font-bold text-purple-800">{formatMoney(totalSinClasificar)}</td>
              </tr>
              <tr className="bg-slate-100">
                <td className="px-4 py-3 text-base font-black text-slate-900">Saldo declarado en cierre al {fechaCierreTexto}</td>
                <td className="px-4 py-3 text-right text-base font-black text-blue-900">{mostrarMonto(balanceFinal)}</td>
              </tr>
              <tr className="border-t bg-slate-50">
                <td className="px-4 py-3 font-bold">Saldo recalculado con los movimientos detallados</td>
                <td className="px-4 py-3 text-right font-bold">{mostrarMonto(balanceCalculado)}</td>
              </tr>
              <tr className={diferenciaImportante(diferencia) ? "bg-amber-50" : "bg-slate-50"}>
                <td className="px-4 py-3 font-bold">Diferencia saldo cierre - movimientos</td>
                <td className="px-4 py-3 text-right font-bold">{mostrarMonto(diferencia)}</td>
              </tr>
              <tr className={diferenciaImportante(diferenciaIngresos) ? "bg-amber-50" : ""}>
                <td className="px-4 py-3 font-semibold">Diferencia ingresos cierre - detalle</td>
                <td className="px-4 py-3 text-right font-bold">{mostrarMonto(diferenciaIngresos)}</td>
              </tr>
              <tr className={diferenciaImportante(diferenciaEgresos) ? "bg-amber-50" : ""}>
                <td className="px-4 py-3 font-semibold">Diferencia gastos cierre - detalle</td>
                <td className="px-4 py-3 text-right font-bold">{mostrarMonto(diferenciaEgresos)}</td>
              </tr>
              <tr className={diferenciaImportante(diferenciaFormulaCierre) ? "bg-amber-50" : ""}>
                <td className="px-4 py-3 font-semibold">Diferencia fórmula interna del cierre</td>
                <td className="px-4 py-3 text-right font-bold">{mostrarMonto(diferenciaFormulaCierre)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="print-note-signature print-section print-keep-together mt-6 grid gap-6 md:grid-cols-2">
          <div className="print-compact-box rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
            <p className="font-bold uppercase text-slate-900">Nota</p>
            <p className="mt-2">Este reporte muestra movimientos registrados en VAM para UNA cuenta y mes. Estado de revisión: {estadoRevision}; {pendientesConciliar} movimientos pendientes de conciliación. Las diferencias se presentan, no se corrigen automáticamente. No sustituye ni certifica el estado de cuenta emitido por el banco: el extracto externo debe contrastarse por administración antes de declarar conciliación bancaria definitiva.</p>
            <p className="mt-2 font-bold">Resumen financiero para propietarios · V1.2 · Impresión/PDF</p>
          </div>

          <div className="print-compact-box rounded-2xl border border-slate-200 p-4 text-center">
            <div className="print-signature-line mt-10 border-t border-slate-400 pt-3">
              <p className="font-bold text-slate-900">VAM Administradora de Condominios</p>
              <p className="text-xs text-slate-500">Administración</p>
            </div>
          </div>
        </section>
      </main>}
    </div>
  );
}
