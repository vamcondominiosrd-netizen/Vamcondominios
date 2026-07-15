"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Plus,
  Printer,
  ShieldCheck,
  WalletCards,
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
  const e = estado || "";

  if (e === "Pendiente tesorero") {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }

  if (e === "Pendiente presidente") {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }

  if (e === "Aprobada sin gasto") {
    return "bg-indigo-100 text-indigo-800 border-indigo-200";
  }

  if (e === "Lista para pagar") {
    return "bg-purple-100 text-purple-800 border-purple-200";
  }

  if (e === "Pagada") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }

  if (e.startsWith("Revisar")) {
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

export default function SolicitudesPagoPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPagoOperativa[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
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

    setLoading(false);

    if (error) {
      alert("Error cargando solicitudes: " + error.message);
      return;
    }

    setSolicitudes((data as SolicitudPagoOperativa[]) || []);
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
              ? "Pendiente tesorero"
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
        alert(
          "El gasto fue generado, pero ocurrió un error actualizando la solicitud: " +
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
    return s.factura_url || s.soporte_url || "";
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
    if (s.estado_operativo !== "Lista para pagar") {
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

    if (modalPago.estado_operativo !== "Lista para pagar") {
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

  const solicitudesFiltradas = useMemo(() => {
    const busqueda = normalizar(buscar);

    return solicitudes.filter((s) => {
      const estadoOperativo = s.estado_operativo || "";
      const cumpleEstado =
        filtroEstado === "" || estadoOperativo === filtroEstado;

      const texto = normalizar(
        `${s.solicitud_id} ${s.numero_solicitud || ""} ${
          s.concepto || ""
        } ${s.detalle || ""} ${s.proveedor_nombre || ""} ${
          s.categoria_nombre || ""
        } ${s.estado_solicitud || ""} ${s.estado_operativo || ""}`,
      );

      return cumpleEstado && texto.includes(busqueda);
    });
  }, [solicitudes, filtroEstado, buscar]);

  const totalSolicitado = solicitudesFiltradas.reduce(
    (sum, s) => sum + Number(s.total_solicitud || 0),
    0,
  );

  const resumenEstados = useMemo(() => {
    const base = new Map<string, { cantidad: number; total: number }>();

    for (const s of solicitudes) {
      const estado = s.estado_operativo || "Sin estado";
      const actual = base.get(estado) || { cantidad: 0, total: 0 };
      actual.cantidad += 1;
      actual.total += Number(s.total_solicitud || 0);
      base.set(estado, actual);
    }

    return Array.from(base.entries()).map(([estado, valores]) => ({
      estado,
      ...valores,
    }));
  }, [solicitudes]);

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
        title="Resumen operativo"
        subtitle="Estado real calculado desde solicitud, gasto y banco."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {resumenEstados.map((item) => (
            <div
              key={item.estado}
              className="rounded-2xl border bg-white p-4 shadow-sm"
            >
              <div
                className={`mb-2 inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoColor(
                  item.estado,
                )}`}
              >
                {item.estado}
              </div>
              <div className="text-2xl font-black text-slate-900">
                {item.cantidad}
              </div>
              <div className="text-xs font-semibold text-slate-500">
                RD$ {dinero(item.total)}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Filtros"
        subtitle="Busque solicitudes por estado operativo, proveedor, concepto o número."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">
              Estado operativo
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3"
            >
              <option value="">Todos</option>
              {ESTADOS_OPERATIVOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold">Buscar</label>
            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Buscar por concepto, proveedor, ID, número o estado..."
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Listado de solicitudes"
        subtitle={`${solicitudesFiltradas.length} solicitud(es). Total filtrado: RD$ ${dinero(
          totalSolicitado,
        )}`}
      >
        {loading ? (
          <p className="rounded-xl border bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            Cargando solicitudes...
          </p>
        ) : (
          <div className="overflow-auto rounded-2xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="border p-2 text-left">No.</th>
                  <th className="border p-2 text-left">Fecha</th>
                  <th className="border p-2 text-left">Proveedor</th>
                  <th className="border p-2 text-left">Concepto</th>
                  <th className="border p-2 text-right">Total</th>
                  <th className="border p-2 text-center">Estado operativo</th>
                  <th className="border p-2 text-center">Banco</th>
                  <th className="border p-2 text-center">Factura proveedor</th>
                  <th className="border p-2 text-center">Cheque / pago</th>
                  <th className="border p-2 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {solicitudesFiltradas.map((s) => {
                  const estadoOperativo = s.estado_operativo || "Revisar";
                  const puedeGenerarGasto =
                    puedeGenerarGastoSolicitud(s);
                  const puedePagar = estadoOperativo === "Lista para pagar";
                  const esPagada = estadoOperativo === "Pagada";
                  const requiereRevision =
                    estadoOperativo.startsWith("Revisar");

                  return (
                    <tr key={s.solicitud_id} className="hover:bg-slate-50">
                      <td className="border p-2 align-top">
                        <div className="font-black text-slate-900">
                          {numeroSolicitud(s)}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID {s.solicitud_id}
                        </div>
                      </td>

                      <td className="border p-2 align-top">
                        {formatoFecha(s.fecha_solicitud)}
                      </td>

                      <td className="border p-2 align-top">
                        {s.proveedor_nombre ||
                          (s.proveedor_id
                            ? `Proveedor ID ${s.proveedor_id}`
                            : "-")}
                      </td>

                      <td className="border p-2 align-top">
                        <div className="font-semibold text-slate-900">
                          {s.concepto || "-"}
                        </div>
                        {s.detalle && (
                          <div className="mt-1 max-w-lg text-xs text-slate-500">
                            {s.detalle}
                          </div>
                        )}
                        {(s.gasto_id || s.gasto_generado_id) && (
                          <div className="mt-1 text-xs font-bold text-purple-700">
                            Gasto ID: {s.gasto_id || s.gasto_generado_id}
                          </div>
                        )}
                        {s.estado_solicitud && (
                          <div className="mt-1 text-xs text-slate-400">
                            Estado guardado: {s.estado_solicitud}
                          </div>
                        )}
                      </td>

                      <td className="border p-2 text-right align-top font-black text-green-700">
                        RD$ {dinero(s.total_solicitud)}
                      </td>

                      <td className="border p-2 text-center align-top">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoColor(
                            estadoOperativo,
                          )}`}
                        >
                          {estadoOperativo}
                        </span>
                      </td>

                      <td className="border p-2 text-center align-top">
                        {Number(s.movimientos_banco || 0) > 0 ? (
                          <div className="text-xs">
                            <div className="font-black text-emerald-700">
                              Banco OK
                            </div>
                            <div className="text-slate-500">
                              RD$ {dinero(s.total_banco)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-slate-400">
                            Sin banco
                          </div>
                        )}
                      </td>

                      <td className="border p-2 text-center align-top">
                        {facturaProveedorUrl(s) ? (
                          <div className="flex flex-col items-center gap-1">
                            <a
                              href={facturaProveedorUrl(s)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                            >
                              Ver factura
                            </a>
                            {s.no_factura && (
                              <span className="text-[11px] text-slate-500">
                                Fact. {s.no_factura}
                              </span>
                            )}
                            {s.ncf && (
                              <span className="text-[11px] text-slate-500">
                                NCF {s.ncf}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Sin factura
                          </span>
                        )}
                      </td>

                      <td className="border p-2 text-center align-top">
                        {s.cheque_url ? (
                          <a
                            href={s.cheque_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-800"
                          >
                            Ver cheque
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Sin cheque
                          </span>
                        )}
                      </td>

                      <td className="border p-2 align-top">
                        <div className="flex flex-col items-center gap-2">
                          <Link
                            href={`/solicitudes-pago/reporte/${s.solicitud_id}`}
                            className="w-full rounded-lg border bg-white px-3 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <span className="inline-flex items-center justify-center gap-1">
                              <Printer className="h-3 w-3" />
                              Imprimir solicitud
                            </span>
                          </Link>

                          {puedeGenerarGasto && (
                            <button
                              type="button"
                              disabled={procesandoId === s.solicitud_id}
                              onClick={() => generarGasto(s)}
                              className="w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                            >
                              {procesandoId === s.solicitud_id
                                ? "Procesando..."
                                : "Generar gasto"}
                            </button>
                          )}

                          {puedePagar && (
                            <button
                              type="button"
                              disabled={procesandoId === s.solicitud_id}
                              onClick={() => abrirModalPago(s)}
                              className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                              Procesar pago
                            </button>
                          )}

                          {esPagada && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Pagada
                            </span>
                          )}

                          {requiereRevision && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-center text-xs font-black text-red-700">
                              <AlertTriangle className="h-3 w-3" />
                              Revisar
                            </span>
                          )}

                          {!puedeGenerarGasto &&
                            !puedePagar &&
                            !esPagada &&
                            !requiereRevision && (
                              <span className="text-center text-xs font-semibold text-slate-400">
                                Pendiente de aprobación
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {solicitudesFiltradas.length === 0 && (
                  <tr>
                    <td
                      className="border p-6 text-center text-slate-500"
                      colSpan={10}
                    >
                      No hay solicitudes registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
