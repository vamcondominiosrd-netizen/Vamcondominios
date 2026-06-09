"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

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
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      setMensaje("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const nombreFinal = nombre || `Condominio ID ${id}`;

    setCondominioId(id);
    setCondominioNombre(nombreFinal);

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

    if (valor.includes("rechazado") || valor.includes("rechazada")) {
      return "rechazado";
    }

    return valor || "sin_estado";
  }

  function etiquetaEstado(estado: string | null | undefined) {
    const normalizado = normalizarEstado(estado);

    if (normalizado === "pendiente_tesorero") return "Pendiente tesorero";
    if (normalizado === "pendiente_presidente") return "Pendiente presidente";
    if (normalizado === "aprobado_presidente") return "Aprobado presidente";
    if (normalizado === "gasto_generado") return "Gasto generado";
    if (normalizado === "rechazado") return estado || "Rechazado";

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

    if (normalizado === "rechazado") {
      return "bg-red-100 text-red-800";
    }

    return "bg-slate-100 text-slate-700";
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
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

    alert("Gasto generado correctamente.");

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
      } ${g.catalogo_proveedores?.nombre_proveedor || ""}`.toLowerCase();

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
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Solicitudes de Pago
            </h1>

            <p className="text-slate-500 mt-2">
              Control de solicitudes, gastos aprobados y pagos pendientes.
            </p>

            <p className="text-sm text-blue-700 font-bold mt-3">
              Condominio activo: {condominioNombre || "No seleccionado"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/solicitudes-pago/nueva"
              className="bg-blue-700 text-white px-4 py-2 rounded-xl hover:bg-blue-800 font-bold"
            >
              Nueva solicitud
            </Link>

            <button
              onClick={() => cargarTodo(condominioId)}
              className="bg-slate-700 text-white px-4 py-2 rounded-xl hover:bg-slate-800 font-bold"
            >
              Actualizar
            </button>

            <button
              onClick={exportarExcel}
              className="bg-green-700 text-white px-4 py-2 rounded-xl hover:bg-green-800 font-bold"
            >
              Exportar
            </button>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Pendiente tesorero</p>
          <h2 className="text-3xl font-black text-yellow-700">
            {totalPendienteTesorero}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Pendiente presidente</p>
          <h2 className="text-3xl font-black text-blue-700">
            {totalPendientePresidente}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Pendiente generar gasto</p>
          <h2 className="text-3xl font-black text-green-700">
            {totalPendienteGenerarGasto}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Aprobados para pago</p>
          <h2 className="text-3xl font-black text-red-700">
            {gastosAprobadosFiltrados.length}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Todos</option>
              <option value="pendiente_tesorero">Pendiente tesorero</option>
              <option value="pendiente_presidente">Pendiente presidente</option>
              <option value="aprobado_presidente">Aprobado presidente</option>
              <option value="pendiente_gasto">Pendiente generar gasto</option>
              <option value="gasto_generado">Gasto generado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Buscar por proveedor, concepto o detalle..."
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-black">
              Gastos aprobados pendientes de pago
            </h2>

            <p className="text-sm text-slate-500">
              Se muestran registros de la tabla gastos con aprobado_tesorero = true,
              aprobado_presidente = true y pagado = false.
            </p>
          </div>

          <div className="text-lg font-black text-red-700">
            RD$ {dinero(totalAprobadoPendiente)}
          </div>
        </div>

        <div className="overflow-auto border rounded-2xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 border text-left">ID</th>
                <th className="p-3 border text-left">Fecha</th>
                <th className="p-3 border text-left">Proveedor</th>
                <th className="p-3 border text-left">Concepto</th>
                <th className="p-3 border text-right">Total</th>
                <th className="p-3 border text-center">Estado</th>
              </tr>
            </thead>

            <tbody>
              {gastosAprobadosFiltrados.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="p-3 border font-bold">{g.id}</td>

                  <td className="p-3 border">{g.fecha || "-"}</td>

                  <td className="p-3 border">
                    {g.catalogo_proveedores?.nombre_proveedor || "-"}
                  </td>

                  <td className="p-3 border">
                    <p className="font-semibold">{g.concepto || "-"}</p>

                    {g.detalle_gasto && (
                      <p className="text-xs text-slate-500 mt-1">
                        {g.detalle_gasto}
                      </p>
                    )}
                  </td>

                  <td className="p-3 border text-right font-bold">
                    RD$ {dinero(g.total)}
                  </td>

                  <td className="p-3 border text-center">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                      Aprobado para pago
                    </span>
                  </td>
                </tr>
              ))}

              {gastosAprobadosFiltrados.length === 0 && (
                <tr>
                  <td className="p-6 border text-center text-slate-500" colSpan={6}>
                    No hay gastos aprobados pendientes de pago para este condominio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-black">Listado de solicitudes</h2>

            <p className="text-sm text-slate-500">
              Solicitudes registradas en el flujo de aprobación.
            </p>
          </div>

          <div className="text-lg font-black text-green-700">
            RD$ {dinero(totalSolicitado)}
          </div>
        </div>

        {loading ? (
          <p>Cargando solicitudes...</p>
        ) : (
          <div className="overflow-auto border rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">ID</th>
                  <th className="p-3 border text-left">Proveedor</th>
                  <th className="p-3 border text-left">Concepto</th>
                  <th className="p-3 border text-right">Total</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Soporte</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {solicitudesFiltradas.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-bold">{s.id}</td>

                    <td className="p-3 border">
                      {s.catalogo_proveedores?.nombre_proveedor || "-"}
                    </td>

                    <td className="p-3 border">
                      <p className="font-semibold">{s.concepto || "-"}</p>

                      {s.detalle && (
                        <p className="text-xs text-slate-500 mt-1">
                          {s.detalle}
                        </p>
                      )}
                    </td>

                    <td className="p-3 border text-right font-bold">
                      RD$ {dinero(s.total)}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${estadoColor(
                          s.estado
                        )}`}
                      >
                        {etiquetaEstado(s.estado)}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      {s.soporte_url ? (
                        <a
                          href={s.soporte_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-900 text-white px-3 py-1 rounded-lg inline-block"
                        >
                          Ver
                        </a>
                      ) : (
                        <span className="text-slate-400">Sin soporte</span>
                      )}
                    </td>

                    <td className="p-3 border text-center">
                      {s.gasto_generado_id ? (
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                          Gasto generado
                        </span>
                      ) : normalizarEstado(s.estado) === "aprobado_presidente" ? (
                        <button
                          onClick={() => generarGasto(s)}
                          className="bg-blue-700 text-white px-3 py-1 rounded-lg hover:bg-blue-800 font-bold"
                        >
                          Generar gasto
                        </button>
                      ) : (
                        <span className="text-slate-400">
                          Pendiente aprobación
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {solicitudesFiltradas.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={7}>
                      No hay solicitudes registradas para este condominio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}