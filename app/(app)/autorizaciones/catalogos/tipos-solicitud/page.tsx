"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, ArrowLeft, ClipboardList } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type TipoSolicitud = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

export default function TiposSolicitudPage() {
  const [tipos, setTipos] = useState<TipoSolicitud[]>([]);
  const [loading, setLoading] = useState(true);

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  async function cargarTipos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("autorizaciones_tipos_solicitud")
      .select("id, codigo, nombre, descripcion, activo")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando tipos:", error);
      alert("Error cargando tipos de solicitud");
    } else {
      setTipos(data || []);
    }

    setLoading(false);
  }

  async function guardarTipo(e: React.FormEvent) {
    e.preventDefault();

    if (!codigo.trim() || !nombre.trim()) {
      alert("Debe completar código y nombre");
      return;
    }

    const { error } = await supabase
      .from("autorizaciones_tipos_solicitud")
      .insert({
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        activo: true,
      });

    if (error) {
      console.error("Error guardando tipo:", error);
      alert("Error guardando tipo de solicitud");
      return;
    }

    setCodigo("");
    setNombre("");
    setDescripcion("");
    await cargarTipos();
  }

  async function cambiarEstado(id: number, activo: boolean) {
    const { error } = await supabase
      .from("autorizaciones_tipos_solicitud")
      .update({ activo: !activo })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando estado:", error);
      alert("Error actualizando estado");
      return;
    }

    await cargarTipos();
  }

  useEffect(() => {
    cargarTipos();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/autorizaciones"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al módulo
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              Tipos de Solicitud
            </h1>
            <p className="text-sm text-slate-500">
              Catálogo para trabajo, mudanza, entrada de servicio, entrega,
              retiro y otros permisos.
            </p>
          </div>

          <button
            onClick={cargarTipos}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </button>
        </div>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                Nuevo tipo de solicitud
              </h2>
              <p className="text-sm text-slate-500">
                Agrega nuevos tipos según la necesidad del condominio.
              </p>
            </div>
          </div>

          <form
            onSubmit={guardarTipo}
            className="grid gap-4 md:grid-cols-4"
          >
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Código
              </label>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: VISITA"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Nombre
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Visita autorizada"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Descripción
              </label>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Opcional"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-800"
              >
                Guardar
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Listado de tipos
                </h2>
                <p className="text-sm text-slate-500">
                  Total registrados: {tipos.length}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Descripción</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      Cargando tipos de solicitud...
                    </td>
                  </tr>
                ) : tipos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      No hay tipos registrados.
                    </td>
                  </tr>
                ) : (
                  tipos.map((tipo) => (
                    <tr key={tipo.id} className="border-t">
                      <td className="px-5 py-3 font-medium text-slate-700">
                        {tipo.id}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {tipo.codigo}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {tipo.nombre}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {tipo.descripcion || "-"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            tipo.activo
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {tipo.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => cambiarEstado(tipo.id, tipo.activo)}
                          className="rounded-xl border px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {tipo.activo ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}