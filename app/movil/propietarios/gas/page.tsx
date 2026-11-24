"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { ArrowLeft, Flame, RefreshCw, ReceiptText, Camera, Printer } from "lucide-react";

type Propietario = { condominio_id: number; unidad_id: number; condominio_nombre: string; condominio_logo_url?: string; no_apartamento: string; nombre_propietario: string };
type Recibo = { id: number; periodo: string; numero_serie?: string; fecha_lectura_anterior: string; fecha_lectura: string; lectura_anterior: number; lectura_actual: number; consumo: number; unidad_lectura?: string; factor_conversion_aplicado: number | null; consumo_facturable: number | null; unidad_facturacion_codigo?: string; precio_unitario: number; importe: number; foto_anterior_url?: string; foto_actual_url?: string; cargo_periodico_id: number; fecha_aprobacion: string; estado: string };
type Respuesta = { ok: boolean; codigo?: string; mensaje?: string; habilitado: boolean; propietario: Propietario; periodos: string[]; recibos: Recibo[] };
const money = (n: number) => new Intl.NumberFormat("es-DO", {style:"currency", currency:"DOP"}).format(n);
const dec = (n: number | null) => n == null ? "No disponible" : Number(n).toLocaleString("es-DO", {maximumFractionDigits: 6});
const fecha = (s?: string) => s ? s.slice(0,10).split("-").reverse().join("/") : "No disponible";
const mes = (s: string) => new Date(Number(s.slice(0,4)), Number(s.slice(5,7))-1, 1).toLocaleDateString("es-DO", {month:"long",year:"numeric"});
const fotoSegura = (s?: string) => { try { const u = new URL(s || ""); return u.protocol === "https:" && u.hostname === "vcdlephlcnmdzcwcvncj.supabase.co" && u.pathname.startsWith("/storage/v1/object/public/fotos-gas/") ? u.href : null; } catch { return null; } };
const filas = (f: Recibo): [string,string][] => [
  ["Desde", fecha(f.fecha_lectura_anterior)], ["Hasta", fecha(f.fecha_lectura)],
  ["Lectura anterior", `${dec(f.lectura_anterior)} ${f.unidad_lectura || ""}`],
  ["Lectura actual", `${dec(f.lectura_actual)} ${f.unidad_lectura || ""}`],
  ["Consumo registrado", `${dec(f.consumo)} ${f.unidad_lectura || ""}`],
  ["Factor de conversión aplicado", dec(f.factor_conversion_aplicado)],
  ["Consumo facturable", `${dec(f.consumo_facturable)} ${f.unidad_facturacion_codigo || ""}`],
  [`Tarifa por ${f.unidad_facturacion_codigo || "unidad"}`, money(f.precio_unitario)],
];
const numero = (f: Recibo) => `GAS-${String(f.id).padStart(6,"0")}`;
function imprimir(f: Recibo, p: Propietario) {
  const w = window.open("", "_blank", "width=850,height=950");
  if (!w) return false;
  w.opener = null;
  const e = (v: unknown) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const fotos = [["Lectura anterior", f.foto_anterior_url], ["Lectura actual", f.foto_actual_url]].map(([t,u]) => { const url = fotoSegura(u); return `<div><b>${e(t)}</b>${url ? `<img src="${e(url)}" alt="${e(t)}">` : '<p>Fotografía no disponible</p>'}</div>`; }).join("");
  w.document.open();
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${e(numero(f))}</title><style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#172033;max-width:185mm;margin:auto}header{border-bottom:2px solid #1d4ed8;padding:12px 0}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border:1px solid #64748b;padding:9px;text-align:left}td:last-child{text-align:right}th{background:#eff4fa}.total{text-align:right;font-size:19px;font-weight:bold}.fotos{display:flex;gap:12px;margin-top:16px}.fotos div{flex:1;min-width:0}.fotos img{display:block;max-width:100%;max-height:38mm;object-fit:contain}footer{border-top:1px solid #ccc;margin-top:18px;padding-top:8px}button{padding:10px;background:#1d4ed8;color:white;border:0;border-radius:6px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Imprimir / Guardar PDF</button><header><b>VAM ADMINISTRADORA DE CONDOMINIOS</b><h1>FACTURA DE CONSUMO DE GAS</h1>${e(p.condominio_nombre)}</header><p>Factura: ${e(numero(f))} · Período: ${e(mes(f.periodo))}</p><p>Apartamento: ${e(p.no_apartamento)} · Estado: ${e(f.estado)}</p><p>Medidor: ${e(f.numero_serie || "No disponible")} · Cargo: ${e(f.cargo_periodico_id)} · Aprobación: ${e(fecha(f.fecha_aprobacion))}</p><table><thead><tr><th>Detalle</th><th>Valor</th></tr></thead><tbody>${filas(f).map(([k,v])=>`<tr><td>${e(k)}</td><td>${e(v)}</td></tr>`).join("")}</tbody></table><p class="total">TOTAL GAS: ${e(money(f.importe))}</p><p>El estado de pago se consulta en el estado de cuenta del propietario.</p><div class="fotos">${fotos}</div><footer>Preparado por VAM Condominios</footer></body></html>`);
  w.document.close(); w.focus(); return true;
}
export default function GasPropietariosPage() {
  const router = useRouter();
  const [respuesta,setRespuesta] = useState<Respuesta|null>(null);
  const [periodo,setPeriodo] = useState("");
  const [cargando,setCargando] = useState(true);
  const [error,setError] = useState("");
  const [revision,setRevision] = useState(0);
  useEffect(()=>{
    let activo = true;
    const salir = () => { if (!activo) return; for(const k of ["propietario_actual","propietario_token","propietario_token_expira","condominio_id","condominio_nombre","condominio_logo_url"]) localStorage.removeItem(k); router.replace("/movil/acceso-unificado"); };
    async function cargar(){
      setCargando(true); setError(""); setRespuesta(null);
      try {
        const token = localStorage.getItem("propietario_token")?.trim();
        const raw = localStorage.getItem("propietario_actual");
        if(!token || !raw){salir();return;}
        const p = JSON.parse(raw) as Propietario;
        if(!p.condominio_id || !p.unidad_id){salir();return;}
        const {data,error:err} = await supabase.rpc("vam_propietario_consumo_gas",{p_token:token,p_condominio_id:Number(p.condominio_id),p_unidad_id:Number(p.unidad_id),p_periodo:null});
        if(!activo)return;
        if(localStorage.getItem("propietario_token")?.trim()!==token){router.replace("/movil/acceso-unificado");return;}
        if(err)throw err;
        const r = (Array.isArray(data)?data[0]:data) as Respuesta;
        if(!r?.ok){if(["SESION_INVALIDA","SESION_VENCIDA","CUENTA_INACTIVA","CAMBIO_CLAVE_PENDIENTE","SIN_ACCESO"].includes(r?.codigo || "")){salir();return;}throw new Error(r?.mensaje || "No se pudo consultar el gas.");}
        setRespuesta(r); setPeriodo(prev=>r.periodos.includes(prev)?prev:r.periodos[0] || "");
      }catch{if(activo)setError("No se pudo consultar el consumo de gas. Intente nuevamente.");}finally{if(activo)setCargando(false);}
    }
    void cargar(); return ()=>{activo=false;};
  },[router,revision]);
  const p = respuesta?.propietario;
  const recibos = respuesta?.recibos.filter(f=>f.periodo===periodo) || [];
  return <main className="min-h-dvh bg-slate-100 pb-8"><header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-7 pt-4 text-white"><div className="mx-auto max-w-lg"><div className="flex items-center justify-between"><button aria-label="Volver" onClick={()=>router.push("/movil/propietarios/dashboard")} className="rounded-xl bg-white/10 p-3"><ArrowLeft size={20}/></button><button aria-label="Actualizar" disabled={cargando} onClick={()=>setRevision(v=>v+1)} className="rounded-xl bg-white/10 p-3"><RefreshCw size={20}/></button></div><div className="mt-4 flex items-center gap-3">{p?.condominio_logo_url?<img src={p.condominio_logo_url} alt="Logo del condominio" className="h-12 w-12 rounded-xl bg-white object-contain p-1"/>:<Flame size={32}/>}<div><h1 className="text-xl font-black">Mi consumo de gas</h1><p className="text-xs text-blue-100">{p?.condominio_nombre}{p ? ` · Unidad ${p.no_apartamento}` : ""}</p></div></div></div></header><div className="mx-auto max-w-lg space-y-4 p-4">
  {cargando && <p role="status" className="rounded-2xl bg-white p-5">Consultando recibos...</p>}
  {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
  {respuesta && !respuesta.habilitado && <p className="rounded-2xl bg-white p-5">Este condominio no tiene habilitado el gas con medidores.</p>}
  {respuesta?.habilitado && <><section className="rounded-2xl border bg-white p-4"><label className="text-sm font-bold text-slate-700">Historial mensual<select value={periodo} onChange={e=>setPeriodo(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-blue-300 bg-white px-3 font-bold text-slate-800">{respuesta.periodos.length===0&&<option value="">Sin períodos disponibles</option>}{respuesta.periodos.map(m=><option key={m} value={m}>{mes(m)}</option>)}</select></label></section>{recibos.length===0&&<p className="rounded-2xl bg-white p-5">No hay recibos aprobados disponibles.</p>}{recibos.map(f=><section key={f.id} className="space-y-4 rounded-[1.4rem] border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-blue-800"><ReceiptText size={20}/><h2 className="font-black">{numero(f)}</h2></div><p className="text-sm text-slate-500">{mes(f.periodo)} · {f.estado}</p><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-blue-50 p-3"><p className="text-xs text-slate-600">Consumo facturable</p><p className="text-xl font-black text-blue-900">{dec(f.consumo_facturable)} {f.unidad_facturacion_codigo}</p></div><div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-600">Total facturado</p><p className="text-xl font-black text-slate-900">{money(f.importe)}</p></div></div><p className="text-xs text-slate-500">Medidor: {f.numero_serie || "No disponible"}</p><dl className="divide-y">{filas(f).map(([k,v])=><div key={k} className="flex justify-between gap-3 py-2 text-sm"><dt className="text-slate-600">{k}</dt><dd className="text-right font-bold text-slate-900">{v}</dd></div>)}</dl><h3 className="flex items-center gap-2 font-bold"><Camera size={18}/> Fotografías del medidor</h3><div className="grid grid-cols-2 gap-3">{([["Lectura anterior",f.foto_anterior_url],["Lectura actual",f.foto_actual_url]] as const).map(([t,u])=>{const url=fotoSegura(u);return <div key={t} className="rounded-xl bg-slate-50 p-2"><p className="mb-2 text-xs font-bold">{t}</p>{url?<a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={t} className="h-32 w-full rounded-lg object-contain"/><span className="text-xs font-bold text-blue-700">Ampliar fotografía</span></a>:<p className="text-xs text-slate-500">Fotografía no disponible</p>}</div>;})}</div><button onClick={()=>{if(p&&!imprimir(f,p))setError("Permita ventanas emergentes para imprimir el recibo.");}} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 p-3 font-bold text-white"><Printer size={18}/> Imprimir / Guardar PDF</button><p className="text-xs text-slate-500">El estado de pago se consulta en el estado de cuenta.</p></section>)}</>}
  <footer className="text-center text-xs text-slate-400">VAM · Mi consumo de gas v1.0</footer></div></main>;
}
