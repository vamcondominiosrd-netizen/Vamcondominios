"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  Landmark,
  Loader2,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type SesionDirectiva = {
  usuario_id?: string;
  usuario_nombre?: string;
  rol?: string;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string | null;
};

type CuentaBancaria = {
  id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
};

type CierreMensual = {
  id: number;
  periodo: string;
  balance_inicial: number | string | null;
  total_ingresos: number | string | null;
  total_gastos: number | string | null;
  balance_final: number | string | null;
  estado: string | null;
};

type MovimientoBanco = {
  id: number;
  periodo: string | null;
  fecha_movimiento: string | null;
  fecha_banco?: string | null;
  tipo_movimiento: string | null;
  monto: number | string | null;
  descripcion?: string | null;
  beneficiario?: string | null;
  numero_documento?: string | null;
  referencia_banco?: string | null;
  estado_banco?: string | null;
};

type Gasto = {
  id: number;
  fecha: string | null;
  categoria: string | null;
  concepto: string | null;
  descripcion: string | null;
  detalle_gasto: string | null;
  proveedor?: string | null;
  monto: number | string | null;
  total?: number | string | null;
  no_factura?: string | null;
  numero_cheque?: string | null;
  factura_url?: string | null;
  cheque_url?: string | null;
  estado?: string | null;
};

type ResumenMes = {
  periodo: string;
  ingresos: number;
  gastos: number;
  resultado: number;
  balanceInicial: number;
  balanceFinal: number;
  estado: string;
  cerrado: boolean;
};

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

function numero(valor: unknown) {
  const n = Number(String(valor ?? 0).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function dinero(valor: unknown) {
  return moneda.format(numero(valor));
}

function normalizar(valor: unknown) {
  return String(valor || "").trim().toUpperCase();
}

function periodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function nombrePeriodo(periodo: string) {
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) return "Sin período";
  const [anio, mes] = periodo.split("-").map(Number);

  return new Date(anio, mes - 1, 1).toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });
}

function nombreMes(periodo: string) {
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) return periodo;
  const [anio, mes] = periodo.split("-").map(Number);

  return new Date(anio, mes - 1, 1)
    .toLocaleDateString("es-DO", { month: "short" })
    .replace(".", "")
    .replace(/^./, (letra) => letra.toUpperCase());
}

function fechaCorta(fecha?: string | null) {
  if (!fecha) return "-";

  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function rangoPeriodo(periodo: string) {
  const [anio, mes] = periodo.split("-").map(Number);
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const siguiente = new Date(anio, mes, 1);
  const fin = `${siguiente.getFullYear()}-${String(
    siguiente.getMonth() + 1
  ).padStart(2, "0")}-01`;

  return { inicio, fin };
}

function leerSesionDirectiva(): SesionDirectiva | null {
  const raw = localStorage.getItem("directiva_actual");

  if (raw) {
    try {
      const sesion = JSON.parse(raw);
      const condominioId = Number(sesion?.condominio_id || 0);

      if (condominioId > 0) {
        return {
          ...sesion,
          condominio_id: condominioId,
          condominio_nombre:
            sesion?.condominio_nombre ||
            localStorage.getItem("condominio_nombre") ||
            "Condominio",
        };
      }
    } catch {
      // Continúa con las claves de compatibilidad.
    }
  }

  const condominioId = Number(localStorage.getItem("condominio_id") || 0);
  if (condominioId <= 0) return null;

  return {
    usuario_nombre:
      localStorage.getItem("usuario_nombre") || "Miembro de la directiva",
    rol: localStorage.getItem("usuario_rol") || "USER_VIEW",
    condominio_id: condominioId,
    condominio_nombre:
      localStorage.getItem("condominio_nombre") || "Condominio",
    condominio_logo_url: localStorage.getItem("condominio_logo_url"),
  };
}

export default function FinanzasDirectivaPage() {
  const router = useRouter();

  const [sesion, setSesion] = useState<SesionDirectiva | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancaria | null>(null);
  const [cierres, setCierres] = useState<CierreMensual[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoBanco[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(periodoActual());
  const [detalleGasto, setDetalleGasto] = useState<Gasto | null>(null);

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const sesionActual = leerSesionDirectiva();

    if (!sesionActual) {
      router.replace("/movil");
      return;
    }

    setSesion(sesionActual);
    void cargarDatos(sesionActual.condominio_id, anio);
  }, [router, anio]);

  async function cargarDatos(condominioId: number, anioConsulta: number) {
    setLoading(true);
    setMensaje("");

    try {
      const desde = `${anioConsulta}-01-01`;
      const hasta = `${anioConsulta + 1}-01-01`;

      const [cuentaResp, cierresResp, movimientosResp, gastosResp] =
        await Promise.all([
          supabase
            .from("cuentas_bancarias")
            .select("id, nombre_banco, numero_cuenta")
            .eq("condominio_id", condominioId)
            .eq("activa", true)
            .order("id", { ascending: true })
            .limit(1)
            .maybeSingle(),

          supabase
            .from("banco_cierres_mensuales")
            .select(
              "id, periodo, balance_inicial, total_ingresos, total_gastos, balance_final, estado"
            )
            .eq("condominio_id", condominioId)
            .gte("periodo", `${anioConsulta}-01`)
            .lte("periodo", `${anioConsulta}-12`)
            .order("periodo", { ascending: true }),

          supabase
            .from("banco_movimientos")
            .select(
              "id, periodo, fecha_movimiento, fecha_banco, tipo_movimiento, monto, descripcion, beneficiario, numero_documento, referencia_banco, estado_banco"
            )
            .eq("condominio_id", condominioId)
            .gte("fecha_movimiento", desde)
            .lt("fecha_movimiento", hasta)
            .order("fecha_movimiento", { ascending: false })
            .limit(5000),

          supabase
            .from("gastos")
            .select(
              "id, fecha, categoria, concepto, descripcion, detalle_gasto, proveedor, monto, total, no_factura, numero_cheque, factura_url, cheque_url, estado"
            )
            .eq("condominio_id", condominioId)
            .gte("fecha", desde)
            .lt("fecha", hasta)
            .order("fecha", { ascending: false }),
        ]);

      if (cuentaResp.error) throw cuentaResp.error;
      if (cierresResp.error) throw cierresResp.error;
      if (movimientosResp.error) throw movimientosResp.error;
      if (gastosResp.error) throw gastosResp.error;

      setCuenta((cuentaResp.data as CuentaBancaria | null) || null);
      setCierres((cierresResp.data || []) as CierreMensual[]);
      setMovimientos((movimientosResp.data || []) as MovimientoBanco[]);
      setGastos((gastosResp.data || []) as Gasto[]);
    } catch (error: any) {
      console.error("Error cargando finanzas:", error);
      setMensaje(
        error?.message || "No se pudo cargar la información financiera."
      );
    } finally {
      setLoading(false);
    }
  }

  const movimientosValidos = useMemo(
    () =>
      movimientos.filter(
        (movimiento) => normalizar(movimiento.estado_banco) !== "ANULADO"
      ),
    [movimientos]
  );

  const resumenMeses = useMemo<ResumenMes[]>(() => {
    const cierresPorPeriodo = new Map(
      cierres.map((cierre) => [cierre.periodo, cierre])
    );

    const resultado: ResumenMes[] = [];

    for (let mes = 1; mes <= 12; mes += 1) {
      const periodo = `${anio}-${String(mes).padStart(2, "0")}`;
      const cierre = cierresPorPeriodo.get(periodo);

      const movimientosMes = movimientosValidos.filter((movimiento) => {
        const periodoMovimiento =
          movimiento.periodo ||
          String(
            movimiento.fecha_movimiento || movimiento.fecha_banco || ""
          ).slice(0, 7);

        return periodoMovimiento === periodo;
      });

      const ingresosMovimientos = movimientosMes
        .filter(
          (movimiento) => normalizar(movimiento.tipo_movimiento) === "INGRESO"
        )
        .reduce((total, movimiento) => total + numero(movimiento.monto), 0);

      const gastosMovimientos = movimientosMes
        .filter(
          (movimiento) => normalizar(movimiento.tipo_movimiento) === "EGRESO"
        )
        .reduce((total, movimiento) => total + numero(movimiento.monto), 0);

      const ingresos = cierre
        ? numero(cierre.total_ingresos)
        : ingresosMovimientos;
      const gastosMes = cierre ? numero(cierre.total_gastos) : gastosMovimientos;
      const cerrado = ["CERRADO", "CERRADA"].includes(
        normalizar(cierre?.estado)
      );

      resultado.push({
        periodo,
        ingresos,
        gastos: gastosMes,
        resultado: ingresos - gastosMes,
        balanceInicial: numero(cierre?.balance_inicial),
        balanceFinal: numero(cierre?.balance_final),
        estado: cierre?.estado || "ABIERTO",
        cerrado,
      });
    }

    return resultado;
  }, [anio, cierres, movimientosValidos]);

  const resumenAnual = useMemo(() => {
    return resumenMeses.reduce(
      (acumulado, mes) => {
        acumulado.ingresos += mes.ingresos;
        acumulado.gastos += mes.gastos;
        acumulado.resultado += mes.resultado;
        return acumulado;
      },
      { ingresos: 0, gastos: 0, resultado: 0 }
    );
  }, [resumenMeses]);

  const ultimoCierre = useMemo(
    () =>
      [...cierres]
        .reverse()
        .find((cierre) =>
          ["CERRADO", "CERRADA"].includes(normalizar(cierre.estado))
        ) || null,
    [cierres]
  );

  const fondoBancarioActual = useMemo(() => {
    const balanceCierre = numero(ultimoCierre?.balance_final);

    const posteriores = movimientosValidos.filter((movimiento) => {
      const periodoMovimiento =
        movimiento.periodo ||
        String(
          movimiento.fecha_movimiento || movimiento.fecha_banco || ""
        ).slice(0, 7);

      return !ultimoCierre || periodoMovimiento > ultimoCierre.periodo;
    });

    return posteriores.reduce((balance, movimiento) => {
      const monto = numero(movimiento.monto);

      if (normalizar(movimiento.tipo_movimiento) === "INGRESO") {
        return balance + monto;
      }

      if (normalizar(movimiento.tipo_movimiento) === "EGRESO") {
        return balance - monto;
      }

      return balance;
    }, balanceCierre);
  }, [ultimoCierre, movimientosValidos]);

  const mesSeleccionado = useMemo(
    () =>
      resumenMeses.find((mes) => mes.periodo === periodoSeleccionado) ||
      resumenMeses[0],
    [resumenMeses, periodoSeleccionado]
  );

  const gastosPeriodo = useMemo(() => {
    return gastos.filter(
      (gasto) => String(gasto.fecha || "").slice(0, 7) === periodoSeleccionado
    );
  }, [gastos, periodoSeleccionado]);

  const categoriasPeriodo = useMemo(() => {
    const mapa = new Map<string, number>();

    gastosPeriodo.forEach((gasto) => {
      const categoria =
        gasto.categoria ||
        gasto.concepto ||
        gasto.descripcion ||
        gasto.detalle_gasto ||
        "Otros gastos";

      mapa.set(
        categoria,
        (mapa.get(categoria) || 0) + numero(gasto.monto ?? gasto.total)
      );
    });

    return Array.from(mapa.entries())
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto);
  }, [gastosPeriodo]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[75vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
            <Loader2 className="animate-spin text-blue-800" size={21} />
            Cargando finanzas...
          </div>
        </div>
      </main>
    );
  }

  if (!sesion) return null;

  return (
    <main className="min-h-dvh bg-slate-100 pb-24">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-16 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/movil/directiva")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
              aria-label="Volver al dashboard"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-blue-100">
                {sesion.condominio_nombre}
              </p>
              <h1 className="text-xl font-black">Finanzas</h1>
              <p className="mt-0.5 text-[11px] text-blue-100">
                Ingresos, gastos, cierres y fondo bancario
              </p>
            </div>

            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Banknote size={22} />
            </span>
          </div>
        </div>
      </header>

      <div className="-mt-10 mx-auto max-w-lg space-y-4 px-4">
        {mensaje && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {mensaje}
          </div>
        )}

        <section className="overflow-hidden rounded-[1.6rem] bg-white shadow-xl shadow-slate-900/10">
          <div className="bg-gradient-to-br from-slate-950 to-blue-900 p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-200">
                  Fondo bancario actualizado
                </p>
                <h2 className="mt-1 text-3xl font-black">
                  {dinero(fondoBancarioActual)}
                </h2>
                <p className="mt-2 text-xs text-blue-100">
                  {cuenta
                    ? `${cuenta.nombre_banco || "Banco"} · ${
                        cuenta.numero_cuenta || "Cuenta activa"
                      }`
                    : "Cuenta bancaria activa"}
                </p>
              </div>

              <Landmark size={28} className="text-blue-200" />
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-100 p-4">
            <div className="pr-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Último cierre
              </p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {dinero(ultimoCierre?.balance_final)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {ultimoCierre
                  ? nombrePeriodo(ultimoCierre.periodo)
                  : "Sin cierres"}
              </p>
            </div>

            <div className="pl-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Variación posterior
              </p>
              <p
                className={`mt-1 text-sm font-black ${
                  fondoBancarioActual - numero(ultimoCierre?.balance_final) >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {dinero(
                  fondoBancarioActual - numero(ultimoCierre?.balance_final)
                )}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Después del último cierre
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Resumen anual
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-900">
                Ejercicio {anio}
              </h2>
            </div>

            <div className="relative">
              <select
                value={anio}
                onChange={(event) => {
                  const nuevoAnio = Number(event.target.value);
                  setAnio(nuevoAnio);
                  setPeriodoSeleccionado(`${nuevoAnio}-01`);
                }}
                className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm font-black text-slate-700"
              >
                {[anio - 2, anio - 1, anio, anio + 1].map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Indicador
              titulo="Ingresos"
              valor={dinero(resumenAnual.ingresos)}
              clase="bg-emerald-50 text-emerald-700"
              icono={<ArrowDownRight size={17} />}
            />
            <Indicador
              titulo="Gastos"
              valor={dinero(resumenAnual.gastos)}
              clase="bg-red-50 text-red-700"
              icono={<ArrowUpRight size={17} />}
            />
            <Indicador
              titulo={resumenAnual.resultado >= 0 ? "Superávit" : "Déficit"}
              valor={dinero(Math.abs(resumenAnual.resultado))}
              clase={
                resumenAnual.resultado >= 0
                  ? "bg-blue-50 text-blue-800"
                  : "bg-amber-50 text-amber-800"
              }
              icono={
                resumenAnual.resultado >= 0 ? (
                  <TrendingUp size={17} />
                ) : (
                  <TrendingDown size={17} />
                )
              }
            />
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Mes por mes
              </p>
              <h2 className="mt-1 font-black text-slate-900">
                Cómo va el año
              </h2>
            </div>
            <CalendarDays size={21} className="text-blue-800" />
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            {resumenMeses.map((mes, indice) => (
              <button
                type="button"
                key={mes.periodo}
                onClick={() => setPeriodoSeleccionado(mes.periodo)}
                className={`grid w-full grid-cols-[48px_1fr_auto] items-center gap-3 px-3 py-3 text-left ${
                  indice > 0 ? "border-t border-slate-100" : ""
                } ${
                  periodoSeleccionado === mes.periodo ? "bg-blue-50" : "bg-white"
                }`}
              >
                <span className="text-xs font-black text-slate-700">
                  {nombreMes(mes.periodo)}
                </span>

                <div>
                  <div className="flex gap-3 text-[10px] text-slate-500">
                    <span>Ing. {dinero(mes.ingresos)}</span>
                    <span>Gas. {dinero(mes.gastos)}</span>
                  </div>
                  <p
                    className={`mt-1 text-xs font-black ${
                      mes.resultado >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {mes.resultado >= 0 ? "Superávit" : "Déficit"}{" "}
                    {dinero(Math.abs(mes.resultado))}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[9px] uppercase text-slate-400">Cierre</p>
                  <p className="text-xs font-black text-slate-900">
                    {mes.cerrado ? dinero(mes.balanceFinal) : "Abierto"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {mesSeleccionado && (
          <>
            <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Período seleccionado
                  </p>
                  <h2 className="mt-1 text-lg font-black capitalize text-slate-900">
                    {nombrePeriodo(mesSeleccionado.periodo)}
                  </h2>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-black ${
                    mesSeleccionado.cerrado
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {mesSeleccionado.cerrado ? "CERRADO" : "ABIERTO"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Dato titulo="Ingresos" valor={dinero(mesSeleccionado.ingresos)} />
                <Dato titulo="Gastos" valor={dinero(mesSeleccionado.gastos)} />
                <Dato
                  titulo={mesSeleccionado.resultado >= 0 ? "Superávit" : "Déficit"}
                  valor={dinero(Math.abs(mesSeleccionado.resultado))}
                />
              </div>

              {mesSeleccionado.cerrado && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Dato
                    titulo="Balance inicial"
                    valor={dinero(mesSeleccionado.balanceInicial)}
                  />
                  <Dato
                    titulo="Balance final"
                    valor={dinero(mesSeleccionado.balanceFinal)}
                  />
                </div>
              )}
            </section>

            <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Distribución de gastos
                  </p>
                  <h2 className="mt-1 font-black text-slate-900">
                    ¿En qué se gastó?
                  </h2>
                </div>
                <ReceiptText size={21} className="text-blue-800" />
              </div>

              <div className="mt-4 space-y-3">
                {categoriasPeriodo.length > 0 ? (
                  categoriasPeriodo.map((categoria) => {
                    const maximo = categoriasPeriodo[0]?.monto || 1;
                    const porcentaje = Math.max(
                      6,
                      Math.min(100, (categoria.monto / maximo) * 100)
                    );

                    return (
                      <div key={categoria.nombre}>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="truncate font-bold text-slate-700">
                            {categoria.nombre}
                          </span>
                          <span className="shrink-0 font-black text-slate-900">
                            {dinero(categoria.monto)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-800"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                    No hay gastos registrados en este período.
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-black text-slate-800">
                  Detalle de gastos
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  {gastosPeriodo.length} registro
                  {gastosPeriodo.length === 1 ? "" : "s"}
                </span>
              </div>

              {gastosPeriodo.map((gasto) => (
                <button
                  type="button"
                  key={gasto.id}
                  onClick={() => setDetalleGasto(gasto)}
                  className="w-full rounded-[1.3rem] border border-slate-200 bg-white p-4 text-left shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                      <ReceiptText size={19} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">
                        {gasto.concepto ||
                          gasto.descripcion ||
                          gasto.detalle_gasto ||
                          "Gasto"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {gasto.categoria || "Sin categoría"} ·{" "}
                        {fechaCorta(gasto.fecha)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {gasto.proveedor || "Proveedor no indicado"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-red-600">
                        {dinero(gasto.monto ?? gasto.total)}
                      </p>
                      <ChevronRight
                        size={17}
                        className="ml-auto mt-1 text-slate-300"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </section>
          </>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          <Nav
            icono={<Home size={19} />}
            texto="Inicio"
            onClick={() => router.push("/movil/directiva")}
          />
          <Nav
            icono={<Users size={19} />}
            texto="Morosidad"
            onClick={() => router.push("/movil/directiva/morosidad")}
          />
          <Nav
            activo
            icono={<Banknote size={19} />}
            texto="Finanzas"
            onClick={() => undefined}
          />
          <Nav
            icono={<WalletCards size={19} />}
            texto="Caja chica"
            onClick={() => router.push("/movil/directiva/caja-chica")}
          />
        </div>
      </nav>

      {detalleGasto && (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/55 sm:items-center sm:justify-center sm:p-4">
          <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[2rem]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Detalle del gasto
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  {detalleGasto.concepto ||
                    detalleGasto.descripcion ||
                    "Gasto"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setDetalleGasto(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
                aria-label="Cerrar detalle"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-red-50 p-4">
              <p className="text-[10px] font-bold uppercase text-red-500">
                Monto
              </p>
              <p className="mt-1 text-2xl font-black text-red-700">
                {dinero(detalleGasto.monto ?? detalleGasto.total)}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Info titulo="Fecha" valor={fechaCorta(detalleGasto.fecha)} />
              <Info
                titulo="Categoría"
                valor={detalleGasto.categoria || "Sin categoría"}
              />
              <Info
                titulo="Proveedor"
                valor={detalleGasto.proveedor || "No indicado"}
              />
              <Info
                titulo="Estado"
                valor={detalleGasto.estado || "Registrado"}
              />
              <Info
                titulo="Factura"
                valor={detalleGasto.no_factura || "No indicada"}
              />
              <Info
                titulo="Cheque"
                valor={detalleGasto.numero_cheque || "No indicado"}
              />
            </div>

            {(detalleGasto.detalle_gasto || detalleGasto.descripcion) && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Descripción
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {detalleGasto.detalle_gasto || detalleGasto.descripcion}
                </p>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {detalleGasto.factura_url && (
                <a
                  href={detalleGasto.factura_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-blue-800"
                >
                  Ver factura
                  <FileText size={18} />
                </a>
              )}

              {detalleGasto.cheque_url && (
                <a
                  href={detalleGasto.cheque_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-blue-800"
                >
                  Ver cheque
                  <FileText size={18} />
                </a>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Indicador({
  titulo,
  valor,
  clase,
  icono,
}: {
  titulo: string;
  valor: string;
  clase: string;
  icono: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-xl ${clase}`}
      >
        {icono}
      </span>
      <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-1 break-words text-[11px] font-black leading-tight text-slate-900">
        {valor}
      </p>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2.5 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-1 break-words text-[11px] font-black leading-tight text-slate-800">
        {valor}
      </p>
    </div>
  );
}

function Info({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-1 text-xs font-black text-slate-800">{valor}</p>
    </div>
  );
}

function Nav({
  activo = false,
  icono,
  texto,
  onClick,
}: {
  activo?: boolean;
  icono: React.ReactNode;
  texto: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold ${
        activo ? "text-blue-800" : "text-slate-500"
      }`}
    >
      {icono}
      {texto}
    </button>
  );
}
