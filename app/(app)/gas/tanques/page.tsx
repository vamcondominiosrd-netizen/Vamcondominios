"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type GasTanque = {
  id: number;
  condominio_id: number;
  nombre: string;
  descripcion: string | null;
  capacidad_estimada: number | null;
  estado: string | null;
  created_at: string | null;
};

export default function GasTanquesPage() {
  const [tanques, setTanques] = useState<GasTanque[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [capacidadEstimada, setCapacidadEstimada] = useState("");
  const [estado, setEstado] = useState("Activo");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreCondominio = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombreCondominio);

    if (!id) {
      setMensaje("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarTanques(id);
  }, []);

  async function cargarTanques(id: string) {
    if (!id) return;

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("gas_tanques")
      .select(
        "id, condominio_id, nombre, descripcion, capacidad_estimada, estado, created_at"
      )
      .eq("condominio_id", Number(id))
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje("Error cargando tanques: " + error.message);
      setLoading(false);
      return;
    }

    setTanques((data as GasTanque[]) || []);
    setLoading(false);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setDescripcion("");
    setCapacidadEstimada("");
    setEstado("Activo");
  }

  function editarTanque(tanque: GasTanque) {
    setEditandoId(tanque.id);
    setNombre(tanque.nombre || "");
    setDescripcion(tanque.descripcion || "");
    setCapacidadEstimada(
      tanque.capacidad_estimada ? String(tanque.capacidad_estimada) : ""
    );
    setEstado(tanque.estado || "Activo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarTanque(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    const nombreFinal = nombre.trim();
    const descripcionFinal = descripcion.trim();
    const capacidadFinal = Number(capacidadEstimada || 0);

    if (!nombreFinal) {
      alert("Debe indicar el nombre o ubicación del tanque.");
      return;
    }

    setLoading(true);
    setMensaje("");

    if (editandoId) {
      const { error } = await supabase
        .from("gas_tanques")
        .update({
          nombre: nombreFinal,
          descripcion: descripcionFinal || null,
          capacidad_estimada: capacidadFinal,
          estado,
        })
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      if (error) {
        alert("Error actualizando tanque: " + error.message);
        setLoading(false);
        return;
      }

      alert("Tanque actualizado correctamente.");
    } else {
      const { error } = await supabase.from("gas_tanques").insert([
        {
          condominio_id: Number(condominioId),
          nombre: nombreFinal,
          descripcion: descripcionFinal || null,
          capacidad_estimada: capacidadFinal,
          estado,
        },
      ]);

      if (error) {
        alert("Error creando tanque: " + error.message);
        setLoading(false);
        return;
      }

      alert("Tanque creado correctamente.");
    }

    limpiarFormulario();
    await cargarTanques(condominioId);
    setLoading(false);
  }

  async function cambiarEstado(tanque: GasTanque) {
    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    const nuevoEstado = tanque.estado === "Activo" ? "Inactivo" : "Activo";

    const confirmar = confirm(
      `¿Desea cambiar "${tanque.nombre}" a estado ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("gas_tanques")
      .update({ estado: nuevoEstado })
      .eq("id", tanque.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error cambiando estado: " + error.message);
      return;
    }

    cargarTanques(condominioId);
  }

  const tanquesFiltrados = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    if (!texto) return tanques;

    return tanques.filter((t) => {
      const cadena = `${t.nombre || ""} ${t.descripcion || ""} ${
        t.estado || ""
      }`.toLowerCase();

      return cadena.includes(texto);
    });
  }, [tanques, buscar]);

  const totalActivos = tanques.filter((t) => t.estado === "Activo").length;
  const totalInactivos = tanques.filter((t) => t.estado !== "Activo").length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Módulo de Gas
              </p>

              <h1 className="text-3xl font-black text-slate-900 mt-1">
                Ubicación de Tanques
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Catálogo de tanques o áreas donde se recibe el gas del
                condominio. Cada tanque pertenece al condominio activo.
              </p>

              <p className="text-sm text-blue-700 font-bold mt-3">
                Condominio activo: {condominioNombre || "No seleccionado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/gas"
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Volver a Gas
              </Link>

              <button
                type="button"
                onClick={() => cargarTanques(condominioId)}
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

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Total tanques</p>
            <h2 className="text-3xl font-black text-slate-900">
              {tanques.length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Activos</p>
            <h2 className="text-3xl font-black text-green-700">
              {totalActivos}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Inactivos</p>
            <h2 className="text-3xl font-black text-red-700">
              {totalInactivos}
            </h2>
          </div>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">
            {editandoId ? "Editar tanque / ubicación" : "Nuevo tanque / ubicación"}
          </h2>

          <form
            onSubmit={guardarTanque}
            className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
          >
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">
                Nombre / ubicación
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Ej. Tanque Edificio A-B"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Capacidad estimada
              </label>
              <input
                type="number"
                value={capacidadEstimada}
                onChange={(e) => setCapacidadEstimada(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Ej. 500"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-60"
              >
                {editandoId ? "Actualizar" : "Guardar"}
              </button>

              {editandoId && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 border px-5 py-3 rounded-xl font-bold"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="md:col-span-5">
              <label className="block text-sm font-semibold mb-1">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                rows={3}
                placeholder="Ej. Tanque ubicado próximo al edificio A-B, acceso por el parqueo lateral."
              />
            </div>
          </form>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Listado de tanques
              </h2>
              <p className="text-sm text-slate-500">
                Estas ubicaciones aparecerán al registrar una recepción de gas.
              </p>
            </div>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full md:w-80"
              placeholder="Buscar tanque..."
            />
          </div>

          <div className="overflow-auto border rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">ID</th>
                  <th className="p-3 border text-left">Ubicación</th>
                  <th className="p-3 border text-left">Descripción</th>
                  <th className="p-3 border text-right">Capacidad</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {tanquesFiltrados.map((tanque) => (
                  <tr key={tanque.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-bold">{tanque.id}</td>

                    <td className="p-3 border font-semibold">
                      {tanque.nombre}
                    </td>

                    <td className="p-3 border">
                      {tanque.descripcion || "-"}
                    </td>

                    <td className="p-3 border text-right">
                      {Number(tanque.capacidad_estimada || 0).toLocaleString(
                        "es-DO",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          tanque.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {tanque.estado || "Sin estado"}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => editarTanque(tanque)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => cambiarEstado(tanque)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                        >
                          {tanque.estado === "Activo"
                            ? "Inactivar"
                            : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {tanquesFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-6 border text-center text-slate-500"
                    >
                      No hay tanques registrados para este condominio.
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