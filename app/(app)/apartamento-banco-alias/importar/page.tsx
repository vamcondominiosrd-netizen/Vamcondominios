"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/app/lib/supabaseClient";

type AliasRow = {
  no_apartamento: string;
  descripcion_banco: string;
};

function obtenerValor(row: any, posiblesNombres: string[]) {
  const keys = Object.keys(row);

  for (const nombre of posiblesNombres) {
    const key = keys.find(
      (k) => k.trim().toLowerCase() === nombre.trim().toLowerCase()
    );

    if (key) return row[key];
  }

  return "";
}

export default function ImportarApartamentoBancoAliasPage() {
  const [rows, setRows] = useState<AliasRow[]>([]);
  const [loading, setLoading] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet);

      const mapped: AliasRow[] = json
        .map((r) => ({
          no_apartamento: String(
            obtenerValor(r, [
              "No Apartamento",
              "No. Apartamento",
              "Apartamento",
              "Unidad",
              "No Unidad",
            ]) || ""
          ).trim(),

          descripcion_banco: String(
            obtenerValor(r, [
              "Descripcion Banco",
              "Descripción Banco",
              "Descripcion",
              "Descripción",
              "Banco",
              "Alias Banco",
            ]) || ""
          ).trim(),
        }))
        .filter((r) => r.no_apartamento && r.descripcion_banco);

      setRows(mapped);
    };

    reader.readAsArrayBuffer(file);
  }

  async function guardarEnSupabase() {
    if (rows.length === 0) {
      alert("No hay datos para importar.");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("apartamento_banco_alias")
      .insert(rows);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Error al guardar los datos: " + error.message);
      return;
    }

    alert("Alias importados correctamente.");
    setRows([]);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Importar Apartamentos Bancos Alias
        </h1>
        <p className="text-gray-600">
          Suba el archivo Excel con los apartamentos y las descripciones del banco.
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-white">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="block w-full"
        />
      </div>

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Vista previa: {rows.length} registros
            </h2>

            <button
              onClick={guardarEnSupabase}
              disabled={loading}
              className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar en Apartamento Banco Alias"}
            </button>
          </div>

          <div className="overflow-auto border rounded-lg bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">No Apartamento</th>
                  <th className="p-2 border">Descripción Banco</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="p-2 border">{r.no_apartamento}</td>
                    <td className="p-2 border">{r.descripcion_banco}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}