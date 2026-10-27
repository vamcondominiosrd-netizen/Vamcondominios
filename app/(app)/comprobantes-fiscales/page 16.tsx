"use client";

/**
 * VAM Condominios | Comprobantes Fiscales B02 v1.0.1 (19/10/2026)
 * Don Juan I (condominio_id 24): factura de mantenimiento del mes seleccionado
 * y gas del mes ANTERIOR. Los NCF sólo son emitidos por un RPC atómico Supabase.
 * Nunca se asigna un NCF en JavaScript ni se imprime como emitido si es borrador.
 * Requiere ejecutar supabase/01_comprobantes_fiscales.sql y completar autorización.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Printer, RefreshCw, ShieldCheck, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";
import PageContainer from "@/components/vam/enterprise/PageContainer";

const VERSION = "v1.0.1";
const FECHA_VERSION = "19/10/2026";
const SELLO_URL = "/sello-don-juan.png";
const ID_DON_JUAN = 24;

type Unidad = { id: number; codigo: string; cuota_mensual_actual: number | null };
type Propietario = { no_apartamento: string | null; nombre_propietario: string | null; cedula: string | null };
type Cargo = {
  id: number; periodo: string; concepto: string | null; tipo_cargo?: string | null;
  tipo?: "MANTENIMIENTO" | "GAS";
  monto: number | null; monto_pagado: number | null; balance: number | null; estado: string | null;
};
type LecturaGas = {
  id?: number; estado?: string | null; cargo_periodico_id?: number | null;
  fecha_lectura_anterior: string | null; fecha_lectura: string | null;
  lectura_anterior: number | null; lectura_actual: number | null;
  consumo: number | null; consumo_facturable: number | null;
  unidad_facturacion_codigo: string | null; precio_unitario: number | null; importe: number | null;
};
type Fiscal = {
  configurado: boolean; habilitada: boolean; autorizacion_verificada?: boolean;
  ultimo_ncf?: string; proximo_ncf?: string;
  rango_inicio?: number; rango_fin?: number;
  itbis_mantenimiento?: string; itbis_gas?: string; tasa_itbis?: number;
};
type Documento = {
  id: number; condominio_id: number; unidad_id: number; periodo: string; periodo_gas: string;
  ncf: string; rnc_emisor: string; nombre_emisor: string;
  propietario: string; documento_propietario: string | null;
  codigo_apartamento: string; fecha_emision: string;
  total_mantenimiento: number; total_gas: number; subtotal_sin_itbis: number;
  itbis: number; total_factura: number; detalle_cargos: Cargo[]; detalle_gas: LecturaGas[];
  estado: "EMITIDO" | "ANULADO";
};
type Historial = {
  id: number; unidad_id: number; ncf: string; periodo: string;
  fecha_emision: string; codigo_apartamento: string; propietario: string;
  total_factura: number; estado: string;
};

function normalizar(x: unknown): string {
  return String(x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/\s+/g, "").trim();
}
function esMantenimiento(x: Cargo): boolean {
  const tipo = normalizar(x.tipo ?? x.tipo_cargo);
  const concepto = normalizar(x.concepto);
  return tipo === "MANTENIMIENTO" || tipo === "ORDINARIO" ||
    (!tipo && (concepto.includes("MANTENIMIENTO") || concepto.includes("CUOTAORDINARIA")));
}
function esGas(x: Cargo): boolean { return normalizar(x.tipo ?? x.tipo_cargo) === "GAS"; }
function numero(x: number | null | undefined, decimales = 2): string {
  return Number(x || 0).toLocaleString("es-DO", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}
function pesos(x: number | null | undefined): string { return `RD$ ${numero(x)}`; }
function hoyMes(): string {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}`;
}
function periodoAnterior(p: string): string {
  const [y,m] = p.split("-").map(Number);
  if (!y || !m || m<1 || m>12) return "";
  return m===1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,"0")}`;
}
function periodoSiguiente(p: string): string {
  const [y,m] = p.split("-").map(Number);
  if (!y || !m || m<1 || m>12) return "";
  return m===12 ? `${y+1}-01-01` : `${y}-${String(m+1).padStart(2,"0")}-01`;
}
function mesBonito(p: string): string {
  const [y,m] = String(p||"").split("-");
  const meses=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return meses[Number(m)-1] && y ? `${meses[Number(m)-1]} ${y}` : p;
}
function fechaBonita(p: string | null | undefined): string {
  if (!p) return "—"; const [y,m,d] = String(p).slice(0,10).split("-");
  return y&&m&&d ? `${d}/${m}/${y}` : String(p);
}

export default function ComprobantesFiscalesPage() {
  const [condominioId,setCondominioId]=useState<number|null>(null);
  const [condominio,setCondominio]=useState({nombre:"",rnc:""});
  const [unidades,setUnidades]=useState<Unidad[]>([]);
  const [propietarios,setPropietarios]=useState<Propietario[]>([]);
  const [unidadId,setUnidadId]=useState("");
  const [periodo,setPeriodo]=useState(hoyMes);
  const [modalidadGas,setModalidadGas]=useState("");
  const [cargos,setCargos]=useState<Cargo[]>([]);
  const [lecturas,setLecturas]=useState<LecturaGas[]>([]);
  const [documento,setDocumento]=useState<Documento|null>(null);
  const [fiscal,setFiscal]=useState<Fiscal|null>(null);
  const [historial,setHistorial]=useState<Historial[]>([]);
  const [busquedaHistorial,setBusquedaHistorial]=useState("");
  const [listo,setListo]=useState(false);
  const [consultado,setConsultado]=useState(false);
  const [cargando,setCargando]=useState(false);
  const [emitiendo,setEmitiendo]=useState(false);
  const [mensaje,setMensaje]=useState("");
  const [aviso,setAviso]=useState("");
  const [error,setError]=useState("");
  const [sello,setSello]=useState<string|null>(null);

  const gasPeriodo = useMemo(()=>condominioId===ID_DON_JUAN ? periodoAnterior(periodo) : periodo,[condominioId,periodo]);
  const unidad = useMemo(()=>unidades.find(x=>String(x.id)===unidadId)||null,[unidades,unidadId]);
  const propietario = useMemo(()=>propietarios.find(x=>normalizar(x.no_apartamento)===normalizar(unidad?.codigo))||null,[propietarios,unidad]);

  const cargarFiscal = useCallback(async (id:number)=>{
    const [f,h]=await Promise.all([
      supabase.rpc("vam_cf_estado_secuencia", {p_condominio_id:id}),
      supabase.rpc("vam_cf_historial", {p_condominio_id:id,p_limite:100}),
    ]);
    if (f.error) { setFiscal(null); setAviso(`Control fiscal no disponible: ${f.error.message}. Instale el SQL y configure el usuario autorizado.`); }
    else setFiscal((f.data||null) as Fiscal|null);
    if (h.error) setHistorial([]);
    else setHistorial((Array.isArray(h.data)?h.data:[]) as Historial[]);
  },[]);

  useEffect(()=>{
    const img=new window.Image(); img.onload=()=>setSello(SELLO_URL);
    img.onerror=()=>setSello(null); img.src=SELLO_URL;
    const id=Number(localStorage.getItem("condominio_id")||0);
    if(!Number.isInteger(id)||id<=0){setError("No hay un condominio válido en la sesión.");setListo(true);return;}
    setCondominioId(id);
    let activo=true;
    (async()=>{
      try {
        const [co,us,pr,gas]=await Promise.all([
          supabase.from("condominios").select("*").eq("id",id).maybeSingle(),
          supabase.from("unidades").select("id,codigo,cuota_mensual_actual").eq("condominio_id",id).eq("activa",true).order("codigo"),
          supabase.from("propietarios_apartamentos").select("no_apartamento,nombre_propietario,cedula").eq("condominio_id",id),
          supabase.from("gas_configuracion").select("modalidad").eq("condominio_id",id).maybeSingle(),
        ]);
        if(!activo)return;
        const errors=[co.error,us.error,pr.error,gas.error].filter(Boolean).map(e=>e!.message);
        if(errors.length) throw new Error(errors.join(" | "));
        const c=(co.data||{}) as Record<string,unknown>;
        setCondominio({nombre:String(c.nombre||""),rnc:String(c.rnc||c.RNC||"")});
        setUnidades((us.data||[]) as Unidad[]);setPropietarios((pr.data||[]) as Propietario[]);
        setModalidadGas(normalizar(gas.data?.modalidad));
        await cargarFiscal(id);
      } catch (e:unknown) {if(activo) setError(e instanceof Error?e.message:"Error cargando datos del condominio");}
      finally {if(activo)setListo(true);}
    })();
    return ()=>{activo=false;};
  },[cargarFiscal]);

  const consultar = useCallback(async (idUnidad?:string, mes?:string)=>{
    const uid=idUnidad??unidadId;const pm=mes??periodo;
    if(!condominioId||!uid||!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(pm)){
      setError("Seleccione apartamento y mes válidos.");return;
    }
    const pg=condominioId===ID_DON_JUAN?periodoAnterior(pm):pm;
    setCargando(true);setError("");setAviso("");setConsultado(false);setCargos([]);setLecturas([]);setDocumento(null);
    try {
      const [cr,lr,dr]=await Promise.all([
        supabase.from("cargos_periodicos")
          .select("id,periodo,concepto,tipo_cargo,monto,monto_pagado,balance,estado")
          .eq("condominio_id",condominioId).eq("unidad_id",Number(uid))
          .in("periodo",Array.from(new Set([pm,pg]))).order("id"),
        supabase.from("gas_facturacion_unidades")
          .select("id,estado,cargo_periodico_id,fecha_lectura_anterior,fecha_lectura,lectura_anterior,lectura_actual,consumo,consumo_facturable,unidad_facturacion_codigo,precio_unitario,importe")
          .eq("condominio_id",condominioId).eq("unidad_id",Number(uid))
          .gte("periodo",`${pg}-01`).lt("periodo",periodoSiguiente(pg)),
        supabase.rpc("vam_cf_documento_por_unidad_periodo", {
          p_condominio_id:condominioId,p_unidad_id:Number(uid),p_periodo:pm,
        }),
      ]);
      if(cr.error)throw new Error("Error consultando cargos: "+cr.error.message);
      // Si el RPC fiscal falla, no habilitar emisión: sin lectura de duplicados.
      if(dr.error)throw new Error("Error consultando comprobante emitido: "+dr.error.message);
      const encontrados=((cr.data||[]) as Cargo[]).filter(c=>
        normalizar(c.estado)!=="ANULADO" &&
        ((c.periodo===pm&&esMantenimiento(c))||(c.periodo===pg&&esGas(c)))
      );
      setCargos(encontrados);
      if(lr.error) setAviso("No se pudo recuperar el detalle del medidor: "+lr.error.message);
      else setLecturas((lr.data||[]) as LecturaGas[]);
      setDocumento(dr.data ? (dr.data as Documento) : null);
      setConsultado(true);
    }catch(e:unknown){setError(e instanceof Error?e.message:"No se pudo consultar el período");}
    finally{setCargando(false);}
  },[condominioId,unidadId,periodo]);

  const renglones = useMemo(()=>documento
    ? (Array.isArray(documento.detalle_cargos)?documento.detalle_cargos:[])
    : cargos,[documento,cargos]);
  const totalMantenimiento = documento?.total_mantenimiento ?? renglones.filter(esMantenimiento).reduce((s,c)=>s+Number(c.monto||0),0);
  const totalGas = documento?.total_gas ?? renglones.filter(esGas).reduce((s,c)=>s+Number(c.monto||0),0);
  const total = documento?.total_factura ?? totalMantenimiento+totalGas;
  const totalPagado = renglones.reduce((s,c)=>s+Number(c.monto_pagado||0),0);
  const saldoMes = renglones.reduce((s,c)=>s+Number(c.balance||0),0);
  const gasObligatorio = condominioId===ID_DON_JUAN||modalidadGas==="CON_MEDIDORES";
  const faltaGas = gasObligatorio && !renglones.some(esGas) && !documento;
  const faltaMantenimiento = !renglones.some(esMantenimiento)&&!documento;
  const detalleGas = useMemo(()=>{
    if(documento)return Array.isArray(documento.detalle_gas)?documento.detalle_gas:[];
    return lecturas.filter(l=>normalizar(l.estado)==="APROBADA" &&
      renglones.some(c=>esGas(c)&&Number(c.id)===Number(l.cargo_periodico_id)));
  },[documento,lecturas,renglones]);
  const ncfAsignado = documento?.estado==="EMITIDO" ? documento.ncf : null;
  const puedeEmitir = !!(consultado&&!documento&&fiscal?.habilitada&&fiscal.autorizacion_verificada&&
    renglones.length>0&&!faltaGas&&!faltaMantenimiento&&!cargando&&!emitiendo);
  // El documento destinado al propietario no muestra renglones de ITBIS.
  // Si existiera una carga fiscal positiva registrada, NO se imprime una factura
  // incompleta: se requiere el desglose legal correspondiente antes de compartirla.
  const requiereDesgloseFiscal = !!documento && Number(documento.itbis || 0) > 0;
  const puedeImprimir = consultado && renglones.length>0 && !cargando &&
    (!!documento || !faltaGas) && !requiereDesgloseFiscal;
  const fechaFactura = documento ? fechaBonita(documento.fecha_emision) : new Date().toLocaleDateString("es-DO");
  const filtrados = historial.filter(h=>`${h.ncf} ${h.codigo_apartamento} ${h.propietario} ${h.periodo}`.toLowerCase().includes(busquedaHistorial.toLowerCase()));

  async function emitir(){
    if(!condominioId||!unidadId||!puedeEmitir)return;
    if(!window.confirm(`CONFIRMAR EMISIÓN FISCAL\n\nCondominio: ${condominio.nombre}\nApartamento: ${unidad?.codigo}\nMes: ${mesBonito(periodo)}\nMantenimiento: ${pesos(totalMantenimiento)}\nGas (${mesBonito(gasPeriodo)}): ${pesos(totalGas)}\nTotal: ${pesos(total)}\n\nEl servidor asignará un NCF B02 ÚNICO y guardará un documento inmutable. ¿Emitir?`))return;
    setEmitiendo(true);setError("");setMensaje("");
    try {
      const r=await supabase.rpc("vam_cf_emitir_factura", {
        p_condominio_id:condominioId,p_unidad_id:Number(unidadId),p_periodo:periodo,
      });
      if(r.error)throw new Error(r.error.message);
      const respuesta=r.data as {documento?:Documento;reutilizado?:boolean}|null;
      if(!respuesta?.documento?.ncf)throw new Error("La operación no devolvió el comprobante emitido.");
      setDocumento(respuesta.documento);
      setMensaje(`${respuesta.reutilizado?"Comprobante existente recuperado":"Comprobante emitido correctamente"}: ${respuesta.documento.ncf}. Ya puede imprimirlo o guardarlo como PDF.`);
      await cargarFiscal(condominioId);
    }catch(e:unknown){setError(e instanceof Error?e.message:"No se pudo emitir el comprobante");}
    finally{setEmitiendo(false);}
  }
  function limpiarConsulta(){setConsultado(false);setDocumento(null);setCargos([]);setLecturas([]);setError("");setAviso("");setMensaje("");}
  function cargarSelloTemporal(f?:File){
    if(!f)return;
    if(!["image/png","image/jpeg","image/webp"].includes(f.type)||f.size>3000000){
      setAviso("Seleccione PNG/JPG/WEBP menor de 3MB.");return;
    }
    const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==="string")setSello(reader.result);};reader.readAsDataURL(f);
  }
  function abrirHistorial(h:Historial){setUnidadId(String(h.unidad_id));setPeriodo(h.periodo);void consultar(String(h.unidad_id),h.periodo);}

  const nombreEmisor=documento?.nombre_emisor||condominio.nombre;
  const rncEmisor=documento?.rnc_emisor||condominio.rnc;
  const nombrePropietario=documento?.propietario||propietario?.nombre_propietario||"Sin identificar";
  const codigoApartamento=documento?.codigo_apartamento||unidad?.codigo||"—";
  const periodoFactura=documento?.periodo||periodo;
  const periodoConsumo=documento?.periodo_gas||gasPeriodo;

  return <PageContainer>
    <main className="vam-cf-screen mx-auto max-w-5xl space-y-5 py-5">
      <header className="rounded-2xl bg-slate-900 p-6 text-white">
        <div className="flex items-center gap-3"><FileText className="h-7 w-7"/>
          <div><h1 className="text-xl font-black">Facturación y Comprobantes Fiscales</h1>
            <p className="mt-1 text-sm text-slate-200">{condominio.nombre||"Condominio"} · {VERSION}</p></div>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 text-blue-700"/>
          <div className="flex-1"><strong>Control fiscal por condominio (NCF B02)</strong>
            {fiscal ? <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-700">
              <span>Último NCF: <b>{fiscal.ultimo_ncf||"—"}</b></span>
              <span>Siguiente disponible: <b>{fiscal.proximo_ncf||"—"}</b> (sin asignar)</span>
              <span>Estado: <b className={fiscal.habilitada?"text-emerald-700":"text-amber-700"}>{fiscal.habilitada?"HABILITADO":"PENDIENTE DE CONFIGURACIÓN"}</b></span>
              {fiscal.rango_fin!=null&&<span>Límite autorizado: <b>B02{String(fiscal.rango_fin).padStart(8,"0")}</b></span>}
            </div> : <p className="mt-1 text-xs text-amber-700">Falta configurar el control fiscal o autorizar al usuario.</p>}
            <p className="mt-2 text-xs text-slate-500">Los borradores no muestran NCF asignado. Solo el servidor genera el NCF al emitir; un período ya emitido conserva siempre su número.</p>
          </div><button type="button" onClick={()=>{if(condominioId)void cargarFiscal(condominioId);}} className="rounded-lg border p-2" title="Actualizar estado fiscal"><RefreshCw className="h-4 w-4"/></button></div>
      </section>

      {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div>}
      {aviso&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{aviso}</div>}
      {mensaje&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">{mensaje}</div>}
        {requiereDesgloseFiscal&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">Este comprobante contiene un importe fiscal que requiere desglose. La impresión se ha bloqueado para evitar entregar una factura incompleta. Consulte al contador antes de modificar el diseño fiscal.</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-black text-slate-900">Factura mensual del propietario</h2>
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <label className="space-y-1 text-sm font-bold">Apartamento / propietario
            <select value={unidadId} disabled={!listo||cargando||emitiendo} onChange={e=>{setUnidadId(e.target.value);limpiarConsulta();}} className="w-full rounded-xl border px-3 py-3">
              <option value="">Seleccione apartamento</option>
              {unidades.map(u=><option key={u.id} value={u.id}>{u.codigo} — {propietarios.find(p=>normalizar(p.no_apartamento)===normalizar(u.codigo))?.nombre_propietario||"Sin propietario"}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-bold">Mes de facturación
            <input type="month" value={periodo} disabled={cargando||emitiendo} onChange={e=>{setPeriodo(e.target.value);limpiarConsulta();}} className="w-full rounded-xl border px-3 py-3"/>
          </label>
        </div>
        <p className="mt-3 rounded-xl bg-cyan-50 p-3 text-xs font-semibold text-cyan-900">Mantenimiento: {mesBonito(periodo)} · Gas: {mesBonito(gasPeriodo)}. No se incluyen saldos iniciales ni deudas de otros períodos.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={()=>void consultar()} disabled={!unidadId||cargando||emitiendo} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{cargando?"Consultando...":"Consultar factura"}</button>
          <button type="button" onClick={()=>{if(condominioId){void consultar();void cargarFiscal(condominioId);}}} disabled={!unidadId||cargando} className="rounded-xl border px-4 py-3 text-sm font-bold">Actualizar</button>
          <button type="button" onClick={()=>window.print()} disabled={!puedeImprimir} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-40"><Printer className="h-4 w-4"/>{documento?"Imprimir NCF / Guardar PDF":"Imprimir borrador"}</button>
          {!documento && <button type="button" onClick={()=>void emitir()} disabled={!puedeEmitir} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">{emitiendo?"Emitiendo...":"Emitir NCF oficial"}</button>}
        </div>
        {consultado&&!documento&&!fiscal?.habilitada&&<p className="mt-3 text-xs text-amber-800">La emisión está bloqueada hasta verificar el rango autorizado, la tributación y el operador en Supabase.</p>}
        {consultado&&faltaGas&&<p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>Falta el cargo de gas aprobado del período {mesBonito(gasPeriodo)}. No es posible emitir una factura incompleta.</p>}
        {consultado&&faltaMantenimiento&&<p className="mt-3 text-sm text-amber-800">No hay un cargo de mantenimiento válido para el mes seleccionado.</p>}
        {condominioId===ID_DON_JUAN&&<label className="mt-4 block text-xs text-slate-600">Sello del condominio (opcional si existe public/sello-don-juan.png)
          <input className="mt-2 block w-full" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>cargarSelloTemporal(e.target.files?.[0])}/>
        </label>}
      </section>

      {consultado&&<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-black">{documento?"Comprobante fiscal emitido":"Vista previa mensual"}</h2>
            <p className="text-xs text-slate-500">Apartamento {codigoApartamento} · {mesBonito(periodoFactura)}</p></div>
          {documento?<span className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-900">NCF: {documento.ncf} · {documento.estado}</span>
            :<span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">BORRADOR SIN NCF</span>}
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-2"><p><b>Propietario:</b> {nombrePropietario}</p>
          <p><b>Apartamento:</b> {codigoApartamento}{ncfAsignado&&<span className="block font-bold text-blue-900">NCF: {ncfAsignado}</span>}</p></div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs">Mantenimiento · {mesBonito(periodoFactura)}</p><strong>{pesos(totalMantenimiento)}</strong></div>
          <div className="rounded-xl bg-cyan-50 p-3"><p className="text-xs">Gas · {mesBonito(periodoConsumo)}</p><strong>{pesos(totalGas)}</strong></div>
          <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs">TOTAL FACTURA</p><strong className="text-lg text-blue-950">{pesos(total)}</strong></div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-sm"><thead className="bg-slate-100"><tr>
          <th className="p-3 text-left">Concepto y período</th><th className="p-3 text-right">Cargo</th><th className="p-3 text-right">Pagado *</th><th className="p-3 text-right">Pendiente *</th></tr></thead>
          <tbody>{renglones.map(c=><tr className="border-b" key={c.id}><td className="p-3">{c.concepto||(esGas(c)?"Consumo de gas":"Mantenimiento")}
            <small className="block text-slate-500">{mesBonito(c.periodo)}</small></td>
            <td className="p-3 text-right">{pesos(c.monto)}</td><td className="p-3 text-right">{pesos(c.monto_pagado)}</td><td className="p-3 text-right">{pesos(c.balance)}</td></tr>)}</tbody>
          <tfoot className="bg-slate-50 font-bold"><tr><td className="p-3">TOTAL MES</td><td className="p-3 text-right">{pesos(total)}</td><td className="p-3 text-right">{pesos(totalPagado)}</td><td className="p-3 text-right">{pesos(saldoMes)}</td></tr></tfoot>
        </table></div>
        <p className="mt-2 text-xs text-slate-500">* Los pagos y saldos son informativos al momento de generar el documento. No incluyen períodos anteriores.</p>
        {detalleGas.length>0&&<div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4"><h3 className="mb-3 font-black text-cyan-900">Lecturas de gas · {mesBonito(periodoConsumo)}</h3>
          {detalleGas.map((g,i)=><div key={`${g.cargo_periodico_id||0}-${i}`} className="mb-2 grid gap-2 text-xs sm:grid-cols-3">
            <span>Lectura anterior: {numero(g.lectura_anterior,3)} ({fechaBonita(g.fecha_lectura_anterior)})</span>
            <span>Lectura actual: {numero(g.lectura_actual,3)} ({fechaBonita(g.fecha_lectura)})</span>
            <span>Consumo medido: {numero(g.consumo,4)}</span>
            <span>Consumo facturable: {numero(g.consumo_facturable,4)} {g.unidad_facturacion_codigo||""}</span>
            <span>Precio unitario: {pesos(g.precio_unitario)}</span><span>Importe aprobado: {pesos(g.importe)}</span>
          </div>)}
        </div>}
      </section>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-black">Historial fiscal del condominio</h2>
          <label className="flex items-center gap-2 rounded-xl border px-3"><Search className="h-4 w-4 text-slate-500"/>
            <input placeholder="NCF, apartamento o propietario" className="py-2 text-xs outline-none" value={busquedaHistorial} onChange={e=>setBusquedaHistorial(e.target.value)}/></label>
        </div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[580px] text-xs"><thead className="bg-slate-100"><tr>
          <th className="p-2 text-left">NCF</th><th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Apto</th><th className="p-2 text-left">Período</th><th className="p-2 text-right">Total</th><th className="p-2 text-left">Estado</th></tr></thead>
          <tbody>{filtrados.map(h=><tr key={h.id} className="cursor-pointer border-b hover:bg-blue-50" onClick={()=>abrirHistorial(h)}>
            <td className="p-2 font-bold text-blue-800">{h.ncf}</td><td className="p-2">{fechaBonita(h.fecha_emision)}</td>
            <td className="p-2">{h.codigo_apartamento}</td><td className="p-2">{mesBonito(h.periodo)}</td>
            <td className="p-2 text-right">{pesos(h.total_factura)}</td><td className="p-2">{h.estado}</td></tr>)}
            {!filtrados.length&&<tr><td colSpan={6} className="p-5 text-center text-slate-500">No hay comprobantes en el historial.</td></tr>}</tbody>
        </table></div><p className="mt-2 text-xs text-slate-500">Haga clic en una factura para consultar su copia. Últimos 100 registros.</p>
      </section>
      <p className="text-right text-xs text-slate-500">Comprobantes fiscales · {VERSION} · {FECHA_VERSION}</p>
    </main>

    {puedeImprimir&&createPortal(<article className="vam-cf-print" aria-label="Factura mensual del propietario">
      <header className="vam-cf-header"><h1>{nombreEmisor}</h1><p>RNC: {rncEmisor}</p>
        <h2>{documento?"FACTURA DE CONSUMO":"AVISO DE COBRO MENSUAL"}</h2>
        {!documento&&<small>BORRADOR SIN VALOR FISCAL · SIN NCF EMITIDO</small>}
        {documento?.estado==="ANULADO"&&<strong className="vam-cf-anulado">COMPROBANTE ANULADO</strong>}
      </header>
      <div className="vam-cf-datos">
        <div><p><b>Propietario:</b> {nombrePropietario}</p><p><b>Documento:</b> {documento?.documento_propietario||propietario?.cedula||"—"}</p></div>
        <div><p><b>Apartamento:</b> {codigoApartamento}</p>{ncfAsignado&&<p className="vam-cf-ncf"><b>NCF:</b> {ncfAsignado}</p>}</div>
        <p><b>Fecha de emisión:</b> {fechaFactura}</p>
        <p><b>Facturación:</b> {mesBonito(periodoFactura)}</p>
      </div>
      <table className="vam-cf-print-table"><thead><tr><th>Concepto / período</th><th>Importe RD$</th><th>Aplicado *</th><th>Balance *</th></tr></thead>
        <tbody>{renglones.map(c=><tr key={c.id}><td>{c.concepto||(esGas(c)?"Consumo de gas":"Mantenimiento")}
          <br/><small>{mesBonito(c.periodo)}</small></td><td>{numero(c.monto)}</td><td>{numero(c.monto_pagado)}</td><td>{numero(c.balance)}</td></tr>)}</tbody>
        <tfoot><tr><td>TOTAL FACTURADO</td><td>{numero(total)}</td><td>{numero(totalPagado)}</td><td>{numero(saldoMes)}</td></tr></tfoot>
      </table>
      <div className="vam-cf-resumen"><p>Mantenimiento ({mesBonito(periodoFactura)}): <b>{pesos(totalMantenimiento)}</b></p>
        <p>Gas ({mesBonito(periodoConsumo)}): <b>{pesos(totalGas)}</b></p>
        <p>TOTAL: <b>{pesos(total)}</b></p></div>
      {detalleGas.length>0&&<section className="vam-cf-medidor"><h3>CONSUMO DE GAS — {mesBonito(periodoConsumo)}</h3>
        {detalleGas.map((g,i)=><div key={i}><p>Lectura anterior: {numero(g.lectura_anterior,3)} ({fechaBonita(g.fecha_lectura_anterior)}) · Actual: {numero(g.lectura_actual,3)} ({fechaBonita(g.fecha_lectura)})</p>
          <p>Consumo: {numero(g.consumo,4)} · Facturable: {numero(g.consumo_facturable,4)} {g.unidad_facturacion_codigo||""} · Precio: {pesos(g.precio_unitario)}</p></div>)}</section>}
      <p className="vam-cf-observacion">Solo conceptos del mes indicado (mantenimiento actual y gas previo en Don Juan I). No incluye deuda histórica.
        {' '}* Los pagos y balances son el estado registrado al elaborar el documento.</p>
      {condominioId===ID_DON_JUAN&&sello&&<div className="vam-cf-sello"><img src={sello} alt="Sello del Condominio Don Juan I"/></div>}
      <footer>VAM Administradora de Condominios · 829-792-9292 · {VERSION}</footer>
    </article>,document.body)}
    <style jsx global>{`
      .vam-cf-print{display:none}
      @media print {
        @page{size:letter portrait;margin:.45in}
        html,body{background:white!important;color:#14233d!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        body > *:not(.vam-cf-print){display:none!important}
        body > .vam-cf-print{display:block!important}
        .vam-cf-print{display:block!important;font:10px/1.45 Arial,sans-serif;color:#14233d;width:100%}
        .vam-cf-header{text-align:center;border-bottom:2px solid #132d51;padding-bottom:12px}
        .vam-cf-header h1{font-size:17px;text-transform:uppercase;margin:0}
        .vam-cf-header h2{font-size:17px;margin:11px 0 4px}
        .vam-cf-header p{margin:2px 0}
        .vam-cf-header small{color:#9a3412;font-weight:bold}
        .vam-cf-anulado{display:block;font-size:17px;color:#b91c1c;margin:5px}
        .vam-cf-datos{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin:13px 0 17px}
        .vam-cf-datos p{margin:2px 0}
        .vam-cf-ncf{font-size:12px!important;font-weight:bold;color:#16345c}
        .vam-cf-print-table{width:100%;border-collapse:collapse}
        .vam-cf-print-table th,.vam-cf-print-table td{border:1px solid #b8c6d4;padding:7px 6px;vertical-align:top}
        .vam-cf-print-table th{background:#eaf1f9}
        .vam-cf-print-table th:not(:first-child),.vam-cf-print-table td:not(:first-child){text-align:right}
        .vam-cf-print-table tfoot{background:#edf2f8;font-weight:bold}
        .vam-cf-resumen{background:#eaf1f9;border:1px solid #bac9d8;padding:8px 10px;margin-top:12px}
        .vam-cf-resumen p{display:flex;justify-content:space-between;margin:2px}
        .vam-cf-medidor{border:1px solid #9ccad4;padding:10px;margin-top:12px;break-inside:avoid}
        .vam-cf-medidor h3{font-size:10px;margin:0 0 6px}.vam-cf-medidor p{margin:3px}
        .vam-cf-observacion{font-size:9px;margin-top:11px}
        .vam-cf-sello{display:flex;justify-content:flex-end;min-height:85px;margin-top:10px;break-inside:avoid}
        .vam-cf-sello img{max-width:145px;max-height:95px;object-fit:contain}
        .vam-cf-print footer{border-top:1px solid #cbd5e1;margin-top:14px;padding-top:6px;font-size:9px}
        .vam-cf-print-table tr{break-inside:avoid}
      }
    `}</style>
  </PageContainer>;
}
