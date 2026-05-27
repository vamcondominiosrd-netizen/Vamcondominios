"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type BancoRow = {
  id: number;
  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string;
  descripcion: string;
  apartamento_identificado?: string;
  estado?: string;
};

type AliasRow = {
  id: number;
  no_apartamento: string;
  descripcion_banco: string;
};

export default function IdentificarPagosPage() {
  const [resultado, setResultado] = useState<BancoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const { data: bancoData, error: bancoError } = await supabase
      .from("archivo_banco")
      .select("id, fecha_posteo, monto_transaccion, no_serial, descripcion")
      .order("fecha_posteo", { ascending: false });

    const { data: aliasData, error: aliasError } = await supabase
      .from("apartamento_banco_alias")
      .select("id, no_apartamento, descripcion_banco");

    if (bancoError) {
      alert("Error cargando archivo_banco: " + bancoError.message);
      setLoading(false);
      return;
    }

    if (aliasError) {
      alert("Error cargando apartamento_banco_alias: " + aliasError.message);
      setLoading(false);
      return;
    }

    compararDatos(bancoData || [], aliasData || []);
    setLoading(false);
  }

  function limpiarTexto(texto: string) {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compararDatos(bancoRows: BancoRow[], aliasRows: AliasRow[]) {
    const resultadoComparado = bancoRows.map((item) => {
      const descripcionBanco = limpiarTexto(item.descripcion || "");

      const encontrado = aliasRows.find((a) => {
        const aliasTexto = limpiarTexto(a.descripcion_banco || "");
        return (
          descripcionBanco.includes(aliasTexto) ||
          aliasTexto.includes(descripcionBanco)
        );
      });

      if (encontrado) {
        return {
          ...item,
          apartamento_identificado: encontrado.no_apartamento,
          estado: "Identificado",
        };
      }

      return {
        ...item,
        apartamento_identificado: "Pendiente",
        estado: "Revisar",
      };
    });

    setResultado(resultadoComparado);
  }

  async function guardarPagosIdentificados() {
    const pagos = resultado
      .filter(
        (r) =>
          r.estado === "Identificado" &&
          r.apartamento_identificado &&
          r.apartamento_identificado !== "Pendiente"
      )
      .map((r) => ({
        archivo_banco_id: r.id,
        no_apartamento: r.apartamento_identificado,
        fecha_posteo: r.fecha_posteo,
        monto_transaccion: r.monto_transaccion,
        no_serial: r.no_serial,
        descripcion_banco: r.descripcion,
        estado: "identificado",
      }));

    if (pagos.length === 0) {
      alert("No hay pagos identificados para guardar.");
      return;
    }

    const confirmar = confirm(
      `Se procesarán ${pagos.length} pagos identificados. Si alguno ya existe, no se duplicará. ¿Desea continuar?`
    );

    if (!confirmar) return;

    setGuardando(true);

    const { error } = await supabase
      .from("pagos_identificados")
      .upsert(pagos, { onConflict: "archivo_banco_id" });

    setGuardando(false);

    if (error) {
      console.error(error);
      alert("Error al guardar pagos identificados: " + error.message);
      return;
    }

    alert("Pagos identificados guardados correctamente, sin duplicados.");
  }

  const identificados = resultado.filter(
    (r) => r.estado === "Identificado"
  ).length;

  const pendientes = resultado.filter((r) => r.estado === "Revisar").length;

  if (loading) {
    return <div className="p-6">Cargando datos...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Identificación Automática de Pagos
          </h1>
          <p className="text-gray-600">
            Comparación entre el archivo del banco y los alias de apartamentos.
          </p>
        </div>

        <button
          onClick={guardarPagosIdentificados}
          disabled={guardando}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar pagos identificados"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-gray-500">Total transacciones</p>
          <h2 className="text-2xl font-bold">{resultado.length}</h2>
        </div>

        <div className="border rounded-lg p-4 bg-white">
          <p className="text-gray-500">Identificadas</p>
          <h2 className="text-2xl font-bold text-green-700">
            {identificados}
          </h2>
        </div>

        <div className="border rounded-lg p-4 bg-white">
          <p className="text-gray-500">Pendientes</p>
          <h2 className="text-2xl font-bold text-red-700">{pendientes}</h2>
        </div>
      </div>

      <div className="overflow-auto border rounded-lg bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Fecha</th>
              <th className="p-2 border">Monto</th>
              <th className="p-2 border">No Serial</th>
              <th className="p-2 border">Descripción Banco</th>
              <th className="p-2 border">Apartamento</th>
              <th className="p-2 border">Estado</th>
            </tr>
          </thead>

          <tbody>
            {resultado.map((r) => (
              <tr key={r.id}>
                <td className="p-2 border">{r.fecha_posteo}</td>

                <td className="p-2 border text-right">
                  RD$
                  {Number(r.monto_transaccion).toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </td>

                <td className="p-2 border">{r.no_serial}</td>
                <td className="p-2 border">{r.descripcion}</td>

                <td className="p-2 border font-semibold">
                  {r.apartamento_identificado}
                </td>

                <td
                  className={`p-2 border font-semibold ${
                    r.estado === "Identificado"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {r.estado}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}