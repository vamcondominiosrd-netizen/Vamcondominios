"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";
import NominaMenu from "../NominaMenu";

type TipoDescuento = {
  id: number;
  condominio_id: number;
  condominio: string;
  nombre: string;
  descripcion: string;
  aplica_recurrente: boolean;
  estado: string;
  created_at: string;
};

export default function CatalogoDescuentosNominaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [descuentos, setDescuentos] = useState<TipoDescuento[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [aplicaRecurrente, setAplicaRecurrente] = useState(false);
  const [estado, setEstado] = useState("Activo");

  const [filtroEstado, setFiltroEstado] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreCondominio = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombreCondominio);

    if (id) {
      cargarDescuentos(id);
    }
  }, []);

  async function cargarDescuentos(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("rh_tipos_descuentos_nomina")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("nombre", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando catálogo de descuentos: " + error.message);
      return;
    }

    setDescuentos((data as TipoDescuento[]) || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setDescripcion("");
    setAplicaRecurrente(false);
    setEstado("Activo");
  }

  function editarDescuento(descuento: TipoDescuento) {
    setEditandoId(descuento.id);
    setNombre(descuento.nombre || "");
    setDescripcion(descuento.descripcion || "");
    setAplicaRecurrente(Boolean(descuento.aplica_recurrente));
    setEstado(descuento.estado || "Activo");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarDescuento(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!nombre.trim()) {
      alert("Debe indicar el nombre del descuento.");
      return;
    }

    const existe = descuentos.find(
      (item) =>
        item.nombre.trim().toLowerCase() === nombre.trim().toLowerCase() &&
        item.id !== editandoId
    );

    if (existe) {
      alert("Ya existe un descuento con ese nombre.");
      return;
    }

    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      aplica_recurrente: aplicaRecurrente,
      estado,
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("rh_tipos_descuentos_nomina")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando descuento: " + error.message);
        return;
      }

      alert("Descuento modificado correctamente.");
      limpiarFormulario();
      cargarDescuentos(condominioId);
      return;
    }

    const { error } = await supabase
      .from("rh_tipos_descuentos_nomina")
      .insert([registro]);

    setGuardando(false);

    if (error) {
      alert("Error guardando descuento: " + error.message);
      return;
    }

    alert("Descuento registrado correctamente.");
    limpiarFormulario();
    cargarDescuentos(condominioId);
  }

  async function cambiarEstado(descuento: TipoDescuento, nuevoEstado: string) {
    const confirmar = confirm(
      `¿Desea cambiar este descuento a "${nuevoEstado}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_tipos_descuentos_nomina")
      .update({ estado: nuevoEstado })
      .eq("id", descuento.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    alert("Estado actualizado correctamente.");
    cargarDescuentos(condominioId);
  }

  async function eliminarDescuento(descuento: TipoDescuento) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar el descuento "${descuento.nombre}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_tipos_descuentos_nomina")
      .delete()
      .eq("id", descuento.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando descuento: " + error.message);
      return;
    }

    alert("Descuento eliminado correctamente.");
    cargarDescuentos(condominioId);
  }

  const descuentosFiltrados = descuentos.filter((item) => {
    if (filtroEstado === "Todos") return true;
    return item.estado === filtroEstado;
  });

  const activos = descuentos.filter((item) => item.estado === "Activo").length;
  const inactivos = descuentos.filter(
    (item) => item.estado === "Inactivo"
  ).length;
  const recurrentes = descuentos.filter((item) => item.aplica_recurrente).length;

  return (
    <div className="space-y-6">
      <NominaMenu />

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Catálogo de Descuentos
        </h1>

        <p className="text-slate-500 mt-2">
          Registra y administra los tipos de descuentos utilizados en la nómina.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total descuentos</p>
          <h2 className="text-3xl font-black">{descuentos.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Activos</p>
          <h2 className="text-3xl font-black text-green-700">{activos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Inactivos</p>
          <h2 className="text-3xl font-black text-red-700">{inactivos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Recurrentes</p>
          <h2 className="text-3xl font-black text-blue-700">{recurrentes}</h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar descuento" : "Registrar descuento"}
        </h2>

        <form
          onSubmit={guardarDescuento}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Nombre del descuento *
            </label>

            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Ej. Préstamo empleado"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 bg-slate-50 border rounded-xl px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aplicaRecurrente}
                onChange={(e) => setAplicaRecurrente(e.target.checked)}
                className="h-5 w-5"
              />

              <span className="font-semibold">
                Este descuento puede ser recurrente
              </span>
            </label>

            <p className="text-xs text-slate-500 mt-1">
              Ejemplo: préstamos, cooperativa, acuerdos de pago o descuentos
              periódicos.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Detalle o política de uso de este descuento"
            />
          </div>

          <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
            >
              {guardando
                ? "Guardando..."
                : editandoId
                ? "Guardar cambios"
                : "Guardar descuento"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-black">Listado de descuentos</h2>

            <p className="text-sm text-slate-500">
              Catálogo disponible para aplicar descuentos estructurados en la
              nómina.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-4 py-2 bg-white"
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div>Cargando descuentos...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Descuento</th>
                  <th className="p-3 border text-left">Descripción</th>
                  <th className="p-3 border text-center">Recurrente</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {descuentosFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 border">
                      <p className="font-bold">{item.nombre}</p>
                    </td>

                    <td className="p-3 border">{item.descripcion || "-"}</td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          item.aplica_recurrente
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.aplica_recurrente ? "Sí" : "No"}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          item.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.estado}
                      </span>
                    </td>

                    <td className="p-3 border">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => editarDescuento(item)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        {item.estado !== "Activo" ? (
                          <button
                            onClick={() => cambiarEstado(item, "Activo")}
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Activar
                          </button>
                        ) : (
                          <button
                            onClick={() => cambiarEstado(item, "Inactivo")}
                            className="bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Inactivar
                          </button>
                        )}

                        <button
                          onClick={() => eliminarDescuento(item)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {descuentosFiltrados.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={5}
                    >
                      No hay descuentos registrados.
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