"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Landmark,
  Loader2,
  RefreshCw,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
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
};

type GastoRelacionado = {
  id: number;
  proveedor?: string | null;
  concepto?: string | null;
  descripcion?: string | null;
  detalle_gasto?: string | null;
  no_factura?: string | null;
  ncf?: string | null;
  numero_cheque?: string | null;
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
  referencia_banco?: string | null;
  numero_documento?: string | null;
  beneficiario?: string | null;
  fecha_banco?: string | null;
  estado_banco?: string | null;
};

type DetalleGasto = {
  id: string;
  fecha: string;
  concepto: string;
  proveedor: string;
  documento: string;
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

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const limpio = String(value)
    .replace("RD$", "")
    .replace("$", "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();

  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : 0;
}

function formatMoney(value: unknown) {
  return moneda.format(toNumber(value));
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const fecha = new Date(String(value));
  if (Number.isNaN(fecha.getTime())) return String(value).slice(0, 10);

  return fecha.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizarTexto(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function limpiarTexto(value: unknown, fallback = "-") {
  const texto = String(value ?? "").trim();
  return texto || fallback;
}

function periodoActual() {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

function nombrePeriodo(periodo: string) {
  if (!periodo?.includes("-")) return periodo;
  const [anio, mes] = periodo.split("-");
  const fecha = new Date(Number(anio), Number(mes) - 1, 1);
  const nombreMes = fecha.toLocaleDateString("es-DO", { month: "long" });
  return `${nombreMes.charAt(0).toUpperCase()}${nombreMes.slice(1)} ${anio}`;
}

function rangoPeriodo(periodo: string) {
  const [anioRaw, mesRaw] = periodo.split("-");
  const anio = Number(anioRaw);
  const mes = Number(mesRaw);

  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const siguiente = new Date(anio, mes, 1);
  const hasta = `${siguiente.getFullYear()}-${String(siguiente.getMonth() + 1).padStart(2, "0")}-01`;
  const ultimoDia = new Date(anio, mes, 0);
  const cierre = `${ultimoDia.getFullYear()}-${String(ultimoDia.getMonth() + 1).padStart(2, "0")}-${String(ultimoDia.getDate()).padStart(2, "0")}`;

  return { desde, hasta, cierre };
}

function generarPeriodos(cantidad = 24) {
  const hoy = new Date();
  return Array.from({ length: cantidad }, (_, indice) => {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - indice, 1);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
  });
}

function tipoMovimiento(row: MovimientoBanco) {
  return normalizarTexto(row.tipo_movimiento).toUpperCase();
}

function esMovimientoActivo(row: MovimientoBanco) {
  return normalizarTexto(row.estado_banco).toUpperCase() !== "ANULADO";
}

function perteneceAlPeriodo(row: MovimientoBanco, periodo: string) {
  if (String(row.periodo || "").slice(0, 7) === periodo) return true;
  return String(row.fecha_movimiento || row.fecha_banco || "").slice(0, 7) === periodo;
}

function esCargoBanco(row: MovimientoBanco) {
  const texto = normalizarTexto(
    [
      row.origen,
      row.descripcion,
      row.beneficiario,
      row.numero_documento,
      row.referencia_banco,
    ].join(" ")
  );

  return (
    !row.referencia_id ||
    texto.includes("impuesto") ||
    texto.includes("cargo bancario") ||
    texto.includes("cargos bancarios") ||
    texto.includes("comision") ||
    texto.includes("ajuste bancario") ||
    texto.includes("ajuste_bancario") ||
    texto.includes("itbis banco")
  );
}

export default function ResumenFinancieroMovilPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(null);
  const [condominio, setCondominio] = useState<CondominioInfo | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancaria | null>(null);
  const [periodos, setPeriodos] = useState<CierreBancario[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(periodoActual());

  const [cierre, setCierre] = useState<CierreBancario | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoBanco[]>([]);
  const [gastosRelacionados, setGastosRelacionados] = useState<
    Map<number, GastoRelacionado>
  >(new Map());

  const [loading, setLoading] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (propietario?.condominio_id && cuenta?.id && periodoSeleccionado) {
      void consultarPeriodo(
        periodoSeleccionado,
        propietario.condominio_id,
        cuenta.id
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoSeleccionado, propietario?.condominio_id, cuenta?.id]);

  const periodosDisponibles = useMemo(() => {
    const existentes = periodos.map((item) => item.periodo).filter(Boolean);
    return Array.from(new Set([...existentes, ...generarPeriodos()])).sort(
      (a, b) => b.localeCompare(a)
    );
  }, [periodos]);

  const ingresos = useMemo(
    () => movimientos.filter((item) => tipoMovimiento(item) === "INGRESO"),
    [movimientos]
  );

  const egresos = useMemo(
    () => movimientos.filter((item) => tipoMovimiento(item) === "EGRESO"),
    [movimientos]
  );

  const gastosOperativos = useMemo(
    () => egresos.filter((item) => !esCargoBanco(item)),
    [egresos]
  );

  const cargosBancarios = useMemo(
    () => egresos.filter((item) => esCargoBanco(item)),
    [egresos]
  );

  const detalleGastos = useMemo<DetalleGasto[]>(() => {
    return gastosOperativos.map((movimiento) => {
      const gasto = movimiento.referencia_id
        ? gastosRelacionados.get(Number(movimiento.referencia_id))
        : null;

      return {
        id: `gasto-${movimiento.id}`,
        fecha: formatDate(movimiento.fecha_movimiento || movimiento.fecha_banco),
        concepto: limpiarTexto(
          gasto?.concepto ||
            gasto?.descripcion ||
            gasto?.detalle_gasto ||
            movimiento.descripcion,
          "Gasto operativo"
        ),
        proveedor: limpiarTexto(
          gasto?.proveedor || movimiento.beneficiario,
          "Proveedor / beneficiario"
        ),
        documento: limpiarTexto(
          gasto?.numero_cheque ||
            movimiento.numero_documento ||
            movimiento.referencia_banco
        ),
        factura: limpiarTexto(gasto?.no_factura),
        ncf: limpiarTexto(gasto?.ncf),
        monto: toNumber(movimiento.monto),
      };
    });
  }, [gastosOperativos, gastosRelacionados]);

  const detalleCargos = useMemo<CargoBanco[]>(() => {
    return cargosBancarios.map((movimiento) => ({
      id: `cargo-${movimiento.id}`,
      fecha: formatDate(movimiento.fecha_movimiento || movimiento.fecha_banco),
      concepto: limpiarTexto(
        movimiento.descripcion || movimiento.origen,
        "Cargo / impuesto bancario"
      ),
      referencia: limpiarTexto(
        movimiento.numero_documento || movimiento.referencia_banco
      ),
      monto: toNumber(movimiento.monto),
    }));
  }, [cargosBancarios]);

  const totalIngresosDetalle = ingresos.reduce(
    (total, item) => total + toNumber(item.monto),
    0
  );
  const totalGastosOperativos = detalleGastos.reduce(
    (total, item) => total + item.monto,
    0
  );
  const totalCargosBancarios = detalleCargos.reduce(
    (total, item) => total + item.monto,
    0
  );
  const totalEgresosDetalle =
    totalGastosOperativos + totalCargosBancarios;

  const balanceInicial = toNumber(cierre?.balance_inicial);
  const totalIngresos =
    toNumber(cierre?.total_ingresos) > 0 || totalIngresosDetalle === 0
      ? toNumber(cierre?.total_ingresos)
      : totalIngresosDetalle;
  const totalGastos =
    toNumber(cierre?.total_gastos) > 0 || totalEgresosDetalle === 0
      ? toNumber(cierre?.total_gastos)
      : totalEgresosDetalle;
  const balanceFinal =
    toNumber(cierre?.balance_final) !== 0
      ? toNumber(cierre?.balance_final)
      : balanceInicial + totalIngresos - totalGastos;

  async function inicializar() {
    setLoading(true);
    setError("");

    try {
      const raw = localStorage.getItem("propietario_actual");

      if (!raw) {
        router.replace("/movil/propietarios/login");
        return;
      }

      const sesion = JSON.parse(raw) as PropietarioActual;

      if (!sesion?.condominio_id || !sesion?.unidad_id) {
        router.replace("/movil/propietarios/login");
        return;
      }

      setPropietario(sesion);

      const [condominioData, cuentaData, cierresData] = await Promise.all([
        supabase
          .from("condominios")
          .select("id, nombre, logo_url")
          .eq("id", sesion.condominio_id)
          .maybeSingle(),
        supabase
          .from("cuentas_bancarias")
          .select(
            "id, condominio_id, nombre_banco, numero_cuenta, tipo_cuenta, moneda, activa"
          )
          .eq("condominio_id", sesion.condominio_id)
          .eq("activa", true)
          .order("id", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("banco_cierres_mensuales")
          .select("*")
          .eq("condominio_id", sesion.condominio_id)
          .order("periodo", { ascending: false }),
      ]);

      if (condominioData.error) throw condominioData.error;
      if (cuentaData.error) throw cuentaData.error;

      setCondominio(
        (condominioData.data as CondominioInfo | null) || {
          id: sesion.condominio_id,
          nombre: sesion.condominio_nombre,
          logo_url: sesion.condominio_logo_url,
        }
      );
      setCuenta((cuentaData.data as CuentaBancaria | null) || null);
      setPeriodos((cierresData.data || []) as CierreBancario[]);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el resumen financiero.");
    } finally {
      setLoading(false);
    }
  }

  async function consultarPeriodo(
    periodo: string,
    condominioId: number,
    cuentaBancariaId: number
  ) {
    setConsultando(true);
    setError("");

    try {
      const [cierreData, movimientosData] = await Promise.all([
        buscarCierre(periodo, condominioId, cuentaBancariaId),
        cargarMovimientos(periodo, condominioId, cuentaBancariaId),
      ]);

      setCierre(cierreData);
      setMovimientos(movimientosData);
      await cargarGastosRelacionados(movimientosData);
    } catch (err: any) {
      setError(err?.message || "No se pudo consultar el periodo.");
    } finally {
      setConsultando(false);
    }
  }

  async function buscarCierre(
    periodo: string,
    condominioId: number,
    cuentaBancariaId: number
  ): Promise<CierreBancario | null> {
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

    if (error) throw error;
    if (data) return data as CierreBancario;

    const balanceAnterior = await buscarBalanceAnterior(
      periodo,
      condominioId,
      cuentaBancariaId
    );

    return {
      condominio_id: condominioId,
      cuenta_bancaria_id: cuentaBancariaId,
      periodo,
      balance_inicial: balanceAnterior,
      total_ingresos: 0,
      total_gastos: 0,
      balance_final: balanceAnterior,
      estado: "SIN_CIERRE",
    };
  }

  async function buscarBalanceAnterior(
    periodo: string,
    condominioId: number,
    cuentaBancariaId: number
  ) {
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
      const { data, error } = await query
        .order("fecha_movimiento", { ascending: true })
        .order("id", { ascending: true })
        .limit(5000);

      if (error) return;

      (data || []).forEach((row: MovimientoBanco) => {
        const key = String(row.id);
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

    return resultados.filter(
      (row) => esMovimientoActivo(row) && perteneceAlPeriodo(row, periodo)
    );
  }

  async function cargarGastosRelacionados(
    movimientosData: MovimientoBanco[]
  ) {
    const ids = Array.from(
      new Set(
        movimientosData
          .filter((item) => tipoMovimiento(item) === "EGRESO")
          .map((item) => Number(item.referencia_id || 0))
          .filter((id) => id > 0)
      )
    );

    if (!ids.length) {
      setGastosRelacionados(new Map());
      return;
    }

    const { data, error } = await supabase
      .from("gastos")
      .select(
        "id, proveedor, concepto, descripcion, detalle_gasto, no_factura, ncf, numero_cheque"
      )
      .in("id", ids);

    if (error) {
      setGastosRelacionados(new Map());
      return;
    }

    const mapa = new Map<number, GastoRelacionado>();
    (data || []).forEach((row) => mapa.set(Number(row.id), row));
    setGastosRelacionados(mapa);
  }

  if (loading) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 className="animate-spin text-blue-700" size={20} />
            Cargando resumen financiero...
          </div>
        </div>
      </main>
    );
  }

  if (!propietario) return null;

  const estadoPeriodo = String(cierre?.estado || "SIN_CIERRE").toUpperCase();
  const condominioNombre =
    condominio?.nombre || propietario.condominio_nombre || "Condominio";
  const cuentaTexto = cuenta
    ? `${cuenta.nombre_banco || "Banco"} · ${cuenta.numero_cuenta || "Sin número"}`
    : "Cuenta bancaria no identificada";
  const fechaCierre = formatDate(rangoPeriodo(periodoSeleccionado).cierre);

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-7 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Volver"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200">
                VAM Propietarios
              </p>
              <h1 className="truncate text-base font-black">
                Resumen financiero
              </h1>
            </div>

            <button
              type="button"
              onClick={() =>
                cuenta?.id &&
                consultarPeriodo(
                  periodoSeleccionado,
                  propietario.condominio_id,
                  cuenta.id
                )
              }
              disabled={consultando || !cuenta?.id}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 disabled:opacity-50"
              aria-label="Actualizar"
            >
              <RefreshCw
                size={18}
                className={consultando ? "animate-spin" : ""}
              />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3">
            {condominio?.logo_url || propietario.condominio_logo_url ? (
              <img
                src={condominio?.logo_url || propietario.condominio_logo_url}
                alt={condominioNombre}
                className="h-12 w-12 rounded-2xl bg-white object-contain p-1.5"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-black text-blue-900">
                VAM
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">
                {condominioNombre}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-blue-100">
                <Building2 size={13} />
                Unidad {propietario.no_apartamento}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-xs font-bold text-slate-600">
            Periodo
          </label>

          <div className="relative mt-1">
            <CalendarDays
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-700"
            />
            <select
              value={periodoSeleccionado}
              onChange={(event) =>
                setPeriodoSeleccionado(event.target.value)
              }
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {periodosDisponibles.map((periodo) => (
                <option key={periodo} value={periodo}>
                  {nombrePeriodo(periodo)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={17}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl bg-slate-50 p-2.5">
              <p className="text-slate-400">Cuenta</p>
              <p className="mt-0.5 line-clamp-2 font-bold text-slate-700">
                {cuentaTexto}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5">
              <p className="text-slate-400">Estado</p>
              <p className="mt-0.5 font-bold text-slate-700">
                {estadoPeriodo === "SIN_CIERRE" ? "Sin cierre" : estadoPeriodo}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
            {error}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-[1.4rem] bg-gradient-to-br from-blue-800 to-blue-950 p-4 text-white shadow-lg shadow-blue-900/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-200">
                  Balance final
                </p>
                <p className="mt-1 text-2xl font-black">
                  {formatMoney(balanceFinal)}
                </p>
                <p className="mt-1 text-[11px] text-blue-100">
                  Balance al {fechaCierre}
                </p>
              </div>
              <WalletCards size={28} className="text-blue-100" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Landmark size={18} />
              </span>
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase text-slate-400">
              Balance inicial
            </p>
            <p className="mt-1 text-base font-black text-slate-900">
              {formatMoney(balanceInicial)}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700">
              <TrendingUp size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-emerald-700">
              Ingresos
            </p>
            <p className="mt-1 text-base font-black text-emerald-800">
              {formatMoney(totalIngresos)}
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-red-700">
              <TrendingDown size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-red-700">
              Gastos
            </p>
            <p className="mt-1 text-base font-black text-red-800">
              {formatMoney(totalGastosOperativos)}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-700">
              <CircleDollarSign size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-amber-700">
              Cargos bancarios
            </p>
            <p className="mt-1 text-base font-black text-amber-800">
              {formatMoney(totalCargosBancarios)}
            </p>
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Gastos operativos
              </h2>
              <p className="text-[11px] text-slate-500">
                {detalleGastos.length} movimiento(s)
              </p>
            </div>
            <p className="text-sm font-black text-red-700">
              {formatMoney(totalGastosOperativos)}
            </p>
          </div>

          <div className="space-y-2.5">
            {detalleGastos.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                No hay gastos registrados para este periodo.
              </div>
            ) : (
              detalleGastos.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-400">
                        {item.fecha}
                      </p>
                      <h3 className="mt-0.5 text-xs font-extrabold leading-5 text-slate-900">
                        {item.concepto}
                      </h3>
                      <p className="mt-1 text-[11px] text-slate-600">
                        {item.proveedor}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-red-700">
                      {formatMoney(item.monto)}
                    </p>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      Doc.: {item.documento}
                    </div>
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      Factura: {item.factura}
                    </div>
                    {item.ncf !== "-" && (
                      <div className="col-span-2 rounded-lg bg-white px-2 py-1.5">
                        NCF: {item.ncf}
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Cargos e impuestos
              </h2>
              <p className="text-[11px] text-slate-500">
                {detalleCargos.length} movimiento(s)
              </p>
            </div>
            <p className="text-sm font-black text-amber-700">
              {formatMoney(totalCargosBancarios)}
            </p>
          </div>

          <div className="space-y-2.5">
            {detalleCargos.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                No hay cargos bancarios para este periodo.
              </div>
            ) : (
              detalleCargos.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-amber-100 bg-amber-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-amber-600">
                        {item.fecha}
                      </p>
                      <h3 className="mt-0.5 text-xs font-extrabold leading-5 text-slate-900">
                        {item.concepto}
                      </h3>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Ref.: {item.referencia}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-amber-700">
                      {formatMoney(item.monto)}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-800">
              <ReceiptText size={20} />
            </span>
            <div>
              <h2 className="text-sm font-black text-blue-950">
                Cuadre del periodo
              </h2>
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-blue-700">Balance inicial</span>
                  <strong>{formatMoney(balanceInicial)}</strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-blue-700">Más ingresos</span>
                  <strong>{formatMoney(totalIngresos)}</strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-blue-700">Menos gastos y cargos</span>
                  <strong>
                    {formatMoney(
                      totalGastosOperativos + totalCargosBancarios
                    )}
                  </strong>
                </div>
                <div className="mt-2 flex justify-between gap-3 border-t border-blue-200 pt-2 text-sm">
                  <span className="font-black text-blue-950">
                    Balance final
                  </span>
                  <strong className="text-blue-950">
                    {formatMoney(balanceFinal)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <p className="px-2 text-center text-[10px] leading-4 text-slate-400">
          Este reporte resume los movimientos bancarios del condominio para el
          periodo seleccionado.
        </p>
      </div>
    </main>
  );
}
