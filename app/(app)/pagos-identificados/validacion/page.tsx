"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Download,
  Filter,
  ListChecks,
  RefreshCw,
  Search,
  ShieldCheck,
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

type ArchivoBanco = {
  id: number;
  condominio_id: number;
  fecha_posteo: string | null;
  periodo: string | null;
  unidad_id: number | null;
  apartamento: string | null;
  propietario: string | null;
  monto_transaccion: number | null;
  no_serial: string | null;
  descripcion: string | null;
  estado: string | null;
  observacion: string | null;
  created_at: string;
};

type PagoIdentificado = {
  id: number;
  archivo_banco_id: number | null;
  condominio_id: number;
  unidad_id: number | null;
  no_apartamento: string | null;
  fecha_posteo: string | null;
  monto_transaccion: number | null;
  no_serial: string | null;
  descripcion_banco: string | null;
  estado: string | null;
  created_at: string;
};

type Pago = {
  id: number;
  condominio_id: number;
  unidad_id: number | null;
  monto: number | null;
  fecha_pago: string | null;
  referencia: string | null;
  metodo_pago: string | null;
  tipo_fondo: string | null;
  created_at: string;
};

type Unidad = {
  id: number;
  codigo: string;
};

type EstadoValidacion =
  | "CORRECTO"
  | "PENDIENTE"
  | "ERROR"
  | "DUPLICADO"
  | "DIFERENCIA";

type TipoPeriodo = "TODOS" | "MES" | "RANGO";

type ResultadoValidacion = {
  archivoBanco: ArchivoBanco;
  unidadEncontrada: Unidad | null;
  pagosIdentificadosEncontrados: PagoIdentificado[];
  pagoIdentificado: PagoIdentificado | null;
  pagosEncontrados: Pago[];
  estadoValidacion: EstadoValidacion;
  etapa: string;
  razon: string;
};

function obtenerMesActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function normalizarTexto(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/\./g, "")
    .replace(/_/g, "");
}

function dinero(valor: number | null | undefined) {
  return new Intl.NumberFormat("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function fechaLocal(fecha: string | null | undefined) {
  if (!fecha) return "-";

  const soloFecha = String(fecha).slice(0, 10);
  const partes = soloFecha.split("-");

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return String(fecha);

  return d.toLocaleDateString("es-DO");
}

function fechaISO(fecha: string | null | undefined) {
  if (!fecha) return "";
  return String(fecha).slice(0, 10);
}

function montoIgual(
  a: number | null | undefined,
  b: number | null | undefined,
) {
  return Number(a || 0).toFixed(2) === Number(b || 0).toFixed(2);
}

function estaAplicado(estado: string | null | undefined) {
  const valor = String(estado || "").trim().toUpperCase();

  return (
    valor === "APLICADO" ||
    valor === "PAGO APLICADO" ||
    valor === "PROCESADO"
  );
}

function referenciasValidas(
  archivo: ArchivoBanco,
  pagoIdentificado: PagoIdentificado | null,
) {
  const referencias = new Set<string>();

  const serialArchivo = String(archivo.no_serial || "").trim();
  if (serialArchivo) referencias.add(serialArchivo);

  if (pagoIdentificado) {
    const serialIdentificado = String(pagoIdentificado.no_serial || "").trim();
    if (serialIdentificado) referencias.add(serialIdentificado);

    referencias.add(`PAGO_IDENTIFICADO_${pagoIdentificado.id}`);
  }

  return Array.from(referencias);
}

function claseEstado(estado: EstadoValidacion) {
  if (estado === "CORRECTO") return "bg-emerald-50 text-emerald-700";
  if (estado === "PENDIENTE") return "bg-amber-50 text-amber-700";
  if (estado === "ERROR") return "bg-red-50 text-red-700";
  if (estado === "DUPLICADO") return "bg-violet-50 text-violet-700";
  if (estado === "DIFERENCIA") return "bg-orange-50 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

function extraerPeriodoArchivo(observacion: string | null | undefined) {
  const texto = String(observacion || "");
  const match = texto.match(/PERIODO_ARCHIVO:(\d{4}-\d{2})/i);
  return match?.[1] || "";
}

export default function ValidacionPagosBancoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [archivoBanco, setArchivoBanco] = useState<ArchivoBanco[]>([]);
  const [pagosIdentificados, setPagosIdentificados] = useState<PagoIdentificado[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("TODOS");
  const [mesFiltro, setMesFiltro] = useState(obtenerMesActual());
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje(
        "No se encontró el condominio activo. Debe iniciar sesión nuevamente.",
      );
      setLoading(false);
      return;
    }

    cargarTodo(id);
  }, []);

  async function cargarTodo(id: string) {
    if (!id) return;

    setLoading(true);
    setMensaje("");

    const resultadosCarga = await Promise.all([
      cargarArchivoBanco(id),
      cargarPagosIdentificados(id),
      cargarPagos(id),
      cargarUnidades(id),
    ]);

    const errores = resultadosCarga.filter(Boolean) as string[];

    if (errores.length > 0) {
      setMensaje(errores.join(" | "));
    }

    setLoading(false);
  }

  async function cargarArchivoBanco(id: string) {
    const { data, error } = await supabase
      .from("archivo_banco")
      .select(`
        id,
        condominio_id,
        fecha_posteo,
        periodo,
        unidad_id,
        apartamento,
        propietario,
        monto_transaccion,
        no_serial,
        descripcion,
        estado,
        observacion,
        created_at
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_posteo", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      return "Error cargando archivo_banco: " + error.message;
    }

    setArchivoBanco((data as ArchivoBanco[]) || []);
    return "";
  }

  async function cargarPagosIdentificados(id: string) {
    const { data, error } = await supabase
      .from("pagos_identificados")
      .select(`
        id,
        archivo_banco_id,
        condominio_id,
        unidad_id,
        no_apartamento,
        fecha_posteo,
        monto_transaccion,
        no_serial,
        descripcion_banco,
        estado,
        created_at
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_posteo", { ascending: false });

    if (error) {
      return "Error cargando pagos_identificados: " + error.message;
    }

    setPagosIdentificados((data as PagoIdentificado[]) || []);
    return "";
  }

  async function cargarPagos(id: string) {
    const { data, error } = await supabase
      .from("pagos")
      .select(`
        id,
        condominio_id,
        unidad_id,
        monto,
        fecha_pago,
        referencia,
        metodo_pago,
        tipo_fondo,
        created_at
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_pago", { ascending: false });

    if (error) {
      return "Error cargando pagos: " + error.message;
    }

    setPagos((data as Pago[]) || []);
    return "";
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .order("codigo", { ascending: true });

    if (error) {
      return "Error cargando unidades: " + error.message;
    }

    setUnidades((data as Unidad[]) || []);
    return "";
  }

  function buscarUnidad(archivo: ArchivoBanco, pi: PagoIdentificado | null) {
    const unidadId = pi?.unidad_id || archivo.unidad_id;

    if (unidadId) {
      const porId =
        unidades.find((unidad) => Number(unidad.id) === Number(unidadId)) || null;

      if (porId) return porId;
    }

    const apartamento =
      pi?.no_apartamento || archivo.apartamento || "";

    const apartamentoNormalizado = normalizarTexto(apartamento);

    if (!apartamentoNormalizado) return null;

    const exacta = unidades.find(
      (unidad) => normalizarTexto(unidad.codigo) === apartamentoNormalizado,
    );

    if (exacta) return exacta;

    const candidatas = unidades.filter((unidad) => {
      const codigo = normalizarTexto(unidad.codigo);

      return (
        codigo.includes(apartamentoNormalizado) ||
        apartamentoNormalizado.includes(codigo)
      );
    });

    return candidatas.length === 1 ? candidatas[0] : null;
  }

  const resultados = useMemo<ResultadoValidacion[]>(() => {
    const piPorArchivo = new Map<number, PagoIdentificado[]>();

    pagosIdentificados.forEach((pi) => {
      if (!pi.archivo_banco_id) return;

      const grupo = piPorArchivo.get(Number(pi.archivo_banco_id)) || [];
      grupo.push(pi);
      piPorArchivo.set(Number(pi.archivo_banco_id), grupo);
    });

    return archivoBanco.map((archivo) => {
      const pagosIdentificadosEncontrados =
        piPorArchivo.get(Number(archivo.id)) || [];

      if (pagosIdentificadosEncontrados.length > 1) {
        return {
          archivoBanco: archivo,
          unidadEncontrada: buscarUnidad(
            archivo,
            pagosIdentificadosEncontrados[0] || null,
          ),
          pagosIdentificadosEncontrados,
          pagoIdentificado: pagosIdentificadosEncontrados[0] || null,
          pagosEncontrados: [],
          estadoValidacion: "DUPLICADO",
          etapa: "IDENTIFICACIÓN DUPLICADA",
          razon: `El archivo_banco ID ${archivo.id} tiene ${pagosIdentificadosEncontrados.length} registros en pagos_identificados.`,
        };
      }

      const pi = pagosIdentificadosEncontrados[0] || null;
      const unidad = buscarUnidad(archivo, pi);

      if (!unidad) {
        return {
          archivoBanco: archivo,
          unidadEncontrada: null,
          pagosIdentificadosEncontrados,
          pagoIdentificado: pi,
          pagosEncontrados: [],
          estadoValidacion: "ERROR",
          etapa: pi ? "IDENTIFICADO" : "REVISIÓN",
          razon: `No se encontró una unidad única para el apartamento ${
            pi?.no_apartamento || archivo.apartamento || "-"
          }.`,
        };
      }

      if (!pi) {
        return {
          archivoBanco: archivo,
          unidadEncontrada: unidad,
          pagosIdentificadosEncontrados,
          pagoIdentificado: null,
          pagosEncontrados: [],
          estadoValidacion: "PENDIENTE",
          etapa: "PENDIENTE DE IDENTIFICAR",
          razon: `Movimiento cargado en archivo_banco con estado ${
            archivo.estado || "SIN ESTADO"
          }, pero todavía no existe en pagos_identificados.`,
        };
      }

      const referencias = referenciasValidas(archivo, pi);

      const pagosEncontrados = pagos.filter((pago) =>
        referencias.includes(String(pago.referencia || "").trim()),
      );

      if (pagosEncontrados.length === 0) {
        if (estaAplicado(pi.estado)) {
          return {
            archivoBanco: archivo,
            unidadEncontrada: unidad,
            pagosIdentificadosEncontrados,
            pagoIdentificado: pi,
            pagosEncontrados,
            estadoValidacion: "ERROR",
            etapa: "IDENTIFICADO SIN PAGO",
            razon:
              "El registro está marcado como aplicado/procesado en pagos_identificados, pero no existe un pago con el serial bancario ni con la referencia PAGO_IDENTIFICADO_ID.",
          };
        }

        return {
          archivoBanco: archivo,
          unidadEncontrada: unidad,
          pagosIdentificadosEncontrados,
          pagoIdentificado: pi,
          pagosEncontrados,
          estadoValidacion: "PENDIENTE",
          etapa: "IDENTIFICADO",
          razon:
            "La transacción ya está en pagos_identificados, pero todavía no se encontró el pago aplicado en la tabla pagos.",
        };
      }

      if (pagosEncontrados.length > 1) {
        return {
          archivoBanco: archivo,
          unidadEncontrada: unidad,
          pagosIdentificadosEncontrados,
          pagoIdentificado: pi,
          pagosEncontrados,
          estadoValidacion: "DUPLICADO",
          etapa: "PAGO DUPLICADO",
          razon: `Se encontraron ${pagosEncontrados.length} pagos con la misma referencia. Revisar posible duplicidad.`,
        };
      }

      const pago = pagosEncontrados[0];
      const montoBanco = Number(archivo.monto_transaccion || 0);

      if (!montoIgual(pago.monto, montoBanco)) {
        return {
          archivoBanco: archivo,
          unidadEncontrada: unidad,
          pagosIdentificadosEncontrados,
          pagoIdentificado: pi,
          pagosEncontrados,
          estadoValidacion: "DIFERENCIA",
          etapa: "PAGO CREADO",
          razon: `Monto banco RD$ ${dinero(
            montoBanco,
          )}, pero en pagos aparece RD$ ${dinero(pago.monto)}.`,
        };
      }

      if (Number(pago.unidad_id) !== Number(unidad.id)) {
        return {
          archivoBanco: archivo,
          unidadEncontrada: unidad,
          pagosIdentificadosEncontrados,
          pagoIdentificado: pi,
          pagosEncontrados,
          estadoValidacion: "DIFERENCIA",
          etapa: "PAGO CREADO",
          razon: `El pago existe por referencia, pero está asociado a otra unidad. Unidad esperada: ${unidad.codigo}.`,
        };
      }

      return {
        archivoBanco: archivo,
        unidadEncontrada: unidad,
        pagosIdentificadosEncontrados,
        pagoIdentificado: pi,
        pagosEncontrados,
        estadoValidacion: "CORRECTO",
        etapa: "VALIDADO",
        razon:
          "El movimiento bancario tiene identificación y pago aplicado correctamente en VAM.",
      };
    });
  }, [archivoBanco, pagosIdentificados, pagos, unidades]);

  const resultadosFiltrados = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    return resultados.filter((resultado) => {
      // El filtro por mes y fecha se basa en la fecha real de posteo bancario,
      // no en el periodo de la cuota ni en PERIODO_ARCHIVO.
      const fecha = fechaISO(resultado.archivoBanco.fecha_posteo);

      const cumpleEstado =
        filtroEstado === "" || resultado.estadoValidacion === filtroEstado;

      let cumplePeriodo = true;

      if (tipoPeriodo === "MES") {
        cumplePeriodo = Boolean(mesFiltro) && fecha.slice(0, 7) === mesFiltro;
      }

      if (tipoPeriodo === "RANGO") {
        if (fechaDesde) {
          cumplePeriodo = cumplePeriodo && fecha >= fechaDesde;
        }

        if (fechaHasta) {
          cumplePeriodo = cumplePeriodo && fecha <= fechaHasta;
        }
      }

      const combinado = `
        ${resultado.archivoBanco.id}
        ${resultado.archivoBanco.apartamento || ""}
        ${resultado.archivoBanco.propietario || ""}
        ${resultado.archivoBanco.no_serial || ""}
        ${resultado.archivoBanco.descripcion || ""}
        ${resultado.archivoBanco.estado || ""}
        ${resultado.archivoBanco.periodo || ""}
        ${extraerPeriodoArchivo(resultado.archivoBanco.observacion)}
        ${resultado.unidadEncontrada?.codigo || ""}
        ${resultado.pagoIdentificado?.id || ""}
        ${resultado.pagosEncontrados.map((pago) => pago.referencia || "").join(" ")}
        ${resultado.etapa}
        ${resultado.razon}
      `.toLowerCase();

      const cumpleBusqueda = !texto || combinado.includes(texto);

      return cumpleEstado && cumplePeriodo && cumpleBusqueda;
    });
  }, [
    resultados,
    buscar,
    filtroEstado,
    tipoPeriodo,
    mesFiltro,
    fechaDesde,
    fechaHasta,
  ]);

  const resumen = useMemo(() => {
    const correctos = resultadosFiltrados.filter(
      (resultado) => resultado.estadoValidacion === "CORRECTO",
    );
    const pendientes = resultadosFiltrados.filter(
      (resultado) => resultado.estadoValidacion === "PENDIENTE",
    );
    const errores = resultadosFiltrados.filter(
      (resultado) => resultado.estadoValidacion === "ERROR",
    );
    const duplicados = resultadosFiltrados.filter(
      (resultado) => resultado.estadoValidacion === "DUPLICADO",
    );
    const diferencias = resultadosFiltrados.filter(
      (resultado) => resultado.estadoValidacion === "DIFERENCIA",
    );

    const montoBanco = resultadosFiltrados.reduce(
      (sum, resultado) =>
        sum + Number(resultado.archivoBanco.monto_transaccion || 0),
      0,
    );

    const montoCorrectamenteAplicado = correctos.reduce(
      (sum, resultado) =>
        sum + Number(resultado.archivoBanco.monto_transaccion || 0),
      0,
    );

    const montoPendienteError = resultadosFiltrados.reduce((sum, resultado) => {
      if (resultado.estadoValidacion === "CORRECTO") return sum;

      return sum + Number(resultado.archivoBanco.monto_transaccion || 0);
    }, 0);

    return {
      registros: resultadosFiltrados.length,
      correctos: correctos.length,
      pendientes: pendientes.length,
      errores: errores.length,
      duplicados: duplicados.length,
      diferencias: diferencias.length,
      montoBanco,
      montoCorrectamenteAplicado,
      montoPendienteError,
    };
  }, [resultadosFiltrados]);

  function limpiarFiltros() {
    setBuscar("");
    setFiltroEstado("");
    setTipoPeriodo("TODOS");
    setMesFiltro(obtenerMesActual());
    setFechaDesde("");
    setFechaHasta("");
  }

  function exportarExcel() {
    if (resultadosFiltrados.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = resultadosFiltrados.map((resultado) => ({
      "ID archivo banco": resultado.archivoBanco.id,
      Condominio: condominioNombre || condominioId,
      "Fecha posteo banco": resultado.archivoBanco.fecha_posteo || "",
      "Mes fecha banco": fechaISO(resultado.archivoBanco.fecha_posteo).slice(0, 7),
      "Periodo registro": resultado.archivoBanco.periodo || "",
      "Periodo seleccionado al importar": extraerPeriodoArchivo(
        resultado.archivoBanco.observacion,
      ),
      Apartamento: resultado.archivoBanco.apartamento || "",
      Propietario: resultado.archivoBanco.propietario || "",
      "Unidad encontrada": resultado.unidadEncontrada?.codigo || "",
      "Monto banco": Number(resultado.archivoBanco.monto_transaccion || 0),
      "Serial banco": resultado.archivoBanco.no_serial || "",
      "Descripción banco": resultado.archivoBanco.descripcion || "",
      "Estado archivo banco": resultado.archivoBanco.estado || "",
      Etapa: resultado.etapa,
      "ID pago identificado": resultado.pagoIdentificado?.id || "",
      "Estado pago identificado": resultado.pagoIdentificado?.estado || "",
      "ID pago real": resultado.pagosEncontrados.map((pago) => pago.id).join(", "),
      "Referencia pago real": resultado.pagosEncontrados
        .map((pago) => pago.referencia || "")
        .join(", "),
      "Monto pago real": resultado.pagosEncontrados
        .map((pago) => Number(pago.monto || 0))
        .join(", "),
      Validación: resultado.estadoValidacion,
      Razón: resultado.razon,
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [
      { wch: 18 },
      { wch: 30 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 24 },
      { wch: 18 },
      { wch: 36 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
      { wch: 48 },
      { wch: 18 },
      { wch: 24 },
      { wch: 20 },
      { wch: 22 },
      { wch: 16 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 70 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Validacion");

    const periodoNombre =
      tipoPeriodo === "MES"
        ? mesFiltro
        : tipoPeriodo === "RANGO"
          ? `${fechaDesde || "inicio"}_${fechaHasta || "fin"}`
          : "todos";

    const nombreArchivo = `Validacion_Banco_${
      condominioNombre || condominioId
    }_${periodoNombre}.xlsx`
      .replaceAll(" ", "_")
      .replaceAll("/", "-");

    XLSX.writeFile(libro, nombreArchivo);
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Banco"
        subtitle="Importación, conciliación y control de ingresos bancarios."
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
        title="Validación de Pagos del Banco"
        subtitle={`Control integral desde archivo_banco hasta el pago aplicado. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={ShieldCheck}
        actions={
          <ModuleActions
            onRefresh={() => cargarTodo(condominioId)}
            extra={
              <button
                type="button"
                onClick={exportarExcel}
                disabled={resultadosFiltrados.length === 0 || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </button>
            }
          />
        }
      />

      {mensaje && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Filtros de validación"
        subtitle="El mes y el rango se filtran por la fecha real de posteo del banco."
        action={
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
            <Filter className="h-4 w-4" />
            Registros: {resumen.registros}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <label className="mb-1 block text-sm font-semibold">Validación</label>
            <select
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Todos</option>
              <option value="CORRECTO">Correctos</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="ERROR">Errores</option>
              <option value="DUPLICADO">Duplicados</option>
              <option value="DIFERENCIA">Diferencias</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Período de consulta</label>
            <select
              value={tipoPeriodo}
              onChange={(event) =>
                setTipoPeriodo(event.target.value as TipoPeriodo)
              }
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="TODOS">Todos los meses</option>
              <option value="MES">Por mes bancario</option>
              <option value="RANGO">Rango de fechas</option>
            </select>
          </div>

          {tipoPeriodo === "MES" && (
            <div>
              <label className="mb-1 block text-sm font-semibold">Mes bancario</label>
              <input
                type="month"
                value={mesFiltro}
                onChange={(event) => setMesFiltro(event.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              />
            </div>
          )}

          {tipoPeriodo === "RANGO" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-semibold">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(event) => setFechaDesde(event.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  min={fechaDesde || undefined}
                  onChange={(event) => setFechaHasta(event.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                />
              </div>
            </>
          )}

          <div
            className={
              tipoPeriodo === "RANGO"
                ? "md:col-span-2 xl:col-span-2"
                : "md:col-span-2 xl:col-span-3"
            }
          >
            <label className="mb-1 block text-sm font-semibold">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={buscar}
                onChange={(event) => setBuscar(event.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Apartamento, propietario, serial, descripción, etapa..."
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Limpiar filtros
            </button>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <InfoBox
          label="Correctos"
          value={String(resumen.correctos)}
          tone="emerald"
        />
        <InfoBox
          label="Pendientes"
          value={String(resumen.pendientes)}
          tone="amber"
        />
        <InfoBox
          label="Errores"
          value={String(resumen.errores)}
          tone="red"
        />
        <InfoBox
          label="Duplicados"
          value={String(resumen.duplicados)}
          tone="violet"
        />
        <InfoBox
          label="Diferencias"
          value={String(resumen.diferencias)}
          tone="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InfoBox
          label="Monto movimientos banco"
          value={`RD$ ${dinero(resumen.montoBanco)}`}
          tone="blue"
        />
        <InfoBox
          label="Monto correctamente aplicado"
          value={`RD$ ${dinero(resumen.montoCorrectamenteAplicado)}`}
          tone="emerald"
        />
        <InfoBox
          label="Monto pendiente / con incidencia"
          value={`RD$ ${dinero(resumen.montoPendienteError)}`}
          tone="red"
        />
      </div>

      <SectionCard
        title="Resultado de validación"
        subtitle="Cada movimiento de archivo_banco permanece visible aunque todavía no exista en pagos_identificados."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Validando
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Mostrando: {resultadosFiltrados.length}
            </div>
          )
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm font-semibold text-slate-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Validando movimientos bancarios...
          </div>
        ) : resultadosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin registros"
            description="No hay movimientos bancarios que coincidan con los filtros seleccionados."
          />
        ) : (
          <DataTable>
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-3 text-left">ID Banco</th>
                <th className="px-3 py-3 text-left">Fecha Banco</th>
                <th className="px-3 py-3 text-left">Período</th>
                <th className="px-3 py-3 text-left">Apartamento / propietario</th>
                <th className="px-3 py-3 text-right">Monto</th>
                <th className="px-3 py-3 text-left">Serial / descripción</th>
                <th className="px-3 py-3 text-center">Estado Banco</th>
                <th className="px-3 py-3 text-center">Pago Identificado</th>
                <th className="px-3 py-3 text-center">Pago Sistema</th>
                <th className="px-3 py-3 text-center">Etapa</th>
                <th className="px-3 py-3 text-center">Validación</th>
                <th className="px-3 py-3 text-left">Razón</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {resultadosFiltrados.map((resultado) => (
                <tr
                  key={resultado.archivoBanco.id}
                  className="bg-white hover:bg-slate-50"
                >
                  <td className="px-3 py-3 font-black text-slate-800">
                    {resultado.archivoBanco.id}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3">
                    {fechaLocal(resultado.archivoBanco.fecha_posteo)}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3">
                    <p className="font-bold text-slate-800">
                      {resultado.archivoBanco.periodo || "-"}
                    </p>
                    {extraerPeriodoArchivo(resultado.archivoBanco.observacion) && (
                      <p className="mt-1 text-xs text-slate-500">
                        Importado como:{" "}
                        {extraerPeriodoArchivo(resultado.archivoBanco.observacion)}
                      </p>
                    )}
                  </td>

                  <td className="min-w-[220px] px-3 py-3">
                    <p className="font-black text-slate-800">
                      {resultado.archivoBanco.apartamento || "-"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {resultado.archivoBanco.propietario || "Sin propietario"}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-right font-black">
                    RD$ {dinero(resultado.archivoBanco.monto_transaccion)}
                  </td>

                  <td className="max-w-[300px] px-3 py-3">
                    <p className="font-bold text-slate-800">
                      {resultado.archivoBanco.no_serial || "Sin serial"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {resultado.archivoBanco.descripcion || "Sin descripción"}
                    </p>
                  </td>

                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      {resultado.archivoBanco.estado || "SIN ESTADO"}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-center">
                    {resultado.pagoIdentificado ? (
                      <div className="rounded-lg bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-700">
                        ID {resultado.pagoIdentificado.id}
                        <br />
                        {resultado.pagoIdentificado.estado || "Sin estado"}
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-amber-600">
                        Pendiente
                      </span>
                    )}
                  </td>

                  <td className="min-w-[160px] px-3 py-3 text-center">
                    {resultado.pagosEncontrados.length > 0 ? (
                      <div className="space-y-1">
                        {resultado.pagosEncontrados.map((pago) => (
                          <div
                            key={pago.id}
                            className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700"
                          >
                            Pago ID {pago.id}
                            <br />
                            Ref: {pago.referencia || "-"}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        No creado
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      {resultado.etapa}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-center">
                    <EstadoBadge estado={resultado.estadoValidacion} />
                  </td>

                  <td className="max-w-[360px] px-3 py-3 text-xs leading-5 text-slate-600">
                    {resultado.razon}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      <SectionCard
        title="Criterios de control"
        subtitle="La validación sigue el ciclo completo del movimiento bancario."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ControlItem
            icon={Banknote}
            title="Fuente maestra: archivo_banco"
            description="Todo movimiento importado aparece en el reporte, incluso cuando todavía está en estado Revisar."
            tone="blue"
          />
          <ControlItem
            icon={CheckCircle2}
            title="Cruce de identificación y pago"
            description="Se valida archivo_banco → pagos_identificados → pagos usando archivo_banco_id, referencias, unidad y monto."
            tone="emerald"
          />
          <ControlItem
            icon={AlertTriangle}
            title="Mes bancario real"
            description="Los filtros de mes y fechas utilizan fecha_posteo. El período de la cuota y el período seleccionado al importar se muestran por separado."
            tone="amber"
          />
        </div>
      </SectionCard>
    </PageContainer>
  );
}

function EstadoBadge({ estado }: { estado: EstadoValidacion }) {
  const esCorrecto = estado === "CORRECTO";
  const esError = estado === "ERROR";
  const esPendiente = estado === "PENDIENTE";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${claseEstado(
        estado,
      )}`}
    >
      {esCorrecto ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : esError ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : esPendiente ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5" />
      )}
      {estado}
    </span>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?:
    | "slate"
    | "emerald"
    | "amber"
    | "red"
    | "blue"
    | "violet"
    | "orange";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : tone === "red"
          ? "border-red-100 bg-red-50 text-red-700"
          : tone === "blue"
            ? "border-blue-100 bg-blue-50 text-blue-700"
            : tone === "violet"
              ? "border-violet-100 bg-violet-50 text-violet-700"
              : tone === "orange"
                ? "border-orange-100 bg-orange-50 text-orange-700"
                : "border-slate-200 bg-white text-slate-800";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}

function ControlItem({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  tone: "emerald" | "blue" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "blue"
        ? "border-blue-200 bg-blue-50 text-blue-800"
        : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-black">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-90">{description}</p>
        </div>
      </div>
    </div>
  );
}
