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

/** Rango legible del mes seleccionado; respeta febrero y años bisiestos. */
function periodoCompletoTexto(periodo: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(periodo);
  if (!match) return nombrePeriodo(periodo);
  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const nombreMes = new Intl.DateTimeFormat("es-DO", { month: "long" })
    .format(new Date(anio, mes - 1, 1)).toLowerCase();
  return `del 01 al ${String(ultimoDia).padStart(2, "0")} de ${nombreMes} del ${anio}`;
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


function conceptoParaPropietario(value: string): string {
  return limpiarTexto(value, "Gasto del condominio")
    .replace(/^pago solicitud\s*(?:no\.?\s*\d+)?\s*[-:]\s*/i, "")
    .replace(/n[oó]mina\s+n[oó]mina/gi, "Nómina")
    .replace(/admininstracion/gi, "Administración")
    .replace(/\s+/g, " ")
    .trim();
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
        // Mostrar únicamente un número de cheque real; referencia_banco no es cheque.
        // El gasto se consulta solo cuando coincide con importe y documento.
        const documentoMovimiento = limpiarTexto(m.numero_documento, "");
        const documentoGasto = limpiarTexto(gasto?.numero_cheque, "");
        const chequeCandidato = documentoMovimiento || documentoGasto;
        const numeroDocumento = /^\d{1,12}$/.test(chequeCandidato)
          ? chequeCandidato
          : "—";

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
    // No emitir un informe final si falta el cierre o hay discrepancias financieras.
    if (loading || consultando || error || !cuenta || !cierre || hayDiferencias ||
        balanceInicial === null || balanceFinal === null) return;
    window.print();
  }

  function recargar() {
    if (perfil?.condominio_id && cuenta?.id) {
      consultarPeriodo(periodoSeleccionado, perfil.condominio_id, cuenta.id);
    }
  }

  const condominioNombre = condominio?.nombre || perfil?.condominio || "Condominio";
  const numeroCuenta = (cuenta?.numero_cuenta || "").replace(/\D/g, "");
  const cuentaTexto = cuenta
    ? `${cuenta.nombre_banco || "Banco"}${numeroCuenta ? ` · terminación ${numeroCuenta.slice(-4)}` : ""}`
    : "Cuenta no seleccionada";
  const fechaCorte = formatDate(rangoPeriodo(periodoSeleccionado).cierre);
  const fechaEmision = formatDate(new Date());
  const listoParaPublicar = Boolean(cierre && cuenta && !hayDiferencias &&
    balanceInicial !== null && balanceFinal !== null);
  const gastosPresentacion = [...detalleGastos].sort((a, b) => {
    const ordenFecha = (texto: string) => texto.split("/").reverse().join("-");
    return ordenFecha(a.fecha).localeCompare(ordenFecha(b.fecha)) ||
      compararNumeroDocumento(a.numeroDocumento, b.numeroDocumento);
  });

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-6 text-slate-700">Cargando informe financiero...</div>;
  }

  return (
    <div id="vam-informe-propietarios-v18" className="min-h-screen min-w-0 max-w-full overflow-x-hidden bg-slate-100 px-2 py-3 sm:px-3 sm:py-5 print:min-h-0 print:bg-white print:p-0">
      <style jsx global>{`
        @page { size: letter portrait; margin: 0.43in; }
        @media screen and (max-width: 767px) {
          #vam-informe-propietarios-v18 { max-width: 100vw; overflow-x: clip; }
          #vam-informe-propietarios-v18 .print-paper { overflow-wrap: anywhere; }
          #vam-informe-propietarios-v18 .mini-card { padding: 9px 7px; }
          #vam-informe-propietarios-v18 .mini-card p:last-child { letter-spacing: -0.35px; }
          #vam-informe-propietarios-v18 .report-head { flex-wrap: wrap; }
          #vam-informe-propietarios-v18 .report-head img { max-width: 76px; }
        }

        @media print {
          html, body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          #vam-informe-propietarios-v18, #vam-informe-propietarios-v18 * { visibility: visible !important; }
          #vam-informe-propietarios-v18 { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }
          #vam-informe-propietarios-v18 .no-print { display: none !important; visibility: hidden !important; }
          #vam-informe-propietarios-v18 .print-paper { width: 100% !important; max-width: none !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          #vam-informe-propietarios-v18 .report-head { padding-bottom: 12px !important; }
          #vam-informe-propietarios-v18 .mini-card { padding: 10px 8px !important; }
          #vam-informe-propietarios-v18 .mini-card p:last-child { font-size: 12px !important; }
          #vam-informe-propietarios-v18 .report-table { font-size: 9.5px !important; line-height: 1.23 !important; }
          #vam-informe-propietarios-v18 .report-table th, #vam-informe-propietarios-v18 .report-table td { padding: 5px 5px !important; }
          #vam-informe-propietarios-v18 .report-table thead { display: table-header-group !important; }
          #vam-informe-propietarios-v18 .report-table tr { break-inside: avoid !important; page-break-inside: avoid !important; }
          #vam-informe-propietarios-v18 .report-footer { margin-top: 13px !important; padding-top: 9px !important; }
          #vam-informe-propietarios-v18 .report-block { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex w-full min-w-0 max-w-4xl flex-col items-stretch gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:p-4">
        <div>
          <p className="text-lg font-bold text-slate-900">Informe financiero · Propietarios</p>
          <p className="text-xs text-slate-500">V1.8 · Versión ejecutiva lista para impresión y PDF</p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-end">
          <label className="text-xs font-semibold text-slate-600">Cuenta
            <select value={cuenta?.id || ""}
              onChange={(e) => setCuenta(cuentasDisponibles.find((item) => item.id === Number(e.target.value)) || null)}
              className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-3 text-sm sm:max-w-52">
              {cuentasDisponibles.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre_banco || "Banco"} · {String(item.numero_cuenta || "").slice(-4)}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Mes
            <select value={periodoSeleccionado} onChange={(e) => setPeriodoSeleccionado(e.target.value)}
              className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-3 text-sm">
              {periodosDisponibles.map((p) => <option key={p} value={p}>{nombrePeriodo(p)}</option>)}
            </select>
          </label>
          <button type="button" onClick={recargar} disabled={consultando}
            className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
            {consultando ? "Actualizando…" : "Actualizar"}
          </button>
          <button type="button" onClick={imprimirReporte}
            disabled={!listoParaPublicar || consultando || Boolean(error)}
            className="min-h-11 rounded-lg bg-blue-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {error && <div className="no-print mx-auto mb-3 max-w-4xl rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {consultando && <div className="no-print mx-auto mb-3 max-w-4xl rounded-lg bg-blue-50 p-3 text-sm text-blue-800">Actualizando el período. Espere para imprimir.</div>}
      {!consultando && !error && !listoParaPublicar && (
        <div className="no-print mx-auto max-w-4xl rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          Este período necesita revisión administrativa antes de emitir un informe para propietarios: falta el cierre de esta cuenta o existen diferencias en los registros. No se muestran saldos como definitivos ni se habilita el PDF.
        </div>
      )}

      {!consultando && !error && listoParaPublicar && (
        <main className="print-paper mx-auto w-full min-w-0 max-w-4xl rounded-xl border border-slate-200 bg-white px-3 py-5 shadow-sm sm:rounded-2xl sm:px-8 sm:py-7">
          <header className="report-head flex min-w-0 items-start justify-between gap-2 border-b-2 border-blue-900 pb-4 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-[19px] font-black leading-tight text-slate-950 sm:text-[22px]">{condominioNombre}</h1>
              <p className="mt-1 text-[13px] font-bold uppercase tracking-wide text-blue-900">Informe financiero mensual</p>
              <p className="mt-1 text-xs text-slate-500">Período: {periodoCompletoTexto(periodoSeleccionado)} · {cuentaTexto}</p>
            </div>
            {condominio?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={condominio.logo_url} alt="Logo del condominio" className="h-14 w-24 shrink-0 object-contain" />
            ) : null}
          </header>

          <section className="report-block mt-5 grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
            <div className="mini-card flex min-h-[96px] min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 shadow-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600">Saldo inicial</p>
              <p className="mt-2 whitespace-nowrap text-[clamp(18px,4.5vw,24px)] font-black leading-none tracking-tight tabular-nums text-slate-900">{mostrarMonto(balanceInicial)}</p>
            </div>
            <div className="mini-card flex min-h-[96px] min-w-0 flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 shadow-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">Ingresos del mes</p>
              <p className="mt-2 whitespace-nowrap text-[clamp(18px,4.5vw,24px)] font-black leading-none tracking-tight tabular-nums text-emerald-800">{formatMoney(totalIngresosPeriodo)}</p>
            </div>
            <div className="mini-card flex min-h-[96px] min-w-0 flex-col justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 shadow-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-rose-700">Egresos del mes</p>
              <p className="mt-2 whitespace-nowrap text-[clamp(18px,4.5vw,24px)] font-black leading-none tracking-tight tabular-nums text-rose-800">{formatMoney(totalEgresos)}</p>
            </div>
            <div className="mini-card flex min-h-[96px] min-w-0 flex-col justify-between rounded-xl border border-blue-900 bg-blue-950 px-3 py-3 shadow-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-blue-100">Saldo bancario</p>
              <p className="mt-2 whitespace-nowrap text-[clamp(18px,4.5vw,24px)] font-black leading-none tracking-tight tabular-nums text-white">{mostrarMonto(balanceFinal)}</p>
            </div>
          </section>

          <section className="report-block mt-5">
            <h2 className="mb-2 flex items-center justify-between text-[13px] font-extrabold text-slate-900">
              <span>¿EN QUÉ SE UTILIZARON LOS RECURSOS?</span>
              <span className="text-[11px] font-medium text-slate-500">Importes RD$</span>
            </h2>
          <div className="grid min-w-0 gap-2 md:hidden print:hidden" aria-label="Gastos del mes">
            {gastosPresentacion.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Sin gastos operativos para el período.</p>}
            {gastosPresentacion.map((gasto) => (
              <article key={`movil-${gasto.id}`} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-blue-900">{gasto.fecha.slice(0, 5)} · Cheque: {gasto.numeroDocumento}</p>
                    <p className="mt-1 break-words text-sm font-semibold leading-snug text-slate-900">{conceptoParaPropietario(gasto.concepto)}</p>
                    {gasto.proveedor && gasto.proveedor !== "-" && !/no consignado|proveedor \/ beneficiario/i.test(gasto.proveedor) && (
                      <p className="mt-1 break-words text-xs text-slate-600">{gasto.proveedor}</p>
                    )}
                  </div>
                  <p className="shrink-0 whitespace-nowrap text-right text-xs font-bold tabular-nums text-slate-950">{formatMoney(gasto.monto)}</p>
                </div>
              </article>
            ))}
            {totalCargosBancarios > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold">
                <span>Comisiones e impuestos bancarios</span>
                <span className="shrink-0 tabular-nums">{formatMoney(totalCargosBancarios)}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-950 p-3 text-sm font-extrabold text-white">
              <span>Total egresos</span><span className="shrink-0 tabular-nums">{formatMoney(totalEgresos)}</span>
            </div>
          </div>
            <div className="hidden overflow-hidden rounded-lg border border-slate-200 md:block print:block">
              <table className="report-table w-full table-fixed text-left text-[11px]">
                <colgroup><col style={{ width: "12%" }}/><col style={{ width: "12%" }}/><col style={{ width: "55%" }}/><col style={{ width: "21%" }}/></colgroup>
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Cheque</th>
                    <th className="px-3 py-2">Concepto / proveedor</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosPresentacion.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-500">Sin gastos operativos para el período.</td></tr>
                  )}
                  {gastosPresentacion.map((gasto) => (
                    <tr key={gasto.id} className="border-t border-slate-100 align-top">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{gasto.fecha.slice(0, 5)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums text-slate-700">{gasto.numeroDocumento}</td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-850">{conceptoParaPropietario(gasto.concepto)}</p>
                        {gasto.proveedor && gasto.proveedor !== "-" && !/no consignado|proveedor \/ beneficiario/i.test(gasto.proveedor) && (
                          <p className="text-[10px] text-slate-500">{gasto.proveedor}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{formatMoney(gasto.monto)}</td>
                    </tr>
                  ))}
                  {totalCargosBancarios > 0 && (
                    <tr className="border-t border-slate-200">
                      <td className="px-3 py-2 text-slate-600">—</td>
                      <td className="px-3 py-2 text-slate-600">—</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">Comisiones e impuestos bancarios</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{formatMoney(totalCargosBancarios)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-blue-900 bg-blue-50">
                    <td colSpan={3} className="px-3 py-2 font-black text-blue-950">TOTAL EGRESOS</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-black tabular-nums text-blue-950">{formatMoney(totalEgresos)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <footer className="report-footer mt-5 flex min-w-0 flex-wrap items-end justify-between gap-3 border-t border-slate-200 pt-3 text-[10px] leading-relaxed text-slate-500">
            <div className="min-w-0 flex-1 break-words">
              <p>Datos de ingresos, egresos y saldos registrados al {fechaCorte}.</p>
              <p className="mt-1">Emitido el {fechaEmision} · Elaborado por VAM Administradora de Condominios</p>
            </div>
            <p className="whitespace-nowrap text-right text-[9px] font-semibold text-slate-500">Informe financiero · V1.8</p>
          </footer>
        </main>
      )}
    </div>
  );
}
