"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calculator,
  Download,
  FileBarChart,
  Filter,
  Landmark,
  ReceiptText,
  RefreshCw,
  Search,
  Wand2,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type GastoReal = {
  id: number;
  condominio_id: number;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  categoria: string | null;
  proveedor: string | null;
  metodo_pago: string | null;
  estado: string | null;
  total: number | null;
  monto: number | null;
  created_at: string | null;
};

type ResumenCategoria = {
  categoria: string;
  cantidad: number;
  total: number;
};

function numero(valor: string | number | null | undefined) {
  return Number(valor || 0);
}

function dinero(valor: string | number | null | undefined) {
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

function nombreMes(valor: string) {
  const meses = [
    "Todos",
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return meses[Number(valor)] || "Todos";
}

function estadoClass(estado: string | null | undefined) {
  const valor = String(estado || "").toLowerCase();

  if (valor === "pagado" || valor === "aprobado") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (valor === "pendiente") {
    return "border-yellow-100 bg-yellow-50 text-yellow-700";
  }

  if (valor === "anulado" || valor === "rechazado") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function PresupuestoRealPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState("0");
  const [buscar, setBuscar] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const [gastos, setGastos] = useState<GastoReal[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarGastos(id, anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarGastos(id: string, anioSeleccionado: number) {
    setLoading(true);
    setMensaje("");

    const fechaInicio = `${anioSeleccionado}-01-01`;
    const fechaFin = `${anioSeleccionado + 1}-01-01`;

    const { data, error } = await supabase
      .from("gastos")
      .select("*")
      .eq("condominio_id", Number(id))
      .gte("fecha", fechaInicio)
      .lt("fecha", fechaFin)
      .order("fecha", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando presupuesto real: " + error.message);
      setGastos([]);
      return;
    }

    setGastos((data as GastoReal[]) || []);
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarGastos(condominioId, anio);
  }

  async function cambiarAnio(valor: number) {
    setAnio(valor);

    if (!condominioId) return;

    await cargarGastos(condominioId, valor);
  }

  function limpiarFiltros() {
    setMes("0");
    setBuscar("");
    setFiltroCategoria("Todos");
    setFiltroEstado("Todos");
  }

  function montoGasto(gasto: GastoReal) {
    return numero(gasto.total || gasto.monto);
  }

  const categorias = useMemo(() => {
    const lista = gastos
      .map((g) => g.categoria || g.concepto || "Sin categoría")
      .filter(Boolean);

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [gastos]);

  const estados = useMemo(() => {
    const lista = gastos.map((g) => g.estado || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [gastos]);

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((g) => {
      const fechaGasto = g.fecha ? new Date(`${g.fecha}T00:00:00`) : null;
      const mesGasto = fechaGasto ? fechaGasto.getMonth() + 1 : 0;
      const categoria = g.categoria || g.concepto || "Sin categoría";

      const texto = `${g.concepto || ""} ${g.detalle_gasto || ""} ${
        g.categoria || ""
      } ${g.proveedor || ""} ${g.metodo_pago || ""} ${g.estado || ""}`
        .toLowerCase()
        .trim();

      return (
        texto.includes(buscar.toLowerCase().trim()) &&
        (mes === "0" || mesGasto === Number(mes)) &&
        (filtroCategoria === "Todos" || categoria === filtroCategoria) &&
        (filtroEstado === "Todos" || g.estado === filtroEstado)
      );
    });
  }, [gastos, buscar, mes, filtroCategoria, filtroEstado]);

  const resumenPorCategoria = useMemo(() => {
    const mapa = new Map<string, ResumenCategoria>();

    gastosFiltrados.forEach((gasto) => {
      const categoria = gasto.categoria || gasto.concepto || "Sin categoría";
      const actual =
        mapa.get(categoria) ||
        ({
          categoria,
          cantidad: 0,
          total: 0,
        } as ResumenCategoria);

      actual.cantidad += 1;
      actual.total += montoGasto(gasto);

      mapa.set(categoria, actual);
    });

    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [gastosFiltrados]);

  const totalReal = gastosFiltrados.reduce(
    (sum, gasto) => sum + montoGasto(gasto),
    0,
  );

  const totalAnual = gastos.reduce((sum, gasto) => sum + montoGasto(gasto), 0);

  const promedioMensual = totalAnual / 12;

  const mayorCategoria = resumenPorCategoria[0];

  function exportarCSV() {
    const encabezados = [
      "Fecha",
      "Categoría",
      "Concepto",
      "Detalle",
      "Proveedor",
      "Método Pago",
      "Estado",
      "Total",
    ];

    const filas = gastosFiltrados.map((g) => [
      g.fecha || "",
      g.categoria || "",
      g.concepto || "",
      g.detalle_gasto || "",
      g.proveedor || "",
      g.metodo_pago || "",
      g.estado || "",
      montoGasto(g).toFixed(2),
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
    a.download = `presupuesto_real_${anio}_${condominioNombre || "condominio"}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <PageContainer>
    <ModuleMenu
  title="Presupuesto"
  subtitle="Presupuesto anual, generador asistido, ejecución real y comparativo financiero."
  tone="blue"
  items={[
    {
      href: "/finanzas/configuraciones/presupuesto",
      label: "Presupuesto anual",
      icon: Calculator,
    },
    {
      href: "/finanzas/configuraciones/presupuesto/asistente",
      label: "Generador asistido",
      icon: Wand2,
    },
    {
      href: "/finanzas/configuraciones/presupuesto/real",
      label: "Presupuesto real",
      icon: ReceiptText,
    },
    {
      href: "/finanzas/configuraciones/presupuesto/comparativo",
      label: "Comparativo",
      icon: BarChart3,
    },
    {
      href: "/finanzas/configuraciones/presupuesto/asamblea",
      label: "Reporte asamblea",
      icon: FileBarChart,
    },
  ]}
/>

      <ModuleToolbar
        title="Presupuesto Real"
        subtitle={`Gastos reales ejecutados del condominio para medir la ejecución presupuestaria. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={ReceiptText}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/presupuesto"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Volver
                </Link>

                <button
                  type="button"
                  onClick={exportarCSV}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </button>
              </div>
            }
          />
        }
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Filtros"
        subtitle="Filtre los gastos reales por año, mes, categoría, estado o búsqueda general."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <Filter className="h-4 w-4" />
              Registros: {gastosFiltrados.length}
            </div>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Año
            </label>
            <input
              type="number"
              value={anio}
              onChange={(e) => cambiarAnio(Number(e.target.value))}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Mes
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="0">Todos</option>
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Categoría
            </label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              {categorias.map((item) => (
                <option key={item} value={item}>
                  {item === "Todos" ? "Todas las categorías" : item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              {estados.map((item) => (
                <option key={item} value={item}>
                  {item === "Todos" ? "Todos los estados" : item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Buscar
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />

              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Buscar gasto..."
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
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

      <SectionCard
        title="Resumen real ejecutado"
        subtitle={`Resumen del período seleccionado: ${nombreMes(mes)} ${anio}.`}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <InfoCompacta
            label="Total período"
            value={`RD$ ${dinero(totalReal)}`}
          />
          <InfoCompacta
            label="Total anual"
            value={`RD$ ${dinero(totalAnual)}`}
          />
          <InfoCompacta
            label="Promedio mensual"
            value={`RD$ ${dinero(promedioMensual)}`}
          />
          <InfoCompacta
            label="Registros"
            value={`${gastosFiltrados.length}`}
          />
          <InfoCompacta
            label="Mayor categoría"
            value={mayorCategoria ? mayorCategoria.categoria : "-"}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Resumen por categoría"
        subtitle="Agrupación de gastos reales por categoría o concepto."
      >
        {resumenPorCategoria.length === 0 ? (
          <EmptyState
            title="Sin resumen"
            description="No hay gastos para agrupar en este período."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">% del total</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {resumenPorCategoria.map((item) => {
                const porcentaje =
                  totalReal > 0 ? (item.total / totalReal) * 100 : 0;

                return (
                  <tr key={item.categoria} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-black">{item.categoria}</td>
                    <td className="px-4 py-3 text-right">{item.cantidad}</td>
                    <td className="px-4 py-3 text-right font-black">
                      RD$ {dinero(item.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {porcentaje.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-slate-100 font-black">
                <td className="px-4 py-3">Totales</td>
                <td className="px-4 py-3 text-right">
                  {gastosFiltrados.length}
                </td>
                <td className="px-4 py-3 text-right">
                  RD$ {dinero(totalReal)}
                </td>
                <td className="px-4 py-3 text-right">100%</td>
              </tr>
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      <SectionCard
        title="Detalle de gastos reales"
        subtitle={`${gastosFiltrados.length} gasto(s) encontrado(s).`}
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando presupuesto real...</p>
        ) : gastosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin gastos reales"
            description="No hay gastos reales registrados para esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-left">Detalle</th>
                <th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-left">Método</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {gastosFiltrados.map((g) => (
                <tr key={g.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold">{fecha(g.fecha)}</td>

                  <td className="px-4 py-3">
                    {g.categoria || g.concepto || "Sin categoría"}
                  </td>

                  <td className="px-4 py-3 font-black">
                    {g.concepto || "-"}
                  </td>

                  <td className="min-w-72 px-4 py-3 text-sm text-slate-500">
                    {g.detalle_gasto || "-"}
                  </td>

                  <td className="px-4 py-3">{g.proveedor || "-"}</td>

                  <td className="px-4 py-3">{g.metodo_pago || "-"}</td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoClass(
                        g.estado,
                      )}`}
                    >
                      {g.estado || "-"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right font-black text-blue-700">
                    RD$ {dinero(montoGasto(g))}
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-100 font-black">
                <td className="px-4 py-3" colSpan={7}>
                  Total
                </td>

                <td className="px-4 py-3 text-right text-blue-700">
                  RD$ {dinero(totalReal)}
                </td>
              </tr>
            </tbody>
          </DataTable>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function InfoCompacta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <h3 className="mt-1 text-lg font-black text-slate-900">{value}</h3>
    </div>
  );
}