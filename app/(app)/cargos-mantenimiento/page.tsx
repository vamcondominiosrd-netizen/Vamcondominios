"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, CircleDollarSign, Clock3, FilePlus2, RefreshCw, Search, ShieldAlert, Users, Wallet } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";
import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import ActionBar from "@/components/vam/enterprise/ActionBar";

type Unidad = { id: number; codigo: string; cuota_mensual_actual: number | null };
type Configuracion = { id: number; condominio_id: number; cuota_ordinaria: number; dia_limite_pago: number; dia_inicio_mora: number; porcentaje_mora: number; mora_activa: boolean; activa: boolean };
type Cargo = { id: number; condominio_id: number; unidad_id: number; periodo: string; concepto: string; tipo_cargo: string; monto: number; monto_pagado: number; balance: number; estado: string };
const TIPOS_ORDINARIOS = ["ORDINARIO", "MANTENIMIENTO", "MANT"];
const VERSION = "1.3.0";
const dinero = (n: number | null | undefined) => Number(n || 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const periodoActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const validoPeriodo = (p: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(p);

export default function CargoMantenimientoPage() {
  const router = useRouter();
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [periodo, setPeriodo] = useState(periodoActual);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [buscar, setBuscar] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    if (!id) { router.push("/login"); return; }
    setCondominioId(id);
    setCondominioNombre(localStorage.getItem("condominio_nombre") || `Condominio ID ${id}`);
    void cargarTodo(id);
  }, [router]);

  async function cargarTodo(id: string) {
    setBusy(true); setMensaje(""); setErrorCarga(false);
    try {
      const [rConf, rUni, rCargos] = await Promise.all([
        supabase.from("configuracion_cargos").select("id,condominio_id,cuota_ordinaria,dia_limite_pago,dia_inicio_mora,porcentaje_mora,mora_activa,activa").eq("condominio_id", Number(id)).eq("activa", true).maybeSingle(),
        supabase.from("unidades").select("id,codigo,cuota_mensual_actual").eq("condominio_id", Number(id)).eq("activa", true).order("codigo"),
        supabase.from("cargos_periodicos").select("id,condominio_id,unidad_id,periodo,concepto,tipo_cargo,monto,monto_pagado,balance,estado").eq("condominio_id", Number(id)).order("periodo", { ascending: false }).order("id", { ascending: false }).limit(3000),
      ]);
      const err = rConf.error || rUni.error || rCargos.error;
      if (err) throw err;
      setConfiguracion(rConf.data as Configuracion | null);
      setUnidades((rUni.data || []) as Unidad[]);
      setCargos((rCargos.data || []) as Cargo[]);
    } catch (e) {
      setErrorCarga(true);
      setMensaje(`No se pudieron cargar todos los datos: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(false); }
  }

  const mapaUnidades = useMemo(() => new Map(unidades.map(u => [u.id, u.codigo])), [unidades]);
  const cargosPeriodo = useMemo(() => cargos.filter(c => c.periodo === periodo), [cargos, periodo]);
  const cargosOrdinarios = useMemo(() => cargosPeriodo.filter(c => TIPOS_ORDINARIOS.includes(String(c.tipo_cargo).toUpperCase())), [cargosPeriodo]);
  const totalFacturado = cargosPeriodo.reduce((s, c) => s + Number(c.monto || 0), 0);
  const totalPagado = cargosPeriodo.reduce((s, c) => s + Number(c.monto_pagado || 0), 0);
  const totalBalance = cargosPeriodo.reduce((s, c) => s + Number(c.balance || 0), 0);
  const pendientes = cargosPeriodo.filter(c => Number(c.balance || 0) > 0).length;
  const totalPrevisto = unidades.reduce((s, u) => s + Number(u.cuota_mensual_actual ?? configuracion?.cuota_ordinaria ?? 0), 0);
  const invalidas = unidades.filter(u => !Number.isFinite(Number(u.cuota_mensual_actual ?? configuracion?.cuota_ordinaria)) || Number(u.cuota_mensual_actual ?? configuracion?.cuota_ordinaria) <= 0).length;
  const cargosVisibles = cargosPeriodo.filter(c => {
    const match = `${mapaUnidades.get(c.unidad_id) || c.unidad_id} ${c.concepto} ${c.estado} ${c.tipo_cargo}`.toLowerCase().includes(buscar.trim().toLowerCase());
    return match && (!soloPendientes || Number(c.balance || 0) > 0);
  });

  async function generarCargos() {
    if (!condominioId || busy || errorCarga || !configuracion || !validoPeriodo(periodo)) { setMensaje("Verifique el condominio, la configuración y el período."); return; }
    setBusy(true); setMensaje("");
    try {
      // Leer nuevamente del servidor: nunca confiar en la vista previa en caché.
      const [rUni, rExist] = await Promise.all([
        supabase.from("unidades").select("id,codigo,cuota_mensual_actual").eq("condominio_id", Number(condominioId)).eq("activa", true),
        supabase.from("cargos_periodicos").select("id,unidad_id,tipo_cargo").eq("condominio_id", Number(condominioId)).eq("periodo", periodo).limit(1000),
      ]);
      if (rUni.error || rExist.error) throw rUni.error || rExist.error;
      const existentes = (rExist.data || []).filter(c => TIPOS_ORDINARIOS.includes(String(c.tipo_cargo || "").trim().toUpperCase()));
      if (existentes.length) { setMensaje(`Generación bloqueada: ya existen ${existentes.length} cargos ordinarios/mantenimiento para ${periodo}. No se modificó nada.`); return; }
      const actuales = (rUni.data || []) as Unidad[];
      const cuotas = actuales.map(u => ({ ...u, importe: Number(u.cuota_mensual_actual ?? configuracion.cuota_ordinaria) }));
      if (!cuotas.length || cuotas.some(u => !Number.isFinite(u.importe) || u.importe <= 0)) throw new Error("Existen unidades sin una cuota válida.");
      const total = cuotas.reduce((s, u) => s + u.importe, 0);
      if (Number(condominioId) === 24) {
        const especiales = cuotas.filter(u => ["G1", "G2", "G3", "G4"].includes(u.codigo.trim().toUpperCase()) && u.importe === 5000);
        const generales = cuotas.filter(u => !["G1", "G2", "G3", "G4"].includes(u.codigo.trim().toUpperCase()) && u.importe === 5500);
        if (cuotas.length !== 28 || especiales.length !== 4 || generales.length !== 24 || total !== 152000) {
          throw new Error("Don Juan I: cuotas diferentes a las 28 unidades y RD$152,000 esperados. Operación cancelada.");
        }
      }
      const aceptado = window.confirm(`CONFIRMAR GENERACIÓN REAL\n\nCondominio: ${condominioNombre}\nPeríodo: ${periodo}\nApartamentos: ${cuotas.length}\nTotal: RD$ ${dinero(total)}\n\nEsta acción creará cargos financieros y puede aplicar créditos existentes. ¿Continuar?`);
      if (!aceptado) return;
      const [anio, mes] = periodo.split("-").map(Number);
      const registros = cuotas.map(u => ({ condominio_id: Number(condominioId), unidad_id: u.id, anio, mes, periodo, concepto: `Mantenimiento ${periodo}`, tipo_cargo: "ORDINARIO", monto: u.importe, monto_pagado: 0, balance: u.importe, estado: "PENDIENTE" }));
      const insert = await supabase.from("cargos_periodicos").insert(registros);
      if (insert.error) throw insert.error;
      const credito = await supabase.rpc("aplicar_creditos_a_cargos", { p_condominio_id: Number(condominioId) });
      setMensaje(credito.error
        ? `Se crearon ${cuotas.length} cargos por RD$ ${dinero(total)}, PERO falló la aplicación de créditos: ${credito.error.message}. No vuelva a generar; revise los créditos.`
        : `Se crearon ${cuotas.length} cargos por RD$ ${dinero(total)}. Verifique los balances actualizados.`);
      await cargarTodo(condominioId);
      if (credito.error) setMensaje(`Cargos creados; aplicación de créditos fallida: ${credito.error.message}. No vuelva a generar.`);
      else setMensaje(`Cargos generados: ${cuotas.length} apartamentos, RD$ ${dinero(total)} (${periodo}).`);
    } catch (e) { setMensaje(`Operación no completada: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  }

  async function aplicarMora() {
    if (!configuracion?.mora_activa) { setMensaje("La mora está desactivada para este condominio."); return; }
    if (busy || errorCarga || !validoPeriodo(periodo)) return;
    setBusy(true); setMensaje("");
    try {
      const { data, error } = await supabase.from("cargos_periodicos")
        .select("id,unidad_id,tipo_cargo,monto,balance,estado").eq("condominio_id", Number(condominioId)).eq("periodo", periodo);
      if (error) throw error;
      const rows = data || [];
      if (rows.some(c => String(c.tipo_cargo).toUpperCase() === "MORA")) { setMensaje("Ya existe mora para este período. No se duplicará."); return; }
      const base = rows.filter(c => TIPOS_ORDINARIOS.includes(String(c.tipo_cargo).toUpperCase()) && Number(c.balance || 0) > 0);
      if (!base.length) { setMensaje("No hay cargos ordinarios pendientes para aplicar mora."); return; }
      const porcentaje = Number(configuracion.porcentaje_mora);
      if (!Number.isFinite(porcentaje) || porcentaje <= 0) throw new Error("Porcentaje de mora inválido.");
      if (!window.confirm(`¿Crear mora de ${porcentaje}% para ${base.length} cargos pendientes del período ${periodo}?`)) return;
      const [anio, mes] = periodo.split("-").map(Number);
      const insert = await supabase.from("cargos_periodicos").insert(base.map(c => {
        const monto = Math.round(Number(c.monto) * porcentaje) / 100;
        return { condominio_id: Number(condominioId), unidad_id: c.unidad_id, anio, mes, periodo, concepto: `Mora ${periodo}`, tipo_cargo: "MORA", monto, monto_pagado: 0, balance: monto, estado: "PENDIENTE" };
      }));
      if (insert.error) throw insert.error;
      await cargarTodo(condominioId);
      setMensaje(`Mora registrada para ${base.length} cargos de ${periodo}.`);
    } catch (e) { setMensaje(`Error aplicando mora: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  }

  return (
    <PageContainer>
      <PageHeader title="Cargo Mantenimiento" subtitle={`Generación y consulta de cargos del condominio activo · Versión ${VERSION}`} badge="Finanzas" icon={CalendarDays}
        action={<button type="button" disabled={busy} onClick={() => void cargarTodo(condominioId)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Actualizar</button>} />
      <div className="text-sm font-semibold text-blue-700">Condominio activo: {condominioNombre || "Sin seleccionar"}</div>
      {mensaje && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{mensaje}</div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Cargos del período" value={cargosPeriodo.length} subtitle={periodo} icon={Users} tone="blue" />
        <StatCard title="Total facturado" value={`RD$ ${dinero(totalFacturado)}`} subtitle="Todos los tipos" icon={CircleDollarSign} tone="amber" />
        <StatCard title="Total pagado" value={`RD$ ${dinero(totalPagado)}`} subtitle="Aplicado a cargos" icon={CheckCircle2} tone="green" />
        <StatCard title="Balance pendiente" value={`RD$ ${dinero(totalBalance)}`} subtitle={`${pendientes} cargos con balance`} icon={Wallet} tone="red" />
      </div>
      <SectionCard title="Configuración y generación" subtitle="Las cuotas individuales tienen prioridad sobre la cuota general. La vista previa no genera movimientos.">
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl border bg-slate-50 p-3"><p className="text-slate-500">Cuota general</p><p className="font-bold">RD$ {dinero(configuracion?.cuota_ordinaria)}</p></div>
          <div className="rounded-xl border bg-slate-50 p-3"><p className="text-slate-500">Límite de pago</p><p className="font-bold">Día {configuracion?.dia_limite_pago ?? "-"}</p></div>
          <div className="rounded-xl border bg-slate-50 p-3"><p className="text-slate-500">Inicio de mora</p><p className="font-bold">Día {configuracion?.dia_inicio_mora ?? "-"}</p></div>
          <div className="rounded-xl border bg-slate-50 p-3"><p className="text-slate-500">Mora</p><p className="font-bold">{configuracion?.mora_activa ? `${configuracion.porcentaje_mora}% activa` : "Desactivada"}</p></div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">Período<input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm"><p className="text-blue-700">Vista previa de cuotas</p><p className="text-xl font-black text-blue-900">RD$ {dinero(totalPrevisto)}</p><p className="text-xs text-blue-700">{unidades.length} unidades · {invalidas} cuotas inválidas</p></div>
          <div className="flex flex-col justify-end gap-2"><button type="button" disabled={busy || errorCarga || !configuracion || invalidas > 0 || unidades.length === 0 || cargosOrdinarios.length > 0} onClick={() => void generarCargos()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"><FilePlus2 className="h-4 w-4" /> Generar cargos</button><button type="button" disabled={busy || errorCarga || !configuracion?.mora_activa} onClick={() => void aplicarMora()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50"><Clock3 className="h-4 w-4" /> Aplicar mora</button></div>
        </div>
        {cargosOrdinarios.length > 0 && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-700"><ShieldAlert className="h-4 w-4" /> Ya hay {cargosOrdinarios.length} cargos ordinarios para {periodo}. Generación bloqueada.</p>}
        <p className="mt-3 text-xs text-slate-500">La generación crea cargos reales y ejecuta la aplicación de créditos. Revise la vista previa y confirme únicamente en el período correcto.</p>
      </SectionCard>
      <SectionCard title="Listado de cargos" subtitle={`Consulta de cargos de ${condominioNombre || "condominio activo"} · ${periodo}`}>
        <ActionBar search={buscar} onSearch={setBuscar} placeholder="Buscar apartamento, concepto o estado...">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={soloPendientes} onChange={e => setSoloPendientes(e.target.checked)} /> Solo con balance</label>
          <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"><Search className="mr-1 inline h-3 w-3" /> {cargosVisibles.length} registros</span>
        </ActionBar>
        <div className="mt-4 overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-slate-100 text-slate-700"><tr>{["Apartamento", "Período", "Concepto", "Tipo", "Monto", "Pagado", "Balance", "Estado"].map(h => <th key={h} className="whitespace-nowrap px-4 py-3 text-left">{h}</th>)}</tr></thead><tbody className="divide-y">{cargosVisibles.map(c => <tr key={c.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold">{mapaUnidades.get(c.unidad_id) || `Unidad ${c.unidad_id}`}</td><td className="px-4 py-3">{c.periodo}</td><td className="px-4 py-3">{c.concepto}</td><td className="px-4 py-3">{c.tipo_cargo}</td><td className="whitespace-nowrap px-4 py-3 text-right">RD$ {dinero(c.monto)}</td><td className="whitespace-nowrap px-4 py-3 text-right text-green-700">RD$ {dinero(c.monto_pagado)}</td><td className="whitespace-nowrap px-4 py-3 text-right font-bold text-red-700">RD$ {dinero(c.balance)}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{c.estado}</span></td></tr>)}{!cargosVisibles.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No hay cargos para mostrar en este período.</td></tr>}</tbody></table></div>
      </SectionCard>
    </PageContainer>
  );
}
