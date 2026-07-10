"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Landmark,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import StatCard from "@/components/vam/enterprise/StatCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type SolicitudPago = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;
  fecha_solicitud: string | null;
  concepto: string | null;
  detalle: string | null;
  monto: number | null;
  itbis: number | null;
  total: number | null;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  soporte_url: string | null;
  prioridad: string | null;
  estado: string | null;
  created_by: string | null;
  created_at: string;
  proveedor_id: number | null;
  categoria_id: number | null;
  gasto_generado_id: number | null;

  catalogo_proveedores?: {
    nombre_proveedor: string | null;
  } | null;

  catalogo_categoria_gastos?: {
    nombre_categoria: string | null;
  } | null;
};

type GastoAprobado = {
  id: number;
  condominio_id: number | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  total: number | null;
  estado: string | null;
  aprobado_tesorero: boolean | null;
  aprobado_presidente: boolean | null;
  pagado: boolean | null;
  cheque_url: string | null;
  numero_cheque: string | null;
  fecha_pago: string | null;

  catalogo_proveedores?: {
    nombre_proveedor: string | null;
  } | null;
};

export default function SolicitudesPagoPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [gastosAprobados, setGastosAprobados] = useState<GastoAprobado[]>([]);

  const [loading, setLoading] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "Finanzas";

    if (!id) {
      setMensaje("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const nombreFinal = nombre || `Condominio ID ${id}`;

    setCondominioId(id);
    setCondominioNombre(nombreFinal);
    setUsuarioNombre(usuario);

    cargarTodo(id);
  }, []);

  async function cargarTodo(id: string) {
    await Promise.all([cargarSolicitudes(id), cargarGastosAprobados(id)]);
  }

  async function cargarSolicitudes(id: string) {
    if (!id) return;

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("solicitudes_pago")
      .select(`
        id,
        condominio_id,
        condominio,
        fecha_solicitud,
        concepto,
        detalle,
        monto,
        itbis,
        total,
        no_factura,
        ncf,
        metodo_pago,
        cuenta_banco,
        soporte_url,
        prioridad,
        estado,
        created_by,
        created_at,
        proveedor_id,
        categoria_id,
        gasto_generado_id,
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    if (error) {
      setMensaje("Error cargando solicitudes: " + error.message);
      setLoading(false);
      return;
    }

    setSolicitudes((data as SolicitudPago[]) || []);
    setLoading(false);
  }

  async function cargarGastosAprobados(id: string) {
    const { data, error } = await supabase
      .from("gastos")
      .select(`
        id,
        condominio_id,
        fecha,
        concepto,
        detalle_gasto,
        total,
        estado,
        aprobado_tesorero,
        aprobado_presidente,
        pagado,
        cheque_url,
        numero_cheque,
        fecha_pago,
        catalogo_proveedores(nombre_proveedor)
      `)
      .eq("condominio_id", Number(id))
      .eq("aprobado_tesorero", true)
      .eq("aprobado_presidente", true)
      .or("pagado.eq.false,pagado.is.null")
      .order("fecha", { ascending: false });

    if (error) {
      setMensaje("Error cargando gastos aprobados: " + error.message);
      return;
    }

    setGastosAprobados((data as GastoAprobado[]) || []);
  }

  function normalizarEstado(estado: string | null | undefined) {
    const valor = (estado || "").trim().toLowerCase();

    if (
      valor === "pendiente aprobación tesorero" ||
      valor === "pendiente aprobacion tesorero" ||
      valor === "pendiente_tesorero" ||
      valor === "pendiente tesorero"
    ) {
      return "pendiente_tesorero";
    }

    if (
      valor === "aprobado por tesorero" ||
      valor === "aprobada por tesorero" ||
      valor === "aprobado_tesorero" ||
      valor === "pendiente_presidente" ||
      valor === "pendiente aprobación presidente" ||
      valor === "pendiente aprobacion presidente"
    ) {
      return "pendiente_presidente";
    }

    if (
      valor === "aprobado por presidente" ||
      valor === "aprobada por presidente" ||
      valor === "aprobado_presidente" ||
      valor === "aprobada_presidente" ||
      valor === "aprobado" ||
      valor === "aprobada" ||
      valor === "aprobado final" ||
      valor === "aprobado_final"
    ) {
      return "aprobado_presidente";
    }

    if (
      valor === "gasto generado" ||
      valor === "generado" ||
      valor === "convertido en gasto"
    ) {
      return "gasto_generado";
    }

    if (valor === "pagado" || valor === "pagada") {
      return "pagado";
    }

    if (valor.includes("rechazado") || valor.includes("rechazada")) {
      return "rechazado";
    }

    if (
      valor === "cancelada" ||
      valor === "cancelado" ||
      valor === "anulada" ||
      valor === "anulado"
    ) {
      return "cancelado";
    }

    return valor || "sin_estado";
  }

  function etiquetaEstado(estado: string | null | undefined) {
    const normalizado = normalizarEstado(estado);

    if (normalizado === "pendiente_tesorero") return "Pendiente tesorero";
    if (normalizado === "pendiente_presidente") return "Pendiente presidente";
    if (normalizado === "aprobado_presidente") return "Aprobado presidente";
    if (normalizado === "gasto_generado") return "Gasto generado";
    if (normalizado === "pagado") return "Pagado";
    if (normalizado === "rechazado") return estado || "Rechazado";
    if (normalizado === "cancelado") return estado || "Cancelado";

    return estado || "Sin estado";
  }

  function estadoColor(estado: string | null | undefined) {
    const normalizado = normalizarEstado(estado);

    if (normalizado === "pendiente_tesorero") {
      return "bg-yellow-100 text-yellow-800";
    }

    if (normalizado === "pendiente_presidente") {
      return "bg-blue-100 text-blue-800";
    }

    if (normalizado === "aprobado_presidente") {
      return "bg-green-100 text-green-800";
    }

    if (normalizado === "gasto_generado") {
      return "bg-emerald-100 text-emerald-800";
    }

    if (normalizado === "pagado") {
      return "bg-green-100 text-green-800";
    }

    if (normalizado === "rechazado") {
      return "bg-red-100 text-red-800";
    }

    if (normalizado === "cancelado") {
      return "bg-slate-200 text-slate-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function puedeEditarOBorrar(s: SolicitudPago) {
    const estadoNormalizado = normalizarEstado(s.estado);

    return (
      !s.gasto_generado_id &&
      (estadoNormalizado === "pendiente_tesorero" ||
        estadoNormalizado === "sin_estado" ||
        !s.estado)
    );
  }

  async function borrarSolicitud(s: SolicitudPago) {
    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (!puedeEditarOBorrar(s)) {
      alert(
        "Esta solicitud no puede borrarse porque ya fue aprobada o procesada."
      );
      return;
    }

    const confirmar = confirm(
      `¿Está seguro que desea borrar la solicitud #${s.id}? Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("solicitudes_pago")
      .delete()
      .eq("id", s.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error borrando solicitud: " + error.message);
      return;
    }

    alert("Solicitud borrada correctamente.");
    cargarTodo(condominioId);
  }

  async function generarGasto(s: SolicitudPago) {
    if (!condominioId) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (s.gasto_generado_id) {
      alert("Esta solicitud ya fue convertida en gasto.");
      return;
    }

    const estadoNormalizado = normalizarEstado(s.estado);

    if (estadoNormalizado !== "aprobado_presidente") {
      alert("Esta solicitud todavía no está aprobada por el presidente.");
      return;
    }

    const confirmar = confirm("¿Desea generar automáticamente este gasto?");

    if (!confirmar) return;

    const { data: gastoData, error: gastoError } = await supabase
      .from("gastos")
      .insert([
        {
          condominio_id: Number(condominioId),
          condominio: condominioNombre || s.condominio,
          fecha: s.fecha_solicitud,
          categoria_id: s.categoria_id,
          proveedor_id: s.proveedor_id,
          concepto: s.concepto,
          detalle_gasto: s.detalle,
          monto: Number(s.monto || 0),
          itbis: Number(s.itbis || 0),
          total: Number(s.total || 0),
          no_factura: s.no_factura,
          ncf: s.ncf,
          metodo_pago: s.metodo_pago,
          cuenta_banco: s.cuenta_banco,
          factura_url: s.soporte_url,
          estado: "Aprobado por presidente",
          aprobado_tesorero: true,
          aprobado_presidente: true,
          pagado: false,
        },
      ])
      .select()
      .single();

    if (gastoError) {
      alert("Error generando gasto: " + gastoError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("solicitudes_pago")
      .update({
        gasto_generado_id: gastoData.id,
        gasto_generado_at: new Date().toISOString(),
        estado: "Gasto generado",
      })
      .eq("id", s.id)
      .eq("condominio_id", Number(condominioId));

    if (updateError) {
      alert(
        "El gasto fue generado, pero ocurrió un error actualizando la solicitud: " +
          updateError.message
      );
      return;
    }

    const { error: nominaUpdateError } = await supabase
      .from("rh_nomina")
      .update({
        gasto_id: gastoData.id,
        gasto_generado: true,
      })
      .eq("solicitud_pago_id", s.id)
      .eq("condominio_id", Number(condominioId));

    if (nominaUpdateError) {
      alert(
        "El gasto fue generado, pero ocurrió un error actualizando la nómina: " +
          nominaUpdateError.message
      );
      return;
    }

    alert("Gasto generado correctamente.");
    cargarTodo(condominioId);
  }

  async function subirCheque(g: GastoAprobado, archivo: File) {
    if (!archivo) return;

    const extension = archivo.name.split(".").pop();
    const nombreArchivo = `${condominioId || "general"}/${
      g.id
    }-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("cheques-gastos")
      .upload(nombreArchivo, archivo);

    if (uploadError) {
      alert("Error subiendo cheque: " + uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("cheques-gastos")
      .getPublicUrl(nombreArchivo);

    const { error } = await supabase
      .from("gastos")
      .update({
        cheque_url: data.publicUrl,
      })
      .eq("id", g.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert(
        "Cheque subido, pero no se pudo actualizar el gasto: " + error.message
      );
      return;
    }

    alert("Cheque subido correctamente.");
    cargarTodo(condominioId);
  }

  async function marcarPagado(g: GastoAprobado) {
    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (!g.aprobado_tesorero || !g.aprobado_presidente) {
      alert("Este gasto debe estar aprobado por tesorero y presidente.");
      return;
    }

    const numeroCheque = prompt("Número de cheque emitido:");
    if (!numeroCheque) return;

    const fechaPago = prompt("Fecha de pago en formato YYYY-MM-DD:");
    if (!fechaPago) return;

    const confirmar = confirm(
      `¿Desea marcar como pagado el gasto #${g.id} por RD$ ${dinero(g.total)}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("gastos")
      .update({
        pagado: true,
        numero_cheque: numeroCheque,
        fecha_pago: fechaPago,
        estado: "Pagado",
      })
      .eq("id", g.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error marcando como pagado: " + error.message);
      return;
    }

    const { data: solicitudRelacionada, error: solicitudError } = await supabase
      .from("solicitudes_pago")
      .select("id")
      .eq("gasto_generado_id", g.id)
      .eq("condominio_id", Number(condominioId))
      .maybeSingle();

    if (solicitudError) {
      alert(
        "El gasto fue marcado como pagado, pero no se pudo buscar la solicitud relacionada: " +
          solicitudError.message
      );
      cargarTodo(condominioId);
      return;
    }

    if (solicitudRelacionada?.id) {
      const { error: solicitudPagadaError } = await supabase
        .from("solicitudes_pago")
        .update({
          estado: "Pagado",
          metodo_pago: "Cheque",
          cuenta_banco: numeroCheque,
        })
        .eq("id", solicitudRelacionada.id)
        .eq("condominio_id", Number(condominioId));

      if (solicitudPagadaError) {
        alert(
          "El gasto fue marcado como pagado, pero no se pudo actualizar la solicitud: " +
            solicitudPagadaError.message
        );
        cargarTodo(condominioId);
        return;
      }

      const { error: nominaPagadaError } = await supabase
        .from("rh_nomina")
        .update({
          estado: "Pagada",
          pagado_por: usuarioNombre || "Finanzas",
          fecha_registro_pago: fechaPago,
          fecha_pago: fechaPago,
          gasto_id: g.id,
          gasto_generado: true,
        })
        .eq("solicitud_pago_id", solicitudRelacionada.id)
        .eq("condominio_id", Number(condominioId));

      if (nominaPagadaError) {
        alert(
          "El gasto fue marcado como pagado, pero no se pudo actualizar la nómina relacionada: " +
            nominaPagadaError.message
        );
        cargarTodo(condominioId);
        return;
      }
    }

    alert("Gasto marcado como pagado correctamente y nómina sincronizada.");
    cargarTodo(condominioId);
  }

  const solicitudesFiltradas = useMemo(() => {
    return solicitudes.filter((s) => {
      const estadoNormalizado = normalizarEstado(s.estado);

      let cumpleEstado = true;

      if (filtroEstado === "pendiente_gasto") {
        cumpleEstado =
          estadoNormalizado === "aprobado_presidente" && !s.gasto_generado_id;
      } else if (filtroEstado) {
        cumpleEstado = estadoNormalizado === filtroEstado;
      }

      const texto = `${s.id || ""} ${s.concepto || ""} ${s.detalle || ""} ${
        s.catalogo_proveedores?.nombre_proveedor || ""
      } ${s.catalogo_categoria_gastos?.nombre_categoria || ""} ${
        s.estado || ""
      }`.toLowerCase();

      const cumpleBusqueda = texto.includes(buscar.toLowerCase());

      return cumpleEstado && cumpleBusqueda;
    });
  }, [solicitudes, buscar, filtroEstado]);

  const gastosAprobadosFiltrados = useMemo(() => {
    const textoBuscar = buscar.toLowerCase().trim();

    if (!textoBuscar) return gastosAprobados;

    return gastosAprobados.filter((g) => {
      const texto = `${g.id || ""} ${g.fecha || ""} ${g.concepto || ""} ${
        g.detalle_gasto || ""
      } ${g.catalogo_proveedores?.nombre_proveedor || ""} ${
        g.numero_cheque || ""
      }`.toLowerCase();

      return texto.includes(textoBuscar);
    });
  }, [gastosAprobados, buscar]);

  const totalSolicitado = solicitudesFiltradas.reduce(
    (sum, s) => sum + Number(s.total || 0),
    0
  );

  const totalAprobadoPendiente = gastosAprobadosFiltrados.reduce(
    (sum, g) => sum + Number(g.total || 0),
    0
  );

  const totalPendienteTesorero = solicitudes.filter(
    (s) => normalizarEstado(s.estado) === "pendiente_tesorero"
  ).length;

  const totalPendientePresidente = solicitudes.filter(
    (s) => normalizarEstado(s.estado) === "pendiente_presidente"
  ).length;

  const totalPendienteGenerarGasto = solicitudes.filter(
    (s) =>
      normalizarEstado(s.estado) === "aprobado_presidente" &&
      !s.gasto_generado_id
  ).length;

  function exportarExcel() {
    if (
      solicitudesFiltradas.length === 0 &&
      gastosAprobadosFiltrados.length === 0
    ) {
      alert("No hay datos para exportar.");
      return;
    }

    const libro = XLSX.utils.book_new();

    const dataSolicitudes = solicitudesFiltradas.map((s) => ({
      ID: s.id,
      Condominio: s.condominio || condominioNombre,
      Fecha: s.fecha_solicitud || "",
      Proveedor: s.catalogo_proveedores?.nombre_proveedor || "",
      Categoría: s.catalogo_categoria_gastos?.nombre_categoria || "",
      Concepto: s.concepto || "",
      Total: Number(s.total || 0),
      Estado: etiquetaEstado(s.estado),
      "Gasto generado": s.gasto_generado_id ? "Sí" : "No",
    }));

    const dataGastos = gastosAprobadosFiltrados.map((g) => ({
      ID: g.id,
      Fecha: g.fecha || "",
      Proveedor: g.catalogo_proveedores?.nombre_proveedor || "",
      Concepto: g.concepto || "",
      Total: Number(g.total || 0),
      "Aprobado tesorero": g.aprobado_tesorero ? "Sí" : "No",
      "Aprobado presidente": g.aprobado_presidente ? "Sí" : "No",
      "No. cheque": g.numero_cheque || "",
      "Fecha pago": g.fecha_pago || "",
      Pagado: g.pagado ? "Sí" : "No",
    }));

    const hojaSolicitudes = XLSX.utils.json_to_sheet(dataSolicitudes);
    const hojaGastos = XLSX.utils.json_to_sheet(dataGastos);

    XLSX.utils.book_append_sheet(libro, hojaSolicitudes, "Solicitudes");
    XLSX.utils.book_append_sheet(libro, hojaGastos, "Gastos aprobados");

    XLSX.writeFile(
      libro,
      `Solicitudes_y_Gastos_${condominioNombre || "Condominio"}.xlsx`
    );
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Finanzas"
        subtitle="Pagos, gastos, solicitudes, caja chica, banco y reportes."
        tone="green"
        items={[
          { href: "/finanzas", label: "Dashboard", icon: BarChart3 },
          { href: "/finanzas/pagos", label: "Pagos", icon: CreditCard },
          { href: "/pagos-mantenimiento", label: "Mantenimiento", icon: WalletCards },
          { href: "/gastos", label: "Gastos", icon: ReceiptText },
          { href: "/finanzas/caja-chica", label: "Caja Chica", icon: WalletCards },
          { href: "/banco", label: "Banco", icon: Landmark },
          { href: "/solicitudes-pago", label: "Solicitudes", icon: FileText },
          { href: "/presupuesto", label: "Presupuesto", icon: FileSpreadsheet },
        ]}
      />

      <ModuleToolbar
        title="Solicitudes de Pago"
        subtitle="Control completo de solicitudes, aprobaciones, generación de gastos y pagos."
        icon={ShieldCheck}
        actions={
          <ModuleActions
            onRefresh={() => cargarTodo(condominioId)}
            onExport={exportarExcel}
            extra={
              <Link
                href="/solicitudes-pago/nueva"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
              >
                <Plus className="h-4 w-4" />
                Nueva solicitud
              </Link>
            }
          />
        }
      />

      {mensaje && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Pendiente tesorero"
          value={totalPendienteTesorero}
          subtitle="Requiere aprobación"
          icon={ShieldCheck}
          tone="amber"
        />

        <StatCard
          title="Pendiente presidente"
          value={totalPendientePresidente}
          subtitle="Segunda aprobación"
          icon={ShieldCheck}
          tone="blue"
        />

        <StatCard
          title="Generar gasto"
          value={totalPendienteGenerarGasto}
          subtitle="Aprobados"
          icon={ReceiptText}
          tone="green"
        />

        <StatCard
          title="Aprobados para pago"
          value={gastosAprobadosFiltrados.length}
          subtitle={`RD$ ${dinero(totalAprobadoPendiente)}`}
          icon={CheckCircle}
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
              <option value="pendiente_tesorero">Pendiente tesorero</option>
              <option value="pendiente_presidente">Pendiente presidente</option>
              <option value="aprobado_presidente">Aprobado presidente</option>
              <option value="pendiente_gasto">Pendiente generar gasto</option>
              <option value="gasto_generado">Gasto generado</option>
              <option value="rechazado">Rechazado</option>
              <option value="cancelado">Cancelado</option>
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
                placeholder="Buscar por proveedor, concepto, detalle o cheque..."
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Gastos aprobados pendientes de pago"
        subtitle="Desde aquí se sube el cheque, se registra el número y se marca el gasto como pagado."
        action={
          <div className="text-lg font-black text-red-700">
            RD$ {dinero(totalAprobadoPendiente)}
          </div>
        }
      >
        {gastosAprobadosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin gastos pendientes"
            description="No hay gastos aprobados pendientes de pago para este condominio."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Cheque</th>
                <th className="px-4 py-3 text-center">Pago</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {gastosAprobadosFiltrados.map((g) => (
                <tr key={g.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold">{g.id}</td>
                  <td className="px-4 py-3">{g.fecha || "-"}</td>

                  <td className="px-4 py-3">
                    {g.catalogo_proveedores?.nombre_proveedor || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-semibold">{g.concepto || "-"}</p>

                    {g.detalle_gasto && (
                      <p className="mt-1 text-xs text-slate-500">
                        {g.detalle_gasto}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right font-bold">
                    RD$ {dinero(g.total)}
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
                      <label className="inline-block cursor-pointer rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800">
                        Subir cheque
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => {
                            const archivo = e.target.files?.[0];
                            if (archivo) subirCheque(g, archivo);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    )}

                    {g.numero_cheque && (
                      <div className="mt-1 text-xs text-slate-500">
                        No. {g.numero_cheque}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {g.pagado ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        Pagado
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => marcarPagado(g)}
                        className="rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800"
                      >
                        Marcar pagado
                      </button>
                    )}

                    {g.fecha_pago && (
                      <div className="mt-1 text-xs text-slate-500">
                        {g.fecha_pago}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      <SectionCard
        title="Listado de solicitudes"
        subtitle="Solicitudes registradas en el flujo de aprobación."
        action={
          <div className="text-lg font-black text-green-700">
            RD$ {dinero(totalSolicitado)}
          </div>
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando solicitudes...</p>
        ) : solicitudesFiltradas.length === 0 ? (
          <EmptyState
            title="Sin solicitudes"
            description="No hay solicitudes registradas para este condominio."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Soporte</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {solicitudesFiltradas.map((s) => (
                <tr key={s.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold">{s.id}</td>

                  <td className="px-4 py-3">
                    {s.catalogo_proveedores?.nombre_proveedor || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-semibold">{s.concepto || "-"}</p>

                    {s.detalle && (
                      <p className="mt-1 text-xs text-slate-500">
                        {s.detalle}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right font-bold">
                    RD$ {dinero(s.total)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${estadoColor(
                        s.estado
                      )}`}
                    >
                      {etiquetaEstado(s.estado)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {s.soporte_url ? (
                      <a
                        href={s.soporte_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white"
                      >
                        Ver
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Sin soporte</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link
                        href={`/solicitudes-pago/reporte/${s.id}`}
                        className="rounded-lg bg-purple-700 px-3 py-1 text-xs font-bold text-white hover:bg-purple-800"
                      >
                        Reporte
                      </Link>

                      {puedeEditarOBorrar(s) && (
                        <>
                          <Link
                            href={`/solicitudes-pago/editar/${s.id}`}
                            className="rounded-lg bg-yellow-600 px-3 py-1 text-xs font-bold text-white hover:bg-yellow-700"
                          >
                            Editar
                          </Link>

                          <button
                            type="button"
                            onClick={() => borrarSolicitud(s)}
                            className="rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800"
                          >
                            Borrar
                          </button>
                        </>
                      )}

                      {s.gasto_generado_id ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          Gasto generado
                        </span>
                      ) : normalizarEstado(s.estado) === "aprobado_presidente" ? (
                        <button
                          type="button"
                          onClick={() => generarGasto(s)}
                          className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800"
                        >
                          Generar gasto
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Pendiente aprobación
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>
    </PageContainer>
  );
}