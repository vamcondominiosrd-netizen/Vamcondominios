"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  Plus,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type SolicitudPago = {
  id: number;
  condominio_id: number | null;
  numero_solicitud: number | null;
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
  created_at: string | null;
  proveedor_id: number | null;
  categoria_id: number | null;
  gasto_generado_id: number | null;
  gasto_generado_at?: string | null;
  comentario_tesorero?: string | null;
  fecha_revision_tesorero?: string | null;
  comentario_presidente?: string | null;
  fecha_revision_presidente?: string | null;
  catalogo_proveedores?: {
    nombre_proveedor: string | null;
  } | null;
  catalogo_categoria_gastos?: {
    nombre_categoria: string | null;
  } | null;
};

function normalizar(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function dinero(valor: number | null | undefined) {
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

  if (e === "Pendiente aprobación tesorero") {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }

  if (e === "Aprobado por tesorero") {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }

  if (e === "Aprobado por presidente") {
    return "bg-green-100 text-green-800 border-green-200";
  }

  if (e === "Gasto generado") {
    return "bg-purple-100 text-purple-800 border-purple-200";
  }

  if (e === "Pagada") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }

  if (e.includes("Rechazado")) {
    return "bg-red-100 text-red-800 border-red-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function SolicitudesPagoPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(idGuardado);
    setCondominioNombre(nombreGuardado);

    if (idGuardado || nombreGuardado) {
      cargarSolicitudes(idGuardado, nombreGuardado);
    }
  }, []);

  async function cargarSolicitudes(
    idActual = condominioId,
    nombreActual = condominioNombre,
  ) {
    setLoading(true);

    let query = supabase
      .from("solicitudes_pago")
      .select(
        `
          id,
          condominio_id,
          numero_solicitud,
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
          gasto_generado_at,
          comentario_tesorero,
          fecha_revision_tesorero,
          comentario_presidente,
          fecha_revision_presidente,
          catalogo_proveedores(nombre_proveedor),
          catalogo_categoria_gastos(nombre_categoria)
        `,
      )
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

    setSolicitudes((data as unknown as SolicitudPago[]) || []);
  }

  async function generarGasto(s: SolicitudPago) {
    if (s.gasto_generado_id) {
      alert("Esta solicitud ya tiene un gasto generado.");
      return;
    }

    if (s.estado !== "Aprobado por presidente") {
      alert(
        "Solo se puede generar gasto después de la aprobación del presidente.",
      );
      return;
    }

    const confirmar = confirm(
      `¿Desea generar el gasto de esta solicitud?\n\nSolicitud: ${
        s.numero_solicitud ? String(s.numero_solicitud).padStart(5, "0") : s.id
      }\nConcepto: ${s.concepto || ""}\nTotal: RD$ ${dinero(s.total)}`,
    );

    if (!confirmar) return;

    try {
      setProcesandoId(s.id);

      const { data: gastoData, error: gastoError } = await supabase
        .from("gastos")
        .insert([
          {
            condominio_id:
              s.condominio_id || (condominioId ? Number(condominioId) : null),
            condominio: s.condominio || condominioNombre,
            fecha: s.fecha_solicitud,
            categoria: s.catalogo_categoria_gastos?.nombre_categoria || null,
            descripcion: s.detalle || s.concepto,
            proveedor: s.catalogo_proveedores?.nombre_proveedor || null,
            proveedor_id: s.proveedor_id,
            categoria_id: s.categoria_id,
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
            estado: "Gasto generado",
            aprobado_tesorero: true,
            aprobado_presidente: true,
            fecha_aprobacion_tesorero: s.fecha_revision_tesorero || null,
            fecha_aprobacion_presidente: s.fecha_revision_presidente || null,
            pagado: false,
          },
        ])
        .select("id")
        .single();

      if (gastoError) {
        alert("Error generando gasto: " + gastoError.message);
        return;
      }

      const { error: updateError } = await supabase
        .from("solicitudes_pago")
        .update({
          estado: "Gasto generado",
          gasto_generado_id: gastoData.id,
          gasto_generado_at: new Date().toISOString(),
        })
        .eq("id", s.id);

      if (updateError) {
        alert(
          "El gasto fue generado, pero ocurrió un error actualizando la solicitud: " +
            updateError.message,
        );
        return;
      }

      alert(
        "Gasto generado correctamente. Ahora puede completar el pago cuando el dinero salga del banco.",
      );
      cargarSolicitudes();
    } catch (error: any) {
      alert(error.message || "Error generando gasto.");
    } finally {
      setProcesandoId(null);
    }
  }

  async function completarPago(s: SolicitudPago) {
    if (!s.gasto_generado_id) {
      alert("Primero debe generar el gasto.");
      return;
    }

    if (s.estado === "Pagada") {
      alert("Esta solicitud ya está pagada.");
      return;
    }

    const confirmar = confirm(
      `¿Desea completar el pago y registrar el EGRESO bancario?\n\nSolicitud: ${
        s.numero_solicitud ? String(s.numero_solicitud).padStart(5, "0") : s.id
      }\nConcepto: ${s.concepto || ""}\nTotal: RD$ ${dinero(s.total)}`,
    );

    if (!confirmar) return;

    const fechaPago = prompt(
      "Fecha real del pago en el banco. Formato: YYYY-MM-DD",
      s.fecha_solicitud || new Date().toISOString().split("T")[0],
    );

    if (!fechaPago) return;

    const cuentaBancariaId = prompt(
      "ID de la cuenta bancaria del condominio",
      condominioId === "15" ? "6" : "",
    );

    if (!cuentaBancariaId) return;

    const metodoPago = prompt("Método de pago", s.metodo_pago || "Cheque");

    if (!metodoPago) return;

    const numeroDocumento = prompt(
      "Número de cheque / transferencia / documento",
      "",
    );

    if (!numeroDocumento) return;

    const referenciaBanco =
      prompt("Referencia bancaria", numeroDocumento) || numeroDocumento;

    try {
      setProcesandoId(s.id);

      const { data, error } = await supabase.rpc(
        "pagar_solicitud_pago_bancaria",
        {
          p_solicitud_id: s.id,
          p_cuenta_bancaria_id: Number(cuentaBancariaId),
          p_fecha_pago: fechaPago,
          p_metodo_pago: metodoPago,
          p_numero_documento: numeroDocumento,
          p_referencia_banco: referenciaBanco,
          p_cheque_url: null,
        },
      );

      if (error) {
        alert("Error completando el pago: " + error.message);
        return;
      }

      alert(data?.mensaje || "Pago completado correctamente.");
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
      const cumpleEstado = filtroEstado === "" || s.estado === filtroEstado;

      const texto = normalizar(
        `${s.id} ${s.numero_solicitud || ""} ${s.concepto || ""} ${s.detalle || ""} ${
          s.catalogo_proveedores?.nombre_proveedor || ""
        } ${s.catalogo_categoria_gastos?.nombre_categoria || ""} ${s.estado || ""}`,
      );

      return cumpleEstado && texto.includes(busqueda);
    });
  }, [solicitudes, filtroEstado, buscar]);

  const totalSolicitado = solicitudesFiltradas.reduce(
    (sum, s) => sum + Number(s.total || 0),
    0,
  );

  function exportarExcel() {
    const dataExcel = solicitudesFiltradas.map((s) => ({
      ID: s.id,
      "No. Solicitud": s.numero_solicitud || "",
      Condominio: s.condominio || "",
      Fecha: s.fecha_solicitud || "",
      Proveedor: s.catalogo_proveedores?.nombre_proveedor || "",
      Categoría: s.catalogo_categoria_gastos?.nombre_categoria || "",
      Concepto: s.concepto || "",
      Monto: Number(s.monto || 0),
      ITBIS: Number(s.itbis || 0),
      Total: Number(s.total || 0),
      Estado: s.estado || "",
      "Gasto generado": s.gasto_generado_id ? "Sí" : "No",
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
        subtitle="Nueva solicitud, aprobaciones, gastos generados, pagos y reportes."
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
        title="Solicitudes de Pago"
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
        title="Filtros"
        subtitle="Busque solicitudes por estado, proveedor, concepto o número."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3"
            >
              <option value="">Todos</option>
              <option value="Pendiente aprobación tesorero">
                Pendiente tesorero
              </option>
              <option value="Aprobado por tesorero">Aprobado tesorero</option>
              <option value="Aprobado por presidente">
                Aprobado presidente
              </option>
              <option value="Gasto generado">Gasto generado</option>
              <option value="Pagada">Pagada</option>
              <option value="Rechazado por tesorero">Rechazado tesorero</option>
              <option value="Rechazado por presidente">
                Rechazado presidente
              </option>
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
                  <th className="border p-2 text-center">Estado</th>
                  <th className="border p-2 text-center">Soporte</th>
                  <th className="border p-2 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {solicitudesFiltradas.map((s) => {
                  const puedeGenerarGasto =
                    s.estado === "Aprobado por presidente" &&
                    !s.gasto_generado_id;

                  const puedePagar =
                    !!s.gasto_generado_id &&
                    s.estado !== "Pagada" &&
                    !normalizar(s.estado).includes("rechazado");

                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="border p-2 align-top">
                        <div className="font-black text-slate-900">
                          {s.numero_solicitud
                            ? String(s.numero_solicitud).padStart(5, "0")
                            : s.id}
                        </div>
                        <div className="text-xs text-slate-500">ID {s.id}</div>
                      </td>

                      <td className="border p-2 align-top">
                        {formatoFecha(s.fecha_solicitud)}
                      </td>

                      <td className="border p-2 align-top">
                        {s.catalogo_proveedores?.nombre_proveedor || "-"}
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
                        {s.gasto_generado_id && (
                          <div className="mt-1 text-xs font-bold text-purple-700">
                            Gasto ID: {s.gasto_generado_id}
                          </div>
                        )}
                      </td>

                      <td className="border p-2 text-right align-top font-black text-green-700">
                        RD$ {dinero(s.total)}
                      </td>

                      <td className="border p-2 text-center align-top">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoColor(
                            s.estado,
                          )}`}
                        >
                          {s.estado || "Sin estado"}
                        </span>
                      </td>

                      <td className="border p-2 text-center align-top">
                        {s.soporte_url ? (
                          <a
                            href={s.soporte_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                          >
                            Ver
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Sin soporte
                          </span>
                        )}
                      </td>

                      <td className="border p-2 align-top">
                        <div className="flex flex-col items-center gap-2">
                          {puedeGenerarGasto && (
                            <button
                              type="button"
                              disabled={procesandoId === s.id}
                              onClick={() => generarGasto(s)}
                              className="w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                            >
                              {procesandoId === s.id
                                ? "Procesando..."
                                : "Generar gasto"}
                            </button>
                          )}

                          {puedePagar && (
                            <button
                              type="button"
                              disabled={procesandoId === s.id}
                              onClick={() => completarPago(s)}
                              className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                              {procesandoId === s.id
                                ? "Procesando..."
                                : "Pagar"}
                            </button>
                          )}

                          {!puedeGenerarGasto &&
                            !puedePagar &&
                            s.estado !== "Pagada" && (
                              <span className="text-center text-xs font-semibold text-slate-400">
                                Pendiente de aprobación
                              </span>
                            )}

                          {s.estado === "Pagada" && (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                              Pagada
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
                      colSpan={8}
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
    </PageContainer>
  );
}
