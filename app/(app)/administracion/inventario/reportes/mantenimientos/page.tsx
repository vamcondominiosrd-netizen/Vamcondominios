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

type Mantenimiento = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  item_id: number;
  codigo_activo: string | null;
  nombre_activo: string | null;
  categoria: string | null;
  fecha_ultimo_mantenimiento: string | null;
  fecha_proximo_mantenimiento: string | null;
  frecuencia_dias: number | null;
  proveedor: string | null;
  responsable: string | null;
  costo_ultimo: number | null;
  costo_acumulado: number | null;
  estado: string | null;
  observacion: string | null;
  created_by: string | null;
  created_at: string | null;
  prioridad: string | null;
  dias_alerta: number | null;
  requiere_apagado: boolean | null;
  ubicacion: string | null;
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

function diasHasta(fechaObjetivo: string | null | undefined) {
  if (!fechaObjetivo) return 999999;

  const hoy = new Date(new Date().toISOString().slice(0, 10));
  const futuro = new Date(`${fechaObjetivo}T00:00:00`);

  return Math.ceil(
    (futuro.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function prioridadClass(prioridad: string | null | undefined) {
  if (prioridad === "Crítica") {
    return "bg-red-50 text-red-700 border-red-100";
  }

  if (prioridad === "Alta") {
    return "bg-orange-50 text-orange-700 border-orange-100";
  }

  if (prioridad === "Normal") {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function estadoClass(estado: string | null | undefined) {
  if (estado === "Vencido") {
    return "bg-red-50 text-red-700 border-red-100";
  }

  if (estado === "Programado") {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  if (estado === "Realizado") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (estado === "Cancelado") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  return "bg-yellow-50 text-yellow-700 border-yellow-100";
}

export default function ReporteMantenimientosInventarioPage() {
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioAnio = new Date().getFullYear() + "-01-01";
  const finAnio = new Date().getFullYear() + "-12-31";

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [fechaDesde, setFechaDesde] = useState(inicioAnio);
  const [fechaHasta, setFechaHasta] = useState(finAnio);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroProveedor, setFiltroProveedor] = useState("Todos");

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

    cargarMantenimientos(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarMantenimientos(id: string) {
    setLoading(true);
    setMensaje("");

    let query = supabase
      .from("inventario_mantenimiento")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("fecha_proximo_mantenimiento", { ascending: true });

    if (fechaDesde) {
      query = query.gte("fecha_proximo_mantenimiento", fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte("fecha_proximo_mantenimiento", fechaHasta);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      setMensaje("Error cargando reporte de mantenimientos: " + error.message);
      setMantenimientos([]);
      return;
    }

    setMantenimientos((data as Mantenimiento[]) || []);
  }

  function estadoCalculado(m: Mantenimiento) {
    if (m.estado === "Realizado" || m.estado === "Cancelado") {
      return m.estado || "-";
    }

    if (
      m.fecha_proximo_mantenimiento &&
      m.fecha_proximo_mantenimiento < hoy
    ) {
      return "Vencido";
    }

    return m.estado || "Pendiente";
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarMantenimientos(condominioId);
  }

  function limpiarFiltros() {
    setFechaDesde(inicioAnio);
    setFechaHasta(finAnio);
    setBuscar("");
    setFiltroEstado("Todos");
    setFiltroPrioridad("Todos");
    setFiltroCategoria("Todos");
    setFiltroProveedor("Todos");
  }

  function imprimir() {
    window.print();
  }

  function exportarCSV() {
    const encabezados = [
      "Código Activo",
      "Activo",
      "Categoría",
      "Ubicación",
      "Último Mantenimiento",
      "Próximo Mantenimiento",
      "Días Restantes",
      "Frecuencia Días",
      "Proveedor",
      "Responsable",
      "Costo Último",
      "Costo Acumulado",
      "Prioridad",
      "Días Alerta",
      "Requiere Apagado",
      "Estado",
      "Observación",
    ];

    const filas = mantenimientosFiltrados.map((m) => [
      m.codigo_activo || "",
      m.nombre_activo || "",
      m.categoria || "",
      m.ubicacion || "",
      m.fecha_ultimo_mantenimiento || "",
      m.fecha_proximo_mantenimiento || "",
      diasHasta(m.fecha_proximo_mantenimiento),
      numero(m.frecuencia_dias),
      m.proveedor || "",
      m.responsable || "",
      numero(m.costo_ultimo).toFixed(2),
      numero(m.costo_acumulado).toFixed(2),
      m.prioridad || "",
      numero(m.dias_alerta),
      m.requiere_apagado ? "Sí" : "No",
      estadoCalculado(m),
      m.observacion || "",
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
    a.download = `reporte_mantenimientos_inventario_${
      condominioNombre || "condominio"
    }.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  const estados = useMemo(() => {
    const lista = mantenimientos.map((m) => estadoCalculado(m)).filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [mantenimientos]);

  const prioridades = useMemo(() => {
    const lista = mantenimientos.map((m) => m.prioridad || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [mantenimientos]);

  const categorias = useMemo(() => {
    const lista = mantenimientos.map((m) => m.categoria || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [mantenimientos]);

  const proveedores = useMemo(() => {
    const lista = mantenimientos.map((m) => m.proveedor || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [mantenimientos]);

  const mantenimientosFiltrados = useMemo(() => {
    return mantenimientos.filter((m) => {
      const estadoReal = estadoCalculado(m);

      const texto = `${m.codigo_activo || ""} ${m.nombre_activo || ""} ${
        m.categoria || ""
      } ${m.ubicacion || ""} ${m.proveedor || ""} ${m.responsable || ""} ${
        m.prioridad || ""
      } ${estadoReal} ${m.observacion || ""}`
        .toLowerCase()
        .trim();

      return (
        texto.includes(buscar.toLowerCase().trim()) &&
        (filtroEstado === "Todos" || estadoReal === filtroEstado) &&
        (filtroPrioridad === "Todos" || m.prioridad === filtroPrioridad) &&
        (filtroCategoria === "Todos" || m.categoria === filtroCategoria) &&
        (filtroProveedor === "Todos" || m.proveedor === filtroProveedor)
      );
    });
  }, [
    mantenimientos,
    buscar,
    filtroEstado,
    filtroPrioridad,
    filtroCategoria,
    filtroProveedor,
  ]);

  const totalRegistros = mantenimientosFiltrados.length;

  const totalRequiereApagado = mantenimientosFiltrados.filter(
    (m) => m.requiere_apagado,
  ).length;

  const costoUltimoTotal = mantenimientosFiltrados.reduce(
    (sum, m) => sum + numero(m.costo_ultimo),
    0,
  );

  const costoAcumuladoTotal = mantenimientosFiltrados.reduce(
    (sum, m) => sum + numero(m.costo_acumulado),
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
          title="Reporte de Mantenimientos"
          subtitle={`Plan, vencimientos, prioridades y costos de mantenimiento preventivo. Condominio: ${
            condominioNombre || "No identificado"
          }.`}
          icon={Wrench}
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
          subtitle="Busque y filtre mantenimientos por período, activo, proveedor, estado, prioridad o categoría."
          action={
            loading ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Cargando
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                <Filter className="h-4 w-4" />
                Registros: {mantenimientosFiltrados.length}
              </div>
            )
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />

            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />

              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Buscar activo, proveedor..."
              />
            </div>

            <FilterSelect
              value={filtroEstado}
              onChange={setFiltroEstado}
              options={estados}
              todosLabel="Todos los estados"
            />

            <FilterSelect
              value={filtroPrioridad}
              onChange={setFiltroPrioridad}
              options={prioridades}
              todosLabel="Todas las prioridades"
            />

            <FilterSelect
              value={filtroCategoria}
              onChange={setFiltroCategoria}
              options={categorias}
              todosLabel="Todas las categorías"
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
        title="Detalle de mantenimientos"
        subtitle={`${totalRegistros} mantenimiento(s) encontrado(s).`}
        action={
          <div className="hidden rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 md:block">
            Costo acumulado: RD$ {moneda(costoAcumuladoTotal)}
          </div>
        }
      >
        <div className="mb-5 hidden border-b pb-3 print:block">
          <h1 className="text-center text-2xl font-black">
            REPORTE DE MANTENIMIENTOS
          </h1>

          <p className="text-center font-bold">{condominioNombre}</p>

          <p className="text-center text-sm">
            Período: {fecha(fechaDesde)} al {fecha(fechaHasta)} · Fecha
            impresión: {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando mantenimientos...</p>
        ) : mantenimientosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin mantenimientos"
            description="No hay mantenimientos para esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Activo</th>
                <th className="px-4 py-3 text-left">Categoría / Ubicación</th>
                <th className="px-4 py-3 text-left">Fechas</th>
                <th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-left">Responsable</th>
                <th className="px-4 py-3 text-right">Costo último</th>
                <th className="px-4 py-3 text-right">Costo acumulado</th>
                <th className="px-4 py-3 text-center">Prioridad</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-left">Observación</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {mantenimientosFiltrados.map((m) => {
                const dias = diasHasta(m.fecha_proximo_mantenimiento);
                const estadoReal = estadoCalculado(m);

                return (
                  <tr key={m.id} className="bg-white hover:bg-slate-50">
                    <td className="min-w-72 px-4 py-3">
                      <p className="font-black text-slate-900">
                        {m.nombre_activo || "-"}
                      </p>

                      <p className="text-xs text-slate-500">
                        Código: {m.codigo_activo || m.item_id}
                      </p>

                      {m.requiere_apagado && (
                        <p className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                          Requiere apagado
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <p>{m.categoria || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {m.ubicacion || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p>Último: {fecha(m.fecha_ultimo_mantenimiento)}</p>

                      <p className="font-black">
                        Próximo: {fecha(m.fecha_proximo_mantenimiento)}
                      </p>

                      <p
                        className={`text-xs font-black ${
                          dias < 0
                            ? "text-red-700"
                            : dias <= numero(m.dias_alerta || 7)
                              ? "text-orange-700"
                              : "text-slate-500"
                        }`}
                      >
                        {dias < 0
                          ? `Vencido hace ${Math.abs(dias)} día(s)`
                          : `Faltan ${dias} día(s)`}
                      </p>
                    </td>

                    <td className="px-4 py-3">{m.proveedor || "-"}</td>

                    <td className="px-4 py-3">{m.responsable || "-"}</td>

                    <td className="px-4 py-3 text-right">
                      RD$ {moneda(m.costo_ultimo)}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-blue-700">
                      RD$ {moneda(m.costo_acumulado)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${prioridadClass(
                          m.prioridad,
                        )}`}
                      >
                        {m.prioridad || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoClass(
                          estadoReal,
                        )}`}
                      >
                        {estadoReal}
                      </span>
                    </td>

                    <td className="min-w-64 px-4 py-3">
                      {m.observacion || "-"}
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-slate-100 font-black">
                <td className="px-4 py-3" colSpan={5}>
                  Totales
                </td>

                <td className="px-4 py-3 text-right">
                  RD$ {moneda(costoUltimoTotal)}
                </td>

                <td className="px-4 py-3 text-right text-blue-700">
                  RD$ {moneda(costoAcumuladoTotal)}
                </td>

                <td className="px-4 py-3" colSpan={3}>
                  Requieren apagado: {totalRequiereApagado}
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