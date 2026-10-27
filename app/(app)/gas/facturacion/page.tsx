"use client";
/* VAM Condominios | Gas / Facturación | v1.0.6 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Config = { modalidad: string | null; factor_conversion_gas: number | null; unidad_lectura_gas: string | null; unidad_facturacion_gas: string | null };
type Tarifa = { id: number; precio_unitario: number; fecha_inicio: string; estado: string | null; unidad_medida_id: number; gas_unidades_medida: { abreviatura: string | null } | null };
type Factura = { id: number; unidad_id: number; lectura_id: number; periodo: string; lectura_anterior: number; lectura_actual: number; consumo: number; consumo_facturable: number | null; factor_conversion_aplicado: number | null; unidad_facturacion_codigo: string | null; precio_unitario: number; importe: number; estado: string; cargo_periodico_id: number | null; foto_anterior_url: string | null; foto_actual_url: string | null; fecha_aprobacion: string | null; fecha_lectura_anterior: string | null; fecha_lectura: string | null; unidades: { codigo: string | null } | null };
type Resumen = { preparadas?: number; omitidas?: number; lecturas_en_revision?: number; unidades_incompatibles?: number; cargos_generados?: number };
const money = (n: number | null | undefined) => `RD$ ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const decimal = (n: number | null | undefined) => Number(n ?? 0).toLocaleString("es-DO", { maximumFractionDigits: 6 });
const mesActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
function describirError(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const x = e as Record<string, unknown>;
    const partes = [x.message, x.details, x.hint, x.code]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    if (partes.length) return partes.join(" · ");
    try { return JSON.stringify(e); } catch { return "Error desconocido al consultar Supabase"; }
  }
  return String(e ?? "Error desconocido");
}
const codigo = (s: string | null | undefined) => String(s ?? "").trim().toUpperCase();
const fechaES = (fecha: string | null | undefined) => {
  if (!fecha) return "Sin registrar";
  const fechaISO = fecha.slice(0, 10);
  const partes = fechaISO.split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaISO;
};
const diasFacturados = (inicio: string | null | undefined, fin: string | null | undefined): number | null => {
  if (!inicio || !fin) return null;
  const a = Date.parse(`${inicio.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${fin.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 86400000);
};

export default function GasFacturacionPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominioNombre, setCondominioNombre] = useState("");
  const [periodo, setPeriodo] = useState(mesActual());
  const [config, setConfig] = useState<Config | null>(null);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [tarifaId, setTarifaId] = useState("");
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [progresoLote, setProgresoLote] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState<Factura | null>(null);


  const cargar = useCallback(async (id: number, mes: string) => {
    setCargando(true); setError(""); setMensaje(""); setResumen(null);
    try {
      const [anio, numeroMes] = mes.split("-").map(Number);
      if (!Number.isInteger(anio) || !Number.isInteger(numeroMes) || numeroMes < 1 || numeroMes > 12) {
        throw new Error("Período inválido. Seleccione un mes válido.");
      }
      const ultimoDia = new Date(Date.UTC(anio, numeroMes, 0)).getUTCDate();
      const fechaLimite = `${mes}-${String(ultimoDia).padStart(2, "0")}`;
      const [cfg, prices, bills] = await Promise.all([
        supabase.from("gas_configuracion").select("modalidad,factor_conversion_gas,unidad_lectura_gas,unidad_facturacion_gas").eq("condominio_id", id).maybeSingle(),
        supabase.from("gas_precios").select("id,precio_unitario,fecha_inicio,estado,unidad_medida_id,gas_unidades_medida(abreviatura)").eq("condominio_id", id).lte("fecha_inicio", fechaLimite).order("fecha_inicio", { ascending: false }),
        supabase.from("gas_facturacion_unidades").select("id,unidad_id,lectura_id,periodo,lectura_anterior,lectura_actual,consumo,consumo_facturable,factor_conversion_aplicado,unidad_facturacion_codigo,precio_unitario,importe,estado,cargo_periodico_id,foto_anterior_url,foto_actual_url,fecha_aprobacion,fecha_lectura_anterior,fecha_lectura,unidades(codigo)").eq("condominio_id", id).eq("periodo", `${mes}-01`).order("id", { ascending: true }),
      ]);
      if (cfg.error) throw cfg.error;
      if (prices.error) throw prices.error;
      if (bills.error) throw bills.error;
      setConfig((cfg.data ?? null) as Config | null);
      const opciones = (prices.data ?? []) as unknown as Tarifa[];
      setTarifas(opciones);
      setTarifaId((prev) => opciones.some((t) => String(t.id) === prev) ? prev : String(opciones.find((t) => codigo(t.estado) === "ACTIVO" && codigo(t.gas_unidades_medida?.abreviatura) === codigo(cfg.data?.unidad_facturacion_gas))?.id ?? ""));
      setFacturas((bills.data ?? []) as unknown as Factura[]);
      setSeleccion(null);
    } catch (e) { setError(describirError(e)); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("condominio_id") ?? "";
    const id = Number(raw);
    setCondominioNombre(localStorage.getItem("condominio_nombre") ?? "");
    if (!raw || !Number.isSafeInteger(id) || id <= 0) { setError("Seleccione un condominio válido antes de facturar."); return; }
    setCondominioId(id);
    void cargar(id, mesActual());
  }, [cargar]);

  const tarifa = tarifas.find((t) => String(t.id) === tarifaId);
  const listo = !!config && config.modalidad === "CON_MEDIDORES" && config.factor_conversion_gas != null && Number(config.factor_conversion_gas) > 0 && !!codigo(config.unidad_lectura_gas) && !!codigo(config.unidad_facturacion_gas);
  const tarifaValida = !!tarifa && codigo(tarifa.estado) === "ACTIVO" && codigo(tarifa.gas_unidades_medida?.abreviatura) === codigo(config?.unidad_facturacion_gas);
  const pendientes = facturas.filter((f) => f.estado === "PENDIENTE" && f.cargo_periodico_id === null);
  const aprobadas = facturas.filter((f) => f.estado === "APROBADA" || f.estado === "FACTURADO" || f.cargo_periodico_id !== null);
  const visibles = useMemo(() => facturas.filter((f) => `${f.unidades?.codigo ?? ""} ${f.id}`.toLowerCase().includes(busqueda.toLowerCase())), [facturas, busqueda]);

  function imprimirFactura(f: Factura) {
    // Ventana aislada: evita imprimir el menú global y el modal de VAM Enterprise.
    const ventana = window.open("", "_blank", "width=850,height=950");
    if (!ventana) {
      setError("El navegador bloqueó la ventana de impresión. Permita ventanas emergentes para este sitio.");
      return;
    }
    const escapar = (valor: unknown) => String(valor ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    const fila = (etiqueta: string, valor: string) => `<tr><td>${escapar(etiqueta)}</td><td class="valor">${escapar(valor)}</td></tr>`;
    const foto = (url: string | null, titulo: string) => url && /^https:\/\//i.test(url)
      ? `<div class="foto"><b>${escapar(titulo)}</b><img src="${escapar(url)}" alt="${escapar(titulo)}" /></div>`
      : "";
    const contenido = `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
      <title>Factura GAS-${String(f.id).padStart(6,"0")}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: white; color: #172033; font-family: Arial, Helvetica, sans-serif; }
        body { font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .hoja { width: 100%; max-width: 185mm; margin: 0 auto; }
        header { border-bottom: 2px solid #1d4ed8; padding: 0 0 12px; }
        .marca { font-size: 11px; font-weight: 700; color: #1d4ed8; letter-spacing: .3px; }
        h1 { font-size: 20px; line-height: 1.2; margin: 7px 0 5px; }
        .condominio { font-size: 11px; line-height: 1.4; overflow-wrap: anywhere; }
        .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 9px 20px; margin: 17px 0; }
        .datos div { min-width: 0; overflow-wrap: anywhere; }
        table { width: 100%; border-collapse: collapse; margin: 14px 0; table-layout: fixed; }
        th, td { border: 1px solid #64748b; padding: 9px 10px; text-align: left; }
        th { background: #eff4fa; font-weight: 700; }
        td.valor, th.valor { text-align: right; }
        .total { border-top: 2px solid #172033; padding-top: 13px; margin-top: 16px; text-align: right; font-size: 19px; font-weight: 800; }
        .nota { font-size: 10px; color: #475569; margin-top: 18px; line-height: 1.5; }
        .fotos { display: flex; gap: 12px; margin-top: 12px; }
        .foto { flex: 1; min-width: 0; font-size: 10px; }
        .foto img { display: block; margin-top: 6px; max-width: 100%; max-height: 38mm; object-fit: contain; }
        footer { margin-top: 18px; border-top: 1px solid #cbd5e1; padding-top: 9px; font-size: 9px; color: #64748b; }
        .acciones { text-align: right; margin-bottom: 14px; }
        .acciones button { background: #1d4ed8; color: white; border: 0; border-radius: 6px; padding: 10px 18px; cursor: pointer; }
        @media print { .acciones { display: none !important; } .hoja { max-width: none; } }
      </style></head><body><div class="hoja">
      <div class="acciones"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>
      <header><div class="marca">VAM ADMINISTRADORA DE CONDOMINIOS</div>
      <h1>FACTURA DE CONSUMO DE GAS</h1><div class="condominio">${escapar(condominioNombre || `Condominio ${condominioId}`)}</div></header>
      <section class="datos">
        <div><b>Factura:</b> GAS-${String(f.id).padStart(6,"0")}</div>
        <div><b>Período:</b> ${escapar(f.periodo.slice(0,7))}</div>
        <div><b>Apartamento:</b> ${escapar(f.unidades?.codigo ?? f.unidad_id)}</div>
        <div><b>Estado:</b> ${escapar(f.estado)}</div>
        <div><b>Cargo asociado:</b> ${escapar(f.cargo_periodico_id ?? "Sin generar")}</div>
        <div><b>Fecha de aprobación:</b> ${escapar(f.fecha_aprobacion?.slice(0,10) ?? "Pendiente")}</div>
        <div><b>Desde (lectura anterior):</b> ${escapar(fechaES(f.fecha_lectura_anterior))}</div>
        <div><b>Hasta (lectura actual):</b> ${escapar(fechaES(f.fecha_lectura))}</div>
        <div><b>Días facturados:</b> ${escapar(diasFacturados(f.fecha_lectura_anterior, f.fecha_lectura) ?? "No disponible")}</div>
      </section>
      <table><thead><tr><th>Detalle</th><th class="valor">Valor</th></tr></thead><tbody>
      ${fila("Período de consumo", `${fechaES(f.fecha_lectura_anterior)} al ${fechaES(f.fecha_lectura)}`)}
      ${fila("Días facturados (transcurridos)", String(diasFacturados(f.fecha_lectura_anterior, f.fecha_lectura) ?? "No disponible"))}
      ${fila("Lectura anterior", `${decimal(f.lectura_anterior)} m³`)}
      ${fila("Lectura actual", `${decimal(f.lectura_actual)} m³`)}
      ${fila("Consumo registrado", `${decimal(f.consumo)} m³`)}
      ${fila("Factor de conversión aplicado", decimal(f.factor_conversion_aplicado))}
      ${fila("Consumo facturable", `${decimal(f.consumo_facturable)} ${f.unidad_facturacion_codigo ?? ""}`)}
      ${fila(`Tarifa por ${f.unidad_facturacion_codigo ?? "unidad"}`, money(f.precio_unitario))}
      </tbody></table>
      <div class="total">TOTAL GAS: ${escapar(money(f.importe))}</div>
      <p class="nota">Este documento corresponde exclusivamente al consumo de gas. El estado de pago se consulta en el estado de cuenta del propietario.</p>
      <div class="fotos">${foto(f.foto_anterior_url, "Lectura anterior")}${foto(f.foto_actual_url, "Lectura actual")}</div>
      <footer>Preparado por VAM Condominios · Gas Facturación v1.0.6</footer>
      </div></body></html>`;
    ventana.document.open();
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.focus();
    // La impresión se inicia manualmente desde la ventana, cuando fotos y fuentes estén cargadas.
  }

  async function preparar() {
    if (!condominioId || !listo || !tarifaValida || !tarifa || procesando) return;
    if (!window.confirm(`¿Preparar facturas de gas de ${periodo} para ${condominioNombre || `condominio ${condominioId}`}? Esta acción NO genera cargos por cobrar.`)) return;
    setProcesando(true); setError(""); setMensaje("");
    try {
      const { data, error: err } = await supabase.rpc("preparar_facturas_gas_periodo", { p_condominio_id: condominioId, p_periodo: periodo, p_precio_id: tarifa.id });
      if (err) throw err;
      const r = (data ?? {}) as Resumen;
      setResumen(r);
      await cargar(condominioId, periodo);
      setResumen(r);
      setMensaje(`Preparación registrada por Supabase: ${r.preparadas ?? 0} factura(s) nuevas; ${r.omitidas ?? 0} omitida(s). No se generaron cargos. Si aparece un error rojo, corresponde a la consulta de actualización de pantalla.`);
    } catch (e) { setError(describirError(e)); }
    finally { setProcesando(false); }
  }

  async function aprobar(f: Factura) {
    if (!condominioId || procesando || f.estado !== "PENDIENTE" || f.cargo_periodico_id !== null) return;
    if (!window.confirm(`APROBACIÓN FINANCIERA\n\nApartamento: ${f.unidades?.codigo ?? f.unidad_id}\nPeríodo: ${periodo}\nImporte: ${money(f.importe)}\n\nEsta operación CREARÁ una deuda de GAS en cuentas por cobrar. ¿Confirma?`)) return;
    setProcesando(true); setError(""); setMensaje("");
    try {
      const { data, error: err } = await supabase.rpc("aprobar_factura_gas", { p_factura_id: f.id });
      if (err) throw err;
      await cargar(condominioId, periodo);
      setMensaje(`Factura ${f.id} aprobada. Cargo generado: ${String((data as { cargo_id?: number } | null)?.cargo_id ?? "ver registro")}.`);
    } catch (e) { setError(describirError(e)); }
    finally { setProcesando(false); }
  }

  async function aprobarPendientes() {
    if (!condominioId || procesando || cargando || pendientes.length === 0) return;
    const lote = [...pendientes];
    const total = lote.reduce((s, f) => s + Number(f.importe), 0);
    if (!window.confirm(`APROBACIÓN MASIVA DE GAS\n\nCondominio: ${condominioNombre || condominioId}\nPeríodo: ${periodo}\nFacturas pendientes: ${lote.length}\nImporte total: ${money(total)}\n\nSe crearán cargos REALES en cuentas por cobrar. Las facturas ya aprobadas se omiten. ¿Confirma?`)) return;
    setProcesando(true); setError(""); setMensaje("");
    let correctas = 0;
    const fallidas: string[] = [];
    try {
      // Se reutiliza la RPC existente, una factura por transacción; no se vuelve a preparar ni recalcular.
      for (const [i, f] of lote.entries()) {
        setProgresoLote(`Aprobando ${i + 1} de ${lote.length} · ${f.unidades?.codigo ?? f.unidad_id}`);
        const { error: err } = await supabase.rpc("aprobar_factura_gas", { p_factura_id: f.id });
        if (err) {
          fallidas.push(`${f.unidades?.codigo ?? f.unidad_id}: ${describirError(err)}`);
        } else {
          correctas++;
        }
      }
      await cargar(condominioId, periodo);
      setMensaje(`Proceso finalizado: ${correctas} aprobación(es) ejecutada(s), ${fallidas.length} con error. Consulte el estado y cargo de cada factura.`);
      if (fallidas.length) setError(`No se pudieron aprobar: ${fallidas.join(" | ")}`);
    } catch (e) {
      setError(`El proceso se interrumpió después de ${correctas} aprobación(es): ${describirError(e)}. Consulte el período antes de reintentar.`);
    } finally {
      setProgresoLote(""); setProcesando(false);
    }
  }

  return <main className="min-h-screen bg-slate-100 p-4 md:p-6"><div className="mx-auto max-w-7xl space-y-5">
    <header className="gas-no-print rounded-3xl bg-white p-6 shadow-sm border"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-blue-700 uppercase">VAM · Módulo de Gas</p><h1 className="text-3xl font-black text-slate-900">Facturación de Gas</h1><p className="text-xs text-slate-500 mt-1">Gas · Facturación v1.0.6</p><p className="text-sm text-slate-600 mt-2">{condominioNombre || "Condominio activo"} · ID {condominioId ?? "—"}</p></div><div className="flex gap-2"><Link href="/gas/consumos" className="rounded-xl border px-4 py-2 text-sm font-bold">Consumos</Link><Link href="/gas" className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white">Volver a Gas</Link></div></div></header>

    {error && <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>}
    {mensaje && <div role="status" className="rounded-2xl border border-green-300 bg-green-50 p-4 text-green-800">{mensaje}</div>}
    <section className="gas-no-print rounded-3xl bg-white border p-5 space-y-4"><h2 className="text-xl font-black">1. Seleccionar período y tarifa</h2><div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-bold">Período<input type="month" value={periodo} disabled={procesando} onChange={(e) => setPeriodo(e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label><label className="text-sm font-bold">Tarifa de facturación<select value={tarifaId} disabled={procesando || cargando} onChange={(e) => setTarifaId(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="">Seleccione tarifa</option>{tarifas.map((t) => <option key={t.id} value={t.id}>{money(t.precio_unitario)} / {t.gas_unidades_medida?.abreviatura ?? "?"} · desde {t.fecha_inicio} · {t.estado}</option>)}</select></label><div className="flex items-end"><button type="button" onClick={() => condominioId && void cargar(condominioId, periodo)} disabled={!condominioId || cargando || procesando || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)} className="w-full rounded-xl bg-slate-700 px-4 py-3 font-bold text-white disabled:opacity-50">{cargando ? "Cargando..." : "Consultar período"}</button></div></div><div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm"><strong>Configuración del condominio:</strong> {config?.unidad_lectura_gas ?? "—"} → {config?.unidad_facturacion_gas ?? "—"} · Factor: {config?.factor_conversion_gas ?? "Sin configurar"}. {!listo && <span className="font-bold text-red-700"> Debe completar Configuración de Gas antes de preparar facturas.</span>}{tarifaId && !tarifaValida && <span className="font-bold text-red-700"> La tarifa seleccionada no está activa o no coincide con la unidad configurada.</span>}</div><button type="button" disabled={!condominioId || !listo || !tarifaValida || procesando || cargando} onClick={() => void preparar()} className="rounded-xl bg-blue-700 px-6 py-3 font-black text-white disabled:opacity-50">{procesando ? "Procesando..." : "Preparar facturas (sin generar deuda)"}</button>{resumen && <p className="text-sm text-slate-600">Preparadas: {resumen.preparadas ?? 0} · Omitidas: {resumen.omitidas ?? 0} · En revisión: {resumen.lecturas_en_revision ?? 0} · Unidades incompatibles: {resumen.unidades_incompatibles ?? 0}</p>}</section>
    <section className="gas-no-print grid grid-cols-1 gap-4 sm:grid-cols-3">{[["Facturas del período", facturas.length],["Pendientes de aprobación", pendientes.length],["Aprobadas / con cargo", aprobadas.length]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="text-3xl font-black">{value}</p></div>)}</section>
    <section className="gas-no-print rounded-3xl bg-white border p-5 space-y-4"><div className="flex flex-wrap justify-between items-center gap-3"><div><h2 className="text-xl font-black">2. Revisar y aprobar facturas</h2><p className="text-sm text-slate-500">Aprobar genera un cargo real de GAS en cuentas por cobrar. Revise cada importe antes de confirmar.</p></div><input aria-label="Buscar apartamento o factura" placeholder="Buscar apartamento o factura" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="rounded-xl border p-3 text-sm" /></div><div className="flex flex-wrap items-center gap-3"><button type="button" disabled={procesando || cargando || pendientes.length === 0} onClick={() => void aprobarPendientes()} className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white disabled:opacity-40">{procesando && progresoLote ? "Aprobando facturas..." : `Aprobar todas las pendientes (${pendientes.length})`}</button><span className="text-sm text-slate-600">Total pendiente: <strong>{money(pendientes.reduce((s, f) => s + Number(f.importe), 0))}</strong></span>{progresoLote && <span role="status" className="text-sm font-semibold text-blue-700">{progresoLote}</span>}</div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-3">Apto.</th><th className="p-3">Período de lectura</th><th className="p-3">Días</th><th className="p-3">Lecturas</th><th className="p-3">Consumo</th><th className="p-3">Conversión</th><th className="p-3">Importe</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead><tbody>{visibles.map((f) => <tr key={f.id} className="border-b"><td className="p-3 font-bold">{f.unidades?.codigo ?? `#${f.unidad_id}`}</td><td className="p-3 whitespace-nowrap">{fechaES(f.fecha_lectura_anterior)} → {fechaES(f.fecha_lectura)}</td><td className="p-3">{diasFacturados(f.fecha_lectura_anterior, f.fecha_lectura) ?? "—"}</td><td className="p-3">{decimal(f.lectura_anterior)} → {decimal(f.lectura_actual)}</td><td className="p-3">{decimal(f.consumo)}</td><td className="p-3">× {decimal(f.factor_conversion_aplicado)} = {decimal(f.consumo_facturable)} {f.unidad_facturacion_codigo ?? ""}</td><td className="p-3 font-bold">{money(f.importe)}</td><td className="p-3">{f.estado}{f.cargo_periodico_id !== null ? ` · Cargo #${f.cargo_periodico_id}` : ""}</td><td className="p-3"><div className="flex gap-2"><button type="button" className="rounded-lg border px-3 py-2 font-bold" onClick={() => setSeleccion(f)}>Revisar</button><button type="button" className="rounded-lg border border-blue-700 px-3 py-2 font-bold text-blue-700" onClick={() => imprimirFactura(f)}>Ver / Imprimir factura</button><button type="button" className="rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white disabled:opacity-40" disabled={procesando || f.estado !== "PENDIENTE" || f.cargo_periodico_id !== null} onClick={() => void aprobar(f)}>Aprobar</button></div></td></tr>)}</tbody></table>{!cargando && visibles.length === 0 && <p className="p-6 text-center text-slate-500">No hay facturas preparadas para este período.</p>}</div></section>
    {seleccion && <section className="rounded-3xl bg-white border p-5 space-y-3"><div className="flex justify-between items-center"><h2 className="text-xl font-black">Detalle de factura #{seleccion.id} · {seleccion.unidades?.codigo ?? seleccion.unidad_id}</h2><button type="button" onClick={() => setSeleccion(null)} className="rounded-lg border px-3 py-2">Cerrar</button></div><div className="grid gap-3 md:grid-cols-3 text-sm"><p>Fecha lectura anterior: <strong>{fechaES(seleccion.fecha_lectura_anterior)}</strong></p><p>Fecha lectura actual: <strong>{fechaES(seleccion.fecha_lectura)}</strong></p><p>Días facturados: <strong>{diasFacturados(seleccion.fecha_lectura_anterior, seleccion.fecha_lectura) ?? "No disponible"}</strong></p><p>Lectura anterior: <strong>{decimal(seleccion.lectura_anterior)}</strong></p><p>Lectura actual: <strong>{decimal(seleccion.lectura_actual)}</strong></p><p>Consumo original: <strong>{decimal(seleccion.consumo)}</strong></p><p>Factor aplicado: <strong>{decimal(seleccion.factor_conversion_aplicado)}</strong></p><p>Consumo facturable: <strong>{decimal(seleccion.consumo_facturable)} {seleccion.unidad_facturacion_codigo}</strong></p><p>Tarifa: <strong>{money(seleccion.precio_unitario)}</strong></p></div><p className="text-xl font-black">Total gas: {money(seleccion.importe)}</p><div className="flex gap-4 text-sm">{seleccion.foto_anterior_url ? <a href={seleccion.foto_anterior_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Ver foto anterior</a> : <span className="text-slate-500">Sin foto anterior</span>}{seleccion.foto_actual_url ? <a href={seleccion.foto_actual_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Ver foto actual</a> : <span className="text-slate-500">Sin foto actual</span>}</div></section>}
    <p className="gas-no-print text-right text-xs text-slate-500">Gas · Facturación v1.0.6 · La autorización se verifica también en Supabase</p>
  </div></main>;
}
