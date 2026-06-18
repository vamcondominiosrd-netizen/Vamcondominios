"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { getCondominioActual } from "../../lib/condominioActual";

type CuentaBancaria = {
  id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
  balance_actual: number | null;
  fondo_ordinario: number | null;
  fondo_extraordinario: number | null;
  fondo_reserva: number | null;
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

type Gasto = {
  id: number;
  total: number | null;
  estado: string | null;
  pagado: boolean | null;
  created_at: string | null;
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
  const condominio = getCondominioActual();

  const [loading, setLoading] = useState(true);

  const [totalUnidades, setTotalUnidades] = useState(0);
  const [totalUnidadesActivas, setTotalUnidadesActivas] = useState(0);

  const [ingresosMes, setIngresosMes] = useState(0);
  const [ingresosAnio, setIngresosAnio] = useState(0);
  const [pagosHoy, setPagosHoy] = useState(0);
  const [cantidadPagosMes, setCantidadPagosMes] = useState(0);

  const [gastosMes, setGastosMes] = useState(0);
  const [gastosAnio, setGastosAnio] = useState(0);

  const [balanceBanco, setBalanceBanco] = useState(0);
  const [fondoOrdinario, setFondoOrdinario] = useState(0);
  const [fondoExtraordinario, setFondoExtraordinario] = useState(0);
  const [fondoReserva, setFondoReserva] = useState(0);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);

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

  const balanceOperativoMes = ingresosMes - gastosMes;
  const disponibleCajaChica = cajaChicaFondos - cajaChicaGastos;

  const porcCobroMes = useMemo(() => {
    if (cargosMes <= 0) return 0;
    return Math.min(100, Math.round((cobradoMes / cargosMes) * 100));
  }, [cargosMes, cobradoMes]);

  useEffect(() => {
    if (!condominio.id) {
      router.push("/login");
      return;
    }

    cargarDashboard();
  }, []);

  async function cargarDashboard() {
    setLoading(true);

    await Promise.all([
      cargarUnidades(),
      cargarPagos(),
      cargarGastos(),
      cargarCuentasBancarias(),
      cargarCargosPeriodicos(),
      cargarPendientesAprobacion(),
      cargarSolicitudesPago(),
      cargarIncidencias(),
      cargarCajaChica(),
    ]);

    setLoading(false);
  }

  async function cargarUnidades() {
    const { count: totalCount } = await supabase
      .from("unidades")
      .select("*", { count: "exact", head: true })
      .eq("condominio_id", Number(condominio.id));

    const { count: activasCount } = await supabase
      .from("unidades")
      .select("*", { count: "exact", head: true })
      .eq("condominio_id", Number(condominio.id))
      .eq("activa", true);

    setTotalUnidades(totalCount || 0);
    setTotalUnidadesActivas(activasCount || 0);
  }

  async function cargarPagos() {
    const { data } = await supabase
      .from("pagos")
      .select("id, monto, fecha_pago, tipo_fondo")
      .eq("condominio_id", Number(condominio.id));

    const pagos = (data || []) as Pago[];

    const ingresosDelMes = pagos
      .filter((p) => obtenerPeriodo(p.fecha_pago) === periodoActual)
      .reduce((acc, item) => acc + Number(item.monto || 0), 0);

    const ingresosDelAnio = pagos
      .filter((p) => obtenerAnio(p.fecha_pago) === anioActual)
      .reduce((acc, item) => acc + Number(item.monto || 0), 0);

    const pagosDelDia = pagos
      .filter((p) => String(p.fecha_pago || "").split("T")[0] === fechaHoyISO)
      .reduce((acc, item) => acc + Number(item.monto || 0), 0);

    const cantidadMes = pagos.filter(
      (p) => obtenerPeriodo(p.fecha_pago) === periodoActual
    ).length;

    setIngresosMes(ingresosDelMes);
    setIngresosAnio(ingresosDelAnio);
    setPagosHoy(pagosDelDia);
    setCantidadPagosMes(cantidadMes);
  }

  async function cargarGastos() {
    const { data } = await supabase
      .from("gastos")
      .select("id, total, estado, pagado, created_at")
      .eq("condominio_id", Number(condominio.id));

    const gastos = (data || []) as Gasto[];

    const gastosDelMes = gastos
      .filter((g) => obtenerPeriodo(g.created_at) === periodoActual)
      .reduce((acc, item) => acc + Number(item.total || 0), 0);

    const gastosDelAnio = gastos
      .filter((g) => obtenerAnio(g.created_at) === anioActual)
      .reduce((acc, item) => acc + Number(item.total || 0), 0);

    setGastosMes(gastosDelMes);
    setGastosAnio(gastosDelAnio);
  }

  async function cargarCuentasBancarias() {
    const { data } = await supabase
      .from("cuentas_bancarias")
      .select(
        "id, nombre_banco, numero_cuenta, balance_actual, fondo_ordinario, fondo_extraordinario, fondo_reserva"
      )
      .eq("condominio_id", Number(condominio.id))
      .eq("activa", true)
      .order("nombre_banco", { ascending: true });

    const cuentasData = (data || []) as CuentaBancaria[];

    const totalBanco = cuentasData.reduce(
      (acc, item) => acc + Number(item.balance_actual || 0),
      0
    );

    const totalOrdinario = cuentasData.reduce(
      (acc, item) => acc + Number(item.fondo_ordinario || 0),
      0
    );

    const totalExtraordinario = cuentasData.reduce(
      (acc, item) => acc + Number(item.fondo_extraordinario || 0),
      0
    );

    const totalReserva = cuentasData.reduce(
      (acc, item) => acc + Number(item.fondo_reserva || 0),
      0
    );

    setCuentas(cuentasData);
    setBalanceBanco(totalBanco);
    setFondoOrdinario(totalOrdinario);
    setFondoExtraordinario(totalExtraordinario);
    setFondoReserva(totalReserva);
  }

  async function cargarCargosPeriodicos() {
    const { data } = await supabase
      .from("cargos_periodicos")
      .select(
        "id, unidad_id, periodo, anio, mes, monto, monto_pagado, balance, estado"
      )
      .eq("condominio_id", Number(condominio.id))
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

    const unidadesMorosas = new Set(
      cargos
        .filter((c) => Number(c.balance || 0) > 0)
        .map((c) => String(c.unidad_id))
    );

    const unidadesPagadas = new Set(
      cargos
        .filter((c) => Number(c.balance || 0) <= 0 && c.unidad_id)
        .map((c) => String(c.unidad_id))
    );

    const totalCargosAnio = cargos.reduce(
      (acc, item) => acc + Number(item.monto || 0),
      0
    );

    const porcMora =
      totalCargosAnio > 0
        ? Math.round((totalMorosidad / totalCargosAnio) * 100)
        : 0;

    setCargosMes(totalCargosMes);
    setCobradoMes(totalCobradoMes);
    setPendienteMes(totalPendienteMes);
    setMorosidadTotal(totalMorosidad);
    setUnidadesConDeuda(unidadesMorosas.size);
    setUnidadesAlDia(Math.max(0, unidadesPagadas.size - unidadesMorosas.size));
    setPorcentajeMorosidad(porcMora);
  }

  async function cargarPendientesAprobacion() {
    const { count: tesoreroCount } = await supabase
      .from("gastos")
      .select("*", { count: "exact", head: true })
      .eq("condominio_id", Number(condominio.id))
      .eq("estado", "Pendiente aprobación tesorero");

    const { count: presidenteCount } = await supabase
      .from("gastos")
      .select("*", { count: "exact", head: true })
      .eq("condominio_id", Number(condominio.id))
      .eq("estado", "Aprobado por tesorero");

    const { count: tesoreriaCount } = await supabase
      .from("gastos")
      .select("*", { count: "exact", head: true })
      .eq("condominio_id", Number(condominio.id))
      .eq("estado", "Aprobado por presidente");

    setPendienteTesorero(tesoreroCount || 0);
    setPendientePresidente(presidenteCount || 0);
    setPendienteTesoreria(tesoreriaCount || 0);
  }

  async function cargarSolicitudesPago() {
    const { data } = await supabase
      .from("solicitudes_pago")
      .select("id, estado, monto_total, total")
      .eq("condominio_id", Number(condominio.id));

    const solicitudes = (data || []) as SolicitudPago[];

    const pendientes = solicitudes.filter((s) => {
      const estado = String(s.estado || "").toLowerCase();
      return (
        estado.includes("pendiente") ||
        estado.includes("tesorero") ||
        estado.includes("presidente") ||
        estado.includes("aprobado")
      );
    });

    setSolicitudesPendientes(pendientes.length);
  }

  async function cargarIncidencias() {
    const { data } = await supabase
      .from("incidencias")
      .select("id, estado")
      .eq("condominio_id", Number(condominio.id));

    const incidencias = (data || []) as Incidencia[];

    const abiertas = incidencias.filter((i) => {
      const estado = String(i.estado || "").toLowerCase();
      return (
        !estado ||
        estado.includes("abierta") ||
        estado.includes("pendiente") ||
        estado.includes("proceso")
      );
    });

    setIncidenciasAbiertas(abiertas.length);
  }

  async function cargarCajaChica() {
    const { data: fondosData } = await supabase
      .from("caja_chica_fondos")
      .select("id, monto")
      .eq("condominio_id", Number(condominio.id));

    const fondos = (fondosData || []) as CajaChicaFondo[];

    const totalFondos = fondos.reduce(
      (acc, item) => acc + Number(item.monto || 0),
      0
    );

    setCajaChicaFondos(totalFondos);

    const { data: gastosData } = await supabase
      .from("caja_chica")
      .select("id, monto")
      .ilike("condominio", `%${condominio.nombre}%`);

    const gastos = (gastosData || []) as CajaChicaGasto[];

    const totalGastosCaja = gastos.reduce(
      (acc, item) => acc + Number(item.monto || 0),
      0
    );

    setCajaChicaGastos(totalGastosCaja);
  }

  function obtenerPeriodo(fecha?: string | null) {
    if (!fecha) return "";
    return String(fecha).split("T")[0].slice(0, 7);
  }

  function obtenerAnio(fecha?: string | null) {
    if (!fecha) return 0;
    const anio = String(fecha).split("T")[0].slice(0, 4);
    return Number(anio || 0);
  }

  function formatoFechaISO(fecha: Date) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function dinero(valor: number | null | undefined) {
    return `RD$ ${Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (!condominio.id) {
    return null;
  }

  return (
    <main className="p-4 md:p-6 space-y-6 bg-slate-100 min-h-screen">
      <section className="bg-slate-950 text-white rounded-3xl p-6 shadow-lg overflow-hidden relative">
        <div className="absolute right-0 top-0 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute right-28 bottom-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-center gap-4">
            {condominio.logoUrl ? (
              <img
                src={condominio.logoUrl}
                alt={condominio.nombre}
                className="h-20 w-20 object-contain rounded-2xl border border-white/20 bg-white p-2"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl border border-white/20 bg-white/10 flex items-center justify-center text-3xl">
                🏢
              </div>
            )}

            <div>
              <p className="text-sm text-blue-200 font-semibold">
                Panel Gerencial
              </p>

              <h1 className="text-2xl md:text-4xl font-black leading-tight">
                Dashboard Ejecutivo
              </h1>

              <p className="text-slate-300 mt-1">{condominio.nombre}</p>

              <p className="text-xs text-slate-400 mt-1">
                Período actual: {MESES_NOMBRES[mesActual]} {anioActual}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <HeaderMiniCard title="Unidades" value={totalUnidadesActivas} />
            <HeaderMiniCard title="Pagos mes" value={cantidadPagosMes} />
            <HeaderMiniCard title="Mora %" value={`${porcentajeMorosidad}%`} />
            <HeaderMiniCard
              title="Caja chica"
              value={dinero(disponibleCajaChica)}
              small
            />
          </div>
        </div>
      </section>

      {loading && (
        <div className="bg-white border rounded-2xl p-4 text-slate-600 shadow-sm">
          Cargando indicadores gerenciales...
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Ingresos del mes"
          value={dinero(ingresosMes)}
          subtitle={`Ingresos acumulados ${anioActual}: ${dinero(ingresosAnio)}`}
          tone="green"
          icon="💰"
        />

        <MetricCard
          title="Gastos del mes"
          value={dinero(gastosMes)}
          subtitle={`Gastos acumulados ${anioActual}: ${dinero(gastosAnio)}`}
          tone="red"
          icon="📉"
        />

        <MetricCard
          title="Balance operativo"
          value={dinero(balanceOperativoMes)}
          subtitle="Ingresos menos gastos del mes"
          tone={balanceOperativoMes >= 0 ? "blue" : "red"}
          icon="📊"
        />

        <MetricCard
          title="Balance en bancos"
          value={dinero(balanceBanco)}
          subtitle={`${cuentas.length} cuenta(s) activa(s)`}
          tone="indigo"
          icon="🏦"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border p-5">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-black text-slate-800">
                Estado de cobros del mes
              </h2>
              <p className="text-sm text-slate-500">
                Cargos, cobros y balances pendientes del período actual.
              </p>
            </div>

            <Link
              href="/estado-cuenta/propietarios"
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold"
            >
              Ver estado
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SmallStat
              label="Cargos generados"
              value={dinero(cargosMes)}
              detail="Monto facturado del mes"
            />
            <SmallStat
              label="Cobrado"
              value={dinero(cobradoMes)}
              detail={`${porcCobroMes}% del mes cobrado`}
            />
            <SmallStat
              label="Pendiente del mes"
              value={dinero(pendienteMes)}
              detail="Balance por cobrar del mes"
            />
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-bold text-slate-700">
                Avance de cobro mensual
              </span>
              <span className="font-black text-slate-900">{porcCobroMes}%</span>
            </div>

            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: `${porcCobroMes}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
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
              value={dinero(morosidadTotal)}
              tone="orange"
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border p-5">
          <h2 className="text-xl font-black text-slate-800">
            Pendientes de acción
          </h2>

          <p className="text-sm text-slate-500 mb-4">
            Procesos que requieren seguimiento.
          </p>

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
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl shadow-sm border p-5">
          <h2 className="text-xl font-black text-slate-800">
            Fondos bancarios
          </h2>

          <p className="text-sm text-slate-500 mb-4">
            Distribución de fondos disponibles.
          </p>

          <div className="space-y-4">
            <FundBar label="Fondo ordinario" value={fondoOrdinario} total={balanceBanco} />
            <FundBar
              label="Fondo extraordinario"
              value={fondoExtraordinario}
              total={balanceBanco}
            />
            <FundBar label="Fondo reserva" value={fondoReserva} total={balanceBanco} />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border p-5">
          <h2 className="text-xl font-black text-slate-800">Caja chica</h2>

          <p className="text-sm text-slate-500 mb-4">
            Resumen de fondo, gastos y disponible.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <SmallStat label="Fondos / reposiciones" value={dinero(cajaChicaFondos)} />
            <SmallStat label="Gastos caja chica" value={dinero(cajaChicaGastos)} />
            <SmallStat
              label="Disponible"
              value={dinero(disponibleCajaChica)}
              detail="Fondos menos gastos"
            />
          </div>

          <Link
            href="/caja-chica"
            className="block text-center mt-4 bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-xl font-black"
          >
            Ver caja chica
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border p-5">
          <h2 className="text-xl font-black text-slate-800">
            Accesos rápidos
          </h2>

          <p className="text-sm text-slate-500 mb-4">
            Operaciones principales de administración.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <QuickLink href="/pagos-mantenimiento" label="Registrar pago" icon="💳" />
            <QuickLink href="/gastos" label="Registrar gasto" icon="🧾" />
            <QuickLink href="/solicitudes-pago" label="Solicitud de pago" icon="✅" />
            <QuickLink href="/estado-cuenta/propietarios" label="Estado de cuenta" icon="📄" />
            <QuickLink href="/mobile/admin/banco/importar" label="Importar banco" icon="🏦" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-sm border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              Cuentas bancarias activas
            </h2>
            <p className="text-sm text-slate-500">
              Balances registrados por cuenta.
            </p>
          </div>

          <Link
            href="/finanzas/configuraciones/bancos"
            className="text-sm font-bold text-blue-700 hover:underline"
          >
            Configurar bancos
          </Link>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Banco</th>
                <th className="text-left p-3">Cuenta</th>
                <th className="text-right p-3">Ordinario</th>
                <th className="text-right p-3">Extraordinario</th>
                <th className="text-right p-3">Reserva</th>
                <th className="text-right p-3">Balance</th>
              </tr>
            </thead>

            <tbody>
              {cuentas.map((cuenta) => (
                <tr key={cuenta.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-bold">{cuenta.nombre_banco || "-"}</td>
                  <td className="p-3">{cuenta.numero_cuenta || "-"}</td>
                  <td className="p-3 text-right">{dinero(cuenta.fondo_ordinario)}</td>
                  <td className="p-3 text-right">
                    {dinero(cuenta.fondo_extraordinario)}
                  </td>
                  <td className="p-3 text-right">{dinero(cuenta.fondo_reserva)}</td>
                  <td className="p-3 text-right font-black text-blue-700">
                    {dinero(cuenta.balance_actual)}
                  </td>
                </tr>
              ))}

              {cuentas.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No hay cuentas bancarias activas configuradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function HeaderMiniCard({
  title,
  value,
  small = false,
}: {
  title: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="bg-white/10 border border-white/10 rounded-2xl p-3">
      <p className="text-xs text-slate-300">{title}</p>
      <p className={`font-black ${small ? "text-sm" : "text-xl"}`}>
        {value}
      </p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  tone: "green" | "red" | "blue" | "indigo";
}) {
  const tones: Record<string, string> = {
    green: "from-green-50 to-white text-green-700 border-green-100",
    red: "from-red-50 to-white text-red-700 border-red-100",
    blue: "from-blue-50 to-white text-blue-700 border-blue-100",
    indigo: "from-indigo-50 to-white text-indigo-700 border-indigo-100",
  };

  return (
    <div className={`bg-gradient-to-br ${tones[tone]} rounded-3xl border p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 font-bold">{title}</p>
          <h2 className="text-2xl md:text-3xl font-black mt-2">{value}</h2>
          <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
        </div>

        <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl">
          {icon}
        </div>
      </div>
    </div>
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
    <div className="bg-slate-50 border rounded-2xl p-4">
      <p className="text-xs text-slate-500 font-bold uppercase">{label}</p>
      <p className="text-xl font-black text-slate-800 mt-1">{value}</p>
      {detail && <p className="text-xs text-slate-500 mt-1">{detail}</p>}
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
    green: "bg-green-50 text-green-700 border-green-100",
    red: "bg-red-50 text-red-700 border-red-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
  };

  return (
    <div className={`${tones[tone]} border rounded-2xl p-4`}>
      <p className="text-xs font-bold uppercase">{title}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
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
      className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 border rounded-2xl p-4 transition"
    >
      <span className="font-bold text-slate-700">{label}</span>
      <span
        className={`h-8 min-w-8 px-2 rounded-full flex items-center justify-center font-black ${
          value > 0 ? "bg-red-600 text-white" : "bg-green-600 text-white"
        }`}
      >
        {value}
      </span>
    </Link>
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
      className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-4 py-3 font-bold transition"
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
  const porcentaje = total > 0 ? Math.round((Number(value || 0) / total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-black text-slate-900">
          RD$ {Number(value || 0).toLocaleString("es-DO")}
        </span>
      </div>

      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-700 rounded-full"
          style={{ width: `${Math.min(100, porcentaje)}%` }}
        />
      </div>

      <p className="text-xs text-slate-500 mt-1">{porcentaje}% del balance</p>
    </div>
  );
}