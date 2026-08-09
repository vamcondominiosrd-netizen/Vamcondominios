"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";

import { supabase } from "@/app/lib/supabaseClient";
import { generarAsientoPagoMantenimiento } from "@/app/lib/contabilidad/generarAsientoPagoMantenimiento";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type ModalidadArchivo = "SIN_IDENTIFICAR" | "IDENTIFICADO";

type EstadoFila =
  | "VALIDADO"
  | "REVISAR"
  | "SIN_CAMBIOS"
  | "ACTUALIZAR"
  | "PROTEGIDO_PROCESADO"
  | "DUPLICADO_ARCHIVO"
  | "DUPLICADO_PAGO"
  | "DUPLICADO_INTERNO"
  | "ERROR_FECHA"
  | "ERROR_MONTO"
  | "ERROR_UNIDAD"
  | "ERROR_PROPIETARIO"
  | "GUARDADO"
  | "PROCESADO"
  | "ERROR_PROCESO";

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

type AliasBanco = {
  id: number;
  unidad_id: number | null;
  no_apartamento: string | null;
  propietario: string | null;
  descripcion_banco: string | null;
};

type ArchivoBancoExistente = {
  id: number;
  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string | null;
  descripcion: string | null;
  estado: string | null;
  unidad_id: number | null;
  apartamento: string | null;
  propietario: string | null;
};

type FilaBanco = {
  fila_origen: number;
  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string;
  descripcion: string;
  apartamento_original: string;
  unidad_id: number | null;
  propietario_id: number | null;
  apartamento: string;
  propietario: string;
  metodo_identificacion:
    | "ARCHIVO"
    | "CODIGO_DESCRIPCION"
    | "ALIAS"
    | "MANUAL"
    | "NO_IDENTIFICADO";
  confianza_identificacion: number;
  estado: EstadoFila;
  observacion: string;
  archivo_banco_id: number | null;
  unidad_id_guardada: number | null;
  apartamento_guardado: string;
  propietario_guardado: string;
  requiere_actualizacion: boolean;
  existente_procesado: boolean;
  pago_id: number | null;
  movimiento_banco_id: number | null;
  procesado: boolean;
};

const CABECERAS_APARTAMENTO = [
  "apartamento",
  "apto",
  "unidad",
  "codigo",
  "código",
  "no apartamento",
  "no_apartamento",
];

const PALABRAS_IGNORADAS = [
  "pago",
  "pgo",
  "pag",
  "pagos",
  "transferencia",
  "transf",
  "deposito",
  "depositos",
  "mantenimiento",
  "mant",
  "mto",
  "condominio",
  "residencial",
  "colinas",
  "oeste",
  "lote",
  "rd",
  "dop",
  "del",
  "de",
  "la",
  "el",
  "los",
  "las",
  "por",
  "para",
  "desde",
  "cta",
  "cuenta",
  "banco",
  "popular",
  "bpd",
  "ach",
  "lbtr",
  "internet",
  "movil",
  "mobile",
  "canal",
  "servicio",
  "servicios",
  "concepto",
  "referencia",
  "debito",
  "credito",
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function dinero(valor: number | null | undefined) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarCodigo(valor: unknown) {
  return normalizarTexto(valor).replace(/\s+/g, "").toUpperCase();
}

function limpiarTexto(valor: unknown) {
  return String(valor || "")
    .replace(/\s+/g, " ")
    .trim();
}

function escaparRegex(texto: string) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function obtenerPeriodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function obtenerValor(row: Record<string, unknown>, opciones: string[]) {
  const entradas = Object.entries(row);

  for (const opcion of opciones) {
    const buscada = normalizarTexto(opcion);
    const encontrada = entradas.find(([cabecera]) => normalizarTexto(cabecera) === buscada);
    if (encontrada) return encontrada[1];
  }

  return "";
}

function parsearFecha(valor: unknown) {
  if (!valor) return "";

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }

  if (typeof valor === "number") {
    const parsed = XLSX.SSF.parse_date_code(valor);
    if (!parsed) return "";

    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
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

  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return "";

  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(
    fecha.getDate(),
  ).padStart(2, "0")}`;
}

function parsearMonto(valor: unknown) {
  if (typeof valor === "number") {
    return Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;
  }

  const texto = String(valor || "")
    .replace(/RD\$/gi, "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .trim();

  const numero = Number(texto || 0);
  return Number.isNaN(numero) ? 0 : Math.round((numero + Number.EPSILON) * 100) / 100;
}

function tieneCabeceraApartamento(row: Record<string, unknown>) {
  const cabeceras = Object.keys(row).map(normalizarTexto);
  return CABECERAS_APARTAMENTO.some((cabecera) => cabeceras.includes(normalizarTexto(cabecera)));
}

function claveTransaccion(row: {
  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string | null | undefined;
  descripcion: string | null | undefined;
}) {
  return [
    row.fecha_posteo || "",
    Number(row.monto_transaccion || 0).toFixed(2),
    normalizarTexto(row.no_serial || ""),
    normalizarTexto(row.descripcion || ""),
  ].join("|");
}

function obtenerApartamentoCorto(codigo: string) {
  const limpio = normalizarCodigo(codigo);
  const partes = limpio.split("-").filter(Boolean);
  return partes.length > 1 ? partes[partes.length - 1] : limpio;
}

function buscarUnidadPorCodigo(valor: string, unidades: Unidad[]) {
  const codigoBuscado = normalizarCodigo(valor);
  if (!codigoBuscado) return null;

  const exacta = unidades.find((unidad) => normalizarCodigo(unidad.codigo) === codigoBuscado);
  if (exacta) return exacta;

  const corta = obtenerApartamentoCorto(codigoBuscado);
  const candidatas = unidades.filter(
    (unidad) => obtenerApartamentoCorto(String(unidad.codigo || "")) === corta,
  );

  return candidatas.length === 1 ? candidatas[0] : null;
}

function buscarUnidadEnDescripcion(descripcionOriginal: string, unidades: Unidad[]) {
  const descripcion = normalizarTexto(descripcionOriginal);
  if (!descripcion) return null;

  const ordenadas = [...unidades].sort(
    (a, b) => normalizarTexto(b.codigo || "").length - normalizarTexto(a.codigo || "").length,
  );

  return (
    ordenadas.find((unidad) => {
      const codigo = normalizarTexto(unidad.codigo || "");
      if (!codigo) return false;

      const patron = new RegExp(`(^|\\s)${escaparRegex(codigo)}(\\s|$)`, "i");
      return patron.test(descripcion);
    }) || null
  );
}

function obtenerPalabrasClave(texto: string) {
  return normalizarTexto(texto)
    .split(" ")
    .map((palabra) => palabra.trim())
    .filter((palabra) => palabra.length >= 2)
    .filter((palabra) => !PALABRAS_IGNORADAS.includes(palabra))
    .filter((palabra) => !/^\d{4}$/.test(palabra));
}

function calcularCoincidenciaAlias(descripcionOriginal: string, alias: AliasBanco) {
  const descripcion = normalizarTexto(descripcionOriginal);
  const descripcionAlias = normalizarTexto(alias.descripcion_banco || "");
  const propietario = normalizarTexto(alias.propietario || "");
  const apartamento = normalizarTexto(alias.no_apartamento || "");

  if (!descripcion || !descripcionAlias) return 0;
  if (descripcion.includes(descripcionAlias)) return 100;
  if (descripcion.length >= 8 && descripcionAlias.includes(descripcion)) return 95;

  let puntos = 0;
  const palabrasAlias = obtenerPalabrasClave(descripcionAlias);
  const palabrasPropietario = obtenerPalabrasClave(propietario);

  if (palabrasAlias.length > 0) {
    const encontradas = palabrasAlias.filter((palabra) => descripcion.includes(palabra));
    const porcentaje = encontradas.length / palabrasAlias.length;
    puntos += Math.round(porcentaje * 75);
    if (porcentaje === 1) puntos += 10;
  }

  if (palabrasPropietario.length > 0) {
    const encontradas = palabrasPropietario.filter((palabra) => descripcion.includes(palabra));
    const porcentaje = encontradas.length / palabrasPropietario.length;
    puntos += Math.round(porcentaje * 20);
    if (porcentaje === 1) puntos += 10;
  }

  if (apartamento) {
    const patron = new RegExp(`(^|\\s)${escaparRegex(apartamento)}(\\s|$)`, "i");
    if (patron.test(descripcion)) puntos += 20;
  }

  return Math.min(puntos, 100);
}

function buscarMejorAlias(descripcion: string, aliasRows: AliasBanco[]) {
  return (
    aliasRows
      .map((alias) => ({ alias, puntos: calcularCoincidenciaAlias(descripcion, alias) }))
      .filter((resultado) => resultado.puntos >= 60)
      .sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        return normalizarTexto(b.alias.descripcion_banco || "").length -
          normalizarTexto(a.alias.descripcion_banco || "").length;
      })[0] || null
  );
}

async function calcularHashArchivo(file: File) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = Array.from(new Uint8Array(hashBuffer));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function registroEstaProcesado(estado: string | null | undefined) {
  const valor = normalizarTexto(estado || "");
  return ["procesado", "pagado", "aplicado"].some((palabra) => valor.includes(palabra));
}

function identificacionEsDiferente({
  unidadIdActual,
  apartamentoActual,
  propietarioActual,
  unidadIdGuardada,
  apartamentoGuardado,
  propietarioGuardado,
}: {
  unidadIdActual: number | null;
  apartamentoActual: string;
  propietarioActual: string;
  unidadIdGuardada: number | null;
  apartamentoGuardado: string;
  propietarioGuardado: string;
}) {
  return (
    Number(unidadIdActual || 0) !== Number(unidadIdGuardada || 0) ||
    normalizarCodigo(apartamentoActual) !== normalizarCodigo(apartamentoGuardado) ||
    normalizarTexto(propietarioActual) !== normalizarTexto(propietarioGuardado)
  );
}

function marcaTiempoArchivo() {
  const ahora = new Date();
  const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(
    ahora.getDate(),
  ).padStart(2, "0")}`;
  const hora = `${String(ahora.getHours()).padStart(2, "0")}${String(ahora.getMinutes()).padStart(
    2,
    "0",
  )}${String(ahora.getSeconds()).padStart(2, "0")}${String(ahora.getMilliseconds()).padStart(
    3,
    "0",
  )}`;
  return `${fecha}-${hora}`;
}

function estadoEsError(estado: EstadoFila) {
  return [
    "DUPLICADO_ARCHIVO",
    "DUPLICADO_PAGO",
    "DUPLICADO_INTERNO",
    "ERROR_FECHA",
    "ERROR_MONTO",
    "ERROR_UNIDAD",
    "ERROR_PROPIETARIO",
    "ERROR_PROCESO",
  ].includes(estado);
}

export default function IngresosBancariosUnificadoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [periodoArchivo, setPeriodoArchivo] = useState(obtenerPeriodoActual());
  const [cuentaBancariaId, setCuentaBancariaId] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoHash, setArchivoHash] = useState("");
  const [modalidad, setModalidad] = useState<ModalidadArchivo | null>(null);

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [aliasBanco, setAliasBanco] = useState<AliasBanco[]>([]);
  const [filas, setFilas] = useState<FilaBanco[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [mensaje, setMensaje] = useState("");
  const [bitacora, setBitacora] = useState<string[]>([]);

  function log(texto: string) {
    const linea = `${new Date().toLocaleTimeString()} - ${texto}`;
    console.log("[Ingresos bancarios]", linea);
    setBitacora((actual) => [...actual, linea]);
  }

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") || localStorage.getItem("condominio") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarDatosIniciales(id);
  }, []);

  async function cargarDatosIniciales(id: string) {
    setLoading(true);

    const [unidadesResultado, cuentasResultado, aliasResultado] = await Promise.all([
      supabase
        .from("unidades")
        .select("id, codigo, propietario_id, propietario_nombre")
        .eq("condominio_id", Number(id))
        .eq("activa", true)
        .order("codigo", { ascending: true }),
      supabase
        .from("cuentas_bancarias")
        .select("id, nombre_banco, numero_cuenta, fondo_tipo")
        .eq("condominio_id", Number(id))
        .eq("activa", true)
        .order("nombre_banco", { ascending: true }),
      supabase
        .from("apartamento_banco_alias")
        .select("id, unidad_id, no_apartamento, propietario, descripcion_banco")
        .eq("condominio_id", Number(id))
        .eq("estado", "Activo")
        .order("no_apartamento", { ascending: true }),
    ]);

    setLoading(false);

    if (unidadesResultado.error) {
      alert("Error cargando unidades: " + unidadesResultado.error.message);
      return;
    }

    if (cuentasResultado.error) {
      alert("Error cargando cuentas bancarias: " + cuentasResultado.error.message);
      return;
    }

    if (aliasResultado.error) {
      alert("Error cargando alias bancarios: " + aliasResultado.error.message);
      return;
    }

    const cuentasData = (cuentasResultado.data || []) as CuentaBancaria[];

    setUnidades((unidadesResultado.data || []) as Unidad[]);
    setCuentas(cuentasData);
    setAliasBanco((aliasResultado.data || []) as AliasBanco[]);

    if (!cuentaBancariaId && cuentasData.length > 0) {
      const ordinaria = cuentasData.find(
        (cuenta) => String(cuenta.fondo_tipo || "").toUpperCase() === "ORDINARIO",
      );
      setCuentaBancariaId(String(ordinaria?.id || cuentasData[0].id));
    }
  }

  async function seleccionarArchivo(file: File | null) {
    setArchivo(file);
    setArchivoHash("");
    setModalidad(null);
    setFilas([]);
    setMensaje("");
    setBitacora([]);

    if (!file) return;

    const hash = await calcularHashArchivo(file);
    setArchivoHash(hash);
    log(`Archivo seleccionado: ${file.name}. Hash: ${hash.slice(0, 16)}...`);
  }

  async function leerYAnalizarArchivo() {
    if (!archivo) {
      alert("Debe seleccionar un archivo Excel o CSV.");
      return;
    }

    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!cuentaBancariaId) {
      alert("Debe seleccionar la cuenta bancaria que recibió los ingresos.");
      return;
    }

    setLoading(true);
    setMensaje("");
    setBitacora([]);

    try {
      log("Paso 1: leyendo el archivo...");

      const buffer = await archivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const primeraHoja = workbook.SheetNames[0];
      const hoja = workbook.Sheets[primeraHoja];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
        defval: "",
        raw: true,
      });

      if (rows.length === 0) {
        throw new Error("El archivo no contiene registros.");
      }

      const modalidadDetectada: ModalidadArchivo = tieneCabeceraApartamento(rows[0])
        ? "IDENTIFICADO"
        : "SIN_IDENTIFICAR";

      setModalidad(modalidadDetectada);
      log(
        modalidadDetectada === "IDENTIFICADO"
          ? "Paso 2: modalidad detectada: archivo identificado por apartamento."
          : "Paso 2: modalidad detectada: archivo pendiente de identificación.",
      );

      const seriales = rows
        .map((row) =>
          limpiarTexto(
            obtenerValor(row, [
              "No Serial",
              "No. Serial",
              "no_serial",
              "Serial",
              "Referencia",
              "Referencia Banco",
              "Documento",
              "No Documento",
            ]),
          ),
        )
        .filter(Boolean);

      const [archivoExistenteResultado, pagosExistentesResultado, hashExistenteResultado] =
        await Promise.all([
          supabase
            .from("archivo_banco")
            .select("id, fecha_posteo, monto_transaccion, no_serial, descripcion, estado, unidad_id, apartamento, propietario")
            .eq("condominio_id", Number(condominioId)),
          seriales.length > 0
            ? supabase
                .from("pagos")
                .select("id, referencia")
                .eq("condominio_id", Number(condominioId))
                .in("referencia", Array.from(new Set(seriales)))
            : Promise.resolve({ data: [], error: null }),
          archivoHash
            ? supabase
                .from("archivo_banco")
                .select("id")
                .eq("condominio_id", Number(condominioId))
                .ilike("observacion", `%HASH:${archivoHash}%`)
                .limit(1)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (archivoExistenteResultado.error) {
        throw new Error(
          "Error verificando transacciones importadas: " + archivoExistenteResultado.error.message,
        );
      }

      if (pagosExistentesResultado.error) {
        throw new Error(
          "Error verificando pagos existentes: " + pagosExistentesResultado.error.message,
        );
      }

      if (hashExistenteResultado.error) {
        throw new Error(
          "Error verificando el archivo por hash: " + hashExistenteResultado.error.message,
        );
      }

      const archivoYaImportado = (hashExistenteResultado.data || []).length > 0;
      if (archivoYaImportado) {
        log(
          "El archivo ya había sido cargado. Se validarán todos los registros para detectar cambios sin duplicar transacciones.",
        );
      }

      const existentesPorClave = new Map<string, ArchivoBancoExistente>();
      const existentesAgrupadosPorSerial = new Map<string, ArchivoBancoExistente[]>();

      ((archivoExistenteResultado.data || []) as ArchivoBancoExistente[]).forEach((item) => {
        existentesPorClave.set(claveTransaccion(item), item);

        const serialNormalizado = normalizarTexto(item.no_serial || "");
        if (serialNormalizado) {
          const grupo = existentesAgrupadosPorSerial.get(serialNormalizado) || [];
          grupo.push(item);
          existentesAgrupadosPorSerial.set(serialNormalizado, grupo);
        }
      });

      // Solo usamos el serial como llave alternativa cuando identifica un único movimiento.
      const existentesPorSerial = new Map<string, ArchivoBancoExistente>();
      existentesAgrupadosPorSerial.forEach((grupo, serial) => {
        if (grupo.length === 1) existentesPorSerial.set(serial, grupo[0]);
      });

      const referenciasPago = new Set(
        ((pagosExistentesResultado.data || []) as Array<{ referencia: string | null }>).map(
          (pago) => normalizarTexto(pago.referencia || ""),
        ),
      );

      const clavesInternas = new Set<string>();

      const resultado: FilaBanco[] = rows.map((row, index) => {
        const fecha = parsearFecha(
          obtenerValor(row, [
            "Fecha Posteo",
            "Fecha",
            "fecha_pago",
            "Fecha Pago",
            "Fecha Transaccion",
            "Fecha Transacción",
            "Fecha Movimiento",
            "Fecha Banco",
          ]),
        );

        const monto = parsearMonto(
          obtenerValor(row, [
            "Monto Transacción",
            "Monto Transaccion",
            "monto_transaccion",
            "Monto",
            "Monto Pagado",
            "Valor",
            "Importe",
            "Crédito",
            "Credito",
            "Depósito",
            "Deposito",
          ]),
        );

        const noSerial = limpiarTexto(
          obtenerValor(row, [
            "No Serial",
            "No. Serial",
            "no_serial",
            "Serial",
            "Referencia",
            "Referencia Banco",
            "Documento",
            "No Documento",
          ]),
        );

        const descripcion =
          limpiarTexto(
            obtenerValor(row, [
              "Descripción",
              "Descripcion",
              "descripcion",
              "Descripcion Banco",
              "Descripción Banco",
              "Detalle",
              "Concepto",
              "Comentario",
            ]),
          ) || "Movimiento bancario importado";

        const apartamentoOriginal = limpiarTexto(
          obtenerValor(row, CABECERAS_APARTAMENTO),
        ).toUpperCase();

        let unidad: Unidad | null = null;
        let metodo: FilaBanco["metodo_identificacion"] = "NO_IDENTIFICADO";
        let confianza = 0;

        if (apartamentoOriginal) {
          unidad = buscarUnidadPorCodigo(apartamentoOriginal, unidades);
          if (unidad) {
            metodo = "ARCHIVO";
            confianza = 100;
          }
        }

        if (!unidad && descripcion) {
          unidad = buscarUnidadEnDescripcion(descripcion, unidades);
          if (unidad) {
            metodo = "CODIGO_DESCRIPCION";
            confianza = 100;
          }
        }

        if (!unidad && descripcion) {
          const mejorAlias = buscarMejorAlias(descripcion, aliasBanco);
          if (mejorAlias?.alias.unidad_id) {
            unidad = unidades.find((item) => item.id === mejorAlias.alias.unidad_id) || null;
            if (unidad) {
              metodo = "ALIAS";
              confianza = mejorAlias.puntos;
            }
          }
        }

        const clave = claveTransaccion({
          fecha_posteo: fecha,
          monto_transaccion: monto,
          no_serial: noSerial,
          descripcion,
        });

        const existente =
          existentesPorClave.get(clave) ||
          (noSerial ? existentesPorSerial.get(normalizarTexto(noSerial)) : undefined);
        const unidadIdGuardada = existente?.unidad_id ? Number(existente.unidad_id) : null;
        const apartamentoGuardado = limpiarTexto(existente?.apartamento || "");
        const propietarioGuardado = limpiarTexto(existente?.propietario || "");
        const unidadGuardada = unidadIdGuardada
          ? unidades.find((item) => item.id === unidadIdGuardada) || null
          : null;

        // Si el archivo ya estaba cargado y esta nueva lectura no identifica la unidad,
        // conservamos la identificación guardada para no perder información válida.
        if (!unidad && unidadGuardada) {
          unidad = unidadGuardada;
          metodo = "MANUAL";
          confianza = 100;
        }

        const pagoYaExiste = Boolean(
          noSerial && referenciasPago.has(normalizarTexto(noSerial)),
        );
        const existenteProcesado = Boolean(
          existente && (registroEstaProcesado(existente.estado) || pagoYaExiste),
        );

        let estado: EstadoFila = unidad ? "VALIDADO" : "REVISAR";
        let observacion = unidad
          ? `Unidad identificada mediante ${metodo.toLowerCase().replaceAll("_", " ")}.`
          : "Seleccione manualmente la unidad correspondiente.";
        let requiereActualizacion = false;

        if (!fecha) {
          estado = "ERROR_FECHA";
          observacion = "La fecha bancaria está vacía o no es válida.";
        } else if (!monto || monto <= 0) {
          estado = "ERROR_MONTO";
          observacion = "El monto debe ser mayor que cero.";
        } else if (apartamentoOriginal && !unidad && modalidadDetectada === "IDENTIFICADO") {
          estado = "ERROR_UNIDAD";
          observacion = `La unidad ${apartamentoOriginal} no existe en el condominio.`;
        } else if (unidad && !unidad.propietario_id) {
          estado = "ERROR_PROPIETARIO";
          observacion = `La unidad ${unidad.codigo || apartamentoOriginal} no tiene propietario asignado.`;
        }

        if (!estadoEsError(estado) && clavesInternas.has(clave)) {
          estado = "DUPLICADO_INTERNO";
          observacion = "Registro duplicado dentro del mismo archivo.";
        } else if (existenteProcesado) {
          estado = "PROTEGIDO_PROCESADO";
          observacion =
            `La transacción ya fue procesada y está protegida. Archivo banco ID ${existente?.id}. ` +
            "Si necesita cambiar el propietario, debe hacerse mediante una corrección controlada del pago.";
        } else if (existente && !estadoEsError(estado)) {
          requiereActualizacion = identificacionEsDiferente({
            unidadIdActual: unidad?.id || null,
            apartamentoActual: unidad?.codigo || apartamentoOriginal,
            propietarioActual: unidad?.propietario_nombre || "",
            unidadIdGuardada,
            apartamentoGuardado,
            propietarioGuardado,
          });

          if (requiereActualizacion && unidad?.propietario_id) {
            estado = "ACTUALIZAR";
            observacion =
              `Cambio detectado en archivo_banco ID ${existente.id}: ` +
              `${apartamentoGuardado || "Sin identificar"} → ${unidad.codigo || apartamentoOriginal}.`;
          } else if (unidad?.propietario_id) {
            estado = "SIN_CAMBIOS";
            observacion = `La transacción ya existe y su identificación no cambió. Archivo banco ID ${existente.id}.`;
          } else {
            estado = "REVISAR";
            observacion = `La transacción ya existe en archivo_banco ID ${existente.id}, pero continúa pendiente de identificación.`;
          }
        } else if (!existente && pagoYaExiste) {
          estado = "DUPLICADO_PAGO";
          observacion = "Ya existe un pago registrado con este número serial o referencia.";
        }

        clavesInternas.add(clave);

        return {
          fila_origen: index + 2,
          fecha_posteo: fecha,
          monto_transaccion: monto,
          no_serial: noSerial,
          descripcion,
          apartamento_original: apartamentoOriginal,
          unidad_id: unidad?.id || null,
          propietario_id: unidad?.propietario_id || null,
          apartamento: unidad?.codigo || apartamentoOriginal,
          propietario: unidad?.propietario_nombre || "",
          metodo_identificacion: metodo,
          confianza_identificacion: confianza,
          estado,
          observacion,
          archivo_banco_id: existente?.id || null,
          unidad_id_guardada: unidadIdGuardada,
          apartamento_guardado: apartamentoGuardado,
          propietario_guardado: propietarioGuardado,
          requiere_actualizacion: requiereActualizacion,
          existente_procesado: existenteProcesado,
          pago_id: null,
          movimiento_banco_id: null,
          procesado: existenteProcesado,
        };
      });

      setFilas(resultado);
      const cambiosDetectados = resultado.filter((fila) => fila.estado === "ACTUALIZAR").length;
      const existentesSinCambios = resultado.filter((fila) => fila.estado === "SIN_CAMBIOS").length;
      const protegidos = resultado.filter((fila) => fila.estado === "PROTEGIDO_PROCESADO").length;

      setMensaje(
        archivoYaImportado
          ? `Archivo revisado nuevamente. Cambios para actualizar: ${cambiosDetectados}. ` +
              `Sin cambios: ${existentesSinCambios}. Procesados protegidos: ${protegidos}.`
          : modalidadDetectada === "IDENTIFICADO"
            ? "Archivo identificado analizado. Revise las unidades antes de guardar."
            : "Archivo sin identificar analizado. El sistema sugirió unidades cuando encontró coincidencias.",
      );
      log(`Paso 3 OK: ${resultado.length} registro(s) analizados.`);
    } catch (error: any) {
      alert(error.message || "Error analizando el archivo.");
      log("ERROR: " + (error.message || "Error analizando el archivo."));
    }

    setLoading(false);
  }

  function cambiarUnidad(index: number, unidadId: string) {
    setFilas((actuales) =>
      actuales.map((fila, filaIndex) => {
        if (filaIndex !== index || fila.existente_procesado || fila.procesado) return fila;

        if (!unidadId) {
          return {
            ...fila,
            unidad_id: null,
            propietario_id: null,
            apartamento: "",
            propietario: "",
            metodo_identificacion: "NO_IDENTIFICADO",
            confianza_identificacion: 0,
            estado: "REVISAR",
            requiere_actualizacion: false,
            observacion: fila.archivo_banco_id
              ? "La transacción ya está guardada. Seleccione una unidad válida para actualizarla."
              : "Seleccione manualmente la unidad correspondiente.",
          };
        }

        const unidad = unidades.find((item) => item.id === Number(unidadId));
        if (!unidad) return fila;

        if (!unidad.propietario_id) {
          return {
            ...fila,
            unidad_id: unidad.id,
            propietario_id: null,
            apartamento: unidad.codigo || "",
            propietario: unidad.propietario_nombre || "",
            metodo_identificacion: "MANUAL",
            confianza_identificacion: 100,
            estado: "ERROR_PROPIETARIO",
            requiere_actualizacion: false,
            observacion: `La unidad ${unidad.codigo || "seleccionada"} no tiene propietario asignado.`,
          };
        }

        const requiereActualizacion = fila.archivo_banco_id
          ? identificacionEsDiferente({
              unidadIdActual: unidad.id,
              apartamentoActual: unidad.codigo || "",
              propietarioActual: unidad.propietario_nombre || "",
              unidadIdGuardada: fila.unidad_id_guardada,
              apartamentoGuardado: fila.apartamento_guardado,
              propietarioGuardado: fila.propietario_guardado,
            })
          : false;

        return {
          ...fila,
          unidad_id: unidad.id,
          propietario_id: unidad.propietario_id,
          apartamento: unidad.codigo || "",
          propietario: unidad.propietario_nombre || "",
          metodo_identificacion: "MANUAL",
          confianza_identificacion: 100,
          estado: fila.archivo_banco_id
            ? requiereActualizacion
              ? "ACTUALIZAR"
              : "SIN_CAMBIOS"
            : "VALIDADO",
          requiere_actualizacion: requiereActualizacion,
          observacion: fila.archivo_banco_id
            ? requiereActualizacion
              ? `Cambio pendiente: ${fila.apartamento_guardado || "Sin identificar"} → ${
                  unidad.codigo || "Unidad seleccionada"
                }.`
              : "La unidad seleccionada coincide con la identificación guardada."
            : "Unidad confirmada manualmente.",
        };
      }),
    );
  }

  async function guardarArchivoBanco() {
    if (!archivo || !condominioId || !cuentaBancariaId || !modalidad) {
      alert("Debe seleccionar y analizar un archivo antes de guardar.");
      return;
    }

    const pendientesInsertar = filas.filter(
      (fila) =>
        !fila.archivo_banco_id &&
        fila.fecha_posteo &&
        fila.monto_transaccion > 0 &&
        ![
          "DUPLICADO_ARCHIVO",
          "DUPLICADO_PAGO",
          "DUPLICADO_INTERNO",
          "ERROR_FECHA",
          "ERROR_MONTO",
        ].includes(fila.estado),
    );

    const pendientesActualizar = filas.filter(
      (fila) =>
        fila.archivo_banco_id &&
        fila.requiere_actualizacion &&
        !fila.existente_procesado &&
        fila.unidad_id &&
        fila.propietario_id &&
        fila.estado === "ACTUALIZAR",
    );

    if (pendientesInsertar.length === 0 && pendientesActualizar.length === 0) {
      alert("No hay transacciones nuevas ni cambios de identificación pendientes de guardar.");
      return;
    }

    const totalNuevas = pendientesInsertar.reduce(
      (suma, fila) => suma + Number(fila.monto_transaccion || 0),
      0,
    );

    const confirmar = confirm(
      `Transacciones nuevas: ${pendientesInsertar.length} por ${dinero(totalNuevas)}.
` +
        `Identificaciones para actualizar: ${pendientesActualizar.length}.

` +
        "Guardar y actualizar NO crea pagos ni modifica cargos. ¿Desea continuar?",
    );

    if (!confirmar) return;

    setGuardando(true);
    setMensaje("");

    try {
      const idsInsertadosPorClave = new Map<string, number>();

      if (pendientesInsertar.length > 0) {
        const registros = pendientesInsertar.map((fila) => ({
          condominio_id: Number(condominioId),
          condominio: condominioNombre,
          fecha_posteo: fila.fecha_posteo,
          monto_transaccion: fila.monto_transaccion,
          no_serial: fila.no_serial || null,
          descripcion: fila.descripcion || "Movimiento bancario importado",
          unidad_id: fila.unidad_id || null,
          apartamento: fila.apartamento || fila.apartamento_original || null,
          propietario: fila.propietario || null,
          estado: "Revisar",
          periodo: fila.fecha_posteo.slice(0, 7),
          observacion:
            `Archivo:${archivo.name}; FILA:${fila.fila_origen}; MODALIDAD:${modalidad}; ` +
            `CUENTA_ID:${cuentaBancariaId}; PERIODO_ARCHIVO:${periodoArchivo}; HASH:${archivoHash}`,
        }));

        const { data, error } = await supabase
          .from("archivo_banco")
          .insert(registros)
          .select(
            "id, fecha_posteo, monto_transaccion, no_serial, descripcion, estado, unidad_id, apartamento, propietario",
          );

        if (error) {
          throw new Error("Error guardando transacciones nuevas: " + error.message);
        }

        ((data || []) as ArchivoBancoExistente[]).forEach((item) => {
          idsInsertadosPorClave.set(claveTransaccion(item), item.id);
        });
      }

      const idsActualizados = new Set<number>();

      for (const fila of pendientesActualizar) {
        const { error } = await supabase
          .from("archivo_banco")
          .update({
            unidad_id: Number(fila.unidad_id),
            apartamento: fila.apartamento || null,
            propietario: fila.propietario || null,
            estado: "Revisar",
          })
          .eq("id", Number(fila.archivo_banco_id))
          .eq("condominio_id", Number(condominioId));

        if (error) {
          throw new Error(
            `Error actualizando archivo_banco ID ${fila.archivo_banco_id}: ${error.message}`,
          );
        }

        idsActualizados.add(Number(fila.archivo_banco_id));
      }

      setFilas((actuales) =>
        actuales.map((fila) => {
          if (fila.archivo_banco_id && idsActualizados.has(Number(fila.archivo_banco_id))) {
            return {
              ...fila,
              unidad_id_guardada: fila.unidad_id,
              apartamento_guardado: fila.apartamento,
              propietario_guardado: fila.propietario,
              requiere_actualizacion: false,
              estado: "GUARDADO",
              observacion: "Identificación actualizada correctamente y lista para registrar el pago.",
            };
          }

          if (fila.archivo_banco_id) return fila;

          const id = idsInsertadosPorClave.get(claveTransaccion(fila));
          if (!id) return fila;

          return {
            ...fila,
            archivo_banco_id: id,
            unidad_id_guardada: fila.unidad_id,
            apartamento_guardado: fila.apartamento,
            propietario_guardado: fila.propietario,
            requiere_actualizacion: false,
            estado: fila.unidad_id && fila.propietario_id ? "GUARDADO" : "REVISAR",
            observacion: fila.unidad_id
              ? "Transacción guardada y lista para registrar el pago."
              : "Transacción guardada; falta identificar la unidad.",
          };
        }),
      );

      setMensaje(
        `Archivo sincronizado. Transacciones nuevas: ${pendientesInsertar.length}. ` +
          `Identificaciones actualizadas: ${pendientesActualizar.length}. Todavía no se han creado pagos.`,
      );
      log(
        `Sincronización completada: ${pendientesInsertar.length} registro(s) nuevo(s) y ` +
          `${pendientesActualizar.length} actualizado(s).`,
      );
    } catch (error: any) {
      alert(error.message || "Error guardando o actualizando el archivo.");
      log("ERROR: " + (error.message || "Error guardando o actualizando el archivo."));
    }

    setGuardando(false);
  }

  async function procesarPagosConfirmados() {
    if (!cuentaBancariaId) {
      alert("Debe seleccionar la cuenta bancaria.");
      return;
    }

    const listos = filas.filter(
      (fila) =>
        fila.archivo_banco_id &&
        fila.unidad_id &&
        fila.propietario_id &&
        !fila.procesado &&
        ["GUARDADO", "VALIDADO", "SIN_CAMBIOS"].includes(fila.estado),
    );

    if (listos.length === 0) {
      alert("No hay transacciones guardadas e identificadas pendientes de procesar.");
      return;
    }

    const total = listos.reduce(
      (suma, fila) => suma + Number(fila.monto_transaccion || 0),
      0,
    );

    const confirmar = confirm(
      `Se crearán ${listos.length} pago(s) por ${dinero(total)}.\n\n` +
        "Esta acción SÍ afecta pagos, cargos, saldos a favor, control bancario y contabilidad. ¿Desea continuar?",
    );

    if (!confirmar) return;

    setProcesando(true);
    setMensaje("");

    let procesados = 0;
    let errores = 0;

    for (const filaLista of listos) {
      const index = filas.findIndex(
        (fila) =>
          fila.archivo_banco_id === filaLista.archivo_banco_id &&
          fila.fila_origen === filaLista.fila_origen,
      );

      try {
        log(
          `Procesando ${filaLista.apartamento} - ${dinero(filaLista.monto_transaccion)} - archivo_banco ${filaLista.archivo_banco_id}`,
        );

        const { data: resultado, error } = await supabase.rpc(
          "procesar_ingreso_archivo_unificado",
          {
            p_condominio_id: Number(condominioId),
            p_cuenta_bancaria_id: Number(cuentaBancariaId),
            p_archivo_banco_id: Number(filaLista.archivo_banco_id),
            p_unidad_id: Number(filaLista.unidad_id),
            p_metodo_pago: "TRANSFERENCIA",
            p_comprobante_url: null,
            p_tipo_fondo: String(cuentaSeleccionada?.fondo_tipo || "ORDINARIO").toUpperCase(),
          },
        );

        if (error) throw new Error(error.message);

        const pagoId = Number((resultado as any)?.pago_id || 0);
        const movimientoId = Number((resultado as any)?.movimiento_banco_id || 0);

        if (!pagoId) {
          throw new Error("La función no devolvió el ID del pago creado.");
        }

        const asiento = await generarAsientoPagoMantenimiento({
          condominio_id: Number(condominioId),
          pago_id: pagoId,
          fecha: filaLista.fecha_posteo,
          monto: Number(filaLista.monto_transaccion || 0),
          referencia: filaLista.no_serial || `ARCHIVO_BANCO_${filaLista.archivo_banco_id}`,
          descripcion: `Ingreso bancario importado - Unidad ${filaLista.apartamento}`,
          usuario: null,
        });

        const observacion = asiento.ok
          ? `Pago ${pagoId} y movimiento bancario ${movimientoId} registrados correctamente.`
          : `Pago ${pagoId} registrado. Asiento contable pendiente: ${asiento.error}`;

        setFilas((actuales) =>
          actuales.map((fila, filaIndex) =>
            filaIndex === index
              ? {
                  ...fila,
                  pago_id: pagoId,
                  movimiento_banco_id: movimientoId || null,
                  procesado: true,
                  estado: "PROCESADO",
                  observacion,
                }
              : fila,
          ),
        );

        procesados += 1;
      } catch (error: any) {
        errores += 1;

        setFilas((actuales) =>
          actuales.map((fila, filaIndex) =>
            filaIndex === index
              ? {
                  ...fila,
                  estado: "ERROR_PROCESO",
                  observacion: error.message || "Error procesando el ingreso.",
                }
              : fila,
          ),
        );

        log(
          `ERROR procesando ${filaLista.apartamento || filaLista.fila_origen}: ${
            error.message || "Error"
          }`,
        );
      }
    }

    setMensaje(`Proceso terminado. Pagos registrados: ${procesados}. Errores: ${errores}.`);
    setProcesando(false);
  }

  function limpiar() {
    setArchivo(null);
    setArchivoHash("");
    setModalidad(null);
    setFilas([]);
    setMensaje("");
    setBitacora([]);

    const input = document.getElementById("archivo-ingresos-bancarios") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  function descargarPlantilla() {
    const datos = [
      {
        fecha: "2026-06-01",
        monto: 4500,
        no_serial: "123456789",
        descripcion: "PAGO MANTENIMIENTO L9-A1",
        apartamento: "L9-A1",
      },
      {
        fecha: "2026-06-02",
        monto: 4500,
        no_serial: "123456790",
        descripcion: "TRANSFERENCIA DE JUAN PEREZ",
        apartamento: "",
      },
    ];

    const instrucciones = [
      ["Campo", "Obligatorio", "Observación"],
      ["fecha", "Sí", "Fecha real de entrada en el banco."],
      ["monto", "Sí", "Monto recibido."],
      ["no_serial", "Recomendado", "Referencia bancaria para evitar duplicados."],
      ["descripcion", "Recomendado", "Descripción original del banco."],
      [
        "apartamento",
        "Opcional",
        "Cuando viene lleno, el archivo se detecta como identificado. Cuando no existe la columna, se identifica por descripción o alias.",
      ],
    ];

    const libro = XLSX.utils.book_new();
    const hoja = XLSX.utils.json_to_sheet(datos, {
      header: ["fecha", "monto", "no_serial", "descripcion", "apartamento"],
    });
    const hojaInstrucciones = XLSX.utils.aoa_to_sheet([
      ["Plantilla unificada de ingresos bancarios"],
      [],
      ...instrucciones,
      [],
      ["Reglas"],
      ["1. Cargar y guardar el archivo no crea pagos."],
      ["2. Procesar y registrar pagos sí afecta la cuenta del propietario."],
      ["3. El período pagado se determina por los cargos pendientes más antiguos."],
    ]);

    hoja["!cols"] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 48 },
      { wch: 18 },
    ];

    hojaInstrucciones["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 82 }];

    XLSX.utils.book_append_sheet(libro, hoja, "Plantilla");
    XLSX.utils.book_append_sheet(libro, hojaInstrucciones, "Instrucciones");
    XLSX.writeFile(libro, "Plantilla_ingresos_bancarios_unificada.xlsx");
  }

  function exportarRevision() {
    if (filas.length === 0) {
      alert("No hay información para exportar.");
      return;
    }

    const datos = filas.map((fila) => ({
      Fila: fila.fila_origen,
      Fecha: fila.fecha_posteo,
      Monto: fila.monto_transaccion,
      Serial: fila.no_serial,
      Descripción: fila.descripcion,
      Apartamento_original: fila.apartamento_original,
      Apartamento_identificado: fila.apartamento,
      Propietario: fila.propietario,
      Método_identificación: fila.metodo_identificacion,
      Confianza: fila.confianza_identificacion,
      Estado: fila.estado,
      Archivo_banco_id: fila.archivo_banco_id,
      Pago_id: fila.pago_id,
      Movimiento_banco_id: fila.movimiento_banco_id,
      Apartamento_guardado: fila.apartamento_guardado,
      Propietario_guardado: fila.propietario_guardado,
      Requiere_actualización: fila.requiere_actualizacion ? "Sí" : "No",
      Registro_procesado: fila.existente_procesado || fila.procesado ? "Sí" : "No",
      Observación: fila.observacion,
    }));

    const libro = XLSX.utils.book_new();
    const hoja = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(libro, hoja, "Revisión");
    XLSX.writeFile(
      libro,
      `revision-ingresos-${periodoArchivo}-${marcaTiempoArchivo()}.xlsx`,
    );
  }

  const filasFiltradas = useMemo(() => {
    const textoBusqueda = normalizarTexto(busqueda);

    return filas.filter((fila) => {
      const textoFila = normalizarTexto(
        `${fila.fecha_posteo} ${fila.no_serial} ${fila.descripcion} ${fila.apartamento_original} ${fila.apartamento} ${fila.propietario} ${fila.estado}`,
      );

      const coincideBusqueda = !textoBusqueda || textoFila.includes(textoBusqueda);
      const coincideEstado = filtroEstado === "Todos" || fila.estado === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [filas, busqueda, filtroEstado]);

  const resumen = useMemo(() => {
    const total = filas.reduce(
      (suma, fila) => suma + Number(fila.monto_transaccion || 0),
      0,
    );
    const identificados = filas.filter(
      (fila) => fila.unidad_id && fila.propietario_id && !estadoEsError(fila.estado),
    );
    const pendientes = filas.filter(
      (fila) => !fila.unidad_id && !estadoEsError(fila.estado),
    );
    const procesados = filas.filter((fila) => fila.procesado);
    const errores = filas.filter((fila) => estadoEsError(fila.estado));

    return {
      total,
      registros: filas.length,
      identificados: identificados.length,
      montoIdentificado: identificados.reduce(
        (suma, fila) => suma + Number(fila.monto_transaccion || 0),
        0,
      ),
      pendientes: pendientes.length,
      montoPendiente: pendientes.reduce(
        (suma, fila) => suma + Number(fila.monto_transaccion || 0),
        0,
      ),
      procesados: procesados.length,
      errores: errores.length,
    };
  }, [filas]);

  const cuentaSeleccionada = cuentas.find(
    (cuenta) => cuenta.id === Number(cuentaBancariaId),
  );

  return (
    <PageContainer>
      <ModuleMenu
        title="Banco"
        subtitle="Importación, identificación y registro de ingresos bancarios."
        tone="blue"
        items={[
          {
            href: "/archivo-banco/importar",
            label: "Ingresos Bancarios",
            icon: Banknote,
          },
          {
            href: "/pagos-identificados",
            label: "Pagos Procesados",
            icon: ListChecks,
          },
        ]}
      />

      <ModuleToolbar
        title="Ingresos Bancarios"
        subtitle={`Un solo módulo para archivos identificados y sin identificar. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={Banknote}
        actions={
          <ModuleActions
            onRefresh={() => cargarDatosIniciales(condominioId)}
            extra={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={descargarPlantilla}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Plantilla
                </button>

                <button
                  type="button"
                  onClick={exportarRevision}
                  disabled={filas.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar
                </button>
              </div>
            }
          />
        }
      />

      {mensaje && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <InfoBox label="Registros" value={String(resumen.registros)} />
        <InfoBox
          label="Identificados"
          value={String(resumen.identificados)}
          detail={dinero(resumen.montoIdentificado)}
          tone="emerald"
        />
        <InfoBox
          label="Pendientes"
          value={String(resumen.pendientes)}
          detail={dinero(resumen.montoPendiente)}
          tone="yellow"
        />
        <InfoBox label="Procesados" value={String(resumen.procesados)} tone="blue" />
        <InfoBox label="Total archivo" value={dinero(resumen.total)} tone="blue" />
      </div>

      <SectionCard
        title="Cargar archivo del banco"
        subtitle="El sistema detecta automáticamente si el archivo trae el apartamento identificado."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Cuenta bancaria *
            </label>
            <select
              value={cuentaBancariaId}
              onChange={(event) => setCuentaBancariaId(event.target.value)}
              disabled={guardando || procesando || filas.some((fila) => Boolean(fila.archivo_banco_id))}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione...</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre_banco || "Banco"} - {cuenta.numero_cuenta || "Sin número"} - {" "}
                  {cuenta.fondo_tipo || "Sin fondo"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Período del archivo *
            </label>
            <input
              type="month"
              value={periodoArchivo}
              onChange={(event) => setPeriodoArchivo(event.target.value)}
              disabled={guardando || procesando || filas.some((fila) => Boolean(fila.archivo_banco_id))}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Archivo Excel o CSV *
            </label>
            <input
              id="archivo-ingresos-bancarios"
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={guardando || procesando || filas.some((fila) => Boolean(fila.archivo_banco_id))}
              onChange={(event) => seleccionarArchivo(event.target.files?.[0] || null)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={leerYAnalizarArchivo}
              disabled={!archivo || !cuentaBancariaId || loading || guardando || procesando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              Leer y analizar
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoLine
            label="Modalidad detectada"
            value={
              modalidad === "IDENTIFICADO"
                ? "Archivo identificado"
                : modalidad === "SIN_IDENTIFICAR"
                  ? "Archivo sin identificar"
                  : "Pendiente de analizar"
            }
            highlight={Boolean(modalidad)}
          />
          <InfoLine
            label="Cuenta seleccionada"
            value={
              cuentaSeleccionada
                ? `${cuentaSeleccionada.nombre_banco || "Banco"} - ${
                    cuentaSeleccionada.numero_cuenta || "Sin número"
                  }`
                : "No seleccionada"
            }
          />
          <InfoLine
            label="Archivo"
            value={archivo?.name || "No seleccionado"}
          />
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="text-sm font-black text-amber-900">Control financiero</p>
              <p className="mt-1 text-sm text-amber-800">
                Leer y guardar el archivo no afecta pagos. La cuenta del propietario solo se
                modifica al presionar <strong>Procesar y registrar pagos</strong>.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {filas.length > 0 && (
        <>
          <SectionCard
            title="Revisión de transacciones"
            subtitle="Confirme las unidades antes de registrar los pagos."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                  Errores: {resumen.errores}
                </span>
                <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
                  Hash: {archivoHash ? `${archivoHash.slice(0, 12)}...` : "-"}
                </span>
              </div>
            }
          >
            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">Buscar</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    className="w-full rounded-xl border px-10 py-3 text-sm"
                    placeholder="Fecha, serial, descripción, apartamento..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Estado</label>
                <select
                  value={filtroEstado}
                  onChange={(event) => setFiltroEstado(event.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  <option value="Todos">Todos</option>
                  <option value="VALIDADO">Validado</option>
                  <option value="REVISAR">Revisar</option>
                  <option value="ACTUALIZAR">Cambio para actualizar</option>
                  <option value="SIN_CAMBIOS">Existente sin cambios</option>
                  <option value="GUARDADO">Guardado</option>
                  <option value="PROCESADO">Procesado</option>
                  <option value="PROTEGIDO_PROCESADO">Procesado protegido</option>
                  <option value="ERROR_PROCESO">Error de proceso</option>
                  <option value="DUPLICADO_ARCHIVO">Duplicado archivo</option>
                  <option value="DUPLICADO_PAGO">Duplicado pago</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={limpiar}
                  disabled={guardando || procesando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Nueva importación
                </button>
              </div>
            </div>

            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-3 text-left">Fila</th>
                  <th className="px-3 py-3 text-left">Fecha</th>
                  <th className="px-3 py-3 text-left">Serial / descripción</th>
                  <th className="px-3 py-3 text-left">Apartamento</th>
                  <th className="px-3 py-3 text-left">Propietario</th>
                  <th className="px-3 py-3 text-right">Monto</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                  <th className="px-3 py-3 text-left">Observación</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filasFiltradas.map((fila) => {
                  const indexReal = filas.findIndex(
                    (item) => item.fila_origen === fila.fila_origen,
                  );

                  return (
                    <tr key={`${fila.fila_origen}-${fila.no_serial}`} className="bg-white hover:bg-slate-50">
                      <td className="px-3 py-3 font-bold">{fila.fila_origen}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{fila.fecha_posteo || "-"}</td>
                      <td className="max-w-[300px] px-3 py-3">
                        <p className="font-bold text-slate-800">{fila.no_serial || "Sin serial"}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {fila.descripcion || "Sin descripción"}
                        </p>
                      </td>
                      <td className="min-w-[230px] px-3 py-3">
                        <select
                          value={fila.unidad_id || ""}
                          onChange={(event) => cambiarUnidad(indexReal, event.target.value)}
                          disabled={
                            fila.procesado ||
                            fila.existente_procesado ||
                            (estadoEsError(fila.estado) &&
                              !["ERROR_UNIDAD", "ERROR_PROPIETARIO"].includes(fila.estado))
                          }
                          className="w-full rounded-lg border bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                        >
                          <option value="">Pendiente de identificar</option>
                          {unidades.map((unidad) => (
                            <option key={unidad.id} value={unidad.id}>
                              {unidad.codigo || `Unidad ${unidad.id}`}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                          {fila.metodo_identificacion} · {fila.confianza_identificacion}%
                        </p>
                      </td>
                      <td className="px-3 py-3">{fila.propietario || "-"}</td>
                      <td className="px-3 py-3 text-right font-black">
                        {dinero(fila.monto_transaccion)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <EstadoBadge estado={fila.estado} />
                      </td>
                      <td className="max-w-[320px] px-3 py-3 text-xs text-slate-600">
                        {fila.observacion}
                        {fila.archivo_banco_id && (
                          <p className="mt-1 font-bold text-blue-700">
                            Archivo banco ID: {fila.archivo_banco_id}
                          </p>
                        )}
                        {fila.pago_id && (
                          <p className="mt-1 font-bold text-emerald-700">
                            Pago ID: {fila.pago_id}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </SectionCard>

          <SectionCard
            title="Acciones de la importación"
            subtitle="Primero guarde la evidencia bancaria. Después procese únicamente los registros identificados."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-slate-50 p-5">
                <div className="flex items-start gap-3">
                  <Save className="mt-0.5 h-5 w-5 text-blue-700" />
                  <div>
                    <h3 className="font-black text-slate-900">1. Guardar archivo bancario</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Guarda transacciones nuevas y actualiza identificaciones corregidas en archivo_banco. No crea pagos.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={guardarArchivoBanco}
                  disabled={guardando || procesando}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {guardando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar y actualizar archivo
                </button>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
                  <div>
                    <h3 className="font-black text-emerald-900">
                      2. Procesar y registrar pagos
                    </h3>
                    <p className="mt-1 text-sm text-emerald-800">
                      Crea el pago, aplica cargos, genera saldo a favor, registra el ingreso bancario e intenta crear el asiento contable.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={procesarPagosConfirmados}
                  disabled={
                    procesando ||
                    guardando ||
                    !filas.some(
                      (fila) =>
                        fila.archivo_banco_id &&
                        fila.unidad_id &&
                        fila.propietario_id &&
                        !fila.procesado &&
                        ["GUARDADO", "VALIDADO", "SIN_CAMBIOS"].includes(fila.estado),
                    )
                  }
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {procesando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Procesar y registrar pagos
                </button>
              </div>
            </div>
          </SectionCard>
        </>
      )}

      {filas.length === 0 && !loading && (
        <SectionCard
          title="Sin archivo cargado"
          subtitle="Seleccione la cuenta, el período y el archivo bancario para comenzar."
        >
          <EmptyState
            title="Importación unificada"
            description="Puede cargar el archivo original del banco o un archivo que ya incluya la columna apartamento."
          />
        </SectionCard>
      )}

      {bitacora.length > 0 && (
        <SectionCard title="Bitácora" subtitle="Seguimiento técnico de la importación actual.">
          <div className="max-h-64 overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200">
            {bitacora.map((linea, index) => (
              <div
                key={`${linea}-${index}`}
                className={linea.includes("ERROR") ? "font-bold text-red-300" : ""}
              >
                {linea}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </PageContainer>
  );
}

function EstadoBadge({ estado }: { estado: EstadoFila }) {
  const esProcesado = ["PROCESADO", "PROTEGIDO_PROCESADO"].includes(estado);
  const esListo = ["VALIDADO", "GUARDADO", "SIN_CAMBIOS"].includes(estado);
  const esActualizar = estado === "ACTUALIZAR";
  const esPendiente = estado === "REVISAR";
  const esError = estadoEsError(estado);

  const clase = esProcesado
    ? "bg-blue-50 text-blue-700"
    : esListo
      ? "bg-emerald-50 text-emerald-700"
      : esActualizar
        ? "bg-amber-100 text-amber-800"
        : esPendiente
          ? "bg-yellow-50 text-yellow-700"
          : esError
            ? "bg-red-50 text-red-700"
            : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${clase}`}>
      {esProcesado || esListo ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : esError ? (
        <XCircle className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {estado}
    </span>
  );
}

function InfoBox({
  label,
  value,
  detail,
  tone = "slate",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "slate" | "emerald" | "blue" | "yellow";
}) {
  const clase =
    tone === "emerald"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tone === "blue"
        ? "border-blue-100 bg-blue-50 text-blue-700"
        : tone === "yellow"
          ? "border-yellow-100 bg-yellow-50 text-yellow-700"
          : "border-slate-200 bg-white text-slate-800";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${clase}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
      {detail && <p className="mt-1 text-xs font-bold opacity-80">{detail}</p>}
    </div>
  );
}

function InfoLine({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span
        className={`text-right text-sm font-black ${highlight ? "text-blue-700" : "text-slate-900"}`}
      >
        {value}
      </span>
    </div>
  );
}
