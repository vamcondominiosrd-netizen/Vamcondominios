"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type CatalogoItem = {
  id: number;
  condominio_id: number;
  condominio: string;
  nombre: string;
  descripcion: string;
  estado: string;
  created_at: string;
};

type TipoCatalogo = "cargo" | "departamento" | "contrato";

export default function CatalogosRHPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [cargos, setCargos] = useState<CatalogoItem[]>([]);
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([]);
  const [contratos, setContratos] = useState<CatalogoItem[]>([]);

  const [tipoActivo, setTipoActivo] = useState<TipoCatalogo>("cargo");
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("Activo");

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreCondominio = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombreCondominio);

    if (id) {
      cargarCatalogos(id);
    }
  }, []);

  function obtenerTabla(tipo: TipoCatalogo) {
    if (tipo === "cargo") return "rh_cargos";
    if (tipo === "departamento") return "rh_departamentos";
    return "rh_tipos_contrato";
  }

  function obtenerTitulo(tipo: TipoCatalogo) {
    if (tipo === "cargo") return "Cargo / Puesto";
    if (tipo === "departamento") return "Departamento";
    return "Tipo de Contrato";
  }

  function obtenerListaActual() {
    if (tipoActivo === "cargo") return cargos;
    if (tipoActivo === "departamento") return departamentos;
    return contratos;
  }

  async function cargarCatalogos(id: string) {
    setLoading(true);

    const [cargosResp, departamentosResp, contratosResp] = await Promise.all([
      supabase
        .from("rh_cargos")
        .select("*")
        .eq("condominio_id", Number(id))
        .order("nombre", { ascending: true }),

      supabase
        .from("rh_departamentos")
        .select("*")
        .eq("condominio_id", Number(id))
        .order("nombre", { ascending: true }),

      supabase
        .from("rh_tipos_contrato")
        .select("*")
        .eq("condominio_id", Number(id))
        .order("nombre", { ascending: true }),
    ]);

    setLoading(false);

    if (cargosResp.error) {
      alert("Error cargando cargos: " + cargosResp.error.message);
      return;
    }

    if (departamentosResp.error) {
      alert("Error cargando departamentos: " + departamentosResp.error.message);
      return;
    }

    if (contratosResp.error) {
      alert("Error cargando tipos de contrato: " + contratosResp.error.message);
      return;
    }

    setCargos(cargosResp.data || []);
    setDepartamentos(departamentosResp.data || []);
    setContratos(contratosResp.data || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setDescripcion("");
    setEstado("Activo");
  }

  function cambiarTipo(tipo: TipoCatalogo) {
    setTipoActivo(tipo);
    limpiarFormulario();
  }

  function editarItem(item: CatalogoItem) {
    setEditandoId(item.id);
    setNombre(item.nombre || "");
    setDescripcion(item.descripcion || "");
    setEstado(item.estado || "Activo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarItem(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (!nombre.trim()) {
      alert("Debe indicar el nombre.");
      return;
    }

    setGuardando(true);

    const tabla = obtenerTabla(tipoActivo);

    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      estado,
    };

    if (editandoId) {
      const { error } = await supabase
        .from(tabla)
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando registro: " + error.message);
        return;
      }

      alert("Registro modificado correctamente.");
      limpiarFormulario();
      cargarCatalogos(condominioId);
      return;
    }

    const { error } = await supabase.from(tabla).insert([registro]);

    setGuardando(false);

    if (error) {
      alert("Error guardando registro: " + error.message);
      return;
    }

    alert("Registro guardado correctamente.");
    limpiarFormulario();
    cargarCatalogos(condominioId);
  }

  async function eliminarItem(item: CatalogoItem) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar "${item.nombre}"?`
    );

    if (!confirmar) return;

    const tabla = obtenerTabla(tipoActivo);

    const { error } = await supabase
      .from(tabla)
      .delete()
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando registro: " + error.message);
      return;
    }

    alert("Registro eliminado correctamente.");
    cargarCatalogos(condominioId);
  }

  const listaActual = obtenerListaActual();

  const activos = listaActual.filter((i) => i.estado === "Activo").length;
  const inactivos = listaActual.filter((i) => i.estado === "Inactivo").length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Cargos y Puestos RH
        </h1>

        <p className="text-slate-500 mt-2">
          Catálogos base para cargos, departamentos y tipos de contrato del
          personal del condominio.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => cambiarTipo("cargo")}
          className={`rounded-2xl p-5 border text-left shadow-sm ${
            tipoActivo === "cargo"
              ? "bg-blue-700 text-white border-blue-700"
              : "bg-white text-slate-900"
          }`}
        >
          <p className="text-sm opacity-80">Catálogo</p>
          <h2 className="text-xl font-black">Cargos / Puestos</h2>
          <p className="text-sm mt-1 opacity-80">{cargos.length} registros</p>
        </button>

        <button
          onClick={() => cambiarTipo("departamento")}
          className={`rounded-2xl p-5 border text-left shadow-sm ${
            tipoActivo === "departamento"
              ? "bg-blue-700 text-white border-blue-700"
              : "bg-white text-slate-900"
          }`}
        >
          <p className="text-sm opacity-80">Catálogo</p>
          <h2 className="text-xl font-black">Departamentos</h2>
          <p className="text-sm mt-1 opacity-80">
            {departamentos.length} registros
          </p>
        </button>

        <button
          onClick={() => cambiarTipo("contrato")}
          className={`rounded-2xl p-5 border text-left shadow-sm ${
            tipoActivo === "contrato"
              ? "bg-blue-700 text-white border-blue-700"
              : "bg-white text-slate-900"
          }`}
        >
          <p className="text-sm opacity-80">Catálogo</p>
          <h2 className="text-xl font-black">Tipos de Contrato</h2>
          <p className="text-sm mt-1 opacity-80">
            {contratos.length} registros
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total registros</p>
          <h2 className="text-3xl font-black">{listaActual.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Activos</p>
          <h2 className="text-3xl font-black text-green-700">{activos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Inactivos</p>
          <h2 className="text-3xl font-black text-red-700">{inactivos}</h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar" : "Registrar"} {obtenerTitulo(tipoActivo)}
        </h2>

        <form
          onSubmit={guardarItem}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2 bg-slate-50 border rounded-xl px-4 py-3">
            <label className="block text-sm font-semibold mb-1">
              Condominio
            </label>
            <p className="font-semibold text-slate-800">{condominioNombre}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Nombre *
            </label>

            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder={
                tipoActivo === "cargo"
                  ? "Ejemplo: Conserje"
                  : tipoActivo === "departamento"
                  ? "Ejemplo: Seguridad"
                  : "Ejemplo: Contrato fijo"
              }
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

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Descripción, funciones o detalles adicionales"
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
                : "Guardar registro"}
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

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="text-xl font-black">
            Listado de {obtenerTitulo(tipoActivo)}
          </h2>
        </div>

        {loading ? (
          <div className="p-6">Cargando catálogos...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Nombre</th>
                  <th className="p-3 border text-left">Descripción</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {listaActual.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-bold">{item.nombre}</td>

                    <td className="p-3 border">
                      {item.descripcion || "-"}
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
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => editarItem(item)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => eliminarItem(item)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {listaActual.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={4}>
                      No hay registros para este catálogo.
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