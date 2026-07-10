"use client";

import { useEffect, useState } from "react";
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

    if (id) cargarDescuentos(id);
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
    const confirmar = confirm(`¿Desea cambiar este descuento a "${nuevoEstado}"?`);
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
  const inactivos = descuentos.filter((item) => item.estado === "Inactivo").length;
  const recurrentes = descuentos.filter((item) => item.aplica_recurrente).length;

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  const labelClass = "mb-1 block text-xs font-semibold text-slate-700";

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 pb-6">
      <NominaMenu />

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Catálogo de Descuentos
            </h1>
            <p className="text-sm text-slate-500">
              Tipos de descuentos utilizados en la nómina.
            </p>
          </div>

          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm">
            <span className="text-slate-500">Condominio: </span>
            <span className="font-bold text-slate-800">
              {condominioNombre || "No identificado"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Total</p>
          <h2 className="text-2xl font-black">{descuentos.length}</h2>
        </div>

        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Activos</p>
          <h2 className="text-2xl font-black text-green-700">{activos}</h2>
        </div>

        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Inactivos</p>
          <h2 className="text-2xl font-black text-red-700">{inactivos}</h2>
        </div>

        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Recurrentes</p>
          <h2 className="text-2xl font-black text-blue-700">{recurrentes}</h2>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-slate-900">
          {editandoId ? "Modificar descuento" : "Registrar descuento"}
        </h2>

        <form onSubmit={guardarDescuento} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Nombre del descuento *</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputClass}
                placeholder="Ej. Préstamo empleado"
              />
            </div>

            <div>
              <label className={labelClass}>Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className={`${inputClass} bg-white`}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Recurrente</label>
              <label className="flex h-[38px] cursor-pointer items-center gap-2 rounded-lg border bg-slate-50 px-3 text-sm">
                <input
                  type="checkbox"
                  checked={aplicaRecurrente}
                  onChange={(e) => setAplicaRecurrente(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="font-semibold text-slate-700">Sí aplica</span>
              </label>
            </div>
          </div>

          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={inputClass}
              rows={2}
              placeholder="Detalle o política de uso de este descuento"
            />
          </div>

          <div className="flex flex-col gap-2 md:flex-row">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
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
                className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Listado de descuentos
            </h2>
            <p className="text-sm text-slate-500">
              Catálogo disponible para aplicar descuentos estructurados.
            </p>
          </div>

          <div className="w-full md:w-48">
            <label className={labelClass}>Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Cargando descuentos...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2 text-left">Descuento</th>
                  <th className="border p-2 text-left">Descripción</th>
                  <th className="border p-2 text-center">Recurrente</th>
                  <th className="border p-2 text-center">Estado</th>
                  <th className="border p-2 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {descuentosFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="border p-2 font-bold">{item.nombre}</td>

                    <td className="border p-2">{item.descripcion || "-"}</td>

                    <td className="border p-2 text-center">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                          item.aplica_recurrente
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.aplica_recurrente ? "Sí" : "No"}
                      </span>
                    </td>

                    <td className="border p-2 text-center">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                          item.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.estado}
                      </span>
                    </td>

                    <td className="border p-2">
                      <div className="flex flex-wrap justify-center gap-1">
                        <button
                          onClick={() => editarDescuento(item)}
                          className="rounded bg-slate-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-slate-800"
                        >
                          Editar
                        </button>

                        {item.estado !== "Activo" ? (
                          <button
                            onClick={() => cambiarEstado(item, "Activo")}
                            className="rounded bg-green-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-green-800"
                          >
                            Activar
                          </button>
                        ) : (
                          <button
                            onClick={() => cambiarEstado(item, "Inactivo")}
                            className="rounded bg-yellow-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-yellow-800"
                          >
                            Inactivar
                          </button>
                        )}

                        <button
                          onClick={() => eliminarDescuento(item)}
                          className="rounded bg-red-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-800"
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
                      className="border p-4 text-center text-slate-500"
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