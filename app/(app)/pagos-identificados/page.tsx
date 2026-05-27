"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

type PagoIdentificado = {
  id: number;
  archivo_banco_id: number;
  no_apartamento: string;
  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string;
  descripcion_banco: string;
  estado: string;
  created_at: string;
};

export default function PagosIdentificadosPage() {
  const [pagos, setPagos] = useState<PagoIdentificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroApartamento, setFiltroApartamento] = useState("");

  useEffect(() => {
    cargarPagos();
  }, []);

  async function cargarPagos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("pagos_identificados")
      .select(
        "id, archivo_banco_id, no_apartamento, fecha_posteo, monto_transaccion, no_serial, descripcion_banco, estado, created_at"
      )
      .order("fecha_posteo", { ascending: false });

    if (error) {
      alert("Error cargando pagos identificados: " + error.message);
      setLoading(false);
      return;
    }

    setPagos(data || []);
    setLoading(false);
  }

  const pagosFiltrados = pagos.filter((p) =>
    p.no_apartamento.toLowerCase().includes(filtroApartamento.toLowerCase())
  );

  const totalPagado = pagosFiltrados.reduce(
    (sum, p) => sum + Number(p.monto_transaccion || 0),
    0
  );

  function exportarExcel() {
    if (pagosFiltrados.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = pagosFiltrados.map((p) => ({
      Apartamento: p.no_apartamento,
      "Fecha Pago": p.fecha_posteo,
      "Monto RD$": Number(p.monto_transaccion || 0),
      "No Serial": p.no_serial,
      "Descripción Banco": p.descripcion_banco,
      Estado: p.estado,
      "Fecha Registro": new Date(p.created_at).toLocaleDateString("es-DO"),
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 45 },
      { wch: 15 },
      { wch: 18 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Pagos Identificados");

    XLSX.writeFile(libro, "Reporte_Pagos_Identificados.xlsx");
  }

  if (loading) {
    return <div className="p-6">Cargando pagos identificados...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reporte de Pagos Identificados</h1>
          <p className="text-gray-600">
            Listado de pagos identificados por apartamento desde el archivo del banco.
          </p>
        </div>

        <button
          onClick={exportarExcel}
          className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
        >
          Exportar a Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-gray-500">Total registros</p>
          <h2 className="text-2xl font-bold">{pagosFiltrados.length}</h2>
        </div>

        <div className="border rounded-lg p-4 bg-white">
          <p className="text-gray-500">Total pagado</p>
          <h2 className="text-2xl font-bold text-green-700">
            RD$
            {totalPagado.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div className="border rounded-lg p-4 bg-white">
          <p className="text-gray-500">Apartamentos únicos</p>
          <h2 className="text-2xl font-bold text-blue-700">
            {new Set(pagosFiltrados.map((p) => p.no_apartamento)).size}
          </h2>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-white">
        <label className="block text-sm font-semibold mb-2">
          Filtrar por apartamento
        </label>
        <input
          type="text"
          value={filtroApartamento}
          onChange={(e) => setFiltroApartamento(e.target.value)}
          placeholder="Ejemplo: A1, B2, C3"
          className="border rounded-lg px-3 py-2 w-full md:w-80"
        />
      </div>

      <div className="overflow-auto border rounded-lg bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Apartamento</th>
              <th className="p-2 border">Fecha Pago</th>
              <th className="p-2 border">Monto</th>
              <th className="p-2 border">No Serial</th>
              <th className="p-2 border">Descripción Banco</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border">Registrado</th>
            </tr>
          </thead>

          <tbody>
            {pagosFiltrados.map((p) => (
              <tr key={p.id}>
                <td className="p-2 border font-semibold">{p.no_apartamento}</td>
                <td className="p-2 border">{p.fecha_posteo}</td>

                <td className="p-2 border text-right">
                  RD$
                  {Number(p.monto_transaccion).toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </td>

                <td className="p-2 border">{p.no_serial}</td>
                <td className="p-2 border">{p.descripcion_banco}</td>

                <td className="p-2 border text-green-700 font-semibold">
                  {p.estado}
                </td>

                <td className="p-2 border">
                  {new Date(p.created_at).toLocaleDateString("es-DO")}
                </td>
              </tr>
            ))}

            {pagosFiltrados.length === 0 && (
              <tr>
                <td className="p-4 border text-center" colSpan={7}>
                  No se encontraron pagos identificados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}