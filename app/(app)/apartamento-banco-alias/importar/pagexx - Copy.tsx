"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/app/lib/supabaseClient";

type AliasRow = {
  condominio_id: number;
  condominio: string;
  unidad_id: number | null;
  no_apartamento: string;
  propietario: string;
  descripcion_banco: string;
  estado: string;
};

type Unidad = {
  id: number;
  condominio_id: number;
  codigo: string;
  propietario_nombre: string;
  activa: boolean;
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

function limpiarTexto(texto: string) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ImportarApartamentoBancoAliasPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [rows, setRows] = useState<AliasRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [cargandoUnidades, setCargandoUnidades] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarUnidades(id);
    }
  }, []);

  async function cargarUnidades(id: string) {
    setCargandoUnidades(true);

    const { data, error } = await supabase
      .from("unidades")
      .select("id, condominio_id, codigo, propietario_nombre, activa")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    setCargandoUnidades(false);

    if (error) {
      alert("Error cargando apartamentos: " + error.message);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  function buscarUnidad(noApartamento: string) {
    const aptoLimpio = limpiarTexto(noApartamento);

    return (
      unidades.find((unidad) => limpiarTexto(unidad.codigo) === aptoLimpio) ||
      null
    );
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (unidades.length === 0) {
      alert("No hay apartamentos cargados para este condominio.");
      return;
    }

    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const json: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });

      const mapped: AliasRow[] = json
        .map((r) => {
          const noApartamento = String(
            obtenerValor(r, [
              "No Apartamento",
              "No. Apartamento",
              "Apartamento",
              "Unidad",
              "No Unidad",
              "Código",
              "Codigo",
            ]) || ""
          ).trim();

          const descripcionBanco = String(
            obtenerValor(r, [
              "Descripcion Banco",
              "Descripción Banco",
              "Descripcion",
              "Descripción",
              "Banco",
              "Alias Banco",
              "Concepto Banco",
              "Referencia Banco",
            ]) || ""
          ).trim();

          const unidad = buscarUnidad(noApartamento);

          return {
            condominio_id: Number(condominioId),
            condominio: condominioNombre,

            unidad_id: unidad?.id || null,
            no_apartamento: noApartamento,
            propietario: unidad?.propietario_nombre || "",

            descripcion_banco: descripcionBanco,
            estado: "Activo",
          };
        })
        .filter((r) => r.no_apartamento && r.descripcion_banco);

      setRows(mapped);
    };

    reader.readAsArrayBuffer(file);
  }

  async function guardarEnSupabase() {
    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (rows.length === 0) {
      alert("No hay datos para importar.");
      return;
    }

    const registrosValidos = rows.filter(
      (r) => r.no_apartamento && r.descripcion_banco
    );

    if (registrosValidos.length === 0) {
      alert("No hay registros válidos para importar.");
      return;
    }

    const confirmar = confirm(
      `Se importarán ${registrosValidos.length} alias bancarios para ${condominioNombre}. ¿Desea continuar?`
    );

    if (!confirmar) return;

    setLoading(true);

    const { error } = await supabase
      .from("apartamento_banco_alias")
      .insert(registrosValidos);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Error al guardar los datos: " + error.message);
      return;
    }

    alert("Alias importados correctamente.");
    setRows([]);
  }

  const totalSinUnidad = rows.filter((r) => !r.unidad_id).length;
  const totalConUnidad = rows.filter((r) => r.unidad_id).length;

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-3xl font-black text-slate-900">
          Importar Apartamentos Banco Alias
        </h1>

        <p className="text-slate-500 mt-2">
          Sube el archivo Excel con los apartamentos y las descripciones que
          aparecen en el banco para identificar pagos automáticamente.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Apartamentos activos cargados:{" "}
          <span className="font-bold text-blue-700">{unidades.length}</span>
        </p>

        {cargandoUnidades && (
          <p className="text-sm text-slate-500 mt-2">
            Cargando apartamentos...
          </p>
        )}

        {!condominioId && (
          <p className="text-sm text-red-600 mt-2">
            No se encontró condominio activo. Debe iniciar sesión nuevamente.
          </p>
        )}
      </div>

      <div className="border rounded-2xl p-5 bg-white shadow-sm">
        <label className="block text-sm font-semibold mb-2">
          Seleccionar archivo Excel o CSV
        </label>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="block w-full border rounded-xl px-4 py-3"
        />

        <p className="text-xs text-slate-500 mt-2">
          Columnas esperadas: No Apartamento y Descripción Banco. También acepta
          Apartamento, Unidad, Código, Descripción, Banco o Alias Banco.
        </p>
      </div>

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Registros leídos</p>
              <h2 className="text-3xl font-black">{rows.length}</h2>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Con unidad</p>
              <h2 className="text-3xl font-black text-green-700">
                {totalConUnidad}
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Sin unidad</p>
              <h2 className="text-3xl font-black text-yellow-700">
                {totalSinUnidad}
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Estado inicial</p>
              <h2 className="text-2xl font-black text-blue-700">Activo</h2>
            </div>
          </div>

          {totalSinUnidad > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-4">
              Hay {totalSinUnidad} alias cuyo apartamento no fue encontrado en
              la tabla de unidades. Se importarán, pero quedarán sin unidad_id y
              sin propietario.
            </div>
          )}

          <div className="flex items-center justify-between bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="text-lg font-bold">
              Vista previa: {rows.length} registros
            </h2>

            <button
              onClick={guardarEnSupabase}
              disabled={loading}
              className="bg-blue-700 text-white px-5 py-3 rounded-xl hover:bg-blue-800 disabled:opacity-50 font-bold"
            >
              {loading ? "Guardando..." : "Guardar en Apartamento Banco Alias"}
            </button>
          </div>

          <div className="overflow-auto border rounded-2xl bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Condominio</th>
                  <th className="p-3 border text-left">No Apartamento</th>
                  <th className="p-3 border text-left">Propietario</th>
                  <th className="p-3 border text-left">Descripción Banco</th>
                  <th className="p-3 border text-center">Estado</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="p-3 border font-semibold">
                      {r.condominio}
                    </td>

                    <td className="p-3 border font-bold">
                      {r.no_apartamento}
                    </td>

                    <td className="p-3 border">
                      {r.propietario || (
                        <span className="text-yellow-700 font-bold">
                          No encontrado
                        </span>
                      )}
                    </td>

                    <td className="p-3 border">{r.descripcion_banco}</td>

                    <td className="p-3 border text-center">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                        {r.estado}
                      </span>
                    </td>
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