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
  observacion: string | null;
  tipo_activo: string | null;
  valor_actual: number | null;
  depreciable: boolean | null;
};

type GrupoUbicacion = {
  ubicacion: string;
  items: ItemInventario[];
  cantidad: number;
  valorAdquisicion: number;
  valorActual: number;
  disponibles: number;
  enUso: number;
  reparacion: number;
  bajas: number;
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

function estadoEsEnUso(estado: string | null | undefined) {
  return estado === "En Uso" || estado === "En uso";
}

function estadoEsReparacion(estado: string | null | undefined) {
  return estado === "En Reparación" || estado === "En reparación";
}

function estadoEsBaja(estado: string | null | undefined) {
  return ["Dañado", "Perdido", "Dado de Baja", "Dado de baja"].includes(
    estado || "",
  );
}

function estadoBadgeClass(estado: string | null | undefined) {
  if (estado === "Disponible") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (estadoEsEnUso(estado)) {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  if (estadoEsReparacion(estado)) {
    return "bg-yellow-50 text-yellow-700 border-yellow-100";
  }

  return "bg-red-50 text-red-700 border-red-100";
}

export default function ReporteInventarioUbicacionesPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [buscar, setBuscar] = useState("");
  const [filtroUbicacion, setFiltroUbicacion] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [mostrarDetalle, setMostrarDetalle] = useState(true);

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
      .order("ubicacion", { ascending: true })
      .order("nombre", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando inventario por ubicación: " + error.message);
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
    setFiltroUbicacion("Todos");
    setFiltroEstado("Todos");
    setFiltroCategoria("Todos");
  }

  function imprimir() {
    window.print();
  }

  function descargarCSV(
    nombreArchivo: string,
    encabezados: string[],
    filas: any[][],
  ) {
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
    a.download = nombreArchivo;
    a.click();

    URL.revokeObjectURL(url);
  }

  function exportarResumenCSV() {
    descargarCSV(
      `reporte_inventario_por_ubicacion_resumen_${
        condominioNombre || "condominio"
      }.csv`,
      [
        "Ubicación",
        "Artículos",
        "Cantidad",
        "Disponibles",
        "En Uso",
        "Reparación",
        "Baja / Perdidos",
        "Valor Adquisición",
        "Valor Actual",
      ],
      grupos.map((g) => [
        g.ubicacion,
        g.items.length,
        g.cantidad.toFixed(2),
        g.disponibles,
        g.enUso,
        g.reparacion,
        g.bajas,
        g.valorAdquisicion.toFixed(2),
        g.valorActual.toFixed(2),
      ]),
    );
  }

  function exportarDetalleCSV() {
    descargarCSV(
      `reporte_inventario_por_ubicacion_detalle_${
        condominioNombre || "condominio"
      }.csv`,
      [
        "Ubicación",
        "Código",
        "Artículo",
        "Categoría",
        "Tipo Activo",
        "Marca",
        "Modelo",
        "Cantidad",
        "Unidad",
        "Estado",
        "Responsable",
        "Costo",
        "Valor Actual",
        "Total Actual",
      ],
      itemsFiltrados.map((i) => [
        i.ubicacion || "Sin ubicación",
        i.codigo || "",
        i.nombre || "",
        i.categoria || "",
        i.tipo_activo || "",
        i.marca || "",
        i.modelo || "",
        numero(i.cantidad).toFixed(2),
        i.unidad_medida || "",
        i.estado || "",
        i.responsable || "",
        numero(i.costo).toFixed(2),
        numero(i.valor_actual).toFixed(2),
        (numero(i.valor_actual) * numero(i.cantidad)).toFixed(2),
      ]),
    );
  }

  const ubicaciones = useMemo(() => {
    const lista = items.map((i) => i.ubicacion || "Sin ubicación");
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const estados = useMemo(() => {
    const lista = items.map((i) => i.estado || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const categorias = useMemo(() => {
    const lista = items.map((i) => i.categoria || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      const ubicacion = item.ubicacion || "Sin ubicación";

      const texto = `${item.codigo || ""} ${item.nombre || ""} ${
        item.ubicacion || ""
      } ${item.responsable || ""} ${item.categoria || ""} ${
        item.tipo_activo || ""
      } ${item.estado || ""} ${item.marca || ""} ${item.modelo || ""}`
        .toLowerCase()
        .trim();

      return (
        texto.includes(buscar.toLowerCase().trim()) &&
        (filtroUbicacion === "Todos" || ubicacion === filtroUbicacion) &&
        (filtroEstado === "Todos" || item.estado === filtroEstado) &&
        (filtroCategoria === "Todos" || item.categoria === filtroCategoria)
      );
    });
  }, [items, buscar, filtroUbicacion, filtroEstado, filtroCategoria]);

  const grupos: GrupoUbicacion[] = useMemo(() => {
    const mapa = new Map<string, ItemInventario[]>();

    itemsFiltrados.forEach((item) => {
      const ubicacion = item.ubicacion || "Sin ubicación";
      const actual = mapa.get(ubicacion) || [];

      actual.push(item);
      mapa.set(ubicacion, actual);
    });

    return Array.from(mapa.entries())
      .map(([ubicacion, lista]) => ({
        ubicacion,
        items: lista,
        cantidad: lista.reduce((sum, i) => sum + numero(i.cantidad), 0),
        valorAdquisicion: lista.reduce(
          (sum, i) => sum + numero(i.costo) * numero(i.cantidad),
          0,
        ),
        valorActual: lista.reduce(
          (sum, i) => sum + numero(i.valor_actual) * numero(i.cantidad),
          0,
        ),
        disponibles: lista.filter((i) => i.estado === "Disponible").length,
        enUso: lista.filter((i) => estadoEsEnUso(i.estado)).length,
        reparacion: lista.filter((i) => estadoEsReparacion(i.estado)).length,
        bajas: lista.filter((i) => estadoEsBaja(i.estado)).length,
      }))
      .sort((a, b) => a.ubicacion.localeCompare(b.ubicacion));
  }, [itemsFiltrados]);

  const totalArticulos = itemsFiltrados.length;

  const totalCantidad = grupos.reduce((sum, g) => sum + g.cantidad, 0);

  const totalValorAdquisicion = grupos.reduce(
    (sum, g) => sum + g.valorAdquisicion,
    0,
  );

  const totalValorActual = grupos.reduce((sum, g) => sum + g.valorActual, 0);

  const totalDisponibles = grupos.reduce((sum, g) => sum + g.disponibles, 0);

  const totalEnUso = grupos.reduce((sum, g) => sum + g.enUso, 0);

  const totalReparacion = grupos.reduce((sum, g) => sum + g.reparacion, 0);

  const totalBajas = grupos.reduce((sum, g) => sum + g.bajas, 0);

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
          title="Inventario por Ubicación"
          subtitle={`Control de activos agrupados por ubicación física dentro del condominio. Condominio: ${
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
                    onClick={exportarResumenCSV}
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Exportar resumen
                  </button>

                  <button
                    type="button"
                    onClick={exportarDetalleCSV}
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Exportar detalle
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
          subtitle="Busque y filtre por ubicación, artículo, responsable, categoría, estado o marca."
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />

              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Buscar ubicación, artículo, responsable..."
              />
            </div>

            <FilterSelect
              value={filtroUbicacion}
              onChange={setFiltroUbicacion}
              options={ubicaciones}
              todosLabel="Todas las ubicaciones"
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

            <button
              type="button"
              onClick={() => setMostrarDetalle(!mostrarDetalle)}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-950"
            >
              {mostrarDetalle ? "Ocultar detalle" : "Ver detalle"}
            </button>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Resumen por ubicación"
        subtitle={`${grupos.length} ubicación(es) encontrada(s).`}
        action={
          <div className="hidden rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 md:block">
            Valor actual: RD$ {moneda(totalValorActual)}
          </div>
        }
      >
        <div className="mb-5 hidden border-b pb-3 print:block">
          <h1 className="text-center text-2xl font-black">
            INVENTARIO POR UBICACIÓN
          </h1>

          <p className="text-center font-bold">{condominioNombre}</p>

          <p className="text-center text-sm">
            Fecha impresión: {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando reporte...</p>
        ) : grupos.length === 0 ? (
          <EmptyState
            title="Sin información"
            description="No hay información para esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Ubicación</th>
                <th className="px-4 py-3 text-right">Artículos</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-right">Disponibles</th>
                <th className="px-4 py-3 text-right">En uso</th>
                <th className="px-4 py-3 text-right">Reparación</th>
                <th className="px-4 py-3 text-right">Baja / Perdidos</th>
                <th className="px-4 py-3 text-right">Valor adquisición</th>
                <th className="px-4 py-3 text-right">Valor actual</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {grupos.map((grupo) => (
                <tr key={grupo.ubicacion} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-black text-slate-900">
                    {grupo.ubicacion}
                  </td>

                  <td className="px-4 py-3 text-right font-bold">
                    {grupo.items.length}
                  </td>

                  <td className="px-4 py-3 text-right font-bold">
                    {grupo.cantidad.toFixed(2)}
                  </td>

                  <td className="px-4 py-3 text-right font-black text-emerald-700">
                    {grupo.disponibles}
                  </td>

                  <td className="px-4 py-3 text-right font-black text-blue-700">
                    {grupo.enUso}
                  </td>

                  <td className="px-4 py-3 text-right font-black text-yellow-700">
                    {grupo.reparacion}
                  </td>

                  <td className="px-4 py-3 text-right font-black text-red-700">
                    {grupo.bajas}
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {moneda(grupo.valorAdquisicion)}
                  </td>

                  <td className="px-4 py-3 text-right font-black text-blue-700">
                    RD$ {moneda(grupo.valorActual)}
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-100 font-black">
                <td className="px-4 py-3">Totales</td>

                <td className="px-4 py-3 text-right">{totalArticulos}</td>

                <td className="px-4 py-3 text-right">
                  {totalCantidad.toFixed(2)}
                </td>

                <td className="px-4 py-3 text-right text-emerald-700">
                  {totalDisponibles}
                </td>

                <td className="px-4 py-3 text-right text-blue-700">
                  {totalEnUso}
                </td>

                <td className="px-4 py-3 text-right text-yellow-700">
                  {totalReparacion}
                </td>

                <td className="px-4 py-3 text-right text-red-700">
                  {totalBajas}
                </td>

                <td className="px-4 py-3 text-right">
                  RD$ {moneda(totalValorAdquisicion)}
                </td>

                <td className="px-4 py-3 text-right text-blue-700">
                  RD$ {moneda(totalValorActual)}
                </td>
              </tr>
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      {mostrarDetalle && (
        <SectionCard
          title="Detalle por ubicación"
          subtitle="Detalle de artículos agrupados por ubicación."
        >
          {grupos.length === 0 ? (
            <EmptyState
              title="Sin detalle"
              description="No hay artículos para mostrar."
            />
          ) : (
            <div className="space-y-8">
              {grupos.map((grupo) => (
                <div key={grupo.ubicacion} className="rounded-2xl border">
                  <div className="rounded-t-2xl bg-slate-900 px-5 py-4 text-white">
                    <h3 className="font-black">
                      {grupo.ubicacion} · {grupo.items.length} artículo(s) ·
                      RD$ {moneda(grupo.valorActual)}
                    </h3>
                  </div>

                  <DataTable>
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left">Código</th>
                        <th className="px-4 py-3 text-left">Artículo</th>
                        <th className="px-4 py-3 text-left">Categoría</th>
                        <th className="px-4 py-3 text-left">Marca / Modelo</th>
                        <th className="px-4 py-3 text-right">Cantidad</th>
                        <th className="px-4 py-3 text-left">Responsable</th>
                        <th className="px-4 py-3 text-center">Estado</th>
                        <th className="px-4 py-3 text-right">Valor actual</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {grupo.items.map((item) => (
                        <tr key={item.id} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-3 font-black">
                            {item.codigo || item.id}
                          </td>

                          <td className="min-w-64 px-4 py-3">
                            <p className="font-black text-slate-900">
                              {item.nombre}
                            </p>

                            <p className="text-xs text-slate-500">
                              {item.tipo_activo || "-"}
                            </p>
                          </td>

                          <td className="px-4 py-3">{item.categoria || "-"}</td>

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

                          <td className="px-4 py-3">
                            {item.responsable || "-"}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoBadgeClass(
                                item.estado,
                              )}`}
                            >
                              {item.estado || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right font-black text-blue-700">
                            RD${" "}
                            {moneda(
                              numero(item.valor_actual) * numero(item.cantidad),
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

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