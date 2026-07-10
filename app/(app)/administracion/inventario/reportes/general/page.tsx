"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  BarChart3,
  Boxes,
  Download,
  Filter,
  Package,
  Printer,
  RefreshCw,
  Search,
  Tags,
  Wrench,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type ItemInventario = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  codigo: string | null;
  nombre: string;
  categoria_id: number | null;
  categoria: string | null;
  descripcion: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  cantidad: number | null;
  unidad_medida: string | null;
  estado: string | null;
  ubicacion: string | null;
  responsable: string | null;
  fecha_adquisicion: string | null;
  costo: number | null;
  foto_url: string | null;
  observacion: string | null;
  created_at: string | null;
  tipo_activo_id: number | null;
  tipo_activo: string | null;
  valor_actual: number | null;
  depreciable: boolean | null;
};

function numero(valor: string | number | null | undefined) {
  return Number(valor || 0);
}

function moneda(valor: string | number | null | undefined) {
  return numero(valor).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fecha(valor: string | null | undefined) {
  if (!valor) return "-";

  const limpio = String(valor).split("T")[0];
  const partes = limpio.split("-");

  if (partes.length !== 3) return limpio;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function estadoBadgeClass(estado: string | null | undefined) {
  const valor = String(estado || "").toLowerCase();

  if (valor === "disponible") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (valor === "en uso") {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  if (valor === "en reparación" || valor === "en reparacion") {
    return "bg-yellow-50 text-yellow-700 border-yellow-100";
  }

  return "bg-red-50 text-red-700 border-red-100";
}

export default function ReporteInventarioGeneralPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroTipoActivo, setFiltroTipoActivo] = useState("Todos");
  const [filtroUbicacion, setFiltroUbicacion] = useState("Todos");
  const [filtroResponsable, setFiltroResponsable] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje(
        "No se encontró el condominio activo. Debe iniciar sesión nuevamente.",
      );
      return;
    }

    cargarItems(id);
  }, []);

  async function cargarItems(id: string) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("inventario_items")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("nombre", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando inventario general: " + error.message);
      setItems([]);
      return;
    }

    setItems((data as ItemInventario[]) || []);
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarItems(condominioId);
  }

  function limpiarFiltros() {
    setBuscar("");
    setFiltroEstado("Todos");
    setFiltroCategoria("Todos");
    setFiltroTipoActivo("Todos");
    setFiltroUbicacion("Todos");
    setFiltroResponsable("Todos");
  }

  function imprimir() {
    window.print();
  }

  function exportarCSV() {
    const encabezados = [
      "Código",
      "Artículo",
      "Tipo Activo",
      "Categoría",
      "Marca",
      "Modelo",
      "No. Serie",
      "Descripción",
      "Cantidad",
      "Unidad",
      "Estado",
      "Ubicación",
      "Responsable",
      "Fecha Adquisición",
      "Costo Adquisición",
      "Valor Actual",
      "Valor Total Adquisición",
      "Valor Total Actual",
      "Depreciable",
      "Observación",
    ];

    const filas = itemsFiltrados.map((i) => [
      i.codigo || "",
      i.nombre || "",
      i.tipo_activo || "",
      i.categoria || "",
      i.marca || "",
      i.modelo || "",
      i.numero_serie || "",
      i.descripcion || "",
      numero(i.cantidad).toFixed(2),
      i.unidad_medida || "",
      i.estado || "",
      i.ubicacion || "",
      i.responsable || "",
      i.fecha_adquisicion || "",
      numero(i.costo).toFixed(2),
      numero(i.valor_actual).toFixed(2),
      (numero(i.costo) * numero(i.cantidad)).toFixed(2),
      (numero(i.valor_actual) * numero(i.cantidad)).toFixed(2),
      i.depreciable ? "Sí" : "No",
      i.observacion || "",
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `reporte_inventario_general_${
      condominioNombre || "condominio"
    }.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  const estados = useMemo(() => {
    const lista = items.map((i) => i.estado || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const categorias = useMemo(() => {
    const lista = items.map((i) => i.categoria || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const tiposActivos = useMemo(() => {
    const lista = items.map((i) => i.tipo_activo || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const ubicaciones = useMemo(() => {
    const lista = items.map((i) => i.ubicacion || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const responsables = useMemo(() => {
    const lista = items.map((i) => i.responsable || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      const texto = `${item.codigo || ""} ${item.nombre || ""} ${
        item.tipo_activo || ""
      } ${item.categoria || ""} ${item.descripcion || ""} ${
        item.marca || ""
      } ${item.modelo || ""} ${item.numero_serie || ""} ${
        item.estado || ""
      } ${item.ubicacion || ""} ${item.responsable || ""}`
        .toLowerCase()
        .trim();

      return (
        texto.includes(buscar.toLowerCase().trim()) &&
        (filtroEstado === "Todos" || item.estado === filtroEstado) &&
        (filtroCategoria === "Todos" || item.categoria === filtroCategoria) &&
        (filtroTipoActivo === "Todos" ||
          item.tipo_activo === filtroTipoActivo) &&
        (filtroUbicacion === "Todos" || item.ubicacion === filtroUbicacion) &&
        (filtroResponsable === "Todos" ||
          item.responsable === filtroResponsable)
      );
    });
  }, [
    items,
    buscar,
    filtroEstado,
    filtroCategoria,
    filtroTipoActivo,
    filtroUbicacion,
    filtroResponsable,
  ]);

  const totalCantidad = itemsFiltrados.reduce(
    (sum, i) => sum + numero(i.cantidad),
    0,
  );

  const valorAdquisicion = itemsFiltrados.reduce(
    (sum, i) => sum + numero(i.costo) * numero(i.cantidad),
    0,
  );

  const valorActualTotal = itemsFiltrados.reduce(
    (sum, i) => sum + numero(i.valor_actual) * numero(i.cantidad),
    0,
  );

  return (
    <PageContainer>
      <div className="no-print">
        <ModuleMenu
          title="Inventario"
          subtitle="Control de activos, artículos, movimientos, mantenimiento y reportes del condominio."
          tone="blue"
          items={[
            {
              href: "/administracion/inventario",
              label: "Inicio inventario",
              icon: Package,
            },
            {
              href: "/administracion/inventario/articulos",
              label: "Artículos",
              icon: Boxes,
            },
            {
              href: "/administracion/inventario/movimientos",
              label: "Movimientos",
              icon: ArrowRightLeft,
            },
            {
              href: "/administracion/inventario/mantenimiento",
              label: "Mantenimiento",
              icon: Wrench,
            },
            {
              href: "/administracion/inventario/reportes",
              label: "Reportes",
              icon: BarChart3,
            },
            {
              href: "/administracion/inventario/catalogos",
              label: "Catálogos",
              icon: Tags,
            },
          ]}
        />

        <ModuleToolbar
          title="Reporte Inventario General"
          subtitle={`Listado general de activos, herramientas, equipos y materiales. Condominio: ${
            condominioNombre || "No identificado"
          }.`}
          icon={BarChart3}
          actions={
            <ModuleActions
              onRefresh={refrescar}
              extra={
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/administracion/inventario/reportes"
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Volver reportes
                  </Link>

                  <button
                    type="button"
                    onClick={exportarCSV}
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Exportar
                  </button>

                  <button
                    type="button"
                    onClick={imprimir}
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir / PDF
                  </button>
                </div>
              }
            />
          }
        />
      </div>

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <div className="no-print">
        <SectionCard
          title="Filtros"
          subtitle="Busque y filtre por artículo, código, tipo, categoría, estado, ubicación o responsable."
          action={
            loading ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Cargando
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                <Filter className="h-4 w-4" />
                Registros: {itemsFiltrados.length}
              </div>
            )
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />

              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Buscar artículo, código, marca..."
              />
            </div>

            <FilterSelect
              value={filtroTipoActivo}
              onChange={setFiltroTipoActivo}
              options={tiposActivos}
              todosLabel="Todos los tipos"
            />

            <FilterSelect
              value={filtroCategoria}
              onChange={setFiltroCategoria}
              options={categorias}
              todosLabel="Todas las categorías"
            />

            <FilterSelect
              value={filtroEstado}
              onChange={setFiltroEstado}
              options={estados}
              todosLabel="Todos los estados"
            />

            <FilterSelect
              value={filtroUbicacion}
              onChange={setFiltroUbicacion}
              options={ubicaciones}
              todosLabel="Todas las ubicaciones"
            />

            <FilterSelect
              value={filtroResponsable}
              onChange={setFiltroResponsable}
              options={responsables}
              todosLabel="Todos los responsables"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <button
              type="button"
              onClick={refrescar}
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800"
            >
              Buscar / Actualizar
            </button>

            <button
              type="button"
              onClick={limpiarFiltros}
              className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Limpiar filtros
            </button>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Detalle de inventario"
        subtitle={`${itemsFiltrados.length} registro(s) encontrado(s).`}
        action={
          <div className="hidden rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 md:block">
            Valor actual: RD$ {moneda(valorActualTotal)}
          </div>
        }
      >
        <div className="mb-5 hidden border-b pb-3 print:block">
          <h1 className="text-center text-2xl font-black">
            REPORTE INVENTARIO GENERAL
          </h1>

          <p className="text-center font-bold">{condominioNombre}</p>

          <p className="text-center text-sm">
            Fecha impresión: {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando inventario...</p>
        ) : itemsFiltrados.length === 0 ? (
          <EmptyState
            title="Sin artículos"
            description="No hay artículos para esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Artículo</th>
                <th className="px-4 py-3 text-left">Tipo / Categoría</th>
                <th className="px-4 py-3 text-left">Marca / Serie</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-left">Ubicación</th>
                <th className="px-4 py-3 text-left">Responsable</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Costo</th>
                <th className="px-4 py-3 text-right">Valor actual</th>
                <th className="px-4 py-3 text-right">Total actual</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {itemsFiltrados.map((item) => (
                <tr key={item.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-black">
                    {item.codigo || item.id}
                  </td>

                  <td className="min-w-72 px-4 py-3">
                    <p className="font-black text-slate-900">{item.nombre}</p>

                    <p className="text-xs text-slate-500">
                      Fecha compra: {fecha(item.fecha_adquisicion)}
                    </p>

                    {item.descripcion && (
                      <p className="text-xs text-slate-500">
                        {item.descripcion}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-bold">{item.tipo_activo || "-"}</p>
                    <p className="text-xs text-slate-500">
                      {item.categoria || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <p>
                      {item.marca || "-"} {item.modelo || ""}
                    </p>

                    <p className="text-xs text-slate-500">
                      Serie: {item.numero_serie || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-right font-black">
                    {numero(item.cantidad).toFixed(2)}{" "}
                    {item.unidad_medida || ""}
                  </td>

                  <td className="px-4 py-3">{item.ubicacion || "-"}</td>

                  <td className="px-4 py-3">{item.responsable || "-"}</td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoBadgeClass(
                        item.estado,
                      )}`}
                    >
                      {item.estado || "-"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {moneda(item.costo)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {moneda(item.valor_actual)}
                  </td>

                  <td className="px-4 py-3 text-right font-black text-blue-700">
                    RD${" "}
                    {moneda(numero(item.valor_actual) * numero(item.cantidad))}
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-100 font-black">
                <td className="px-4 py-3" colSpan={4}>
                  Totales
                </td>

                <td className="px-4 py-3 text-right">
                  {totalCantidad.toFixed(2)}
                </td>

                <td className="px-4 py-3" colSpan={3}></td>

                <td className="px-4 py-3 text-right">
                  RD$ {moneda(valorAdquisicion)}
                </td>

                <td className="px-4 py-3 text-right">
                  RD$ {moneda(valorActualTotal)}
                </td>

                <td className="px-4 py-3 text-right text-blue-700">
                  RD$ {moneda(valorActualTotal)}
                </td>
              </tr>
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
            font-size: 10px !important;
          }

          @page {
            size: landscape;
            margin: 0.25in;
          }
        }
      `}</style>
    </PageContainer>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  todosLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  todosLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
    >
      {options.map((item) => (
        <option key={item} value={item}>
          {item === "Todos" ? todosLabel : item}
        </option>
      ))}
    </select>
  );
}