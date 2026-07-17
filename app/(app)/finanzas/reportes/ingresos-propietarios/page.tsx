"use client";

import Link from "next/link";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  WalletCards,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";

import { supabase } from "@/app/lib/supabaseClient";
import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type Condominio = {
  id: number;
  nombre: string | null;
  rnc: string | null;
  direccion: string | null;
  telefono: string | null;
  logo_url: string | null;
};

type Cuenta = {
  id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
};

type Unidad = {
  id: number;
  condominio_id: number;
  codigo: string | null;
  propietario_id: number | null;
  propietario_nombre: string | null;
  propietario_telefono: string | null;
  activa: boolean | null;
};

type PagoUnidad = {
  id: number;
  codigo: string | null;
  propietario_id: number | null;
  propietario_nombre: string | null;
  propietario_telefono: string | null;
};

type Pago = {
  id: number;
  condominio_id: number;
  unidad_id: number | null;
  cuenta_bancaria_id: number | null;
  fecha_pago: string | null;
  periodo: string | null;
  monto: number | null;
  referencia: string | null;
  metodo: string | null;
  metodo_pago: string | null;
  descripcion: string | null;
  comprobante_url: string | null;
  unidades: PagoUnidad | PagoUnidad[] | null;
};

type MovimientoBanco = {
  id: number;
  cuenta_bancaria_id: number | null;
  fecha_movimiento: string | null;
  periodo: string | null;
  monto: number | null;
  numero_documento: string | null;
  beneficiario: string | null;
  referencia_banco: string | null;
  descripcion: string | null;
  estado_banco: string | null;
};

type ArchivoFila = {
  id: string;
  numeroFila: number;
  fecha: string;
  monto: number;
  referencia: string;
  unidad: string;
  propietario: string;
  descripcion: string;
  metodo: string;
  filaOriginal: Record<string, unknown>;
};

type EstadoArchivo =
  | "CUADRADO"
  | "DIFERENCIA"
  | "SOLO_ARCHIVO"
  | "SOLO_SISTEMA"
  | "POSIBLE_COINCIDENCIA";

type ResultadoComparacion = {
  id: string;
  archivo: ArchivoFila | null;
  pago: Pago | null;
  unidadSistema: PagoUnidad | null;
  estado: EstadoArchivo;
  criterio: string;
  montoArchivo: number;
  montoSistema: number;
  diferencia: number;
  confianza: "ALTA" | "MEDIA" | "NINGUNA";
};

type GrupoPropietario = {
  clave: string;
  unidad_id: number | null;
  unidad: string;
  propietario: string;
  telefono: string;
  cantidadPagos: number;
  totalIngresado: number;
  periodos: string[];
  pagos: Pago[];
};

const MESES = [
  ["01", "Enero"],
  ["02", "Febrero"],
  ["03", "Marzo"],
  ["04", "Abril"],
  ["05", "Mayo"],
  ["06", "Junio"],
  ["07", "Julio"],
  ["08", "Agosto"],
  ["09", "Septiembre"],
  ["10", "Octubre"],
  ["11", "Noviembre"],
  ["12", "Diciembre"],
] as const;

const ALIASES = {
  fecha: [
    "fecha",
    "fecha posteo",
    "fecha de posteo",
    "fecha transaccion",
    "fecha transacción",
    "fecha movimiento",
    "fecha de movimiento",
    "fecha pago",
    "fecha de pago",
  ],
  monto: [
    "monto",
    "monto transaccion",
    "monto transacción",
    "valor",
    "importe",
    "credito",
    "crédito",
    "ingreso",
    "deposito",
    "depósito",
  ],
  referencia: [
    "referencia",
    "referencia bancaria",
    "no serial",
    "nro serial",
    "numero serial",
    "número serial",
    "serial",
    "numero documento",
    "número documento",
    "documento",
    "comprobante",
  ],
  unidad: [
    "unidad",
    "codigo unidad",
    "código unidad",
    "apartamento",
    "apto",
    "inmueble",
    "casa",
    "local",
  ],
  propietario: [
    "propietario",
    "nombre propietario",
    "nombre del propietario",
    "titular",
    "residente",
    "cliente",
    "beneficiario",
  ],
  descripcion: [
    "descripcion",
    "descripción",
    "concepto",
    "detalle",
    "comentario",
    "observacion",
    "observación",
    "narrativa",
  ],
  metodo: [
    "metodo",
    "método",
    "metodo pago",
    "método pago",
    "forma pago",
    "forma de pago",
    "tipo transaccion",
    "tipo transacción",
  ],
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaCorta(valor: string | null | undefined) {
  if (!valor) return "-";
  const partes = String(valor).split("T")[0].split("-");
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : String(valor);
}

function fechaISO(valor: string | null | undefined) {
  return valor ? String(valor).split("T")[0] : "";
}

function normalizar(valor: unknown) {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function claveCampo(valor: unknown) {
  return normalizar(valor).replace(/[^A-Z0-9]/g, "");
}

function relacion<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? valor[0] || null : valor;
}

function nombreMes(mes: string) {
  return MESES.find(([valor]) => valor === mes)?.[1] || mes;
}

function fechaInicio(anio: string, mes: string) {
  return `${anio}-${mes}-01`;
}

function fechaFinExclusiva(anio: string, mes: string) {
  const siguiente = new Date(Number(anio), Number(mes), 1);
  return `${siguiente.getFullYear()}-${String(
    siguiente.getMonth() + 1,
  ).padStart(2, "0")}-01`;
}

function metodoPago(pago: Pago) {
  return pago.metodo_pago || pago.metodo || "-";
}

function nombreArchivoSeguro(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseMonto(valor: unknown) {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;

  let texto = String(valor ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/RD\$/gi, "")
    .replace(/DOP/gi, "")
    .replace(/[^\d,.-]/g, "");

  if (!texto) return 0;

  const tieneComa = texto.includes(",");
  const tienePunto = texto.includes(".");

  if (tieneComa && tienePunto) {
    if (texto.lastIndexOf(",") > texto.lastIndexOf(".")) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else {
      texto = texto.replace(/,/g, "");
    }
  } else if (tieneComa) {
    const decimales = texto.split(",").pop()?.length || 0;
    texto = decimales === 2 ? texto.replace(",", ".") : texto.replace(/,/g, "");
  } else if (tienePunto) {
    const partes = texto.split(".");
    if (partes.length > 2) {
      const ultimo = partes.pop() || "0";
      texto =
        ultimo.length === 2
          ? `${partes.join("")}.${ultimo}`
          : `${partes.join("")}${ultimo}`;
    }
  }

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}

function parseFecha(valor: unknown) {
  if (!valor && valor !== 0) return "";

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(valor.getDate()).padStart(2, "0")}`;
  }

  if (typeof valor === "number" && valor > 20000) {
    const fechaExcel = XLSX.SSF.parse_date_code(valor);

    if (fechaExcel) {
      return `${fechaExcel.y}-${String(fechaExcel.m).padStart(2, "0")}-${String(
        fechaExcel.d,
      ).padStart(2, "0")}`;
    }
  }

  const texto = String(valor).trim();
  if (!texto) return "";

  const iso = texto.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }

  const latino = texto.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (latino) {
    const anio = latino[3].length === 2 ? `20${latino[3]}` : latino[3];
    return `${anio}-${latino[2].padStart(2, "0")}-${latino[1].padStart(
      2,
      "0",
    )}`;
  }

  const fecha = new Date(texto);
  if (!Number.isNaN(fecha.getTime())) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(fecha.getDate()).padStart(2, "0")}`;
  }

  return "";
}

function buscarValor(
  fila: Record<string, unknown>,
  aliases: readonly string[],
): unknown {
  const mapa = new Map(
    Object.entries(fila).map(([campo, valor]) => [claveCampo(campo), valor]),
  );

  for (const alias of aliases) {
    const encontrado = mapa.get(claveCampo(alias));
    if (encontrado !== undefined && String(encontrado).trim() !== "") {
      return encontrado;
    }
  }

  return "";
}

function contieneIdentidad(texto: string, identidad: string) {
  const base = normalizar(texto);
  const buscado = normalizar(identidad);

  if (!base || !buscado) return false;
  if (base.includes(buscado)) return true;

  const palabras = buscado
    .split(" ")
    .filter((palabra) => palabra.length >= 4)
    .slice(0, 3);

  return (
    palabras.length >= 2 && palabras.every((palabra) => base.includes(palabra))
  );
}

function estadoTexto(estado: EstadoArchivo) {
  const textos: Record<EstadoArchivo, string> = {
    CUADRADO: "Cuadrado",
    DIFERENCIA: "Diferencia",
    SOLO_ARCHIVO: "En archivo, no en VAM",
    SOLO_SISTEMA: "En VAM, no en archivo",
    POSIBLE_COINCIDENCIA: "Posible coincidencia",
  };

  return textos[estado];
}

function estadoClase(estado: EstadoArchivo) {
  const clases: Record<EstadoArchivo, string> = {
    CUADRADO: "border-emerald-200 bg-emerald-50 text-emerald-700",
    DIFERENCIA: "border-red-200 bg-red-50 text-red-700",
    SOLO_ARCHIVO: "border-amber-200 bg-amber-50 text-amber-800",
    SOLO_SISTEMA: "border-violet-200 bg-violet-50 text-violet-800",
    POSIBLE_COINCIDENCIA: "border-blue-200 bg-blue-50 text-blue-800",
  };

  return clases[estado];
}

export default function IngresosPropietariosMensualPage() {
  const hoy = new Date();
  const inputArchivoRef = useRef<HTMLInputElement | null>(null);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombreLocal, setCondominioNombreLocal] = useState("");
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [anioFiltro, setAnioFiltro] = useState(String(hoy.getFullYear()));
  const [mesFiltro, setMesFiltro] = useState(
    String(hoy.getMonth() + 1).padStart(2, "0"),
  );
  const [cuentaFiltro, setCuentaFiltro] = useState("");

  const [anioReporte, setAnioReporte] = useState(String(hoy.getFullYear()));
  const [mesReporte, setMesReporte] = useState(
    String(hoy.getMonth() + 1).padStart(2, "0"),
  );
  const [cuentaReporte, setCuentaReporte] = useState("");

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoBanco[]>([]);

  const [archivoNombre, setArchivoNombre] = useState("");
  const [archivoFilas, setArchivoFilas] = useState<ArchivoFila[]>([]);
  const [archivoColumnas, setArchivoColumnas] = useState<string[]>([]);
  const [archivoError, setArchivoError] = useState("");
  const [archivoFueraPeriodo, setArchivoFueraPeriodo] = useState(0);
  const [archivoSinMonto, setArchivoSinMonto] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [procesandoArchivo, setProcesandoArchivo] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [fechaGeneracion, setFechaGeneracion] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombreLocal(nombre);

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      setLoading(false);
      return;
    }

    void inicializar(id);
  }, []);

  async function inicializar(id: string) {
    setLoading(true);

    const [condominioResp, cuentasResp, unidadesResp] = await Promise.all([
      supabase
        .from("condominios")
        .select("id, nombre, rnc, direccion, telefono, logo_url")
        .eq("id", Number(id))
        .maybeSingle(),
      supabase
        .from("cuentas_bancarias")
        .select("id, nombre_banco, numero_cuenta")
        .eq("condominio_id", Number(id))
        .eq("activa", true)
        .order("nombre_banco"),
      supabase
        .from("unidades")
        .select(
          "id, condominio_id, codigo, propietario_id, propietario_nombre, propietario_telefono, activa",
        )
        .eq("condominio_id", Number(id))
        .eq("activa", true)
        .order("codigo"),
    ]);

    if (condominioResp.error || cuentasResp.error || unidadesResp.error) {
      setMensaje(
        condominioResp.error?.message ||
          cuentasResp.error?.message ||
          unidadesResp.error?.message ||
          "No se pudieron cargar los datos iniciales.",
      );
      setLoading(false);
      return;
    }

    setCondominio((condominioResp.data as Condominio | null) || null);
    setCuentas((cuentasResp.data as Cuenta[]) || []);
    setUnidades((unidadesResp.data as Unidad[]) || []);

    await cargarReporte(id, anioFiltro, mesFiltro, cuentaFiltro, false);
  }

  async function cargarReporte(
    id: string,
    anio: string,
    mes: string,
    cuentaId: string,
    cambiarPeriodo = true,
  ) {
    if (!id || !anio || !mes) return;

    setLoading(true);
    setMensaje("");

    const desde = fechaInicio(anio, mes);
    const hasta = fechaFinExclusiva(anio, mes);
    const periodo = `${anio}-${mes}`;

    let pagosQuery = supabase
      .from("pagos")
      .select(
        `
        id,
        condominio_id,
        unidad_id,
        cuenta_bancaria_id,
        fecha_pago,
        periodo,
        monto,
        referencia,
        metodo,
        metodo_pago,
        descripcion,
        comprobante_url,
        unidades (
          id,
          codigo,
          propietario_id,
          propietario_nombre,
          propietario_telefono
        )
      `,
      )
      .eq("condominio_id", Number(id))
      .gte("fecha_pago", desde)
      .lt("fecha_pago", hasta)
      .order("fecha_pago")
      .order("id");

    let bancoQuery = supabase
      .from("banco_movimientos")
      .select(
        "id, cuenta_bancaria_id, fecha_movimiento, periodo, monto, numero_documento, beneficiario, referencia_banco, descripcion, estado_banco",
      )
      .eq("condominio_id", Number(id))
      .eq("periodo", periodo)
      .eq("tipo_movimiento", "INGRESO")
      .eq("origen", "PAGO_PROPIETARIO")
      .order("fecha_movimiento")
      .order("id");

    if (cuentaId) {
      pagosQuery = pagosQuery.eq("cuenta_bancaria_id", Number(cuentaId));
      bancoQuery = bancoQuery.eq("cuenta_bancaria_id", Number(cuentaId));
    }

    const [pagosResp, bancoResp] = await Promise.all([pagosQuery, bancoQuery]);

    if (pagosResp.error || bancoResp.error) {
      setMensaje(
        pagosResp.error?.message ||
          bancoResp.error?.message ||
          "No se pudo cargar el reporte.",
      );
      setLoading(false);
      return;
    }

    setPagos((pagosResp.data || []) as unknown as Pago[]);
    setMovimientos(
      ((bancoResp.data || []) as MovimientoBanco[]).filter(
        (item) => normalizar(item.estado_banco) !== "ANULADO",
      ),
    );

    if (cambiarPeriodo) {
      setAnioReporte(anio);
      setMesReporte(mes);
      setCuentaReporte(cuentaId);
      limpiarArchivo();
    }

    setFechaGeneracion(
      new Date().toLocaleString("es-DO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    );
    setLoading(false);
  }

  async function procesarArchivo(archivo: File) {
    const extension = archivo.name.split(".").pop()?.toLowerCase();

    if (!extension || !["xlsx", "xls", "csv"].includes(extension)) {
      setArchivoError("Formato no permitido. Utilice XLSX, XLS o CSV.");
      return;
    }

    setProcesandoArchivo(true);
    setArchivoError("");

    try {
      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      const primeraHoja = libro.SheetNames[0];
      const hoja = libro.Sheets[primeraHoja];
      const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
        defval: "",
        raw: true,
      });

      if (filas.length === 0) {
        throw new Error("El archivo no contiene registros.");
      }

      const columnas = Object.keys(filas[0] || {});
      const tieneMonto = columnas.some((campo) =>
        ALIASES.monto.some((alias) => claveCampo(alias) === claveCampo(campo)),
      );

      if (!tieneMonto) {
        throw new Error(
          "No se encontró una columna de monto. Puede llamarse Monto, Monto Transacción, Valor, Importe, Crédito o Ingreso.",
        );
      }

      let fueraPeriodo = 0;
      let sinMonto = 0;

      const filasNormalizadas = filas
        .map((fila, index): ArchivoFila | null => {
          const fecha = parseFecha(buscarValor(fila, ALIASES.fecha));
          const monto = parseMonto(buscarValor(fila, ALIASES.monto));

          if (monto <= 0) {
            sinMonto += 1;
            return null;
          }

          if (
            fecha &&
            (fecha.slice(0, 4) !== anioReporte ||
              fecha.slice(5, 7) !== mesReporte)
          ) {
            fueraPeriodo += 1;
            return null;
          }

          return {
            id: `ARCHIVO-${index + 2}`,
            numeroFila: index + 2,
            fecha,
            monto,
            referencia: String(
              buscarValor(fila, ALIASES.referencia) || "",
            ).trim(),
            unidad: String(buscarValor(fila, ALIASES.unidad) || "").trim(),
            propietario: String(
              buscarValor(fila, ALIASES.propietario) || "",
            ).trim(),
            descripcion: String(
              buscarValor(fila, ALIASES.descripcion) || "",
            ).trim(),
            metodo: String(buscarValor(fila, ALIASES.metodo) || "").trim(),
            filaOriginal: fila,
          };
        })
        .filter((fila): fila is ArchivoFila => Boolean(fila));

      if (filasNormalizadas.length === 0) {
        throw new Error(
          "No quedaron ingresos válidos para el período seleccionado.",
        );
      }

      setArchivoNombre(archivo.name);
      setArchivoFilas(filasNormalizadas);
      setArchivoColumnas(columnas);
      setArchivoFueraPeriodo(fueraPeriodo);
      setArchivoSinMonto(sinMonto);
    } catch (error) {
      setArchivoError(
        error instanceof Error
          ? error.message
          : "No se pudo procesar el archivo.",
      );
      setArchivoNombre("");
      setArchivoFilas([]);
      setArchivoColumnas([]);
    } finally {
      setProcesandoArchivo(false);
    }
  }

  function seleccionarArchivo(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    if (archivo) void procesarArchivo(archivo);
  }

  function soltarArchivo(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastrando(false);

    const archivo = event.dataTransfer.files?.[0];
    if (archivo) void procesarArchivo(archivo);
  }

  function limpiarArchivo() {
    setArchivoNombre("");
    setArchivoFilas([]);
    setArchivoColumnas([]);
    setArchivoError("");
    setArchivoFueraPeriodo(0);
    setArchivoSinMonto(0);

    if (inputArchivoRef.current) {
      inputArchivoRef.current.value = "";
    }
  }

  const comparacion = useMemo<ResultadoComparacion[]>(() => {
    if (archivoFilas.length === 0) return [];

    const pagosUsados = new Set<number>();
    const resultados: ResultadoComparacion[] = [];

    function crearResultado(
      archivo: ArchivoFila,
      pago: Pago | null,
      estado: EstadoArchivo,
      criterio: string,
      confianza: "ALTA" | "MEDIA" | "NINGUNA",
    ) {
      const montoSistema = Number(pago?.monto || 0);
      resultados.push({
        id: `${archivo.id}-${pago?.id || "SIN-SISTEMA"}`,
        archivo,
        pago,
        unidadSistema: pago ? relacion(pago.unidades) : null,
        estado,
        criterio,
        montoArchivo: archivo.monto,
        montoSistema,
        diferencia: archivo.monto - montoSistema,
        confianza,
      });

      if (pago) pagosUsados.add(pago.id);
    }

    for (const fila of archivoFilas) {
      const disponibles = pagos.filter((pago) => !pagosUsados.has(pago.id));
      const refArchivo = normalizar(fila.referencia);

      let pago =
        refArchivo.length >= 3
          ? disponibles.find(
              (item) => normalizar(item.referencia) === refArchivo,
            ) || null
          : null;

      if (pago) {
        const diferencia = fila.monto - Number(pago.monto || 0);
        crearResultado(
          fila,
          pago,
          Math.abs(diferencia) < 0.01 ? "CUADRADO" : "DIFERENCIA",
          "Referencia exacta",
          "ALTA",
        );
        continue;
      }

      const unidadArchivo = normalizar(fila.unidad);

      if (unidadArchivo) {
        pago =
          disponibles.find((item) => {
            const unidad = relacion(item.unidades);
            return normalizar(unidad?.codigo) === unidadArchivo;
          }) || null;

        if (pago) {
          const diferencia = fila.monto - Number(pago.monto || 0);
          crearResultado(
            fila,
            pago,
            Math.abs(diferencia) < 0.01 ? "CUADRADO" : "DIFERENCIA",
            "Unidad exacta",
            "ALTA",
          );
          continue;
        }
      }

      const descripcionCompleta = `${fila.descripcion} ${fila.propietario}`;
      const candidatosUnidad = disponibles.filter((item) => {
        const unidad = relacion(item.unidades);
        return (
          Boolean(unidad?.codigo) &&
          contieneIdentidad(descripcionCompleta, unidad?.codigo || "")
        );
      });

      pago =
        candidatosUnidad.find(
          (item) => Math.abs(fila.monto - Number(item.monto || 0)) < 0.01,
        ) ||
        candidatosUnidad[0] ||
        null;

      if (pago) {
        const diferencia = fila.monto - Number(pago.monto || 0);
        crearResultado(
          fila,
          pago,
          Math.abs(diferencia) < 0.01 ? "POSIBLE_COINCIDENCIA" : "DIFERENCIA",
          "Unidad detectada en la descripción",
          Math.abs(diferencia) < 0.01 ? "MEDIA" : "ALTA",
        );
        continue;
      }

      const propietarioArchivo = normalizar(fila.propietario);

      if (propietarioArchivo) {
        const candidatosPropietario = disponibles.filter((item) => {
          const unidad = relacion(item.unidades);
          return contieneIdentidad(
            unidad?.propietario_nombre || "",
            propietarioArchivo,
          );
        });

        pago =
          candidatosPropietario.find(
            (item) => Math.abs(fila.monto - Number(item.monto || 0)) < 0.01,
          ) || null;

        if (pago) {
          crearResultado(
            fila,
            pago,
            "POSIBLE_COINCIDENCIA",
            "Nombre del propietario y monto",
            "MEDIA",
          );
          continue;
        }
      }

      const porDescripcion = disponibles.find((item) => {
        const unidad = relacion(item.unidades);
        return (
          Math.abs(fila.monto - Number(item.monto || 0)) < 0.01 &&
          contieneIdentidad(
            descripcionCompleta,
            unidad?.propietario_nombre || "",
          )
        );
      });

      if (porDescripcion) {
        crearResultado(
          fila,
          porDescripcion,
          "POSIBLE_COINCIDENCIA",
          "Propietario detectado en la descripción y monto",
          "MEDIA",
        );
        continue;
      }

      crearResultado(
        fila,
        null,
        "SOLO_ARCHIVO",
        "No existe coincidencia en VAM",
        "NINGUNA",
      );
    }

    pagos
      .filter((pago) => !pagosUsados.has(pago.id))
      .forEach((pago) => {
        resultados.push({
          id: `SISTEMA-${pago.id}`,
          archivo: null,
          pago,
          unidadSistema: relacion(pago.unidades),
          estado: "SOLO_SISTEMA",
          criterio: "Pago registrado en VAM no encontrado en el archivo",
          montoArchivo: 0,
          montoSistema: Number(pago.monto || 0),
          diferencia: 0 - Number(pago.monto || 0),
          confianza: "NINGUNA",
        });
      });

    return resultados;
  }, [archivoFilas, pagos]);

  const resumenComparacion = useMemo(() => {
    const totalArchivo = archivoFilas.reduce(
      (total, fila) => total + fila.monto,
      0,
    );
    const totalSistema = pagos.reduce(
      (total, pago) => total + Number(pago.monto || 0),
      0,
    );

    return {
      totalArchivo,
      totalSistema,
      diferencia: totalArchivo - totalSistema,
      cuadrados: comparacion.filter((item) => item.estado === "CUADRADO")
        .length,
      diferencias: comparacion.filter((item) => item.estado === "DIFERENCIA")
        .length,
      soloArchivo: comparacion.filter((item) => item.estado === "SOLO_ARCHIVO")
        .length,
      soloSistema: comparacion.filter((item) => item.estado === "SOLO_SISTEMA")
        .length,
      posibles: comparacion.filter(
        (item) => item.estado === "POSIBLE_COINCIDENCIA",
      ).length,
    };
  }, [archivoFilas, pagos, comparacion]);

  const comparacionFiltrada = useMemo(() => {
    const texto = normalizar(busqueda);

    return comparacion.filter((item) => {
      if (estadoFiltro !== "TODOS" && item.estado !== estadoFiltro) {
        return false;
      }

      if (!texto) return true;

      const contenido = [
        item.archivo?.referencia,
        item.archivo?.unidad,
        item.archivo?.propietario,
        item.archivo?.descripcion,
        item.pago?.referencia,
        item.unidadSistema?.codigo,
        item.unidadSistema?.propietario_nombre,
        item.criterio,
      ]
        .map(normalizar)
        .join(" ");

      return contenido.includes(texto);
    });
  }, [comparacion, busqueda, estadoFiltro]);

  const gruposPropietarios = useMemo<GrupoPropietario[]>(() => {
    const mapa = new Map<string, GrupoPropietario>();

    pagos.forEach((pago) => {
      const unidad = relacion(pago.unidades);
      const clave = pago.unidad_id
        ? `UNIDAD-${pago.unidad_id}`
        : `PAGO-${pago.id}`;

      const grupo =
        mapa.get(clave) ||
        ({
          clave,
          unidad_id: pago.unidad_id,
          unidad: unidad?.codigo || `Unidad ${pago.unidad_id || "sin asignar"}`,
          propietario:
            unidad?.propietario_nombre || "Propietario no identificado",
          telefono: unidad?.propietario_telefono || "-",
          cantidadPagos: 0,
          totalIngresado: 0,
          periodos: [],
          pagos: [],
        } satisfies GrupoPropietario);

      grupo.cantidadPagos += 1;
      grupo.totalIngresado += Number(pago.monto || 0);
      grupo.pagos.push(pago);

      if (pago.periodo) {
        grupo.periodos.push(
          ...String(pago.periodo)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        );
        grupo.periodos = Array.from(new Set(grupo.periodos)).sort();
      }

      mapa.set(clave, grupo);
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.unidad.localeCompare(b.unidad, "es", { numeric: true }),
    );
  }, [pagos]);

  const unidadesConPago = useMemo(
    () =>
      new Set(
        gruposPropietarios
          .map((grupo) => grupo.unidad_id)
          .filter((id): id is number => Boolean(id)),
      ),
    [gruposPropietarios],
  );

  const unidadesSinIngresos = useMemo(
    () => unidades.filter((unidad) => !unidadesConPago.has(unidad.id)),
    [unidades, unidadesConPago],
  );

  const totalSistemaMes = pagos.reduce(
    (total, pago) => total + Number(pago.monto || 0),
    0,
  );

  const totalControlBanco = movimientos.reduce(
    (total, item) => total + Number(item.monto || 0),
    0,
  );

  const propietariosConIngresos = new Set(
    gruposPropietarios.map(
      (grupo) =>
        grupo.unidad_id ||
        `${normalizar(grupo.unidad)}-${normalizar(grupo.propietario)}`,
    ),
  ).size;

  const nombreCondominio =
    condominio?.nombre || condominioNombreLocal || "Condominio no identificado";

  const cuentaSeleccionada = cuentas.find(
    (cuenta) => String(cuenta.id) === cuentaReporte,
  );

  function exportarExcel() {
    const resumen = [
      {
        Condominio: nombreCondominio,
        Período: `${nombreMes(mesReporte)} ${anioReporte}`,
        Archivo: archivoNombre || "No cargado",
        "Total archivo RD$": resumenComparacion.totalArchivo,
        "Total VAM RD$": resumenComparacion.totalSistema,
        "Diferencia RD$": resumenComparacion.diferencia,
        Cuadrados: resumenComparacion.cuadrados,
        "Con diferencia": resumenComparacion.diferencias,
        "En archivo no en VAM": resumenComparacion.soloArchivo,
        "En VAM no en archivo": resumenComparacion.soloSistema,
        "Posibles coincidencias": resumenComparacion.posibles,
      },
    ];

    const detalleComparacion = comparacion.map((item) => ({
      Estado: estadoTexto(item.estado),
      Criterio: item.criterio,
      Confianza: item.confianza,
      "Fila archivo": item.archivo?.numeroFila || "",
      "Fecha archivo": fechaCorta(item.archivo?.fecha),
      "Referencia archivo": item.archivo?.referencia || "",
      "Unidad archivo": item.archivo?.unidad || "",
      "Propietario archivo": item.archivo?.propietario || "",
      "Descripción archivo": item.archivo?.descripcion || "",
      "Monto archivo RD$": item.montoArchivo,
      "Pago VAM ID": item.pago?.id || "",
      "Fecha VAM": fechaCorta(item.pago?.fecha_pago),
      "Referencia VAM": item.pago?.referencia || "",
      "Unidad VAM": item.unidadSistema?.codigo || "",
      "Propietario VAM": item.unidadSistema?.propietario_nombre || "",
      "Monto VAM RD$": item.montoSistema,
      "Diferencia RD$": item.diferencia,
    }));

    const porPropietario = gruposPropietarios.map((grupo) => ({
      Unidad: grupo.unidad,
      Propietario: grupo.propietario,
      Teléfono: grupo.telefono,
      Pagos: grupo.cantidadPagos,
      "Períodos aplicados": grupo.periodos.join(", "),
      "Total ingresado RD$": grupo.totalIngresado,
    }));

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(resumen),
      "Resumen validación",
    );
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(detalleComparacion),
      "Comparación archivo VAM",
    );
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(porPropietario),
      "Ingresos por propietario",
    );

    XLSX.writeFile(
      libro,
      `Validacion_Ingresos_${nombreArchivoSeguro(
        nombreCondominio,
      )}_${anioReporte}_${mesReporte}.xlsx`,
    );
  }

  function imprimir() {
    setFechaGeneracion(
      new Date().toLocaleString("es-DO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    );

    window.setTimeout(() => window.print(), 100);
  }

  return (
    <PageContainer>
      <div className="no-print">
        <ModuleMenu
          title="Ingresos de Propietarios"
          subtitle="Consulta mensual y validación inteligente contra archivos identificados."
          tone="green"
          items={[
            {
              href: "/pagos-mantenimiento",
              label: "Registrar pagos",
              icon: WalletCards,
            },
            {
              href: "/finanzas/reportes/ingresos-propietarios",
              label: "Ingresos por mes",
              icon: FileSpreadsheet,
            },
            {
              href: "/finanzas/pagos/cuadre-propietario",
              label: "Cuadre propietario",
              icon: CheckCircle2,
            },
            {
              href: "/finanzas/control-bancario",
              label: "Control bancario",
              icon: Banknote,
            },
          ]}
        />

        <ModuleToolbar
          title="Ingresos mensuales por propietarios"
          subtitle={`Archivo identificado vs. pagos registrados. Condominio: ${nombreCondominio}.`}
          icon={Sparkles}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void cargarReporte(
                    condominioId,
                    anioReporte,
                    mesReporte,
                    cuentaReporte,
                    false,
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>

              <button
                type="button"
                onClick={exportarExcel}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
              >
                <Download className="h-4 w-4" />
                Exportar validación
              </button>

              <button
                type="button"
                onClick={imprimir}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                <Printer className="h-4 w-4" />
                Imprimir / PDF
              </button>
            </div>
          }
        />

        {mensaje && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {mensaje}
          </div>
        )}

        <SectionCard
          title="1. Seleccionar período"
          subtitle="El sistema consultará los pagos recibidos en VAM durante ese mes."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
            <div>
              <label className="mb-1 block text-sm font-bold">Año</label>
              <select
                value={anioFiltro}
                onChange={(event) => setAnioFiltro(event.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3"
              >
                {Array.from({ length: 8 }, (_, index) => {
                  const anio = hoy.getFullYear() - 5 + index;
                  return (
                    <option key={anio} value={anio}>
                      {anio}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">Mes</label>
              <select
                value={mesFiltro}
                onChange={(event) => setMesFiltro(event.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3"
              >
                {MESES.map(([valor, nombre]) => (
                  <option key={valor} value={valor}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">
                Cuenta bancaria
              </label>
              <select
                value={cuentaFiltro}
                onChange={(event) => setCuentaFiltro(event.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3"
              >
                <option value="">Todas las cuentas</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.nombre_banco} · {cuenta.numero_cuenta}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void cargarReporte(
                  condominioId,
                  anioFiltro,
                  mesFiltro,
                  cuentaFiltro,
                  true,
                )
              }
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 font-black text-white disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {loading ? "Consultando..." : "Consultar ingresos"}
            </button>
          </div>
        </SectionCard>

        <div className="mt-5">
          <SectionCard
            title="2. Subir archivo identificado"
            subtitle="Admite Excel o CSV. Reconoce automáticamente columnas como Fecha, Monto Transacción, No. Serial, Unidad, Propietario y Descripción."
            action={
              archivoNombre ? (
                <button
                  type="button"
                  onClick={limpiarArchivo}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Quitar archivo
                </button>
              ) : null
            }
          >
            <input
              ref={inputArchivoRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={seleccionarArchivo}
              className="hidden"
            />

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={soltarArchivo}
              onClick={() => inputArchivoRef.current?.click()}
              className={`cursor-pointer rounded-3xl border-2 border-dashed p-8 text-center transition ${
                arrastrando
                  ? "border-blue-500 bg-blue-50"
                  : archivoNombre
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              {procesandoArchivo ? (
                <>
                  <RefreshCw className="mx-auto h-10 w-10 animate-spin text-blue-700" />
                  <p className="mt-3 font-black">Analizando archivo...</p>
                </>
              ) : archivoNombre ? (
                <>
                  <FileCheck2 className="mx-auto h-11 w-11 text-emerald-700" />
                  <p className="mt-3 text-lg font-black text-emerald-900">
                    {archivoNombre}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    {archivoFilas.length} ingresos válidos cargados
                  </p>
                </>
              ) : (
                <>
                  <UploadCloud className="mx-auto h-11 w-11 text-slate-500" />
                  <p className="mt-3 text-lg font-black text-slate-800">
                    Arrastre el archivo aquí o haga clic para seleccionarlo
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Formatos permitidos: XLSX, XLS y CSV
                  </p>
                </>
              )}
            </div>

            {archivoError && (
              <div className="mt-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <XCircle className="h-5 w-5 shrink-0" />
                <p className="font-bold">{archivoError}</p>
              </div>
            )}

            {archivoNombre && (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Columnas detectadas
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {archivoColumnas.join(" · ")}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase text-amber-700">
                    Filas fuera del período
                  </p>
                  <p className="mt-2 text-2xl font-black text-amber-800">
                    {archivoFueraPeriodo}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-600">
                    Filas sin monto válido
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-800">
                    {archivoSinMonto}
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-7">
          <Indicador
            titulo="Total archivo identificado"
            valor={`RD$ ${dinero(resumenComparacion.totalArchivo)}`}
            clase="border-blue-300 bg-blue-50 text-blue-900 ring-2 ring-blue-300"
          />
          <Indicador
            titulo="Total registrado en VAM"
            valor={`RD$ ${dinero(totalSistemaMes)}`}
            clase="border-emerald-300 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-300"
          />
          <Indicador
            titulo="Diferencia archivo vs. VAM"
            valor={`RD$ ${dinero(resumenComparacion.diferencia)}`}
            clase={
              Math.abs(resumenComparacion.diferencia) < 0.01
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }
          />
          <Indicador
            titulo="Cuadrados"
            valor={String(resumenComparacion.cuadrados)}
            clase="border-emerald-200 bg-white text-emerald-800"
          />
          <Indicador
            titulo="Con diferencia"
            valor={String(resumenComparacion.diferencias)}
            clase="border-red-200 bg-red-50 text-red-800"
          />
          <Indicador
            titulo="Archivo no está en VAM"
            valor={String(resumenComparacion.soloArchivo)}
            clase="border-amber-200 bg-amber-50 text-amber-800"
          />
          <Indicador
            titulo="VAM no está en archivo"
            valor={String(resumenComparacion.soloSistema)}
            clase="border-violet-200 bg-violet-50 text-violet-800"
          />
        </div>

        {archivoNombre && (
          <div className="mt-5">
            <SectionCard
              title="3. Resultado de la validación inteligente"
              subtitle="Las coincidencias por referencia o unidad son de confianza alta. Las coincidencias por nombre o descripción requieren revisión."
            >
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_230px]">
                <input
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar propietario, unidad, referencia o descripción..."
                  className="rounded-xl border px-4 py-3"
                />

                <select
                  value={estadoFiltro}
                  onChange={(event) => setEstadoFiltro(event.target.value)}
                  className="rounded-xl border bg-white px-4 py-3"
                >
                  <option value="TODOS">Todos los resultados</option>
                  <option value="CUADRADO">Cuadrados</option>
                  <option value="DIFERENCIA">Con diferencia</option>
                  <option value="SOLO_ARCHIVO">En archivo, no en VAM</option>
                  <option value="SOLO_SISTEMA">En VAM, no en archivo</option>
                  <option value="POSIBLE_COINCIDENCIA">
                    Posibles coincidencias
                  </option>
                </select>
              </div>

              {resumenComparacion.posibles > 0 && (
                <div className="mb-4 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <p>
                    Hay <strong>{resumenComparacion.posibles}</strong> posibles
                    coincidencias. El sistema las detectó por nombre, unidad en
                    la descripción o monto, pero no las considera confirmadas
                    automáticamente.
                  </p>
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border">
                <table className="min-w-[1450px] w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-3 py-3 text-center">Estado</th>
                      <th className="px-3 py-3 text-left">Criterio</th>
                      <th className="px-3 py-3 text-left">Fecha archivo</th>
                      <th className="px-3 py-3 text-left">
                        Referencia archivo
                      </th>
                      <th className="px-3 py-3 text-left">Unidad archivo</th>
                      <th className="px-3 py-3 text-left">
                        Propietario archivo
                      </th>
                      <th className="px-3 py-3 text-right">Monto archivo</th>
                      <th className="px-3 py-3 text-left">Unidad VAM</th>
                      <th className="px-3 py-3 text-left">Propietario VAM</th>
                      <th className="px-3 py-3 text-left">Referencia VAM</th>
                      <th className="px-3 py-3 text-right">Monto VAM</th>
                      <th className="px-3 py-3 text-right">Diferencia</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {comparacionFiltrada.map((item) => (
                      <tr key={item.id} className="bg-white hover:bg-slate-50">
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${estadoClase(
                              item.estado,
                            )}`}
                          >
                            {estadoTexto(item.estado)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-bold">{item.criterio}</p>
                          <p className="text-xs text-slate-500">
                            Confianza: {item.confianza}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          {fechaCorta(item.archivo?.fecha)}
                        </td>
                        <td className="px-3 py-3 font-semibold">
                          {item.archivo?.referencia || "-"}
                        </td>
                        <td className="px-3 py-3">
                          {item.archivo?.unidad || "-"}
                        </td>
                        <td className="max-w-[220px] px-3 py-3">
                          <p>{item.archivo?.propietario || "-"}</p>
                          {item.archivo?.descripcion && (
                            <p className="mt-1 text-xs text-slate-500">
                              {item.archivo.descripcion}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-black text-blue-800">
                          RD$ {dinero(item.montoArchivo)}
                        </td>
                        <td className="px-3 py-3 font-bold">
                          {item.unidadSistema?.codigo || "-"}
                        </td>
                        <td className="px-3 py-3">
                          {item.unidadSistema?.propietario_nombre || "-"}
                        </td>
                        <td className="px-3 py-3">
                          {item.pago?.referencia || "-"}
                        </td>
                        <td className="px-3 py-3 text-right font-black text-emerald-800">
                          RD$ {dinero(item.montoSistema)}
                        </td>
                        <td
                          className={`px-3 py-3 text-right font-black ${
                            Math.abs(item.diferencia) < 0.01
                              ? "text-slate-600"
                              : "text-red-700"
                          }`}
                        >
                          RD$ {dinero(item.diferencia)}
                        </td>
                      </tr>
                    ))}

                    {comparacionFiltrada.length === 0 && (
                      <tr>
                        <td colSpan={12} className="px-4 py-10 text-center">
                          No hay resultados con el filtro seleccionado.
                        </td>
                      </tr>
                    )}
                  </tbody>

                  <tfoot className="bg-slate-950 text-white">
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-4 text-right font-black"
                      >
                        TOTALES DEL ARCHIVO Y DEL SISTEMA
                      </td>
                      <td className="px-3 py-4 text-right font-black">
                        RD$ {dinero(resumenComparacion.totalArchivo)}
                      </td>
                      <td colSpan={3} />
                      <td className="px-3 py-4 text-right font-black">
                        RD$ {dinero(resumenComparacion.totalSistema)}
                      </td>
                      <td className="px-3 py-4 text-right font-black">
                        RD$ {dinero(resumenComparacion.diferencia)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
          <SectionCard
            title="Ingresos registrados por propietario"
            subtitle="Sumatoria del mes basada en la fecha real del pago registrado en VAM."
          >
            <div className="overflow-x-auto rounded-2xl border">
              <table className="min-w-[850px] w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="w-12 px-3 py-3" />
                    <th className="px-4 py-3 text-left">Unidad</th>
                    <th className="px-4 py-3 text-left">Propietario</th>
                    <th className="px-4 py-3 text-center">Pagos</th>
                    <th className="px-4 py-3 text-left">Períodos aplicados</th>
                    <th className="px-4 py-3 text-right">Total ingresado</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {gruposPropietarios.map((grupo) => (
                    <GrupoPropietarioFilas
                      key={grupo.clave}
                      grupo={grupo}
                      expandido={expandidos.has(grupo.clave)}
                      onToggle={() =>
                        setExpandidos((actual) => {
                          const nuevo = new Set(actual);
                          nuevo.has(grupo.clave)
                            ? nuevo.delete(grupo.clave)
                            : nuevo.add(grupo.clave);
                          return nuevo;
                        })
                      }
                    />
                  ))}
                </tbody>

                <tfoot className="bg-emerald-950 text-white">
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-right font-black">
                      TOTAL INGRESADO EN {nombreMes(mesReporte).toUpperCase()}{" "}
                      {anioReporte}
                    </td>
                    <td className="px-4 py-4 text-right text-base font-black">
                      RD$ {dinero(totalSistemaMes)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Resumen mensual"
              subtitle="Información del período consultado."
            >
              <ResumenLinea
                etiqueta="Ingresos VAM"
                valor={`RD$ ${dinero(totalSistemaMes)}`}
              />
              <ResumenLinea
                etiqueta="Control Bancario"
                valor={`RD$ ${dinero(totalControlBanco)}`}
              />
              <ResumenLinea
                etiqueta="Propietarios con ingresos"
                valor={String(propietariosConIngresos)}
              />
              <ResumenLinea
                etiqueta="Cantidad de pagos"
                valor={String(pagos.length)}
              />
              <ResumenLinea
                etiqueta="Unidades sin ingresos"
                valor={String(unidadesSinIngresos.length)}
                danger={unidadesSinIngresos.length > 0}
              />
            </SectionCard>

            <SectionCard
              title="Reglas de validación"
              subtitle="Orden de prioridad utilizado."
            >
              <div className="space-y-3 text-sm">
                <Regla numero="1" texto="Referencia exacta." />
                <Regla numero="2" texto="Unidad exacta." />
                <Regla
                  numero="3"
                  texto="Unidad detectada dentro de la descripción."
                />
                <Regla
                  numero="4"
                  texto="Nombre del propietario y monto coincidente."
                />
                <Regla
                  numero="5"
                  texto="Sin coincidencia: requiere registro o revisión."
                />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      <article
        id="reporte-validacion-ingresos"
        className="mx-auto mt-6 max-w-[1200px] bg-white p-5 text-slate-950 shadow-sm ring-1 ring-slate-200 print:mt-0 print:max-w-none print:p-0 print:shadow-none print:ring-0"
      >
        <header className="grid grid-cols-[180px_1fr_220px] items-center gap-4 border-b-2 border-slate-900 pb-3">
          <div className="font-black text-blue-950">
            <p className="text-2xl">VAM</p>
            <p className="text-[9px] uppercase">
              Administradora de Condominios
            </p>
          </div>

          <div className="text-center">
            <h1 className="text-xl font-black uppercase">
              Validación de ingresos por propietarios
            </h1>
            <p className="mt-1 text-sm font-bold uppercase">
              {nombreCondominio}
            </p>
          </div>

          <div className="border p-2 text-[10px]">
            <p>
              <strong>Período:</strong> {nombreMes(mesReporte)} {anioReporte}
            </p>
            <p>
              <strong>Cuenta:</strong>{" "}
              {cuentaSeleccionada
                ? `${cuentaSeleccionada.nombre_banco} ${cuentaSeleccionada.numero_cuenta}`
                : "Todas"}
            </p>
            <p>
              <strong>Archivo:</strong> {archivoNombre || "No cargado"}
            </p>
            <p>
              <strong>Generado:</strong> {fechaGeneracion || "-"}
            </p>
          </div>
        </header>

        <div className="mt-3 grid grid-cols-4 border text-center">
          <ResumenImpresion
            titulo="Total archivo"
            valor={`RD$ ${dinero(resumenComparacion.totalArchivo)}`}
          />
          <ResumenImpresion
            titulo="Total VAM"
            valor={`RD$ ${dinero(totalSistemaMes)}`}
          />
          <ResumenImpresion
            titulo="Diferencia"
            valor={`RD$ ${dinero(resumenComparacion.diferencia)}`}
          />
          <ResumenImpresion
            titulo="Registros para revisar"
            valor={String(
              resumenComparacion.diferencias +
                resumenComparacion.soloArchivo +
                resumenComparacion.soloSistema +
                resumenComparacion.posibles,
            )}
          />
        </div>

        <table className="tabla-print mt-3 w-full table-fixed border-collapse text-[7px]">
          <thead>
            <tr className="bg-slate-100 uppercase">
              <th className="w-[12%] border px-1 py-2">Estado</th>
              <th className="w-[12%] border px-1 py-2">Fecha</th>
              <th className="w-[13%] border px-1 py-2">Referencia archivo</th>
              <th className="w-[10%] border px-1 py-2">Unidad archivo</th>
              <th className="w-[18%] border px-1 py-2">Propietario archivo</th>
              <th className="w-[10%] border px-1 py-2">Monto archivo</th>
              <th className="w-[10%] border px-1 py-2">Unidad VAM</th>
              <th className="w-[15%] border px-1 py-2">Propietario VAM</th>
              <th className="w-[10%] border px-1 py-2">Monto VAM</th>
            </tr>
          </thead>

          <tbody>
            {comparacion.map((item) => (
              <tr key={`PRINT-${item.id}`}>
                <td className="border px-1 py-2 text-center">
                  {estadoTexto(item.estado)}
                </td>
                <td className="border px-1 py-2 text-center">
                  {fechaCorta(item.archivo?.fecha || item.pago?.fecha_pago)}
                </td>
                <td className="border px-1 py-2">
                  {item.archivo?.referencia || "-"}
                </td>
                <td className="border px-1 py-2 text-center">
                  {item.archivo?.unidad || "-"}
                </td>
                <td className="border px-1 py-2">
                  {item.archivo?.propietario || "-"}
                </td>
                <td className="border px-1 py-2 text-right font-black">
                  {dinero(item.montoArchivo)}
                </td>
                <td className="border px-1 py-2 text-center">
                  {item.unidadSistema?.codigo || "-"}
                </td>
                <td className="border px-1 py-2">
                  {item.unidadSistema?.propietario_nombre || "-"}
                </td>
                <td className="border px-1 py-2 text-right font-black">
                  {dinero(item.montoSistema)}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="bg-slate-950 text-white">
            <tr>
              <td
                colSpan={5}
                className="border px-2 py-3 text-right font-black"
              >
                TOTALES
              </td>
              <td className="border px-2 py-3 text-right font-black">
                RD$ {dinero(resumenComparacion.totalArchivo)}
              </td>
              <td colSpan={2} className="border" />
              <td className="border px-2 py-3 text-right font-black">
                RD$ {dinero(totalSistemaMes)}
              </td>
            </tr>
          </tfoot>
        </table>

        <footer className="mt-5 border-t pt-2 text-center text-[8px]">
          Las posibles coincidencias deben ser confirmadas manualmente antes de
          realizar cualquier corrección en el sistema.
        </footer>
      </article>

      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 7mm;
        }

        @media print {
          body * {
            visibility: hidden !important;
          }

          #reporte-validacion-ingresos,
          #reporte-validacion-ingresos * {
            visibility: visible !important;
          }

          #reporte-validacion-ingresos {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            margin: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .tabla-print thead {
            display: table-header-group;
          }

          .tabla-print tr {
            break-inside: avoid;
          }
        }
      `}</style>
    </PageContainer>
  );
}

function GrupoPropietarioFilas({
  grupo,
  expandido,
  onToggle,
}: {
  grupo: GrupoPropietario;
  expandido: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="bg-white hover:bg-slate-50">
        <td className="px-3 py-3 text-center">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border p-1.5"
          >
            {expandido ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-4 py-3 font-black">{grupo.unidad}</td>
        <td className="px-4 py-3">
          <p className="font-bold">{grupo.propietario}</p>
          <p className="text-xs text-slate-500">{grupo.telefono}</p>
        </td>
        <td className="px-4 py-3 text-center font-black">
          {grupo.cantidadPagos}
        </td>
        <td className="px-4 py-3 text-xs">
          {grupo.periodos.join(", ") || "-"}
        </td>
        <td className="px-4 py-3 text-right font-black text-emerald-700">
          RD$ {dinero(grupo.totalIngresado)}
        </td>
      </tr>

      {expandido && (
        <tr className="bg-slate-50">
          <td colSpan={6} className="p-4">
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="min-w-[720px] w-full text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Referencia</th>
                    <th className="px-3 py-2 text-left">Método</th>
                    <th className="px-3 py-2 text-left">Período</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                    <th className="px-3 py-2 text-center">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grupo.pagos.map((pago) => (
                    <tr key={pago.id}>
                      <td className="px-3 py-2">
                        {fechaCorta(pago.fecha_pago)}
                      </td>
                      <td className="px-3 py-2">{pago.referencia || "-"}</td>
                      <td className="px-3 py-2">{metodoPago(pago)}</td>
                      <td className="px-3 py-2">{pago.periodo || "-"}</td>
                      <td className="px-3 py-2 text-right font-black">
                        RD$ {dinero(pago.monto)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Link
                          href={`/recibos/pago/mantenimiento/${pago.id}`}
                          className="font-black text-blue-700"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Indicador({
  titulo,
  valor,
  clase,
}: {
  titulo: string;
  valor: string;
  clase: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${clase}`}>
      <p className="text-xs font-bold uppercase leading-tight opacity-80">
        {titulo}
      </p>
      <p className="mt-2 text-xl font-black">{valor}</p>
    </div>
  );
}

function ResumenLinea({
  etiqueta,
  valor,
  danger = false,
}: {
  etiqueta: string;
  valor: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-b-0">
      <span className="text-sm font-semibold text-slate-600">{etiqueta}</span>
      <span
        className={`font-black ${danger ? "text-red-700" : "text-slate-900"}`}
      >
        {valor}
      </span>
    </div>
  );
}

function Regla({ numero, texto }: { numero: string; texto: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
        {numero}
      </span>
      <p className="pt-1 font-semibold text-slate-700">{texto}</p>
    </div>
  );
}

function ResumenImpresion({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="border-l p-3 first:border-l-0">
      <p className="text-[8px] font-black uppercase">{titulo}</p>
      <p className="mt-2 text-[13px] font-black">{valor}</p>
    </div>
  );
}
