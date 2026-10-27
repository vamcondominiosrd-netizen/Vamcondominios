"use client";
/* VAM Condominios · Gas / Importaciones · v1.0.6
   Fase 2: vista previa y borradores en Supabase. NO escribe lecturas oficiales.
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
const VERSION = "1.0.6";
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
  const [guardadoLocal, setGuardadoLocal] = useState("");
  const [borradoresRemotos, setBorradoresRemotos] = useState<{id:number;periodo:string;archivo_nombre:string;actualizado_en:string;filas: Fila[];total_referencia:number|null}[]>([]);
  const [guardandoRemoto, setGuardandoRemoto] = useState(false);
  const [borradorActivo, setBorradorActivo] = useState<{id:number;periodo:string;actualizado_en:string}|null>(null);
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(false);
  const [confirmacion, setConfirmacion] = useState(false);
  const [preflightVisible, setPreflightVisible] = useState(false);
  const [filtro, setFiltro] = useState("TODOS");
  const [unidades, setUnidades] = useState<{id:number;codigo:string}[]>([]);
  const [lecturasExistentes, setLecturasExistentes] = useState<{medidor_id:number;periodo:string;fecha_lectura:string;lectura_actual:number}[]>([]);

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
      const [m, l, t, u] = await Promise.all([
        supabase.from("gas_medidores").select("id,unidad_id,lectura_inicial,fecha_lectura_inicial,unidades(codigo)").eq("condominio_id",condominio).eq("estado","Activo"),
        supabase.from("gas_lecturas").select("medidor_id,periodo,fecha_lectura,lectura_actual").eq("condominio_id",condominio),
        supabase.from("gas_tanques").select("id,nombre").eq("condominio_id",condominio),
        supabase.from("unidades").select("id,codigo").eq("condominio_id",condominio)
      ]);
      if (m.error) throw m.error;
      if (l.error) throw l.error;
      if (t.error) throw t.error;
      if (u.error) throw u.error;
      setUnidades((u.data || []).map((x:any)=>({id:Number(x.id),codigo:String(x.codigo || "").trim().toUpperCase()})));
      setTanques((t.data || []).map((x:any)=>({id:Number(x.id),nombre:String(x.nombre)})));
      setMedidores((m.data || []).map((x: any) => ({id:Number(x.id), unidad_id:Number(x.unidad_id), lectura_inicial:Number(x.lectura_inicial), fecha_lectura_inicial:String(x.fecha_lectura_inicial || ""), codigo:String((Array.isArray(x.unidades) ? x.unidades[0]?.codigo : x.unidades?.codigo) || "").trim().toUpperCase()})));
      setExistentes((l.data || []).map((x: any) => ({medidor_id:Number(x.medidor_id), periodo:String(x.periodo).slice(0,7), fecha_lectura:String(x.fecha_lectura)})));
      setLecturasExistentes((l.data || []).map((x:any)=>({medidor_id:Number(x.medidor_id),periodo:String(x.periodo).slice(0,7),fecha_lectura:String(x.fecha_lectura),lectura_actual:Number(x.lectura_actual)})));
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setCargando(false); }
  }

  async function cargarExcel(file?: File) {
    if (!file) return;
    setError(""); setFilas([]); setTotalReferencia(null); setArchivo(file.name); setConfirmacion(false); setBorradorActivo(null); setCambiosSinGuardar(true);
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
    const unidad = unidades.find(u=>u.codigo===f.unidad_codigo);
    if (!unidad) errores.push("Apartamento no registrado en el condominio");
    if (f.unidad_id !== null && unidad && f.unidad_id !== unidad.id) errores.push("Unidad ID del Excel no coincide con Supabase");
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
      const previas = lecturasExistentes.filter(x=>x.medidor_id===medidor.id && x.fecha_lectura<f.fecha_lectura).sort((a,b)=>b.fecha_lectura.localeCompare(a.fecha_lectura));
      if (previas.length && (previas[0].fecha_lectura !== f.fecha_lectura_anterior || Math.abs(previas[0].lectura_actual-f.lectura_anterior_m3)>0.0001)) avisos.push("Lectura anterior no coincide con último histórico registrado");
      if (existentes.some(x=>x.medidor_id === medidor.id && x.fecha_lectura > f.fecha_lectura)) errores.push("Existen lecturas posteriores: requiere migración histórica controlada");
      if (f.fecha_lectura <= medidor.fecha_lectura_inicial) errores.push("La fecha es anterior o igual al inicio del medidor en VAM");
      if (f.fecha_lectura_anterior !== medidor.fecha_lectura_inicial || Math.abs(f.lectura_anterior_m3 - medidor.lectura_inicial) > 0.0001) avisos.push("Lectura base del Excel distinta a la lectura inicial del medidor: revisar histórico");
    }
    const consumoM3 = f.lectura_actual_m3 - f.lectura_anterior_m3;
    const consumoGls = consumoM3 * f.factor;
    const calculado = redondear(consumoGls * f.precio_gls_rd);
    if (Number.isFinite(calculado) && Math.abs(calculado - f.importe_original_rd) > 0.01) avisos.push("Importe histórico diferente al calculado");
    return {errores,avisos,medidor,consumoM3,consumoGls,calculado};
  }),[filas,medidores,existentes,tanques,unidades,lecturasExistentes,id]);
  const tanquesPendientes = filas.filter(f => f.tanque_id === null).length;
  const idsPendientes = filas.filter(f => !medidores.some(m=>m.codigo===f.unidad_codigo)).length;
  const invalidos = resultados.filter(x=>x.errores.length).length;
  const advertencias = resultados.filter(x=>x.avisos.length).length;
  const periodosUnicos = [...new Set(filas.map(f=>f.periodo))];
  const codigosUnicos = new Set(filas.map(f=>f.unidad_codigo));
  const medidoresFaltantes = filas.filter(f=>!medidores.some(m=>m.codigo===f.unidad_codigo));
  const lecturasDuplicadas = resultados.filter(r=>r.errores.some(e=>e.includes("Ya existe lectura"))).length;
  const lecturasPosteriores = resultados.filter(r=>r.errores.some(e=>e.includes("lecturas posteriores"))).length;
  const sinUnidad = filas.filter(f=>!unidades.some(u=>u.codigo===f.unidad_codigo)).length;
  const tanquesInvalidos = filas.filter(f=>f.tanque_id===null || !tanques.some(t=>t.id===f.tanque_id)).length;
  const preflightAprobado = filas.length>0 && periodosUnicos.length===1 && codigosUnicos.size===filas.length && invalidos===0 && medidoresFaltantes.length===0 && tanquesInvalidos===0 && sinUnidad===0 && lecturasDuplicadas===0 && lecturasPosteriores===0;
  const total = redondear(filas.reduce((s,f)=>s+(Number.isFinite(f.importe_original_rd)?f.importe_original_rd:0),0));
  const actualizar = (indice:number,campo:keyof Fila,valor:string) => {
    setCambiosSinGuardar(true);
    setFilas(actual => actual.map((f,i)=>i===indice ? {...f,[campo]: ["lectura_anterior_m3","lectura_actual_m3","factor","precio_gls_rd","importe_original_rd","tanque_id"].includes(campo)?(valor === "" ? null : Number(valor)):valor}:f));
  };
  const visibles = filas.map((f,i)=>({f,i,r:resultados[i]})).filter(({r})=>filtro==="TODOS" || (filtro==="ERRORES"&&r.errores.length>0) || (filtro==="AVISOS"&&r.avisos.length>0) || (filtro==="LISTOS"&&r.errores.length===0&&r.avisos.length===0));
  const clave = `vam_gas_importacion_borrador_${id}`;
  function guardarBorrador() {
    try { localStorage.setItem(clave,JSON.stringify({version:VERSION,condominio_id:id,archivo,filas,totalReferencia,guardadoEn:new Date().toISOString()})); setGuardadoLocal("Borrador guardado en este navegador."); }
    catch(e:any){setError(`No se pudo guardar el borrador: ${e?.message || e}`);}
  }
  function recuperarBorrador(){
    try {const raw=localStorage.getItem(clave);if(!raw) throw new Error("No existe un borrador local para este condominio.");const b=JSON.parse(raw);if(b.condominio_id!==id || !Array.isArray(b.filas)) throw new Error("Borrador inválido.");setFilas(b.filas);setArchivo(b.archivo||"Borrador recuperado");setTotalReferencia(b.totalReferencia??null);setGuardadoLocal(`Borrador recuperado (${b.guardadoEn||"sin fecha"}).`);setConfirmacion(false);setBorradorActivo(null);setCambiosSinGuardar(true);}
    catch(e:any){setError(e?.message||String(e));}
  }
  async function consultarBorradores() {
    if (!id) return;
    setGuardandoRemoto(true); setError("");
    try {
      const {data: auth, error: authError} = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Debes iniciar sesión en Supabase para consultar borradores compartidos entre dispositivos.");
      const {data, error: e} = await supabase.from("gas_importaciones_borradores")
        .select("id,periodo,archivo_nombre,actualizado_en,filas,total_referencia")
        .eq("condominio_id",id).eq("usuario_id",auth.user.id)
        .order("actualizado_en",{ascending:false}).limit(30);
      if (e) throw e;
      setBorradoresRemotos((data || []) as typeof borradoresRemotos);
    } catch (e:any) {setError(`No se pudieron consultar los borradores: ${e?.message || e}`);}
    finally {setGuardandoRemoto(false);}
  }
  async function guardarEnSupabase() {
    if (!filas.length || !id || guardandoRemoto) return;
    setError(""); setGuardandoRemoto(true);
    try {
      const periodos = [...new Set(filas.map(f=>f.periodo))];
      if (periodos.length!==1 || !/^\d{4}-\d{2}$/.test(periodos[0])) throw new Error("El borrador debe corresponder a un único período válido.");
      if (filas.some(f=>f.condominio_id!==id)) throw new Error("Hay registros de otro condominio. Corrige el Excel antes de guardar.");
      if (modalidad!=="CON_MEDIDORES") throw new Error("El condominio no está configurado CON_MEDIDORES.");
      if (filas.some(f=>!f.unidad_codigo || !f.fecha_lectura || !f.fecha_lectura_anterior)) throw new Error("Faltan campos básicos en algunas filas.");
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError) throw authError;
      if(!auth.user) throw new Error("No existe una sesión autenticada de Supabase.");
      const contenido = {archivo_nombre:archivo,filas,total_referencia:totalReferencia,actualizado_en:new Date().toISOString()};
      if (borradorActivo && borradorActivo.periodo===periodos[0]) {
        // Bloqueo optimista: no sobrescribir una edición hecha en otra computadora.
        const {data,error:e}=await supabase.from("gas_importaciones_borradores")
          .update(contenido).eq("id",borradorActivo.id).eq("condominio_id",id)
          .eq("usuario_id",auth.user.id).eq("actualizado_en",borradorActivo.actualizado_en)
          .select("id,periodo,actualizado_en");
        if(e) throw e;
        if(!data || data.length!==1) throw new Error("Este borrador fue modificado en otro dispositivo. Busca y recupera la versión actual antes de guardar.");
        setBorradorActivo({id:Number(data[0].id),periodo:String(data[0].periodo),actualizado_en:String(data[0].actualizado_en)});
      } else {
        const {data:ya,error:consultaError}=await supabase.from("gas_importaciones_borradores")
          .select("id").eq("condominio_id",id).eq("periodo",periodos[0]).eq("usuario_id",auth.user.id).maybeSingle();
        if(consultaError) throw consultaError;
        if(ya) throw new Error("Ya existe un borrador de este período. Pulsa Buscar mis borradores y Recuperar para editarlo sin sobrescribirlo.");
        const {data,error:e}=await supabase.from("gas_importaciones_borradores").insert({
          ...contenido,condominio_id:id,periodo:periodos[0],usuario_id:auth.user.id
        }).select("id,periodo,actualizado_en").single();
        if(e) throw e;
        setBorradorActivo({id:Number(data.id),periodo:String(data.periodo),actualizado_en:String(data.actualizado_en)});
      }
      setCambiosSinGuardar(false);
      setGuardadoLocal(`Borrador ${periodos[0]} guardado en Supabase. No se importaron lecturas.`);
      await consultarBorradores();
    } catch(e:any){setError(`No se pudo guardar en Supabase: ${e?.message || e}`);}
    finally{setGuardandoRemoto(false);}
  }
  function recuperarDeSupabase(b: typeof borradoresRemotos[number]) {
    if(filas.length && !window.confirm("¿Reemplazar la revisión actual por este borrador guardado en Supabase?")) return;
    if(!Array.isArray(b.filas) || b.filas.some(f=>f.condominio_id!==id || f.periodo!==b.periodo)) {setError("El borrador contiene datos de otro condominio o período.");return;}
    setFilas(b.filas);setArchivo(b.archivo_nombre||"Borrador Supabase");
    setTotalReferencia(b.total_referencia??null);setConfirmacion(false);setBorradorActivo({id:b.id,periodo:b.periodo,actualizado_en:b.actualizado_en});setCambiosSinGuardar(false);
    setGuardadoLocal(`Borrador ${b.periodo} recuperado desde Supabase.`);
  }
  async function exportarExcel(){
    try {const XLSX=await import("xlsx");const hoja=filas.map((f,i)=>({...f,unidad_id:unidades.find(u=>u.codigo===f.unidad_codigo)?.id??"",medidor_id:medidores.find(m=>m.codigo===f.unidad_codigo)?.id??"",consumo_m3:resultados[i].consumoM3,consumo_gls:resultados[i].consumoGls,importe_calculado_rd:resultados[i].calculado,estado_validacion:resultados[i].errores.length?"BLOQUEADO":resultados[i].avisos.length?"REVISAR":"OK",observaciones:[...resultados[i].errores,...resultados[i].avisos].join("; ")}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(hoja),"Lecturas revisadas");XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Condominio",id],["Archivo",archivo],["Registros",filas.length],["Errores",invalidos],["Advertencias",advertencias],["Total filas RD$",total],["Total control RD$",totalReferencia??""],["Estado","BORRADOR - NO IMPORTADO"]]),"Control");XLSX.writeFile(wb,`VAM_Gas_Revision_${id}_${filas[0]?.periodo||"periodo"}.xlsx`);}
    catch(e:any){setError(e?.message||String(e));}
  }
  return <main className="min-h-screen bg-slate-100 p-4 md:p-6"><div className="mx-auto max-w-7xl space-y-5">
    <section className="rounded-3xl bg-white border p-6 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm font-bold text-blue-700">VAM CONDOMINIOS · GAS</p><h1 className="text-3xl font-black">Importación de lecturas</h1><p className="text-xs text-slate-500">Versión {VERSION} · Revisión y borradores en Supabase · sin registrar lecturas</p><p className="mt-2 text-sm">Condominio: <b>{nombre || `ID ${id}`}</b> · Modalidad: <b>{modalidad || "Consultando"}</b></p></div><Link className="rounded-xl bg-slate-800 text-white px-4 py-3 h-fit" href="/gas">Volver a Gas</Link></div></section>
    <section className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900"><b>Modo seguro:</b> este módulo guarda borradores en una tabla independiente de Supabase, pero NO registra lecturas, no cambia medidores y no genera facturas. El código del apartamento se usa como identificador provisional del medidor. Los IDs de medidor pueden completarse posteriormente. El ID de unidad se obtiene automáticamente desde Supabase cuando existe. La asignación de tanques se revisa ahora. Los medidores y las validaciones históricas serán obligatorios para la importación definitiva, NO para guardar borradores.</section>
    {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>}
    <section className="rounded-3xl bg-white border p-5 space-y-3"><label className="block font-bold">Seleccionar archivo Excel (.xlsx)</label><input type="file" accept=".xlsx,.xls" disabled={cargando || modalidad!=="CON_MEDIDORES"} onChange={e=>void cargarExcel(e.target.files?.[0])} className="block w-full rounded-xl border p-3"/><p className="text-sm text-slate-500">Usa la plantilla VAM de preimportación. {archivo && `Archivo: ${archivo}`}</p><button type="button" onClick={()=>void consultar(id)} disabled={cargando || !id} className="rounded-xl border px-4 py-2 font-bold">{cargando?"Verificando...":"Actualizar validación de Supabase"}</button></section>
    <section className="rounded-2xl border bg-white p-4 flex flex-wrap gap-3 items-center"><button type="button" onClick={recuperarBorrador} className="rounded-xl border px-4 py-2 font-bold">Recuperar borrador local</button><span className="text-sm text-slate-500">El borrador local se conserva solo en este navegador. El borrador Supabase requiere sesión autenticada y se recupera desde otros dispositivos con la misma cuenta.</span>{guardadoLocal && <span className="text-sm text-blue-700">{guardadoLocal}</span>}</section>
    <section className="rounded-2xl border bg-white p-4 space-y-3"><div className="flex flex-wrap gap-3 items-center"><h2 className="font-black">Borradores en Supabase</h2><button type="button" disabled={guardandoRemoto||!id} onClick={()=>void consultarBorradores()} className="rounded-xl border px-4 py-2 font-bold">{guardandoRemoto?"Consultando...":"Buscar mis borradores"}</button></div><p className="text-sm text-slate-500">Se guardan separados de las lecturas oficiales. Solo la cuenta autenticada que guardó el borrador puede recuperarlo. Abre el borrador antes de actualizarlo; se evita sobrescribir cambios realizados desde otro dispositivo.</p>{borradoresRemotos.length>0 && <div className="space-y-2">{borradoresRemotos.map(b=><div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><span className="text-sm"><b>{b.periodo}</b> · {b.archivo_nombre || "Sin nombre"} · {b.filas?.length||0} filas · {new Date(b.actualizado_en).toLocaleString("es-DO")}</span><button type="button" className="rounded-lg bg-slate-800 text-white px-3 py-2 text-sm font-bold" onClick={()=>recuperarDeSupabase(b)}>Recuperar</button></div>)}</div>}</section>
    {!!filas.length && <><section className="rounded-xl border bg-white p-3 text-sm flex flex-wrap gap-3"><span><b>Edición:</b> {borradorActivo ? `Borrador #${borradorActivo.id} · ${borradorActivo.periodo}` : "Nueva revisión sin vincular"}</span><span className={cambiosSinGuardar?"font-bold text-amber-700":"text-emerald-700"}>{cambiosSinGuardar?"Cambios pendientes de guardar":"Sin cambios pendientes"}</span></section><section className="grid grid-cols-2 md:grid-cols-4 gap-3">{[["Apartamentos",filas.length],["Tanques pendientes",tanquesPendientes],["IDs pendientes",idsPendientes],["Con errores",invalidos],["Con advertencias",advertencias],["Suma importes",`RD$ ${dinero(total)}`],["Total documento",totalReferencia===null?"Sin referencia":`RD$ ${dinero(totalReferencia)}`]].map(([k,v])=><div key={String(k)} className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">{k}</p><p className="font-black text-lg">{v}</p></div>)}</section>
    {totalReferencia!==null && Math.abs(total-totalReferencia)>0.001 && <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 text-sm">Diferencia entre suma de filas y total del documento: RD$ {dinero(redondear(total-totalReferencia))}. Revisar antes de importar.</div>}
    <section className="rounded-3xl bg-white border p-4"><h2 className="text-xl font-black mb-2">Vista previa editable · {filas.length} registros</h2><p className="text-sm text-slate-500 mb-4">Los cambios son temporales hasta guardar el borrador en Supabase o localmente. Los valores calculados se actualizan automáticamente.</p><div className="flex flex-wrap gap-2 mb-3">{(["TODOS","ERRORES","AVISOS","LISTOS"] as const).map(x=><button key={x} type="button" onClick={()=>setFiltro(x)} className={`rounded-lg px-3 py-2 border text-sm ${filtro===x?"bg-blue-700 text-white":"bg-white"}`}>{x}</button>)}<span className="text-sm text-slate-500 self-center">Mostrando {visibles.length} de {filas.length}</span></div><div className="overflow-x-auto"><table className="min-w-[1700px] w-full text-xs"><thead className="bg-slate-100"><tr>{["Apto.","Medidor provisional","Tanque","Unidad ID","Medidor ID","Propietario (referencia)","Fecha anterior","Fecha final","Anterior m³","Actual m³","Factor","Galones","Precio RD$","Importe Excel","Calculado","Validación"].map(h=><th key={h} className="border p-2 text-left">{h}</th>)}</tr></thead><tbody>{visibles.map(({f,i,r})=>{return <tr key={i} className={r.errores.length?"bg-red-50":r.avisos.length?"bg-amber-50":"bg-white"}><td className="border p-2 font-bold">{f.unidad_codigo}</td><td className="border p-2 font-semibold">{f.unidad_codigo}{r.medidor ? " (vinculado)" : " (pendiente)"}</td><td className="border p-1"><select aria-label={`${f.unidad_codigo} tanque`} className="border rounded p-2 min-w-40" value={f.tanque_id ?? ""} onChange={e=>actualizar(i,"tanque_id",e.target.value)}><option value="">Sin asignar</option>{tanques.map(t=><option key={t.id} value={t.id}>{t.id} · {t.nombre}</option>)}</select></td><td className="border p-2">{unidades.find(u=>u.codigo===f.unidad_codigo)?.id ?? "No encontrada"}</td><td className="border p-2">{f.medidor_id ?? r.medidor?.id ?? "Pendiente"}</td><td className="border p-2">{f.propietario_referencia}</td>{(["fecha_lectura_anterior","fecha_lectura","lectura_anterior_m3","lectura_actual_m3","factor"] as const).map(k=><td key={k} className="border p-1"><input aria-label={`${f.unidad_codigo} ${k}`} className="w-28 border rounded p-1" type={k.startsWith("fecha")?"date":"number"} step="any" value={f[k]} onChange={e=>actualizar(i,k,e.target.value)}/></td>)}<td className="border p-2 text-right">{r.consumoGls.toFixed(3)}</td><td className="border p-1"><input aria-label={`${f.unidad_codigo} precio`} className="w-24 border rounded p-1" type="number" step="any" value={f.precio_gls_rd} onChange={e=>actualizar(i,"precio_gls_rd",e.target.value)}/></td><td className="border p-1"><input aria-label={`${f.unidad_codigo} importe`} className="w-24 border rounded p-1" type="number" step="any" value={f.importe_original_rd} onChange={e=>actualizar(i,"importe_original_rd",e.target.value)}/></td><td className="border p-2 text-right">{dinero(r.calculado)}</td><td className="border p-2 min-w-64">{r.errores.length?<span className="font-bold text-red-700">BLOQUEADO: {r.errores.join("; ")}</span>:r.avisos.length?<span className="text-amber-800">REVISAR: {r.avisos.join("; ")}</span>:<span className="text-emerald-700 font-bold">Validación preliminar OK</span>}</td></tr>})}</tbody></table></div></section>
    <section className="rounded-2xl border bg-white p-5 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black text-lg">Prevalidación para importación definitiva</h2><p className="text-sm text-slate-600">Diagnóstico de solo lectura. No crea medidores ni modifica lecturas.</p></div><button type="button" onClick={()=>setPreflightVisible(x=>!x)} className="rounded-xl border border-blue-700 px-4 py-2 font-bold text-blue-700">{preflightVisible?"Ocultar diagnóstico":"Ver diagnóstico"}</button></div>
    {preflightVisible && <><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[["Filas",filas.length],["Períodos",periodosUnicos.length],["Unidades no encontradas",sinUnidad],["Medidores faltantes",medidoresFaltantes.length],["Tanques sin validar",tanquesInvalidos],["Duplicados en DB",lecturasDuplicadas],["Lecturas posteriores",lecturasPosteriores],["Filas bloqueadas",invalidos]].map(([titulo,valor])=><div key={String(titulo)} className="border rounded-xl p-3"><p className="text-xs text-slate-500">{titulo}</p><p className="font-black text-lg">{valor}</p></div>)}</div><p className={preflightAprobado?"text-emerald-700 font-bold":"text-amber-800 font-bold"}>{preflightAprobado?"Prevalidación sin bloqueos; todavía requiere procedimiento de importación transaccional y permisos de servidor.":"No apto para importar: resolver los bloqueos antes de habilitar la confirmación."}</p>{medidoresFaltantes.length>0 && <div className="text-sm"><b>Medidores pendientes de vincular:</b> {medidoresFaltantes.map(f=>f.unidad_codigo).join(", ")}</div>}<p className="text-xs text-slate-600">La comprobación se basa en los datos consultados. Pulsa «Actualizar validación de Supabase» antes de revisar; la importación definitiva deberá repetir estas comprobaciones en una transacción en el servidor.</p></>}
    </section>
    <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap gap-3 mb-3"><button type="button" disabled={guardandoRemoto} onClick={()=>void guardarEnSupabase()} className="rounded-xl bg-blue-700 text-white px-4 py-2 font-bold">{guardandoRemoto?"Guardando...":"Guardar borrador en Supabase"}</button><button type="button" onClick={guardarBorrador} className="rounded-xl border px-4 py-2 font-bold">Guardar borrador local</button><button type="button" onClick={()=>void exportarExcel()} className="rounded-xl border border-blue-700 text-blue-700 px-4 py-2 font-bold">Exportar revisión Excel</button></div><button type="button" onClick={()=>{const columnas=["condominio_id","periodo","unidad_codigo","propietario_referencia","tanque_id","unidad_id","medidor_id","fecha_lectura_anterior","fecha_lectura","lectura_anterior_m3","lectura_actual_m3","factor","precio_gls_rd","importe_original_rd"];const contenido=[columnas.join(","),...filas.map(f=>columnas.map(k=>{const v=String((f as any)[k]??"");return `"${v.replace(/"/g,'""')}"`}).join(","))].join("\r\n");const blob=new Blob(["\uFEFF",contenido],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`gas_configuracion_${id}_${filas[0]?.periodo||"periodo"}.csv`;a.click();URL.revokeObjectURL(url)}} className="rounded-xl border border-blue-700 text-blue-700 px-4 py-2 font-bold">Exportar revisión CSV</button><p className="text-xs text-slate-500 mt-2">Incluye los tanques asignados y los IDs disponibles. Abre el CSV en Excel para conservar el trabajo.</p><p className="font-bold">Resultado: {invalidos} registros bloqueados y {advertencias} con advertencias.</p><p className="text-sm text-slate-500 mt-2">Diagnóstico previo a la importación habilitado. Configuración de tanques y conciliación habilitadas. Los IDs pueden completarse posteriormente. Solo se escriben borradores en Supabase; no se modifican lecturas ni medidores.</p><div className="mt-4 border-t pt-4"><label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={confirmacion} onChange={e=>setConfirmacion(e.target.checked)}/><span>He revisado el archivo y entiendo que la validación preliminar no equivale a registrar lecturas en Supabase.</span></label><button type="button" disabled className="mt-3 rounded-xl bg-slate-300 text-slate-600 px-5 py-3 font-bold cursor-not-allowed">Importar a Supabase (bloqueado hasta validar esquema y crear proceso transaccional)</button><p className="text-xs text-slate-500 mt-2">Confirmación de revisión: {confirmacion?"marcada":"pendiente"}. No se crean medidores, lecturas, facturas ni cargos desde esta pantalla.</p></div></section></>}
  </div></main>;
}
