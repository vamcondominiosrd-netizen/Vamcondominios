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

type Resumen = {
  condominio: string;
  totalFondos: number;
  totalGastos: number;
  balance: number;
};

export default function BalanceCajaChicaPage() {
  const [fondos, setFondos] = useState<Fondo[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [condominioNombre, setCondominioNombre] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const nombre = localStorage.getItem("condominio_nombre") || "";
    setCondominioNombre(nombre);

    if (nombre) {
      cargarDatos(nombre);
    }
  }, []);

  async function cargarDatos(nombreCondominio: string) {
    setLoading(true);

    const { data: fondosData, error: fondosError } = await supabase
      .from("caja_chica_fondos")
      .select("condominio, monto")
      .ilike("condominio", `%${nombreCondominio}%`);

    const { data: gastosData, error: gastosError } = await supabase
      .from("caja_chica")
      .select("condominio, monto")
      .ilike("condominio", `%${nombreCondominio}%`);

    setLoading(false);

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

  const totalFondosGeneral = fondos.reduce(
    (sum, f) => sum + Number(f.monto || 0),
    0
  );

  const totalGastosGeneral = gastos.reduce(
    (sum, g) => sum + Number(g.monto || 0),
    0
  );

  const balanceGeneral = totalFondosGeneral - totalGastosGeneral;

  const resumen: Resumen[] = [
    {
      condominio: condominioNombre,
      totalFondos: totalFondosGeneral,
      totalGastos: totalGastosGeneral,
      balance: balanceGeneral,
    },
  ];

  function exportarExcel() {
    if (!condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    const dataExcel = resumen.map((r) => ({
      Condominio: r.condominio,
      "Fondos / Reposiciones RD$": Number(r.totalFondos || 0),
      "Gastos RD$": Number(r.totalGastos || 0),
      "Balance Disponible RD$": Number(r.balance || 0),
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [
      { wch: 40 },
      { wch: 26 },
      { wch: 18 },
      { wch: 26 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Balance Caja Chica");

    XLSX.writeFile(
      libro,
      `Balance_Caja_Chica_${condominioNombre.replaceAll(" ", "_")}.xlsx`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Balance de Caja Chica</h1>
          <p className="text-slate-500">
            Resumen de fondos, gastos y balance disponible del condominio activo.
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
          <p className="text-sm text-slate-500">Total fondos</p>
          <h2 className="text-2xl font-bold text-green-700">
            RD$
            {totalFondosGeneral.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total gastos</p>
          <h2 className="text-2xl font-bold text-red-700">
            RD$
            {totalGastosGeneral.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
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

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Balance del condominio</h2>

        {loading ? (
          <p>Cargando balance de caja chica...</p>
        ) : (
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
                <tr>
                  <td className="p-2 border font-semibold">
                    {condominioNombre || "No identificado"}
                  </td>

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
                    className={`p-2 border text-right font-bold ${
                      balanceGeneral >= 0 ? "text-blue-700" : "text-red-700"
                    }`}
                  >
                    RD$
                    {balanceGeneral.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>

                {!condominioNombre && (
                  <tr>
                    <td className="p-4 border text-center" colSpan={4}>
                      No se encontró el condominio activo. Debe iniciar sesión
                      nuevamente.
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