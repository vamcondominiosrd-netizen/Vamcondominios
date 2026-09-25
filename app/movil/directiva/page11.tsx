"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  Loader2,
  LogOut,
  PieChart,
  ReceiptText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

type SesionDirectiva = {
  usuario_nombre?: string;
  rol?: string;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string | null;
};

type Cierre = {
  periodo: string;
  balance_inicial: number | string | null;
  total_ingresos: number | string | null;
  total_gastos: number | string | null;
  balance_final: number | string | null;
  estado: string | null;
};

type Movimiento = {
  periodo: string | null;
  fecha_movimiento: string | null;
  tipo_movimiento: string | null;
  monto: number | string | null;
  estado_banco?: string | null;
};

type Resumen = {
  fondoBanco: number;
  balanceCierre: number;
  periodoCierre: string;
  ingresosMes: number;
  gastosMes: number;
  deudaTotal: number;
  unidadesMorosas: number;
  totalUnidades: number;
  deudaAntigua: string;
  fondosCaja: number;
  gastosCaja: number;
  sinSoporteCaja: number;
};

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

const resumenInicial: Resumen = {
  fondoBanco: 0,
  balanceCierre: 0,
  periodoCierre: "",
  ingresosMes: 0,
  gastosMes: 0,
  deudaTotal: 0,
  unidadesMorosas: 0,
  totalUnidades: 0,
  deudaAntigua: "",
  fondosCaja: 0,
  gastosCaja: 0,
  sinSoporteCaja: 0,
};

function n(valor: unknown) {
  const numero = Number(
    String(valor ?? 0)
      .replace("RD$", "")
      .replace(/,/g, "")
      .trim(),
  );
  return Number.isFinite(numero) ? numero : 0;
}

function dinero(valor: unknown) {
  return moneda.format(n(valor));
}

function normalizar(valor: unknown) {
  return String(valor || "")
    .trim()
    .toUpperCase();
}

function periodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function rangoMes(periodo: string) {
  const [anio, mes] = periodo.split("-").map(Number);
  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const siguiente = new Date(anio, mes, 1);
  const hasta = `${siguiente.getFullYear()}-${String(siguiente.getMonth() + 1).padStart(2, "0")}-01`;
  return { desde, hasta };
}

function nombrePeriodo(periodo?: string | null) {
  if (!periodo?.includes("-")) return "Sin información";
  const [anio, mes] = periodo.split("-").map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });
}

function nombreMes(periodo: string) {
  if (!periodo?.includes("-")) return "-";
  const [anio, mes] = periodo.split("-").map(Number);
  return new Date(anio, mes - 1, 1)
    .toLocaleDateString("es-DO", { month: "short" })
    .replace(".", "")
    .replace(/^./, (letra) => letra.toUpperCase());
}

function leerSesion(): SesionDirectiva | null {
  for (const clave of [
    "directiva_actual",
    "usuario_actual",
    "sesion_usuario",
    "usuario",
  ]) {
    const raw = localStorage.getItem(clave);
    if (!raw) continue;
    try {
      const dato = JSON.parse(raw);
      const condominioId = Number(
        dato?.condominio_id || localStorage.getItem("condominio_id"),
      );
      if (condominioId > 0) {
        return {
          usuario_nombre:
            dato?.usuario_nombre ||
            dato?.nombre_completo ||
            dato?.nombre ||
            "Miembro de la directiva",
          rol:
            dato?.rol_nombre ||
            dato?.rol ||
            localStorage.getItem("usuario_rol") ||
            "Directiva",
          condominio_id: condominioId,
          condominio_nombre:
            dato?.condominio_nombre ||
            localStorage.getItem("condominio_nombre") ||
            `Condominio ${condominioId}`,
          condominio_logo_url:
            dato?.condominio_logo_url ||
            localStorage.getItem("condominio_logo_url"),
        };
      }
    } catch {}
  }

  const condominioId = Number(localStorage.getItem("condominio_id") || 0);
  if (!condominioId) return null;
  return {
    usuario_nombre:
      localStorage.getItem("usuario_nombre") || "Miembro de la directiva",
    rol: localStorage.getItem("usuario_rol") || "Directiva",
    condominio_id: condominioId,
    condominio_nombre:
      localStorage.getItem("condominio_nombre") || `Condominio ${condominioId}`,
    condominio_logo_url: localStorage.getItem("condominio_logo_url"),
  };
}

export default function DashboardDirectivaPage() {
  const router = useRouter();
  const periodo = periodoActual();
  const { desde, hasta } = rangoMes(periodo);

  const [sesion, setSesion] = useState<SesionDirectiva | null>(null);
  const [condominioNombre, setCondominioNombre] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [cuenta, setCuenta] = useState("");
  const [resumen, setResumen] = useState<Resumen>(resumenInicial);
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [gastosPrincipales, setGastosPrincipales] = useState<
    { nombre: string; monto: number }[]
  >([]);
  const [alertas, setAlertas] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(
    async (s: SesionDirectiva, refresco = false) => {
      refresco ? setActualizando(true) : setCargando(true);
      setError("");

      try {
        const id = s.condominio_id;
        const anio = new Date().getFullYear();

        const [
          condominioResp,
          cuentaResp,
          cierresResp,
          movimientosResp,
          cargosResp,
          unidadesResp,
          gastosResp,
          cajaResp,
          fondosResp,
        ] = await Promise.all([
          supabase
            .from("condominios")
            .select("id,nombre,logo_url")
            .eq("id", id)
            .maybeSingle(),
          supabase
            .from("cuentas_bancarias")
            .select("id,nombre_banco,numero_cuenta")
            .eq("condominio_id", id)
            .eq("activa", true)
            .order("id")
            .limit(1)
            .maybeSingle(),
          supabase
            .from("banco_cierres_mensuales")
            .select(
              "periodo,balance_inicial,total_ingresos,total_gastos,balance_final,estado",
            )
            .eq("condominio_id", id)
            .gte("periodo", `${anio}-01`)
            .lte("periodo", `${anio}-12`)
            .order("periodo"),
          supabase
            .from("banco_movimientos")
            .select(
              "periodo,fecha_movimiento,tipo_movimiento,monto,estado_banco",
            )
            .eq("condominio_id", id)
            .gte("fecha_movimiento", `${anio}-01-01`)
            .limit(5000),
          supabase
            .from("cargos_periodicos")
            .select("unidad_id,periodo,balance,estado")
            .eq("condominio_id", id)
            .gt("balance", 0)
            .order("periodo"),
          supabase
            .from("unidades")
            .select("id", { count: "exact", head: true })
            .eq("condominio_id", id),
          supabase
            .from("gastos")
            .select(
              "id,fecha,categoria,concepto,descripcion,detalle_gasto,monto,total,factura_url",
            )
            .eq("condominio_id", id)
            .gte("fecha", desde)
            .lt("fecha", hasta),
          supabase
            .from("caja_chica")
            .select(
              "id,fecha,concepto,detalle_gasto,monto,factura_url,comprobante",
            )
            .eq("condominio", s.condominio_nombre),
          supabase
            .from("caja_chica_fondos")
            .select("id,fecha,monto,tipo")
            .eq("condominio_id", id),
        ]);

        if (condominioResp.error) throw condominioResp.error;
        if (cuentaResp.error) throw cuentaResp.error;
        if (cierresResp.error) throw cierresResp.error;
        if (movimientosResp.error) throw movimientosResp.error;
        if (cargosResp.error) throw cargosResp.error;
        if (gastosResp.error) throw gastosResp.error;

        const condominio = condominioResp.data;
        setCondominioNombre(condominio?.nombre || s.condominio_nombre);
        setLogo(condominio?.logo_url || s.condominio_logo_url || null);
        setCuenta(
          cuentaResp.data
            ? `${cuentaResp.data.nombre_banco || "Banco"} · ${cuentaResp.data.numero_cuenta || "Cuenta activa"}`
            : "Cuenta bancaria activa",
        );

        const cierresData = (cierresResp.data || []) as Cierre[];
        const movimientos = (
          (movimientosResp.data || []) as Movimiento[]
        ).filter((m) => normalizar(m.estado_banco) !== "ANULADO");
        const cargos = (cargosResp.data || []) as {
          unidad_id: number | null;
          periodo: string | null;
          balance: number | string | null;
        }[];
        const gastos = (gastosResp.data || []) as any[];
        const caja = cajaResp.error ? [] : ((cajaResp.data || []) as any[]);
        const fondos = fondosResp.error
          ? []
          : ((fondosResp.data || []) as any[]);

        setCierres(cierresData);

        const movimientosMes = movimientos.filter(
          (m) =>
            (m.periodo || String(m.fecha_movimiento || "").slice(0, 7)) ===
            periodo,
        );
        const ingresosMes = movimientosMes
          .filter((m) => normalizar(m.tipo_movimiento) === "INGRESO")
          .reduce((t, m) => t + n(m.monto), 0);
        const gastosMes = movimientosMes
          .filter((m) => normalizar(m.tipo_movimiento) === "EGRESO")
          .reduce((t, m) => t + n(m.monto), 0);

        const ultimoCierre =
          [...cierresData]
            .reverse()
            .find((c) =>
              ["CERRADO", "CERRADA"].includes(normalizar(c.estado)),
            ) || null;
        const posteriores = ultimoCierre
          ? movimientos.filter(
              (m) =>
                (m.periodo || String(m.fecha_movimiento || "").slice(0, 7)) >
                ultimoCierre.periodo,
            )
          : movimientos;
        const variacion = posteriores.reduce(
          (t, m) =>
            normalizar(m.tipo_movimiento) === "INGRESO"
              ? t + n(m.monto)
              : normalizar(m.tipo_movimiento) === "EGRESO"
                ? t - n(m.monto)
                : t,
          0,
        );

        const deudaTotal = cargos.reduce((t, c) => t + n(c.balance), 0);
        const unidadesMorosas = new Set(
          cargos.map((c) => c.unidad_id).filter(Boolean),
        ).size;
        const deudaAntigua =
          cargos.find((c) => n(c.balance) > 0)?.periodo || "";

        const fondosCaja = fondos.reduce((t, f) => t + n(f.monto), 0);
        const gastosCaja = caja.reduce((t, g) => t + n(g.monto), 0);
        const sinSoporteCaja = caja
          .filter((g) => !g.factura_url && !g.comprobante)
          .reduce((t, g) => t + n(g.monto), 0);

        const categorias = new Map<string, number>();
        gastos.forEach((g) => {
          const nombre =
            g.categoria ||
            g.concepto ||
            g.descripcion ||
            g.detalle_gasto ||
            "Otros gastos";
          categorias.set(
            nombre,
            (categorias.get(nombre) || 0) + n(g.monto ?? g.total),
          );
        });
        setGastosPrincipales(
          Array.from(categorias.entries())
            .map(([nombre, monto]) => ({ nombre, monto }))
            .sort((a, b) => b.monto - a.monto)
            .slice(0, 5),
        );

        const alertasNuevas: string[] = [];
        const morososCriticos = new Set(
          cargos
            .filter((c) => {
              if (!c.periodo) return false;
              const f = new Date(`${c.periodo}-01T00:00:00`);
              const meses =
                (new Date().getFullYear() - f.getFullYear()) * 12 +
                new Date().getMonth() -
                f.getMonth();
              return n(c.balance) > 0 && meses >= 6;
            })
            .map((c) => c.unidad_id)
            .filter(Boolean),
        ).size;

        if (morososCriticos)
          alertasNuevas.push(
            `${morososCriticos} unidad${morososCriticos === 1 ? "" : "es"} tiene${morososCriticos === 1 ? "" : "n"} deuda de 6 meses o más.`,
          );
        if (sinSoporteCaja)
          alertasNuevas.push(
            `Caja chica tiene ${dinero(sinSoporteCaja)} pendiente de soporte.`,
          );
        if (gastosMes > ingresosMes && ingresosMes > 0)
          alertasNuevas.push(
            "Los gastos del mes superan los ingresos registrados.",
          );
        if (!ultimoCierre)
          alertasNuevas.push(
            "No hay un cierre bancario registrado para este año.",
          );
        if (!alertasNuevas.length)
          alertasNuevas.push(
            "No hay alertas críticas registradas en este momento.",
          );
        setAlertas(alertasNuevas.slice(0, 4));

        const balanceCierre = n(ultimoCierre?.balance_final);
        setResumen({
          fondoBanco: balanceCierre + variacion,
          balanceCierre,
          periodoCierre: ultimoCierre?.periodo || "",
          ingresosMes,
          gastosMes,
          deudaTotal,
          unidadesMorosas,
          totalUnidades: unidadesResp.count || 0,
          deudaAntigua,
          fondosCaja,
          gastosCaja,
          sinSoporteCaja,
        });
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "No se pudo cargar el dashboard gerencial.");
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [desde, hasta, periodo],
  );

  useEffect(() => {
    const s = leerSesion();
    if (!s) {
      router.replace("/");
      return;
    }
    setSesion(s);
    void cargar(s);
  }, [cargar, router]);

  const acumulado = useMemo(
    () =>
      cierres.reduce(
        (a, c) => ({
          ingresos: a.ingresos + n(c.total_ingresos),
          gastos: a.gastos + n(c.total_gastos),
        }),
        { ingresos: 0, gastos: 0 },
      ),
    [cierres],
  );

  const ultimosMeses = useMemo(
    () =>
      [...cierres]
        .sort((a, b) => b.periodo.localeCompare(a.periodo))
        .slice(0, 4),
    [cierres],
  );

  if (cargando)
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[75vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
            <Loader2 className="animate-spin text-blue-700" size={21} />
            Cargando dashboard gerencial...
          </div>
        </div>
      </main>
    );
  if (!sesion) return null;

  const resultado = resumen.ingresosMes - resumen.gastosMes;
  const morosidad = resumen.totalUnidades
    ? (resumen.unidadesMorosas / resumen.totalUnidades) * 100
    : 0;
  const disponibleCaja = resumen.fondosCaja - resumen.gastosCaja;

  return (
    <main className="min-h-dvh bg-slate-100 pb-24">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-20 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {logo ? (
                <img
                  src={logo}
                  alt={condominioNombre}
                  className="h-12 w-12 shrink-0 rounded-2xl bg-white object-contain p-1.5 shadow-lg"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white font-black text-blue-950 shadow-lg">
                  VAM
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-blue-100">
                  {condominioNombre}
                </p>
                <h1 className="truncate text-lg font-black">
                  Dashboard gerencial
                </h1>
                <p className="mt-0.5 truncate text-[11px] text-blue-100">
                  {sesion.usuario_nombre} · {sesion.rol}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void cargar(sesion, true)}
                disabled={actualizando}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 disabled:opacity-50"
              >
                <RefreshCw
                  size={18}
                  className={actualizando ? "animate-spin" : ""}
                />
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("directiva_actual");
                  router.replace("/");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between text-xs text-blue-100">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} />
              {nombrePeriodo(periodo)}
            </span>
            <span>Actualizado ahora</span>
          </div>
        </div>
      </header>

      <div className="-mt-14 mx-auto max-w-lg space-y-4 px-4">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-[1.7rem] border border-white/60 bg-white shadow-xl shadow-slate-900/10">
          <div className="bg-gradient-to-br from-slate-950 to-blue-900 p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-200">
                  Fondo bancario actualizado
                </p>
                <h2 className="mt-1 text-3xl font-black tracking-tight">
                  {dinero(resumen.fondoBanco)}
                </h2>
                <p className="mt-2 text-xs text-blue-100">{cuenta}</p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Landmark size={25} />
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-100 p-4">
            <Mini
              titulo="Último cierre"
              valor={dinero(resumen.balanceCierre)}
              detalle={nombrePeriodo(resumen.periodoCierre)}
            />
            <Mini
              titulo="Variación posterior"
              valor={dinero(resumen.fondoBanco - resumen.balanceCierre)}
              detalle="Movimientos después del cierre"
            />
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2.5">
          <Indicador
            titulo="Ingresos"
            valor={dinero(resumen.ingresosMes)}
            icono={<ArrowDownRight size={18} />}
            clase="bg-emerald-50 text-emerald-700"
          />
          <Indicador
            titulo="Gastos"
            valor={dinero(resumen.gastosMes)}
            icono={<ArrowUpRight size={18} />}
            clase="bg-red-50 text-red-700"
          />
          <Indicador
            titulo={resultado >= 0 ? "Superávit" : "Déficit"}
            valor={dinero(Math.abs(resultado))}
            icono={
              resultado >= 0 ? (
                <TrendingUp size={18} />
              ) : (
                <TrendingDown size={18} />
              )
            }
            clase={
              resultado >= 0
                ? "bg-blue-50 text-blue-800"
                : "bg-amber-50 text-amber-800"
            }
          />
        </section>

        <button
          onClick={() => router.push("/movil/directiva/morosidad")}
          className="w-full rounded-[1.6rem] border border-slate-200 bg-white p-5 text-left shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Estado de cobros
              </p>
              <h2 className="mt-1 text-2xl font-black text-red-600">
                {dinero(resumen.deudaTotal)}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Total pendiente por cobrar
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Users size={22} />
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Dato titulo="Morosos" valor={`${resumen.unidadesMorosas}`} />
            <Dato titulo="Morosidad" valor={`${morosidad.toFixed(1)}%`} />
            <Dato
              titulo="Desde"
              valor={
                resumen.deudaAntigua ? nombreMes(resumen.deudaAntigua) : "-"
              }
            />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-black text-blue-800">
            Ver quién debe y desde cuándo
            <ChevronRight size={18} />
          </div>
        </button>

        <section className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle size={21} />
            <h2 className="font-black">Atención requerida</h2>
          </div>
          <div className="mt-3 space-y-2">
            {alertas.map((a) => (
              <div
                key={a}
                className="flex gap-2 rounded-xl bg-white/75 px-3 py-2.5 text-xs font-semibold leading-5 text-slate-700"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {a}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Cómo va el año
              </p>
              <h2 className="mt-1 text-lg font-black">
                Resumen {new Date().getFullYear()}
              </h2>
            </div>
            <button
              onClick={() => router.push("/movil/directiva/finanzas")}
              className="flex items-center gap-1 text-xs font-black text-blue-800"
            >
              Ver detalle <ArrowRight size={15} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Acumulado
              titulo="Ingresos acumulados"
              valor={dinero(acumulado.ingresos)}
              icono={<CircleDollarSign size={19} />}
            />
            <Acumulado
              titulo="Gastos acumulados"
              valor={dinero(acumulado.gastos)}
              icono={<ReceiptText size={19} />}
            />
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            {ultimosMeses.length ? (
              ultimosMeses.map((c, i) => {
                const r = n(c.total_ingresos) - n(c.total_gastos);
                return (
                  <div
                    key={c.periodo}
                    className={`grid grid-cols-[48px_1fr_auto] items-center gap-3 px-3 py-3 ${i ? "border-t border-slate-100" : ""}`}
                  >
                    <span className="text-xs font-black">
                      {nombreMes(c.periodo)}
                    </span>
                    <div>
                      <p
                        className={`text-xs font-black ${r >= 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {r >= 0 ? "Superávit" : "Déficit"} {dinero(Math.abs(r))}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Ing. {dinero(c.total_ingresos)} · Gas.{" "}
                        {dinero(c.total_gastos)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase text-slate-400">
                        Cierre
                      </p>
                      <p className="text-xs font-black">
                        {dinero(c.balance_final)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="p-4 text-center text-xs text-slate-500">
                No hay cierres registrados para este año.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Principales gastos
              </p>
              <h2 className="mt-1 font-black">¿En qué se gastó este mes?</h2>
            </div>
            <PieChart size={22} className="text-blue-800" />
          </div>
          <div className="mt-4 space-y-3">
            {gastosPrincipales.length ? (
              gastosPrincipales.map((g, i) => {
                const max = gastosPrincipales[0]?.monto || 1;
                return (
                  <div key={`${g.nombre}-${i}`}>
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="truncate font-bold text-slate-700">
                        {g.nombre}
                      </span>
                      <span className="shrink-0 font-black">
                        {dinero(g.monto)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-800"
                        style={{
                          width: `${Math.max(6, Math.min(100, (g.monto / max) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                No hay gastos registrados en el mes.
              </p>
            )}
          </div>
        </section>

        <button
          onClick={() => router.push("/movil/directiva/caja-chica")}
          className="w-full rounded-[1.6rem] border border-slate-200 bg-white p-5 text-left shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Caja chica
              </p>
              <h2 className="mt-1 text-xl font-black">
                {dinero(disponibleCaja)}
              </h2>
              <p className="text-xs text-slate-500">Disponible actualmente</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
              <WalletCards size={22} />
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Dato titulo="Fondos" valor={dinero(resumen.fondosCaja)} />
            <Dato titulo="Gastado" valor={dinero(resumen.gastosCaja)} />
            <Dato titulo="Sin soporte" valor={dinero(resumen.sinSoporteCaja)} />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-black text-blue-800">
            Ver detalle de caja chica
            <ChevronRight size={18} />
          </div>
        </button>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          <Nav
            activo
            icono={<Building2 size={19} />}
            texto="Inicio"
            onClick={() => undefined}
          />
          <Nav
            icono={<Users size={19} />}
            texto="Morosidad"
            onClick={() => router.push("/movil/directiva/morosidad")}
          />
          <Nav
            icono={<Banknote size={19} />}
            texto="Finanzas"
            onClick={() => router.push("/movil/directiva/finanzas")}
          />
          <Nav
            icono={<WalletCards size={19} />}
            texto="Caja chica"
            onClick={() => router.push("/movil/directiva/caja-chica")}
          />
        </div>
      </nav>
    </main>
  );
}

function Indicador({
  titulo,
  valor,
  icono,
  clase,
}: {
  titulo: string;
  valor: string;
  icono: React.ReactNode;
  clase: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-xl ${clase}`}
      >
        {icono}
      </span>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-1 break-words text-[12px] font-black leading-tight text-slate-900">
        {valor}
      </p>
    </div>
  );
}
function Mini({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div className="px-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900">{valor}</p>
      <p className="mt-1 text-[11px] text-slate-500">{detalle}</p>
    </div>
  );
}
function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2.5 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-1 break-words text-[11px] font-black text-slate-800">
        {valor}
      </p>
    </div>
  );
}
function Acumulado({
  titulo,
  valor,
  icono,
}: {
  titulo: string;
  valor: string;
  icono: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-800 shadow-sm">
        {icono}
      </span>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900">{valor}</p>
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
      className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold ${activo ? "text-blue-800" : "text-slate-500"}`}
    >
      {icono}
      {texto}
    </button>
  );
}
