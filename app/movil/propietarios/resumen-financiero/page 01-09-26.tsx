"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";
import { ArrowLeft, CalendarDays, ChevronRight, Eye, FileText, Landmark, Loader2, ReceiptText, RefreshCw, Scale, TrendingDown, TrendingUp, WalletCards } from "lucide-react";

type PropietarioActual = { propietario_id:number; condominio_id:number; condominio_nombre:string; condominio_logo_url?:string; unidad_id:number; no_apartamento:string; nombre_propietario:string };
type CuentaBancaria = { id:number; nombre_banco:string|null; numero_cuenta:string|null };
type CierreBancario = { periodo:string; balance_inicial:number|string|null; total_ingresos:number|string|null; total_gastos:number|string|null; balance_final:number|string|null; estado:string|null };
type Gasto = { id:number; condominio_id:number|null; fecha:string|null; categoria:string|null; descripcion:string|null; proveedor:string|null; monto:number|string|null; concepto:string|null; detalle_gasto:string|null; total:number|string|null; no_factura:string|null; factura_url:string|null; cheque_url:string|null; numero_cheque:string|null; fecha_pago:string|null };

const money=(v:unknown)=>new Intl.NumberFormat("es-DO",{style:"currency",currency:"DOP",minimumFractionDigits:2}).format(Number(v||0));
const fmt=(v?:string|null)=>{if(!v)return "-";const [y,m,d]=String(v).slice(0,10).split("-");return y&&m&&d?`${d}/${m}/${y}`:String(v)};
const currentPeriod=()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`};
const periodName=(p:string)=>{const [y,m]=p.split("-");return new Date(Number(y),Number(m)-1,1).toLocaleDateString("es-DO",{month:"long",year:"numeric"})};
const range=(p:string)=>{const [y,m]=p.split("-").map(Number);const from=`${y}-${String(m).padStart(2,"0")}-01`;const n=new Date(y,m,1);const to=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`;return{from,to}};
const esPeriodoCerrado=(estado?:string|null)=>["cerrado","cerrada"].includes(String(estado||"").trim().toLowerCase());

export default function TransparenciaFinancieraPage(){
 const router=useRouter();
 const [propietario,setPropietario]=useState<PropietarioActual|null>(null);
 const [cuenta,setCuenta]=useState<CuentaBancaria|null>(null);
 const [cierres,setCierres]=useState<CierreBancario[]>([]);
 const [cierre,setCierre]=useState<CierreBancario|null>(null);
 const [gastos,setGastos]=useState<Gasto[]>([]);
 const [periodo,setPeriodo]=useState("");
 const [loading,setLoading]=useState(true);
 const [consultando,setConsultando]=useState(false);
 const [error,setError]=useState("");

 useEffect(()=>{void inicializar()},[]);
 useEffect(()=>{if(propietario?.condominio_id&&periodo)void cargarPeriodo(propietario,periodo)},[periodo,propietario?.condominio_id]);

 async function inicializar(){
  setLoading(true);setError("");
  try{
   const raw=localStorage.getItem("propietario_actual");
   if(!raw){router.replace("/movil/propietarios/login");return}
   const s=JSON.parse(raw) as PropietarioActual;
   if(!s?.propietario_id||!s?.condominio_id||!s?.unidad_id){router.replace("/movil/propietarios/login");return}
   setPropietario(s);
   const [{data:cuentaData},{data:cierresData}]=await Promise.all([
    supabase.from("cuentas_bancarias").select("id,nombre_banco,numero_cuenta").eq("condominio_id",s.condominio_id).eq("activa",true).order("id").limit(1).maybeSingle(),
    supabase.from("banco_cierres_mensuales").select("periodo,balance_inicial,total_ingresos,total_gastos,balance_final,estado").eq("condominio_id",s.condominio_id).order("periodo",{ascending:false})
   ]);
   setCuenta((cuentaData as CuentaBancaria)||null);const cierresCerrados=((cierresData||[]) as CierreBancario[]).filter(x=>esPeriodoCerrado(x.estado));setCierres(cierresCerrados);if(cierresCerrados.length>0){setPeriodo(cierresCerrados[0].periodo);}else{setPeriodo("");setCierre(null);setGastos([]);}
  }catch(e:any){setError(e?.message||"No se pudo cargar el resumen financiero.")}finally{setLoading(false)}
 }

 async function cargarPeriodo(s:PropietarioActual,p:string){
  if(!p){setCierre(null);setGastos([]);return;}
  setConsultando(true);setError("");
  const cierreResp=await supabase.from("banco_cierres_mensuales").select("periodo,balance_inicial,total_ingresos,total_gastos,balance_final,estado").eq("condominio_id",s.condominio_id).eq("periodo",p).limit(1).maybeSingle();
  if(cierreResp.error){setError(`No se pudo validar el cierre mensual: ${cierreResp.error.message}`);setCierre(null);setGastos([]);setConsultando(false);return;}
  const cierreValidado=(cierreResp.data as CierreBancario)||null;
  if(!cierreValidado||!esPeriodoCerrado(cierreValidado.estado)){setError("Este periodo todavía no está cerrado y no está disponible para propietarios.");setCierre(null);setGastos([]);setConsultando(false);return;}
  const {from,to}=range(p);
  const gastosResp=await supabase
   .from("gastos")
   .select("id,condominio_id,fecha,categoria,descripcion,proveedor,monto,concepto,detalle_gasto,total,no_factura,factura_url,cheque_url,numero_cheque,fecha_pago")
   .eq("condominio_id",s.condominio_id)
   .or(`and(fecha_pago.gte.${from},fecha_pago.lt.${to}),and(fecha_pago.is.null,fecha.gte.${from},fecha.lt.${to})`)
   .order("fecha_pago",{ascending:false,nullsFirst:false})
   .order("fecha",{ascending:false})
   .order("id",{ascending:false});
  if(gastosResp.error){setError(`No se pudieron cargar los gastos: ${gastosResp.error.message}`);setGastos([])}else setGastos((gastosResp.data||[]) as Gasto[]);
  setCierre(cierreValidado);setConsultando(false);
 }

 const periodos=useMemo(()=>cierres.filter(x=>esPeriodoCerrado(x.estado)).map(x=>x.periodo).filter(Boolean).sort((a,b)=>b.localeCompare(a)),[cierres]);
 const totalDetalle=useMemo(()=>gastos.reduce((s,g)=>s+Number(g.total||g.monto||0),0),[gastos]);
 const inicial=Number(cierre?.balance_inicial||0), ingresos=Number(cierre?.total_ingresos||0), egresos=Number(cierre?.total_gastos||totalDetalle||0), final=Number(cierre?.balance_final||0)||inicial+ingresos-egresos;

 if(loading)return <main className="min-h-dvh bg-slate-100 px-4 py-6"><div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center"><div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm"><Loader2 size={20} className="animate-spin text-blue-700"/>Cargando transparencia financiera...</div></div></main>;
 if(!propietario)return null;

 return <main className="min-h-dvh bg-slate-100 pb-8">
  <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-7 pt-4 text-white"><div className="mx-auto max-w-lg">
   <div className="flex items-center justify-between gap-3">
    <button onClick={()=>router.push("/movil/propietarios/dashboard")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"><ArrowLeft size={19}/></button>
    <div className="min-w-0 flex-1 text-center"><p className="text-[11px] uppercase tracking-[0.16em] text-blue-200">Transparencia financiera</p><h1 className="truncate text-base font-black">Resumen mensual</h1></div>
    <button onClick={()=>cargarPeriodo(propietario,periodo)} disabled={consultando} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"><RefreshCw size={18} className={consultando?"animate-spin":""}/></button>
   </div>
   <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">{propietario.condominio_logo_url?<img src={propietario.condominio_logo_url} alt={propietario.condominio_nombre} className="h-11 w-11 rounded-xl bg-white object-contain p-1.5"/>:<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xs font-black text-blue-900">VAM</span>}<div><p className="text-sm font-extrabold">{propietario.condominio_nombre}</p><p className="text-[11px] text-blue-100">Unidad {propietario.no_apartamento}</p></div></div>
  </div></header>

  <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
   <section className="rounded-[1.4rem] border border-blue-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3">
     <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CalendarDays size={20}/></span>
     <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">Consulta mensual</p>
      <h2 className="text-sm font-black text-slate-900">Seleccione el mes cerrado</h2>
     </div>
     {cierre&&<span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">CERRADO</span>}
    </div>
    {periodos.length>0?(
     <div className="mt-4">
      <label htmlFor="periodo-financiero" className="mb-1.5 block text-xs font-extrabold text-slate-700">Mes disponible</label>
      <select id="periodo-financiero" value={periodo} onChange={e=>setPeriodo(e.target.value)} className="h-12 w-full rounded-xl border border-blue-300 bg-white px-3 text-sm font-black text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
       {periodos.map(p=><option key={p} value={p}>{periodName(p)}</option>)}
      </select>
      <p className="mt-2 text-[10px] leading-4 text-slate-500">Solo se muestran los meses que ya fueron cerrados oficialmente por la administración.</p>
     </div>
    ):(
     <div className="mt-4 rounded-xl bg-slate-100 px-3 py-4 text-center text-xs text-slate-500">No hay estados financieros cerrados disponibles.</div>
    )}
    <p className="mt-3 flex items-center gap-1 text-[10px] text-slate-400"><Landmark size={12}/>{cuenta?`${cuenta.nombre_banco||"Banco"} · ${cuenta.numero_cuenta||"Sin número"}`:"Cuenta bancaria no identificada"}</p>
    {cierre&&<p className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] leading-4 text-blue-800">La información corresponde a un periodo financiero cerrado y refleja los movimientos registrados por la administración.</p>}
   </section>
   {error&&<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
   <section className="grid grid-cols-2 gap-3"><Resumen titulo="Balance inicial" valor={money(inicial)} icono={<WalletCards size={18}/>}/><Resumen titulo="Ingresos" valor={money(ingresos)} icono={<TrendingUp size={18}/>} clase="border-emerald-200 bg-emerald-50 text-emerald-700"/><Resumen titulo="Gastos" valor={money(egresos)} icono={<TrendingDown size={18}/>} clase="border-red-200 bg-red-50 text-red-700"/><Resumen titulo="Balance final" valor={money(final)} icono={<Scale size={18}/>} clase="border-blue-200 bg-blue-50 text-blue-800"/></section>
   <section><div className="mb-3 flex items-end justify-between px-1"><div><h2 className="text-sm font-black text-slate-900">Gastos del periodo</h2><p className="text-[10px] text-slate-500">Consulte los soportes de cada gasto</p></div><span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-extrabold text-slate-700">{gastos.length}</span></div>
    {consultando?<div className="flex items-center justify-center gap-2 rounded-[1.4rem] border bg-white px-4 py-8 text-xs text-slate-500"><Loader2 size={17} className="animate-spin text-blue-700"/>Consultando periodo...</div>:gastos.length===0?<div className="rounded-[1.4rem] border bg-white px-5 py-8 text-center"><ReceiptText className="mx-auto text-blue-700" size={31}/><p className="mt-3 text-sm font-black">No hay gastos registrados</p></div>:<div className="space-y-3">{gastos.map(g=><article key={g.id} className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">{g.categoria||"Gasto"}</p><h3 className="mt-1 text-sm font-black text-slate-900">{g.concepto||g.descripcion||g.detalle_gasto||"Gasto operativo"}</h3><p className="mt-1 text-[11px] text-slate-500">{g.proveedor||"Proveedor no indicado"}</p></div><p className="shrink-0 text-sm font-black text-red-700">{money(g.total||g.monto)}</p></div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-xl bg-slate-50 p-2.5"><p className="flex items-center gap-1 text-slate-400"><CalendarDays size={12}/>Fecha</p><p className="mt-1 font-bold text-slate-700">{fmt(g.fecha_pago||g.fecha)}</p></div><div className="rounded-xl bg-slate-50 p-2.5"><p className="flex items-center gap-1 text-slate-400"><FileText size={12}/>Documento</p><p className="mt-1 truncate font-bold text-slate-700">{g.no_factura||g.numero_cheque||"Sin número"}</p></div></div><div className="mt-3 space-y-2">
<Link
 href={`/movil/propietarios/resumen-financiero/gastos/${g.id}`}
 className="flex h-10 w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-extrabold text-blue-800"
>
 <span className="flex items-center gap-2">
  <Eye size={15}/>
  {g.factura_url||g.cheque_url?"Ver detalle y soportes":"Ver detalle"}
 </span>
 <ChevronRight size={15}/>
</Link>

{(g.factura_url || g.cheque_url) && (
 <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
  {g.factura_url && (
   <a
    href={g.factura_url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700"
   >
    <FileText size={14}/>
    Abrir factura
   </a>
  )}

  {g.cheque_url && (
   <a
    href={g.cheque_url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-extrabold text-emerald-800"
   >
    <FileText size={14}/>
    Abrir comprobante
   </a>
  )}
 </div>
)}
</div></article>)}</div>}
   </section>
  </div>
 </main>
}

function Resumen({titulo,valor,icono,clase="border-slate-200 bg-white text-slate-900"}:{titulo:string;valor:string;icono:React.ReactNode;clase?:string}){return <div className={`rounded-2xl border p-4 shadow-sm ${clase}`}><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80">{icono}</span><p className="mt-3 text-[10px] font-bold uppercase opacity-70">{titulo}</p><p className="mt-1 text-sm font-black">{valor}</p></div>}
