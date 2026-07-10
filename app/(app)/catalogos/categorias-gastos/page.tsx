"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FolderOpen,
  RefreshCw,
  Save,
  Search,
  Settings,
  WalletCards,
} from "lucide-react";
import * as XLSX from "xlsx";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type CategoriaGasto = {
  id: number;
  condominio_id: number | null;
  nombre_categoria: string | null;
  descripcion: string | null;
  estado: string | null;
  created_at: string | null;
};

function normalizarTexto(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  return String(valor).split("T")[0];
}

export default function CategoriasGastosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargandoSugeridas, setCargandoSugeridas] = useState(false);

  const [nombreCategoria, setNombreCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarCategorias(id);
  }, []);

  async function cargarCategorias(id = condominioId) {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("catalogo_categoria_gastos")
      .select(
        "id, condominio_id, nombre_categoria, descripcion, estado, created_at",
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

  function limpiarFormulario() {
    setNombreCategoria("");
    setDescripcion("");
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

    const existe = categorias.some(
      (c) => normalizarTexto(c.nombre_categoria) === normalizarTexto(nombreCategoria),
    );

    if (existe) {
      alert("Ya existe una categoría con ese nombre en este condominio.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("catalogo_categoria_gastos").insert([
      {
        condominio_id: Number(condominioId),
        nombre_categoria: nombreCategoria.trim(),
        descripcion: descripcion.trim() || null,
        estado: "activo",
      },
    ]);

    setGuardando(false);

    if (error) {
      alert("Error guardando categoría: " + error.message);
      return;
    }

    alert("Categoría registrada correctamente.");
    limpiarFormulario();
    cargarCategorias(condominioId);
  }

  async function cambiarEstado(categoria: CategoriaGasto) {
    if (!condominioId) return;

    const nuevoEstado = normalizarTexto(categoria.estado) === "activo" ? "inactivo" : "activo";

    const confirmar = confirm(
      `¿Desea cambiar la categoría "${categoria.nombre_categoria}" a ${nuevoEstado}?`,
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("catalogo_categoria_gastos")
      .update({ estado: nuevoEstado })
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
      `¿Seguro que desea borrar la categoría "${categoria.nombre_categoria}"?`,
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

  const categoriasFiltradas = useMemo(() => {
    const filtro = normalizarTexto(buscar);

    return categorias.filter((c) => {
      const texto = normalizarTexto(
        `${c.nombre_categoria || ""} ${c.descripcion || ""} ${c.estado || ""}`,
      );

      return !filtro || texto.includes(filtro);
    });
  }, [categorias, buscar]);

  const totalActivas = useMemo(
    () => categoriasFiltradas.filter((c) => normalizarTexto(c.estado) === "activo").length,
    [categoriasFiltradas],
  );

  const totalInactivas = categoriasFiltradas.length - totalActivas;

  function exportarExcel() {
    if (categoriasFiltradas.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = categoriasFiltradas.map((c) => ({
      Condominio: condominioNombre,
      Categoría: c.nombre_categoria || "",
      Descripción: c.descripcion || "",
      Estado: c.estado || "",
      "Fecha registro": fechaCorta(c.created_at),
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [
      { wch: 35 },
      { wch: 30 },
      { wch: 55 },
      { wch: 15 },
      { wch: 18 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Categorias Gastos");

    XLSX.writeFile(
      libro,
      `Catalogo_Categorias_Gastos_${(condominioNombre || condominioId).replaceAll(
        " ",
        "_",
      )}.xlsx`,
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

    const existentes = new Set(categorias.map((c) => normalizarTexto(c.nombre_categoria)));
    const sugeridasNuevas = categoriasSugeridas.filter(
      (nombre) => !existentes.has(normalizarTexto(nombre)),
    );

    if (sugeridasNuevas.length === 0) {
      alert("Todas las categorías sugeridas ya existen para este condominio.");
      return;
    }

    const confirmar = confirm(
      `Se cargarán ${sugeridasNuevas.length} categorías sugeridas solamente para el condominio activo:\n\n${condominioNombre}\n\n¿Desea continuar?`,
    );

    if (!confirmar) return;

    setCargandoSugeridas(true);

    const registros = sugeridasNuevas.map((nombre) => ({
      condominio_id: Number(condominioId),
      nombre_categoria: nombre,
      descripcion: `Categoría para gastos de ${nombre.toLowerCase()}.`,
      estado: "activo",
    }));

    const { error } = await supabase
      .from("catalogo_categoria_gastos")
      .insert(registros);

    setCargandoSugeridas(false);

    if (error) {
      alert("Error cargando categorías sugeridas: " + error.message);
      return;
    }

    alert("Categorías sugeridas cargadas correctamente.");
    cargarCategorias(condominioId);
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Catálogos"
        subtitle="Catálogos base del sistema: proveedores, categorías, fondos, áreas sociales, técnicos y parámetros."
        tone="purple"
        items={[
          {
            href: "/catalogos",
            label: "Inicio catálogos",
            icon: FolderOpen,
          },
          {
            href: "/catalogos/proveedores",
            label: "Proveedores",
            icon: FileSpreadsheet,
          },
          {
            href: "/catalogos/categorias-gastos",
            label: "Categorías",
            icon: FolderOpen,
          },
          {
            href: "/catalogos/fondos",
            label: "Fondos",
            icon: WalletCards,
          },
          {
            href: "/areas-sociales",
            label: "Áreas sociales",
            icon: CalendarDays,
          },
          {
            href: "/catalogo-tecnicos",
            label: "Técnicos",
            icon: FileSpreadsheet,
          },
          {
            href: "/catalogos/parametros",
            label: "Parámetros",
            icon: Settings,
          },
        ]}
      />

      <ModuleToolbar
        title="Categorías de Gastos"
        subtitle={`Catálogo para clasificar los gastos del condominio activo: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={FolderOpen}
        actions={
          <ModuleActions
            onRefresh={() => cargarCategorias(condominioId)}
            extra={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/catalogos"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Link>

                <button
                  type="button"
                  onClick={cargarCategoriasSugeridas}
                  disabled={cargandoSugeridas || loading || !condominioId}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {cargandoSugeridas ? "Cargando..." : "Cargar sugeridas"}
                </button>

                <button
                  type="button"
                  onClick={exportarExcel}
                  disabled={categoriasFiltradas.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </button>
              </div>
            }
          />
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <InfoBox label="Total categorías" value={`${categoriasFiltradas.length}`} tone="slate" />
        <InfoBox label="Activas" value={`${totalActivas}`} tone="emerald" />
        <InfoBox label="Inactivas" value={`${totalInactivas}`} tone="amber" />
        <InfoBox
          label="Condominio activo"
          value={condominioNombre || "No seleccionado"}
          tone="blue"
          compact
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="xl:col-span-1">
          <SectionCard
            title="Registrar categoría"
            subtitle="Cree categorías para clasificar gastos operativos y financieros."
          >
            <form onSubmit={guardarCategoria} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Nombre de la categoría *
                </label>

                <input
                  type="text"
                  value={nombreCategoria}
                  onChange={(e) => setNombreCategoria(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Ej. Limpieza, Seguridad, Electricidad"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Descripción
                </label>

                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  rows={4}
                  placeholder="Detalle o uso de la categoría"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {guardando ? "Guardando..." : "Guardar categoría"}
                </button>

                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-700 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </SectionCard>
        </section>

        <section className="xl:col-span-2">
          <SectionCard
            title="Listado de categorías"
            subtitle="Mostrando solamente categorías del condominio activo."
            action={
              loading ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Cargando
                </div>
              ) : (
                <div className="rounded-xl bg-purple-50 px-4 py-2 text-sm font-black text-purple-700">
                  Registros: {categoriasFiltradas.length}
                </div>
              )
            }
          >
            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold">Buscar</label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />

                <input
                  type="text"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  className="w-full rounded-xl border px-10 py-3 text-sm"
                  placeholder="Buscar por categoría, descripción o estado..."
                />
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Cargando categorías...</p>
            ) : !condominioId ? (
              <EmptyState
                title="Condominio no identificado"
                description="No se encontró el condominio activo. Debe iniciar sesión nuevamente."
              />
            ) : categoriasFiltradas.length === 0 ? (
              <EmptyState
                title="Sin categorías"
                description="No hay categorías registradas o no coinciden con la búsqueda."
              />
            ) : (
              <DataTable>
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-left">Descripción</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {categoriasFiltradas.map((c) => {
                    const activa = normalizarTexto(c.estado) === "activo";

                    return (
                      <tr key={c.id} className="bg-white hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-black text-slate-900">
                            {c.nombre_categoria || "-"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            ID: {c.id} · Registro: {fechaCorta(c.created_at)}
                          </p>
                        </td>

                        <td className="max-w-[420px] px-4 py-3 text-slate-600">
                          {c.descripcion || "-"}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                              activa
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {c.estado || "activo"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => cambiarEstado(c)}
                              className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                            >
                              {activa ? "Inactivar" : "Activar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => borrarCategoria(c)}
                              className="rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
                            >
                              Borrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            )}
          </SectionCard>
        </section>
      </div>

      <SectionCard
        title="Flujo recomendado"
        subtitle="Orden sugerido para usar correctamente las categorías de gastos."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FlujoPaso
            numero="1"
            titulo="Crear"
            descripcion="Registrar categorías base del condominio."
          />

          <FlujoPaso
            numero="2"
            titulo="Clasificar"
            descripcion="Usarlas al registrar gastos y solicitudes de pago."
          />

          <FlujoPaso
            numero="3"
            titulo="Revisar"
            descripcion="Inactivar categorías que ya no se utilicen."
          />

          <FlujoPaso
            numero="4"
            titulo="Reportar"
            descripcion="Exportar el catálogo para revisión administrativa."
          />
        </div>
      </SectionCard>
    </PageContainer>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
  compact = false,
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber" | "blue";
  compact?: boolean;
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 border-blue-100"
          : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2
        className={`mt-2 font-black ${
          compact ? "truncate text-lg" : "text-2xl"
        }`}
        title={value}
      >
        {value}
      </h2>
    </div>
  );
}

function FlujoPaso({
  numero,
  titulo,
  descripcion,
}: {
  numero: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-purple-700 text-sm font-black text-white">
        {numero}
      </div>

      <p className="font-black text-slate-900">{titulo}</p>

      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {descripcion}
      </p>
    </div>
  );
}
