"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";

import { supabase } from "@/app/lib/supabaseClient";
import { generarAsientoPagoMantenimiento } from "@/app/lib/contabilidad/generarAsientoPagoMantenimiento";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Unidad = {
  id: number;
  codigo: string | null;
  propietario_id: number | null;
  propietario_nombre: string | null;
};

type CuentaBancaria = {
  id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
  fondo_tipo: string | null;
};

type FilaExcel = {
  fecha_pago: string;
  monto: number;
  no_serial: string;
  descripcion: string;
  apartamento_raw: string;
  apartamento_codigo: string;
  unidad_id: number | null;
  propietario_id: number | null;
  propietario: string;
  estado_validacion: string;
  observacion_validacion: string;
};

type LoteImportado = {
  id: number;
  periodo_archivo: string;
  periodo_archivo_nombre: string;
  nombre_archivo: string | null;
  total_registros: number | null;
  total_monto: number | null;
  estado: string | null;
  procesado: boolean | null;
};

type PagoImportado = FilaExcel & {
  id: number;
  lote_id: number;
  procesado: boolean | null;
  pago_mantenimiento_id: number | null;
};

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizarCodigo(valor: unknown) {
  return normalizarTexto(valor).replace(/\s+/g, "").toUpperCase();
}

function periodoNombre(periodo: string) {
  const [anioTexto, mesTexto] = periodo.split("-");
  const anio = Number(anioTexto);
  const mes = Number(mesTexto);

  if (!anio || !mes || mes < 1 || mes > 12) return periodo;
  return `${MESES[mes - 1]} ${anio}`;
}

function obtenerPeriodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function obtenerApartamentoCodigo(apartamento: string) {
  const limpio = String(apartamento || "").trim().toUpperCase();
  if (!limpio) return "";

  const partes = limpio.split("-").map((p) => p.trim()).filter(Boolean);
  return partes.length > 1 ? partes[partes.length - 1] : limpio;
}

function valorPorCabecera(row: Record<string, unknown>, opciones: string[]) {
  const entradas = Object.entries(row);
  for (const opcion of opciones) {
    const normalizada = normalizarTexto(opcion);
    const encontrada = entradas.find(([key]) => normalizarTexto(key) === normalizada);
    if (encontrada) return encontrada[1];
  }
  return "";
}

function parsearFechaExcel(valor: unknown) {
  if (!valor) return "";

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }

  if (typeof valor === "number") {
    const parsed = XLSX.SSF.parse_date_code(valor);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const texto = String(valor).trim();
  if (!texto) return "";

  const iso = texto.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(iso[3]).padStart(2, "0")}`;
  }

  const latino = texto.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (latino) {
    return `${latino[3]}-${String(latino[2]).padStart(2, "0")}-${String(latino[1]).padStart(2, "0")}`;
  }

  return "";
}

function parsearMonto(valor: unknown) {
  if (typeof valor === "number") return Number(valor || 0);

  const texto = String(valor || "")
    .replace(/RD\$/gi, "")
    .replace(/,/g, "")
    .trim();

  return Number(texto || 0);
}

async function calcularHashArchivo(file: File) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function ImportarBancoIdentificadoPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [periodoArchivo, setPeriodoArchivo] = useState(obtenerPeriodoActual());
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoHash, setArchivoHash] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [filas, setFilas] = useState<FilaExcel[]>([]);
  const [loteActual, setLoteActual] = useState<LoteImportado | null>(null);
  const [pagosGuardados, setPagosGuardados] = useState<PagoImportado[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [bitacora, setBitacora] = useState<string[]>([]);

  function log(texto: string) {
    const linea = `${new Date().toLocaleTimeString()} - ${texto}`;
    console.log("[Importar banco identificado]", linea);
    setBitacora((prev) => [...prev, linea]);
  }

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre);
    cargarDatosIniciales(id);
  }, [router]);

  async function cargarDatosIniciales(id: string) {
    setLoading(true);
    await Promise.all([cargarUnidades(id), cargarCuentas(id)]);
    setLoading(false);
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo, propietario_id, propietario_nombre")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    if (error) {
      alert("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades((data || []) as Unidad[]);
  }

  async function cargarCuentas(id: string) {
    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select("id, nombre_banco, numero_cuenta, fondo_tipo")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("nombre_banco", { ascending: true });

    if (error) {
      alert("Error cargando cuentas bancarias: " + error.message);
      return;
    }

    setCuentas((data || []) as CuentaBancaria[]);
  }

  const cuentaOrdinaria = useMemo(() => {
    return cuentas.find((c) => String(c.fondo_tipo || "").toUpperCase() === "ORDINARIO") || cuentas[0] || null;
  }, [cuentas]);

  const resumen = useMemo(() => {
    const total = filas.reduce((sum, f) => sum + Number(f.monto || 0), 0);
    const validos = filas.filter((f) => f.estado_validacion === "VALIDADO").length;
    const errores = filas.filter((f) => f.estado_validacion !== "VALIDADO").length;
    return { total, validos, errores, registros: filas.length };
  }, [filas]);

  const resumenGuardado = useMemo(() => {
    const total = pagosGuardados.reduce((sum, f) => sum + Number(f.monto || 0), 0);
    const validos = pagosGuardados.filter((f) => f.estado_validacion === "VALIDADO").length;
    const procesados = pagosGuardados.filter((f) => f.procesado).length;
    const errores = pagosGuardados.filter((f) => !["VALIDADO", "PROCESADO"].includes(f.estado_validacion)).length;
    return { total, validos, procesados, errores, registros: pagosGuardados.length };
  }, [pagosGuardados]);

  async function seleccionarArchivo(file: File | null) {
    setArchivo(file);
    setFilas([]);
    setLoteActual(null);
    setPagosGuardados([]);
    setMensaje("");
    setBitacora([]);

    if (!file) {
      setArchivoHash("");
      return;
    }

    const hash = await calcularHashArchivo(file);
    setArchivoHash(hash);
    log(`Archivo seleccionado: ${file.name}. Hash: ${hash.slice(0, 16)}...`);
  }

  async function validarArchivoAntesDeLeer() {
    if (!archivo || !condominioId || !archivoHash) return false;

    const { data: loteHash, error: errorHash } = await supabase
      .from("pagos_importados_banco_lotes")
      .select("id, periodo_archivo_nombre, nombre_archivo, estado")
      .eq("condominio_id", Number(condominioId))
      .eq("archivo_hash", archivoHash)
      .maybeSingle();

    if (errorHash) throw new Error("Error validando archivo repetido: " + errorHash.message);

    if (loteHash?.id) {
      alert(
        `Este mismo archivo ya fue importado anteriormente para ${loteHash.periodo_archivo_nombre}. Archivo: ${loteHash.nombre_archivo || "sin nombre"}.`,
      );
      return false;
    }

    const { data: lotePeriodo, error: errorPeriodo } = await supabase
      .from("pagos_importados_banco_lotes")
      .select("id, periodo_archivo_nombre, nombre_archivo, estado")
      .eq("condominio_id", Number(condominioId))
      .eq("periodo_archivo", periodoArchivo)
      .neq("estado", "ANULADO")
      .maybeSingle();

    if (errorPeriodo) throw new Error("Error validando período importado: " + errorPeriodo.message);

    if (lotePeriodo?.id) {
      alert(
        `Ya existe una importación activa para ${lotePeriodo.periodo_archivo_nombre}. Debe anular esa importación antes de subir otra del mismo mes.`,
      );
      return false;
    }

    return true;
  }

  async function leerYValidarExcel() {
    if (!archivo) {
      alert("Debe seleccionar un archivo Excel.");
      return;
    }

    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    setLoading(true);
    setMensaje("");
    setBitacora([]);

    try {
      log("Paso 1: Validando que el archivo no esté importado...");
      const permitido = await validarArchivoAntesDeLeer();
      if (!permitido) {
        setLoading(false);
        return;
      }

      log("Paso 2: Leyendo Excel...");
      const buffer = await archivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const primeraHoja = workbook.SheetNames[0];
      const sheet = workbook.Sheets[primeraHoja];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (rows.length === 0) {
        alert("El archivo no tiene registros.");
        setLoading(false);
        return;
      }

      log(`Paso 3: Validando ${rows.length} registro(s)...`);
      const mapaUnidades = new Map<string, Unidad>();
      unidades.forEach((u) => {
        const codigo = normalizarCodigo(u.codigo || "");
        if (codigo) mapaUnidades.set(codigo, u);
      });

      const clavesInternas = new Set<string>();
      const seriales = rows
        .map((r) => String(valorPorCabecera(r, ["no_serial", "no serial", "serial", "referencia", "no. serial"])).trim())
        .filter(Boolean);

      let referenciasExistentes = new Set<string>();
      if (seriales.length > 0) {
        const { data: pagosExistentes, error } = await supabase
          .from("pagos")
          .select("referencia")
          .eq("condominio_id", Number(condominioId))
          .in("referencia", Array.from(new Set(seriales)));

        if (error) throw new Error("Error validando referencias existentes en pagos: " + error.message);
        referenciasExistentes = new Set((pagosExistentes || []).map((p: any) => String(p.referencia || "")));
      }

      const resultado: FilaExcel[] = rows.map((row) => {
        const fecha = parsearFechaExcel(valorPorCabecera(row, ["fecha", "fecha_pago", "fecha pago", "fecha posteo", "fecha_posteo"]));
        const monto = parsearMonto(valorPorCabecera(row, ["monto", "monto transaccion", "monto_transaccion", "valor", "importe"]));
        const noSerial = String(valorPorCabecera(row, ["no_serial", "no serial", "serial", "referencia", "no. serial"])).trim();
        const descripcion = String(valorPorCabecera(row, ["descripcion", "descripción", "detalle", "concepto"])).trim();
        const apartamentoRaw = String(valorPorCabecera(row, ["apartamento", "apto", "unidad", "codigo", "código"])).trim().toUpperCase();
        const apartamentoCodigo = obtenerApartamentoCodigo(apartamentoRaw);

        const unidad =
          mapaUnidades.get(normalizarCodigo(apartamentoRaw)) ||
          mapaUnidades.get(normalizarCodigo(apartamentoCodigo)) ||
          null;

        let estado = "VALIDADO";
        let observacion = "Pago válido para procesar.";
        const clave = `${fecha}|${monto}|${noSerial}|${normalizarCodigo(apartamentoRaw)}`;

        if (!fecha) {
          estado = "ERROR_FECHA";
          observacion = "La fecha no es válida o está vacía.";
        } else if (!monto || monto <= 0) {
          estado = "ERROR_MONTO";
          observacion = "El monto debe ser mayor que cero.";
        } else if (!apartamentoRaw) {
          estado = "ERROR_UNIDAD";
          observacion = "El apartamento está vacío.";
        } else if (!unidad) {
          estado = "ERROR_UNIDAD";
          observacion = `No se encontró la unidad ${apartamentoRaw}.`;
        } else if (!unidad.propietario_id) {
          estado = "ERROR_PROPIETARIO";
          observacion = `La unidad ${unidad.codigo || apartamentoRaw} no tiene propietario asignado.`;
        } else if (clavesInternas.has(clave)) {
          estado = "DUPLICADO";
          observacion = "Registro duplicado dentro del mismo archivo.";
        } else if (noSerial && referenciasExistentes.has(noSerial)) {
          estado = "DUPLICADO";
          observacion = "Ya existe un pago registrado con este no. serial / referencia.";
        }

        clavesInternas.add(clave);

        return {
          fecha_pago: fecha,
          monto,
          no_serial: noSerial,
          descripcion,
          apartamento_raw: apartamentoRaw,
          apartamento_codigo: apartamentoCodigo,
          unidad_id: unidad?.id || null,
          propietario_id: unidad?.propietario_id || null,
          propietario: unidad?.propietario_nombre || "",
          estado_validacion: estado,
          observacion_validacion: observacion,
        };
      });

      setFilas(resultado);
      log(`Paso 4 OK: Validación completada. Válidos: ${resultado.filter((f) => f.estado_validacion === "VALIDADO").length}.`);
      setMensaje("Archivo validado. Revise los registros antes de guardar la importación.");
    } catch (error: any) {
      alert(error.message || "Error leyendo el archivo.");
      log("ERROR: " + (error.message || "Error leyendo el archivo."));
    }

    setLoading(false);
  }

  async function guardarImportacion() {
    if (!archivo || !condominioId || filas.length === 0) {
      alert("Debe leer y validar un archivo antes de guardar.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const permitido = await validarArchivoAntesDeLeer();
      if (!permitido) {
        setGuardando(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const totalMonto = filas.reduce((sum, f) => sum + Number(f.monto || 0), 0);

      log("Paso 5: Guardando lote de importación...");
      const { data: lote, error: errorLote } = await supabase
        .from("pagos_importados_banco_lotes")
        .insert({
          condominio_id: Number(condominioId),
          condominio: condominioNombre,
          periodo_archivo: periodoArchivo,
          periodo_archivo_nombre: periodoNombre(periodoArchivo),
          nombre_archivo: archivo.name,
          archivo_hash: archivoHash,
          total_registros: filas.length,
          total_monto: totalMonto,
          estado: resumen.errores > 0 ? "PENDIENTE" : "VALIDADO",
          importado_por: userData.user?.id || null,
        })
        .select("id, periodo_archivo, periodo_archivo_nombre, nombre_archivo, total_registros, total_monto, estado, procesado")
        .single();

      if (errorLote) throw new Error("Error guardando lote: " + errorLote.message);

      log("Paso 6: Guardando detalle de pagos importados...");
      const detalles = filas.map((f) => ({
        lote_id: lote.id,
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        periodo_archivo: periodoArchivo,
        periodo_archivo_nombre: periodoNombre(periodoArchivo),
        fecha_pago: f.fecha_pago,
        monto: f.monto,
        no_serial: f.no_serial || null,
        descripcion: f.descripcion || null,
        apartamento_raw: f.apartamento_raw,
        apartamento_codigo: f.apartamento_codigo || null,
        unidad_id: f.unidad_id,
        propietario_id: f.propietario_id,
        propietario: f.propietario || null,
        estado_validacion: f.estado_validacion,
        observacion_validacion: f.observacion_validacion,
      }));

      const { data: insertados, error: errorDetalle } = await supabase
        .from("pagos_importados_banco_identificados")
        .insert(detalles)
        .select("*");

      if (errorDetalle) throw new Error("Error guardando detalle: " + errorDetalle.message);

      setLoteActual(lote as LoteImportado);
      setPagosGuardados((insertados || []) as PagoImportado[]);
      setMensaje("Importación guardada correctamente. Ahora puede procesar los pagos válidos.");
      log("Paso 7 OK: Importación guardada correctamente.");
    } catch (error: any) {
      alert(error.message || "Error guardando importación.");
      log("ERROR: " + (error.message || "Error guardando importación."));
    }

    setGuardando(false);
  }

  async function procesarPagosValidos() {
    if (!loteActual?.id) {
      alert("Debe guardar la importación antes de procesar.");
      return;
    }

    if (!cuentaOrdinaria?.id) {
      alert("No existe cuenta bancaria activa para procesar estos pagos.");
      return;
    }

    const validos = pagosGuardados.filter((p) => p.estado_validacion === "VALIDADO" && !p.procesado && p.unidad_id);

    if (validos.length === 0) {
      alert("No hay pagos válidos pendientes de procesar.");
      return;
    }

    const confirmar = confirm(
      `Se procesarán ${validos.length} pago(s) válidos hacia el módulo de pagos. ¿Desea continuar?`,
    );

    if (!confirmar) return;

    setProcesando(true);
    setMensaje("");

    let procesados = 0;
    let errores = 0;

    for (const pago of validos) {
      try {
        const referencia = pago.no_serial || `IMPORT_BANCO_${pago.id}_${Date.now()}`;
        log(`Procesando ${pago.apartamento_raw} - RD$ ${dinero(pago.monto)} - Ref. ${referencia}`);

        const { data: resultado, error: errorRpc } = await supabase.rpc("registrar_pago_mantenimiento_completo", {
          p_condominio_id: Number(condominioId),
          p_unidad_id: Number(pago.unidad_id),
          p_fecha_pago: pago.fecha_pago,
          p_monto: Number(pago.monto || 0),
          p_metodo_pago: "TRANSFERENCIA",
          p_referencia: referencia,
          p_cuenta_bancaria_id: cuentaOrdinaria.id,
          p_comprobante_url: null,
          p_tipo_fondo: "ORDINARIO",
        });

        if (errorRpc) throw new Error(errorRpc.message);

        const pagoId = Number((resultado as any)?.pago_id || 0);
        if (!pagoId) throw new Error("La función registró el proceso sin devolver pago_id.");

        const descripcionAsiento = `Pago importado banco identificado ${periodoNombre(periodoArchivo)} - Unidad ${pago.apartamento_raw}`;
        const asiento = await generarAsientoPagoMantenimiento({
          condominio_id: Number(condominioId),
          pago_id: pagoId,
          fecha: pago.fecha_pago,
          monto: Number(pago.monto || 0),
          referencia,
          descripcion: descripcionAsiento,
          usuario: null,
        });

        if (!asiento.ok) {
          log(`AVISO: Pago ${pagoId} registrado, pero el asiento no se pudo crear: ${asiento.error}`);
        }

        const { error: errorUpdate } = await supabase
          .from("pagos_importados_banco_identificados")
          .update({
            estado_validacion: "PROCESADO",
            observacion_validacion: `Procesado correctamente. Pago ID: ${pagoId}`,
            procesado: true,
            procesado_at: new Date().toISOString(),
            pago_mantenimiento_id: pagoId,
          })
          .eq("id", pago.id);

        if (errorUpdate) throw new Error("Pago creado, pero no se pudo actualizar la importación: " + errorUpdate.message);

        procesados += 1;
      } catch (error: any) {
        errores += 1;
        await supabase
          .from("pagos_importados_banco_identificados")
          .update({
            estado_validacion: "ERROR_PROCESO",
            observacion_validacion: error.message || "Error procesando pago.",
          })
          .eq("id", pago.id);

        log(`ERROR procesando ${pago.apartamento_raw}: ${error.message || "Error"}`);
      }
    }

    const { data: actualizados } = await supabase
      .from("pagos_importados_banco_identificados")
      .select("*")
      .eq("lote_id", loteActual.id)
      .order("fecha_pago", { ascending: true })
      .order("id", { ascending: true });

    setPagosGuardados((actualizados || []) as PagoImportado[]);

    const pendientesValidos = (actualizados || []).filter(
      (p: any) => p.estado_validacion === "VALIDADO" && !p.procesado,
    ).length;

    if (pendientesValidos === 0) {
      await supabase
        .from("pagos_importados_banco_lotes")
        .update({
          estado: errores > 0 ? "PROCESADO_CON_ERRORES" : "PROCESADO",
          procesado: true,
          procesado_at: new Date().toISOString(),
        })
        .eq("id", loteActual.id);
    }

    setMensaje(`Proceso terminado. Procesados: ${procesados}. Errores: ${errores}.`);
    setProcesando(false);
  }

  function limpiar() {
    setArchivo(null);
    setArchivoHash("");
    setFilas([]);
    setLoteActual(null);
    setPagosGuardados([]);
    setMensaje("");
    setBitacora([]);
    const input = document.getElementById("archivo-banco-identificado") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  const filasPantalla = pagosGuardados.length > 0 ? pagosGuardados : filas;

  return (
    <PageContainer>
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
              <Banknote className="h-4 w-4" />
              Pagos mantenimiento
            </div>
            <h1 className="mt-2 text-2xl font-black text-slate-900">
              Importar banco identificado
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sube el archivo mensual ya identificado por apartamento. Primero se valida y luego se procesa usando la función central de pagos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => cargarDatosIniciales(condominioId)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <InfoBox label="Registros" value={String(pagosGuardados.length > 0 ? resumenGuardado.registros : resumen.registros)} />
        <InfoBox label="Válidos" value={String(pagosGuardados.length > 0 ? resumenGuardado.validos : resumen.validos)} tone="emerald" />
        <InfoBox label="Errores" value={String(pagosGuardados.length > 0 ? resumenGuardado.errores : resumen.errores)} tone="red" />
        <InfoBox label="Total archivo" value={`RD$ ${dinero(pagosGuardados.length > 0 ? resumenGuardado.total : resumen.total)}`} tone="blue" />
      </div>

      <SectionCard
        title="Archivo mensual del banco"
        subtitle={`Condominio activo: ${condominioNombre || "No identificado"}. El archivo debe traer fecha, monto, no_serial, descripcion y apartamento.`}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Mes del archivo</label>
            <input
              type="month"
              value={periodoArchivo}
              disabled={guardando || procesando || pagosGuardados.length > 0}
              onChange={(e) => setPeriodoArchivo(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />
            <p className="mt-1 text-xs text-slate-500">{periodoNombre(periodoArchivo)}</p>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700">Archivo Excel</label>
            <input
              id="archivo-banco-identificado"
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={guardando || procesando || pagosGuardados.length > 0}
              onChange={(e) => seleccionarArchivo(e.target.files?.[0] || null)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            />
            {archivoHash && <p className="mt-1 text-xs text-slate-500">Hash: {archivoHash.slice(0, 24)}...</p>}
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={leerYValidarExcel}
              disabled={!archivo || loading || guardando || procesando || pagosGuardados.length > 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Leer y validar
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-bold text-slate-800">Regla de procesamiento:</p>
          <p className="mt-1">
            Esta pantalla no decide el mes que paga el propietario. Al procesar, cada pago llama a registrar_pago_mantenimiento_completo() para aplicar el dinero a los cargos pendientes más antiguos.
          </p>
        </div>
      </SectionCard>

      {filas.length > 0 && pagosGuardados.length === 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-black text-slate-900">Importación validada pendiente de guardar</h3>
            <p className="text-sm text-slate-500">Revise los registros. Luego guarde la importación para dejarla en la tabla temporal.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={limpiar}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={guardarImportacion}
              disabled={guardando}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Guardar importación
            </button>
          </div>
        </div>
      )}

      {pagosGuardados.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-black text-slate-900">Importación guardada #{loteActual?.id}</h3>
            <p className="text-sm text-slate-500">
              {loteActual?.periodo_archivo_nombre} · {loteActual?.nombre_archivo} · Procesados: {resumenGuardado.procesados}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={limpiar}
              disabled={procesando}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Nueva importación
            </button>
            <button
              type="button"
              onClick={procesarPagosValidos}
              disabled={procesando || resumenGuardado.validos === 0 || !cuentaOrdinaria}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Procesar pagos válidos
            </button>
          </div>
        </div>
      )}

      <SectionCard title="Detalle de importación" subtitle="Resultado de la validación del archivo identificado.">
        {filasPantalla.length === 0 ? (
          <EmptyState
            title="No hay archivo cargado"
            description="Seleccione el mes y suba el Excel identificado del banco para iniciar la validación."
          />
        ) : (
          <div className="overflow-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-3 text-left">Fecha</th>
                  <th className="px-3 py-3 text-left">Apartamento</th>
                  <th className="px-3 py-3 text-left">Propietario</th>
                  <th className="px-3 py-3 text-left">No. serial</th>
                  <th className="px-3 py-3 text-left">Descripción</th>
                  <th className="px-3 py-3 text-right">Monto</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                  <th className="px-3 py-3 text-left">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filasPantalla.map((fila, index) => {
                  const ok = ["VALIDADO", "PROCESADO"].includes(fila.estado_validacion);
                  const procesado = Boolean((fila as PagoImportado).procesado);
                  return (
                    <tr key={`${fila.apartamento_raw}-${fila.no_serial}-${index}`} className="bg-white hover:bg-slate-50">
                      <td className="px-3 py-3">{fila.fecha_pago}</td>
                      <td className="px-3 py-3 font-black text-slate-800">{fila.apartamento_raw}</td>
                      <td className="px-3 py-3">{fila.propietario || "-"}</td>
                      <td className="px-3 py-3">{fila.no_serial || "-"}</td>
                      <td className="max-w-[280px] px-3 py-3 text-slate-600">{fila.descripcion || "-"}</td>
                      <td className="px-3 py-3 text-right font-black">RD$ {dinero(fila.monto)}</td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${
                            procesado
                              ? "bg-blue-50 text-blue-700"
                              : ok
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {procesado ? <CheckCircle2 className="h-3 w-3" /> : ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {fila.estado_validacion}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">{fila.observacion_validacion}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {bitacora.length > 0 && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800">
            <AlertTriangle className="h-4 w-4" />
            Bitácora del proceso
          </div>
          <div className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            {bitacora.map((linea, index) => (
              <div key={`${linea}-${index}`} className={linea.includes("ERROR") ? "font-bold text-red-700" : ""}>
                {linea}
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "red" | "blue";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "border-red-100 bg-red-50 text-red-700"
        : tone === "blue"
          ? "border-blue-100 bg-blue-50 text-blue-700"
          : "border-slate-100 bg-white text-slate-800";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}
