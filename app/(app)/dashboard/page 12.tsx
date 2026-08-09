"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Banknote, BarChart3, Building2, CheckCircle, ClipboardList, CreditCard, Home, RefreshCw, WalletCards } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type CondominioActual = { id: number; nombre: string; logoUrl?: string };
type CuentaBancaria = { id: number; nombre_banco: string | null; numero_cuenta: string | null; balance_actual: number | null; fondo_ordinario: number | null; fondo_extraordinario: number | null; fondo_reserva: number | null };
type CargoPeriodico = { id: number; unidad_id: number | null; periodo: string | null; anio: number | null; mes: number | null; monto: number | null; monto_pagado: number | null; balance: number | null; estado: string | null };
type Pago = { id: number; monto: number | null; fecha_pago: string | null; tipo_fondo: string | null };
type Gasto = { id: number; total: number | null; estado: string | null; pagado: boolean | null; created_at: string | null };
type SolicitudPago = { id: number; estado: string | null; monto_total: number | null; total: number | null };
type Incidencia = { id: number; estado: string | null };
type CajaChicaGasto = { id: number; monto: number | null };
type CajaChicaFondo = { id: number; monto: number | null };

const MESES_NOMBRES: Record<number, string> = { 1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre" };

export default function DashboardPage() {
  const router = useRouter();
  const [condominio, setCondominio] = useState<CondominioActual | null>(null);
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
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const logoUrl = localStorage.getItem("condominio_logo_url") || "";
    if (!id) { router.push("/login"); return; }
    const actual = { id: Number(id), nombre: nombre || `Condominio ID ${id}`, logoUrl };
    setCondominio(actual);
    cargarDashboard(actual);
  }, [router]);

  async function cargarDashboard(actual: CondominioActual = condominio as CondominioActual) {
    if (!actual?.id) return;
    setLoading(true);
    await Promise.all([cargarUnidades(actual.id), cargarPagos(actual.id), cargarGastos(actual.id), cargarCuentasBancarias(actual.id), cargarCargosPeriodicos(actual.id), cargarPendientesAprobacion(actual.id), cargarSolicitudesPago(actual.id), cargarIncidencias(actual.id), cargarCajaChica(actual)]);
    setLoading(false);
  }

  async function cargarUnidades(condominioId: number) {
    const { count: totalCount } = await supabase.from("unidades").select("*", { count: "exact", head: true }).eq("condominio_id", condominioId);
    const { count: activasCount } = await supabase.from("unidades").select("*", { count: "exact", head: true }).eq("condominio_id", condominioId).eq("activa", true);
    setTotalUnidades(totalCount || 0); setTotalUnidadesActivas(activasCount || 0);
  }
  async function cargarPagos(condominioId: number) {
    const { data } = await supabase.from("pagos").select("id, monto, fecha_pago, tipo_fondo").eq("condominio_id", condominioId);
    const pagos = (data || []) as Pago[];
    setIngresosMes(pagos.filter((p) => obtenerPeriodo(p.fecha_pago) === periodoActual).reduce((acc, item) => acc + Number(item.monto || 0), 0));
    setIngresosAnio(pagos.filter((p) => obtenerAnio(p.fecha_pago) === anioActual).reduce((acc, item) => acc + Number(item.monto || 0), 0));
    setPagosHoy(pagos.filter((p) => String(p.fecha_pago || "").split("T")[0] === fechaHoyISO).reduce((acc, item) => acc + Number(item.monto || 0), 0));
    setCantidadPagosMes(pagos.filter((p) => obtenerPeriodo(p.fecha_pago) === periodoActual).length);
  }
  async function cargarGastos(condominioId: number) {
    const { data } = await supabase.from("gastos").select("id, total, estado, pagado, created_at").eq("condominio_id", condominioId);
    const gastos = (data || []) as Gasto[];
    setGastosMes(gastos.filter((g) => obtenerPeriodo(g.created_at) === periodoActual).reduce((acc, item) => acc + Number(item.total || 0), 0));
    setGastosAnio(gastos.filter((g) => obtenerAnio(g.created_at) === anioActual).reduce((acc, item) => acc + Number(item.total || 0), 0));
  }
  async function cargarCuentasBancarias(condominioId: number) {
    const { data } = await supabase.from("cuentas_bancarias").select("id, nombre_banco, numero_cuenta, balance_actual, fondo_ordinario, fondo_extraordinario, fondo_reserva").eq("condominio_id", condominioId).eq("activa", true).order("nombre_banco", { ascending: true });
    const cuentasData = (data || []) as CuentaBancaria[];
    setCuentas(cuentasData);
    setBalanceBanco(cuentasData.reduce((acc, item) => acc + Number(item.balance_actual || 0), 0));
    setFondoOrdinario(cuentasData.reduce((acc, item) => acc + Number(item.fondo_ordinario || 0), 0));
    setFondoExtraordinario(cuentasData.reduce((acc, item) => acc + Number(item.fondo_extraordinario || 0), 0));
    setFondoReserva(cuentasData.reduce((acc, item) => acc + Number(item.fondo_reserva || 0), 0));
  }
  async function cargarCargosPeriodicos(condominioId: number) {
    const { data } = await supabase.from("cargos_periodicos").select("id, unidad_id, periodo, anio, mes, monto, monto_pagado, balance, estado").eq("condominio_id", condominioId).eq("anio", anioActual);
    const cargos = (data || []) as CargoPeriodico[];
    const cargosDelMes = cargos.filter((c) => Number(c.mes) === mesActual);
    const totalCargosMes = cargosDelMes.reduce((acc, item) => acc + Number(item.monto || 0), 0);
    const totalCobradoMes = cargosDelMes.reduce((acc, item) => acc + Number(item.monto_pagado || 0), 0);
    const totalPendienteMes = cargosDelMes.reduce((acc, item) => acc + Number(item.balance || 0), 0);
    const totalMorosidad = cargos.reduce((acc, item) => acc + Math.max(0, Number(item.balance || 0)), 0);
    const unidadesMorosas = new Set(cargos.filter((c) => Number(c.balance || 0) > 0 && c.unidad_id).map((c) => String(c.unidad_id)));
    const unidadesPagadas = new Set(cargos.filter((c) => Number(c.balance || 0) <= 0 && c.unidad_id).map((c) => String(c.unidad_id)));
    const totalCargosAnio = cargos.reduce((acc, item) => acc + Number(item.monto || 0), 0);
    setCargosMes(totalCargosMes); setCobradoMes(totalCobradoMes); setPendienteMes(totalPendienteMes); setMorosidadTotal(totalMorosidad);
    setUnidadesConDeuda(unidadesMorosas.size); setUnidadesAlDia(Math.max(0, unidadesPagadas.size - unidadesMorosas.size));
    setPorcentajeMorosidad(totalCargosAnio > 0 ? Math.round((totalMorosidad / totalCargosAnio) * 100) : 0);
  }
  async function cargarPendientesAprobacion(condominioId: number) {
    const { count: tesoreroCount } = await supabase.from("gastos").select("*", { count: "exact", head: true }).eq("condominio_id", condominioId).eq("estado", "Pendiente aprobación tesorero");
    const { count: presidenteCount } = await supabase.from("gastos").select("*", { count: "exact", head: true }).eq("condominio_id", condominioId).eq("estado", "Aprobado por tesorero");
    const { count: tesoreriaCount } = await supabase.from("gastos").select("*", { count: "exact", head: true }).eq("condominio_id", condominioId).eq("estado", "Aprobado por presidente");
    setPendienteTesorero(tesoreroCount || 0); setPendientePresidente(presidenteCount || 0); setPendienteTesoreria(tesoreriaCount || 0);
  }
  async function cargarSolicitudesPago(condominioId: number) {
    const { data } = await supabase.from("solicitudes_pago").select("id, estado, monto_total, total").eq("condominio_id", condominioId);
    const solicitudes = (data || []) as SolicitudPago[];
    setSolicitudesPendientes(solicitudes.filter((s) => { const estado = String(s.estado || "").toLowerCase(); return estado.includes("pendiente") || estado.includes("tesorero") || estado.includes("presidente") || estado.includes("aprobado"); }).length);
  }
  async function cargarIncidencias(condominioId: number) {
    const { data } = await supabase.from("incidencias").select("id, estado").eq("condominio_id", condominioId);
    const incidencias = (data || []) as Incidencia[];
    setIncidenciasAbiertas(incidencias.filter((i) => { const estado = String(i.estado || "").toLowerCase(); return !estado || estado.includes("abierta") || estado.includes("pendiente") || estado.includes("proceso"); }).length);
  }
  async function cargarCajaChica(actual: CondominioActual) {
    const { data: fondosData } = await supabase.from("caja_chica_fondos").select("id, monto").eq("condominio_id", actual.id);
    const fondos = (fondosData || []) as CajaChicaFondo[];
    setCajaChicaFondos(fondos.reduce((acc, item) => acc + Number(item.monto || 0), 0));
    const { data: gastosData } = await supabase.from("caja_chica").select("id, monto").ilike("condominio", `%${actual.nombre}%`);
    const gastos = (gastosData || []) as CajaChicaGasto[];
    setCajaChicaGastos(gastos.reduce((acc, item) => acc + Number(item.monto || 0), 0));
  }

  function obtenerPeriodo(fecha?: string | null) { if (!fecha) return ""; return String(fecha).split("T")[0].slice(0, 7); }
  function obtenerAnio(fecha?: string | null) { if (!fecha) return 0; return Number(String(fecha).split("T")[0].slice(0, 4) || 0); }
  function formatoFechaISO(fecha: Date) { return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`; }
  function dinero(valor: number | null | undefined) { return `RD$ ${Number(valor || 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

  if (!condominio) return null;

  return (
    <PageContainer>
      <PageHeader title="Dashboard Ejecutivo" subtitle={`Resumen gerencial de ${condominio.nombre}. Período actual: ${MESES_NOMBRES[mesActual]} ${anioActual}.`} badge="Inicio" icon={Building2} action={<button type="button" onClick={() => cargarDashboard(condominio)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Actualizar</button>} />
      {loading && <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500 shadow-sm">Cargando indicadores gerenciales...</div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Unidades activas" value={totalUnidadesActivas} subtitle={`${totalUnidades} unidades registradas`} icon={Home} tone="blue" />
        <StatCard title="Pagos del mes" value={cantidadPagosMes} subtitle={`Hoy: ${dinero(pagosHoy)}`} icon={CreditCard} tone="green" />
        <StatCard title="Morosidad" value={`${porcentajeMorosidad}%`} subtitle={dinero(morosidadTotal)} icon={AlertTriangle} tone="amber" />
        <StatCard title="Caja chica" value={dinero(disponibleCajaChica)} subtitle="Disponible actual" icon={WalletCards} tone={disponibleCajaChica >= 0 ? "green" : "red"} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Ingresos del mes" value={dinero(ingresosMes)} subtitle={`Año ${anioActual}: ${dinero(ingresosAnio)}`} icon={Banknote} tone="green" />
        <StatCard title="Gastos del mes" value={dinero(gastosMes)} subtitle={`Año ${anioActual}: ${dinero(gastosAnio)}`} icon={ClipboardList} tone="red" />
        <StatCard title="Balance operativo" value={dinero(balanceOperativoMes)} subtitle="Ingresos menos gastos" icon={BarChart3} tone={balanceOperativoMes >= 0 ? "blue" : "red"} />
        <StatCard title="Balance banco" value={dinero(balanceBanco)} subtitle={`${cuentas.length} cuenta(s) activa(s)`} icon={Building2} tone="slate" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard title="Estado de cobros del mes" subtitle="Cargos, cobros y balances pendientes del período actual." action={<Link href="/estado-cuenta/propietarios" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">Ver estado</Link>}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><SmallStat label="Cargos generados" value={dinero(cargosMes)} detail="Monto facturado" /><SmallStat label="Cobrado" value={dinero(cobradoMes)} detail={`${porcCobroMes}% cobrado`} /><SmallStat label="Pendiente" value={dinero(pendienteMes)} detail="Balance por cobrar" /></div>
          <div className="mt-6"><div className="mb-2 flex justify-between text-sm"><span className="font-bold text-slate-700">Avance de cobro mensual</span><span className="font-black text-slate-900">{porcCobroMes}%</span></div><div className="h-4 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${porcCobroMes}%` }} /></div></div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3"><AlertBox title="Unidades al día" value={String(unidadesAlDia)} tone="green" /><AlertBox title="Unidades con deuda" value={String(unidadesConDeuda)} tone="red" /><AlertBox title="Morosidad total" value={dinero(morosidadTotal)} tone="orange" /></div>
        </SectionCard>
        <SectionCard title="Pendientes de acción" subtitle="Procesos que requieren seguimiento."><div className="space-y-3"><PendingRow label="Aprobación tesorero" value={pendienteTesorero} href="/gastos" /><PendingRow label="Aprobación presidente" value={pendientePresidente} href="/gastos" /><PendingRow label="Pendiente tesorería" value={pendienteTesoreria} href="/gastos" /><PendingRow label="Solicitudes de pago" value={solicitudesPendientes} href="/solicitudes-pago" /><PendingRow label="Incidencias abiertas" value={incidenciasAbiertas} href="/incidencias" /></div></SectionCard>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard title="Fondos bancarios" subtitle="Distribución de fondos disponibles."><div className="space-y-4"><FundBar label="Fondo ordinario" value={fondoOrdinario} total={balanceBanco} /><FundBar label="Fondo extraordinario" value={fondoExtraordinario} total={balanceBanco} /><FundBar label="Fondo reserva" value={fondoReserva} total={balanceBanco} /></div></SectionCard>
        <SectionCard title="Caja chica" subtitle="Resumen de fondo, gastos y disponible."><div className="grid grid-cols-1 gap-3"><SmallStat label="Fondos / reposiciones" value={dinero(cajaChicaFondos)} /><SmallStat label="Gastos caja chica" value={dinero(cajaChicaGastos)} /><SmallStat label="Disponible" value={dinero(disponibleCajaChica)} detail="Fondos menos gastos" /></div><Link href="/finanzas/caja-chica" className="mt-4 block rounded-xl bg-amber-500 px-4 py-3 text-center font-black text-white hover:bg-amber-600">Ver caja chica</Link></SectionCard>
        <SectionCard title="Accesos rápidos" subtitle="Operaciones principales de administración."><div className="grid grid-cols-1 gap-3"><QuickLink href="/pagos-mantenimiento" label="Registrar pago" icon="💳" /><QuickLink href="/gastos" label="Registrar gasto" icon="🧾" /><QuickLink href="/solicitudes-pago" label="Solicitud de pago" icon="✅" /><QuickLink href="/estado-cuenta/propietarios" label="Estado de cuenta" icon="📄" /><QuickLink href="/mobile/admin/banco/importar" label="Importar banco" icon="🏦" /></div></SectionCard>
      </div>
      <SectionCard title="Cuentas bancarias activas" subtitle="Balances registrados por cuenta." action={<Link href="/finanzas/configuraciones/bancos" className="text-sm font-bold text-blue-700 hover:underline">Configurar bancos</Link>}>
        {cuentas.length === 0 ? <EmptyState title="Sin cuentas bancarias" description="No hay cuentas bancarias activas configuradas." /> : <DataTable><thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3 text-left">Banco</th><th className="px-4 py-3 text-left">Cuenta</th><th className="px-4 py-3 text-right">Ordinario</th><th className="px-4 py-3 text-right">Extraordinario</th><th className="px-4 py-3 text-right">Reserva</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody className="divide-y divide-slate-200">{cuentas.map((cuenta) => <tr key={cuenta.id} className="bg-white hover:bg-slate-50"><td className="px-4 py-3 font-bold">{cuenta.nombre_banco || "-"}</td><td className="px-4 py-3">{cuenta.numero_cuenta || "-"}</td><td className="px-4 py-3 text-right">{dinero(cuenta.fondo_ordinario)}</td><td className="px-4 py-3 text-right">{dinero(cuenta.fondo_extraordinario)}</td><td className="px-4 py-3 text-right">{dinero(cuenta.fondo_reserva)}</td><td className="px-4 py-3 text-right font-black text-blue-700">{dinero(cuenta.balance_actual)}</td></tr>)}</tbody></DataTable>}
      </SectionCard>
    </PageContainer>
  );
}

function SmallStat({ label, value, detail }: { label: string; value: string; detail?: string }) { return <div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-800">{value}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</div>; }
function AlertBox({ title, value, tone }: { title: string; value: string; tone: "green" | "red" | "orange" }) { const tones: Record<string, string> = { green: "border-green-100 bg-green-50 text-green-700", red: "border-red-100 bg-red-50 text-red-700", orange: "border-orange-100 bg-orange-50 text-orange-700" }; return <div className={`${tones[tone]} rounded-2xl border p-4`}><p className="text-xs font-bold uppercase">{title}</p><p className="mt-1 text-2xl font-black">{value}</p></div>; }
function PendingRow({ label, value, href }: { label: string; value: number; href: string }) { return <Link href={href} className="flex items-center justify-between rounded-2xl border bg-slate-50 p-4 transition hover:bg-slate-100"><span className="font-bold text-slate-700">{label}</span><span className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-black ${value > 0 ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>{value}</span></Link>; }
function QuickLink({ href, label, icon }: { href: string; label: string; icon: string }) { return <Link href={href} className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white transition hover:bg-slate-800"><span className="text-xl">{icon}</span><span>{label}</span></Link>; }
function FundBar({ label, value, total }: { label: string; value: number; total: number }) { const porcentaje = total > 0 ? Math.round((Number(value || 0) / total) * 100) : 0; return <div><div className="mb-1 flex justify-between text-sm"><span className="font-bold text-slate-700">{label}</span><span className="font-black text-slate-900">RD$ {Number(value || 0).toLocaleString("es-DO")}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.min(100, porcentaje)}%` }} /></div><p className="mt-1 text-xs text-slate-500">{porcentaje}% del balance</p></div>; }
