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

type Presupuesto = {
  id: number;
  condominio_id: number;
  anio: number;
  nombre: string;
  cuota_actual: number | null;
  cantidad_unidades: number | null;
  porcentaje_reserva: number | null;
  total_mensual_estimado: number | null;
  total_anual_estimado: number | null;
  total_reserva_mensual: number | null;
  total_mensual_con_reserva: number | null;
  cuota_sugerida: number | null;
  estado: string | null;
  created_at: string | null;
};

type DetallePresupuesto = {
  id: number;
  presupuesto_id: number;
  condominio_id: number;
  categoria: string | null;
  concepto: string | null;
  tipo_gasto: string | null;
  monto_mensual_estimado: number | null;
  monto_anual_estimado: number | null;
  observacion: string | null;
  estado: string | null;
};

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

type EstadoComparativo = "BIEN" | "ALERTA" | "EXCEDIDO" | "SIN PRESUPUESTO";

type ComparativoCategoria = {
  categoria: string;
  presupuestadoMensual: number;
  presupuestadoAnual: number;
  ejecutado: number;
  diferencia: number;
  porcentajeEjecucion: number;
  estado: EstadoComparativo;
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

function montoGasto(gasto: GastoReal) {
  return numero(gasto.total || gasto.monto);
}

function normalizarCategoria(valor: string | null | undefined) {
  const texto = String(valor || "Sin categoría").trim();
  return texto || "Sin categoría";
}

function claveCategoria(valor: string | null | undefined) {
  return normalizarCategoria(valor).toLowerCase();
}

function estadoComparativoClass(estado: string) {
  if (estado === "BIEN") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (estado === "ALERTA") {
    return "border-yellow-100 bg-yellow-50 text-yellow-700";
  }

  if (estado === "EXCEDIDO") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function estadoPresupuestoClass(estado: string | null | undefined) {
  if (estado === "APROBADO") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (estado === "BORRADOR") {
    return "border-yellow-100 bg-yellow-50 text-yellow-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
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

export default function PresupuestoComparativoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState("0");
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const [cantidadUnidades, setCantidadUnidades] = useState(0);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestoActivo, setPresupuestoActivo] =
    useState<Presupuesto | null>(null);

  const [detalles, setDetalles] = useState<DetallePresupuesto[]>([]);
  const [gastos, setGastos] = useState<GastoReal[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id || !Number(id)) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarInicial(id, anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarInicial(id: string, anioSeleccionado: number) {
    setLoading(true);
    setMensaje("");

    await cargarCantidadUnidades(id);
    await cargarPresupuestos(id, anioSeleccionado);
    await cargarGastos(id, anioSeleccionado);

    setLoading(false);
  }

  async function cargarCantidadUnidades(id: string) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) {
      setCantidadUnidades(0);
      return;
    }

    const { count, error } = await supabase
      .from("unidades")
      .select("id", { count: "exact", head: true })
      .eq("condominio_id", condominioIdNumero)
      .eq("activa", true);

    if (error) {
      setMensaje("Error cargando unidades: " + error.message);
      setCantidadUnidades(0);
      return;
    }

    setCantidadUnidades(count || 0);
  }

  async function cargarPresupuestos(id: string, anioSeleccionado: number) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) {
      setPresupuestos([]);
      setPresupuestoActivo(null);
      setDetalles([]);
      return;
    }

    const { data, error } = await supabase
      .from("presupuesto_condominio")
      .select("*")
      .eq("condominio_id", condominioIdNumero)
      .eq("anio", anioSeleccionado)
      .order("id", { ascending: false });

    if (error) {
      setMensaje("Error cargando presupuestos: " + error.message);
      setPresupuestos([]);
      setPresupuestoActivo(null);
      setDetalles([]);
      return;
    }

    const lista = ((data as Presupuesto[]) || []).filter(
      (p) => Number(p.condominio_id) === condominioIdNumero,
    );

    setPresupuestos(lista);

    if (lista.length === 0) {
      setPresupuestoActivo(null);
      setDetalles([]);
      return;
    }

    const aprobado = lista.find((p) => p.estado === "APROBADO");
    const borrador = lista.find((p) => p.estado === "BORRADOR");
    const seleccionado = aprobado || borrador || lista[0];

    setPresupuestoActivo(seleccionado);

    await cargarDetalles(id, seleccionado.id);
  }

  async function cargarDetalles(id: string, presupuestoId: number) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero || !presupuestoId) {
      setDetalles([]);
      return;
    }

    const { data, error } = await supabase
      .from("presupuesto_condominio_detalle")
      .select("*")
      .eq("condominio_id", condominioIdNumero)
      .eq("presupuesto_id", presupuestoId)
      .order("categoria", { ascending: true })
      .order("concepto", { ascending: true });

    if (error) {
      setMensaje("Error cargando partidas presupuestadas: " + error.message);
      setDetalles([]);
      return;
    }

    const lista = ((data as DetallePresupuesto[]) || []).filter(
      (d) =>
        Number(d.condominio_id) === condominioIdNumero &&
        Number(d.presupuesto_id) === Number(presupuestoId),
    );

    setDetalles(lista);
  }

  async function cargarGastos(id: string, anioSeleccionado: number) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) {
      setGastos([]);
      return;
    }

    const fechaInicio = `${anioSeleccionado}-01-01`;
    const fechaFin = `${anioSeleccionado + 1}-01-01`;

    const { data, error } = await supabase
      .from("gastos")
      .select("*")
      .eq("condominio_id", condominioIdNumero)
      .gte("fecha", fechaInicio)
      .lt("fecha", fechaFin)
      .order("fecha", { ascending: false });

    if (error) {
      setMensaje("Error cargando gastos reales: " + error.message);
      setGastos([]);
      return;
    }

    const lista = ((data as GastoReal[]) || []).filter(
      (g) => Number(g.condominio_id) === condominioIdNumero,
    );

    setGastos(lista);
  }

  async function refrescar() {
    if (!condominioId || !Number(condominioId)) return;
    await cargarInicial(condominioId, anio);
  }

  async function cambiarAnio(valor: number) {
    setAnio(valor);

    if (!condominioId || !Number(condominioId)) return;

    setPresupuestoActivo(null);
    setDetalles([]);
    setGastos([]);

    await cargarInicial(condominioId, valor);
  }

  async function seleccionarPresupuesto(idPresupuesto: number) {
    if (!condominioId || !Number(condominioId)) return;

    const condominioIdNumero = Number(condominioId);

    const presupuesto = presupuestos.find(
      (p) =>
        Number(p.id) === Number(idPresupuesto) &&
        Number(p.condominio_id) === condominioIdNumero,
    );

    if (!presupuesto) {
      setPresupuestoActivo(null);
      setDetalles([]);
      return;
    }

    setPresupuestoActivo(presupuesto);
    await cargarDetalles(condominioId, presupuesto.id);
  }

  function limpiarFiltros() {
    setMes("0");
    setBuscar("");
    setFiltroEstado("Todos");
  }

  const detallesSeguros = useMemo(() => {
    const condominioIdNumero = Number(condominioId);
    const presupuestoId = Number(presupuestoActivo?.id || 0);

    if (!condominioIdNumero || !presupuestoId) return [];

    return detalles.filter(
      (d) =>
        Number(d.condominio_id) === condominioIdNumero &&
        Number(d.presupuesto_id) === presupuestoId,
    );
  }, [detalles, condominioId, presupuestoActivo]);

  const gastosSeguros = useMemo(() => {
    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) return [];

    return gastos.filter((g) => Number(g.condominio_id) === condominioIdNumero);
  }, [gastos, condominioId]);

  const gastosFiltradosPorMes = useMemo(() => {
    return gastosSeguros.filter((g) => {
      const fechaGasto = g.fecha ? new Date(`${g.fecha}T00:00:00`) : null;
      const mesGasto = fechaGasto ? fechaGasto.getMonth() + 1 : 0;

      return mes === "0" || mesGasto === Number(mes);
    });
  }, [gastosSeguros, mes]);

  const comparativo = useMemo(() => {
    const mapa = new Map<string, ComparativoCategoria>();

    detallesSeguros.forEach((d) => {
      const categoria = normalizarCategoria(d.categoria);
      const clave = claveCategoria(categoria);

      const actual =
        mapa.get(clave) ||
        ({
          categoria,
          presupuestadoMensual: 0,
          presupuestadoAnual: 0,
          ejecutado: 0,
          diferencia: 0,
          porcentajeEjecucion: 0,
          estado: "BIEN",
        } as ComparativoCategoria);

      actual.presupuestadoMensual += numero(d.monto_mensual_estimado);
      actual.presupuestadoAnual += numero(d.monto_anual_estimado);

      mapa.set(clave, actual);
    });

    gastosFiltradosPorMes.forEach((g) => {
      const categoriaGasto = normalizarCategoria(g.categoria || g.concepto);
      const clave = claveCategoria(categoriaGasto);

      const actual = mapa.get(clave);

      /*
        Importante:
        No se crean categorías nuevas desde gastos.
        Esto evita que entren partidas o categorías que no pertenecen
        al presupuesto activo del condominio seleccionado.
      */
      if (!actual) return;

      actual.ejecutado += montoGasto(g);

      mapa.set(clave, actual);
    });

    return Array.from(mapa.values())
      .map((item) => {
        const basePresupuesto =
          mes === "0" ? item.presupuestadoAnual : item.presupuestadoMensual;

        const diferencia = basePresupuesto - item.ejecutado;

        const porcentajeEjecucion =
          basePresupuesto > 0 ? (item.ejecutado / basePresupuesto) * 100 : 0;

        let estado: EstadoComparativo = "BIEN";

        if (basePresupuesto <= 0 && item.ejecutado > 0) {
          estado = "SIN PRESUPUESTO";
        } else if (porcentajeEjecucion > 100) {
          estado = "EXCEDIDO";
        } else if (porcentajeEjecucion >= 85) {
          estado = "ALERTA";
        } else {
          estado = "BIEN";
        }

        return {
          ...item,
          diferencia,
          porcentajeEjecucion,
          estado,
        };
      })
      .sort((a, b) => b.ejecutado - a.ejecutado);
  }, [detallesSeguros, gastosFiltradosPorMes, mes]);

  const comparativoFiltrado = useMemo(() => {
    const q = buscar.toLowerCase().trim();

    return comparativo.filter((item) => {
      return (
        item.categoria.toLowerCase().includes(q) &&
        (filtroEstado === "Todos" || item.estado === filtroEstado)
      );
    });
  }, [comparativo, buscar, filtroEstado]);

  const totalPresupuestadoMensual = detallesSeguros.reduce(
    (sum, d) => sum + numero(d.monto_mensual_estimado),
    0,
  );

  const totalPresupuestadoAnual = detallesSeguros.reduce(
    (sum, d) => sum + numero(d.monto_anual_estimado),
    0,
  );

  const totalPresupuestadoPeriodo =
    mes === "0" ? totalPresupuestadoAnual : totalPresupuestadoMensual;

  const totalEjecutadoPeriodo = comparativo.reduce(
    (sum, item) => sum + numero(item.ejecutado),
    0,
  );

  const diferenciaTotal = totalPresupuestadoPeriodo - totalEjecutadoPeriodo;

  const porcentajeEjecucionTotal =
    totalPresupuestadoPeriodo > 0
      ? (totalEjecutadoPeriodo / totalPresupuestadoPeriodo) * 100
      : 0;

  const totalAnualReal = gastosSeguros.reduce(
    (sum, g) => sum + montoGasto(g),
    0,
  );

  const promedioRealMensual = totalAnualReal / 12;

  const cuotaActual = numero(presupuestoActivo?.cuota_actual);
  const cuotaSugeridaPresupuesto = numero(presupuestoActivo?.cuota_sugerida);
  const cuotaSugeridaReal =
    cantidadUnidades > 0 ? promedioRealMensual / cantidadUnidades : 0;

  const categoriasExcedidas = comparativo.filter(
    (c) => c.estado === "EXCEDIDO",
  ).length;

  const categoriasAlerta = comparativo.filter(
    (c) => c.estado === "ALERTA",
  ).length;

  function exportarCSV() {
    const encabezados = [
      "Categoría",
      "Presupuestado mensual",
      "Presupuestado anual",
      "Ejecutado período",
      "Diferencia",
      "% Ejecución",
      "Estado",
    ];

    const filas = comparativoFiltrado.map((item) => [
      item.categoria,
      item.presupuestadoMensual.toFixed(2),
      item.presupuestadoAnual.toFixed(2),
      item.ejecutado.toFixed(2),
      item.diferencia.toFixed(2),
      item.porcentajeEjecucion.toFixed(2),
      item.estado,
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
    a.download = `comparativo_presupuesto_${anio}_${
      condominioNombre || "condominio"
    }.csv`;
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
        title="Comparativo Presupuesto vs Real"
        subtitle={`Evalúa lo presupuestado contra los gastos reales ejecutados. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={Landmark}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/finanzas/configuraciones/presupuesto"
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
        title="Filtros del comparativo"
        subtitle="Seleccione año, presupuesto, mes y estado de ejecución."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : presupuestoActivo ? (
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoPresupuestoClass(
                presupuestoActivo.estado,
              )}`}
            >
              {presupuestoActivo.nombre} · {presupuestoActivo.estado || "-"}
            </span>
          ) : (
            <span className="inline-flex rounded-full border bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
              Sin presupuesto
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
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

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Presupuesto
            </label>
            <select
              value={presupuestoActivo?.id || ""}
              onChange={(e) => seleccionarPresupuesto(Number(e.target.value))}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione</option>
              {presupuestos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} - {p.estado}
                </option>
              ))}
            </select>
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
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="Todos">Todos</option>
              <option value="BIEN">Bien</option>
              <option value="ALERTA">Alerta</option>
              <option value="EXCEDIDO">Excedido</option>
              <option value="SIN PRESUPUESTO">Sin presupuesto</option>
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
                placeholder="Buscar categoría..."
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
        title="Resumen comparativo"
        subtitle={`Período evaluado: ${nombreMes(mes)} ${anio}.`}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <InfoCompacta
            label="Presupuestado período"
            value={`RD$ ${dinero(totalPresupuestadoPeriodo)}`}
          />
          <InfoCompacta
            label="Ejecutado período"
            value={`RD$ ${dinero(totalEjecutadoPeriodo)}`}
          />
          <InfoCompacta
            label="Diferencia"
            value={`RD$ ${dinero(diferenciaTotal)}`}
          />
          <InfoCompacta
            label="% ejecución"
            value={`${porcentajeEjecucionTotal.toFixed(2)}%`}
          />
          <InfoCompacta
            label="Excedidas / alerta"
            value={`${categoriasExcedidas} / ${categoriasAlerta}`}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Evaluación de cuota"
        subtitle="Comparación entre cuota actual, cuota presupuestada y cuota sugerida por gasto real."
      >
        <DataTable>
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Concepto</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3 text-left">Observación</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            <tr className="bg-white">
              <td className="px-4 py-3 font-black">Cuota actual</td>
              <td className="px-4 py-3 text-right font-black">
                RD$ {dinero(cuotaActual)}
              </td>
              <td className="px-4 py-3">
                Cuota registrada en el presupuesto seleccionado.
              </td>
            </tr>

            <tr className="bg-white">
              <td className="px-4 py-3 font-black">
                Cuota sugerida por presupuesto
              </td>
              <td className="px-4 py-3 text-right font-black text-blue-700">
                RD$ {dinero(cuotaSugeridaPresupuesto)}
              </td>
              <td className="px-4 py-3">
                Calculada según partidas presupuestadas y unidades activas.
              </td>
            </tr>

            <tr className="bg-white">
              <td className="px-4 py-3 font-black">
                Cuota sugerida por gasto real
              </td>
              <td className="px-4 py-3 text-right font-black text-orange-700">
                RD$ {dinero(cuotaSugeridaReal)}
              </td>
              <td className="px-4 py-3">
                Basada en el promedio mensual real del año dividido entre{" "}
                {cantidadUnidades} unidad(es).
              </td>
            </tr>

            <tr className="bg-emerald-50 font-black text-emerald-900">
              <td className="px-4 py-3">Promedio mensual real</td>
              <td className="px-4 py-3 text-right">
                RD$ {dinero(promedioRealMensual)}
              </td>
              <td className="px-4 py-3">
                Gasto anual real dividido entre 12 meses.
              </td>
            </tr>
          </tbody>
        </DataTable>
      </SectionCard>

      <SectionCard
        title="Detalle comparativo por categoría"
        subtitle={`${comparativoFiltrado.length} categoría(s) encontrada(s).`}
        action={
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
            <Filter className="h-4 w-4" />
            {comparativoFiltrado.length} registros
          </div>
        }
      >
        {comparativoFiltrado.length === 0 ? (
          <EmptyState
            title="Sin información"
            description="No hay datos suficientes para generar el comparativo."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-right">Presup. mensual</th>
                <th className="px-4 py-3 text-right">Presup. anual</th>
                <th className="px-4 py-3 text-right">Ejecutado</th>
                <th className="px-4 py-3 text-right">Diferencia</th>
                <th className="px-4 py-3 text-right">% ejecución</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {comparativoFiltrado.map((item) => (
                <tr key={item.categoria} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-black">{item.categoria}</td>

                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(item.presupuestadoMensual)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(item.presupuestadoAnual)}
                  </td>

                  <td className="px-4 py-3 text-right font-black text-blue-700">
                    RD$ {dinero(item.ejecutado)}
                  </td>

                  <td
                    className={`px-4 py-3 text-right font-black ${
                      item.diferencia < 0 ? "text-red-700" : "text-emerald-700"
                    }`}
                  >
                    RD$ {dinero(item.diferencia)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {item.porcentajeEjecucion.toFixed(2)}%
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoComparativoClass(
                        item.estado,
                      )}`}
                    >
                      {item.estado}
                    </span>
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-100 font-black">
                <td className="px-4 py-3">Totales</td>
                <td className="px-4 py-3 text-right">
                  RD$ {dinero(totalPresupuestadoMensual)}
                </td>
                <td className="px-4 py-3 text-right">
                  RD$ {dinero(totalPresupuestadoAnual)}
                </td>
                <td className="px-4 py-3 text-right text-blue-700">
                  RD$ {dinero(totalEjecutadoPeriodo)}
                </td>
                <td
                  className={`px-4 py-3 text-right ${
                    diferenciaTotal < 0 ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  RD$ {dinero(diferenciaTotal)}
                </td>
                <td className="px-4 py-3 text-right">
                  {porcentajeEjecucionTotal.toFixed(2)}%
                </td>
                <td className="px-4 py-3"></td>
              </tr>
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
        Este comparativo solo muestra categorías del presupuesto activo del
        condominio seleccionado. Los gastos reales que no coincidan con una
        categoría presupuestada no se agregan al detalle comparativo.
      </div>
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