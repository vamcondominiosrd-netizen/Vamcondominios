"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type SolicitudPago = {
  id: number;
  numero_solicitud?: number | null;
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
  estado: string | null;
  proveedor_id: number | null;
  categoria_id: number | null;
  gasto_generado_id: number | null;
  created_at: string | null;

  catalogo_proveedores?: {
    nombre_proveedor: string | null;
  } | null;

  catalogo_categoria_gastos?: {
    nombre_categoria: string | null;
  } | null;
};

type GastoRelacionado = {
  id: number;
  estado: string | null;
  pagado: boolean | null;
  numero_cheque: string | null;
  fecha_pago: string | null;
  cheque_url: string | null;
  cuenta_banco: string | null;
  total: number | null;
};

type FilaResumen = SolicitudPago & {
  proveedor: string;
  categoria: string;
  gasto_estado: string;
  pagado: boolean;
  numero_cheque: string;
  fecha_pago: string | null;
  cheque_url: string | null;
  cuenta_banco_final: string;
};

type Condominio = {
  id: number;
  nombre: string;
  logo_url: string | null;
};

type DirectivaCondominio = {
  id: number;
  condominio_id: number;
  nombre: string;
  cargo: string;
  estado: string | null;
};

const meses = [
  { valor: 1, nombre: "Enero" },
  { valor: 2, nombre: "Febrero" },
  { valor: 3, nombre: "Marzo" },
  { valor: 4, nombre: "Abril" },
  { valor: 5, nombre: "Mayo" },
  { valor: 6, nombre: "Junio" },
  { valor: 7, nombre: "Julio" },
  { valor: 8, nombre: "Agosto" },
  { valor: 9, nombre: "Septiembre" },
  { valor: 10, nombre: "Octubre" },
  { valor: 11, nombre: "Noviembre" },
  { valor: 12, nombre: "Diciembre" },
];

export default function ResumenSolicitudesPagoPage() {
  const hoy = new Date();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [condominio, setCondominio] = useState<Condominio | null>(null);

  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [buscar, setBuscar] = useState("");

  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [gastos, setGastos] = useState<GastoRelacionado[]>([]);

  const [tesorero, setTesorero] = useState<DirectivaCondominio | null>(null);
  const [presidente, setPresidente] =
    useState<DirectivaCondominio | null>(null);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarTodo(id);
  }, []);

  async function cargarTodo(id: string) {
    setLoading(true);
    setMensaje("");

    await Promise.all([
      cargarCondominio(id),
      cargarDirectiva(id),
      cargarSolicitudes(id),
      cargarGastos(id),
    ]);

    setLoading(false);
  }

  async function cargarCondominio(id: string) {
    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre, logo_url")
      .eq("id", Number(id))
      .maybeSingle();

    if (error) {
      setMensaje("Error cargando condominio: " + error.message);
      return;
    }

    if (data) {
      setCondominio(data as Condominio);
    }
  }

  async function cargarDirectiva(id: string) {
    const { data } = await supabase
      .from("directiva_condominio")
      .select("id, condominio_id, nombre, cargo, estado")
      .eq("condominio_id", Number(id));

    const directiva = ((data as DirectivaCondominio[]) || []).filter((d) => {
      const estado = normalizarTexto(d.estado);
      return !estado || estado === "activo";
    });

    const tesoreroEncontrado =
      directiva.find((d) => normalizarTexto(d.cargo) === "tesorero") ||
      directiva.find((d) => normalizarTexto(d.cargo).includes("tesorer"));

    const presidenteEncontrado =
      directiva.find((d) => normalizarTexto(d.cargo) === "presidente") ||
      directiva.find((d) => normalizarTexto(d.cargo).includes("president"));

    setTesorero(tesoreroEncontrado || null);
    setPresidente(presidenteEncontrado || null);
  }

  async function cargarSolicitudes(id: string) {
    const { data, error } = await supabase
      .from("solicitudes_pago")
      .select(`
        id,
        numero_solicitud,
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
        estado,
        proveedor_id,
        categoria_id,
        gasto_generado_id,
        created_at,
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_solicitud", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      setMensaje("Error cargando solicitudes: " + error.message);
      return;
    }

    setSolicitudes((data as SolicitudPago[]) || []);
  }

  async function cargarGastos(id: string) {
    const { data, error } = await supabase
      .from("gastos")
      .select(
        "id, estado, pagado, numero_cheque, fecha_pago, cheque_url, cuenta_banco, total"
      )
      .eq("condominio_id", Number(id));

    if (error) {
      setMensaje("Error cargando gastos relacionados: " + error.message);
      return;
    }

    setGastos((data as GastoRelacionado[]) || []);
  }

  function normalizarTexto(valor: string | null | undefined) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function normalizarEstado(estado: string | null | undefined) {
    const valor = normalizarTexto(estado);

    if (
      valor === "pendiente aprobacion tesorero" ||
      valor === "pendiente_tesorero" ||
      valor === "pendiente tesorero"
    ) {
      return "PENDIENTE_TESORERO";
    }

    if (
      valor === "aprobado por tesorero" ||
      valor === "aprobada por tesorero" ||
      valor === "pendiente aprobacion presidente" ||
      valor === "pendiente_presidente"
    ) {
      return "PENDIENTE_PRESIDENTE";
    }

    if (
      valor === "aprobado por presidente" ||
      valor === "aprobada por presidente" ||
      valor === "aprobado presidente" ||
      valor === "aprobado" ||
      valor === "aprobada"
    ) {
      return "APROBADO_PRESIDENTE";
    }

    if (
      valor === "gasto generado" ||
      valor === "generado" ||
      valor === "convertido en gasto"
    ) {
      return "GASTO_GENERADO";
    }

    if (valor.includes("rechazado") || valor.includes("rechazada")) {
      return "RECHAZADO";
    }

    if (valor.includes("cancelado") || valor.includes("anulado")) {
      return "CANCELADO";
    }

    return valor ? valor.toUpperCase() : "SIN_ESTADO";
  }

  function etiquetaEstadoSolicitud(estado: string | null | undefined) {
    const valor = normalizarEstado(estado);

    if (valor === "PENDIENTE_TESORERO") return "Pendiente tesorero";
    if (valor === "PENDIENTE_PRESIDENTE") return "Pendiente presidente";
    if (valor === "APROBADO_PRESIDENTE") return "Aprobado presidente";
    if (valor === "GASTO_GENERADO") return "Gasto generado";
    if (valor === "RECHAZADO") return "Rechazado";
    if (valor === "CANCELADO") return "Cancelado";

    return estado || "Sin estado";
  }

  function obtenerFechaSolicitud(s: SolicitudPago) {
    return s.fecha_solicitud || s.created_at || "";
  }

  function perteneceAlMes(fecha: string | null | undefined) {
    if (!fecha) return false;

    const d = new Date(fecha);

    if (Number.isNaN(d.getTime())) return false;

    return d.getFullYear() === anio && d.getMonth() + 1 === mes;
  }

  function obtenerGastoRelacionado(s: SolicitudPago) {
    if (!s.gasto_generado_id) return null;

    return (
      gastos.find((g) => Number(g.id) === Number(s.gasto_generado_id)) || null
    );
  }

  const filas = useMemo<FilaResumen[]>(() => {
    return solicitudes.map((s) => {
      const gasto = obtenerGastoRelacionado(s);

      return {
        ...s,
        proveedor: s.catalogo_proveedores?.nombre_proveedor || "-",
        categoria: s.catalogo_categoria_gastos?.nombre_categoria || "-",
        gasto_estado: gasto?.estado || "",
        pagado: Boolean(gasto?.pagado),
        numero_cheque: gasto?.numero_cheque || "-",
        fecha_pago: gasto?.fecha_pago || null,
        cheque_url: gasto?.cheque_url || null,
        cuenta_banco_final: gasto?.cuenta_banco || s.cuenta_banco || "-",
      };
    });
  }, [solicitudes, gastos]);

  const filasFiltradas = useMemo(() => {
    let lista = filas;

    if (filtroEstado === "PAGADAS") {
      lista = lista.filter((f) => f.pagado && perteneceAlMes(f.fecha_pago));
    } else if (filtroEstado === "PENDIENTES_PAGO") {
      lista = lista.filter(
        (f) =>
          normalizarEstado(f.estado) === "GASTO_GENERADO" &&
          !f.pagado &&
          perteneceAlMes(obtenerFechaSolicitud(f))
      );
    } else if (filtroEstado === "GASTO_GENERADO") {
      lista = lista.filter(
        (f) =>
          normalizarEstado(f.estado) === "GASTO_GENERADO" &&
          perteneceAlMes(obtenerFechaSolicitud(f))
      );
    } else {
      lista = lista.filter((f) => {
        const fechaBase = f.fecha_pago || obtenerFechaSolicitud(f);
        return perteneceAlMes(fechaBase);
      });
    }

    if (buscar.trim()) {
      const textoBuscar = buscar.toLowerCase().trim();

      lista = lista.filter((f) => {
        const texto = `
          ${f.id || ""}
          ${f.numero_solicitud || ""}
          ${f.proveedor || ""}
          ${f.categoria || ""}
          ${f.concepto || ""}
          ${f.detalle || ""}
          ${f.numero_cheque || ""}
          ${f.estado || ""}
        `.toLowerCase();

        return texto.includes(textoBuscar);
      });
    }

    return lista;
  }, [filas, anio, mes, filtroEstado, buscar]);

  const totalSolicitado = filasFiltradas.reduce(
    (sum, f) => sum + Number(f.total || 0),
    0
  );

  const totalPagado = filasFiltradas
    .filter((f) => f.pagado)
    .reduce((sum, f) => sum + Number(f.total || 0), 0);

  const totalPendiente = filasFiltradas
    .filter((f) => !f.pagado)
    .reduce((sum, f) => sum + Number(f.total || 0), 0);

  const cantidadPagadas = filasFiltradas.filter((f) => f.pagado).length;
  const cantidadPendientes = filasFiltradas.filter((f) => !f.pagado).length;

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatoFecha(fecha: string | null | undefined) {
    if (!fecha) return "-";

    const d = new Date(fecha);

    if (Number.isNaN(d.getTime())) return fecha;

    return d.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function fechaHoy() {
    return new Date().toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function imprimir() {
    window.print();
  }

  function limpiarFiltros() {
    setFiltroEstado("TODOS");
    setBuscar("");
  }

  const nombreMes = meses.find((m) => m.valor === mes)?.nombre || "";

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          @page {
            size: letter landscape;
            margin: 0.35in;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
          }

          .print-table {
            font-size: 9px !important;
          }

          .print-table th,
          .print-table td {
            padding: 4px !important;
          }

          .firma-print {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-5">
        <div className="no-print bg-white rounded-2xl border shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                Resumen de Solicitudes de Pago
              </h1>

              <p className="text-slate-500 text-sm mt-1">
                Reporte mensual simple de solicitudes, cheques y montos para
                impresión.
              </p>

              <p className="text-sm text-blue-700 font-bold mt-2">
                Condominio activo:{" "}
                {condominio?.nombre || condominioNombre || "No seleccionado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/solicitudes-pago"
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Volver
              </Link>

              <button
                type="button"
                onClick={() => condominioId && cargarTodo(condominioId)}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Actualizar
              </button>

              <button
                type="button"
                onClick={imprimir}
                className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>

        {mensaje && (
          <div className="no-print bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-bold">
            {mensaje}
          </div>
        )}

        <div className="no-print bg-white rounded-2xl border shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-sm font-semibold mb-1">Año</label>
              <select
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="border rounded-xl px-3 py-2 w-full bg-white text-sm"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="border rounded-xl px-3 py-2 w-full bg-white text-sm"
              >
                {meses.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border rounded-xl px-3 py-2 w-full bg-white text-sm"
              >
                <option value="TODOS">Todos</option>
                <option value="PAGADAS">Pagadas</option>
                <option value="PENDIENTES_PAGO">Pendientes de pago</option>
                <option value="GASTO_GENERADO">Gasto generado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Buscar</label>
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="border rounded-xl px-3 py-2 w-full text-sm"
                placeholder="Proveedor, concepto, cheque..."
              />
            </div>

            <button
              type="button"
              onClick={limpiarFiltros}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 border px-4 py-2 rounded-xl font-bold text-sm"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <section className="print-card bg-white rounded-2xl border shadow-sm p-5">
          <div className="border-b-2 border-slate-900 pb-3 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-black uppercase text-slate-900">
                  {condominio?.nombre || condominioNombre || "Condominio"}
                </h1>

                <h2 className="text-lg font-black uppercase mt-1">
                  Resumen de Solicitudes de Pago
                </h2>

                <p className="text-sm text-slate-600 mt-1">
                  Período: {nombreMes} {anio}
                </p>
              </div>

              <div className="text-right text-sm">
                <p>
                  <strong>Fecha impresión:</strong> {fechaHoy()}
                </p>
                <p>
                  <strong>Filtro estado:</strong>{" "}
                  {filtroEstado === "TODOS" ? "Todos" : filtroEstado}
                </p>
                <p>
                  <strong>Cantidad:</strong> {filasFiltradas.length}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 no-print">
            <ResumenCard
              titulo="Total solicitado"
              valor={totalSolicitado}
              color="text-blue-700"
            />

            <ResumenCard
              titulo="Total pagado"
              valor={totalPagado}
              color="text-green-700"
            />

            <ResumenCard
              titulo="Total pendiente"
              valor={totalPendiente}
              color="text-red-700"
            />

            <ResumenCard
              titulo="Pagadas"
              valor={cantidadPagadas}
              color="text-emerald-700"
              esCantidad
            />

            <ResumenCard
              titulo="Pendientes"
              valor={cantidadPendientes}
              color="text-amber-700"
              esCantidad
            />
          </div>

          <div className="hidden print:grid grid-cols-5 gap-2 mb-3 text-[10px]">
            <div className="border rounded p-2">
              <strong>Total solicitado:</strong>
              <br />
              RD$ {dinero(totalSolicitado)}
            </div>
            <div className="border rounded p-2">
              <strong>Total pagado:</strong>
              <br />
              RD$ {dinero(totalPagado)}
            </div>
            <div className="border rounded p-2">
              <strong>Total pendiente:</strong>
              <br />
              RD$ {dinero(totalPendiente)}
            </div>
            <div className="border rounded p-2">
              <strong>Pagadas:</strong>
              <br />
              {cantidadPagadas}
            </div>
            <div className="border rounded p-2">
              <strong>Pendientes:</strong>
              <br />
              {cantidadPendientes}
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-slate-600">Cargando información...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="print-table min-w-full text-xs border">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border text-left">No.</th>
                    <th className="p-2 border text-left">Fecha</th>
                    <th className="p-2 border text-left">Proveedor</th>
                    <th className="p-2 border text-left">Concepto</th>
                    <th className="p-2 border text-left">No. cheque</th>
                    <th className="p-2 border text-right">Monto</th>
                    <th className="p-2 border text-center">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {filasFiltradas.map((fila) => (
                    <tr key={fila.id} className="hover:bg-slate-50">
                      <td className="p-2 border font-bold">
                        {fila.numero_solicitud || fila.id}
                      </td>

                      <td className="p-2 border">
                        {formatoFecha(fila.fecha_solicitud || fila.created_at)}
                      </td>

                      <td className="p-2 border">{fila.proveedor}</td>

                      <td className="p-2 border">
                        <div className="font-semibold">
                          {fila.concepto || "-"}
                        </div>
                        <div className="text-[9px] text-slate-500">
                          {fila.categoria || ""}
                        </div>
                      </td>

                      <td className="p-2 border">
                        {fila.numero_cheque || "-"}
                      </td>

                      <td className="p-2 border text-right font-bold">
                        RD$ {dinero(fila.total)}
                      </td>

                      <td className="p-2 border text-center">
                        {fila.pagado
                          ? "Pagado"
                          : etiquetaEstadoSolicitud(fila.estado)}
                      </td>
                    </tr>
                  ))}

                  {filasFiltradas.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-6 border text-center text-slate-500"
                      >
                        No hay solicitudes para mostrar en este período.
                      </td>
                    </tr>
                  )}
                </tbody>

                {filasFiltradas.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-black">
                      <td className="p-2 border text-right" colSpan={5}>
                        Total:
                      </td>
                      <td className="p-2 border text-right">
                        RD$ {dinero(totalSolicitado)}
                      </td>
                      <td className="p-2 border" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          <div className="firma-print grid grid-cols-3 gap-8 mt-12 text-center text-sm">
            <div>
              <div className="border-t border-slate-900 pt-2">
                Preparado por
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Administración / VAM
              </p>
            </div>

            <div>
              <div className="border-t border-slate-900 pt-2">
                Firma del Tesorero
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {tesorero?.nombre || "Tesorero"}
              </p>
            </div>

            <div>
              <div className="border-t border-slate-900 pt-2">
                Firma del Presidente
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {presidente?.nombre || "Presidente"}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-2 border-t text-[10px] text-slate-500 flex justify-between">
            <span>
              Reporte generado desde el módulo de Solicitudes de Pago.
            </span>
            <span>VAM Administración de Condominios</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function ResumenCard({
  titulo,
  valor,
  color,
  esCantidad = false,
}: {
  titulo: string;
  valor: number;
  color: string;
  esCantidad?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4">
      <p className="text-xs text-slate-500">{titulo}</p>

      <h2 className={`text-xl font-black mt-1 ${color}`}>
        {esCantidad
          ? Number(valor || 0).toLocaleString("es-DO")
          : `RD$ ${Number(valor || 0).toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}`}
      </h2>
    </div>
  );
}