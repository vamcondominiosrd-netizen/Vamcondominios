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

type Movimiento = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  item_id: number;
  tipo_movimiento: string | null;
  fecha_movimiento: string | null;
  cantidad: number | null;
  responsable: string | null;
  ubicacion_origen: string | null;
  ubicacion_destino: string | null;
  observacion: string | null;
  created_at: string | null;
  inventario_items?: {
    codigo: string | null;
    nombre: string | null;
    categoria: string | null;
    tipo_activo: string | null;
    estado: string | null;
    ubicacion: string | null;
  } | null;
};

function numero(valor: string | number | null | undefined) {
  return Number(valor || 0);
}

function fecha(valor: string | null | undefined) {
  if (!valor) return "-";

  const limpio = String(valor).split("T")[0];
  const partes = limpio.split("-");

  if (partes.length !== 3) return limpio;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function movimientoClass(tipo?: string | null) {
  const valor = String(tipo || "").toLowerCase();

  if (valor.includes("entrada") || valor.includes("devolución")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (valor.includes("salida") || valor.includes("asignación")) {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  if (valor.includes("reparación")) {
    return "bg-yellow-50 text-yellow-700 border-yellow-100";
  }

  if (valor.includes("baja")) {
    return "bg-red-50 text-red-700 border-red-100";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function ReporteMovimientosInventarioPage() {
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioMes = new Date().toISOString().slice(0, 7) + "-01";

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [fechaDesde, setFechaDesde] = useState(inicioMes);
  const [fechaHasta, setFechaHasta] = useState(hoy);
  const [buscar, setBuscar] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroResponsable, setFiltroResponsable] = useState("Todos");
  const [filtroOrigen, setFiltroOrigen] = useState("Todos");
  const [filtroDestino, setFiltroDestino] = useState("Todos");

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

    cargarMovimientos(id);
  }, []);

  async function cargarMovimientos(id: string) {
    setLoading(true);
    setMensaje("");

    let query = supabase
      .from("inventario_movimientos")
      .select(
        `
        *,
        inventario_items(codigo, nombre, categoria, tipo_activo, estado, ubicacion)
      `,
      )
      .eq("condominio_id", Number(id))
      .order("fecha_movimiento", { ascending: false })
      .order("created_at", { ascending: false });

    if (fechaDesde) {
      query = query.gte("fecha_movimiento", fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte("fecha_movimiento", fechaHasta);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      setMensaje("Error cargando movimientos de inventario: " + error.message);
      setMovimientos([]);
      return;
    }

    setMovimientos((data as Movimiento[]) || []);
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarMovimientos(condominioId);
  }

  function limpiarFiltros() {
    setFechaDesde(inicioMes);
    setFechaHasta(hoy);
    setBuscar("");
    setFiltroTipo("Todos");
    setFiltroResponsable("Todos");
    setFiltroOrigen("Todos");
    setFiltroDestino("Todos");
  }

  function imprimir() {
    window.print();
  }

  function exportarCSV() {
    const encabezados = [
      "Fecha",
      "Tipo Movimiento",
      "Código",
      "Artículo",
      "Categoría",
      "Tipo Activo",
      "Cantidad",
      "Responsable",
      "Ubicación Origen",
      "Ubicación Destino",
      "Observación",
    ];

    const filas = movimientosFiltrados.map((m) => [
      m.fecha_movimiento || "",
      m.tipo_movimiento || "",
      m.inventario_items?.codigo || "",
      m.inventario_items?.nombre || "",
      m.inventario_items?.categoria || "",
      m.inventario_items?.tipo_activo || "",
      numero(m.cantidad).toFixed(2),
      m.responsable || "",
      m.ubicacion_origen || "",
      m.ubicacion_destino || "",
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
    a.download = `reporte_movimientos_inventario_${
      condominioNombre || "condominio"
    }.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  const tipos = useMemo(() => {
    const lista = movimientos
      .map((m) => m.tipo_movimiento || "")
      .filter(Boolean);

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [movimientos]);

  const responsables = useMemo(() => {
    const lista = movimientos.map((m) => m.responsable || "").filter(Boolean);

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [movimientos]);

  const origenes = useMemo(() => {
    const lista = movimientos
      .map((m) => m.ubicacion_origen || "")
      .filter(Boolean);

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [movimientos]);

  const destinos = useMemo(() => {
    const lista = movimientos
      .map((m) => m.ubicacion_destino || "")
      .filter(Boolean);

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [movimientos]);

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      const texto = `${m.tipo_movimiento || ""} ${m.responsable || ""} ${
        m.ubicacion_origen || ""
      } ${m.ubicacion_destino || ""} ${m.observacion || ""} ${
        m.inventario_items?.codigo || ""
      } ${m.inventario_items?.nombre || ""} ${
        m.inventario_items?.categoria || ""
      } ${m.inventario_items?.tipo_activo || ""}`
        .toLowerCase()
        .trim();

      return (
        texto.includes(buscar.toLowerCase().trim()) &&
        (filtroTipo === "Todos" || m.tipo_movimiento === filtroTipo) &&
        (filtroResponsable === "Todos" ||
          m.responsable === filtroResponsable) &&
        (filtroOrigen === "Todos" || m.ubicacion_origen === filtroOrigen) &&
        (filtroDestino === "Todos" || m.ubicacion_destino === filtroDestino)
      );
    });
  }, [
    movimientos,
    buscar,
    filtroTipo,
    filtroResponsable,
    filtroOrigen,
    filtroDestino,
  ]);

  const totalMovimientos = movimientosFiltrados.length;

  const totalCantidad = movimientosFiltrados.reduce(
    (sum, m) => sum + numero(m.cantidad),
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
          title="Reporte de Movimientos"
          subtitle={`Historial de entradas, salidas, asignaciones, devoluciones, reparaciones y bajas. Condominio: ${
            condominioNombre || "No identificado"
          }.`}
          icon={ArrowRightLeft}
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
          subtitle="Busque y filtre movimientos por período, artículo, responsable, tipo, origen o destino."
          action={
            loading ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Cargando
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                <Filter className="h-4 w-4" />
                Registros: {movimientosFiltrados.length}
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
                placeholder="Buscar artículo, responsable..."
              />
            </div>

            <FilterSelect
              value={filtroTipo}
              onChange={setFiltroTipo}
              options={tipos}
              todosLabel="Todos los movimientos"
            />

            <FilterSelect
              value={filtroResponsable}
              onChange={setFiltroResponsable}
              options={responsables}
              todosLabel="Todos los responsables"
            />

            <FilterSelect
              value={filtroDestino}
              onChange={setFiltroDestino}
              options={destinos}
              todosLabel="Todos los destinos"
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
        title="Detalle de movimientos"
        subtitle={`${totalMovimientos} movimiento(s) encontrado(s).`}
        action={
          <div className="hidden rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 md:block">
            Cantidad: {totalCantidad.toFixed(2)}
          </div>
        }
      >
        <div className="mb-5 hidden border-b pb-3 print:block">
          <h1 className="text-center text-2xl font-black">
            REPORTE DE MOVIMIENTOS DE INVENTARIO
          </h1>

          <p className="text-center font-bold">{condominioNombre}</p>

          <p className="text-center text-sm">
            Período: {fecha(fechaDesde)} al {fecha(fechaHasta)} · Fecha
            impresión: {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando movimientos...</p>
        ) : movimientosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin movimientos"
            description="No hay movimientos para esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-center">Movimiento</th>
                <th className="px-4 py-3 text-left">Artículo</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-left">Responsable</th>
                <th className="px-4 py-3 text-left">Origen</th>
                <th className="px-4 py-3 text-left">Destino</th>
                <th className="px-4 py-3 text-left">Observación</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {movimientosFiltrados.map((mov) => (
                <tr key={mov.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold">
                    {fecha(mov.fecha_movimiento)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${movimientoClass(
                        mov.tipo_movimiento,
                      )}`}
                    >
                      {mov.tipo_movimiento || "-"}
                    </span>
                  </td>

                  <td className="min-w-72 px-4 py-3">
                    <p className="font-black text-slate-900">
                      {mov.inventario_items?.nombre || "-"}
                    </p>

                    <p className="text-xs text-slate-500">
                      Código: {mov.inventario_items?.codigo || mov.item_id}
                    </p>

                    <p className="text-xs text-slate-500">
                      Tipo: {mov.inventario_items?.tipo_activo || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    {mov.inventario_items?.categoria || "-"}
                  </td>

                  <td className="px-4 py-3 text-right font-black">
                    {numero(mov.cantidad).toFixed(2)}
                  </td>

                  <td className="px-4 py-3">{mov.responsable || "-"}</td>

                  <td className="px-4 py-3">
                    {mov.ubicacion_origen || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {mov.ubicacion_destino || "-"}
                  </td>

                  <td className="min-w-64 px-4 py-3">
                    {mov.observacion || "-"}
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

                <td className="px-4 py-3" colSpan={4}>
                  Registros: {totalMovimientos}
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