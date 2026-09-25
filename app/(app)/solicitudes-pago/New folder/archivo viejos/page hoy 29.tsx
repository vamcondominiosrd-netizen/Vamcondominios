"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  FileText,
  Files,
  FilterX,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type SolicitudPagoOperativa = {
  solicitud_id: number;
  numero_solicitud: number | null;
  condominio_id: number | null;
  condominio: string | null;
  fecha_solicitud: string | null;
  proveedor_id: number | null;
  categoria_id: number | null;
  concepto: string | null;
  detalle: string | null;
  monto: number | null;
  itbis: number | null;
  total_solicitud: number | null;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  soporte_url: string | null;
  factura_url?: string | null;
  cheque_url?: string | null;
  prioridad: string | null;
  estado_solicitud: string | null;
  created_by: string | null;
  created_at: string | null;
  fecha_revision_tesorero: string | null;
  comentario_tesorero: string | null;
  fecha_revision_presidente: string | null;
  comentario_presidente: string | null;
  gasto_generado_id: number | null;
  gasto_generado_at: string | null;
  gasto_id: number | null;
  estado_gasto: string | null;
  pagado: boolean | null;
  fecha_pago: string | null;
  cuenta_bancaria_id: number | null;
  total_gasto: number | null;
  movimientos_banco: number | null;
  total_banco: number | null;
  ultimo_movimiento_banco_id: number | null;
  ultima_fecha_banco: string | null;
  estado_operativo: string | null;
  proveedor_nombre?: string | null;
  categoria_nombre?: string | null;
};

type CuentaBancaria = {
  id: number;
  client_id: number | null;
  condominio_id: number;
  nombre_banco: string;
  numero_cuenta: string;
  tipo_cuenta: string | null;
  moneda: string | null;
  activa: boolean | null;
  balance_actual: number;
};

type PagoForm = {
  fecha_pago: string;
  cuenta_bancaria_id: string;
  metodo_pago: string;
  numero_documento: string;
  referencia_banco: string;
};

type VistaRapida =
  | "PENDIENTES"
  | "POR_PAGAR"
  | "REVISION"
  | "PAGADAS"
  | "TODAS";

type OrdenListado =
  | "RECIENTES"
  | "ANTIGUAS"
  | "MAYOR_MONTO"
  | "MENOR_MONTO"
  | "NUMERO";

const ESTADOS_OPERATIVOS = [
  "Pendiente tesorero",
  "Pendiente presidente",
  "Aprobada sin gasto",
  "Lista para pagar",
  "Pagada",
  "Revisar: pagado sin banco",
  "Revisar: gasto no existe",
  "Revisar: diferencia banco",
];

function normalizar(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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
  if (partes.length === 3) {
    const [year, month, day] = partes;
    return `${day}/${month}/${year}`;
  }
  return fecha;
}

function estadoColor(estado?: string | null) {
  const e = normalizar(estado);

  if (e === "pendiente tesorero") {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }

  if (e === "pendiente presidente") {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }

  if (e === "aprobada sin gasto") {
    return "bg-indigo-100 text-indigo-800 border-indigo-200";
  }

  if (e === "lista para pagar") {
    return "bg-purple-100 text-purple-800 border-purple-200";
  }

  if (e === "pagada" || e === "pagado") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }

  if (e.startsWith("revisar")) {
    return "bg-red-100 text-red-800 border-red-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

function numeroSolicitud(s: SolicitudPagoOperativa) {
  return s.numero_solicitud
    ? String(s.numero_solicitud).padStart(5, "0")
    : String(s.solicitud_id);
}

function esSolicitudNomina(s: SolicitudPagoOperativa) {
  const texto = normalizar(
    `${s.concepto || ""} ${s.detalle || ""} ${s.no_factura || ""}`,
  );

  return texto.includes("nomina") ||
    normalizar(s.no_factura).startsWith("nom-");
}

function puedeGenerarGastoSolicitud(s: SolicitudPagoOperativa) {
  if (s.gasto_generado_id || s.gasto_id) return false;

  if (s.estado_operativo === "Aprobada sin gasto") return true;

  const estadoSolicitud = normalizar(s.estado_solicitud);
  const estadoOperativo = normalizar(s.estado_operativo);

  return (
    esSolicitudNomina(s) &&
    (estadoSolicitud === "pendiente" ||
      estadoOperativo === "pendiente tesorero")
  );
}

function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

function esEstadoRevision(estado?: string | null) {
  return normalizar(estado).startsWith("revisar");
}

function esSolicitudPagada(solicitud: SolicitudPagoOperativa) {
  const estadoOperativo = normalizar(solicitud.estado_operativo);
  const estadoGasto = normalizar(solicitud.estado_gasto);

  return (
    estadoOperativo === "pagada" ||
    estadoOperativo === "pagado" ||
    solicitud.pagado === true ||
    estadoGasto === "pagado" ||
    estadoGasto === "pagada"
  );
}

function esSolicitudListaParaPagar(solicitud: SolicitudPagoOperativa) {
  return normalizar(solicitud.estado_operativo) === "lista para pagar";
}

function perteneceVistaRapida(
  solicitud: SolicitudPagoOperativa,
  vista: VistaRapida,
) {
  if (vista === "POR_PAGAR") {
    return esSolicitudListaParaPagar(solicitud);
  }

  if (vista === "REVISION") {
    return esEstadoRevision(solicitud.estado_operativo);
  }

  if (vista === "PAGADAS") {
    return esSolicitudPagada(solicitud);
  }

  if (vista === "PENDIENTES") {
    return !esSolicitudPagada(solicitud);
  }

  return true;
}

function fechaOrdenable(fecha?: string | null) {
  if (!fecha) return 0;
  const valor = new Date(fecha).getTime();
  return Number.isFinite(valor) ? valor : 0;
}

export default function SolicitudesPagoPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPagoOperativa[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [vistaRapida, setVistaRapida] =
    useState<VistaRapida>("PENDIENTES");
  const [filtroMes, setFiltroMes] = useState("");
  const [ordenListado, setOrdenListado] =
    useState<OrdenListado>("RECIENTES");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(20);
  const [detalleAbiertoId, setDetalleAbiertoId] =
    useState<number | null>(null);
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [modalPago, setModalPago] = useState<SolicitudPagoOperativa | null>(
    null,
  );
  const [pagoForm, setPagoForm] = useState<PagoForm>({
    fecha_pago: hoyISO(),
    cuenta_bancaria_id: "",
    metodo_pago: "Cheque",
    numero_documento: "",
    referencia_banco: "",
  });
  const [chequeArchivo, setChequeArchivo] = useState<File | null>(null);

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(idGuardado);
    setCondominioNombre(nombreGuardado);

    if (idGuardado || nombreGuardado) {
      cargarSolicitudes(idGuardado, nombreGuardado);
      cargarCuentasBancarias(idGuardado);
    }
  }, []);

  async function cargarCuentasBancarias(idActual = condominioId) {
    if (!idActual) {
      setCuentas([]);
      return;
    }

    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select(
        "id, client_id, condominio_id, nombre_banco, numero_cuenta, tipo_cuenta, moneda, activa, balance_actual",
      )
      .eq("condominio_id", Number(idActual))
      .eq("activa", true)
      .order("id", { ascending: true });

    if (error) {
      alert("Error cargando cuentas bancarias: " + error.message);
      setCuentas([]);
      return;
    }

    setCuentas((data as CuentaBancaria[]) || []);
  }

  async function cargarSolicitudes(
    idActual = condominioId,
    nombreActual = condominioNombre,
  ) {
    setLoading(true);

    try {
      let query = supabase
        .from("v_solicitudes_pago_operativas")
        .select("*")
        .order("created_at", { ascending: false });

      if (idActual) {
        query = query.eq("condominio_id", Number(idActual));
      } else if (nombreActual) {
        query = query.eq("condominio", nombreActual);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(
          "Error cargando solicitudes: " + error.message,
        );
      }

      const solicitudesBase =
        (data as SolicitudPagoOperativa[]) || [];

      const proveedorIds = Array.from(
        new Set(
          solicitudesBase
            .map((item) => Number(item.proveedor_id || 0))
            .filter((id) => id > 0),
        ),
      );

      const categoriaIds = Array.from(
        new Set(
          solicitudesBase
            .map((item) => Number(item.categoria_id || 0))
            .filter((id) => id > 0),
        ),
      );

      const proveedorMap = new Map<number, string>();
      const categoriaMap = new Map<number, string>();

      const [proveedoresResponse, categoriasResponse] =
        await Promise.all([
          proveedorIds.length > 0
            ? supabase
                .from("catalogo_proveedores")
                .select("id, nombre_proveedor")
                .eq(
                  "condominio_id",
                  Number(
                    idActual ||
                      solicitudesBase[0]?.condominio_id ||
                      0
                  )
                )
                .in("id", proveedorIds)
            : Promise.resolve({ data: [], error: null }),
          categoriaIds.length > 0
            ? supabase
                .from("catalogo_categoria_gastos")
                .select("id, nombre_categoria")
                .eq(
                  "condominio_id",
                  Number(
                    idActual ||
                      solicitudesBase[0]?.condominio_id ||
                      0
                  )
                )
                .in("id", categoriaIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (proveedoresResponse.error) {
        console.warn(
          "No se pudieron cargar los nombres de proveedores:",
          proveedoresResponse.error.message,
        );
      } else {
        (proveedoresResponse.data || []).forEach((item: any) => {
          proveedorMap.set(
            Number(item.id),
            String(item.nombre_proveedor || "").trim(),
          );
        });
      }

      if (categoriasResponse.error) {
        console.warn(
          "No se pudieron cargar los nombres de categorías:",
          categoriasResponse.error.message,
        );
      } else {
        (categoriasResponse.data || []).forEach((item: any) => {
          categoriaMap.set(
            Number(item.id),
            String(item.nombre_categoria || "").trim(),
          );
        });
      }

      const solicitudesCompletas = solicitudesBase.map(
        (solicitud) => ({
          ...solicitud,
          proveedor_nombre:
            solicitud.proveedor_nombre ||
            (solicitud.proveedor_id
              ? proveedorMap.get(Number(solicitud.proveedor_id)) ||
                null
              : null),
          categoria_nombre:
            solicitud.categoria_nombre ||
            (solicitud.categoria_id
              ? categoriaMap.get(Number(solicitud.categoria_id)) ||
                null
              : null),
        }),
      );

      setSolicitudes(solicitudesCompletas);
    } catch (error: any) {
      alert(error?.message || "No se pudieron cargar las solicitudes.");
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  }

  async function generarGasto(s: SolicitudPagoOperativa) {
    if (s.gasto_generado_id || s.gasto_id) {
      alert("Esta solicitud ya tiene un gasto generado.");
      return;
    }

    if (!puedeGenerarGastoSolicitud(s)) {
      alert("Esta solicitud todavía no está lista para generar gasto.");
      return;
    }

    const confirmar = confirm(
      `¿Desea generar el gasto de esta solicitud?\n\nSolicitud: ${numeroSolicitud(
        s,
      )}\nConcepto: ${s.concepto || ""}\nTotal: RD$ ${dinero(
        s.total_solicitud,
      )}`,
    );

    if (!confirmar) return;

    const nominaPendienteAprobacion =
      esSolicitudNomina(s) && s.estado_operativo !== "Aprobada sin gasto";

    try {
      setProcesandoId(s.solicitud_id);

      const { data: gastoData, error: gastoError } = await supabase
        .from("gastos")
        .insert([
          {
            condominio_id:
              s.condominio_id || (condominioId ? Number(condominioId) : null),
            condominio: s.condominio || condominioNombre,
            fecha: s.fecha_solicitud,
            categoria: s.categoria_nombre || null,
            descripcion: s.detalle || s.concepto,
            proveedor: s.proveedor_nombre || null,
            proveedor_id: s.proveedor_id,
            categoria_id: s.categoria_id,
            concepto: s.concepto,
            detalle_gasto: s.detalle,
            monto: Number(s.monto || 0),
            itbis: Number(s.itbis || 0),
            total: Number(s.total_solicitud || 0),
            no_factura: s.no_factura,
            ncf: s.ncf,
            metodo_pago: s.metodo_pago,
            cuenta_banco: s.cuenta_banco,
            factura_url: s.soporte_url,
            estado: nominaPendienteAprobacion
              ? "Pendiente aprobación tesorero"
              : "Gasto generado",
            aprobado_tesorero: nominaPendienteAprobacion ? false : true,
            aprobado_presidente: nominaPendienteAprobacion ? false : true,
            fecha_aprobacion_tesorero: nominaPendienteAprobacion
              ? null
              : s.fecha_revision_tesorero || null,
            fecha_aprobacion_presidente: nominaPendienteAprobacion
              ? null
              : s.fecha_revision_presidente || null,
            pagado: false,
          },
        ])
        .select("id")
        .single();

      if (gastoError) {
        alert("Error generando gasto: " + gastoError.message);
        return;
      }

      const datosActualizacionSolicitud = nominaPendienteAprobacion
        ? {
            estado: "Pendiente aprobación tesorero",
            gasto_generado_id: gastoData.id,
            gasto_generado_at: new Date().toISOString(),
          }
        : {
            estado: "Gasto generado",
            gasto_generado_id: gastoData.id,
            gasto_generado_at: new Date().toISOString(),
          };

      const { error: updateError } = await supabase
        .from("solicitudes_pago")
        .update(datosActualizacionSolicitud)
        .eq("id", s.solicitud_id);

      if (updateError) {
        const { error: rollbackError } = await supabase
          .from("gastos")
          .delete()
          .eq("id", gastoData.id);

        alert(
          rollbackError
            ? "Ocurrió un error actualizando la solicitud y no fue posible revertir el gasto creado. Revise el gasto ID " +
                gastoData.id +
                ". Detalle: " +
                updateError.message
            : "No se pudo actualizar la solicitud. El gasto creado fue revertido para evitar registros incompletos. Detalle: " +
                updateError.message,
        );
        return;
      }

      alert(
        nominaPendienteAprobacion
          ? "Gasto de nómina generado correctamente y enviado al tesorero para aprobación."
          : "Gasto generado correctamente.",
      );
      cargarSolicitudes();
    } catch (error: any) {
      alert(error.message || "Error generando gasto.");
    } finally {
      setProcesandoId(null);
    }
  }

    function facturaProveedorUrl(s: SolicitudPagoOperativa) {
     return s.soporte_url || s.factura_url || "";
  }

  async function subirComprobantePago(archivo: File) {
    const extension = archivo.name.split(".").pop() || "pdf";
    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const carpetaCondominio =
      condominioId || String(modalPago?.condominio_id || "general");
    const rutaArchivo = `${carpetaCondominio}/cheques-pagos/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("soportes-solicitudes-pago")
      .upload(rutaArchivo, archivo);

    if (error) {
      throw new Error("Error subiendo cheque/comprobante: " + error.message);
    }

    const { data } = supabase.storage
      .from("soportes-solicitudes-pago")
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  function abrirModalPago(s: SolicitudPagoOperativa) {
    if (!esSolicitudListaParaPagar(s)) {
      alert("Esta solicitud no está lista para pagar.");
      return;
    }

    const cuentaDefault =
      s.cuenta_bancaria_id || (cuentas.length === 1 ? cuentas[0].id : null);

    setPagoForm({
      fecha_pago: s.fecha_pago || s.fecha_solicitud || hoyISO(),
      cuenta_bancaria_id: cuentaDefault ? String(cuentaDefault) : "",
      metodo_pago: s.metodo_pago || "Cheque",
      numero_documento: "",
      referencia_banco: "",
    });
    setChequeArchivo(null);
    setModalPago(s);
  }

  async function completarPago() {
    if (!modalPago) return;

    if (!modalPago.gasto_generado_id && !modalPago.gasto_id) {
      alert("Primero debe generar el gasto.");
      return;
    }

    if (!esSolicitudListaParaPagar(modalPago)) {
      alert("Esta solicitud no está lista para pagar.");
      return;
    }

    if (!pagoForm.fecha_pago) {
      alert("Debe indicar la fecha real del pago.");
      return;
    }

    if (!pagoForm.cuenta_bancaria_id) {
      alert("Debe seleccionar la cuenta bancaria del condominio.");
      return;
    }

    if (!pagoForm.metodo_pago) {
      alert("Debe indicar el método de pago.");
      return;
    }

    if (!pagoForm.numero_documento) {
      alert("Debe indicar el número de cheque, transferencia o documento.");
      return;
    }

    const referenciaBanco =
      pagoForm.referencia_banco || pagoForm.numero_documento;

    const confirmar = confirm(
      `¿Desea procesar este pago y registrar el EGRESO bancario?\n\nSolicitud: ${numeroSolicitud(
        modalPago,
      )}\nConcepto: ${modalPago.concepto || ""}\nTotal: RD$ ${dinero(
        modalPago.total_solicitud,
      )}`,
    );

    if (!confirmar) return;

    try {
      setProcesandoId(modalPago.solicitud_id);

      let chequeUrl: string | null = null;

      if (chequeArchivo) {
        chequeUrl = await subirComprobantePago(chequeArchivo);
      }

      const { data, error } = await supabase.rpc(
        "pagar_solicitud_pago_bancaria",
        {
          p_solicitud_id: modalPago.solicitud_id,
          p_cuenta_bancaria_id: Number(pagoForm.cuenta_bancaria_id),
          p_fecha_pago: pagoForm.fecha_pago,
          p_metodo_pago: pagoForm.metodo_pago,
          p_numero_documento: pagoForm.numero_documento,
          p_referencia_banco: referenciaBanco,
          p_cheque_url: chequeUrl,
        },
      );

      if (error) {
        alert("Error completando el pago: " + error.message);
        return;
      }

      alert(data?.mensaje || "Pago completado correctamente.");
      setModalPago(null);
      setChequeArchivo(null);
      cargarSolicitudes();
    } catch (error: any) {
      alert(error.message || "Error completando el pago.");
    } finally {
      setProcesandoId(null);
    }
  }

  useEffect(() => {
    setPagina(1);
  }, [
    buscar,
    filtroEstado,
    vistaRapida,
    filtroMes,
    ordenListado,
    porPagina,
  ]);

  const solicitudesFiltradas = useMemo(() => {
    const busqueda = normalizar(buscar);

    const resultado = solicitudes.filter((s) => {
      const estadoOperativo = s.estado_operativo || "";
      const cumpleVista = perteneceVistaRapida(
        s,
        vistaRapida,
      );
      const cumpleEstado =
        filtroEstado === "" ||
        normalizar(estadoOperativo) === normalizar(filtroEstado);

      const fechaFiltro =
        vistaRapida === "PAGADAS"
          ? s.fecha_pago || s.ultima_fecha_banco || s.fecha_solicitud
          : s.fecha_solicitud;

      const cumpleMes =
        filtroMes === "" ||
        String(fechaFiltro || "").startsWith(filtroMes);

      const contenido = normalizar(
        `${s.solicitud_id} ${s.numero_solicitud || ""} ${
          s.concepto || ""
        } ${s.detalle || ""} ${
          s.proveedor_nombre || ""
        } ${s.categoria_nombre || ""} ${
          s.no_factura || ""
        } ${s.ncf || ""} ${
          s.estado_solicitud || ""
        } ${s.estado_operativo || ""}`,
      );

      return (
        cumpleVista &&
        cumpleEstado &&
        cumpleMes &&
        contenido.includes(busqueda)
      );
    });

    return [...resultado].sort((a, b) => {
      if (ordenListado === "ANTIGUAS") {
        return (
          fechaOrdenable(a.fecha_solicitud) -
          fechaOrdenable(b.fecha_solicitud)
        );
      }

      if (ordenListado === "MAYOR_MONTO") {
        return (
          Number(b.total_solicitud || 0) -
          Number(a.total_solicitud || 0)
        );
      }

      if (ordenListado === "MENOR_MONTO") {
        return (
          Number(a.total_solicitud || 0) -
          Number(b.total_solicitud || 0)
        );
      }

      if (ordenListado === "NUMERO") {
        return (
          Number(b.numero_solicitud || b.solicitud_id) -
          Number(a.numero_solicitud || a.solicitud_id)
        );
      }

      return (
        fechaOrdenable(b.fecha_solicitud) -
        fechaOrdenable(a.fecha_solicitud)
      );
    });
  }, [
    solicitudes,
    filtroEstado,
    buscar,
    vistaRapida,
    filtroMes,
    ordenListado,
  ]);

  const totalSolicitado = solicitudesFiltradas.reduce(
    (sum, s) =>
      sum + Number(s.total_solicitud || 0),
    0,
  );

  const totalPaginas = Math.max(
    1,
    Math.ceil(
      solicitudesFiltradas.length / porPagina,
    ),
  );

  const paginaSegura = Math.min(
    pagina,
    totalPaginas,
  );

  const inicioPagina =
    (paginaSegura - 1) * porPagina;

  const solicitudesPagina = solicitudesFiltradas.slice(
    inicioPagina,
    inicioPagina + porPagina,
  );

  const resumenRapido = useMemo(() => {
    const calcular = (
      condicion: (s: SolicitudPagoOperativa) => boolean,
    ) => {
      const registros = solicitudes.filter(condicion);

      return {
        cantidad: registros.length,
        total: registros.reduce(
          (suma, item) =>
            suma + Number(item.total_solicitud || 0),
          0,
        ),
      };
    };

    return {
      pendientes: calcular(
        (s) => !esSolicitudPagada(s),
      ),
      porPagar: calcular(
        (s) => esSolicitudListaParaPagar(s),
      ),
      revision: calcular((s) =>
        esEstadoRevision(s.estado_operativo),
      ),
      pagadas: calcular(
        (s) => esSolicitudPagada(s),
      ),
      todas: calcular(() => true),
    };
  }, [solicitudes]);

  function aplicarVista(vista: VistaRapida) {
    setVistaRapida(vista);
    setFiltroEstado("");
    setDetalleAbiertoId(null);
  }

  function limpiarFiltros() {
    setBuscar("");
    setFiltroEstado("");
    setVistaRapida("PENDIENTES");
    setFiltroMes("");
    setOrdenListado("RECIENTES");
    setPorPagina(20);
    setDetalleAbiertoId(null);
  }

  function exportarExcel() {
    const dataExcel = solicitudesFiltradas.map((s) => ({
      ID: s.solicitud_id,
      "No. Solicitud": s.numero_solicitud || "",
      Condominio: s.condominio || "",
      Fecha: s.fecha_solicitud || "",
      Proveedor:
        s.proveedor_nombre || (s.proveedor_id ? `ID ${s.proveedor_id}` : ""),
      Categoría:
        s.categoria_nombre || (s.categoria_id ? `ID ${s.categoria_id}` : ""),
      Concepto: s.concepto || "",
      Monto: Number(s.monto || 0),
      ITBIS: Number(s.itbis || 0),
      Total: Number(s.total_solicitud || 0),
      "Estado solicitud": s.estado_solicitud || "",
      "Estado operativo": s.estado_operativo || "",
      "No. Factura": s.no_factura || "",
      NCF: s.ncf || "",
      "Factura proveedor": facturaProveedorUrl(s),
      "Cheque / comprobante": s.cheque_url || "",
      "Gasto ID": s.gasto_id || s.gasto_generado_id || "",
      "Movimientos banco": Number(s.movimientos_banco || 0),
      "Total banco": Number(s.total_banco || 0),
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Solicitudes");
    XLSX.writeFile(
      libro,
      `Solicitudes_${condominioNombre || condominioId}.xlsx`,
    );
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Solicitudes de Pago"
        subtitle="Nueva solicitud, aprobaciones, gastos generados, pagos y control bancario."
        tone="green"
        items={[
          { href: "/solicitudes-pago", label: "Listado", icon: ClipboardCheck },
          {
            href: "/solicitudes-pago/nueva",
            label: "Nueva Solicitud",
            icon: Plus,
          },
           {
              href: "/solicitudes-pago/agrupada",
              label: "Solicitud Agrupada",
              icon: Files,
            },
          {
            href: "/solicitudes-pago/tesorero",
            label: "Tesorero",
            icon: ShieldCheck,
          },
          {
            href: "/solicitudes-pago/presidente",
            label: "Presidente",
            icon: ShieldCheck,
          },
          {
            href: "/solicitudes-pago/resumen",
            label: "Resumen",
            icon: BarChart3,
          },
          { href: "/gastos", label: "Gastos", icon: WalletCards },
          {
            href: "/gastos/regularizar-sin-banco",
            label: "Regularizar sin banco",
            icon: Wrench,
          },
        ]}
      />

      <ModuleToolbar
        title="Solicitudes y Pagos"
        subtitle={`Condominio activo: ${condominioNombre || "No seleccionado"}`}
        icon={FileText}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/solicitudes-pago/nueva"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Nueva solicitud
            </Link>

            <Link
              href="/gastos/regularizar-sin-banco"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
            >
              <Wrench className="h-4 w-4" />
              Regularizar sin banco
            </Link>

            <button
              type="button"
              onClick={() =>
                cargarSolicitudes(
                  condominioId,
                  condominioNombre,
                )
              }
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Actualizar
            </button>

            <button
              type="button"
              onClick={exportarExcel}
              className="rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
            >
              Exportar
            </button>
          </div>
        }
      />

      <SectionCard
        title="Bandeja de solicitudes"
        subtitle="Accesos rápidos para trabajar primero lo que necesita atención."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <VistaCard
            activa={vistaRapida === "PENDIENTES"}
            titulo="Pendientes"
            cantidad={resumenRapido.pendientes.cantidad}
            total={resumenRapido.pendientes.total}
            tono="amber"
            onClick={() =>
              aplicarVista("PENDIENTES")
            }
          />

          <VistaCard
            activa={vistaRapida === "POR_PAGAR"}
            titulo="Por pagar"
            cantidad={resumenRapido.porPagar.cantidad}
            total={resumenRapido.porPagar.total}
            tono="purple"
            onClick={() =>
              aplicarVista("POR_PAGAR")
            }
          />

          <VistaCard
            activa={vistaRapida === "REVISION"}
            titulo="Requieren revisión"
            cantidad={resumenRapido.revision.cantidad}
            total={resumenRapido.revision.total}
            tono="red"
            onClick={() =>
              aplicarVista("REVISION")
            }
          />

          <VistaCard
            activa={vistaRapida === "PAGADAS"}
            titulo="Pagadas"
            cantidad={resumenRapido.pagadas.cantidad}
            total={resumenRapido.pagadas.total}
            tono="green"
            onClick={() =>
              aplicarVista("PAGADAS")
            }
          />

          <VistaCard
            activa={vistaRapida === "TODAS"}
            titulo="Todas"
            cantidad={resumenRapido.todas.cantidad}
            total={resumenRapido.todas.total}
            tono="slate"
            onClick={() => aplicarVista("TODAS")}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Buscar y organizar"
        subtitle="Filtra por mes, estado o palabra y decide cuántos registros mostrar."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <label className="lg:col-span-4">
            <span className="mb-1 block text-sm font-semibold">
              Buscar
            </span>
            <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={buscar}
                onChange={(e) =>
                  setBuscar(e.target.value)
                }
                className="w-full bg-transparent outline-none"
                placeholder="Número, proveedor, concepto, factura o NCF..."
              />
            </div>
          </label>

          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-semibold">
              Mes
            </span>
            <input
              type="month"
              value={filtroMes}
              onChange={(e) =>
                setFiltroMes(e.target.value)
              }
              className="w-full rounded-xl border bg-white px-3 py-3"
            />
          </label>

          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-semibold">
              Estado exacto
            </span>
            <select
              value={filtroEstado}
              onChange={(e) =>
                setFiltroEstado(e.target.value)
              }
              className="w-full rounded-xl border bg-white px-3 py-3"
            >
              <option value="">Todos</option>
              {ESTADOS_OPERATIVOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </label>

          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-semibold">
              Orden
            </span>
            <select
              value={ordenListado}
              onChange={(e) =>
                setOrdenListado(
                  e.target.value as OrdenListado,
                )
              }
              className="w-full rounded-xl border bg-white px-3 py-3"
            >
              <option value="RECIENTES">
                Más recientes
              </option>
              <option value="ANTIGUAS">
                Más antiguas
              </option>
              <option value="MAYOR_MONTO">
                Mayor monto
              </option>
              <option value="MENOR_MONTO">
                Menor monto
              </option>
              <option value="NUMERO">
                Número de solicitud
              </option>
            </select>
          </label>

          <label className="lg:col-span-1">
            <span className="mb-1 block text-sm font-semibold">
              Filas
            </span>
            <select
              value={porPagina}
              onChange={(e) =>
                setPorPagina(Number(e.target.value))
              }
              className="w-full rounded-xl border bg-white px-3 py-3"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>

          <div className="flex items-end lg:col-span-1">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              title="Limpiar filtros"
            >
              <FilterX className="h-4 w-4" />
              <span className="lg:hidden">
                Limpiar
              </span>
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Listado de solicitudes"
        subtitle={`${solicitudesFiltradas.length} solicitud(es) encontradas · Total: RD$ ${dinero(
          totalSolicitado,
        )}`}
      >
        {loading ? (
          <p className="rounded-xl border bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            Cargando solicitudes...
          </p>
        ) : (
          <>
            <div className="overflow-auto rounded-2xl border">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
                  <tr>
                    <th className="border p-2 text-left">
                      Solicitud
                    </th>
                    <th className="border p-2 text-left">
                      Proveedor y concepto
                    </th>
                    <th className="border p-2 text-right">
                      Total
                    </th>
                    <th className="border p-2 text-center">
                      Estado
                    </th>
                    <th className="border p-2 text-center">
                      Documentos
                    </th>
                    <th className="border p-2 text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {solicitudesPagina.map((s) => {
                    const estadoOperativo =
                      s.estado_operativo || "Revisar";
                    const puedeGenerarGasto =
                      puedeGenerarGastoSolicitud(s);
                    const puedePagar =
                      esSolicitudListaParaPagar(s);
                    const esPagada =
                      esSolicitudPagada(s);
                    const requiereRevision =
                      esEstadoRevision(estadoOperativo);
                    const detalleAbierto =
                      detalleAbiertoId ===
                      s.solicitud_id;

                    return (
                      <Fragment key={s.solicitud_id}>
                        <tr
                          className="hover:bg-slate-50"
                        >
                          <td className="border p-3 align-top">
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setDetalleAbiertoId(
                                    detalleAbierto
                                      ? null
                                      : s.solicitud_id,
                                  )
                                }
                                className="mt-0.5 rounded-lg border bg-white p-1.5 text-slate-600 hover:bg-slate-100"
                                title={
                                  detalleAbierto
                                    ? "Ocultar detalles"
                                    : "Ver detalles"
                                }
                              >
                                {detalleAbierto ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>

                              <div>
                                <div className="font-black text-slate-900">
                                  No. {numeroSolicitud(s)}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {formatoFecha(
                                    s.fecha_solicitud,
                                  )}{" "}
                                  · ID {s.solicitud_id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="border p-3 align-top">
                            <div className="font-bold text-slate-900">
                              {s.proveedor_nombre ||
                                (s.proveedor_id
                                  ? `Proveedor ID ${s.proveedor_id}`
                                  : "Sin proveedor")}
                            </div>
                            <div className="mt-1 font-semibold text-slate-700">
                              {s.concepto || "-"}
                            </div>
                            {s.categoria_nombre && (
                              <div className="mt-1 text-xs text-slate-500">
                                {s.categoria_nombre}
                              </div>
                            )}
                          </td>

                          <td className="border p-3 text-right align-top font-black text-green-700">
                            RD$ {dinero(s.total_solicitud)}
                          </td>

                          <td className="border p-3 text-center align-top">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoColor(
                                estadoOperativo,
                              )}`}
                            >
                              {estadoOperativo}
                            </span>

                            {Number(
                              s.movimientos_banco || 0,
                            ) > 0 && (
                              <div className="mt-2 text-xs font-bold text-emerald-700">
                                Banco OK · RD${" "}
                                {dinero(s.total_banco)}
                              </div>
                            )}
                          </td>

                          <td className="border p-3 align-top">
                            <div className="flex flex-wrap justify-center gap-2">
                              {facturaProveedorUrl(s) ? (
                                <a
                                  href={facturaProveedorUrl(
                                    s,
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                                >
                                  Factura
                                </a>
                              ) : (
                                <span className="rounded-lg border px-3 py-1.5 text-xs text-slate-400">
                                  Sin factura
                                </span>
                              )}

                              {s.cheque_url ? (
                                <a
                                  href={s.cheque_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                                >
                                  Cheque
                                </a>
                              ) : (
                                <span className="rounded-lg border px-3 py-1.5 text-xs text-slate-400">
                                  Sin cheque
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="border p-3 align-top">
                            <div className="flex flex-wrap justify-center gap-2">
                              <Link
                                href={`/solicitudes-pago/reporte/${s.solicitud_id}`}
                                className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                              >
                                <Printer className="h-3 w-3" />
                                Imprimir
                              </Link>

                              {puedeGenerarGasto && (
                                <button
                                  type="button"
                                  disabled={
                                    procesandoId ===
                                    s.solicitud_id
                                  }
                                  onClick={() =>
                                    generarGasto(s)
                                  }
                                  className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                                >
                                  {procesandoId ===
                                  s.solicitud_id
                                    ? "Procesando..."
                                    : "Generar gasto"}
                                </button>
                              )}

                              {puedePagar && (
                                <button
                                  type="button"
                                  disabled={
                                    procesandoId ===
                                    s.solicitud_id
                                  }
                                  onClick={() =>
                                    abrirModalPago(s)
                                  }
                                  className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                                >
                                  Procesar pago
                                </button>
                              )}

                              {requiereRevision &&
                                estadoOperativo ===
                                  "Revisar: pagado sin banco" &&
                                (s.gasto_id ||
                                  s.gasto_generado_id) && (
                                  <Link
                                    href={`/gastos/regularizar-sin-banco?gasto_id=${
                                      s.gasto_id ||
                                      s.gasto_generado_id
                                    }`}
                                    className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
                                  >
                                    Corregir
                                  </Link>
                                )}

                              {esPagada &&
                                !puedePagar && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Pagada
                                  </span>
                                )}
                            </div>
                          </td>
                        </tr>

                        {detalleAbierto && (
                          <tr
                            key={`${s.solicitud_id}-detalle`}
                            className="bg-slate-50"
                          >
                            <td
                              colSpan={6}
                              className="border p-4"
                            >
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <DatoDetalle
                                  titulo="Estado guardado"
                                  valor={
                                    s.estado_solicitud ||
                                    "-"
                                  }
                                />
                                <DatoDetalle
                                  titulo="Gasto relacionado"
                                  valor={
                                    s.gasto_id ||
                                    s.gasto_generado_id
                                      ? `ID ${
                                          s.gasto_id ||
                                          s.gasto_generado_id
                                        }`
                                      : "Sin gasto"
                                  }
                                />
                                <DatoDetalle
                                  titulo="Factura / NCF"
                                  valor={[
                                    s.no_factura
                                      ? `Fact. ${s.no_factura}`
                                      : "",
                                    s.ncf
                                      ? `NCF ${s.ncf}`
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" · ") || "-"}
                                />
                                <DatoDetalle
                                  titulo="Banco"
                                  valor={
                                    Number(
                                      s.movimientos_banco ||
                                        0,
                                    ) > 0
                                      ? `${s.movimientos_banco} movimiento(s) · RD$ ${dinero(
                                          s.total_banco,
                                        )}`
                                      : "Sin movimiento bancario"
                                  }
                                />
                              </div>

                              {s.detalle && (
                                <div className="mt-3 rounded-xl border bg-white p-3">
                                  <div className="text-xs font-black uppercase text-slate-500">
                                    Detalle
                                  </div>
                                  <div className="mt-1 text-sm text-slate-700">
                                    {s.detalle}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}

                  {solicitudesPagina.length === 0 && (
                    <tr>
                      <td
                        className="border p-8 text-center text-slate-500"
                        colSpan={6}
                      >
                        No hay solicitudes para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                Mostrando{" "}
                {solicitudesFiltradas.length === 0
                  ? 0
                  : inicioPagina + 1}{" "}
                a{" "}
                {Math.min(
                  inicioPagina + porPagina,
                  solicitudesFiltradas.length,
                )}{" "}
                de {solicitudesFiltradas.length}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPagina((actual) =>
                      Math.max(1, actual - 1),
                    )
                  }
                  disabled={paginaSegura <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>

                <span className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-black text-white">
                  {paginaSegura} / {totalPaginas}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPagina((actual) =>
                      Math.min(
                        totalPaginas,
                        actual + 1,
                      ),
                    )
                  }
                  disabled={
                    paginaSegura >= totalPaginas
                  }
                  className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {modalPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Procesar pago
                </h2>
                <p className="text-sm text-slate-500">
                  Solicitud {numeroSolicitud(modalPago)} · RD${" "}
                  {dinero(modalPago.total_solicitud)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalPago(null);
                  setChequeArchivo(null);
                }}
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-2xl border bg-slate-50 p-4">
              <div className="text-sm font-black text-slate-900">
                {modalPago.concepto || "Solicitud sin concepto"}
              </div>
              {modalPago.detalle && (
                <div className="mt-1 text-sm text-slate-600">
                  {modalPago.detalle}
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
                <div className="rounded-xl border bg-white p-3">
                  <div className="font-black text-slate-700">No. factura</div>
                  <div className="text-slate-600">{modalPago.no_factura || "-"}</div>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <div className="font-black text-slate-700">NCF</div>
                  <div className="text-slate-600">{modalPago.ncf || "-"}</div>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <div className="font-black text-slate-700">Factura proveedor</div>
                  {facturaProveedorUrl(modalPago) ? (
                    <a
                      href={facturaProveedorUrl(modalPago)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-blue-700 underline"
                    >
                      Ver factura / soporte
                    </a>
                  ) : (
                    <div className="text-slate-500">Sin factura</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Fecha real de pago
                </label>
                <input
                  type="date"
                  value={pagoForm.fecha_pago}
                  onChange={(e) =>
                    setPagoForm((prev) => ({
                      ...prev,
                      fecha_pago: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Cuenta bancaria del condominio
                </label>
                <select
                  value={pagoForm.cuenta_bancaria_id}
                  onChange={(e) =>
                    setPagoForm((prev) => ({
                      ...prev,
                      cuenta_bancaria_id: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border bg-white px-4 py-3"
                >
                  <option value="">Seleccione cuenta</option>
                  {cuentas.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.nombre_banco} · {cuenta.numero_cuenta} · RD${" "}
                      {dinero(cuenta.balance_actual)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Método de pago
                </label>
                <select
                  value={pagoForm.metodo_pago}
                  onChange={(e) =>
                    setPagoForm((prev) => ({
                      ...prev,
                      metodo_pago: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border bg-white px-4 py-3"
                >
                  <option value="Cheque">Cheque</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Pago electrónico">Pago electrónico</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Número documento
                </label>
                <input
                  type="text"
                  value={pagoForm.numero_documento}
                  onChange={(e) =>
                    setPagoForm((prev) => ({
                      ...prev,
                      numero_documento: e.target.value,
                      referencia_banco:
                        prev.referencia_banco || e.target.value || "",
                    }))
                  }
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="Cheque, transferencia o documento"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  Referencia bancaria
                </label>
                <input
                  type="text"
                  value={pagoForm.referencia_banco}
                  onChange={(e) =>
                    setPagoForm((prev) => ({
                      ...prev,
                      referencia_banco: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="Si está vacío usa el número de documento"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  Cheque / comprobante de pago
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) =>
                    setChequeArchivo(e.target.files?.[0] || null)
                  }
                  className="w-full rounded-xl border bg-white px-4 py-3"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Este archivo se guardará en el gasto como cheque_url y quedará disponible para consulta.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalPago(null);
                  setChequeArchivo(null);
                }}
                className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoId === modalPago.solicitud_id}
                onClick={completarPago}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {procesandoId === modalPago.solicitud_id
                  ? "Procesando..."
                  : "Registrar egreso bancario"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function VistaCard({
  activa,
  titulo,
  cantidad,
  total,
  tono,
  onClick,
}: {
  activa: boolean;
  titulo: string;
  cantidad: number;
  total: number;
  tono:
    | "amber"
    | "purple"
    | "red"
    | "green"
    | "slate";
  onClick: () => void;
}) {
  const tonos = {
    amber:
      "border-amber-200 bg-amber-50 text-amber-900",
    purple:
      "border-purple-200 bg-purple-50 text-purple-900",
    red: "border-red-200 bg-red-50 text-red-900",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-900",
    slate:
      "border-slate-200 bg-slate-50 text-slate-900",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        tonos[tono]
      } ${
        activa
          ? "ring-2 ring-blue-600 ring-offset-2"
          : ""
      }`}
    >
      <div className="text-sm font-black">
        {titulo}
      </div>
      <div className="mt-2 text-2xl font-black">
        {cantidad}
      </div>
      <div className="mt-1 text-xs font-semibold opacity-80">
        RD$ {dinero(total)}
      </div>
    </button>
  );
}

function DatoDetalle({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {titulo}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-800">
        {valor}
      </div>
    </div>
  );
}

