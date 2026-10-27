"use client";

/**
 * VAM Condominios - Comprobantes fiscales (fase 1)
 * Versión v0.3.1 - 19/10/2026
 *
 * ALCANCE: Vista previa de mantenimiento y gas del MES SELECCIONADO.
 * Los cargos GAS aprobados se contabilizan UNA sola vez desde cargos_periodicos;
 * gas_facturacion_unidades solo aporta las lecturas y el estado de aprobación.
 * Muestra el último NCF B02 informado y el próximo matemático SOLO como referencia.
 * No emite, reserva, genera, valida ni asigna NCF/e-NCF. No crea asientos,
 * facturas definitivas, pagos ni altera cargos. Es un BORRADOR SIN VALOR FISCAL.
 *
 * Guardar como: app/comprobantes-fiscales/page.tsx
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Printer, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";
import PageContainer from "@/components/vam/enterprise/PageContainer";

const MODULO_NOMBRE = "Facturación mensual y comprobantes fiscales";
const MODULO_VERSION = "v0.3.1";
const MODULO_FECHA = "19/10/2026";
const RUTA_SELLO_DON_JUAN = "/sello-don-juan.png";

/**
 * Referencia proporcionada por la administración; NO es el inventario fiscal de la DGII.
 * La numeración fiscal real necesita un rango autorizado y asignación atómica en servidor.
 * Don Juan I está registrado en VAM con condominio_id = 24.
 */
const NCF_REFERENCIA_DON_JUAN = {
  condominioId: 24,
  tipo: "B02" as const,
  ultimoInformado: "B0200000517",
  vencimientoInformado: "Diciembre 2026",
};

function siguienteNcfInformativo(ultimo: string): string | null {
  // Formato DGII: B + tipo 2 dígitos + 8 dígitos de consecutivo.
  if (!/^B02\d{8}$/.test(ultimo)) return null;
  const consecutivo = Number(ultimo.slice(3));
  if (!Number.isSafeInteger(consecutivo) || consecutivo >= 99999999) return null;
  return `B02${String(consecutivo + 1).padStart(8, "0")}`;
}

type Unidad = {
  id: number;
  codigo: string;
  cuota_mensual_actual: number | null;
};

type Propietario = {
  no_apartamento: string | null;
  nombre_propietario: string | null;
  cedula: string | null;
  correo: string | null;
};

type CargoMensual = {
  id: number;
  periodo: string | null;
  concepto: string | null;
  tipo_cargo: string | null;
  monto: number | null;
  monto_pagado: number | null;
  balance: number | null;
  estado: string | null;
};

type DetalleFacturacionGas = {
  id: number;
  estado: string | null;
  cargo_periodico_id: number | null;
  importe: number | null;
  fecha_lectura_anterior: string | null;
  fecha_lectura: string | null;
  lectura_anterior: number | null;
  lectura_actual: number | null;
  consumo: number | null;
  consumo_facturable: number | null;
  unidad_facturacion_codigo: string | null;
  precio_unitario: number | null;
};

type ModalidadGas = "CON_MEDIDORES" | "SIN_MEDIDORES" | "NO_CONFIGURADA";

function formatoNumero(value: number | null | undefined, decimales = 3): string {
  return Number(value || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  });
}

function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  const [a, m, d] = String(fecha).slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : String(fecha);
}

function mesSiguiente(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`;
}

type Condominio = { nombre: string; rnc: string };

const money = (value: number | null | undefined) =>
  `RD$ ${Number(value || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function normalizar(value: string | null | undefined): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function obtenerMesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function nombrePeriodo(periodo: string): string {
  const [anio, mes] = periodo.split("-");
  const indice = Number(mes) - 1;
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return meses[indice] && anio ? `${meses[indice]} ${anio}` : periodo;
}

function esMantenimiento(cargo: CargoMensual) {
  const tipo = normalizar(cargo.tipo_cargo);
  const concepto = normalizar(cargo.concepto);
  return (
    tipo === "ORDINARIO" || tipo === "MANTENIMIENTO" ||
    (!tipo && (concepto.includes("MANTENIMIENTO") || concepto.includes("CUOTAORDINARIA")))
  );
}

function esGas(cargo: CargoMensual) {
  return normalizar(cargo.tipo_cargo) === "GAS";
}

export default function ComprobantesFiscalesPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominio, setCondominio] = useState<Condominio>({ nombre: "", rnc: "" });
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [unidadId, setUnidadId] = useState("");
  const [periodo, setPeriodo] = useState(obtenerMesActual);
  const [modalidadGas, setModalidadGas] = useState<ModalidadGas>("NO_CONFIGURADA");
  const [detalleFacturacionGas, setDetalleFacturacionGas] = useState<DetalleFacturacionGas[]>([]);
  const [avisoGas, setAvisoGas] = useState("");
  const [cargosDelMes, setCargosDelMes] = useState<CargoMensual[]>([]);
  const [consultado, setConsultado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingBase, setLoadingBase] = useState(true);
  const [error, setError] = useState("");
  const [printReady, setPrintReady] = useState(false);
  const [selloUrl, setSelloUrl] = useState<string | null>(null);
  const [avisoSello, setAvisoSello] = useState("");

  useEffect(() => {
    setPrintReady(true);
    // El archivo bajo /public es la opción permanente y compartida en Vercel.
    // No se sustituye por una imagen que no se haya confirmado como sello.
    const imagen = new window.Image();
    imagen.onload = () => setSelloUrl(RUTA_SELLO_DON_JUAN);
    imagen.onerror = () => setSelloUrl(null);
    imagen.src = RUTA_SELLO_DON_JUAN;
  }, []);

  function cargarSelloParaVistaPrevia(archivo: File | undefined) {
    if (!archivo) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(archivo.type)) {
      setAvisoSello("Seleccione una imagen PNG, JPG o WEBP del sello.");
      return;
    }
    if (archivo.size > 3 * 1024 * 1024) {
      setAvisoSello("La imagen del sello debe pesar menos de 3 MB.");
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      if (typeof lector.result === "string") {
        setSelloUrl(lector.result);
        setAvisoSello("Sello listo para esta impresión. Para uso permanente, guarde el archivo en public/sello-don-juan.png y publíquelo en Vercel.");
      }
    };
    lector.onerror = () => setAvisoSello("No se pudo leer la imagen del sello.");
    lector.readAsDataURL(archivo);
  }

  useEffect(() => {
    const id = Number(window.localStorage.getItem("condominio_id") || 0);
    if (!Number.isInteger(id) || id <= 0) {
      setError("No hay un condominio seleccionado en la sesión.");
      setLoadingBase(false);
      return;
    }
    setCondominioId(id);
    let activo = true;
    async function cargarBase() {
      setLoadingBase(true);
      const [condoResult, unidadesResult, propietariosResult, gasConfigResult] = await Promise.all([
        supabase.from("condominios").select("*").eq("id", id).maybeSingle(),
        supabase.from("unidades")
          .select("id,codigo,cuota_mensual_actual")
          .eq("condominio_id", id).eq("activa", true)
          .order("codigo", { ascending: true }),
        supabase.from("propietarios_apartamentos")
          .select("no_apartamento,nombre_propietario,cedula,correo")
          .eq("condominio_id", id),
        supabase.from("gas_configuracion")
          .select("modalidad")
          .eq("condominio_id", id)
          .maybeSingle(),
      ]);
      if (!activo) return;
      const fallos = [condoResult.error, unidadesResult.error, propietariosResult.error, gasConfigResult.error]
        .filter(Boolean).map(item => item!.message);
      if (fallos.length) {
        setError(`No se pudo cargar el condominio: ${fallos.join(" | ")}`);
      } else {
        const base = (condoResult.data || {}) as Record<string, unknown>;
        setCondominio({
          nombre: String(base.nombre || window.localStorage.getItem("condominio_nombre") || ""),
          rnc: String(base.rnc || base.RNC || ""),
        });
        setUnidades((unidadesResult.data || []) as Unidad[]);
        setPropietarios((propietariosResult.data || []) as Propietario[]);
        const modalidad = normalizar(String(gasConfigResult.data?.modalidad || ""));
        setModalidadGas(modalidad === "CON_MEDIDORES" ? "CON_MEDIDORES"
          : modalidad === "SIN_MEDIDORES" ? "SIN_MEDIDORES" : "NO_CONFIGURADA");
      }
      setLoadingBase(false);
    }
    void cargarBase();
    return () => { activo = false; };
  }, []);

  const unidad = useMemo(() => unidades.find(u => String(u.id) === unidadId) || null, [unidades, unidadId]);
  const propietario = useMemo(() => {
    if (!unidad) return null;
    return propietarios.find(p => normalizar(p.no_apartamento) === normalizar(unidad.codigo)) || null;
  }, [unidad, propietarios]);

  const consultar = useCallback(async () => {
    if (!condominioId || !unidadId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      setError("Seleccione un apartamento y un período mensual válido.");
      return;
    }
    setLoading(true);
    setError("");
    setConsultado(false);
    setCargosDelMes([]);
    setDetalleFacturacionGas([]);
    setAvisoGas("");
    try {
      // El importe de gas se toma de cargos_periodicos SOLO cuando el proceso de
      // facturación de gas ya aprobó y generó el cargo. Nunca sumar también
      // gas_facturacion_unidades. Esa tabla solo aporta el detalle del medidor.
      const [cargosRespuesta, detalleGasRespuesta] = await Promise.all([
        supabase.from("cargos_periodicos")
          .select("id,periodo,concepto,tipo_cargo,monto,monto_pagado,balance,estado")
          .eq("condominio_id", condominioId)
          .eq("unidad_id", Number(unidadId))
          .eq("periodo", periodo)
          .order("id", { ascending: true }),
        supabase.from("gas_facturacion_unidades")
          .select("id,estado,cargo_periodico_id,importe,fecha_lectura_anterior,fecha_lectura,lectura_anterior,lectura_actual,consumo,consumo_facturable,unidad_facturacion_codigo,precio_unitario")
          .eq("condominio_id", condominioId)
          .eq("unidad_id", Number(unidadId))
          .gte("periodo", `${periodo}-01`)
          .lt("periodo", mesSiguiente(periodo))
          .order("id", { ascending: true }),
      ]);
      if (cargosRespuesta.error) throw new Error(`Error consultando cargos: ${cargosRespuesta.error.message}`);
      const cargos = (cargosRespuesta.data || []) as CargoMensual[];
      const cargosValidos = cargos.filter(c =>
        normalizar(c.estado) !== "ANULADO" && (esMantenimiento(c) || esGas(c)),
      );
      setCargosDelMes(cargosValidos);

      if (detalleGasRespuesta.error) {
        setAvisoGas(`No se pudo consultar el detalle del medidor: ${detalleGasRespuesta.error.message}. Se conservan los importes que constan en los cargos.`);
      } else {
        const gas = (detalleGasRespuesta.data || []) as DetalleFacturacionGas[];
        setDetalleFacturacionGas(gas);
        if ((modalidadGas === "CON_MEDIDORES" || condominioId === 24) && !cargosValidos.some(esGas)) {
          setAvisoGas(gas.some(f => normalizar(f.estado) === "PENDIENTE")
            ? "El consumo de gas de este mes está preparado pero PENDIENTE DE APROBACIÓN. Apruébelo en el módulo Gas para generar el cargo antes de emitir el aviso completo."
            : "No se encontró un cargo de gas aprobado para este mes. Revise la facturación de gas antes de imprimir el aviso mensual completo.");
        }
      }
      setConsultado(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No fue posible consultar el mes seleccionado.");
    } finally {
      setLoading(false);
    }
  }, [condominioId, unidadId, periodo, modalidadGas]);

  // El gas aprobado del período se incluye automáticamente; no debe marcarse
  // una casilla adicional que permita olvidarlo al facturar.
  const renglones = useMemo(() => cargosDelMes.filter(c => esMantenimiento(c) || esGas(c)), [cargosDelMes]);
  const cargosMantenimiento = renglones.filter(esMantenimiento);
  const cargosGas = renglones.filter(esGas);
  const totalMantenimiento = cargosMantenimiento.reduce((s, c) => s + Number(c.monto || 0), 0);
  const totalGas = cargosGas.reduce((s, c) => s + Number(c.monto || 0), 0);
  const subtotal = totalMantenimiento + totalGas;
  const totalPagado = renglones.reduce((a, c) => a + Number(c.monto_pagado || 0), 0);
  const saldoMes = renglones.reduce((a, c) => a + Number(c.balance || 0), 0);
  const detalleGasAprobado = detalleFacturacionGas.filter(f =>
    normalizar(f.estado) === "APROBADA" &&
    cargosGas.some(c => Number(f.cargo_periodico_id) === Number(c.id)),
  );
  const requiereGasConMedidores = modalidadGas === "CON_MEDIDORES" || condominioId === 24;
  const gasSinCargo = requiereGasConMedidores && cargosGas.length === 0;
  const fechaEmision = new Date().toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
  // Evita enviar como completa una factura del mes que omite el gas porque
  // aún está pendiente de aprobación. No afecta condominios sin medidores.
  const puedeImprimir = consultado && renglones.length > 0 && !gasSinCargo && !loading;
  const referenciaNcf = condominioId === NCF_REFERENCIA_DON_JUAN.condominioId
    ? NCF_REFERENCIA_DON_JUAN
    : null;
  const proximoNcfEstimado = referenciaNcf
    ? siguienteNcfInformativo(referenciaNcf.ultimoInformado)
    : null;

  return (
    <PageContainer>
      <div className="vam-cf-screen mx-auto max-w-5xl space-y-5 py-5">
        <header className="rounded-2xl bg-slate-900 px-6 py-6 text-white">
          <div className="flex items-center gap-3"><FileText className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-black">Facturación mensual y comprobantes fiscales</h1>
              <p className="mt-1 text-sm text-slate-200">{condominio.nombre || "Condominio seleccionado"} · {MODULO_VERSION}</p>
            </div>
          </div>
        </header>

        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p><strong>Primera fase: borrador mensual, sin valor fiscal.</strong> No se asigna ni emite NCF/e-NCF.
            Para activar comprobantes fiscales reales es necesario configurar la modalidad y secuencias autorizadas
            por DGII y su emisión segura en el servidor.</p>
        </div>

        {referenciaNcf && (
          <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-black text-slate-900">Configuración fiscal informativa · Don Juan I</h2>
            <p className="mt-1 text-xs text-slate-600">
              Tipo B02 (factura de consumo). La numeración siguiente es una referencia matemática,
              no está reservada ni validada contra el inventario de comprobantes autorizados por la DGII.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Último NCF informado</p>
                <p className="mt-1 text-lg font-black tracking-wide text-slate-900">{referenciaNcf.ultimoInformado}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3">
                <p className="text-xs font-bold uppercase text-blue-700">Próximo NCF estimado</p>
                <p className="mt-1 text-lg font-black tracking-wide text-blue-900">{proximoNcfEstimado || "No disponible"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Vencimiento informado</p>
                <p className="mt-1 text-sm font-black text-slate-900">{referenciaNcf.vencimientoInformado}</p>
                <p className="mt-1 text-[11px] text-amber-700">
                  Por verificar: según DGII, las facturas de consumo B02 no tienen vencimiento ordinario.
                </p>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-950">
              No se emitirán NCF desde esta pantalla. Para activar emisión real debe
              verificarse el rango final autorizado, los números no utilizados y
              la habilitación del condominio para emisión tradicional B02 frente a e-CF.
              La secuencia se gestionará de forma segura desde Supabase y no desde el navegador.
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-black text-slate-900">Preparar documento del mes</h2>
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <label className="space-y-1 text-sm font-bold text-slate-700">
              Apartamento / propietario
              <select className="w-full rounded-xl border px-3 py-3" value={unidadId}
                disabled={loadingBase}
                onChange={e => { setUnidadId(e.target.value); setConsultado(false); setCargosDelMes([]); setDetalleFacturacionGas([]); setAvisoGas(""); setError(""); }}>
                <option value="">Seleccione apartamento</option>
                {unidades.map(u => {
                  const p = propietarios.find(item => normalizar(item.no_apartamento) === normalizar(u.codigo));
                  return <option key={u.id} value={u.id}>{u.codigo} — {p?.nombre_propietario || "Sin propietario"}</option>;
                })}
              </select>
            </label>
            <label className="space-y-1 text-sm font-bold text-slate-700">
              Mes a facturar
              <input type="month" value={periodo}
                onChange={e => { setPeriodo(e.target.value); setConsultado(false); setCargosDelMes([]); setDetalleFacturacionGas([]); setAvisoGas(""); setError(""); }}
                className="w-full rounded-xl border px-3 py-3" />
            </label>
          </div>
          <p className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-900">
            Mantenimiento + gas: el sistema incluirá automáticamente los cargos del mes.
            {modalidadGas === "CON_MEDIDORES" ? " El gas se incluirá cuando esté aprobado y registrado como cargo." :
             modalidadGas === "SIN_MEDIDORES" ? " Condominio configurado sin medidores individuales." :
             condominioId === 24 ? " Don Juan I requiere medidores individuales; confirme la configuración y el cargo de gas." :
             " No se ha confirmado la modalidad de gas del condominio."}
          </p>
          {condominioId === 24 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="max-w-lg">
                  <p className="text-sm font-black text-slate-900">Sello del Condominio Don Juan I</p>
                  <p className="mt-1 text-xs text-slate-600">
                    El sello se imprimirá en la parte inferior del aviso mensual. Para instalarlo
                    permanentemente, coloque su imagen como <code>public/sello-don-juan.png</code>.
                    También puede cargarlo temporalmente aquí para una impresión.
                  </p>
                  <input type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={event => cargarSelloParaVistaPrevia(event.target.files?.[0])}
                    className="mt-3 block w-full max-w-sm text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:font-bold"
                  />
                  {avisoSello && <p className="mt-2 text-xs text-slate-700">{avisoSello}</p>}
                </div>
                {selloUrl ? (
                  <img src={selloUrl} alt="Sello seleccionado para Don Juan I"
                    className="max-h-28 max-w-36 object-contain" />
                ) : <p className="text-xs font-semibold text-amber-800">Sin sello cargado</p>}
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void consultar()} disabled={loading || loadingBase || !unidadId}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Consultando..." : "Consultar cargos del mes"}
            </button>
            <button type="button" disabled={!puedeImprimir} onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 disabled:opacity-50">
              <Printer className="h-4 w-4" /> Imprimir / Guardar como PDF
            </button>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {consultado && avisoGas && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{avisoGas}</p>}
          {consultado && gasSinCargo && <p className="mt-2 text-xs font-bold text-red-700">Impresión deshabilitada: primero apruebe el consumo de gas del período en el módulo Gas.</p>}
        </section>

        {consultado && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-black">Vista previa · {nombrePeriodo(periodo)}</h2>
              <span className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">BORRADOR</span>
            </div>
            <p className="mb-4 text-sm text-slate-600">Apartamento {unidad?.codigo} · {propietario?.nombre_propietario || "Propietario sin identificar"}</p>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-600">Mantenimiento del mes</p><strong className="mt-1 block text-lg text-slate-900">{money(totalMantenimiento)}</strong></div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3"><p className="text-xs font-bold uppercase text-cyan-800">Consumo de gas del mes</p><strong className="mt-1 block text-lg text-cyan-950">{cargosGas.length ? money(totalGas) : "Sin cargo aprobado"}</strong></div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs font-bold uppercase text-blue-800">Total facturado del mes</p><strong className="mt-1 block text-lg text-blue-950">{money(subtotal)}</strong></div>
            </div>
            {renglones.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[570px] text-sm">
                    <thead className="bg-slate-100"><tr>
                      <th className="px-3 py-3 text-left">Concepto</th>
                      <th className="px-3 py-3 text-right">Cargo del mes</th>
                      <th className="px-3 py-3 text-right">Pagado</th>
                      <th className="px-3 py-3 text-right">Pendiente</th>
                    </tr></thead>
                    <tbody>
                      {renglones.map(c => (
                        <tr key={c.id} className="border-t">
                          <td className="px-3 py-3">{c.concepto || (esGas(c) ? "Consumo de gas" : "Mantenimiento ordinario")}</td>
                          <td className="px-3 py-3 text-right">{money(c.monto)}</td>
                          <td className="px-3 py-3 text-right">{money(c.monto_pagado)}</td>
                          <td className="px-3 py-3 text-right">{money(c.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black"><tr>
                      <td className="px-3 py-3">TOTAL MES</td>
                      <td className="px-3 py-3 text-right">{money(subtotal)}</td>
                      <td className="px-3 py-3 text-right">{money(totalPagado)}</td>
                      <td className="px-3 py-3 text-right">{money(saldoMes)}</td>
                    </tr></tfoot>
                  </table>
                </div>
                {detalleGasAprobado.length > 0 && (
                  <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                    <h3 className="mb-3 text-sm font-black text-cyan-950">Detalle del consumo de gas — medidor individual</h3>
                    {detalleGasAprobado.map(f => (
                      <div key={f.id} className="grid gap-2 text-xs text-slate-800 sm:grid-cols-3">
                        <p><b>Lectura anterior:</b> {formatoNumero(f.lectura_anterior)} ({formatearFecha(f.fecha_lectura_anterior)})</p>
                        <p><b>Lectura actual:</b> {formatoNumero(f.lectura_actual)} ({formatearFecha(f.fecha_lectura)})</p>
                        <p><b>Consumo registrado:</b> {formatoNumero(f.consumo, 4)}</p>
                        <p><b>Consumo facturable:</b> {formatoNumero(f.consumo_facturable, 4)} {f.unidad_facturacion_codigo || ""}</p>
                        <p><b>Precio unitario:</b> {money(f.precio_unitario)}</p>
                        <p><b>Importe aprobado:</b> {money(f.importe)}</p>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-500">No incluye deuda inicial, morosidad de otros meses ni saldos históricos. Los importes se leen directamente de cargos_periodicos. Los detalles de lectura de gas no se vuelven a sumar.</p>
                <p className="mt-1 text-xs text-slate-500">El tratamiento fiscal, los impuestos aplicables y los NCF se configurarán en la etapa de emisión fiscal autorizada.</p>
              </>
            ) : <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-600">No existen cargos de mantenimiento ni de gas aprobados para el apartamento y mes seleccionados.</p>}
          </section>
        )}
        <p className="text-right text-xs text-slate-400">{MODULO_NOMBRE} · {MODULO_VERSION} · {MODULO_FECHA}</p>
      </div>

      {printReady && puedeImprimir && createPortal(
        <article className="vam-cf-print">
          <header className="vam-cf-header">
            <h1>{condominio.nombre || "Condominio"}</h1>
            {condominio.rnc && <p>RNC: {condominio.rnc}</p>}
            <h2>AVISO DE COBRO MENSUAL</h2>
            <strong>BORRADOR — DOCUMENTO SIN VALOR FISCAL · SIN NCF</strong>
          </header>
          <div className="vam-cf-facts">
            <p><b>Propietario:</b> {propietario?.nombre_propietario || "No identificado"}</p>
            <p><b>Apartamento:</b> {unidad?.codigo || "-"}</p>
            <p><b>Documento registrado:</b> {propietario?.cedula || "-"}</p>
            <p><b>Período:</b> {nombrePeriodo(periodo)}</p>
            <p><b>Fecha de impresión:</b> {fechaEmision}</p>
          </div>
          <div className="vam-cf-totals">
            <p><b>Mantenimiento del mes:</b> {money(totalMantenimiento)}</p>
            <p><b>Consumo de gas del mes:</b> {money(totalGas)}</p>
            <p><b>Total facturado:</b> {money(subtotal)}</p>
          </div>
          <table className="vam-cf-table">
            <thead><tr><th>Concepto</th><th>Cargo del mes</th><th>Pagado</th><th>Pendiente</th></tr></thead>
            <tbody>{renglones.map(c => <tr key={c.id}>
              <td>{c.concepto || (esGas(c) ? "Consumo de gas" : "Mantenimiento ordinario")}</td>
              <td>{money(c.monto)}</td><td>{money(c.monto_pagado)}</td><td>{money(c.balance)}</td>
            </tr>)}</tbody>
            <tfoot><tr><td>TOTAL MES</td><td>{money(subtotal)}</td><td>{money(totalPagado)}</td><td>{money(saldoMes)}</td></tr></tfoot>
          </table>
          {detalleGasAprobado.length > 0 && (
            <section className="vam-cf-meter">
              <h3>DETALLE DE CONSUMO DE GAS</h3>
              {detalleGasAprobado.map(f => <div key={f.id}>
                <p>Lectura anterior: {formatoNumero(f.lectura_anterior)} ({formatearFecha(f.fecha_lectura_anterior)})</p>
                <p>Lectura actual: {formatoNumero(f.lectura_actual)} ({formatearFecha(f.fecha_lectura)})</p>
                <p>Consumo medido: {formatoNumero(f.consumo, 4)} · Facturable: {formatoNumero(f.consumo_facturable, 4)} {f.unidad_facturacion_codigo || ""}</p>
                <p>Precio unitario: {money(f.precio_unitario)} · Importe aprobado: {money(f.importe)}</p>
              </div>)}
            </section>
          )}
          <p className="vam-cf-note">Este documento incluye exclusivamente cargos del período seleccionado.
            No contiene deuda inicial ni balances de otros meses. No es un comprobante fiscal autorizado ni sustituye un NCF/e-CF válido.
            Los impuestos que correspondan deberán determinarse antes de la emisión fiscal definitiva.</p>
          {condominioId === 24 && selloUrl && (
            <div className="vam-cf-stamp" aria-label="Sello institucional del condominio">
              <img src={selloUrl} alt="Sello del Residencial Don Juan I" />
            </div>
          )}
          <footer>VAM Administradora de Condominios · 829-792-9292 · {MODULO_VERSION}</footer>
        </article>, document.body,
      )}
      <style jsx global>{`
        .vam-cf-print { display:none; }
        @media print {
          @page { size: letter portrait; margin: 0.55in; }
          body > *:not(.vam-cf-print) { display: none !important; }
          body > .vam-cf-print { display: block !important; }
          html,body { background:#fff !important; color:#17253d !important; }
          .vam-cf-print { display:block !important; width:100%; font: 11px/1.5 Arial,sans-serif; }
          .vam-cf-header { border-bottom:2px solid #173154; padding-bottom:16px; text-align:center; }
          .vam-cf-header h1 { font-size:17px; text-transform:uppercase; margin:0; }
          .vam-cf-header h2 { font-size:18px; margin:12px 0 3px; }
          .vam-cf-header strong { display:block; font-size:10px; color:#9a3412; }
          .vam-cf-facts { padding:14px 0; display:grid; grid-template-columns:1fr 1fr; gap:5px; }
          .vam-cf-facts p { margin:0; }
          .vam-cf-totals { display:flex; justify-content:space-between; gap:12px; padding:12px 8px; background:#f0f6ff; font-size:10px; }
          .vam-cf-totals p { margin:0; }
          .vam-cf-meter { break-inside:avoid; border:1px solid #a7d9e6; padding:10px; margin-top:12px; background:#f1fbfd; }
          .vam-cf-meter h3 { font-size:11px; margin:0 0 5px; }
          .vam-cf-meter p { margin:2px 0; }
          .vam-cf-table { width:100%; border-collapse:collapse; margin:10px 0; }
          .vam-cf-table th, .vam-cf-table td { border:1px solid #b8c5d4; padding:8px 6px; }
          .vam-cf-table th { background:#edf1f6; text-align:left; }
          .vam-cf-table th:not(:first-child),.vam-cf-table td:not(:first-child) { text-align:right; }
          .vam-cf-table tfoot { font-weight:800; background:#edf1f6; }
          .vam-cf-note { margin-top:20px; font-size:10px; color:#475569; }
          .vam-cf-stamp { margin:10px 4px 3px; min-height:65px; display:flex; justify-content:flex-end; align-items:center; break-inside:avoid; }
          .vam-cf-stamp img { max-width:145px; max-height:95px; object-fit:contain; }
          .vam-cf-print footer { margin-top:26px; border-top:1px solid #b8c5d4; padding-top:10px; font-size:10px; }
        }
      `}</style>
    </PageContainer>
  );
}
