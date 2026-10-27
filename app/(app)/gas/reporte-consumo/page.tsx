"use client";

/**
 * VAM Condominios — Reporte de consumo y compras de gas por tanque.
 * v1.0.0 | Exclusivo Condominio Don Juan I, condominio_id = 24.
 * SOLO LECTURA: nunca crea ni modifica lecturas, cargos, recepciones o facturas.
 * Basado en la plantilla «CUENTA POR COBRAR USO GAS 2026» facilitada.
 */
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

const CONDOMINIO_ID = 24;
const VERSION = "v1.2.0";
const NOMBRE = "RESIDENCIAL COLINAS DEL OESTE DON JUAN I";
const FECHA_DEFECTO = (() => {
  const hoy = new Date();
  return new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth() - 1, 1)).toISOString().slice(0, 7);
})();

type DB = Record<string, any>;
type Fuentes = {
  unidades: DB[];
  medidores: DB[];
  lecturas: DB[];
  facturas: DB[];
  tanques: DB[];
  recepciones: DB[];
  unidadesMedida: DB[];
  configuracion: DB | null;
  comprasLegibles: boolean;
};
type Fila = {
  unidadId: number; apartamento: string; propietario: string;
  tanqueId: number | null; tanque: string;
  inicial: number | null; final: number | null; dias: number | null;
  diferencia: number | null; factor: number | null; galones: number | null;
  precio: number | null; importe: number | null;
  fechaDesde: string | null; fechaHasta: string | null;
  estado: string; alerta: string | null;
};
type Grupo = {
  tanqueId: number | null; tanque: string; filas: Fila[];
  consumoReal: number | null; consumoProyectado: number | null;
  consumoTotal: number | null; compraGalones: number | null;
  compraPesos: number | null; diferenciaGalones: number | null;
  diferenciaPesos: number | null; totalFacturado: number;
};
const aNumero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const suma = (values: Array<number | null | undefined>) =>
  values.reduce<number>((s, v) => s + (v ?? 0), 0);
const nfmt = (v: number | null, d = 2) => v === null || !Number.isFinite(v)
  ? "—" : v.toLocaleString("es-DO", { minimumFractionDigits: d, maximumFractionDigits: d });
const rd = (v: number | null) => v === null ? "—" : `RD$ ${nfmt(v, 2)}`;
const mesTxt = (v: string) => {
  const [y, m] = v.split("-").map(Number);
  return new Intl.DateTimeFormat("es-DO", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, 1)));
};
const fechaTxt = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};
const diasEntre = (a: string | null, b: string | null): number | null => {
  if (!a || !b) return null;
  const ms = Date.parse(`${b.slice(0, 10)}T00:00:00Z`) - Date.parse(`${a.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(ms) || ms < 0) return null;
  // Conteo inclusivo: tanto el día inicial como el final tienen consumo.
  return Math.round(ms / 86400000) + 1;
};
const texto = (x: unknown) => String(x ?? "").trim();
const normalizar = (x: unknown) => texto(x).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const abreviaturaGalones = (x: string) => ["GLS", "GAL", "GALS", "GALON", "GALONES"].includes(normalizar(x));
const uno = (x: any) => Array.isArray(x) ? (x[0] || null) : (x || null);
const mesSiguiente = (m: string) => {
  const [y, mm] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mm, 1)).toISOString().slice(0, 10);
};
const validarMes = (x: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(x);
const tituloCol = (dias: number) => [
  "PROPIETARIO", "APTO", "LECTURA INICIAL", "LECTURA FINAL", "DÍAS DE USO",
  "DIFERENCIA (M³)", "FACTOR", "GLS CONSUMIDO", "PRECIO", "PAGAR POR MES",
  "CONSUMIDO POR TANQUE", "PROMEDIO DIARIO", `CONSUMO EN ${dias} DÍA(S)`,
  "CONSUMO TOTAL POR TANQUE", "COMPRA DE GLS", "COMPRA EN RD$",
  "DIFERENCIA EN GLS", "DIFERENCIA EN RD$",
];

export default function ReporteGasDonJuan() {
  const [periodo, setPeriodo] = useState(FECHA_DEFECTO);
  const [condominioActual, setCondominioActual] = useState<number | null>(null);
  const [fuentes, setFuentes] = useState<Fuentes | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [diasProyeccion, setDiasProyeccion] = useState(1);
  const [incluirProyeccion, setIncluirProyeccion] = useState(false);
  const [tanqueFiltro, setTanqueFiltro] = useState("TODOS");

  useEffect(() => {
    const seleccionado = Number(localStorage.getItem("condominio_id") || 0);
    setCondominioActual(seleccionado);
    if (seleccionado !== CONDOMINIO_ID) {
      setError("Este reporte es exclusivo de Don Juan I (ID 24). Seleccione ese condominio para consultarlo.");
    }
  }, []);

  const cargar = useCallback(async () => {
    if (condominioActual !== CONDOMINIO_ID) return;
    if (!validarMes(periodo)) { setError("Seleccione un mes válido."); return; }
    setCargando(true); setFuentes(null); setError(""); setAvisos([]);
    try {
      const inicio = `${periodo}-01`;
      const siguiente = mesSiguiente(periodo);
      const [u, m, l, f, t, r, um, c] = await Promise.all([
        supabase.from("unidades").select("id,codigo,propietario_nombre").eq("condominio_id", CONDOMINIO_ID),
        supabase.from("gas_medidores").select("id,unidad_id,tanque_id,numero_serie,estado").eq("condominio_id", CONDOMINIO_ID),
        supabase.from("gas_lecturas").select("id,medidor_id,unidad_id,tanque_id,periodo,fecha_lectura_anterior,fecha_lectura,lectura_anterior,lectura_actual,consumo,estado")
          .eq("condominio_id", CONDOMINIO_ID).gte("periodo", inicio).lt("periodo", siguiente),
        supabase.from("gas_facturacion_unidades").select("id,unidad_id,medidor_id,lectura_id,periodo,fecha_lectura_anterior,fecha_lectura,lectura_anterior,lectura_actual,consumo,consumo_facturable,factor_conversion_aplicado,unidad_facturacion_codigo,precio_unitario,importe,estado")
          .eq("condominio_id", CONDOMINIO_ID).gte("periodo", inicio).lt("periodo", siguiente),
        supabase.from("gas_tanques").select("id,nombre").eq("condominio_id", CONDOMINIO_ID),
        supabase.from("gas_recepciones").select("id,tanque_id,fecha_recepcion,cantidad,total,unidad_medida_id,estado")
          .eq("condominio_id", CONDOMINIO_ID),
        supabase.from("gas_unidades_medida").select("id,nombre,abreviatura"),
        supabase.from("gas_configuracion").select("modalidad,factor_conversion_gas,unidad_lectura_gas,unidad_facturacion_gas")
          .eq("condominio_id", CONDOMINIO_ID).maybeSingle(),
      ]);
      for (const [nombre, resp] of [["unidades",u],["medidores",m],["lecturas",l],["facturación",f],["tanques",t],["configuración",c]] as const) {
        if (resp.error) throw new Error(`No se pudieron consultar ${nombre}: ${resp.error.message}`);
      }
      if (!c.data || normalizar(c.data.modalidad) !== "CON_MEDIDORES") {
        throw new Error("El condominio no tiene configurada la modalidad CON_MEDIDORES.");
      }
      const notas: string[] = [];
      if (r.error) notas.push(`Compras no disponibles: ${r.error.message}`);
      if (um.error) notas.push(`No se pudo validar la unidad de las compras: ${um.error.message}`);
      const lecturas = (l.data || []) as DB[];
      const facturas = (f.data || []) as DB[];
      const fechas = [...lecturas, ...facturas].flatMap(x => [texto(x.fecha_lectura_anterior).slice(0,10), texto(x.fecha_lectura).slice(0,10)])
        .filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
      const [y, mm] = periodo.split("-").map(Number);
      setDesde(fechas[0] || `${periodo}-01`);
      setHasta(fechas[fechas.length - 1] || `${periodo}-${String(new Date(Date.UTC(y, mm, 0)).getUTCDate()).padStart(2,"0")}`);
      if (!facturas.length) notas.push("No hay facturas preparadas para este mes. Se mostrarán lecturas disponibles sin inventar importes.");
      if (!lecturas.length && !facturas.length) notas.push("No existen lecturas ni facturas de gas para este período.");
      setAvisos(notas);
      setFuentes({
        unidades: (u.data || []) as DB[], medidores: (m.data || []) as DB[],
        lecturas, facturas, tanques: (t.data || []) as DB[],
        recepciones: (r.data || []) as DB[], unidadesMedida: (um.data || []) as DB[],
        configuracion: c.data || null, comprasLegibles: !r.error && !um.error,
      });
    } catch (e: any) { setError(e?.message || "Error consultando el reporte."); }
    finally { setCargando(false); }
  }, [periodo, condominioActual]);

  useEffect(() => { if (condominioActual === CONDOMINIO_ID) void cargar(); }, [condominioActual, cargar]);

  const filas = useMemo<Fila[]>(() => {
    if (!fuentes) return [];
    const porUnidadMedidores = new Map<number, DB[]>();
    fuentes.medidores.forEach(m => {
      const id = Number(m.unidad_id); const list = porUnidadMedidores.get(id) || [];
      list.push(m); porUnidadMedidores.set(id, list);
    });
    const porUnidadLecturas = new Map<number, DB[]>();
    fuentes.lecturas.forEach(l => {
      const id = Number(l.unidad_id); const list = porUnidadLecturas.get(id) || [];
      list.push(l); porUnidadLecturas.set(id, list);
    });
    const porUnidadFacturas = new Map<number, DB[]>();
    fuentes.facturas.forEach(f => {
      const id = Number(f.unidad_id); const list = porUnidadFacturas.get(id) || [];
      list.push(f); porUnidadFacturas.set(id, list);
    });
    const tanquesPorId = new Map(fuentes.tanques.map(t => [Number(t.id), texto(t.nombre)]));
    return fuentes.unidades.map(u => {
      const unidadId = Number(u.id);
      const facturas = (porUnidadFacturas.get(unidadId) || []).sort((a,b) => Number(b.id) - Number(a.id));
      const factura = facturas[0] || null;
      const lecturas = (porUnidadLecturas.get(unidadId) || []).sort((a,b) => Number(b.id) - Number(a.id));
      const lectura = lecturas.find(l => Number(l.id) === Number(factura?.lectura_id)) || lecturas[0] || null;
      const medidores = porUnidadMedidores.get(unidadId) || [];
      const medidor = medidores.find(m => Number(m.id) === Number(factura?.medidor_id)) ||
        medidores.find(m => Number(m.id) === Number(lectura?.medidor_id)) ||
        medidores.find(m => normalizar(m.estado) === "ACTIVO") || medidores[0] || null;
      const tanqueId = aNumero(medidor?.tanque_id ?? lectura?.tanque_id);
      const inicial = aNumero(factura?.lectura_anterior ?? lectura?.lectura_anterior);
      const final = aNumero(factura?.lectura_actual ?? lectura?.lectura_actual);
      const diferencia = aNumero(factura?.consumo ?? lectura?.consumo) ??
        (final !== null && inicial !== null ? final - inicial : null);
      const factor = aNumero(factura?.factor_conversion_aplicado ?? fuentes.configuracion?.factor_conversion_gas);
      const galones = aNumero(factura?.consumo_facturable) ??
        (diferencia !== null && factor !== null ? diferencia * factor : null);
      const fechaDesde = texto(factura?.fecha_lectura_anterior || lectura?.fecha_lectura_anterior).slice(0, 10) || null;
      const fechaHasta = texto(factura?.fecha_lectura || lectura?.fecha_lectura).slice(0, 10) || null;
      const dias = diasEntre(fechaDesde, fechaHasta);
      const alerta = facturas.length > 1 ? "Más de una factura para la unidad y período" :
        lecturas.length > 1 ? "Más de una lectura para la unidad y período" :
        !factura && !lectura ? "Sin lectura ni facturación" :
        !factura ? "Lectura sin factura: no se estima importe" :
        normalizar(factura.unidad_facturacion_codigo) !== "GLS" ? "Verificar unidad de facturación (se espera GLS)" :
        normalizar(factura.estado) !== "APROBADA" ? "Factura sin aprobación: importe preliminar" :
        diferencia !== null && diferencia < 0 ? "Lectura decreciente: revisar" : null;
      return {
        unidadId, apartamento: texto(u.codigo), propietario: texto(u.propietario_nombre) || "Sin propietario",
        tanqueId, tanque: tanqueId !== null ? (tanquesPorId.get(tanqueId) || `Tanque ${tanqueId}`) : "SIN TANQUE",
        inicial, final, dias, diferencia, factor, galones,
        precio: aNumero(factura?.precio_unitario), importe: aNumero(factura?.importe),
        fechaDesde, fechaHasta, estado: texto(factura?.estado || lectura?.estado) || "SIN LECTURA",
        alerta,
      };
    }).sort((a,b) => a.apartamento.localeCompare(b.apartamento, "es", { numeric: true }));
  }, [fuentes]);

  const grupos = useMemo<Grupo[]>(() => {
    if (!fuentes) return [];
    const catalogo = new Map(fuentes.unidadesMedida.map(x => [Number(x.id), texto(x.abreviatura || x.nombre)]));
    const porTanque = new Map<string, Fila[]>();
    filas.forEach(f => {
      const key = f.tanqueId === null ? "SIN_TANQUE" : String(f.tanqueId);
      porTanque.set(key, [...(porTanque.get(key) || []), f]);
    });
    return Array.from(porTanque.values()).map(rows => {
      const tanqueId = rows[0].tanqueId;
      const lecturasValidas = rows.filter(r => r.galones !== null);
      const consumoReal = lecturasValidas.length ? suma(lecturasValidas.map(x => x.galones)) : null;
      const estimaciones = lecturasValidas.filter(r => r.dias && r.dias > 0).map(r => (r.galones! / r.dias!) * diasProyeccion);
      const consumoProyectado = incluirProyeccion && estimaciones.length ? suma(estimaciones) : null;
      const consumoTotal = consumoReal === null ? null : consumoReal + (consumoProyectado ?? 0);
      const compras = fuentes.comprasLegibles && tanqueId !== null ? fuentes.recepciones.filter(r =>
        Number(r.tanque_id) === tanqueId &&
        texto(r.fecha_recepcion).slice(0,10) >= desde &&
        texto(r.fecha_recepcion).slice(0,10) <= hasta &&
        !["ANULADA", "ANULADO", "CANCELADA", "CANCELADO"].includes(normalizar(r.estado)) &&
        abreviaturaGalones(catalogo.get(Number(r.unidad_medida_id)) || "")
      ) : [];
      const compraGalones = compras.length ? suma(compras.map(r => aNumero(r.cantidad))) : null;
      const compraPesos = compras.length && compras.every(r => aNumero(r.total) !== null)
        ? suma(compras.map(r => aNumero(r.total))) : null;
      const importes = rows.filter(r => r.importe !== null);
      const totalFacturado = suma(importes.map(r => r.importe));
      const diferenciaGalones = compraGalones !== null && consumoTotal !== null ? compraGalones - consumoTotal : null;
      const diferenciaPesos = compraPesos !== null && importes.length === rows.length ? compraPesos - totalFacturado : null;
      return {
        tanqueId, tanque: rows[0].tanque, filas: rows, consumoReal, consumoProyectado,
        consumoTotal, compraGalones, compraPesos, diferenciaGalones, diferenciaPesos, totalFacturado,
      };
    }).filter(g => tanqueFiltro === "TODOS" || String(g.tanqueId) === tanqueFiltro)
      .sort((a,b) => (a.tanqueId ?? 999999) - (b.tanqueId ?? 999999));
  }, [fuentes, filas, desde, hasta, diasProyeccion, incluirProyeccion, tanqueFiltro]);

  const conAlerta = filas.filter(f => f.alerta);
  const noGls = filas.some(f => f.alerta?.startsWith("Verificar unidad"));
  const cantidadCargada = filas.filter(f => f.galones !== null).length;
  const totalGl = suma(grupos.map(g => g.consumoReal));
  const totalRd = suma(grupos.map(g => g.totalFacturado));
  const glCompra = suma(grupos.map(g => g.compraGalones));
  const existeCompra = grupos.some(g => g.compraGalones !== null);
  const columnas = tituloCol(diasProyeccion);
  const sePuedeExportar = !!fuentes && filas.length > 0 && grupos.length > 0;

  const exportarExcel = async () => {
    if (!sePuedeExportar) return;
    setExportando(true);
    try {
      // XLSX ya se utiliza en el módulo de importación de gas de VAM.
      const XLSX = await import("xlsx");
      const safe = (s: string) => /^[=+\-@]/.test(s) ? `'${s}` : s;
      const title = ["CUENTA POR COBRAR USO GAS " + periodo.slice(0,4)];
      const a: (string | number | null)[][] = [
        title,
        [`${NOMBRE} — ${mesTxt(periodo).toUpperCase()}`, ...Array(9).fill(""), `DESDE ${fechaTxt(desde)} HASTA ${fechaTxt(hasta)}`],
        ["Importes procedentes de facturación de gas; compras procedentes de recepciones registradas."],
        columnas,
      ];
      const merges: any[] = [
        {s:{r:0,c:0}, e:{r:0,c:17}},
        {s:{r:1,c:0}, e:{r:1,c:9}},
        {s:{r:1,c:10}, e:{r:1,c:17}},
        {s:{r:2,c:0}, e:{r:2,c:17}},
      ];
      const indicesPrimerGrupo: {ini: number; fin: number; grupo: Grupo}[] = [];
      for (const g of grupos) {
        const ini = a.length;
        for (const [i, f] of g.filas.entries()) {
          const promedio = f.galones !== null && f.dias ? f.galones / f.dias : null;
          const est = incluirProyeccion && promedio !== null ? promedio * diasProyeccion : null;
          a.push([
            safe(f.propietario),safe(f.apartamento),f.inicial,f.final,f.dias,f.diferencia,f.factor,f.galones,f.precio,f.importe,
            i === 0 ? g.consumoReal : null,promedio,est,
            i === 0 ? g.consumoTotal : null,i === 0 ? g.compraGalones : null,
            i === 0 ? g.compraPesos : null,i === 0 ? g.diferenciaGalones : null,
            i === 0 ? g.diferenciaPesos : null,
          ]);
        }
        indicesPrimerGrupo.push({ini, fin:a.length-1,grupo:g});
        if (a.length - 1 > ini) {
          for (const col of [10,13,14,15,16,17]) merges.push({s:{r:ini,c:col},e:{r:a.length-1,c:col}});
        }
      }
      a.push(["TOTALES", "", null,null,null,null,null, totalGl,null,totalRd,null,null,null,null,
        existeCompra ? glCompra : null,
        grupos.every(g=>g.compraPesos!==null) ? suma(grupos.map(g=>g.compraPesos)) : null,
        null,null]);
      const ws = XLSX.utils.aoa_to_sheet(a);
      ws["!merges"] = merges;
      ws["!cols"] = [
        {wch:31},{wch:8},{wch:13},{wch:13},{wch:10},{wch:13},{wch:9},{wch:13},{wch:12},{wch:17},
        {wch:15},{wch:13},{wch:17},{wch:18},{wch:13},{wch:16},{wch:17},{wch:17},
      ];
      ws["!freeze"] = { xSplit:2, ySplit:4 } as any;
      ws["!autofilter"] = {ref:`A4:J${a.length}`};
      // Fórmulas para columnas derivadas en Excel (el importe J se conserva como valor aprobado).
      for (const g of indicesPrimerGrupo) {
        for (let row = g.ini; row <= g.fin; row++) {
          const n = row + 1;
          const kF = `F${n}`, kH = `H${n}`, kL = `L${n}`, kM = `M${n}`;
          if (a[row][2] !== null && a[row][3] !== null) ws[kF] = {t:"n", f:`D${n}-C${n}`, v:Number(a[row][5] || 0),z:"0.0000"};
          if (a[row][5] !== null && a[row][6] !== null) ws[kH] = {t:"n", f:`F${n}*G${n}`, v:Number(a[row][7] || 0),z:"0.0000"};
          if (a[row][7] !== null && a[row][4] !== null && Number(a[row][4]) > 0) {
            ws[kL] = {t:"n", f:`H${n}/E${n}`, v:Number(a[row][11] || 0),z:"0.0000"};
            if (incluirProyeccion) ws[kM] = {t:"n",f:`L${n}*${diasProyeccion}`,v:Number(a[row][12] || 0),z:"0.0000"};
          }
          for (const col of [2,3,5,6,7,8]) {
            const cell = XLSX.utils.encode_cell({r:row,c:col});
            if (ws[cell] && ws[cell].t === "n") ws[cell].z = col === 2 || col === 3 ? "0.0000" : "0.00";
          }
          for (const col of [9,15,17]) {
            const cell = XLSX.utils.encode_cell({r:row,c:col});
            if (ws[cell] && ws[cell].t === "n") ws[cell].z = '"RD$ "#,##0.00;[Red]("RD$ "#,##0.00)';
          }
        }
        const ini = g.ini + 1, fin = g.fin + 1;
        const real = g.grupo.consumoReal;
        if (real !== null) ws[`K${ini}`] = {t:"n",f:`SUM(H${ini}:H${fin})`,v:real,z:"0.00"};
        if (g.grupo.consumoTotal !== null) ws[`N${ini}`] = {
          t:"n", f:`K${ini}${incluirProyeccion ? `+SUM(M${ini}:M${fin})` : ""}`,
          v:g.grupo.consumoTotal, z:"0.00",
        };
        if (g.grupo.diferenciaGalones !== null) ws[`Q${ini}`] = {t:"n",f:`O${ini}-N${ini}`,v:g.grupo.diferenciaGalones,z:"0.00"};
        if (g.grupo.diferenciaPesos !== null) ws[`R${ini}`] = {t:"n",f:`P${ini}-SUM(J${ini}:J${fin})`,v:g.grupo.diferenciaPesos,z:'"RD$ "#,##0.00;[Red]("RD$ "#,##0.00)'};
      }
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro,ws,"Consumo por tanque");
      const info = XLSX.utils.aoa_to_sheet([
        ["VAM — CONTROL DE CONSUMO DE GAS", "Don Juan I"],
        ["Condominio ID",CONDOMINIO_ID],
        ["Período de consumo",periodo],
        ["Desde", desde], ["Hasta",hasta],
        ["Días proyectados",diasProyeccion],
        ["¿Proyección incluida en total?",incluirProyeccion?"SÍ":"NO"],
        ["Fuente lecturas","gas_lecturas"],
        ["Fuente importes","gas_facturacion_unidades"],
        ["Fuente compras","gas_recepciones"],
        ["Cálculo diferencia GLS","Compra de GLS - Consumo total por tanque"],
        ["Cálculo diferencia RD$","Compra RD$ - Suma de importes de propietarios"],
        ["NOTA","Las diferencias no constituyen por sí solas pérdidas físicas; no incluyen inventarios inicial/final."],
        ...conAlerta.map(x => [`REVISAR ${x.apartamento}`, x.alerta || ""]),
      ]);
      info["!cols"] = [{wch:37},{wch:100}];
      XLSX.utils.book_append_sheet(libro,info,"Control y observaciones");
      XLSX.writeFile(libro, `Don_Juan_I_Reporte_Gas_${periodo}.xlsx`, {compression:true});
    } catch (e: any) { setError(`Error generando Excel: ${e?.message || e}`); }
    finally { setExportando(false); }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 md:p-7">
      <style>{`
        .gas-scroll {overflow-x:auto; width:100%}
        .gas-report {border-collapse:collapse; min-width:1940px; width:100%; font-family:Arial,sans-serif; color:#111827}
        .gas-report th,.gas-report td {border:1px solid #334155;padding:5px 6px; font-size:10px;vertical-align:middle}
        .gas-report th {background:#e2e8f0;text-align:center; font-weight:800; line-height:1.25;white-space:normal}
        .gas-report td {text-align:right;white-space:nowrap}
        .gas-report td:first-child {text-align:left}
        .gas-report .name-col {min-width:185px}
        .gas-report .apt-col {min-width:44px;text-align:center}
        .gas-report .resumen-tanque {background:rgba(220,230,240,.7);font-weight:700;text-align:center;vertical-align:middle}
        .gas-report .sombra-0 {background:#f1f5f9}.gas-report .sombra-1{background:#def7f8}.gas-report .sombra-2{background:#fff5df}
        .gas-report .peligro {color:#b91c1c}
        .gas-report .total {background:#cbd5e1;font-weight:900}
        @media print {
          @page {size:A3 landscape;margin:7mm}
          html,body {background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
          .sin-imprimir {display:none!important}
          main {padding:0!important;background:#fff!important}
          .gas-scroll {overflow:visible!important; height:auto!important; max-height:none!important; clip:auto!important}
          .seccion-reporte {overflow:visible!important; break-inside:auto!important}
          .gas-report {width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important;overflow:visible!important}
          .gas-report thead {display:table-header-group!important;visibility:visible!important}
          .gas-report thead tr {display:table-row!important;break-inside:avoid!important;page-break-inside:avoid!important}
          .gas-report thead th {display:table-cell!important;visibility:visible!important;opacity:1!important;color:#111827!important;background:#e2e8f0!important;font-weight:800!important;line-height:1.3!important;padding:6px 3px!important;vertical-align:middle!important;overflow:visible!important;white-space:normal!important;overflow-wrap:break-word!important}
          .gas-report tbody {display:table-row-group!important}
          .gas-report th,.gas-report td {font-size:8.2px!important;padding:2px 2px!important;white-space:normal!important;overflow-wrap:anywhere}
          .gas-report .name-col {min-width:0;width:13%}
          .gas-report .apt-col {min-width:0;width:3%}
          .seccion-reporte {box-shadow:none!important;border:0!important;padding:0!important}
          .gas-report tbody tr {break-inside:avoid;page-break-inside:avoid}
           .seccion-reporte, .seccion-reporte p, .seccion-reporte h2, .seccion-reporte div {font-size:inherit}
           .seccion-reporte > div:first-child p {font-size:14px!important}
           .seccion-reporte > div:first-child h2 {font-size:18px!important}
           .seccion-reporte > div:first-child > div:last-child {font-size:14px!important}
           .seccion-reporte > div:last-child p {font-size:14px!important}
        }
      `}</style>
      <div className="sin-imprimir mx-auto mb-5 max-w-7xl rounded-2xl bg-slate-950 p-5 text-white">
        <div className="text-xs uppercase tracking-wider text-sky-200">VAM CONDOMINIO • GAS • {VERSION}</div>
        <h1 className="mt-2 text-xl font-black">Reporte de consumo y compras de gas por tanque</h1>
        <p className="mt-1 text-sm text-slate-300">{NOMBRE} · Exclusivo condominio 24 · Solo consulta, no modifica cargos ni facturas</p>
      </div>

      <section className="sin-imprimir mx-auto mb-5 max-w-7xl rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-bold">Mes del consumo
            <input className="mt-1 block w-full rounded-lg border p-2" type="month" value={periodo} onChange={e=>setPeriodo(e.target.value)}/>
          </label>
          <label className="text-sm font-bold">Desde (compra de gas)
            <input className="mt-1 block w-full rounded-lg border p-2" type="date" value={desde} onChange={e=>setDesde(e.target.value)}/>
          </label>
          <label className="text-sm font-bold">Hasta (compra de gas)
            <input className="mt-1 block w-full rounded-lg border p-2" type="date" value={hasta} onChange={e=>setHasta(e.target.value)}/>
          </label>
          <label className="text-sm font-bold">Tanque
            <select className="mt-1 block w-full rounded-lg border p-2" value={tanqueFiltro} onChange={e=>setTanqueFiltro(e.target.value)}>
              <option value="TODOS">Todos los tanques</option>
              {(fuentes?.tanques || []).map(t=><option key={t.id} value={String(t.id)}>{texto(t.nombre)}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">Días adicionales (imagen: 1)
            <input className="mt-1 block w-full rounded-lg border p-2" type="number" min={0} max={31} value={diasProyeccion}
              onChange={e => setDiasProyeccion(Math.min(31,Math.max(0,Math.round(Number(e.target.value)||0))))}/>
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-800">
          <input type="checkbox" checked={incluirProyeccion} onChange={e=>setIncluirProyeccion(e.target.checked)}/>
          Incluir proyección de días adicionales en el consumo total (desactivado por defecto para reproducir la imagen).
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={()=>void cargar()} disabled={cargando || condominioActual!==CONDOMINIO_ID}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{cargando?"Consultando...":"Actualizar reporte"}</button>
          <button type="button" onClick={()=>void exportarExcel()} disabled={!sePuedeExportar || exportando || cargando}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{exportando?"Generando...":"Descargar Excel"}</button>
          <button type="button" onClick={()=>window.print()} disabled={!sePuedeExportar || cargando}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Imprimir / Guardar PDF</button>
        </div>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800" role="alert">{error}</p>}
        {avisos.map((a,i)=><p key={i} className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{a}</p>)}
        {fuentes && <p className="mt-3 text-xs text-slate-600">{filas.length} apartamentos registrados · {cantidadCargada} con consumo · {conAlerta.length} con observaciones. Las compras se comparan por fecha de recepción, no por inventario del tanque.</p>}
        {noGls && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-800">Atención: alguna factura no está en GLS. Verifique la configuración antes de interpretar los totales como galones.</p>}
      </section>

      {fuentes && <section className="seccion-reporte mx-auto max-w-full rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-end justify-between gap-3 border-b-2 border-slate-900 pb-2">
          <div>
            <p className="text-xs font-bold uppercase">{NOMBRE}</p>
            <h2 className="text-base font-black uppercase">CUENTA POR COBRAR USO GAS {periodo.slice(0,4)}</h2>
            <p className="text-xs">Período: {mesTxt(periodo).toUpperCase()}</p>
          </div>
          <div className="text-right text-xs font-bold">DESDE: {fechaTxt(desde)}<span className="mx-2">HASTA:</span>{fechaTxt(hasta)}</div>
        </div>
        <div className="gas-scroll">
          <table className="gas-report">
            <thead><tr>{columnas.map((h,i)=><th key={i} className={i===0?"name-col":i===1?"apt-col":""}>{h}</th>)}</tr></thead>
            <tbody>
              {grupos.map((g,gi)=><Fragment key={`grupo-${g.tanqueId ?? "sin-tanque"}`}>{/* Fragment includes header row, then apartment rows. */}
                <tr key={`tanque-titulo-${gi}`}><td colSpan={18} className={`!text-left !font-black sombra-${gi%3}`}>TANQUE: {g.tanque} · {g.filas.length} apartamento(s)</td></tr>
                {g.filas.map((f,i)=>{
                  const promedio = f.galones !== null && f.dias ? f.galones/f.dias : null;
                  const proyectado = incluirProyeccion && promedio!==null ? promedio*diasProyeccion : null;
                  return <tr key={`unidad-${f.unidadId}`} className={`sombra-${gi%3}`} title={f.alerta||f.estado}>
                    <td className="name-col">{f.propietario}{f.alerta&&<span className="ml-1 peligro" title={f.alerta}>*</span>}</td>
                    <td className="apt-col">{f.apartamento}</td>
                    <td>{nfmt(f.inicial,4)}</td><td className="peligro">{nfmt(f.final,4)}</td>
                    <td>{nfmt(f.dias,0)}</td><td>{nfmt(f.diferencia,3)}</td><td>{nfmt(f.factor,4)}</td>
                    <td>{nfmt(f.galones,3)}</td><td>{rd(f.precio)}</td><td>{rd(f.importe)}</td>
                    {i===0 && <td className="resumen-tanque" rowSpan={g.filas.length}>{nfmt(g.consumoReal)}</td>}
                    <td>{nfmt(promedio,3)}</td><td>{nfmt(proyectado,3)}</td>
                    {i===0 && <>
                      <td className="resumen-tanque" rowSpan={g.filas.length}>{nfmt(g.consumoTotal)}</td>
                      <td className="resumen-tanque" rowSpan={g.filas.length}>{nfmt(g.compraGalones)}</td>
                      <td className="resumen-tanque" rowSpan={g.filas.length}>{rd(g.compraPesos)}</td>
                      <td className="resumen-tanque" rowSpan={g.filas.length}>{nfmt(g.diferenciaGalones)}</td>
                      <td className="resumen-tanque" rowSpan={g.filas.length}>{rd(g.diferenciaPesos)}</td>
                    </>}
                  </tr>;
                })}
              </Fragment>)}
              <tr className="total">
                <td className="!text-left">TOTALES</td><td>{grupos.reduce((s,g)=>s+g.filas.length,0)} aptos.</td>
                <td colSpan={5}></td><td>{nfmt(totalGl)}</td><td></td><td>{rd(totalRd)}</td><td>{nfmt(totalGl)}</td><td colSpan={2}></td>
                <td>{nfmt(suma(grupos.map(g=>g.consumoTotal)))}</td><td>{existeCompra?nfmt(glCompra):"—"}</td>
                <td>{grupos.length && grupos.every(g=>g.compraPesos!==null)?rd(suma(grupos.map(g=>g.compraPesos))):"—"}</td><td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-slate-700">
          <p><strong>Fórmulas del cuadro:</strong> Diferencia (m³) = lectura final − lectura inicial. GLS consumido = consumo medido × factor. Promedio diario = GLS ÷ días (conteo inclusivo: fecha inicial y final). Diferencia GLS = compra − consumo total; diferencia RD$ = compra − importe facturado.</p>
          <p className="mt-1">Las cifras de «pagar por mes» provienen de gas_facturacion_unidades. Las compras usan el total registrado en gas_recepciones dentro de las fechas seleccionadas. La diferencia no mide pérdidas sin considerar inventarios inicial y final del tanque.</p>
          {!incluirProyeccion && <p className="mt-1">La columna de días adicionales permanece sin cálculo porque la proyección está desactivada, como en la imagen de referencia.</p>}
          {conAlerta.length>0 && <p className="mt-2 font-bold text-amber-800">* Unidades por revisar: {conAlerta.map(x=>`${x.apartamento}: ${x.alerta}`).join("; ")}</p>}
          <p className="mt-2 text-slate-500">VAM CONDOMINIO — Reporte de consulta {VERSION} · Condominio 24 · No es una factura ni sustituye el comprobante fiscal.</p>
        </div>
      </section>}
      {!fuentes && !cargando && !error && <p className="mx-auto max-w-7xl text-sm text-slate-500">Seleccione un mes para cargar el reporte.</p>}
    </main>
  );
}
