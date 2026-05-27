"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

type CategoriaGasto = {
  id: number;
  nombre_categoria: string;
  descripcion: string;
  estado: string;
  created_at: string;
};

export default function CategoriasGastosPage() {
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [loading, setLoading] = useState(false);

  const [nombreCategoria, setNombreCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    cargarCategorias();
  }, []);

  async function cargarCategorias() {
    setLoading(true);

    const { data, error } = await supabase
      .from("catalogo_categoria_gastos")
      .select("id, nombre_categoria, descripcion, estado, created_at")
      .order("nombre_categoria", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando categorías: " + error.message);
      return;
    }

    setCategorias(data || []);
  }

  async function guardarCategoria(e: React.FormEvent) {
    e.preventDefault();

    if (!nombreCategoria) {
      alert("Debe completar el nombre de la categoría.");
      return;
    }

    const { error } = await supabase.from("catalogo_categoria_gastos").insert([
      {
        nombre_categoria: nombreCategoria,
        descripcion,
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

    cargarCategorias();
  }

  const categoriasFiltradas = categorias.filter((c) => {
    const texto = `${c.nombre_categoria} ${c.descripcion}`.toLowerCase();
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
      Categoría: c.nombre_categoria,
      Descripción: c.descripcion,
      Estado: c.estado,
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [{ wch: 30 }, { wch: 50 }, { wch: 15 }];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Categorias Gastos");

    XLSX.writeFile(libro, "Catalogo_Categorias_Gastos.xlsx");
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
    const confirmar = confirm(
      "Se cargarán categorías sugeridas al catálogo. ¿Desea continuar?"
    );

    if (!confirmar) return;

    const registros = categoriasSugeridas.map((nombre) => ({
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
    cargarCategorias();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Categorías de Gastos</h1>
          <p className="text-slate-500">
            Catálogo para clasificar los gastos del condominio.
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total categorías</p>
          <h2 className="text-2xl font-bold">{categoriasFiltradas.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Categorías activas</p>
          <h2 className="text-2xl font-bold text-green-700">
            {totalActivas}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Estado del catálogo</p>
          <h2 className="text-2xl font-bold text-blue-700">Activo</h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
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

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Listado de categorías</h2>
            <p className="text-sm text-slate-500">
              Puede buscar por nombre o descripción.
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
                  <th className="p-2 border">Categoría</th>
                  <th className="p-2 border">Descripción</th>
                  <th className="p-2 border">Estado</th>
                </tr>
              </thead>

              <tbody>
                {categoriasFiltradas.map((c) => (
                  <tr key={c.id}>
                    <td className="p-2 border font-semibold">
                      {c.nombre_categoria}
                    </td>
                    <td className="p-2 border">{c.descripcion}</td>
                    <td className="p-2 border text-green-700 font-semibold">
                      {c.estado}
                    </td>
                  </tr>
                ))}

                {categoriasFiltradas.length === 0 && (
                  <tr>
                    <td className="p-4 border text-center" colSpan={3}>
                      No hay categorías registradas.
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