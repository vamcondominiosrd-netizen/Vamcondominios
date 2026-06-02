"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

type CajaChica = {
  id: number;
  condominio: string;
  fecha: string;
  concepto: string;
  detalle_gasto: string;
  monto: number;
  responsable: string;
  comprobante: string;
  factura_url: string;
  estado: string;
  created_at: string;
};

export default function ReporteCajaChicaPage() {
  const [gastos, setGastos] = useState<CajaChica[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominioNombre, setCondominioNombre] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioNombre(nombre);

    if (nombre) {
      cargarGastos(nombre);
    }
  }, []);

  async function cargarGastos(nombreCondominio: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("caja_chica")
      .select(
        "id, condominio, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, created_at"
      )
      .ilike("condominio", `%${nombreCondominio}%`)
      .order("fecha", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando reporte de caja chica: " + error.message);
      return;
    }

    setGastos(data || []);
  }

  const gastosFiltrados = gastos.filter((g) => {
    const cumpleDesde = fechaDesde === "" || g.fecha >= fechaDesde;
    const cumpleHasta = fechaHasta === "" || g.fecha <= fechaHasta;

    return cumpleDesde && cumpleHasta;
  });

  const totalGastos = gastosFiltrados.reduce(
    (sum, g) => sum + Number(g.monto || 0),
    0
  );

  function exportarExcel() {
    if (gastosFiltrados.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = gastosFiltrados.map((g) => ({
      Condominio: g.condominio,
      Fecha: g.fecha,
      Concepto: g.concepto,
      "Detalle del gasto": g.detalle_gasto,
      "Monto RD$": Number(g.monto || 0),
      Responsable: g.responsable,
      Comprobante: g.comprobante,
      "URL Factura": g.factura_url || "",
      Estado: g.estado,
      "Fecha registro": g.created_at
        ? new Date(g.created_at).toLocaleDateString("es-DO")
        : "",
    }));

    dataExcel.push({
      Condominio: "TOTAL",
      Fecha: "",
      Concepto: "",
      "Detalle del gasto": "",
      "Monto RD$": Number(totalGastos || 0),
      Responsable: "",
      Comprobante: "",
      "URL Factura": "",
      Estado: "",
      "Fecha registro": "",
    });

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [
      { wch: 40 },
      { wch: 15 },
      { wch: 28 },
      { wch: 45 },
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 60 },
      { wch: 15 },
      { wch: 18 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Reporte Caja Chica");

    XLSX.writeFile(
      libro,
      `Reporte_Caja_Chica_${condominioNombre.replaceAll(" ", "_")}.xlsx`
    );
  }

  function limpiarFiltros() {
    setFechaDesde("");
    setFechaHasta("");
  }

  if (loading) {
    return <div className="p-6">Cargando reporte de caja chica...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reporte de Caja Chica</h1>
          <p className="text-slate-500">
            Consulta y exporta los gastos de caja chica del condominio activo.
          </p>
        </div>

        <button
          onClick={exportarExcel}
          className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
        >
          Exportar a Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total registros</p>
          <h2 className="text-2xl font-bold">{gastosFiltrados.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Monto total gastado</p>
          <h2 className="text-2xl font-bold text-red-700">
            RD$
            {totalGastos.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Resultado</p>
          <h2 className="text-2xl font-bold text-blue-700">
            {condominioNombre ? "Filtrado" : "Sin condominio"}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Filtros del reporte</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Condominio
            </label>

            <input
              type="text"
              value={condominioNombre}
              readOnly
              className="border rounded-lg px-3 py-2 w-full bg-slate-100 text-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha desde
            </label>

            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha hasta
            </label>

            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              onClick={limpiarFiltros}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 w-full md:w-auto"
            >
              Limpiar fechas
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Detalle del reporte</h2>

        <div className="overflow-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Condominio</th>
                <th className="p-2 border">Fecha</th>
                <th className="p-2 border">Concepto</th>
                <th className="p-2 border">Detalle</th>
                <th className="p-2 border">Monto</th>
                <th className="p-2 border">Responsable</th>
                <th className="p-2 border">Comprobante</th>
                <th className="p-2 border">Factura</th>
                <th className="p-2 border">Estado</th>
              </tr>
            </thead>

            <tbody>
              {gastosFiltrados.map((g) => (
                <tr key={g.id}>
                  <td className="p-2 border font-semibold">{g.condominio}</td>
                  <td className="p-2 border">{g.fecha}</td>
                  <td className="p-2 border">{g.concepto}</td>
                  <td className="p-2 border">{g.detalle_gasto}</td>
                  <td className="p-2 border text-right">
                    RD$
                    {Number(g.monto).toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-2 border">{g.responsable}</td>
                  <td className="p-2 border">{g.comprobante}</td>
                  <td className="p-2 border text-center">
                    {g.factura_url ? (
                      <a
                        href={g.factura_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-900 text-white px-3 py-1 rounded-lg hover:bg-slate-800 inline-block"
                      >
                        Ver factura
                      </a>
                    ) : (
                      <span className="text-slate-400">Sin factura</span>
                    )}
                  </td>
                  <td className="p-2 border text-green-700 font-semibold">
                    {g.estado}
                  </td>
                </tr>
              ))}

              {gastosFiltrados.length === 0 && (
                <tr>
                  <td className="p-4 border text-center" colSpan={9}>
                    No hay gastos registrados para este condominio o filtros
                    seleccionados.
                  </td>
                </tr>
              )}
            </tbody>

            {gastosFiltrados.length > 0 && (
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td className="p-2 border text-right" colSpan={4}>
                    TOTAL
                  </td>
                  <td className="p-2 border text-right">
                    RD$
                    {totalGastos.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-2 border" colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}