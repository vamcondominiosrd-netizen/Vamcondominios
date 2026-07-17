"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  CreditCard,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Landmark,
  ReceiptText,
  RefreshCw,
  Search,
  Upload,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import StatCard from "@/components/vam/enterprise/StatCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type EstadoDocumentacion =
  | "NO_APLICA"
  | "NO_REQUERIDO"
  | "PENDIENTE_RECIBO"
  | "DOCUMENTACION_COMPLETA";

type Gasto = {
  id: number;
  client_id?: number | null;
  condominio_id?: number;
  condominio: string | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  proveedor?: string | null;
  monto: number | null;
  itbis: number | null;
  total: number | null;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  factura_url: string | null;
  estado: string | null;
  categoria_id?: number | null;
  proveedor_id?: number | null;
  aprobado_tesorero?: boolean | null;
  aprobado_presidente?: boolean | null;
  fecha_aprobacion_tesorero?: string | null;
  fecha_aprobacion_presidente?: string | null;
  cheque_url?: string | null;
  numero_cheque?: string | null;
  fecha_pago?: string | null;
  pagado?: boolean | null;
  requiere_recibo_suplidor?: boolean;
  motivo_recibo_no_requerido?: string | null;
  cantidad_documentos?: number;
  cantidad_constancias_pago?: number;
  estado_documentacion?: EstadoDocumentacion;
  catalogo_proveedores?: { nombre_proveedor: string | null } | null;
  catalogo_categoria_gastos?: { nombre_categoria: string | null } | null;
};

type ControlDocumental = {
  gasto_id: number;
  requiere_recibo_suplidor: boolean | null;
  motivo_recibo_no_requerido: string | null;
  cantidad_documentos: number | null;
  cantidad_constancias_pago: number | null;
  estado_documentacion: EstadoDocumentacion | null;
};

type DocumentoGasto = {
  id: number;
  gasto_id: number;
  tipo_documento: string;
  numero_documento: string | null;
  fecha_documento: string | null;
  monto: number | null;
  nombre_archivo: string | null;
  archivo_url: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  observaciones: string | null;
  estado: string;
  created_at: string;
};

type DocumentoForm = {
  tipo_documento: string;
  numero_documento: string;
  fecha_documento: string;
  monto: string;
  observaciones: string;
};

const TIPOS_CONSTANCIA = [
  {
    value: "RECIBO_SUPLIDOR",
    label: "Recibo del suplidor",
    carpeta: "recibo-suplidor",
  },
  {
    value: "FACTURA_PAGADA",
    label: "Factura sellada como pagada",
    carpeta: "factura-pagada",
  },
  {
    value: "CERTIFICACION_PAGO",
    label: "Certificación de pago",
    carpeta: "certificacion-pago",
  },
  {
    value: "CARTA_DESCARGO",
    label: "Carta de descargo",
    carpeta: "carta-descargo",
  },
] as const;

const TIPOS_ARCHIVO_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const EXTENSIONES_PERMITIDAS = ["pdf", "jpg", "jpeg", "png", "webp"];
const TAMANO_MAXIMO = 10 * 1024 * 1024;

function dinero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatoFecha(fecha?: string | null) {
  if (!fecha) return "-";
  const limpia = String(fecha).split("T")[0];
  const partes = limpia.split("-");

  if (partes.length !== 3) return fecha;

  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

function estadoColor(g: Gasto) {
  if (g.pagado) return "bg-green-100 text-green-700";
  if (g.aprobado_tesorero && g.aprobado_presidente && !g.pagado) {
    return "bg-blue-100 text-blue-700";
  }
  if (g.aprobado_tesorero && !g.aprobado_presidente) {
    return "bg-yellow-100 text-yellow-700";
  }
  return "bg-slate-100 text-slate-700";
}

function etiquetaEstado(g: Gasto) {
  if (g.pagado) return "Pagado";
  if (g.aprobado_tesorero && g.aprobado_presidente && !g.pagado) {
    return "Aprobado pendiente de pago";
  }
  if (g.aprobado_tesorero && !g.aprobado_presidente) {
    return "Pendiente presidente";
  }
  return g.estado || "Sin estado";
}

function etiquetaEstadoDocumental(g: Gasto) {
  if (!g.pagado) return "No aplica";

  if (Number(g.cantidad_constancias_pago || 0) > 0) {
    return "Documentación completa";
  }

  if (g.requiere_recibo_suplidor) {
    return "Pendiente de recibo";
  }

  return "No requerido";
}

function colorEstadoDocumental(g: Gasto) {
  if (!g.pagado) return "bg-slate-100 text-slate-600";

  if (Number(g.cantidad_constancias_pago || 0) > 0) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (g.requiere_recibo_suplidor) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-blue-100 text-blue-700";
}

function nombreProveedor(g: Gasto) {
  return g.catalogo_proveedores?.nombre_proveedor || g.proveedor || "-";
}

function limpiarNombreArchivo(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function idUnico() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function etiquetaTipoDocumento(tipo: string) {
  return (
    TIPOS_CONSTANCIA.find((item) => item.value === tipo)?.label ||
    tipo.replaceAll("_", " ")
  );
}

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const [gastoDocumentos, setGastoDocumentos] = useState<Gasto | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoGasto[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [procesandoDocumento, setProcesandoDocumento] = useState(false);
  const [archivoDocumento, setArchivoDocumento] = useState<File | null>(null);
  const [documentoForm, setDocumentoForm] = useState<DocumentoForm>({
    tipo_documento: "RECIBO_SUPLIDOR",
    numero_documento: "",
    fecha_documento: hoyISO(),
    monto: "",
    observaciones: "",
  });

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const nombreFinal = nombre || `Condominio ID ${id}`;

    setCondominioId(id);
    setCondominioNombre(nombreFinal);
    cargarGastos(id, nombreFinal);
  }, []);

  async function cargarGastos(id: string, nombreCondominio: string) {
    if (!id && !nombreCondominio) return;

    setLoading(true);

    let query = supabase
      .from("gastos")
      .select(`
        id,
        client_id,
        condominio_id,
        condominio,
        fecha,
        concepto,
        detalle_gasto,
        proveedor,
        monto,
        itbis,
        total,
        no_factura,
        ncf,
        metodo_pago,
        cuenta_banco,
        factura_url,
        estado,
        categoria_id,
        proveedor_id,
        aprobado_tesorero,
        aprobado_presidente,
        fecha_aprobacion_tesorero,
        fecha_aprobacion_presidente,
        cheque_url,
        numero_cheque,
        fecha_pago,
        pagado,
        requiere_recibo_suplidor,
        motivo_recibo_no_requerido,
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .order("fecha", { ascending: false });

    if (id) {
      query = query.eq("condominio_id", Number(id));
    } else {
      query = query.eq("condominio", nombreCondominio);
    }

    const [gastosResponse, controlResponse] = await Promise.all([
      query,
      supabase
        .from("vw_gastos_control_documental")
        .select(
          "gasto_id, requiere_recibo_suplidor, motivo_recibo_no_requerido, cantidad_documentos, cantidad_constancias_pago, estado_documentacion",
        )
        .eq("condominio_id", Number(id)),
    ]);

    setLoading(false);

    if (gastosResponse.error) {
      alert("Error cargando gastos: " + gastosResponse.error.message);
      return;
    }

    if (controlResponse.error) {
      alert(
        "Los gastos fueron consultados, pero no se pudo cargar el control documental: " +
          controlResponse.error.message,
      );
    }

    const controlPorGasto = new Map<number, ControlDocumental>();

    for (const control of (controlResponse.data || []) as ControlDocumental[]) {
      controlPorGasto.set(Number(control.gasto_id), control);
    }

    const gastosCompletos = ((gastosResponse.data || []) as Gasto[]).map(
      (gasto) => {
        const control = controlPorGasto.get(gasto.id);

        return {
          ...gasto,
          requiere_recibo_suplidor:
            control?.requiere_recibo_suplidor ??
            gasto.requiere_recibo_suplidor ??
            false,
          motivo_recibo_no_requerido:
            control?.motivo_recibo_no_requerido ??
            gasto.motivo_recibo_no_requerido ??
            null,
          cantidad_documentos: Number(control?.cantidad_documentos || 0),
          cantidad_constancias_pago: Number(
            control?.cantidad_constancias_pago || 0,
          ),
          estado_documentacion:
            control?.estado_documentacion ||
            (gasto.pagado ? "NO_REQUERIDO" : "NO_APLICA"),
        };
      },
    );

    setGastos(gastosCompletos);
  }

  async function abrirExpediente(gasto: Gasto) {
    setGastoDocumentos(gasto);
    setDocumentoForm({
      tipo_documento: "RECIBO_SUPLIDOR",
      numero_documento: "",
      fecha_documento: gasto.fecha_pago || hoyISO(),
      monto: String(Number(gasto.total || gasto.monto || 0).toFixed(2)),
      observaciones: "",
    });
    setArchivoDocumento(null);
    await cargarDocumentos(gasto.id);
  }

  function cerrarExpediente() {
    if (procesandoDocumento) return;

    setGastoDocumentos(null);
    setDocumentos([]);
    setArchivoDocumento(null);
  }

  async function cargarDocumentos(gastoId: number) {
    setLoadingDocumentos(true);

    const { data, error } = await supabase
      .from("gastos_documentos")
      .select(
        "id, gasto_id, tipo_documento, numero_documento, fecha_documento, monto, nombre_archivo, archivo_url, mime_type, tamano_bytes, observaciones, estado, created_at",
      )
      .eq("gasto_id", gastoId)
      .eq("estado", "ACTIVO")
      .order("created_at", { ascending: false });

    setLoadingDocumentos(false);

    if (error) {
      alert("Error cargando documentos del gasto: " + error.message);
      setDocumentos([]);
      return;
    }

    setDocumentos((data as DocumentoGasto[]) || []);
  }

  async function abrirDocumento(documento: DocumentoGasto) {
    if (!documento.archivo_url) {
      alert("Este documento no tiene una ruta de archivo válida.");
      return;
    }

    if (/^https?:\/\//i.test(documento.archivo_url)) {
      window.open(documento.archivo_url, "_blank", "noopener,noreferrer");
      return;
    }

    const { data, error } = await supabase.storage
      .from("gastos-documentos")
      .createSignedUrl(documento.archivo_url, 120);

    if (error || !data?.signedUrl) {
      alert(
        "No fue posible abrir el documento privado: " +
          (error?.message || "URL firmada no generada."),
      );
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function actualizarRequisitoRecibo(requerido: boolean) {
    if (!gastoDocumentos) return;

    let motivo: string | null = null;

    if (!requerido) {
      motivo = window.prompt(
        "Indique por qué este gasto no requiere recibo del suplidor:",
        gastoDocumentos.motivo_recibo_no_requerido || "",
      );

      if (motivo === null) return;

      if (!motivo.trim()) {
        alert("Debe indicar el motivo para marcar el recibo como no requerido.");
        return;
      }
    }

    setProcesandoDocumento(true);

    const { error } = await supabase
      .from("gastos")
      .update({
        requiere_recibo_suplidor: requerido,
        motivo_recibo_no_requerido: requerido ? null : motivo?.trim(),
      })
      .eq("id", gastoDocumentos.id)
      .eq("condominio_id", gastoDocumentos.condominio_id);

    setProcesandoDocumento(false);

    if (error) {
      alert("No fue posible actualizar el requisito del recibo: " + error.message);
      return;
    }

    const gastoActualizado: Gasto = {
      ...gastoDocumentos,
      requiere_recibo_suplidor: requerido,
      motivo_recibo_no_requerido: requerido ? null : motivo?.trim() || null,
      estado_documentacion:
        Number(gastoDocumentos.cantidad_constancias_pago || 0) > 0
          ? "DOCUMENTACION_COMPLETA"
          : requerido
            ? "PENDIENTE_RECIBO"
            : "NO_REQUERIDO",
    };

    setGastoDocumentos(gastoActualizado);
    await cargarGastos(condominioId, condominioNombre);
  }

  function validarArchivo(archivo: File) {
    const extension = archivo.name.split(".").pop()?.toLowerCase() || "";

    if (
      !TIPOS_ARCHIVO_PERMITIDOS.includes(archivo.type) &&
      !EXTENSIONES_PERMITIDAS.includes(extension)
    ) {
      throw new Error("Solo se permiten archivos PDF, JPG, PNG o WEBP.");
    }

    if (archivo.size > TAMANO_MAXIMO) {
      throw new Error("El archivo no puede superar los 10 MB.");
    }
  }

  async function guardarConstanciaPago() {
    if (!gastoDocumentos) return;

    if (!gastoDocumentos.pagado) {
      alert("Solo se puede adjuntar la constancia después de registrar el pago.");
      return;
    }

    if (!gastoDocumentos.condominio_id) {
      alert("El gasto no tiene un condominio válido.");
      return;
    }

    if (!documentoForm.fecha_documento) {
      alert("Debe indicar la fecha del documento.");
      return;
    }

    if (!documentoForm.monto || Number(documentoForm.monto) <= 0) {
      alert("Debe indicar un monto válido.");
      return;
    }

    if (!archivoDocumento) {
      alert("Debe seleccionar el archivo del recibo o constancia.");
      return;
    }

    try {
      validarArchivo(archivoDocumento);
      setProcesandoDocumento(true);

      const tipoSeleccionado = TIPOS_CONSTANCIA.find(
        (item) => item.value === documentoForm.tipo_documento,
      );

      if (!tipoSeleccionado) {
        throw new Error("El tipo de documento seleccionado no es válido.");
      }

      const nombreSeguro =
        limpiarNombreArchivo(archivoDocumento.name) || "documento.pdf";
      const rutaArchivo = `condominio-${gastoDocumentos.condominio_id}/gasto-${gastoDocumentos.id}/${tipoSeleccionado.carpeta}/${idUnico()}-${nombreSeguro}`;

      const { data: documentoCreado, error: documentoError } = await supabase
        .from("gastos_documentos")
        .insert({
          condominio_id: gastoDocumentos.condominio_id,
          gasto_id: gastoDocumentos.id,
          proveedor_id: gastoDocumentos.proveedor_id || null,
          proveedor_nombre: nombreProveedor(gastoDocumentos),
          tipo_documento: documentoForm.tipo_documento,
          numero_documento: documentoForm.numero_documento.trim() || null,
          fecha_documento: documentoForm.fecha_documento,
          monto: Number(documentoForm.monto),
          nombre_archivo: archivoDocumento.name,
          archivo_url: rutaArchivo,
          mime_type: archivoDocumento.type || null,
          tamano_bytes: archivoDocumento.size,
          observaciones: documentoForm.observaciones.trim() || null,
          visible_propietarios: false,
          es_principal: false,
          estado: "ACTIVO",
        })
        .select("id")
        .single();

      if (documentoError || !documentoCreado) {
        throw new Error(
          "No fue posible registrar el documento: " +
            (documentoError?.message || "Registro no creado."),
        );
      }

      const { error: uploadError } = await supabase.storage
        .from("gastos-documentos")
        .upload(rutaArchivo, archivoDocumento, {
          cacheControl: "3600",
          upsert: false,
          contentType: archivoDocumento.type || undefined,
        });

      if (uploadError) {
        await supabase
          .from("gastos_documentos")
          .update({
            estado: "ANULADO",
            observaciones: `Carga fallida: ${uploadError.message}. ${
              documentoForm.observaciones.trim() || ""
            }`.trim(),
          })
          .eq("id", documentoCreado.id);

        throw new Error("Error subiendo el archivo: " + uploadError.message);
      }

      const { error: requisitoError } = await supabase
        .from("gastos")
        .update({
          requiere_recibo_suplidor: true,
          motivo_recibo_no_requerido: null,
        })
        .eq("id", gastoDocumentos.id)
        .eq("condominio_id", gastoDocumentos.condominio_id);

      if (requisitoError) {
        alert(
          "El documento fue guardado, pero no se pudo actualizar el indicador del recibo: " +
            requisitoError.message,
        );
      } else {
        alert("Recibo o constancia de pago guardado correctamente.");
      }

      setDocumentoForm({
        tipo_documento: "RECIBO_SUPLIDOR",
        numero_documento: "",
        fecha_documento: gastoDocumentos.fecha_pago || hoyISO(),
        monto: String(
          Number(gastoDocumentos.total || gastoDocumentos.monto || 0).toFixed(2),
        ),
        observaciones: "",
      });
      setArchivoDocumento(null);

      await Promise.all([
        cargarDocumentos(gastoDocumentos.id),
        cargarGastos(condominioId, condominioNombre),
      ]);

      setGastoDocumentos((actual) =>
        actual
          ? {
              ...actual,
              requiere_recibo_suplidor: true,
              motivo_recibo_no_requerido: null,
              cantidad_documentos: Number(actual.cantidad_documentos || 0) + 1,
              cantidad_constancias_pago:
                Number(actual.cantidad_constancias_pago || 0) + 1,
              estado_documentacion: "DOCUMENTACION_COMPLETA",
            }
          : actual,
      );
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "Ocurrió un error guardando la constancia de pago.",
      );
    } finally {
      setProcesandoDocumento(false);
    }
  }

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((g) => {
      let cumpleEstado = true;

      if (filtroEstado === "pagado") {
        cumpleEstado = g.pagado === true;
      }

      if (filtroEstado === "pendiente_pago") {
        cumpleEstado =
          g.aprobado_tesorero === true &&
          g.aprobado_presidente === true &&
          g.pagado !== true;
      }

      if (filtroEstado === "pendiente_presidente") {
        cumpleEstado =
          g.aprobado_tesorero === true && g.aprobado_presidente !== true;
      }

      if (filtroEstado === "sin_pagar") {
        cumpleEstado = g.pagado !== true;
      }

      if (filtroEstado === "pendiente_recibo") {
        cumpleEstado =
          g.pagado === true &&
          g.requiere_recibo_suplidor === true &&
          Number(g.cantidad_constancias_pago || 0) === 0;
      }

      if (filtroEstado === "documentacion_completa") {
        cumpleEstado =
          g.pagado === true && Number(g.cantidad_constancias_pago || 0) > 0;
      }

      if (filtroEstado === "no_requerido") {
        cumpleEstado =
          g.pagado === true &&
          g.requiere_recibo_suplidor !== true &&
          Number(g.cantidad_constancias_pago || 0) === 0;
      }

      const texto = `${g.id || ""} ${g.fecha || ""} ${g.concepto || ""} ${
        g.detalle_gasto || ""
      } ${g.no_factura || ""} ${g.ncf || ""} ${g.metodo_pago || ""} ${
        g.numero_cheque || ""
      } ${nombreProveedor(g)} ${
        g.catalogo_categoria_gastos?.nombre_categoria || ""
      } ${g.estado || ""} ${etiquetaEstadoDocumental(g)}`.toLowerCase();

      return cumpleEstado && texto.includes(buscar.toLowerCase().trim());
    });
  }, [gastos, buscar, filtroEstado]);

  const totalGastos = gastosFiltrados.reduce(
    (sum, g) => sum + Number(g.total || 0),
    0,
  );

  const totalPagado = gastosFiltrados
    .filter((g) => g.pagado)
    .reduce((sum, g) => sum + Number(g.total || 0), 0);

  const totalPendientePago = gastosFiltrados
    .filter(
      (g) =>
        g.aprobado_tesorero === true &&
        g.aprobado_presidente === true &&
        g.pagado !== true,
    )
    .reduce((sum, g) => sum + Number(g.total || 0), 0);

  const cantidadPagados = gastosFiltrados.filter((g) => g.pagado).length;

  const cantidadPendientePago = gastosFiltrados.filter(
    (g) =>
      g.aprobado_tesorero === true &&
      g.aprobado_presidente === true &&
      g.pagado !== true,
  ).length;

  const pendientesRecibo = gastosFiltrados.filter(
    (g) =>
      g.pagado === true &&
      g.requiere_recibo_suplidor === true &&
      Number(g.cantidad_constancias_pago || 0) === 0,
  );

  const totalPendienteRecibo = pendientesRecibo.reduce(
    (sum, g) => sum + Number(g.total || 0),
    0,
  );

  return (
    <PageContainer>
      <ModuleMenu
        title="Finanzas"
        subtitle="Pagos, gastos, solicitudes, caja chica, banco y reportes."
        tone="green"
        items={[
          { href: "/finanzas", label: "Dashboard", icon: BarChart3 },
          { href: "/finanzas/pagos", label: "Pagos", icon: CreditCard },
          {
            href: "/pagos-mantenimiento",
            label: "Mantenimiento",
            icon: WalletCards,
          },
          { href: "/gastos", label: "Gastos", icon: ReceiptText },
          {
            href: "/finanzas/caja-chica",
            label: "Caja Chica",
            icon: WalletCards,
          },
          { href: "/banco", label: "Banco", icon: Landmark },
          {
            href: "/solicitudes-pago",
            label: "Solicitudes",
            icon: FileText,
          },
          {
            href: "/presupuesto",
            label: "Presupuesto",
            icon: FileSpreadsheet,
          },
        ]}
      />

      <ModuleToolbar
        title="Gastos"
        subtitle="Consulta financiera, pagos y expediente documental de cada gasto."
        icon={ReceiptText}
        actions={
          <ModuleActions
            onRefresh={() => cargarGastos(condominioId, condominioNombre)}
            extra={
              <Link
                href="/solicitudes-pago"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
              >
                <FileText className="h-4 w-4" />
                Ir a solicitudes
              </Link>
            }
          />
        }
      />

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Los gastos se generan y pagan desde <strong>Solicitudes de Pago</strong>.
        En este módulo se consulta el gasto y se completa su expediente con el
        recibo o constancia emitida por el suplidor.
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Registros"
          value={gastosFiltrados.length}
          subtitle="Filtrados"
          icon={ReceiptText}
          tone="slate"
        />

        <StatCard
          title="Monto total"
          value={`RD$ ${dinero(totalGastos)}`}
          subtitle="Según filtros"
          icon={FileSpreadsheet}
          tone="red"
        />

        <StatCard
          title="Pagados"
          value={cantidadPagados}
          subtitle={`RD$ ${dinero(totalPagado)}`}
          icon={CheckCircle}
          tone="green"
        />

        <StatCard
          title="Pendientes pago"
          value={cantidadPendientePago}
          subtitle={`RD$ ${dinero(totalPendientePago)}`}
          icon={RefreshCw}
          tone="blue"
        />

        <StatCard
          title="Pendientes recibo"
          value={pendientesRecibo.length}
          subtitle={`RD$ ${dinero(totalPendienteRecibo)}`}
          icon={AlertTriangle}
          tone="red"
        />
      </div>

      <SectionCard
        title="Filtros"
        subtitle={`Condominio activo: ${condominioNombre || "No seleccionado"}`}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold">Estado</label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3"
            >
              <option value="">Todos</option>
              <option value="pagado">Pagados</option>
              <option value="pendiente_pago">Aprobados pendientes de pago</option>
              <option value="pendiente_presidente">Pendientes presidente</option>
              <option value="sin_pagar">Sin pagar</option>
              <option value="pendiente_recibo">Pendientes de recibo</option>
              <option value="documentacion_completa">
                Documentación completa
              </option>
              <option value="no_requerido">Recibo no requerido</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Buscar</label>

            <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="w-full bg-transparent outline-none"
                placeholder="Proveedor, concepto, factura, NCF, cheque o documentación..."
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Gastos registrados"
        subtitle="Listado de gastos y control del recibo emitido por el suplidor."
        action={
          <div className="text-lg font-black text-red-700">
            RD$ {dinero(totalGastos)}
          </div>
        }
      >
        {loading ? (
          <p className="text-slate-500">Cargando gastos...</p>
        ) : gastosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin gastos"
            description="No hay gastos registrados para esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Factura</th>
                <th className="px-4 py-3 text-center">Cheque</th>
                <th className="px-4 py-3 text-center">Pago</th>
                <th className="px-4 py-3 text-center">Documentación</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {gastosFiltrados.map((g) => (
                <tr key={g.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatoFecha(g.fecha)}
                  </td>

                  <td className="px-4 py-3">{nombreProveedor(g)}</td>

                  <td className="px-4 py-3">
                    {g.catalogo_categoria_gastos?.nombre_categoria || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-semibold">{g.concepto || "-"}</p>

                    {g.detalle_gasto && (
                      <p className="mt-1 max-w-md text-xs text-slate-500">
                        {g.detalle_gasto}
                      </p>
                    )}

                    <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                      <p>Gasto ID: {g.id}</p>
                      {g.no_factura && <p>Factura: {g.no_factura}</p>}
                      {g.ncf && <p>NCF: {g.ncf}</p>}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                    RD$ {dinero(g.total)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${estadoColor(
                        g,
                      )}`}
                    >
                      {etiquetaEstado(g)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {g.factura_url ? (
                      <a
                        href={g.factura_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white"
                      >
                        Ver factura
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Sin factura</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {g.cheque_url ? (
                      <a
                        href={g.cheque_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white"
                      >
                        Ver cheque
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Sin cheque</span>
                    )}

                    {g.numero_cheque && (
                      <p className="mt-1 text-xs text-slate-500">
                        No. {g.numero_cheque}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {g.pagado ? (
                      <div>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          Pagado
                        </span>

                        {g.fecha_pago && (
                          <p className="mt-1 text-xs text-slate-500">
                            {formatoFecha(g.fecha_pago)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                        Pendiente
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${colorEstadoDocumental(
                          g,
                        )}`}
                      >
                        {etiquetaEstadoDocumental(g)}
                      </span>

                      {Number(g.cantidad_documentos || 0) > 0 && (
                        <span className="text-[11px] text-slate-500">
                          {g.cantidad_documentos} documento(s)
                        </span>
                      )}

                      {g.motivo_recibo_no_requerido &&
                        !g.requiere_recibo_suplidor && (
                          <span
                            className="max-w-40 truncate text-[11px] text-slate-500"
                            title={g.motivo_recibo_no_requerido}
                          >
                            {g.motivo_recibo_no_requerido}
                          </span>
                        )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => abrirExpediente(g)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-white ${
                        g.pagado
                          ? "bg-blue-700 hover:bg-blue-800"
                          : "bg-slate-600 hover:bg-slate-700"
                      }`}
                    >
                      {g.pagado ? (
                        <ReceiptText className="h-3.5 w-3.5" />
                      ) : (
                        <FolderOpen className="h-3.5 w-3.5" />
                      )}
                      {g.pagado ? "Recibo / documentos" : "Ver documentos"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      {gastoDocumentos && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-4 w-full max-w-5xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Expediente documental del gasto
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Gasto ID {gastoDocumentos.id} · {nombreProveedor(gastoDocumentos)}
                  {" · "}RD$ {dinero(gastoDocumentos.total)}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarExpediente}
                disabled={procesandoDocumento}
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
              <div className="space-y-5">
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Estado de pago
                      </p>
                      <p className="mt-1 font-black text-slate-900">
                        {gastoDocumentos.pagado ? "Pagado" : "Pendiente"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Estado documental
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${colorEstadoDocumental(
                          gastoDocumentos,
                        )}`}
                      >
                        {etiquetaEstadoDocumental(gastoDocumentos)}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Fecha de pago
                      </p>
                      <p className="mt-1 font-semibold text-slate-700">
                        {formatoFecha(gastoDocumentos.fecha_pago)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        No. cheque
                      </p>
                      <p className="mt-1 font-semibold text-slate-700">
                        {gastoDocumentos.numero_cheque || "-"}
                      </p>
                    </div>
                  </div>

                  {gastoDocumentos.pagado && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                      {!gastoDocumentos.requiere_recibo_suplidor ? (
                        <button
                          type="button"
                          disabled={procesandoDocumento}
                          onClick={() => actualizarRequisitoRecibo(true)}
                          className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          Marcar recibo como requerido
                        </button>
                      ) : Number(gastoDocumentos.cantidad_constancias_pago || 0) ===
                        0 ? (
                        <button
                          type="button"
                          disabled={procesandoDocumento}
                          onClick={() => actualizarRequisitoRecibo(false)}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Marcar como no requerido
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>

                {gastoDocumentos.pagado ? (
                  <div className="rounded-2xl border p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Upload className="h-5 w-5 text-blue-700" />
                      <div>
                        <h3 className="font-black text-slate-900">
                          Adjuntar recibo o constancia
                        </h3>
                        <p className="text-xs text-slate-500">
                          El archivo quedará privado y relacionado con este gasto.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-semibold">
                          Tipo de constancia
                        </label>
                        <select
                          value={documentoForm.tipo_documento}
                          onChange={(e) =>
                            setDocumentoForm((actual) => ({
                              ...actual,
                              tipo_documento: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border bg-white px-4 py-3"
                        >
                          {TIPOS_CONSTANCIA.map((tipo) => (
                            <option key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold">
                          Número de recibo
                        </label>
                        <input
                          type="text"
                          value={documentoForm.numero_documento}
                          onChange={(e) =>
                            setDocumentoForm((actual) => ({
                              ...actual,
                              numero_documento: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border px-4 py-3"
                          placeholder="Opcional"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold">
                          Fecha del documento
                        </label>
                        <input
                          type="date"
                          value={documentoForm.fecha_documento}
                          onChange={(e) =>
                            setDocumentoForm((actual) => ({
                              ...actual,
                              fecha_documento: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border px-4 py-3"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-semibold">
                          Monto recibido
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={documentoForm.monto}
                          onChange={(e) =>
                            setDocumentoForm((actual) => ({
                              ...actual,
                              monto: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border px-4 py-3"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-semibold">
                          Archivo
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={(e) =>
                            setArchivoDocumento(e.target.files?.[0] || null)
                          }
                          className="w-full rounded-xl border bg-white px-4 py-3"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          PDF, JPG, PNG o WEBP. Máximo 10 MB.
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-semibold">
                          Observaciones
                        </label>
                        <textarea
                          value={documentoForm.observaciones}
                          onChange={(e) =>
                            setDocumentoForm((actual) => ({
                              ...actual,
                              observaciones: e.target.value,
                            }))
                          }
                          className="min-h-24 w-full rounded-xl border px-4 py-3"
                          placeholder="Detalle adicional del recibo o constancia..."
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={guardarConstanciaPago}
                      disabled={procesandoDocumento}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      {procesandoDocumento
                        ? "Guardando documento..."
                        : "Guardar recibo del suplidor"}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    El gasto todavía no está pagado. La constancia del suplidor se
                    adjunta después de registrar el egreso bancario.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-emerald-700" />
                    <div>
                      <h3 className="font-black text-slate-900">
                        Documentos anexos
                      </h3>
                      <p className="text-xs text-slate-500">
                        {documentos.length} documento(s) activo(s)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => cargarDocumentos(gastoDocumentos.id)}
                    disabled={loadingDocumentos || procesandoDocumento}
                    className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    aria-label="Actualizar documentos"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loadingDocumentos ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>

                {loadingDocumentos ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    Cargando documentos...
                  </p>
                ) : documentos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center">
                    <FolderOpen className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 font-bold text-slate-700">
                      Sin documentos anexos
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Todavía no se ha cargado una constancia para este gasto.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documentos.map((documento) => (
                      <div
                        key={documento.id}
                        className="rounded-2xl border bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-black text-slate-900">
                              {etiquetaTipoDocumento(documento.tipo_documento)}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {documento.nombre_archivo || "Documento sin nombre"}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => abrirDocumento(documento)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Abrir
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-slate-50 p-2">
                            <span className="font-bold text-slate-500">Fecha:</span>{" "}
                            {formatoFecha(documento.fecha_documento)}
                          </div>
                          <div className="rounded-lg bg-slate-50 p-2">
                            <span className="font-bold text-slate-500">Monto:</span>{" "}
                            RD$ {dinero(documento.monto)}
                          </div>
                          <div className="rounded-lg bg-slate-50 p-2">
                            <span className="font-bold text-slate-500">Número:</span>{" "}
                            {documento.numero_documento || "-"}
                          </div>
                          <div className="rounded-lg bg-slate-50 p-2">
                            <span className="font-bold text-slate-500">Cargado:</span>{" "}
                            {formatoFecha(documento.created_at)}
                          </div>
                        </div>

                        {documento.observaciones && (
                          <p className="mt-3 rounded-lg bg-blue-50 p-2 text-xs text-blue-800">
                            {documento.observaciones}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t p-6">
              <button
                type="button"
                onClick={cerrarExpediente}
                disabled={procesandoDocumento}
                className="rounded-xl border px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
