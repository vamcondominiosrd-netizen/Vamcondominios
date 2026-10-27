"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import RoleGuard from "../../RoleGuard";
import { supabase } from "@/app/lib/supabaseClient";

type Cuenta = {
  id: number; condominio_id: number; nombre_banco: string | null;
  numero_cuenta: string | null; tipo_cuenta: string | null;
  moneda: string | null; fondo_inicial: number | null;
  balance_actual: number | null; fondo_ordinario: number | null;
  fondo_extraordinario: number | null; fondo_reserva: number | null;
  fondo_tipo: string | null; activa: boolean | null; created_at: string | null;
};
type Formulario = {
  nombre_banco: string; numero_cuenta: string; tipo_cuenta: string;
  moneda: string; fondo_tipo: string; activa: boolean;
  fondo_inicial: string; balance_actual: string; fondo_ordinario: string;
  fondo_extraordinario: string; fondo_reserva: string;
};
const vacio = (): Formulario => ({ nombre_banco: "", numero_cuenta: "", tipo_cuenta: "CORRIENTE", moneda: "DOP", fondo_tipo: "ORDINARIO", activa: true, fondo_inicial: "0", balance_actual: "0", fondo_ordinario: "0", fondo_extraordinario: "0", fondo_reserva: "0" });
const camposMonetarios = ["fondo_inicial", "balance_actual", "fondo_ordinario", "fondo_extraordinario", "fondo_reserva"] as const;
const dinero = (n: number | null | undefined, moneda = "DOP") => `${moneda === "USD" ? "US$" : "RD$"} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const roles = ["Super Admin", "Administrador", "Administrador General", "Administrador Condominio", "Administrador de Condominio", "Tesorero"];

export default function CuentasBancariasPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominioNombre, setCondominioNombre] = useState("");
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("TODAS");
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState<Formulario>(vacio());
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const cargar = useCallback(async (id: number) => {
    setCargando(true); setError("");
    const { data, error: err } = await supabase.from("cuentas_bancarias")
      .select("id,condominio_id,nombre_banco,numero_cuenta,tipo_cuenta,moneda,fondo_inicial,balance_actual,fondo_ordinario,fondo_extraordinario,fondo_reserva,fondo_tipo,activa,created_at")
      .eq("condominio_id", id).order("id", { ascending: true });
    if (err) setError(`No se pudieron consultar las cuentas: ${err.message}`);
    else setCuentas((data ?? []) as Cuenta[]);
    setCargando(false);
  }, []);

  useEffect(() => {
    const valor = window.localStorage.getItem("condominio_id");
    const id = Number(valor);
    setCondominioNombre(window.localStorage.getItem("condominio_nombre") || "Condominio no seleccionado");
    if (!valor || !Number.isSafeInteger(id) || id <= 0) {
      setError("Seleccione primero un condominio desde el menú principal.");
      setCargando(false); return;
    }
    setCondominioId(id); void cargar(id);
  }, [cargar]);

  const filtradas = useMemo(() => cuentas.filter(c => {
    const texto = `${c.nombre_banco ?? ""} ${c.numero_cuenta ?? ""} ${c.tipo_cuenta ?? ""}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase()) && (filtro === "TODAS" || (filtro === "ACTIVAS" ? c.activa === true : c.activa !== true));
  }), [cuentas, busqueda, filtro]);
  const activas = cuentas.filter(c => c.activa).length;
  const monedas = [...new Set(cuentas.map(c => c.moneda || "DOP"))];
  const balances = monedas.map(moneda => ({ moneda, total: cuentas.filter(c => (c.moneda || "DOP") === moneda).reduce((a, c) => a + Number(c.balance_actual ?? 0), 0) }));

  function editar(c: Cuenta) {
    setEditando(c.id); setMostrarFormulario(true); setError(""); setExito("");
    setForm({ nombre_banco: c.nombre_banco || "", numero_cuenta: c.numero_cuenta || "", tipo_cuenta: c.tipo_cuenta || "", moneda: c.moneda || "DOP", fondo_tipo: c.fondo_tipo || "ORDINARIO", activa: c.activa === true,
      fondo_inicial: String(c.fondo_inicial ?? 0), balance_actual: String(c.balance_actual ?? 0), fondo_ordinario: String(c.fondo_ordinario ?? 0), fondo_extraordinario: String(c.fondo_extraordinario ?? 0), fondo_reserva: String(c.fondo_reserva ?? 0) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function nuevo() { setEditando(null); setForm(vacio()); setError(""); setExito(""); setMostrarFormulario(true); }
  function cancelar() { setEditando(null); setForm(vacio()); setMostrarFormulario(false); }
  function actualizar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) { setForm(prev => ({ ...prev, [campo]: valor })); }

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!condominioId || guardando) return;
    setError(""); setExito("");
    if (!form.nombre_banco.trim() || !form.numero_cuenta.trim()) { setError("El banco y el número de cuenta son obligatorios."); return; }
    const duplicada = cuentas.some(c => c.id !== editando && (c.numero_cuenta || "").trim() === form.numero_cuenta.trim() && (c.nombre_banco || "").trim().toLowerCase() === form.nombre_banco.trim().toLowerCase());
    if (duplicada) { setError("Esta cuenta ya está registrada en el condominio."); return; }
    const datosBase = { nombre_banco: form.nombre_banco.trim(), numero_cuenta: form.numero_cuenta.trim(), tipo_cuenta: form.tipo_cuenta.trim() || null, moneda: form.moneda, fondo_tipo: form.fondo_tipo, activa: form.activa };
    let datos: Record<string, unknown> = { ...datosBase };
    if (!editando) {
      for (const campo of camposMonetarios) {
        const numero = Number(form[campo]);
        if (!Number.isFinite(numero) || numero < 0) { setError(`Importe inválido en ${campo.replaceAll("_", " ")}.`); return; }
        datos[campo] = numero;
      }
      datos = { ...datos, condominio_id: condominioId };
      // Los fondos de apertura deben ser consistentes cuando se declaren.
      const suma = Number(datos.fondo_ordinario) + Number(datos.fondo_extraordinario) + Number(datos.fondo_reserva);
      if (Math.abs(suma - Number(datos.balance_actual)) > 0.01) {
        setError("El balance inicial debe coincidir con la suma de fondos ordinario, extraordinario y reserva."); return;
      }
    }
    setGuardando(true);
    try {
      if (editando) {
        const { data, error: err } = await supabase.from("cuentas_bancarias").update(datos)
          .eq("id", editando).eq("condominio_id", condominioId).select("id");
        if (err) throw err;
        if (!data?.length) throw new Error("No se actualizó la cuenta. Verifique permisos y políticas de seguridad.");
      } else {
        const { data, error: err } = await supabase.from("cuentas_bancarias").insert(datos).select("id");
        if (err) throw err;
        if (!data?.length) throw new Error("No se confirmó el registro. Verifique permisos y políticas de seguridad.");
      }
      setExito(editando ? "Datos generales actualizados. Los saldos permanecen intactos." : "Cuenta bancaria registrada correctamente.");
      cancelar(); await cargar(condominioId);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String((e as { message?: string })?.message || "Error desconocido")); }
    finally { setGuardando(false); }
  }

  async function cambiarEstado(c: Cuenta) {
    if (!condominioId || guardando) return;
    if (!window.confirm(`¿${c.activa ? "Inactivar" : "Activar"} la cuenta ${c.nombre_banco} · ${c.numero_cuenta}?`)) return;
    setGuardando(true); setError(""); setExito("");
    const { data, error: err } = await supabase.from("cuentas_bancarias").update({ activa: !c.activa })
      .eq("id", c.id).eq("condominio_id", condominioId).select("id");
    setGuardando(false);
    if (err) setError(err.message);
    else if (!data?.length) setError("No se actualizó el estado. Verifique permisos.");
    else { setExito("Estado actualizado correctamente."); await cargar(condominioId); }
  }

  return <RoleGuard roles={roles}>
    <main className="space-y-6 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Finanzas / Banco</p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Cuentas bancarias y fondos</h1>
          <p className="mt-1 text-sm text-slate-500">Registro maestro de cuentas · {condominioNombre}</p>
          <p className="mt-1 text-xs text-slate-400">VAM Condominios · Cuentas Bancarias v1.2.0</p>
        </div>
        <button type="button" onClick={nuevo} disabled={!condominioId} className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">+ Registrar cuenta</button>
      </header>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {exito && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{exito}</div>}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Cuentas registradas" valor={String(cuentas.length)} />
        <Indicador titulo="Cuentas activas" valor={String(activas)} />
        <Indicador titulo="Cuentas inactivas" valor={String(cuentas.length - activas)} />
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Balances por moneda</p>
          {balances.length ? balances.map(b => <p key={b.moneda} className="mt-2 text-lg font-bold text-slate-900">{dinero(b.total, b.moneda)}</p>) : <p className="mt-2 text-xl font-bold">Sin cuentas</p>}
        </div>
      </section>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Control financiero:</strong> los balances y fondos existentes se consultan aquí, pero no se modifican durante la edición de una cuenta. Los ajustes contables deben hacerse mediante el flujo bancario autorizado.
      </div>
      {mostrarFormulario && <section className="rounded-2xl border bg-white p-5 shadow-sm md:p-7">
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-bold">{editando ? `Editar cuenta #${editando}` : "Registrar cuenta bancaria"}</h2><button type="button" onClick={cancelar} className="text-sm font-semibold text-slate-600 hover:text-slate-900">Cerrar</button></div>
        <form onSubmit={guardar} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo titulo="Banco *" valor={form.nombre_banco} cambiar={v => actualizar("nombre_banco", v)} />
            <Campo titulo="Número de cuenta *" valor={form.numero_cuenta} cambiar={v => actualizar("numero_cuenta", v)} />
            <Campo titulo="Tipo de cuenta" valor={form.tipo_cuenta} cambiar={v => actualizar("tipo_cuenta", v)} />
            <label className="block text-sm font-semibold text-slate-700">Moneda<select value={form.moneda} onChange={e => actualizar("moneda", e.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value="DOP">DOP · Peso dominicano</option><option value="USD">USD · Dólar</option></select></label>
            <label className="block text-sm font-semibold text-slate-700">Fondo principal<select value={form.fondo_tipo} onChange={e => actualizar("fondo_tipo", e.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value="ORDINARIO">Ordinario</option><option value="EXTRAORDINARIO">Extraordinario</option><option value="RESERVA">Reserva</option></select></label>
            <label className="block text-sm font-semibold text-slate-700">Estado<select value={form.activa ? "SI" : "NO"} onChange={e => actualizar("activa", e.target.value === "SI")} className="mt-1 w-full rounded-lg border p-3"><option value="SI">Activa</option><option value="NO">Inactiva</option></select></label>
          </div>
          {!editando && <div className="rounded-xl bg-slate-50 p-4"><h3 className="mb-1 font-bold">Saldos de apertura</h3><p className="mb-4 text-xs text-slate-500">Para una cuenta nueva, indique los saldos iniciales verificados. El balance debe coincidir con la suma de los tres fondos.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {camposMonetarios.map(k => <Campo key={k} titulo={k.replaceAll("_", " ")} valor={form[k]} cambiar={v => actualizar(k, v)} tipo="number" />)}
            </div></div>}
          {editando && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Edición limitada a datos generales. No se actualizarán fondo inicial, balance ni distribución de fondos.</p>}
          <div className="flex flex-wrap gap-3"><button type="submit" disabled={guardando} className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white disabled:opacity-50">{guardando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar cuenta"}</button><button type="button" onClick={cancelar} className="rounded-xl border px-6 py-3 font-semibold">Cancelar</button></div>
        </form>
      </section>}
      <section className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Cuentas del condominio</h2><button type="button" onClick={() => condominioId && void cargar(condominioId)} disabled={cargando} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Actualizar lista</button></div>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_190px]"><input aria-label="Buscar cuenta" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar banco o número de cuenta…" className="rounded-lg border p-3"/><select aria-label="Filtrar estado" value={filtro} onChange={e => setFiltro(e.target.value)} className="rounded-lg border p-3"><option value="TODAS">Todas</option><option value="ACTIVAS">Activas</option><option value="INACTIVAS">Inactivas</option></select></div>
        <div className="overflow-x-auto rounded-xl border"><table className="min-w-[920px] w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">Banco / Cuenta</th><th className="p-3">Tipo / Moneda</th><th className="p-3 text-right">Balance</th><th className="p-3 text-right">Ordinario</th><th className="p-3 text-right">Extraordinario</th><th className="p-3 text-right">Reserva</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
          <tbody>{filtradas.map(c => <tr key={c.id} className="border-t hover:bg-slate-50"><td className="p-3"><p className="font-bold">{c.nombre_banco || "—"}</p><p className="font-mono text-xs text-slate-500">{c.numero_cuenta || "—"}</p></td><td className="p-3">{c.tipo_cuenta || "—"}<p className="text-xs text-slate-500">{c.moneda || "DOP"} · {c.fondo_tipo || "—"}</p></td><td className="p-3 text-right font-bold">{dinero(c.balance_actual, c.moneda || "DOP")}</td><td className="p-3 text-right">{dinero(c.fondo_ordinario, c.moneda || "DOP")}</td><td className="p-3 text-right">{dinero(c.fondo_extraordinario, c.moneda || "DOP")}</td><td className="p-3 text-right">{dinero(c.fondo_reserva, c.moneda || "DOP")}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${c.activa ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"}`}>{c.activa ? "Activa" : "Inactiva"}</span></td><td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => editar(c)} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Editar</button><button type="button" onClick={() => void cambiarEstado(c)} disabled={guardando} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50">{c.activa ? "Inactivar" : "Activar"}</button></div></td></tr>)}
          {!cargando && !filtradas.length && <tr><td colSpan={8} className="p-8 text-center text-slate-500">{cuentas.length ? "No hay resultados con estos filtros." : "No hay cuentas registradas para este condominio."}</td></tr>}
          {cargando && <tr><td colSpan={8} className="p-8 text-center text-slate-500">Cargando cuentas bancarias…</td></tr>}</tbody></table></div>
        <p className="mt-3 text-xs text-slate-500">Los totales se muestran por moneda; no se mezclan pesos y dólares. Fuente: cuentas_bancarias.</p>
      </section>
    </main>
  </RoleGuard>;
}
function Indicador({ titulo, valor }: { titulo: string; valor: string }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{titulo}</p><p className="mt-2 text-3xl font-black text-slate-900">{valor}</p></div>; }
function Campo({ titulo, valor, cambiar, tipo = "text" }: { titulo: string; valor: string; cambiar: (v: string) => void; tipo?: string }) { return <label className="block text-sm font-semibold capitalize text-slate-700">{titulo}<input type={tipo} min={tipo === "number" ? "0" : undefined} step={tipo === "number" ? "0.01" : undefined} value={valor} onChange={e => cambiar(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>; }
