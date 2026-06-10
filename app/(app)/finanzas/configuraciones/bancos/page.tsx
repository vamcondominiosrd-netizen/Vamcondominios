"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type BancoNombre = {
  id: number;
  nombre_banco: string;
  codigo: string | null;
  estado: string;
  orden: number | null;
  created_at: string | null;
};

export default function MantenimientoBancosPage() {
  const [bancos, setBancos] = useState<BancoNombre[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nombreBanco, setNombreBanco] = useState("");
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState("activo");
  const [orden, setOrden] = useState("");

  const [buscar, setBuscar] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarBancos();
  }, []);

  async function cargarBancos() {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("banco_nombre")
      .select("id, nombre_banco, codigo, estado, orden, created_at")
      .order("orden", { ascending: true })
      .order("nombre_banco", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando bancos: " + error.message);
      return;
    }

    setBancos((data as BancoNombre[]) || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombreBanco("");
    setCodigo("");
    setEstado("activo");
    setOrden("");
    setMensaje("");
  }

  function editarBanco(banco: BancoNombre) {
    setEditandoId(banco.id);
    setNombreBanco(banco.nombre_banco || "");
    setCodigo(banco.codigo || "");
    setEstado(banco.estado || "activo");
    setOrden(banco.orden !== null && banco.orden !== undefined ? String(banco.orden) : "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarBanco(e: React.FormEvent) {
    e.preventDefault();

    setMensaje("");

    if (!nombreBanco.trim()) {
      setMensaje("Debe indicar el nombre del banco.");
      return;
    }

    try {
      setGuardando(true);

      const registro = {
        nombre_banco: nombreBanco.trim(),
        codigo: codigo.trim() || null,
        estado,
        orden: orden ? Number(orden) : 0,
      };

      if (editandoId) {
        const { error } = await supabase
          .from("banco_nombre")
          .update(registro)
          .eq("id", editandoId);

        setGuardando(false);

        if (error) {
          setMensaje("Error modificando banco: " + error.message);
          return;
        }

        setMensaje("Banco modificado correctamente.");
      } else {
        const { error } = await supabase.from("banco_nombre").insert([registro]);

        setGuardando(false);

        if (error) {
          setMensaje("Error guardando banco: " + error.message);
          return;
        }

        setMensaje("Banco registrado correctamente.");
      }

      limpiarFormulario();
      cargarBancos();
    } catch (error: any) {
      setGuardando(false);
      setMensaje(error.message || "Error guardando banco.");
    }
  }

  async function cambiarEstadoBanco(banco: BancoNombre) {
    const nuevoEstado = banco.estado === "activo" ? "inactivo" : "activo";

    const confirmar = confirm(
      `¿Desea cambiar el banco "${banco.nombre_banco}" a estado ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("banco_nombre")
      .update({ estado: nuevoEstado })
      .eq("id", banco.id);

    if (error) {
      setMensaje("Error cambiando estado: " + error.message);
      return;
    }

    setMensaje("Estado actualizado correctamente.");
    cargarBancos();
  }

  async function borrarBanco(banco: BancoNombre) {
    const confirmar = confirm(
      `¿Seguro que desea borrar el banco "${banco.nombre_banco}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("banco_nombre")
      .delete()
      .eq("id", banco.id);

    if (error) {
      setMensaje(
        "No se pudo borrar el banco. Puede estar relacionado a pagos existentes. " +
          error.message
      );
      return;
    }

    setMensaje("Banco borrado correctamente.");
    cargarBancos();
  }

  const bancosFiltrados = useMemo(() => {
    const textoBuscar = buscar.toLowerCase().trim();

    if (!textoBuscar) return bancos;

    return bancos.filter((b) => {
      const texto = `${b.id || ""} ${b.nombre_banco || ""} ${b.codigo || ""} ${
        b.estado || ""
      } ${b.orden || ""}`.toLowerCase();

      return texto.includes(textoBuscar);
    });
  }, [bancos, buscar]);

  const totalActivos = bancos.filter((b) => b.estado === "activo").length;
  const totalInactivos = bancos.filter((b) => b.estado === "inactivo").length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-3xl font-black text-slate-900">
          Mantenimiento de Bancos
        </h1>

        <p className="text-slate-500 mt-2">
          Registro de instituciones bancarias que aparecerán en la aplicación móvil
          para que el propietario pueda seleccionar su banco.
        </p>
      </div>

      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Total bancos</p>
          <h2 className="text-3xl font-black text-slate-900">{bancos.length}</h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Activos</p>
          <h2 className="text-3xl font-black text-green-700">{totalActivos}</h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Inactivos</p>
          <h2 className="text-3xl font-black text-red-700">{totalInactivos}</h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar banco" : "Nuevo banco"}
        </h2>

        <form onSubmit={guardarBanco} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Nombre del banco
            </label>

            <input
              type="text"
              value={nombreBanco}
              onChange={(e) => setNombreBanco(e.target.value)}
              placeholder="Ejemplo: Banco Popular Dominicano"
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Código</label>

            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ejemplo: BPD"
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Orden</label>

            <input
              type="number"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              placeholder="1"
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div className="md:col-span-3 flex flex-wrap gap-2 items-end">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 text-white px-5 py-3 rounded-xl hover:bg-blue-800 disabled:bg-slate-400 font-bold"
            >
              {guardando
                ? "Guardando..."
                : editandoId
                ? "Guardar cambios"
                : "Guardar banco"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-slate-600 text-white px-5 py-3 rounded-xl hover:bg-slate-700 font-bold"
              >
                Cancelar
              </button>
            )}

            <button
              type="button"
              onClick={cargarBancos}
              className="bg-green-700 text-white px-5 py-3 rounded-xl hover:bg-green-800 font-bold"
            >
              Actualizar
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <label className="block text-sm font-semibold mb-1">Buscar banco</label>

        <input
          type="text"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar por nombre, código, estado u orden..."
          className="border rounded-xl px-4 py-3 w-full"
        />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-black">Bancos registrados</h2>

            <p className="text-sm text-slate-500">
              Solo los bancos activos se muestran en la aplicación móvil.
            </p>
          </div>

          <div className="text-lg font-black text-slate-700">
            {bancosFiltrados.length} registros
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">Cargando bancos...</p>
        ) : (
          <div className="overflow-auto border rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Orden</th>
                  <th className="p-3 border text-left">Banco</th>
                  <th className="p-3 border text-left">Código</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {bancosFiltrados.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-bold">{b.orden ?? 0}</td>

                    <td className="p-3 border">
                      <p className="font-semibold text-slate-800">
                        {b.nombre_banco}
                      </p>
                    </td>

                    <td className="p-3 border">{b.codigo || "-"}</td>

                    <td className="p-3 border text-center">
                      {b.estado === "activo" ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                          Activo
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                          Inactivo
                        </span>
                      )}
                    </td>

                    <td className="p-3 border text-center">
                      <div className="flex flex-wrap gap-2 justify-center">
                        <button
                          onClick={() => editarBanco(b)}
                          className="bg-slate-700 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-800"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => cambiarEstadoBanco(b)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold text-white ${
                            b.estado === "activo"
                              ? "bg-orange-600 hover:bg-orange-700"
                              : "bg-green-700 hover:bg-green-800"
                          }`}
                        >
                          {b.estado === "activo" ? "Inactivar" : "Activar"}
                        </button>

                        <button
                          onClick={() => borrarBanco(b)}
                          className="bg-red-700 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-800"
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {bancosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={5}>
                      No hay bancos registrados.
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