"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Gasto = {
  id: number;
  condominio_id?: number;
  condominio: string | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
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
  catalogo_proveedores?: { nombre_proveedor: string | null } | null;
  catalogo_categoria_gastos?: { nombre_categoria: string | null } | null;
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
  });
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

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

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
        condominio_id,
        condominio,
        fecha,
        concepto,
        detalle_gasto,
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
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .order("fecha", { ascending: false });

    if (id) {
      query = query.eq("condominio_id", Number(id));
    } else {
      query = query.eq("condominio", nombreCondominio);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando gastos: " + error.message);
      return;
    }

    setGastos((data as Gasto[]) || []);
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

      const texto = `${g.id || ""} ${g.fecha || ""} ${g.concepto || ""} ${
        g.detalle_gasto || ""
      } ${g.no_factura || ""} ${g.ncf || ""} ${g.metodo_pago || ""} ${
        g.numero_cheque || ""
      } ${g.catalogo_proveedores?.nombre_proveedor || ""} ${
        g.catalogo_categoria_gastos?.nombre_categoria || ""
      } ${g.estado || ""}`.toLowerCase();

      const cumpleBusqueda = texto.includes(buscar.toLowerCase().trim());

      return cumpleEstado && cumpleBusqueda;
    });
  }, [gastos, buscar, filtroEstado]);

  const totalGastos = gastosFiltrados.reduce(
    (sum, g) => sum + Number(g.total || 0),
    0
  );

  const totalPagado = gastosFiltrados
    .filter((g) => g.pagado)
    .reduce((sum, g) => sum + Number(g.total || 0), 0);

  const totalPendientePago = gastosFiltrados
    .filter(
      (g) =>
        g.aprobado_tesorero === true &&
        g.aprobado_presidente === true &&
        g.pagado !== true
    )
    .reduce((sum, g) => sum + Number(g.total || 0), 0);

  const cantidadPagados = gastosFiltrados.filter((g) => g.pagado).length;

  const cantidadPendientePago = gastosFiltrados.filter(
    (g) =>
      g.aprobado_tesorero === true &&
      g.aprobado_presidente === true &&
      g.pagado !== true
  ).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Gastos Profesionales
            </h1>

            <p className="text-slate-500 mt-2">
              Consulta financiera de gastos generados desde Solicitudes de Pago.
            </p>

            <p className="text-sm text-blue-700 font-bold mt-3">
              Condominio activo: {condominioNombre || "No seleccionado"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/solicitudes-pago"
              className="bg-blue-700 text-white px-4 py-2 rounded-xl hover:bg-blue-800 font-bold"
            >
              Ir a solicitudes
            </Link>

            <button
              onClick={() => cargarGastos(condominioId, condominioNombre)}
              className="bg-slate-700 text-white px-4 py-2 rounded-xl hover:bg-slate-800 font-bold"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
        Los gastos ya no se registran ni se aprueban desde este módulo. El ciclo
        completo se maneja desde <strong>Solicitudes de Pago</strong>. Este
        módulo queda como consulta financiera y contable.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Registros filtrados</p>
          <h2 className="text-3xl font-black text-slate-900">
            {gastosFiltrados.length}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Monto total</p>
          <h2 className="text-2xl font-black text-red-700">
            RD$ {dinero(totalGastos)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pagados</p>
          <h2 className="text-2xl font-black text-green-700">
            {cantidadPagados}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            RD$ {dinero(totalPagado)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pendientes pago</p>
          <h2 className="text-2xl font-black text-blue-700">
            {cantidadPendientePago}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            RD$ {dinero(totalPendientePago)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Todos</option>
              <option value="pagado">Pagados</option>
              <option value="pendiente_pago">Aprobados pendientes de pago</option>
              <option value="pendiente_presidente">Pendientes presidente</option>
              <option value="sin_pagar">Sin pagar</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Proveedor, concepto, factura, NCF o cheque..."
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Gastos registrados
            </h2>

            <p className="text-sm text-slate-500">
              Listado de gastos generados desde el flujo de Solicitudes de Pago.
            </p>
          </div>

          <div className="text-lg font-black text-red-700">
            RD$ {dinero(totalGastos)}
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">Cargando gastos...</p>
        ) : (
          <div className="overflow-auto border rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border text-left">Fecha</th>
                  <th className="p-3 border text-left">Proveedor</th>
                  <th className="p-3 border text-left">Categoría</th>
                  <th className="p-3 border text-left">Concepto</th>
                  <th className="p-3 border text-right">Total</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Factura</th>
                  <th className="p-3 border text-center">Cheque</th>
                  <th className="p-3 border text-center">Pago</th>
                </tr>
              </thead>

              <tbody>
                {gastosFiltrados.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="p-3 border">{g.fecha || "-"}</td>

                    <td className="p-3 border">
                      {g.catalogo_proveedores?.nombre_proveedor || "-"}
                    </td>

                    <td className="p-3 border">
                      {g.catalogo_categoria_gastos?.nombre_categoria || "-"}
                    </td>

                    <td className="p-3 border">
                      <p className="font-semibold">{g.concepto || "-"}</p>

                      {g.detalle_gasto && (
                        <p className="text-xs text-slate-500 mt-1">
                          {g.detalle_gasto}
                        </p>
                      )}

                      {g.no_factura && (
                        <p className="text-xs text-slate-500 mt-1">
                          Factura: {g.no_factura}
                        </p>
                      )}

                      {g.ncf && (
                        <p className="text-xs text-slate-500 mt-1">
                          NCF: {g.ncf}
                        </p>
                      )}
                    </td>

                    <td className="p-3 border text-right font-bold">
                      RD$ {dinero(g.total)}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${estadoColor(
                          g
                        )}`}
                      >
                        {etiquetaEstado(g)}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      {g.factura_url ? (
                        <a
                          href={g.factura_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-900 text-white px-3 py-1 rounded-lg inline-block text-xs font-bold"
                        >
                          Ver factura
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          Sin factura
                        </span>
                      )}
                    </td>

                    <td className="p-3 border text-center">
                      {g.cheque_url ? (
                        <a
                          href={g.cheque_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-700 text-white px-3 py-1 rounded-lg inline-block text-xs font-bold"
                        >
                          Ver cheque
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          Sin cheque
                        </span>
                      )}

                      {g.numero_cheque && (
                        <p className="text-xs text-slate-500 mt-1">
                          No. {g.numero_cheque}
                        </p>
                      )}
                    </td>

                    <td className="p-3 border text-center">
                      {g.pagado ? (
                        <div>
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                            Pagado
                          </span>

                          {g.fecha_pago && (
                            <p className="text-xs text-slate-500 mt-1">
                              {g.fecha_pago}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                          Pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {gastosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center" colSpan={9}>
                      No hay gastos registrados para este condominio.
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