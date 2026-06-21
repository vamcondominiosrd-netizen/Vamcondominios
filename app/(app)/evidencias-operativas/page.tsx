"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type EvidenciaOperativa = {
  id: number;
  condominio_id: number;
  fecha: string;
  tipo_evidencia: string;
  descripcion: string | null;
  ubicacion: string | null;
  evidencia_url: string | null;
  tecnico_id: number | null;
  tecnico_nombre: string | null;
  estado: string;
  created_at: string | null;
};

export default function EvidenciasOperativasPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [evidencias, setEvidencias] = useState<EvidenciaOperativa[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const tipos = [
    "Limpieza",
    "Basura",
    "Bomba de agua",
    "Cisterna",
    "Tinacos",
    "Área común",
    "Portón",
    "Electricidad",
    "Parqueo",
    "Jardinería",
    "Seguridad",
    "Otro",
  ];

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarEvidencias(id);
  }, []);

  async function cargarEvidencias(id: string) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("evidencias_operativas")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("fecha", { ascending: false })
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando evidencias operativas: " + error.message);
      return;
    }

    setEvidencias((data as EvidenciaOperativa[]) || []);
  }

  function fechaDominicana(fechaValor?: string | null) {
    if (!fechaValor) return "-";

    const d = new Date(fechaValor);

    if (Number.isNaN(d.getTime())) return fechaValor;

    return d.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function colorEstado(estado?: string | null) {
    if (estado === "Registrado") return "bg-yellow-100 text-yellow-700";
    if (estado === "Revisado") return "bg-green-100 text-green-700";
    if (estado === "Anulado") return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-700";
  }

  async function cambiarEstado(evidencia: EvidenciaOperativa, nuevoEstado: string) {
    const confirmar = confirm(
      `¿Desea cambiar la evidencia #${evidencia.id} a estado ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("evidencias_operativas")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", evidencia.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando evidencia: " + error.message);
      return;
    }

    await cargarEvidencias(condominioId);
  }

  function limpiarFiltros() {
    setBuscar("");
    setFiltroEstado("TODOS");
    setFiltroTipo("TODOS");
    setFechaDesde("");
    setFechaHasta("");
  }

  const evidenciasFiltradas = useMemo(() => {
    let lista = evidencias;

    if (filtroEstado !== "TODOS") {
      lista = lista.filter((e) => e.estado === filtroEstado);
    }

    if (filtroTipo !== "TODOS") {
      lista = lista.filter((e) => e.tipo_evidencia === filtroTipo);
    }

    if (fechaDesde) {
      lista = lista.filter((e) => e.fecha >= fechaDesde);
    }

    if (fechaHasta) {
      lista = lista.filter((e) => e.fecha <= fechaHasta);
    }

    if (buscar.trim()) {
      const texto = buscar.toLowerCase().trim();

      lista = lista.filter((e) => {
        const cadena = `
          ${e.id || ""}
          ${e.fecha || ""}
          ${e.tipo_evidencia || ""}
          ${e.descripcion || ""}
          ${e.ubicacion || ""}
          ${e.tecnico_nombre || ""}
          ${e.estado || ""}
        `.toLowerCase();

        return cadena.includes(texto);
      });
    }

    return lista;
  }, [evidencias, filtroEstado, filtroTipo, fechaDesde, fechaHasta, buscar]);

  const totalRegistradas = evidencias.filter(
    (e) => e.estado === "Registrado"
  ).length;

  const totalRevisadas = evidencias.filter((e) => e.estado === "Revisado")
    .length;

  const totalAnuladas = evidencias.filter((e) => e.estado === "Anulado").length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-purple-700 uppercase tracking-wide">
                Operaciones
              </p>

              <h1 className="text-3xl font-black text-slate-900 mt-1">
                Evidencias Operativas
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Visualización de las fotos, reportes y evidencias registradas
                por los técnicos desde el celular.
              </p>

              <p className="text-sm text-blue-700 font-bold mt-3">
                Condominio activo: {condominioNombre || "No seleccionado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={() => cargarEvidencias(condominioId)}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Actualizar
              </button>
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-bold">
            {mensaje}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Total evidencias</p>
            <h2 className="text-3xl font-black text-slate-900">
              {evidencias.length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Registradas</p>
            <h2 className="text-3xl font-black text-yellow-700">
              {totalRegistradas}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Revisadas</p>
            <h2 className="text-3xl font-black text-green-700">
              {totalRevisadas}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Anuladas</p>
            <h2 className="text-3xl font-black text-red-700">
              {totalAnuladas}
            </h2>
          </div>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">
            Filtros
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">
                Buscar
              </label>
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Buscar por descripción, ubicación o técnico..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Tipo
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="TODOS">Todos</option>
                {tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="TODOS">Todos</option>
                <option value="Registrado">Registrado</option>
                <option value="Revisado">Revisado</option>
                <option value="Anulado">Anulado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="bg-slate-100 hover:bg-slate-200 border px-4 py-2 rounded-xl font-bold text-slate-700"
            >
              Limpiar filtros
            </button>
          </div>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Evidencias reportadas
              </h2>
              <p className="text-sm text-slate-500">
                Total mostrado: {evidenciasFiltradas.length}
              </p>
            </div>
          </div>

          <div className="overflow-auto border rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">ID</th>
                  <th className="p-3 border text-left">Fecha</th>
                  <th className="p-3 border text-left">Tipo</th>
                  <th className="p-3 border text-left">Ubicación</th>
                  <th className="p-3 border text-left">Descripción</th>
                  <th className="p-3 border text-left">Técnico</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Evidencia</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {evidenciasFiltradas.map((evidencia) => (
                  <tr key={evidencia.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-bold">
                      {evidencia.id}
                    </td>

                    <td className="p-3 border">
                      {fechaDominicana(evidencia.fecha)}
                    </td>

                    <td className="p-3 border">
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                        {evidencia.tipo_evidencia}
                      </span>
                    </td>

                    <td className="p-3 border">
                      {evidencia.ubicacion || "-"}
                    </td>

                    <td className="p-3 border max-w-md">
                      {evidencia.descripcion || "-"}
                    </td>

                    <td className="p-3 border">
                      {evidencia.tecnico_nombre || "-"}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${colorEstado(
                          evidencia.estado
                        )}`}
                      >
                        {evidencia.estado || "Registrado"}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      {evidencia.evidencia_url ? (
                        <a
                          href={evidencia.evidencia_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                        >
                          Ver evidencia
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          Sin archivo
                        </span>
                      )}
                    </td>

                    <td className="p-3 border text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        {evidencia.estado !== "Revisado" && (
                          <button
                            type="button"
                            onClick={() =>
                              cambiarEstado(evidencia, "Revisado")
                            }
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                          >
                            Revisado
                          </button>
                        )}

                        {evidencia.estado !== "Anulado" && (
                          <button
                            type="button"
                            onClick={() =>
                              cambiarEstado(evidencia, "Anulado")
                            }
                            className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                          >
                            Anular
                          </button>
                        )}

                        {evidencia.estado === "Anulado" && (
                          <button
                            type="button"
                            onClick={() =>
                              cambiarEstado(evidencia, "Registrado")
                            }
                            className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                          >
                            Restaurar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {evidenciasFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-6 border text-center text-slate-500"
                    >
                      No hay evidencias operativas para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}