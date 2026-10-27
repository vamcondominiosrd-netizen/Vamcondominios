"use client";
/* VAM Condominios · Gas / Importaciones · v1.0.2
   Fase 1: lectura, conciliación y vista previa. NO escribe en Supabase.
   Requiere: npm install xlsx
*/
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Fila = {
  fila: number; condominio_id: number; periodo: string; unidad_codigo: string;
  propietario_referencia: string; tanque_id: number | null; unidad_id: number | null; medidor_id: number | null; fecha_lectura_anterior: string; fecha_lectura: string;
  lectura_anterior_m3: number; lectura_actual_m3: number; factor: number;
  precio_gls_rd: number; importe_original_rd: number;
};
type Medidor = { id: number; unidad_id: number; lectura_inicial: number; fecha_lectura_inicial: string; codigo: string };
type Resultado = { errores: string[]; avisos: string[]; medidor?: Medidor; consumoM3: number; consumoGls: number; calculado: number };
const VERSION = "1.0.2";
const N = (v: unknown) => typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, ""));
const dinero = (v: number) => v.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : s;
};
const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function GasImportacionesPage() {
  const [id, setId] = useState(0);
  const [nombre, setNombre] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [medidores, setMedidores] = useState<Medidor[]>([]);
  const [tanques, setTanques] = useState<{id:number;nombre:string}[]>([]);
  const [existentes, setExistentes] = useState<{medidor_id:number; periodo:string; fecha_lectura:string}[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [archivo, setArchivo] = useState("");
  const [totalReferencia, setTotalReferencia] = useState<number | null>(null);

  useEffect(() => {
    const activo = Number(localStorage.getItem("condominio_id") || 0);
    setId(activo);
    setNombre(localStorage.getItem("condominio_nombre") || "");
    if (!Number.isSafeInteger(activo) || activo <= 0) { setError("Seleccione un condominio válido."); return; }
    void consultar(activo);
  }, []);

  async function consultar(condominio: number) {
    setCargando(true); setError("");
    try {
      const config = await supabase.from("gas_configuracion").select("modalidad").eq("condominio_id", condominio).maybeSingle();
      if (config.error) throw config.error;
      const mod = config.data?.modalidad || "";
      setModalidad(mod);
      if (mod !== "CON_MEDIDORES") throw new Error("Este condominio no tiene activa la modalidad CON_MEDIDORES.");
      const [m, l, t] = await Promise.all([
        supabase.from("gas_medidores").select("id,unidad_id,lectura_inicial,fecha_lectura_inicial,unidades(codigo)").eq("condominio_id",condominio).eq("estado","Activo"),
        supabase.from("gas_lecturas").select("medidor_id,periodo,fecha_lectura").eq("condominio_id",condominio),
        supabase.from("gas_tanques").select("id,nombre").eq("condominio_id",condominio)
      ]);
      if (m.error) throw m.error;
      if (l.error) throw l.error;
      if (t.error) throw t.error;
      setTanques((t.data || []).map((x:any)=>({id:Number(x.id),nombre:String(x.nombre)})));
      setMedidores((m.data || []).map((x: any) => ({id:Number(x.id), unidad_id:Number(x.unidad_id), lectura_inicial:Number(x.lectura_inicial), fecha_lectura_inicial:String(x.fecha_lectura_inicial || ""), codigo:String((Array.isArray(x.unidades) ? x.unidades[0]?.codigo : x.unidades?.codigo) || "").trim().toUpperCase()})));
      setExistentes((l.data || []).map((x: any) => ({medidor_id:Number(x.medidor_id), periodo:String(x.periodo).slice(0,7), fecha_lectura:String(x.fecha_lectura)})));
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setCargando(false); }
  }

  async function cargarExcel(file?: File) {
    if (!file) return;
    setError(""); setFilas([]); setTotalReferencia(null); setArchivo(file.name);
    try {
      const XLSX = await import("xlsx");
      const libro = XLSX.read(await file.arrayBuffer(), {type:"array", cellDates:false});
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const registros = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {defval:""});
      const obligatorios = ["condominio_id","periodo","unidad_codigo","fecha_lectura_anterior","fecha_lectura","lectura_anterior_m3","lectura_actual_m3","factor","precio_gls_rd","importe_original_rd"];
      if (!registros.length || obligatorios.some(k => !(k in registros[0]))) throw new Error("La primera hoja no contiene todas las columnas de la plantilla VAM.");
      const datos = registros.filter(x => String(x.unidad_codigo || "").trim()).map((x,i) => ({
        fila:i+2, condominio_id:N(x.condominio_id), periodo:String(x.periodo).slice(0,7),
        unidad_codigo:String(x.unidad_codigo).trim().toUpperCase(), propietario_referencia:String(x.propietario_referencia || ""),
        tanque_id: x.tanque_id === "" || x.tanque_id == null ? null : N(x.tanque_id),
        unidad_id: typeof x.unidad_id === "number" ? x.unidad_id : null,
        medidor_id: typeof x.medidor_id === "number" ? x.medidor_id : null,
        fecha_lectura_anterior:fecha(x.fecha_lectura_anterior), fecha_lectura:fecha(x.fecha_lectura),
        lectura_anterior_m3:N(x.lectura_anterior_m3), lectura_actual_m3:N(x.lectura_actual_m3),
        factor:N(x.factor), precio_gls_rd:N(x.precio_gls_rd), importe_original_rd:N(x.importe_original_rd)
      }));
      setFilas(datos);
      const control = libro.Sheets[libro.SheetNames.find(n => n.toLowerCase().includes("control")) || ""];
      if (control) {
        const valor = XLSX.utils.sheet_to_json<any[]>(control,{header:1,defval:""});
        const filaTotal = valor.find(x => String(x[0] || "").toLowerCase().includes("total original"));
        if (filaTotal && Number.isFinite(N(filaTotal[1]))) setTotalReferencia(N(filaTotal[1]));
      }
    } catch (e:any) { setError(e?.message || String(e)); }
  }

  const resultados = useMemo<Resultado[]>(() => filas.map(f => {
    const errores:string[] = []; const avisos:string[] = [];
    const candidatos = medidores.filter(m => m.codigo === f.unidad_codigo);
    const medidor = candidatos.length === 1 ? candidatos[0] : undefined;
    if (f.condominio_id !== id) errores.push("Condominio distinto al seleccionado");
    if (!/^\d{4}-\d{2}$/.test(f.periodo)) errores.push("Período inválido");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.fecha_lectura) || !/^\d{4}-\d{2}-\d{2}$/.test(f.fecha_lectura_anterior)) errores.push("Fecha inválida");
    if (f.fecha_lectura < f.fecha_lectura_anterior) errores.push("Fechas invertidas");
    if (f.fecha_lectura.slice(0,7) !== f.periodo) errores.push("Fecha final no corresponde al período");
    if (f.tanque_id == null) avisos.push("Asignar tanque antes de guardar");
    else if (!tanques.some(t => t.id === f.tanque_id)) errores.push("Tanque no pertenece al condominio");
    if (f.unidad_id !== null && medidor && f.unidad_id !== medidor.unidad_id) errores.push("Unidad ID no coincide con el medidor vinculado");
    if (f.medidor_id !== null && medidor && f.medidor_id !== medidor.id) errores.push("Medidor ID no coincide con el vinculado");
    if (candidatos.length > 1) errores.push("Más de un medidor activo para el apartamento");
    if (candidatos.length === 0) avisos.push(`Medidor provisional ${f.unidad_codigo}: falta vincular el registro en Supabase antes de guardar`);
    if ([f.lectura_anterior_m3,f.lectura_actual_m3,f.factor,f.precio_gls_rd,f.importe_original_rd].some(x=>!Number.isFinite(x))) errores.push("Valores numéricos inválidos");
    if (f.lectura_actual_m3 < f.lectura_anterior_m3 || f.lectura_anterior_m3 < 0) errores.push("Lecturas inconsistentes");
    if (f.factor <= 0 || f.precio_gls_rd < 0 || f.importe_original_rd < 0) errores.push("Factor, precio o importe inválido");
    if (filas.filter(x => x.unidad_codigo === f.unidad_codigo && x.periodo === f.periodo).length > 1) errores.push("Apartamento repetido en el Excel");
    if (medidor) {
      if (existentes.some(x=>x.medidor_id === medidor.id && x.periodo === f.periodo)) errores.push("Ya existe lectura del período");
      if (existentes.some(x=>x.medidor_id === medidor.id && x.fecha_lectura > f.fecha_lectura)) errores.push("Existen lecturas posteriores: requiere migración histórica controlada");
      if (f.fecha_lectura <= medidor.fecha_lectura_inicial) errores.push("La fecha es anterior o igual al inicio del medidor en VAM");
      if (f.fecha_lectura_anterior !== medidor.fecha_lectura_inicial || Math.abs(f.lectura_anterior_m3 - medidor.lectura_inicial) > 0.0001) avisos.push("Lectura base del Excel distinta a la lectura inicial del medidor: revisar histórico");
    }
    const consumoM3 = f.lectura_actual_m3 - f.lectura_anterior_m3;
    const consumoGls = consumoM3 * f.factor;
    const calculado = redondear(consumoGls * f.precio_gls_rd);
    if (Number.isFinite(calculado) && Math.abs(calculado - f.importe_original_rd) > 0.01) avisos.push("Importe histórico diferente al calculado");
    return {errores,avisos,medidor,consumoM3,consumoGls,calculado};
  }),[filas,medidores,existentes,tanques,id]);
  const tanquesPendientes = filas.filter(f => f.tanque_id === null).length;
  const idsPendientes = filas.filter(f => f.medidor_id === null || f.unidad_id === null).length;
  const invalidos = resultados.filter(x=>x.errores.length).length;
  const advertencias = resultados.filter(x=>x.avisos.length).length;
  const total = redondear(filas.reduce((s,f)=>s+(Number.isFinite(f.importe_original_rd)?f.importe_original_rd:0),0));
  const actualizar = (indice:number,campo:keyof Fila,valor:string) => setFilas(actual => actual.map((f,i)=>i===indice ? {...f,[campo]: ["lectura_anterior_m3","lectura_actual_m3","factor","precio_gls_rd","importe_original_rd","tanque_id"].includes(campo)?(valor === "" ? null : Number(valor)):valor}:f));
  return <main className="min-h-screen bg-slate-100 p-4 md:p-6"><div className="mx-auto max-w-7xl space-y-5">
    <section className="rounded-3xl bg-white border p-6 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm font-bold text-blue-700">VAM CONDOMINIOS · GAS</p><h1 className="text-3xl font-black">Importación de lecturas</h1><p className="text-xs text-slate-500">Versión {VERSION} · Configuración y conciliación · sin guardar</p><p className="mt-2 text-sm">Condominio: <b>{nombre || `ID ${id}`}</b> · Modalidad: <b>{modalidad || "Consultando"}</b></p></div><Link className="rounded-xl bg-slate-800 text-white px-4 py-3 h-fit" href="/gas">Volver a Gas</Link></div></section>
    <section className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900"><b>Modo seguro:</b> este módulo únicamente lee y valida el Excel. No registra lecturas, no cambia medidores y no genera facturas. El código del apartamento se usa como identificador provisional del medidor. Los IDs de unidad y medidor pueden completarse posteriormente. La asignación de tanques se revisa ahora; para guardar en Supabase será obligatorio vincular los medidores y superar las validaciones históricas.</section>
    {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>}
    <section className="rounded-3xl bg-white border p-5 space-y-3"><label className="block font-bold">Seleccionar archivo Excel (.xlsx)</label><input type="file" accept=".xlsx,.xls" disabled={cargando || modalidad!=="CON_MEDIDORES"} onChange={e=>void cargarExcel(e.target.files?.[0])} className="block w-full rounded-xl border p-3"/><p className="text-sm text-slate-500">Usa la plantilla VAM de preimportación. {archivo && `Archivo: ${archivo}`}</p><button type="button" onClick={()=>void consultar(id)} disabled={cargando || !id} className="rounded-xl border px-4 py-2 font-bold">{cargando?"Verificando...":"Actualizar validación de Supabase"}</button></section>
    {!!filas.length && <><section className="grid grid-cols-2 md:grid-cols-4 gap-3">{[["Apartamentos",filas.length],["Tanques pendientes",tanquesPendientes],["IDs pendientes",idsPendientes],["Con errores",invalidos],["Con advertencias",advertencias],["Suma importes",`RD$ ${dinero(total)}`],["Total documento",totalReferencia===null?"Sin referencia":`RD$ ${dinero(totalReferencia)}`]].map(([k,v])=><div key={String(k)} className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">{k}</p><p className="font-black text-lg">{v}</p></div>)}</section>
    {totalReferencia!==null && Math.abs(total-totalReferencia)>0.001 && <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 text-sm">Diferencia entre suma de filas y total del documento: RD$ {dinero(redondear(total-totalReferencia))}. Revisar antes de importar.</div>}
    <section className="rounded-3xl bg-white border p-4"><h2 className="text-xl font-black mb-2">Vista previa editable · {filas.length} registros</h2><p className="text-sm text-slate-500 mb-4">Los cambios son temporales y solo afectan la vista previa. Los valores calculados se actualizan automáticamente.</p><div className="overflow-x-auto"><table className="min-w-[1700px] w-full text-xs"><thead className="bg-slate-100"><tr>{["Apto.","Medidor provisional","Tanque","Unidad ID","Medidor ID","Propietario (referencia)","Fecha anterior","Fecha final","Anterior m³","Actual m³","Factor","Galones","Precio RD$","Importe Excel","Calculado","Validación"].map(h=><th key={h} className="border p-2 text-left">{h}</th>)}</tr></thead><tbody>{filas.map((f,i)=>{const r=resultados[i];return <tr key={i} className={r.errores.length?"bg-red-50":r.avisos.length?"bg-amber-50":"bg-white"}><td className="border p-2 font-bold">{f.unidad_codigo}</td><td className="border p-2 font-semibold">{f.unidad_codigo}{r.medidor ? " (vinculado)" : " (pendiente)"}</td><td className="border p-1"><select aria-label={`${f.unidad_codigo} tanque`} className="border rounded p-2 min-w-40" value={f.tanque_id ?? ""} onChange={e=>actualizar(i,"tanque_id",e.target.value)}><option value="">Sin asignar</option>{tanques.map(t=><option key={t.id} value={t.id}>{t.id} · {t.nombre}</option>)}</select></td><td className="border p-2">{f.unidad_id ?? "Pendiente"}</td><td className="border p-2">{f.medidor_id ?? r.medidor?.id ?? "Pendiente"}</td><td className="border p-2">{f.propietario_referencia}</td>{(["fecha_lectura_anterior","fecha_lectura","lectura_anterior_m3","lectura_actual_m3","factor"] as const).map(k=><td key={k} className="border p-1"><input aria-label={`${f.unidad_codigo} ${k}`} className="w-28 border rounded p-1" type={k.startsWith("fecha")?"date":"number"} step="any" value={f[k]} onChange={e=>actualizar(i,k,e.target.value)}/></td>)}<td className="border p-2 text-right">{r.consumoGls.toFixed(3)}</td><td className="border p-1"><input aria-label={`${f.unidad_codigo} precio`} className="w-24 border rounded p-1" type="number" step="any" value={f.precio_gls_rd} onChange={e=>actualizar(i,"precio_gls_rd",e.target.value)}/></td><td className="border p-1"><input aria-label={`${f.unidad_codigo} importe`} className="w-24 border rounded p-1" type="number" step="any" value={f.importe_original_rd} onChange={e=>actualizar(i,"importe_original_rd",e.target.value)}/></td><td className="border p-2 text-right">{dinero(r.calculado)}</td><td className="border p-2 min-w-64">{r.errores.length?<span className="font-bold text-red-700">BLOQUEADO: {r.errores.join("; ")}</span>:r.avisos.length?<span className="text-amber-800">REVISAR: {r.avisos.join("; ")}</span>:<span className="text-emerald-700 font-bold">Validación preliminar OK</span>}</td></tr>})}</tbody></table></div></section>
    <section className="rounded-2xl border bg-white p-5"><button type="button" onClick={()=>{const columnas=["condominio_id","periodo","unidad_codigo","propietario_referencia","tanque_id","unidad_id","medidor_id","fecha_lectura_anterior","fecha_lectura","lectura_anterior_m3","lectura_actual_m3","factor","precio_gls_rd","importe_original_rd"];const contenido=[columnas.join(","),...filas.map(f=>columnas.map(k=>{const v=String((f as any)[k]??"");return `"${v.replace(/"/g,'""')}"`}).join(","))].join("\r\n");const blob=new Blob(["\uFEFF",contenido],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`gas_configuracion_${id}_${filas[0]?.periodo||"periodo"}.csv`;a.click();URL.revokeObjectURL(url)}} className="rounded-xl border border-blue-700 text-blue-700 px-4 py-2 font-bold">Exportar revisión CSV</button><p className="text-xs text-slate-500 mt-2">Incluye los tanques asignados y los IDs disponibles. Abre el CSV en Excel para conservar el trabajo.</p><p className="font-bold">Resultado: {invalidos} registros bloqueados y {advertencias} con advertencias.</p><p className="text-sm text-slate-500 mt-2">Configuración de tanques y conciliación habilitadas. Los IDs pueden completarse posteriormente. No se escriben registros en Supabase.</p><button disabled className="mt-3 rounded-xl bg-slate-300 text-slate-600 px-5 py-3 font-bold cursor-not-allowed">Confirmar importación (aún no habilitado)</button></section></>}
  </div></main>;
}
