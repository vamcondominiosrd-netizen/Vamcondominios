"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  Home,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type CondominioActual = {
  id: number;
  nombre: string;
  logoUrl?: string;
};

type CuentaBancaria = {
  id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
  balance_actual: number | null;
  fondo_ordinario: number | null;
  fondo_extraordinario: number | null;
  fondo_reserva: number | null;
};

type CierreBancario = {
  cuenta_bancaria_id: number;
  periodo: string | null;
  balance_final: number | null;
  saldo_banco: number | null;
  estado: string | null;
  conciliado: boolean | null;
  fecha_cierre: string | null;
};

type MovimientoBanco = {
  id: number;
  cuenta_bancaria_id: number | null;
  fecha_movimiento: string | null;
  periodo: string | null;
  tipo_movimiento: string | null;
  monto: number | null;
  estado_banco: string | null;
  origen: string | null;
};

type ResumenCuentaBanco = {
  periodoCierre: string;
  saldoCierre: number;
  ingresosDesdeCierre: number;
  egresosDesdeCierre: number;
  balanceGerencial: number;
  usaCierreOficial: boolean;
};

type CargoPeriodico = {
  id: number;
  unidad_id: number | null;
  periodo: string | null;
  anio: number | null;
  mes: number | null;
  monto: number | null;
  monto_pagado: number | null;
  balance: number | null;
  estado: string | null;
};

type Pago = {
  id: number;
  monto: number | null;
  fecha_pago: string | null;
  tipo_fondo: string | null;
};

type SolicitudPago = {
  id: number;
  estado: string | null;
  monto_total: number | null;
  total: number | null;
};

type Incidencia = {
  id: number;
  estado: string | null;
};

type CajaChicaGasto = {
  id: number;
  monto: number | null;
};

type CajaChicaFondo = {
  id: number;
  monto: number | null;
};

const MESES_NOMBRES: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

export default function DashboardPage() {
  const router = useRouter();

  const [condominio, setCondominio] = useState<CondominioActual | null>(null);
  const [loading, setLoading] = useState(true);

  const [totalUnidades, setTotalUnidades] = useState(0);
  const [totalUnidadesActivas, setTotalUnidadesActivas] = useState(0);

  const [pagosHoy, setPagosHoy] = useState(0);
  const [cantidadPagosMes, setCantidadPagosMes] = useState(0);

  const [balanceBanco, setBalanceBanco] = useState(0);
  const [saldoUltimoCierre, setSaldoUltimoCierre] = useState(0);
  const [ingresosDesdeCierre, setIngresosDesdeCierre] = useState(0);
  const [egresosDesdeCierre, setEgresosDesdeCierre] = useState(0);
  const [ultimoCierrePeriodo, setUltimoCierrePeriodo] = useState("");

  const [ingresosBancoMes, setIngresosBancoMes] = useState(0);
  const [egresosBancoMes, setEgresosBancoMes] = useState(0);

  const [fondoOrdinario, setFondoOrdinario] = useState(0);
  const [fondoExtraordinario, setFondoExtraordinario] = useState(0);
  const [fondoReserva, setFondoReserva] = useState(0);

  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [resumenBancoPorCuenta, setResumenBancoPorCuenta] = useState<
    Record<number, ResumenCuentaBanco>
  >({});

  const [cargosMes, setCargosMes] = useState(0);
  const [cobradoMes, setCobradoMes] = useState(0);
  const [pendienteMes, setPendienteMes] = useState(0);
  const [morosidadTotal, setMorosidadTotal] = useState(0);
  const [unidadesConDeuda, setUnidadesConDeuda] = useState(0);
  const [unidadesAlDia, setUnidadesAlDia] = useState(0);
  const [porcentajeMorosidad, setPorcentajeMorosidad] = useState(0);

  const [pendienteTesorero, setPendienteTesorero] = useState(0);
  const [pendientePresidente, setPendientePresidente] = useState(0);
  const [pendienteTesoreria, setPendienteTesoreria] = useState(0);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);
  const [incidenciasAbiertas, setIncidenciasAbiertas] = useState(0);

  const [cajaChicaFondos, setCajaChicaFondos] = useState(0);
  const [cajaChicaGastos, setCajaChicaGastos] = useState(0);

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const periodoActual = `${anioActual}-${String(mesActual).padStart(2, "0")}`;
  const fechaHoyISO = formatoFechaISO(hoy);

  const flujoNetoBancoMes = ingresosBancoMes - egresosBancoMes;
  const disponibleCajaChica = cajaChicaFondos - cajaChicaGastos;

  const porcCobroMes = useMemo(() => {
    if (cargosMes <= 0) return 0;
    return Math.min(100, Math.round((cobradoMes / cargosMes) * 100));
  }, [cargosMes, cobradoMes]);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const logoUrl = localStorage.getItem("condominio_logo_url") || "";

    if (!id) {
      router.push("/login");
      return;
    }

    const actual = {
      id: Number(id),
      nombre: nombre || `Condominio ID ${id}`,
      logoUrl,
    };

    setCondominio(actual);
    cargarDashboard(actual);
  }, [router]);

  async function cargarDashboard(
    actual: CondominioActual = condominio as CondominioActual
  ) {
    if (!actual?.id) return;

    setLoading(true);

    await Promise.all([
      cargarUnidades(actual.id),
      cargarPagos(actual.id),
      cargarCuentasYBalanceBancario(actual.id),
      cargarCargosPeriodicos(actual.id),
      cargarPendientesAprobacion(actual.id),
      cargarSolicitudesPago(actual.id),
      cargarIncidencias(actual.id),
      cargarCajaChica(actual),
    ]);

    setLoading(false);
  }

  async function cargarUnidades(condominioId: number) {
    const { count: totalCount } = await supabase
      .from("unidades")
      .select("*", { count: "exact", head: true })
      .eq("condominio_id", condominioId);

    const { count: activasCount } = await supabase
      .from("unidades")
      .select("*", { count: "exact", head: true })
      .eq("condominio_id", condominioId)
      .eq("activa", true);

    setTotalUnidades(totalCount || 0);
    setTotalUnidadesActivas(activasCount || 0);
  }

  async function cargarPagos(condominioId: number) {
    const { data } = await supabase
      .from("pagos")
      .select("id, monto, fecha_pago, tipo_fondo")
      .eq("condominio_id", condominioId);

    const pagos = (data || []) as Pago[];

    setPagosHoy(
      pagos
        .filter(
          (p) => String(p.fecha_pago || "").split("T")[0] === fechaHoyISO
        )
        .reduce((acc, item) => acc + Number(item.monto || 0), 0)
    );

    setCantidadPagosMes(
      pagos.filter((p) => obtenerPeriodo(p.fecha_pago) === periodoActual).length
    );
  }

  /**
   * BALANCE BANCARIO GERENCIAL
   *
   * Regla:
   * último cierre oficial de cada cuenta
   * + ingresos bancarios válidos posteriores al cierre
   * - egresos bancarios válidos posteriores al cierre
   *
   * Ya NO usa cuentas_bancarias.balance_actual como fuente principal
   * cuando existe un cierre bancario oficial.
   */
  async function cargarCuentasYBalanceBancario(condominioId: number) {
    const { data: cuentasDataRaw } = await supabase
      .from("cuentas_bancarias")
      .select(
        "id, nombre_banco, numero_cuenta, balance_actual, fondo_ordinario, fondo_extraordinario, fondo_reserva"
      )
      .eq("condominio_id", condominioId)
      .eq("activa", true)
      .order("nombre_banco", { ascending: true });

    const cuentasData = (cuentasDataRaw || []) as CuentaBancaria[];
    setCuentas(cuentasData);

    setFondoOrdinario(
      cuentasData.reduce(
        (acc, item) => acc + Number(item.fondo_ordinario || 0),
        0
      )
    );
    setFondoExtraordinario(
      cuentasData.reduce(
        (acc, item) => acc + Number(item.fondo_extraordinario || 0),
        0
      )
    );
    setFondoReserva(
      cuentasData.reduce(
        (acc, item) => acc + Number(item.fondo_reserva || 0),
        0
      )
    );

    if (cuentasData.length === 0) {
      setBalanceBanco(0);
      setSaldoUltimoCierre(0);
      setIngresosDesdeCierre(0);
      setEgresosDesdeCierre(0);
      setUltimoCierrePeriodo("");
      setIngresosBancoMes(0);
      setEgresosBancoMes(0);
      setResumenBancoPorCuenta({});
      return;
    }

    const cuentaIds = cuentasData.map((c) => c.id);

    const { data: cierresRaw } = await supabase
      .from("banco_cierres_mensuales")
      .select(
        "cuenta_bancaria_id, periodo, balance_final, saldo_banco, estado, conciliado, fecha_cierre"
      )
      .eq("condominio_id", condominioId)
      .eq("estado", "CERRADO")
      .eq("conciliado", true)
      .in("cuenta_bancaria_id", cuentaIds)
      .order("periodo", { ascending: false });

    const { data: movimientosRaw } = await supabase
      .from("banco_movimientos")
      .select(
        "id, cuenta_bancaria_id, fecha_movimiento, periodo, tipo_movimiento, monto, estado_banco, origen"
      )
      .eq("condominio_id", condominioId)
      .in("cuenta_bancaria_id", cuentaIds);

    const cierres = (cierresRaw || []) as CierreBancario[];
    const movimientos = ((movimientosRaw || []) as MovimientoBanco[]).filter(
      (m) => String(m.estado_banco || "").toUpperCase() !== "ANULADO"
    );

    const ingresosMesActual = movimientos
      .filter(
        (m) =>
          obtenerPeriodo(m.fecha_movimiento) === periodoActual &&
          String(m.fecha_movimiento || "").split("T")[0] <= fechaHoyISO &&
          String(m.tipo_movimiento || "").toUpperCase() === "INGRESO"
      )
      .reduce((acc, item) => acc + Number(item.monto || 0), 0);

    const egresosMesActual = movimientos
      .filter(
        (m) =>
          obtenerPeriodo(m.fecha_movimiento) === periodoActual &&
          String(m.fecha_movimiento || "").split("T")[0] <= fechaHoyISO &&
          String(m.tipo_movimiento || "").toUpperCase() === "EGRESO"
      )
      .reduce((acc, item) => acc + Number(item.monto || 0), 0);

    setIngresosBancoMes(ingresosMesActual);
    setEgresosBancoMes(egresosMesActual);

    const resumenPorCuenta: Record<number, ResumenCuentaBanco> = {};
    const periodosCierre = new Set<string>();

    let totalBaseCierre = 0;
    let totalIngresosPosteriores = 0;
    let totalEgresosPosteriores = 0;
    let totalBalanceGerencial = 0;

    for (const cuenta of cuentasData) {
      const cierreCuenta = cierres
        .filter((c) => Number(c.cuenta_bancaria_id) === cuenta.id && c.periodo)
        .sort((a, b) =>
          String(b.periodo || "").localeCompare(String(a.periodo || ""))
        )[0];

      const usaCierreOficial = Boolean(cierreCuenta?.periodo);
      const periodoCierre = cierreCuenta?.periodo || "";

      if (periodoCierre) {
        periodosCierre.add(periodoCierre);
      }

      const saldoBase = usaCierreOficial
        ? Number(cierreCuenta?.saldo_banco ?? cierreCuenta?.balance_final ?? 0)
        : Number(cuenta.balance_actual || 0);

      const inicioMovimientos = periodoCierre
        ? fechaInicioSiguientePeriodo(periodoCierre)
        : "";

      const movimientosCuenta = movimientos.filter((m) => {
        if (Number(m.cuenta_bancaria_id) !== cuenta.id) return false;
        if (!inicioMovimientos) return false;

        const fecha = String(m.fecha_movimiento || "").split("T")[0];
        return fecha >= inicioMovimientos && fecha <= fechaHoyISO;
      });

      const ingresosPosteriores = movimientosCuenta
        .filter(
          (m) => String(m.tipo_movimiento || "").toUpperCase() === "INGRESO"
        )
        .reduce((acc, item) => acc + Number(item.monto || 0), 0);

      const egresosPosteriores = movimientosCuenta
        .filter(
          (m) => String(m.tipo_movimiento || "").toUpperCase() === "EGRESO"
        )
        .reduce((acc, item) => acc + Number(item.monto || 0), 0);

      const balanceGerencial =
        saldoBase + ingresosPosteriores - egresosPosteriores;

      resumenPorCuenta[cuenta.id] = {
        periodoCierre,
        saldoCierre: saldoBase,
        ingresosDesdeCierre: ingresosPosteriores,
        egresosDesdeCierre: egresosPosteriores,
        balanceGerencial,
        usaCierreOficial,
      };

      totalBaseCierre += saldoBase;
      totalIngresosPosteriores += ingresosPosteriores;
      totalEgresosPosteriores += egresosPosteriores;
      totalBalanceGerencial += balanceGerencial;
    }

    const listaPeriodos = Array.from(periodosCierre).sort();

    setResumenBancoPorCuenta(resumenPorCuenta);
    setSaldoUltimoCierre(totalBaseCierre);
    setIngresosDesdeCierre(totalIngresosPosteriores);
    setEgresosDesdeCierre(totalEgresosPosteriores);
    setBalanceBanco(totalBalanceGerencial);

    if (listaPeriodos.length === 1) {
      setUltimoCierrePeriodo(listaPeriodos[0]);
    } else if (listaPeriodos.length > 1) {
      setUltimoCierrePeriodo("VARIOS");
    } else {
      setUltimoCierrePeriodo("");
    }
  }

  async function cargarCargosPeriodicos(condominioId: number) {
    const { data } = await supabase
      .from("cargos_periodicos")
      .select(
        "id, unidad_id, periodo, anio, mes, monto, monto_pagado, balance, estado"
      )
      .eq("condominio_id", condominioId)
      .eq("anio", anioActual);

    const cargos = (data || []) as CargoPeriodico[];
    const cargosDelMes = cargos.filter((c) => Number(c.mes) === mesActual);

    const totalCargosMes = cargosDelMes.reduce(
      (acc, item) => acc + Number(item.monto || 0),
      0
    );

    const totalCobradoMes = cargosDelMes.reduce(
      (acc, item) => acc + Number(item.monto_pagado || 0),
      0
    );

    const totalPendienteMes = cargosDelMes.reduce(
      (acc, item) => acc + Number(item.balance || 0),
      0
    );

    const totalMorosidad = cargos.reduce(
      (acc, item) => acc + Math.max(0, Number(item.balance || 0)),
      0
    );

    const balancePorUnidad = new Map<number, number>();

    for (const cargo of cargos) {
      if (!cargo.unidad_id) continue;

      const balanceActual = balancePorUnidad.get(cargo.unidad_id) || 0;
      balancePorUnidad.set(
        cargo.unidad_id,
        balanceActual + Math.max(0, Number(cargo.balance || 0))
      );
    }

    const unidadesMorosas = Array.from(balancePorUnidad.values()).filter(
      (balance) => balance > 0
    ).length;

    const unidadesPagadas = Array.from(balancePorUnidad.values()).filter(
      (balance) => balance <= 0
    ).length;

    const totalCargosAnio = cargos.reduce(
      (acc, item) => acc + Number(item.monto || 0),
      0
    );

    setCargosMes(totalCargosMes);
    setCobradoMes(totalCobradoMes);
    setPendienteMes(totalPendienteMes);
    setMorosidadTotal(totalMorosidad);
    setUnidadesConDeuda(unidadesMorosas);
    setUnidadesAlDia(unidadesPagadas);
    setPorcentajeMorosidad(
      totalCargosAnio > 0
        ? Math.round((totalMorosidad / totalCargosAnio) * 100)
        : 0
    );
  }

  async function cargarPendientesAprobacion(condominioId: number) {
    const { count: tesoreroCount } = await supabase
      .from("gastos")
      .select("*", { count: "exact", head: true })
      .eq("condominio_id", condominioId)
      .eq("estado", "Pendiente aprobación tesorero");

    const { count: presidenteCount } = await supabase
      .from("gastos")
      .select("*", { count: "exact", head: true })
      .eq("condominio_id", condominioId)
      .eq("estado", "Aprobado por tesorero");

    const { count: tesoreriaCount } = await supabase
      .from("gastos")
      .select("*", { count: "exact", head: true })
      .eq("condominio_id", condominioId)
      .eq("estado", "Aprobado por presidente");

    setPendienteTesorero(tesoreroCount || 0);
    setPendientePresidente(presidenteCount || 0);
    setPendienteTesoreria(tesoreriaCount || 0);
  }

  async function cargarSolicitudesPago(condominioId: number) {
    const { data } = await supabase
      .from("solicitudes_pago")
      .select("id, estado, monto_total, total")
      .eq("condominio_id", condominioId);

    const solicitudes = (data || []) as SolicitudPago[];

    setSolicitudesPendientes(
      solicitudes.filter((s) => {
        const estado = String(s.estado || "").toLowerCase();

        return (
          estado.includes("pendiente") ||
          estado.includes("tesorero") ||
          estado.includes("presidente") ||
          estado.includes("aprobado")
        );
      }).length
    );
  }

  async function cargarIncidencias(condominioId: number) {
    const { data } = await supabase
      .from("incidencias")
      .select("id, estado")
      .eq("condominio_id", condominioId);

    const incidencias = (data || []) as Incidencia[];

    setIncidenciasAbiertas(
      incidencias.filter((i) => {
        const estado = String(i.estado || "").toLowerCase();

        return (
          !estado ||
          estado.includes("abierta") ||
          estado.includes("pendiente") ||
          estado.includes("proceso")
        );
      }).length
    );
  }

  async function cargarCajaChica(actual: CondominioActual) {
    const { data: fondosData } = await supabase
      .from("caja_chica_fondos")
      .select("id, monto")
      .eq("condominio_id", actual.id);

    const fondos = (fondosData || []) as CajaChicaFondo[];

    setCajaChicaFondos(
      fondos.reduce((acc, item) => acc + Number(item.monto || 0), 0)
    );

    const { data: gastosData } = await supabase
      .from("caja_chica")
      .select("id, monto")
      .ilike("condominio", `%${actual.nombre}%`);

    const gastos = (gastosData || []) as CajaChicaGasto[];

    setCajaChicaGastos(
      gastos.reduce((acc, item) => acc + Number(item.monto || 0), 0)
    );
  }

  function obtenerPeriodo(fecha?: string | null) {
    if (!fecha) return "";
    return String(fecha).split("T")[0].slice(0, 7);
  }

  function formatoFechaISO(fecha: Date) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(fecha.getDate()).padStart(2, "0")}`;
  }

  function fechaInicioSiguientePeriodo(periodo: string) {
    const [anio, mes] = periodo.split("-").map(Number);

    if (!anio || !mes) return "";

    const siguienteMes = mes === 12 ? 1 : mes + 1;
    const siguienteAnio = mes === 12 ? anio + 1 : anio;

    return `${siguienteAnio}-${String(siguienteMes).padStart(2, "0")}-01`;
  }

  function nombrePeriodo(periodo: string) {
    if (!/^\d{4}-\d{2}$/.test(periodo)) return periodo || "Sin cierre";

    const [anio, mes] = periodo.split("-").map(Number);
    return `${MESES_NOMBRES[mes]} ${anio}`;
  }

  function dinero(valor: number | null | undefined) {
    return `RD$ ${Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function dineroGerencial(valor: number | null | undefined) {
    return `RD$ ${Math.round(Number(valor || 0)).toLocaleString("es-DO")}`;
  }

  if (!condominio) return null;

  const subtituloBalance =
    ultimoCierrePeriodo && ultimoCierrePeriodo !== "VARIOS"
      ? `Cierre ${nombrePeriodo(ultimoCierrePeriodo)}: ${dineroGerencial(
          saldoUltimoCierre
        )}`
      : ultimoCierrePeriodo === "VARIOS"
      ? "Calculado desde el último cierre de cada cuenta"
      : "Sin cierre bancario disponible";

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard Ejecutivo"
        subtitle={`Resumen gerencial de ${condominio.nombre}. Período actual: ${MESES_NOMBRES[mesActual]} ${anioActual}.`}
        badge="Inicio"
        icon={Building2}
        action={
          <button
            type="button"
            onClick={() => cargarDashboard(condominio)}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        }
      />

      {loading && (
        <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500 shadow-sm">
          Cargando indicadores gerenciales...
        </div>
      )}

      {/* =====================================================
          NIVEL 1: INDICADORES GERENCIALES PRINCIPALES
         ===================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Balance banco al día"
          value={dineroGerencial(balanceBanco)}
          subtitle={subtituloBalance}
          icon={Building2}
          tone="blue"
        />

        <StatCard
          title="Cobrado del mes"
          value={dineroGerencial(cobradoMes)}
          subtitle={`${porcCobroMes}% de ${dineroGerencial(cargosMes)}`}
          icon={Banknote}
          tone="green"
        />

        <StatCard
          title="Pendiente del mes"
          value={dineroGerencial(pendienteMes)}
          subtitle="Balance por cobrar del período"
          icon={AlertTriangle}
          tone={pendienteMes > 0 ? "amber" : "green"}
        />

        <StatCard
          title="Morosidad total"
          value={dineroGerencial(morosidadTotal)}
          subtitle={`${porcentajeMorosidad}% de los cargos del año`}
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      {/* =====================================================
          NIVEL 2: MOVIMIENTO DE CAJA/BANCO DEL MES
         ===================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ingresos bancarios mes"
          value={dineroGerencial(ingresosBancoMes)}
          subtitle="Movimientos INGRESO válidos"
          icon={Banknote}
          tone="green"
        />

        <StatCard
          title="Egresos bancarios mes"
          value={dineroGerencial(egresosBancoMes)}
          subtitle="Movimientos EGRESO válidos"
          icon={ClipboardList}
          tone="red"
        />

        <StatCard
          title="Flujo neto del mes"
          value={dineroGerencial(flujoNetoBancoMes)}
          subtitle="Ingresos menos egresos bancarios"
          icon={BarChart3}
          tone={flujoNetoBancoMes >= 0 ? "blue" : "red"}
        />

        <StatCard
          title="Caja chica"
          value={dineroGerencial(disponibleCajaChica)}
          subtitle="Disponible actual"
          icon={WalletCards}
          tone={disponibleCajaChica >= 0 ? "green" : "red"}
        />
      </div>

      {/* =====================================================
          NIVEL 3: COBROS + PENDIENTES
          Estado de cobros ocupa 2/3 para evitar desbordamientos.
         ===================================================== */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <SectionCard
            title="Estado de cobros del mes"
            subtitle="Cargos, cobros y balances pendientes del período actual."
            action={
              <Link
                href="/estado-cuenta/propietarios"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                Ver estado
              </Link>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SmallStat
                label="Cargos generados"
                value={dineroGerencial(cargosMes)}
                detail="Monto facturado"
              />
              <SmallStat
                label="Cobrado"
                value={dineroGerencial(cobradoMes)}
                detail={`${porcCobroMes}% cobrado`}
              />
              <SmallStat
                label="Pendiente"
                value={dineroGerencial(pendienteMes)}
                detail="Balance por cobrar"
              />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex justify-between gap-4 text-sm">
                <span className="font-bold text-slate-700">
                  Avance de cobro mensual
                </span>
                <span className="font-black text-slate-900">
                  {porcCobroMes}%
                </span>
              </div>

              <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-green-600 transition-all"
                  style={{ width: `${porcCobroMes}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <AlertBox
                title="Unidades al día"
                value={String(unidadesAlDia)}
                tone="green"
              />
              <AlertBox
                title="Unidades con deuda"
                value={String(unidadesConDeuda)}
                tone="red"
              />
              <AlertBox
                title="Morosidad total"
                value={dineroGerencial(morosidadTotal)}
                tone="orange"
              />
            </div>
          </SectionCard>
        </div>

        <div className="min-w-0">
          <SectionCard
            title="Pendientes de acción"
            subtitle="Procesos que requieren seguimiento."
          >
            <div className="space-y-3">
              <PendingRow
                label="Aprobación tesorero"
                value={pendienteTesorero}
                href="/gastos"
              />
              <PendingRow
                label="Aprobación presidente"
                value={pendientePresidente}
                href="/gastos"
              />
              <PendingRow
                label="Pendiente tesorería"
                value={pendienteTesoreria}
                href="/gastos"
              />
              <PendingRow
                label="Solicitudes de pago"
                value={solicitudesPendientes}
                href="/solicitudes-pago"
              />
              <PendingRow
                label="Incidencias abiertas"
                value={incidenciasAbiertas}
                href="/incidencias"
              />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* =====================================================
          NIVEL 4: EXPLICACIÓN DEL BALANCE + OPERACIÓN
         ===================================================== */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <SectionCard
            title="Evolución bancaria desde el último cierre"
            subtitle="Composición del balance mostrado en el Dashboard."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SmallStat
                label="Saldo de cierre"
                value={dineroGerencial(saldoUltimoCierre)}
                detail={
                  ultimoCierrePeriodo && ultimoCierrePeriodo !== "VARIOS"
                    ? nombrePeriodo(ultimoCierrePeriodo)
                    : "Último cierre disponible"
                }
              />
              <SmallStat
                label="Ingresos desde cierre"
                value={dineroGerencial(ingresosDesdeCierre)}
                detail="Cobros / ingresos bancarios"
              />
              <SmallStat
                label="Egresos desde cierre"
                value={dineroGerencial(egresosDesdeCierre)}
                detail="Salidas bancarias"
              />
              <SmallStat
                label="Balance al día"
                value={dineroGerencial(balanceBanco)}
                detail="Cierre + ingresos - egresos"
              />
            </div>
          </SectionCard>
        </div>

        <div className="min-w-0">
          <SectionCard
            title="Indicadores operativos"
            subtitle="Datos rápidos de actividad."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <OperationalRow
                label="Unidades activas"
                value={`${totalUnidadesActivas} / ${totalUnidades}`}
                icon={<Home className="h-4 w-4" />}
              />
              <OperationalRow
                label="Pagos registrados este mes"
                value={String(cantidadPagosMes)}
                icon={<CreditCard className="h-4 w-4" />}
              />
              <OperationalRow
                label="Registrado hoy"
                value={dineroGerencial(pagosHoy)}
                icon={<Banknote className="h-4 w-4" />}
              />
              <OperationalRow
                label="Incidencias abiertas"
                value={String(incidenciasAbiertas)}
                icon={<AlertTriangle className="h-4 w-4" />}
              />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* =====================================================
          NIVEL 5: APOYO ADMINISTRATIVO
         ===================================================== */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          title="Fondos bancarios"
          subtitle="Distribución configurada de fondos."
        >
          <div className="space-y-4">
            <FundBar
              label="Fondo ordinario"
              value={fondoOrdinario}
              total={balanceBanco}
            />
            <FundBar
              label="Fondo extraordinario"
              value={fondoExtraordinario}
              total={balanceBanco}
            />
            <FundBar
              label="Fondo reserva"
              value={fondoReserva}
              total={balanceBanco}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Caja chica"
          subtitle="Resumen de fondo, gastos y disponible."
        >
          <div className="grid grid-cols-1 gap-3">
            <SmallStat
              label="Fondos / reposiciones"
              value={dineroGerencial(cajaChicaFondos)}
            />
            <SmallStat
              label="Gastos caja chica"
              value={dineroGerencial(cajaChicaGastos)}
            />
            <SmallStat
              label="Disponible"
              value={dineroGerencial(disponibleCajaChica)}
              detail="Fondos menos gastos"
            />
          </div>

          <Link
            href="/finanzas/caja-chica"
            className="mt-4 block rounded-xl bg-amber-500 px-4 py-3 text-center font-black text-white hover:bg-amber-600"
          >
            Ver caja chica
          </Link>
        </SectionCard>

        <SectionCard
          title="Accesos rápidos"
          subtitle="Operaciones principales de administración."
        >
          <div className="grid grid-cols-1 gap-3">
            <QuickLink
              href="/pagos-mantenimiento"
              label="Registrar pago"
              icon="💳"
            />
            <QuickLink href="/gastos" label="Registrar gasto" icon="🧾" />
            <QuickLink
              href="/solicitudes-pago"
              label="Solicitud de pago"
              icon="✅"
            />
            <QuickLink
              href="/estado-cuenta/propietarios"
              label="Estado de cuenta"
              icon="📄"
            />
            <QuickLink
              href="/mobile/admin/banco/importar"
              label="Importar banco"
              icon="🏦"
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Cuentas bancarias activas"
        subtitle="Balance gerencial calculado desde el último cierre oficial."
        action={
          <Link
            href="/finanzas/configuraciones/bancos"
            className="text-sm font-bold text-blue-700 hover:underline"
          >
            Configurar bancos
          </Link>
        }
      >
        {cuentas.length === 0 ? (
          <EmptyState
            title="Sin cuentas bancarias"
            description="No hay cuentas bancarias activas configuradas."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Banco</th>
                <th className="px-4 py-3 text-left">Cuenta</th>
                <th className="px-4 py-3 text-left">Último cierre</th>
                <th className="px-4 py-3 text-right">
                  Ingresos desde cierre
                </th>
                <th className="px-4 py-3 text-right">
                  Egresos desde cierre
                </th>
                <th className="px-4 py-3 text-right">Balance al día</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {cuentas.map((cuenta) => {
                const resumen = resumenBancoPorCuenta[cuenta.id];

                return (
                  <tr
                    key={cuenta.id}
                    className="bg-white hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-bold">
                      {cuenta.nombre_banco || "-"}
                    </td>

                    <td className="px-4 py-3">
                      {cuenta.numero_cuenta || "-"}
                    </td>

                    <td className="px-4 py-3">
                      {resumen?.periodoCierre
                        ? nombrePeriodo(resumen.periodoCierre)
                        : "Sin cierre"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {dinero(resumen?.ingresosDesdeCierre || 0)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {dinero(resumen?.egresosDesdeCierre || 0)}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-blue-700">
                      {dinero(
                        resumen?.balanceGerencial ??
                          Number(cuenta.balance_actual || 0)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function SmallStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-lg font-black leading-tight tabular-nums text-slate-800 sm:text-xl xl:text-2xl">
        {value}
      </p>

      {detail && (
        <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
      )}
    </div>
  );
}

function AlertBox({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "green" | "red" | "orange";
}) {
  const tones: Record<string, string> = {
    green: "border-green-100 bg-green-50 text-green-700",
    red: "border-red-100 bg-red-50 text-red-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
  };

  return (
    <div className={`${tones[tone]} min-w-0 rounded-2xl border p-4`}>
      <p className="text-xs font-bold uppercase">{title}</p>
      <p className="mt-2 break-words text-xl font-black leading-tight tabular-nums sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function PendingRow({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl border bg-slate-50 p-4 transition hover:bg-slate-100"
    >
      <span className="min-w-0 font-bold text-slate-700">{label}</span>

      <span
        className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 font-black ${
          value > 0
            ? "bg-red-600 text-white"
            : "bg-green-600 text-white"
        }`}
      >
        {value}
      </span>
    </Link>
  );
}

function OperationalRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border bg-slate-50 p-4">
      <div className="flex min-w-0 items-center gap-2 text-slate-600">
        <span className="shrink-0">{icon}</span>
        <span className="text-sm font-bold">{label}</span>
      </div>

      <span className="shrink-0 text-right text-sm font-black tabular-nums text-slate-900">
        {value}
      </span>
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white transition hover:bg-slate-800"
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function FundBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const porcentaje =
    total > 0
      ? Math.max(
          0,
          Math.round((Number(value || 0) / Number(total || 0)) * 100)
        )
      : 0;

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-start justify-between gap-3 text-sm">
        <span className="font-bold text-slate-700">{label}</span>

        <span className="break-words text-right font-black tabular-nums text-slate-900">
          RD$ {Math.round(Number(value || 0)).toLocaleString("es-DO")}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-700"
          style={{ width: `${Math.min(100, porcentaje)}%` }}
        />
      </div>

      <p className="mt-1 text-xs text-slate-500">
        {porcentaje}% del balance
      </p>
    </div>
  );
}
