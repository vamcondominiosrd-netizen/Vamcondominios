"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

type Fondo = {
  condominio: string;
  monto: number;
};

type Gasto = {
  condominio: string;
  monto: number;
};

export default function BalanceCajaChicaPage() {
  const [fondos, setFondos] = useState<Fondo[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [filtroCondominio, setFiltroCondominio] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data: fondosData, error: fondosError } = await supabase
      .from("caja_chica_fondos")
      .select("condominio, monto");

    const { data: gastosData, error: gastosError } = await supabase
      .from("caja_chica")
      .select("condominio, monto");

    if (fondosError) {
      alert("Error cargando fondos: " + fondosError.message);
      return;
    }

    if (gastosError) {
      alert("Error cargando gastos: " + gastosError.message);
      return;
    }

    setFondos(fondosData || []);
    setGastos(gastosData || []);
  }

  const condominios = Array.from(
    new Set([
      ...fondos.map((f) => f.condominio),
      ...gastos.map((g) => g.condominio),
    ])
  ).filter(Boolean);

  const condominiosFiltrados =
    filtroCondominio === ""
      ? condominios
      : condominios.filter((c) => c === filtroCondominio);

  const resumen = condominiosFiltrados.map((condominio) => {
    const totalFondos = fondos
      .filter((f) => f.condominio === condominio)
      .reduce((sum, f) => sum + Number(f.monto || 0), 0);

    const totalGastos = gastos
      .filter((g) => g.condominio === condominio)
      .reduce((sum, g) => sum + Number(g.monto || 0), 0);

    const balance = totalFondos - totalGastos;

    return {
      condominio,
      totalFondos,
      totalGastos,
      balance,
    };
  });

  const totalFondosGeneral = resumen.reduce((sum, r) => sum + r.totalFondos, 0);
  const totalGastosGeneral = resumen.reduce((sum, r) => sum + r.totalGastos, 0);
  const balanceGeneral = totalFondosGeneral - totalGastosGeneral;

  function exportarExcel() {
    if (resumen.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = resumen.map((r) => ({
      Condominio: r.condominio,
      "Fondos / Reposiciones RD$": Number(r.totalFondos || 0),
      "Gastos RD$": Number(r.totalGastos || 0),
      "Balance Disponible RD$": Number(r.balance || 0),
    }));

    dataExcel.push({
      Condominio: "TOTAL GENERAL",
      "Fondos / Reposiciones RD$": Number(totalFondosGeneral || 0),
      "Gastos RD$": Number(totalGastosGeneral || 0),
      "Balance Disponible RD$": Number(balanceGeneral || 0),
    });

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [
      { wch: 22 },
      { wch: 26 },
      { wch: 18 },
      { wch: 26 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Balance Caja Chica");

    XLSX.writeFile(libro, "Balance_Caja_Chica.xlsx");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Balance de Caja Chica</h1>
          <p className="text-slate-500">
            Resumen de fondos, gastos y balance disponible por condominio.
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
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total fondos</p>
          <h2 className="text-2xl font-bold text-green-700">
            RD$
            {totalFondosGeneral.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total gastos</p>
          <h2 className="text-2xl font-bold text-red-700">
            RD$
            {totalGastosGeneral.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Balance disponible</p>
          <h2
            className={`text-2xl font-bold ${
              balanceGeneral >= 0 ? "text-blue-700" : "text-red-700"
            }`}
          >
            RD$
            {balanceGeneral.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <label className="block text-sm font-semibold mb-1">
          Filtrar por condominio
        </label>
        <select
          value={filtroCondominio}
          onChange={(e) => setFiltroCondominio(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full md:w-64"
        >
          <option value="">Todos</option>
          <option value="Lote 9">Lote 9</option>
          <option value="Lote 11">Lote 11</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Balance por condominio</h2>

        <div className="overflow-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Condominio</th>
                <th className="p-2 border">Fondos / Reposiciones</th>
                <th className="p-2 border">Gastos</th>
                <th className="p-2 border">Balance Disponible</th>
              </tr>
            </thead>

            <tbody>
              {resumen.map((r) => (
                <tr key={r.condominio}>
                  <td className="p-2 border font-semibold">{r.condominio}</td>
                  <td className="p-2 border text-right">
                    RD$
                    {r.totalFondos.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-2 border text-right">
                    RD$
                    {r.totalGastos.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    className={`p-2 border text-right font-bold ${
                      r.balance >= 0 ? "text-blue-700" : "text-red-700"
                    }`}
                  >
                    RD$
                    {r.balance.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}

              {resumen.length === 0 && (
                <tr>
                  <td className="p-4 border text-center" colSpan={4}>
                    No hay datos de caja chica.
                  </td>
                </tr>
              )}
            </tbody>

            {resumen.length > 0 && (
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td className="p-2 border">TOTAL GENERAL</td>
                  <td className="p-2 border text-right">
                    RD$
                    {totalFondosGeneral.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-2 border text-right">
                    RD$
                    {totalGastosGeneral.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    className={`p-2 border text-right ${
                      balanceGeneral >= 0 ? "text-blue-700" : "text-red-700"
                    }`}
                  >
                    RD$
                    {balanceGeneral.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}