"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

type CategoriaGasto = {
  id: number;
  condominio_id: number | null;
  nombre_categoria: string;
  descripcion: string | null;
  estado: string;
  created_at: string;
};

export default function CategoriasGastosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [loading, setLoading] = useState(false);

  const [nombreCategoria, setNombreCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarCategorias(id);
  }, []);

  async function cargarCategorias(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("catalogo_categoria_gastos")
      .select(
        "id, condominio_id, nombre_categoria, descripcion, estado, created_at"
      )
      .eq("condominio_id", Number(id))
      .order("nombre_categoria", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando categorías: " + error.message);
      return;
    }

    setCategorias((data as CategoriaGasto[]) || []);
  }

  async function guardarCategoria(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!nombreCategoria.trim()) {
      alert("Debe completar el nombre de la categoría.");
      return;
    }

    const { error } = await supabase.from("catalogo_categoria_gastos").insert([
      {
        condominio_id: Number(condominioId),
        nombre_categoria: nombreCategoria.trim(),
        descripcion: descripcion.trim() || null,
        estado: "activo",
      },
    ]);

    if (error) {
      alert("Error guardando categoría: " + error.message);
      return;
    }

    alert("Categoría registrada correctamente.");

    setNombreCategoria("");
    setDescripcion("");

    cargarCategorias(condominioId);
  }

  async function cambiarEstado(categoria: CategoriaGasto) {
    if (!condominioId) return;

    const nuevoEstado = categoria.estado === "activo" ? "inactivo" : "activo";

    const confirmar = confirm(
      `¿Desea cambiar la categoría "${categoria.nombre_categoria}" a ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("catalogo_categoria_gastos")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", categoria.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando categoría: " + error.message);
      return;
    }

    cargarCategorias(condominioId);
  }

  async function borrarCategoria(categoria: CategoriaGasto) {
    if (!condominioId) return;

    const confirmar = confirm(
      `¿Seguro que desea borrar la categoría "${categoria.nombre_categoria}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("catalogo_categoria_gastos")
      .delete()
      .eq("id", categoria.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error borrando categoría: " + error.message);
      return;
    }

    alert("Categoría borrada correctamente.");
    cargarCategorias(condominioId);
  }

  const categoriasFiltradas = categorias.filter((c) => {
    const texto = `${c.nombre_categoria || ""} ${c.descripcion || ""}`.toLowerCase();
    return texto.includes(buscar.toLowerCase());
  });

  const totalActivas = categoriasFiltradas.filter(
    (c) => c.estado === "activo"
  ).length;

  function exportarExcel() {
    if (categoriasFiltradas.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = categoriasFiltradas.map((c) => ({
      Condominio: condominioNombre,
      Categoría: c.nombre_categoria,
      Descripción: c.descripcion || "",
      Estado: c.estado,
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [
      { wch: 35 },
      { wch: 30 },
      { wch: 50 },
      { wch: 15 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Categorias Gastos");

    XLSX.writeFile(
      libro,
      `Catalogo_Categorias_Gastos_${condominioNombre || condominioId}.xlsx`
    );
  }

  const categoriasSugeridas = [
    "Limpieza",
    "Seguridad",
    "Electricidad",
    "Agua",
    "Mantenimiento",
    "Reparaciones",
    "Jardinería",
    "Pintura",
    "Fumigación",
    "Materiales",
    "Servicios profesionales",
    "Equipos",
    "Herramientas",
    "Plomería",
    "Cerrajería",
    "Ascensores",
    "Planta eléctrica",
    "Bombas de agua",
    "Otros",
  ];

  async function cargarCategoriasSugeridas() {
    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    const confirmar = confirm(
      `Se cargarán categorías sugeridas solamente para el condominio activo:\n\n${condominioNombre}\n\n¿Desea continuar?`
    );

    if (!confirmar) return;

    const registros = categoriasSugeridas.map((nombre) => ({
      condominio_id: Number(condominioId),
      nombre_categoria: nombre,
      descripcion: `Categoría para gastos de ${nombre.toLowerCase()}.`,
      estado: "activo",
    }));

    const { error } = await supabase
      .from("catalogo_categoria_gastos")
      .insert(registros);

    if (error) {
      alert("Error cargando categorías sugeridas: " + error.message);
      return;
    }

    alert("Categorías sugeridas cargadas correctamente.");
    cargarCategorias(condominioId);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Categorías de Gastos</h1>

            <p className="text-slate-500 mt-1">
              Catálogo para clasificar los gastos del condominio activo.
            </p>

            <p className="text-sm text-blue-700 font-bold mt-2">
              Condominio activo: {condominioNombre || "No seleccionado"}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={cargarCategoriasSugeridas}
              className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
            >
              Cargar sugeridas
            </button>

            <button
              onClick={exportarExcel}
              className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
            >
              Exportar a Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total categorías</p>
          <h2 className="text-2xl font-bold">{categoriasFiltradas.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Categorías activas</p>
          <h2 className="text-2xl font-bold text-green-700">{totalActivas}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Condominio ID</p>
          <h2 className="text-2xl font-bold text-blue-700">
            {condominioId || "-"}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Registrar categoría</h2>

        <form
          onSubmit={guardarCategoria}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Nombre de la categoría *
            </label>

            <input
              type="text"
              value={nombreCategoria}
              onChange={(e) => setNombreCategoria(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Ej. Limpieza, Seguridad, Electricidad"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Descripción
            </label>

            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Detalle o uso de la categoría"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800"
            >
              Guardar categoría
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Listado de categorías</h2>

            <p className="text-sm text-slate-500">
              Mostrando solamente categorías del condominio activo.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full md:w-80"
              placeholder="Buscar categoría..."
            />
          </div>
        </div>

        {loading ? (
          <p>Cargando categorías...</p>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border text-left">Categoría</th>
                  <th className="p-2 border text-left">Descripción</th>
                  <th className="p-2 border text-center">Estado</th>
                  <th className="p-2 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {categoriasFiltradas.map((c) => (
                  <tr key={c.id}>
                    <td className="p-2 border font-semibold">
                      {c.nombre_categoria}
                    </td>

                    <td className="p-2 border">{c.descripcion || "-"}</td>

                    <td className="p-2 border text-center">
                      <span
                        className={
                          c.estado === "activo"
                            ? "bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"
                            : "bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"
                        }
                      >
                        {c.estado}
                      </span>
                    </td>

                    <td className="p-2 border text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => cambiarEstado(c)}
                          className="bg-slate-700 text-white px-3 py-1 rounded-lg text-xs hover:bg-slate-800"
                        >
                          {c.estado === "activo" ? "Inactivar" : "Activar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => borrarCategoria(c)}
                          className="bg-red-700 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-800"
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {categoriasFiltradas.length === 0 && (
                  <tr>
                    <td className="p-4 border text-center" colSpan={4}>
                      No hay categorías registradas para este condominio.
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