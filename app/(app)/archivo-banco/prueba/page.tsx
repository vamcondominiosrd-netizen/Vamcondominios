"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  RefreshCw,
  Search,
  UploadCloud,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";

import { supabase } from "@/app/lib/supabaseClient";

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
  | "ERROR_PROCESO"
  | "EGRESO_REVISAR"
  | "PAGO_EXISTENTE_REVISAR"
  | "COINCIDENCIA_AMBIGUA"
  | "ERROR_TIPO";

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
  observacion: string | null;
};

type BancoMovimientoExistente = {
  id: number;
  cuenta_bancaria_id: number | null;
  fecha_movimiento: string;
  fecha_banco: string | null;
  tipo_movimiento: string | null;
  origen: string | null;
  referencia_id: number | null;
  descripcion: string | null;
  monto: number;
  referencia_banco: string | null;
  numero_documento: string | null;
  conciliado: boolean | null;
  estado_banco: string | null;
};

type PagoRegistrado = {
  id: number;
  condominio_id: number;
  cuenta_bancaria_id: number | null;
  unidad_id: number | null;
  fecha_pago: string;
  monto: number;
  referencia: string | null;
};

type CoincidenciaBanco = {
  estado: "SIN_REGISTRO" | "CANDIDATO" | "REFERENCIA_EXACTA" | "AMBIGUA";
  movimiento: BancoMovimientoExistente | null;
  pago: PagoRegistrado | null;
  candidatos: string[];
  observacion: string;
};

type FilaBanco = {
  fila_origen: number;
  tipo_movimiento: "INGRESO" | "EGRESO" | "DESCONOCIDO";
  descripcion_corta: string;
  balance_posteo: number | null;
  referencia_banco: string;
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
  alias_ids_coincidentes: number[];
  evidencia_identificacion: string;
  candidatos_identificacion: string[];
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
  coincidencia_banco: CoincidenciaBanco["estado"];
  unidad_id_pago_existente: number | null;
  candidatos_banco: string[];
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

/** El CSV original contiene metadatos, un encabezado a mitad del archivo y otro antes de los débitos. */
function leerMovimientosOriginales(hoja: XLSX.WorkSheet) {
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1, defval: "", raw: true, blankrows: true,
  }) as unknown[][];
  const encabezado = matriz.findIndex((fila) => {
    const titulos = (fila || []).map(normalizarTexto);
    return (titulos.includes("fecha posteo") || titulos.includes("fecha")) &&
      (titulos.includes("monto transaccion") || titulos.includes("monto")) &&
      titulos.includes("descripcion");
  });
  if (encabezado < 0) {
    throw new Error("No se encontró el encabezado bancario: Fecha Posteo, Monto Transacción y Descripción. Suba el CSV o Excel original del banco.");
  }
  const titulos = matriz[encabezado].map((celda) => limpiarTexto(celda));
  const filas: Array<{ datos: Record<string, unknown>; numero: number }> = [];
  let encabezadosRepetidos = 0;
  matriz.slice(encabezado + 1).forEach((valores, indice) => {
    if (!valores || valores.every((valor) => !limpiarTexto(valor))) return;
    if (normalizarTexto(valores[0]) === "fecha posteo" &&
        valores.some((valor) => normalizarTexto(valor) === "monto transaccion")) {
      encabezadosRepetidos += 1;
      return;
    }
    const datos: Record<string, unknown> = {};
    titulos.forEach((titulo, columna) => { datos[titulo] = valores[columna] ?? ""; });
    // Ignorar notas y totales ajenos a los movimientos, nunca una partida válida.
    if (!limpiarTexto(obtenerValor(datos, ["Fecha Posteo", "Fecha"])) &&
        !limpiarTexto(obtenerValor(datos, ["Monto Transacción", "Monto"]))) return;
    filas.push({ datos, numero: encabezado + indice + 2 });
  });
  if (!filas.length) throw new Error("El archivo no tiene movimientos bancarios válidos.");
  const metadatos = matriz.slice(0, encabezado).map((fila) => (fila || []).join(" ")).join("\n");
  const cuenta = metadatos.match(/cuenta\s*:\s*([\d\s-]{5,})/i)?.[1]?.replace(/\D/g, "") || "";
  return { filas, cuenta, encabezadosRepetidos };
}

function identificarTipoBanco(descripcionCorta: string, montoOriginal: number): FilaBanco["tipo_movimiento"] {
  const corta = normalizarTexto(descripcionCorta);
  if (/credito|deposito|abono/.test(corta)) return "INGRESO";
  if (/debito|comisiones|cheque pagado|retiro|cargo/.test(corta)) return "EGRESO";
  if (montoOriginal < 0) return "EGRESO";
  // Sin indicador de naturaleza no se convierte un abono en pago por su importe positivo.
  return "DESCONOCIDO";
}

function clavePartidaBanco(fila: {
  fecha_posteo: string; monto_transaccion: number; no_serial: string | null | undefined;
  descripcion: string | null | undefined; balance_posteo: number | null;
  tipo_movimiento: FilaBanco["tipo_movimiento"];
}) {
  return `${fila.tipo_movimiento}|${claveTransaccion(fila)}|${fila.balance_posteo === null ? "SIN_SALDO" : fila.balance_posteo.toFixed(2)}`;
}

function marcadorOrigen(observacion: string | null | undefined) {
  const texto = String(observacion || "");
  const hash = texto.match(/(?:^|;)\s*HASH:([a-f\d]{64})/i)?.[1]?.toLowerCase();
  const fila = texto.match(/(?:^|;)\s*FILA:(\d+)/i)?.[1];
  return hash && fila ? `${hash}:${fila}` : "";
}

function candidatasCodigoEnDescripcion(descripcion: string, unidades: Unidad[]) {
  const texto = normalizarTexto(descripcion).toUpperCase();
  const encontradas = unidades.filter((unidad) => {
    const codigo = normalizarCodigo(unidad.codigo || "");
    if (!codigo) return false;
    const partes = codigo.match(/^(?:L(?:OTE)?\s*)?(\d+)[- ]?([A-Z]{1,2})[- ]?(\d+)$/);
    if (!partes) {
      return new RegExp(`(^|[^A-Z0-9])${escaparRegex(codigo)}($|[^A-Z0-9])`, "i").test(texto);
    }
    const [, lote, bloque, numero] = partes;
    // Acepta L9-A3, 9A-3, 9 A 3, APTO 9 J2 y APTO L9 G3.
    const expresion = new RegExp(`(^|[^A-Z0-9])(?:L(?:OTE)?\\s*)?${lote}\\s*[- ]?\\s*${bloque}\\s*[- ]?\\s*${numero}(?![A-Z0-9])`, "i");
    // Sin lote, A-3 solo sirve cuando existe una indicación explícita APTO / LOTE 9.
    const contexto = new RegExp(`(?:APTO|APARTAMENTO|LOTE\\s*${lote})\\s*(?:L(?:OTE)?\\s*${lote}\\s*)?[- ]*${bloque}\\s*[- ]?\\s*${numero}(?![A-Z0-9])`, "i");
    return expresion.test(texto) || contexto.test(texto);
  });
  return encontradas;
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

/**
 * SOLO CONSULTA. Todos los identificadores de apartamentos se obtienen de
 * public.apartamento_banco_alias (estado Activo) y public.unidades.
 * No se mantienen referencias individuales fijas dentro del programa.
 */
function textoParaComparar(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contieneFrase(texto: string, frase: string) {
  return Boolean(frase) && (` ${texto} `).includes(` ${frase} `);
}

function referenciaDeCanal(texto: string) {
  // Nunca usar por sí solo el serial ni el banco emisor: pueden repetirse.
  const match = texto.match(/(?:^| )(LBTR|MB DESDE) (\d{7,})(?= |$)/);
  return match ? `${match[1]} ${match[2]}` : "";
}

function esAliasGenerico(texto: string) {
  if (!texto) return true;
  const comunes = new Set([
    "MBANKING", "APP", "TRANSF", "TRANSFERENCIA", "VIA", "ACH",
    "PAGO", "PGO", "PAG", "MANTENIMIENTO", "MANT", "MES", "DEL", "DE",
    "LA", "EL", "LOTE", "RD", "CREDITO", "DEPOSITO", "AGOSTO",
    "SEPTIEMBRE", "JULIO", "JUNIO", "MAYO", "ABRIL", "MARZO", "FEBRERO",
    "ENERO", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE", "00", "CTA", "CUENTA",
    "APTO", "APARTAMENTO", "AREA", "COMUN", "EDIF", "EDIFICIO", "DIC", "ENE",
    "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV",
  ]);
  const partes = texto.split(" ");
  const nombres = partes.filter((p) => !comunes.has(p) && /[A-Z]/.test(p) && p.length >= 3);
  // No basta con el año, el canal, la cuota ni un número de cuenta compartido.
  if (!nombres.length && !/^APTO |^APARTAMENTO /.test(texto)) return true;
  if (texto.length < 8) return true;
  return false;
}

type ResultadoIdentificacion = {
  unidad: Unidad | null;
  metodo: "CODIGO_DESCRIPCION" | "ALIAS" | "NO_IDENTIFICADO";
  confianza: number;
  observacion: string;
  conflicto: boolean;
  aliasIds: number[];
  evidencia: string;
  candidatos: string[];
};

function identificarUnidadDescripcion(
  descripcionOriginal: string,
  unidades: Unidad[],
  aliasActivos: AliasBanco[],
  apartamentoOriginal = "",
): ResultadoIdentificacion {
  const descripcion = textoParaComparar(descripcionOriginal);
  const codigos = candidatasCodigoEnDescripcion(descripcionOriginal, unidades);
  const original = apartamentoOriginal ? buscarUnidadPorCodigo(apartamentoOriginal, unidades) : null;
  const coincidencias = aliasActivos.flatMap((alias) => {
    const aliasTexto = textoParaComparar(alias.descripcion_banco);
    if (!aliasTexto || !alias.unidad_id) return [];
    const clave = referenciaDeCanal(aliasTexto);
    const porReferencia = Boolean(clave && contieneFrase(descripcion, clave));
    const porFrase = contieneFrase(descripcion, aliasTexto);
    const corto = aliasTexto.length < 8;
    // Una coincidencia de un alias de dos letras dentro de un nombre es insegura.
    if (!porReferencia && (!porFrase || (corto && descripcion !== aliasTexto))) return [];
    const unidad = unidades.find((item) => item.id === alias.unidad_id);
    if (!unidad) return [];
    // A-1 / H3 son identificadores válidos únicamente cuando el banco puso
    // exactamente ese código en la descripción; nunca como subcadenas.
    const codigoCortoExacto = descripcion === aliasTexto &&
      /^(?:[A-Z]{1,2} ?\d{1,2}|\d{1,2} [A-Z]{1,2} ?\d{1,2})$/.test(aliasTexto);
    const generico = !porReferencia && !codigoCortoExacto && esAliasGenerico(aliasTexto);
    return [{ alias, unidad, generico, porReferencia }];
  });
  const fiables = coincidencias.filter((item) => !item.generico);
  const ids = coincidencias.map((item) => item.alias.id);
  const candidatas = [...new Map<number, Unidad>(
    [...codigos, ...fiables.map((item) => item.unidad), ...(original ? [original] : [])]
      .map((item): [number, Unidad] => [item.id, item]),
  ).values()];
  const nombres = candidatas.map((item) => item.codigo || `Unidad ${item.id}`);

  if (codigos.length > 1 || candidatas.length > 1) {
    return {
      unidad: null, metodo: "NO_IDENTIFICADO", confianza: 0, conflicto: true,
      aliasIds: ids, evidencia: "Código/alias contradictorio", candidatos: nombres,
      observacion: `CONFLICTO: descripción asociada con unidades distintas (${nombres.join(", ")}). Alias: ${ids.join(", ") || "ninguno"}. Revisar comprobante antes de asignar.`,
    };
  }
  if (original || codigos.length === 1) {
    const unidad = (original || codigos[0]) as Unidad;
    return {
      unidad, metodo: "CODIGO_DESCRIPCION", confianza: 100, conflicto: false,
      aliasIds: ids, evidencia: original ? "Apartamento expresamente indicado en archivo" : "Código encontrado en descripción",
      candidatos: [unidad.codigo || ""],
      observacion: original ? "Apartamento indicado en archivo original." : "Código inequívoco encontrado en la descripción bancaria.",
    };
  }
  if (fiables.length && candidatas.length === 1) {
    const elegido = fiables.find((item) => item.porReferencia) || fiables[0];
    return {
      unidad: elegido.unidad, metodo: "ALIAS", confianza: elegido.porReferencia ? 100 : 95,
      conflicto: false, aliasIds: ids,
      evidencia: `Alias #${elegido.alias.id}: ${elegido.alias.descripcion_banco || ""}`,
      candidatos: [elegido.unidad.codigo || ""],
      observacion: `Coincide con alias activo #${elegido.alias.id}: ${elegido.alias.descripcion_banco}. Verificar antes de registrar el pago.`,
    };
  }
  const genericos = coincidencias.filter((item) => item.generico);
  return {
    unidad: null, metodo: "NO_IDENTIFICADO", confianza: 0, conflicto: false,
    aliasIds: ids, evidencia: genericos.length ? "Alias genérico no concluyente" : "Sin coincidencia suficiente",
    candidatos: [...new Set(genericos.map((item) => item.unidad.codigo || ""))],
    observacion: genericos.length
      ? `Coincide solamente con alias genérico #${genericos.map((item) => item.alias.id).join(", ")}. NO asignar automáticamente; verifique comprobante.`
      : "Sin referencia exclusiva ni código inequívoco en la descripción. Identificación manual pendiente.",
  };
}

async function calcularHashArchivo(file: File) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = Array.from(new Uint8Array(hashBuffer));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Búsqueda de correspondencias; NUNCA concilia ni crea movimientos.
 * El número de documento en banco_movimientos referencia el pago de VAM
 * únicamente cuando coincide contra la fila real de public.pagos.
 * Fecha + monto, sin referencia bancaria externa, SOLO genera candidato.
 */
function evaluarCoincidenciaBanco(
  fila: Pick<FilaBanco, "fecha_posteo" | "monto_transaccion" | "no_serial" | "referencia_banco" | "descripcion">,
  movimientos: BancoMovimientoExistente[],
  pagosPorId: Map<number, PagoRegistrado>,
  repeticionesCSV: number,
  repeticionesReferenciaCSV: number,
): CoincidenciaBanco {
  const candidatos = movimientos.filter((m) =>
    m.tipo_movimiento === "INGRESO" &&
    Math.abs(Number(m.monto)) === fila.monto_transaccion &&
    (m.fecha_banco || m.fecha_movimiento) === fila.fecha_posteo,
  );
  const explicar = (m: BancoMovimientoExistente) => {
    const numero = Number(m.numero_documento);
    const idPago = Number.isSafeInteger(numero) && numero > 0 ? numero : null;
    return `Movimiento #${m.id}${idPago ? ` · posible pago #${idPago}` : ""} · ${m.referencia_banco || "sin referencia"}${m.conciliado ? " · conciliado en VAM" : " · pendiente en VAM"}`;
  };
  if (!candidatos.length) return {
    estado: "SIN_REGISTRO", movimiento: null, pago: null, candidatos: [],
    observacion: "No se encontró movimiento financiero por fecha e importe en esta cuenta. No significa que el banco no recibió el depósito.",
  };
  // Una referencia bancaria externa exacta es distinta de una referencia
  // capturada manualmente en el pago. No usar números de canal compartidos
  // (p. ej. 401010062), ni el importe/fecha como prueba de conciliación.
  const referenciasArchivo = [fila.referencia_banco, fila.no_serial]
    .map((valor) => String(valor || "").trim())
    .filter((valor) => /^\d{7,}$/.test(valor) && !/^0+$/.test(valor));
  const coincidenciasReferencia = candidatos.filter((m) => {
    const ref = String(m.referencia_banco || "").trim();
    return Boolean(ref && referenciasArchivo.some((r) => r === ref));
  });
  const lista = candidatos.map(explicar);
  if (coincidenciasReferencia.length > 1 ||
      (coincidenciasReferencia.length === 1 && repeticionesReferenciaCSV > 1) ||
      (!coincidenciasReferencia.length && (candidatos.length !== 1 || repeticionesCSV > 1))) {
    return {
      estado: "AMBIGUA", movimiento: null, pago: null, candidatos: lista,
      observacion: `Coincidencia ambigua: ${candidatos.length} movimiento(s) VAM para fecha e importe; ${repeticionesCSV} fila(s) con ese importe y ${repeticionesReferenciaCSV} fila(s) con igual serial/referencia en el CSV. No asociar automáticamente.`,
    };
  }
  const movimiento = coincidenciasReferencia.length === 1 ? coincidenciasReferencia[0] : candidatos[0];
  const pagoNumero = Number(movimiento.numero_documento);
  const pago = Number.isSafeInteger(pagoNumero) && pagoNumero > 0 ? pagosPorId.get(pagoNumero) || null : null;
  const pagoVerificado = pago &&
    pago.cuenta_bancaria_id === movimiento.cuenta_bancaria_id &&
    pago.fecha_pago === movimiento.fecha_movimiento &&
    Number(pago.monto) === Math.abs(Number(movimiento.monto)) &&
    String(pago.referencia || "").trim() === String(movimiento.referencia_banco || "").trim()
      ? pago : null;
  const exacta = coincidenciasReferencia.length === 1;
  return {
    estado: exacta ? "REFERENCIA_EXACTA" : "CANDIDATO",
    movimiento,
    pago: pagoVerificado,
    candidatos: lista,
    observacion: exacta
      ? `Referencia externa coincide con movimiento #${movimiento.id}. ${pagoVerificado ? `Pago #${pagoVerificado.id} verificado internamente.` : "Pago sin vínculo interno verificado."} Confirmar contra comprobante antes de conciliar.`
      : `CANDIDATO, NO CONCILIADO: movimiento #${movimiento.id}${pagoVerificado ? ` y pago #${pagoVerificado.id} vinculados internamente` : " (sin pago comprobado)"}. Solo coinciden fecha e importe con el CSV; validar comprobante y referencia original.`,
  };
}

function registroEstaProcesado(estado: string | null | undefined) {
  const valor = normalizarTexto(estado || "");
  return ["procesado", "pagado", "aplicado", "identificado"].some((palabra) => valor.includes(palabra));
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
  const [, setAliasBanco] = useState<AliasBanco[]>([]);
  const [filas, setFilas] = useState<FilaBanco[]>([]);

  const [loading, setLoading] = useState(false);
  // Modo exclusivamente de consulta: no se habilitan operaciones de escritura.
  const guardando = false;
  const procesando = false;

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("INGRESO");
  const [mensaje, setMensaje] = useState("");
  const [cuentaArchivo, setCuentaArchivo] = useState("");
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
    setCuentaArchivo("");
    setModalidad(null);
    setFilas([]);
    setFiltroTipo("INGRESO");
    setMensaje("");
    setBitacora([]);

    if (!file) return;

    const hash = await calcularHashArchivo(file);
    setArchivoHash(hash);
    log(`Archivo seleccionado: ${file.name}. Hash: ${hash.slice(0, 16)}...`);
  }

  async function obtenerArchivoBancoCompleto(id: number) {
    const resultado: ArchivoBancoExistente[] = [];
    const TAMANO = 1000;
    for (let inicio = 0; ; inicio += TAMANO) {
      const { data, error } = await supabase.from("archivo_banco")
        .select("id, fecha_posteo, monto_transaccion, no_serial, descripcion, estado, unidad_id, apartamento, propietario, observacion")
        .eq("condominio_id", id).order("id", { ascending: true })
        .range(inicio, inicio + TAMANO - 1);
      if (error) throw new Error("Error consultando archivo_banco: " + error.message);
      resultado.push(...(data || []) as ArchivoBancoExistente[]);
      if ((data || []).length < TAMANO) return resultado;
    }
  }

  // Todas las consultas de este módulo son SELECT. Consultar por cuenta y
  // período evita confundir pagos de otro condominio o cuenta bancaria.
  async function obtenerMovimientosFinancieros(id: number, cuenta: number, periodo: string) {
    const resultado: BancoMovimientoExistente[] = [];
    const inicio = `${periodo}-01`;
    const siguiente = new Date(`${periodo}-01T12:00:00Z`);
    siguiente.setUTCMonth(siguiente.getUTCMonth() + 1);
    const fin = siguiente.toISOString().slice(0, 10);
    const TAMANO = 1000;
    for (let desde = 0; ; desde += TAMANO) {
      const { data, error } = await supabase.from("banco_movimientos")
        .select("id, cuenta_bancaria_id, fecha_movimiento, fecha_banco, tipo_movimiento, origen, referencia_id, descripcion, monto, referencia_banco, numero_documento, conciliado, estado_banco")
        .eq("condominio_id", id)
        .eq("cuenta_bancaria_id", cuenta)
        .gte("fecha_movimiento", inicio).lt("fecha_movimiento", fin)
        .order("id", { ascending: true }).range(desde, desde + TAMANO - 1);
      if (error) throw new Error("Error consultando banco_movimientos: " + error.message);
      resultado.push(...(data || []) as BancoMovimientoExistente[]);
      if ((data || []).length < TAMANO) return resultado;
    }
  }

  async function obtenerPagosVinculados(movimientos: BancoMovimientoExistente[], id: number) {
    const ids = [...new Set(movimientos
      .filter((m) => m.tipo_movimiento === "INGRESO" && m.origen === "PAGO_PROPIETARIO")
      .map((m) => Number(m.numero_documento))
      .filter((n) => Number.isSafeInteger(n) && n > 0))];
    const resultado = new Map<number, PagoRegistrado>();
    for (let desde = 0; desde < ids.length; desde += 100) {
      const { data, error } = await supabase.from("pagos")
        .select("id, condominio_id, cuenta_bancaria_id, unidad_id, fecha_pago, monto, referencia")
        .eq("condominio_id", id).in("id", ids.slice(desde, desde + 100));
      if (error) throw new Error("Error consultando pagos existentes: " + error.message);
      (data || []).forEach((pago) => resultado.set(Number(pago.id), pago as PagoRegistrado));
    }
    return resultado;
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

      const hashActual = archivoHash || await calcularHashArchivo(archivo);
      if (!archivoHash) setArchivoHash(hashActual);
      const workbook = archivo.name.toLowerCase().endsWith(".csv")
        ? XLSX.read(await archivo.text(), { type: "string", raw: true })
        : XLSX.read(await archivo.arrayBuffer(), { type: "array", cellDates: true });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const lectura = leerMovimientosOriginales(hoja);
      const rows = lectura.filas.map((fila) => fila.datos);
      setCuentaArchivo(lectura.cuenta);
      if (lectura.cuenta) {
        const seleccionada = cuentas.find((cuenta) => cuenta.id === Number(cuentaBancariaId));
        const normalizarCuenta = (valor: string) => valor.replace(/\D/g, "").replace(/^0+/, "");
        if (!seleccionada?.numero_cuenta ||
            normalizarCuenta(seleccionada.numero_cuenta) !== normalizarCuenta(lectura.cuenta)) {
          throw new Error(`La cuenta del CSV (terminada en ${lectura.cuenta.slice(-4)}) no coincide con la cuenta seleccionada en VAM. Corrija la selección antes de importar.`);
        }
      }
      const fueraDePeriodo = lectura.filas.filter(({ datos }) => {
        const f = parsearFecha(obtenerValor(datos, ["Fecha Posteo", "Fecha"]));
        return f && periodoArchivo && !f.startsWith(periodoArchivo);
      });
      if (fueraDePeriodo.length) {
        throw new Error(`${fueraDePeriodo.length} movimiento(s) no corresponden al período seleccionado ${periodoArchivo}. Revise el archivo o cambie el período.`);
      }
      const modalidadDetectada: ModalidadArchivo = tieneCabeceraApartamento(rows[0])
        ? "IDENTIFICADO" : "SIN_IDENTIFICAR";
      setModalidad(modalidadDetectada);
      log(`Encabezado original detectado. Movimientos: ${rows.length}; encabezados repetidos omitidos: ${lectura.encabezadosRepetidos}.`);

      // Recargar los alias activos y las unidades justo antes de analizar:
      // si administración agregó una referencia mientras esta pantalla estaba
      // abierta, el resultado NO debe seguir usando el estado anterior.
      const [archivoExistenteResultado, hashExistenteResultado, aliasVigentes, unidadesVigentes, movimientosVigentes] = await Promise.all([
        obtenerArchivoBancoCompleto(Number(condominioId)),
        supabase.from("archivo_banco").select("id")
          .eq("condominio_id", Number(condominioId))
          .ilike("observacion", `%HASH:${hashActual}%`).limit(1),
        supabase.from("apartamento_banco_alias")
          .select("id, unidad_id, no_apartamento, propietario, descripcion_banco")
          .eq("condominio_id", Number(condominioId))
          .eq("estado", "Activo")
          .order("id", { ascending: true }),
        supabase.from("unidades")
          .select("id, codigo, propietario_id, propietario_nombre")
          .eq("condominio_id", Number(condominioId))
          .eq("activa", true)
          .order("codigo", { ascending: true }),
        obtenerMovimientosFinancieros(Number(condominioId), Number(cuentaBancariaId), periodoArchivo),
      ]);
      if (aliasVigentes.error) throw new Error(`Error consultando alias activos: ${aliasVigentes.error.message}`);
      if (unidadesVigentes.error) throw new Error(`Error consultando unidades: ${unidadesVigentes.error.message}`);
      const aliasParaAnalisis = (aliasVigentes.data || []) as AliasBanco[];
      const unidadesParaAnalisis = (unidadesVigentes.data || []) as Unidad[];
      const pagosVinculados = await obtenerPagosVinculados(movimientosVigentes, Number(condominioId));
      log(`Movimientos financieros encontrados: ${movimientosVigentes.length}; pagos consultados: ${pagosVinculados.size}.`);
      const conteosCSV = new Map<string, number>();
      const conteosReferenciaCSV = new Map<string, number>();
      rows.forEach((row) => {
        const tipo = identificarTipoBanco(
          limpiarTexto(obtenerValor(row, ["Descripción Corta", "Descripcion Corta", "Tipo Movimiento"])),
          parsearMonto(obtenerValor(row, ["Monto Transacción", "Monto Transaccion", "Monto"])),
        );
        if (tipo !== "INGRESO") return;
        const clave = `${parsearFecha(obtenerValor(row, ["Fecha Posteo", "Fecha"]))}|${Math.abs(parsearMonto(obtenerValor(row, ["Monto Transacción", "Monto Transaccion", "Monto"]))).toFixed(2)}`;
        conteosCSV.set(clave, (conteosCSV.get(clave) || 0) + 1);
        const serial = limpiarTexto(obtenerValor(row, ["No. Serial", "No Serial", "Serial"]));
        const referencia = limpiarTexto(obtenerValor(row, ["No. Referencia", "No Referencia", "Referencia Banco"]));
        const referenciaClave = `${clave}|${serial}|${referencia}`;
        conteosReferenciaCSV.set(referenciaClave, (conteosReferenciaCSV.get(referenciaClave) || 0) + 1);
      });
      setAliasBanco(aliasParaAnalisis);
      setUnidades(unidadesParaAnalisis);
      log(`Alias activos consultados en Supabase: ${aliasParaAnalisis.length}; unidades: ${unidadesParaAnalisis.length}.`);

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

      const existentesPorClave = new Map<string, ArchivoBancoExistente[]>();
      const existentesPorOrigen = new Map<string, ArchivoBancoExistente>();
      archivoExistenteResultado.forEach((item) => {
        const origen = marcadorOrigen(item.observacion);
        if (origen) existentesPorOrigen.set(origen, item);
        const clave = claveTransaccion(item);
        existentesPorClave.set(clave, [...(existentesPorClave.get(clave) || []), item]);
      });
      const clavesInternas = new Set<string>();

      const resultado: FilaBanco[] = rows.map((row, index) => {
        const filaOriginal = lectura.filas[index].numero;
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

        const montoOriginal = parsearMonto(
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

        const descripcionCorta = limpiarTexto(obtenerValor(row, ["Descripción Corta", "Descripcion Corta", "Tipo Movimiento"]));
        const tipoMovimiento = identificarTipoBanco(descripcionCorta, montoOriginal);
        const monto = Math.abs(montoOriginal);
        const saldoTexto = obtenerValor(row, ["Balance", "Balance ", "Saldo"]);
        const balancePosteo = limpiarTexto(saldoTexto) ? parsearMonto(saldoTexto) : null;
        const referenciaBanco = limpiarTexto(obtenerValor(row, ["No. Referencia", "No Referencia", "Referencia Banco"]));

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

        // Identificar solamente INGRESOS a partir del texto de la columna
        // Descripción y de los alias ACTIVOS de la base de datos.
        const resolucion = tipoMovimiento === "INGRESO"
          ? identificarUnidadDescripcion(descripcion, unidadesParaAnalisis, aliasParaAnalisis, apartamentoOriginal)
          : null;
        const codigosCandidatos = tipoMovimiento === "INGRESO"
          ? candidatasCodigoEnDescripcion(descripcion, unidadesParaAnalisis) : [];
        const conflictoIdentificacion = Boolean(resolucion?.conflicto);
        let unidad: Unidad | null = resolucion?.unidad || null;
        let metodo: FilaBanco["metodo_identificacion"] = resolucion?.metodo || "NO_IDENTIFICADO";
        let confianza = resolucion?.confianza || 0;

        const coincidencia = tipoMovimiento === "INGRESO"
          ? evaluarCoincidenciaBanco(
              { fecha_posteo: fecha, monto_transaccion: monto, no_serial: noSerial, referencia_banco: referenciaBanco, descripcion },
              movimientosVigentes,
              pagosVinculados,
              conteosCSV.get(`${fecha}|${monto.toFixed(2)}`) || 1,
              conteosReferenciaCSV.get(`${fecha}|${monto.toFixed(2)}|${noSerial}|${referenciaBanco}`) || 1,
            )
          : null;
        const clave = claveTransaccion({ fecha_posteo: fecha, monto_transaccion: monto, no_serial: noSerial, descripcion });
        const porOrigen = existentesPorOrigen.get(`${hashActual.toLowerCase()}:${filaOriginal}`);
        const candidatosHistoricos = (existentesPorClave.get(clave) || []).filter((item) => {
          const marcaCuenta = String(item.observacion || "").match(/CUENTA_ID:(\d+)/i)?.[1];
          return (!marcaCuenta || marcaCuenta === String(cuentaBancariaId)) &&
            (!marcadorOrigen(item.observacion) || marcadorOrigen(item.observacion) === `${hashActual.toLowerCase()}:${filaOriginal}`);
        });
        // Solo migrar registros antiguos si se puede confirmar MISMO archivo + MISMA fila.
        // Una referencia/importe idénticos no son prueba de duplicidad bancaria.
        const legacy = candidatosHistoricos.filter((item) => !marcadorOrigen(item.observacion));
        const fuenteLegacy = `Archivo:${archivo.name}; FILA:`;
        const legacyMismaFila = legacy.filter((item) =>
          String(item.observacion || "").includes(`${fuenteLegacy}${filaOriginal};`));
        const existente = porOrigen || (legacyMismaFila.length === 1 ? legacyMismaFila[0] : undefined);
        const legadoAmbiguo = !porOrigen && (
          legacyMismaFila.length > 1 ||
          legacy.some((item) => !String(item.observacion || "").includes(fuenteLegacy))
        );

        const unidadIdGuardada = existente?.unidad_id ? Number(existente.unidad_id) : null;
        const apartamentoGuardado = limpiarTexto(existente?.apartamento || "");
        const propietarioGuardado = limpiarTexto(existente?.propietario || "");
        const unidadGuardada = unidadIdGuardada
          ? unidadesParaAnalisis.find((item) => item.id === unidadIdGuardada) || null
          : null;

        // Una identificación guardada NO constituye evidencia de que el
        // importador haya vuelto a reconocer el depósito. Señalar la diferencia.
        const discrepanciaGuardada = Boolean(
          unidadGuardada && unidad && unidadGuardada.id !== unidad.id,
        );
        const existenteProcesado = Boolean(existente && registroEstaProcesado(existente.estado));
        let estado: EstadoFila = unidad ? "VALIDADO" : "REVISAR";
        let observacion = resolucion?.observacion || "Ingreso pendiente de identificación.";
        const unidadMovimiento = coincidencia?.pago?.unidad_id
          ? unidadesParaAnalisis.find((item) => item.id === coincidencia.pago?.unidad_id) || null
          : null;
        const conflictoConPago = Boolean(unidadMovimiento && unidad && unidadMovimiento.id !== unidad.id);
        if (conflictoIdentificacion || discrepanciaGuardada || conflictoConPago) {
          unidad = null;
          metodo = "NO_IDENTIFICADO";
          confianza = 0;
          estado = "REVISAR";
          if (conflictoConPago) {
            observacion = `CONFLICTO: el texto bancario propone ${resolucion?.unidad?.codigo}, pero el pago #${coincidencia?.pago?.id} corresponde a ${unidadMovimiento?.codigo}. Revisar comprobante; NO conciliar.`;
          } else if (discrepanciaGuardada) {
            observacion = `CONFLICTO: identificación guardada ${unidadGuardada?.codigo}, coincidencia actual ${resolucion?.unidad?.codigo}. No cambiar el pago; revisar la evidencia.`;
          }
        } else if (!unidad && unidadGuardada) {
          // Mostrar el dato guardado en observación pero dejar pendiente;
          // antes se consideraba MANUAL 100% sin revalidarlo.
          observacion += ` Identificación histórica: ${unidadGuardada.codigo} (sin confirmación en el archivo actual).`;
        }
        if (!resolucion?.unidad && !conflictoIdentificacion && !discrepanciaGuardada && codigosCandidatos.length > 1) {
          observacion = `Más de un código de apartamento en descripción: ${codigosCandidatos.map((u) => u.codigo).join(", ")}.`;
        }
        let requiereActualizacion = false;

        if ((conflictoIdentificacion || discrepanciaGuardada) && tipoMovimiento === "INGRESO") {
          estado = "REVISAR";
        } else if (legadoAmbiguo && tipoMovimiento === "INGRESO") {
          estado = "DUPLICADO_ARCHIVO";
          observacion = "Hay registros anteriores indistinguibles sin saldo/origen. Conciliar los IDs existentes antes de reimportar; no duplicar cobros.";
        } else if (tipoMovimiento === "EGRESO") {
          estado = "EGRESO_REVISAR";
          observacion = "Débito bancario: revisar contra Gastos/Cheques; no genera pago de mantenimiento.";
        } else if (tipoMovimiento === "DESCONOCIDO") {
          estado = "ERROR_TIPO";
          observacion = "No se distingue crédito de débito; clasificación manual requerida.";
        }

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

        if (tipoMovimiento === "INGRESO" && !conflictoIdentificacion && !discrepanciaGuardada && !conflictoConPago && !estadoEsError(estado) &&
            clavesInternas.has(clavePartidaBanco({ fecha_posteo: fecha, monto_transaccion: monto,
              no_serial: noSerial, descripcion, balance_posteo: balancePosteo, tipo_movimiento: tipoMovimiento }))) {
          // Conservar la partida, pero exigir revisión si hasta el saldo es idéntico.
          estado = "REVISAR";
          observacion = "Dos filas comparten fecha, monto, serial, descripción y saldo. Revisar ambas contra el banco; ninguna se descarta.";
        } else if (tipoMovimiento === "INGRESO" && existenteProcesado && unidad && !conflictoIdentificacion && !discrepanciaGuardada && !conflictoConPago) {
          estado = "PROTEGIDO_PROCESADO";
          observacion =
            `La transacción ya fue procesada y está protegida. Archivo banco ID ${existente?.id}. ` +
            "Si necesita cambiar el propietario, debe hacerse mediante una corrección controlada del pago.";
        } else if (tipoMovimiento === "INGRESO" && existente && unidad && !estadoEsError(estado) &&
                   !conflictoIdentificacion && !discrepanciaGuardada && !conflictoConPago) {
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
        }

        // La coincidencia con un pago ya contabilizado siempre necesita
        // validación documental; jamás convierte el archivo en un nuevo pago.
        if (tipoMovimiento === "INGRESO" && coincidencia) {
          if (coincidencia.estado === "AMBIGUA") {
            if (!estadoEsError(estado) && estado !== "PROTEGIDO_PROCESADO") estado = "COINCIDENCIA_AMBIGUA";
            observacion += ` ${coincidencia.observacion}`;
          } else if (coincidencia.movimiento) {
            if (!estadoEsError(estado) && estado !== "PROTEGIDO_PROCESADO" && !conflictoConPago) estado = "PAGO_EXISTENTE_REVISAR";
            observacion += ` ${coincidencia.observacion}`;
            if (!unidad && unidadMovimiento && !conflictoIdentificacion && !discrepanciaGuardada) {
              observacion += ` Unidad candidata por pago registrado: ${unidadMovimiento.codigo}; no se asigna automáticamente.`;
            }
          }
        }

        clavesInternas.add(clavePartidaBanco({ fecha_posteo: fecha, monto_transaccion: monto,
          no_serial: noSerial, descripcion, balance_posteo: balancePosteo, tipo_movimiento: tipoMovimiento }));

        return {
          fila_origen: filaOriginal,
          tipo_movimiento: tipoMovimiento,
          descripcion_corta: descripcionCorta,
          balance_posteo: balancePosteo,
          referencia_banco: referenciaBanco,
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
          alias_ids_coincidentes: resolucion?.aliasIds || [],
          evidencia_identificacion: resolucion?.evidencia || "No aplica a egresos",
          candidatos_identificacion: resolucion?.candidatos || [],
          estado,
          observacion,
          archivo_banco_id: existente?.id || null,
          unidad_id_guardada: unidadIdGuardada,
          apartamento_guardado: apartamentoGuardado,
          propietario_guardado: propietarioGuardado,
          requiere_actualizacion: requiereActualizacion,
          existente_procesado: existenteProcesado,
          pago_id: coincidencia?.pago?.id || null,
          movimiento_banco_id: coincidencia?.movimiento?.id || null,
          coincidencia_banco: coincidencia?.estado || "SIN_REGISTRO",
          unidad_id_pago_existente: coincidencia?.pago?.unidad_id || null,
          candidatos_banco: coincidencia?.candidatos || [],
          procesado: existenteProcesado,
        };
      });

      setFilas(resultado);
      const cambiosDetectados = resultado.filter((fila) => fila.estado === "ACTUALIZAR").length;
      const existentesSinCambios = resultado.filter((fila) => fila.estado === "SIN_CAMBIOS").length;
      const protegidos = resultado.filter((fila) => fila.estado === "PROTEGIDO_PROCESADO").length;

      const identificadosLectura = resultado.filter((fila) => fila.tipo_movimiento === "INGRESO" &&
        fila.unidad_id && fila.propietario_id && fila.estado !== "REVISAR" && !estadoEsError(fila.estado)).length;
      const pendientesLectura = resultado.filter((fila) => fila.tipo_movimiento === "INGRESO" &&
        (!fila.unidad_id || fila.estado === "REVISAR" || estadoEsError(fila.estado))).length;
      const debitosLectura = resultado.filter((fila) => fila.tipo_movimiento === "EGRESO").length;
      const pagosExistentes = resultado.filter((fila) => fila.tipo_movimiento === "INGRESO" && fila.pago_id).length;
      setMensaje(`${archivoYaImportado ? "Reimportación: " : "Análisis: "}${resultado.length} movimientos; ` +
        `${identificadosLectura} ingresos con unidad sugerida, ${pendientesLectura} pendientes de identificar y ` +
        `${debitosLectura} egresos para revisión; ${pagosExistentes} con pago existente vinculado internamente. No se han registrado pagos ni gastos.`);
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
        if (filaIndex !== index || fila.tipo_movimiento !== "INGRESO" || fila.existente_procesado || fila.procesado) return fila;

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

        if (fila.unidad_id_pago_existente && unidad.id !== fila.unidad_id_pago_existente) {
          const registrada = unidades.find((item) => item.id === fila.unidad_id_pago_existente);
          return {
            ...fila, unidad_id: null, propietario_id: null, apartamento: "", propietario: "",
            metodo_identificacion: "NO_IDENTIFICADO", confianza_identificacion: 0,
            estado: "REVISAR", requiere_actualizacion: false,
            observacion: `CONFLICTO: seleccionó ${unidad.codigo}, pero el pago existente #${fila.pago_id} pertenece a ${registrada?.codigo || fila.unidad_id_pago_existente}. Revisar comprobante; no se cambió ningún registro.`,
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
          estado: fila.movimiento_banco_id ? "PAGO_EXISTENTE_REVISAR" : fila.archivo_banco_id
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
            : fila.movimiento_banco_id
              ? `Unidad seleccionada para revisión. Pago #${fila.pago_id || "sin verificar"}, movimiento #${fila.movimiento_banco_id}. No conciliar sin comprobante.`
              : "Unidad confirmada manualmente.",
        };
      }),
    );
  }

  function limpiar() {
    setArchivo(null);
    setArchivoHash("");
    setCuentaArchivo("");
    setModalidad(null);
    setFilas([]);
    setFiltroTipo("INGRESO");
    setMensaje("");
    setBitacora([]);

    const input = document.getElementById("archivo-ingresos-bancarios") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  function exportarRevision(soloPendientes = false) {
    if (filas.length === 0) {
      alert("No hay información para exportar.");
      return;
    }

    const movimientos = soloPendientes
      ? filas.filter((fila) => fila.tipo_movimiento === "INGRESO" &&
          (!fila.unidad_id || ["REVISAR", "COINCIDENCIA_AMBIGUA", "PAGO_EXISTENTE_REVISAR"].includes(fila.estado)))
      : filas;
    if (!movimientos.length) { alert("No hay movimientos con ese criterio."); return; }
    const datos = movimientos.map((fila) => ({
      Fila: fila.fila_origen,
      Tipo_movimiento: fila.tipo_movimiento,
      Descripcion_corta: fila.descripcion_corta,
      Balance_posterior: fila.balance_posteo,
      Referencia_banco: fila.referencia_banco,
      Fecha: fila.fecha_posteo,
      Monto: fila.monto_transaccion,
      Serial: fila.no_serial,
      Descripción: fila.descripcion,
      Apartamento_original: fila.apartamento_original,
      Apartamento_identificado: fila.apartamento,
      Propietario: fila.propietario,
      Método_identificación: fila.metodo_identificacion,
      Confianza: fila.confianza_identificacion,
      Alias_ids_coincidentes: fila.alias_ids_coincidentes.join(", "),
      Evidencia_identificacion: fila.evidencia_identificacion,
      Unidades_candidatas: fila.candidatos_identificacion.join(", "),
      Estado: fila.estado,
      Archivo_banco_id: fila.archivo_banco_id,
      Pago_id: fila.pago_id,
      Movimiento_banco_id: fila.movimiento_banco_id,
      Unidad_pago_existente: fila.unidad_id_pago_existente,
      Coincidencia_banco: fila.coincidencia_banco,
      Candidatos_banco: fila.candidatos_banco.join(" | "),
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
      `${soloPendientes ? "pendientes-identificar" : "revision-banco"}-${periodoArchivo}-${marcaTiempoArchivo()}.xlsx`,
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
      const coincideTipo = filtroTipo === "TODOS" ||
        (filtroTipo === "PENDIENTES" ? fila.tipo_movimiento === "INGRESO" &&
          (!fila.unidad_id || fila.estado === "REVISAR" || fila.estado === "PAGO_EXISTENTE_REVISAR" ||
            fila.estado === "COINCIDENCIA_AMBIGUA" || fila.estado === "DUPLICADO_ARCHIVO" ||
            fila.estado === "ERROR_UNIDAD" || fila.estado === "ERROR_PROPIETARIO") : fila.tipo_movimiento === filtroTipo);

      return coincideBusqueda && coincideEstado && coincideTipo;
    });
  }, [filas, busqueda, filtroEstado, filtroTipo]);

  const resumen = useMemo(() => {
    const ingresos = filas.filter((fila) => fila.tipo_movimiento === "INGRESO");
    const egresos = filas.filter((fila) => fila.tipo_movimiento === "EGRESO");
    const identificados = ingresos.filter((fila) => fila.unidad_id && fila.propietario_id &&
       !estadoEsError(fila.estado) && !["REVISAR", "COINCIDENCIA_AMBIGUA", "PAGO_EXISTENTE_REVISAR"].includes(fila.estado));
    const pendientes = ingresos.filter((fila) => !fila.unidad_id || ["REVISAR", "COINCIDENCIA_AMBIGUA", "PAGO_EXISTENTE_REVISAR"].includes(fila.estado) ||
      fila.estado === "DUPLICADO_ARCHIVO" || fila.estado === "ERROR_UNIDAD" || fila.estado === "ERROR_PROPIETARIO");
    return {
      total: ingresos.reduce((sum, fila) => sum + fila.monto_transaccion, 0),
      totalEgresos: egresos.reduce((sum, fila) => sum + fila.monto_transaccion, 0),
      ingresos: ingresos.length,
      egresos: egresos.length,
      registros: filas.length,
      identificados: identificados.length,
      montoIdentificado: identificados.reduce((sum, fila) => sum + fila.monto_transaccion, 0),
      pendientes: pendientes.length,
      montoPendiente: pendientes.reduce((sum, fila) => sum + fila.monto_transaccion, 0),
      procesados: ingresos.filter((fila) => fila.procesado).length,
      pagosExistentes: ingresos.filter((fila) => fila.pago_id).length,
      movimientosExistentes: ingresos.filter((fila) => fila.movimiento_banco_id).length,
      errores: filas.filter((fila) => estadoEsError(fila.estado)).length,
    };
  }, [filas]);

  const cuentaSeleccionada = cuentas.find(
    (cuenta) => cuenta.id === Number(cuentaBancariaId),
  );

  return (
    <PageContainer>
      <ModuleMenu
        title="Banco"
        subtitle="Lectura original de ingresos y egresos; identificación controlada de cuotas."
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
        title="Importar Banco · V1.6 · Verificación y conciliación propuesta"
        subtitle={`Análisis sin escritura de archivos originales. Condominio: ${
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
                  onClick={() => exportarRevision(false)}
                  disabled={filas.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar
                </button>
                <button type="button" onClick={() => exportarRevision(true)}
                  disabled={!filas.some((fila) => fila.tipo_movimiento === "INGRESO" &&
                     (!fila.unidad_id || ["REVISAR", "COINCIDENCIA_AMBIGUA", "PAGO_EXISTENTE_REVISAR"].includes(fila.estado)))}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 disabled:opacity-50">
                  <FileSpreadsheet className="h-4 w-4" /> Exportar sin identificar
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
        <InfoBox label="Movimientos banco" value={String(resumen.registros)} />
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
       <InfoBox label="Pagos existentes (revisar)" value={String(resumen.pagosExistentes)} tone="yellow" />
       <InfoBox label="Movimientos VAM candidatos" value={String(resumen.movimientosExistentes)} tone="blue" />
        <InfoBox label={`Ingresos (${resumen.ingresos})`} value={dinero(resumen.total)} tone="emerald" />
        <InfoBox label={`Egresos (${resumen.egresos})`} value={dinero(resumen.totalEgresos)} tone="yellow" />
      </div>

      <SectionCard
        title="Cargar archivo del banco"
        subtitle="Suba el CSV o Excel original del banco sin plantilla ni cambios; se leen ingresos, débitos y encabezados repetidos."
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
          <InfoLine label="Cuenta detectada en CSV" value={cuentaArchivo ? `••••${cuentaArchivo.slice(-4)}` : "No indicada en archivo"} />
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="text-sm font-black text-amber-900">Control financiero</p>
              <p className="mt-1 text-sm text-amber-800">
                MODO SOLO LECTURA: esta pantalla analiza el archivo, consulta banco_movimientos y pagos existentes, y propone coincidencias. NO guarda archivos, NO crea ingresos, NO procesa pagos ni concilia automáticamente. Revise el comprobante bancario antes de conciliar en el módulo correspondiente.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {filas.length > 0 && (
        <>
          <SectionCard
            title="Revisión de transacciones"
            subtitle="Use Ingresos, Sin identificar o Egresos. Los débitos solo se revisan; nunca se procesan como cuotas."
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
            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-5">
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
                <label className="mb-1 block text-sm font-semibold">Ver movimientos</label>
                <select value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm">
                  <option value="INGRESO">Ingresos</option>
                  <option value="PENDIENTES">Sin identificar</option>
                  <option value="EGRESO">Egresos / cheques</option>
                  <option value="TODOS">Todos</option>
                </select>
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
                  <option value="PAGO_EXISTENTE_REVISAR">Pago existente · comprobar</option>
                  <option value="COINCIDENCIA_AMBIGUA">Coincidencia ambigua</option>
                  <option value="EGRESO_REVISAR">Egreso pendiente de conciliación</option>
                  <option value="ERROR_TIPO">Tipo sin clasificar</option>
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
                  Nuevo análisis
                </button>
              </div>
            </div>

            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-3 text-left">Fila</th>
                  <th className="px-3 py-3 text-left">Fecha</th>
                  <th className="px-3 py-3 text-left">Tipo</th>
                  <th className="px-3 py-3 text-left">Serial / descripción</th>
                  <th className="px-3 py-3 text-left">Apartamento</th>
                  <th className="px-3 py-3 text-left">Propietario</th>
                  <th className="px-3 py-3 text-right">Monto</th>
                  <th className="px-3 py-3 text-right">Balance banco</th>
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
                      <td className={fila.tipo_movimiento === "INGRESO" ? "px-3 py-3 text-emerald-700 font-bold" : "px-3 py-3 text-rose-700 font-bold"}>{fila.tipo_movimiento}</td>
                      <td className="max-w-[300px] px-3 py-3">
                        <p className="font-bold text-slate-800">{fila.no_serial || "Sin serial"}</p>
                        <p className="mt-1 text-xs text-slate-600">{fila.descripcion_corta}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {fila.descripcion || "Sin descripción"}
                        </p>
                      </td>
                      <td className="min-w-[230px] px-3 py-3">
                        <select
                          value={fila.unidad_id || ""}
                          onChange={(event) => cambiarUnidad(indexReal, event.target.value)}
                          disabled={
                            fila.tipo_movimiento !== "INGRESO" ||
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
                        <p className="mt-1 text-xs text-indigo-700">
                          {fila.evidencia_identificacion}
                        </p>
                        {fila.candidatos_identificacion.length > 0 && (
                          <p className="mt-1 text-xs font-bold text-rose-700">
                            Candidatas por alias: {fila.candidatos_identificacion.join(", ")}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">{fila.propietario || "-"}</td>
                      <td className="px-3 py-3 text-right font-black">
                        {dinero(fila.monto_transaccion)}
                      </td>
                      <td className="px-3 py-3 text-right">{fila.balance_posteo === null ? "—" : dinero(fila.balance_posteo)}</td>
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
                          <p className="mt-1 font-bold text-blue-700">
                            Pago existente ID: {fila.pago_id} (NO registrar otra vez)
                          </p>
                        )}
                        {fila.movimiento_banco_id && (
                          <p className="mt-1 font-bold text-blue-700">
                            Movimiento financiero ID: {fila.movimiento_banco_id} - comprobar antes de conciliar
                          </p>
                        )}
                        {fila.candidatos_banco.length > 0 && (
                          <p className="mt-1 text-amber-800">
                            Candidatos VAM: {fila.candidatos_banco.join(" | ")}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </SectionCard>

          <SectionCard title="Apartamentos sin ingreso identificado en ESTE archivo"
            subtitle="La ausencia de identificación en este archivo NO implica mora. Los pagos registrados se muestran como candidatos hasta contrastar comprobantes.">
            <div className="flex flex-wrap gap-2">
              {unidades.filter((unidad) => !filas.some((fila) => fila.tipo_movimiento === "INGRESO" && fila.unidad_id === unidad.id))
                .map((unidad) => <span key={unidad.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-900">
                  {unidad.codigo || `Unidad ${unidad.id}`}
                </span>)}
            </div>
          </SectionCard>

          <SectionCard title="Modo de solo lectura" subtitle="Se consultan datos de VAM y se analiza el archivo sin guardar movimientos, modificar identificaciones ni registrar pagos.">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Verificación exclusivamente. Las unidades elegidas manualmente solo cambian la vista previa de esta pantalla.
              Se consultan archivo_banco, banco_movimientos, pagos, unidades y alias activos. Coincidencia por fecha/importe es una CANDIDATURA, no una conciliación. Use «Exportar pendientes» para revisión documental. No se escribe en Supabase.
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
            description="Analice el CSV original de Banco Popular sin modificarlo. Esta pantalla no registra operaciones en la base de datos."
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
  const esPendiente = ["REVISAR", "EGRESO_REVISAR", "PAGO_EXISTENTE_REVISAR", "COINCIDENCIA_AMBIGUA"].includes(estado);
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
