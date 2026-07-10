"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calculator,
  Download,
  FileBarChart,
  Landmark,
  Printer,
  ReceiptText,
  RefreshCw,
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

type ResumenCategoria = {
  categoria: string;
  presupuestadoMensual: number;
  presupuestadoAnual: number;
  ejecutadoAnual: number;
  diferencia: number;
  porcentajeEjecucion: number;
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
  return String(valor || "Sin categoría").trim();
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

export default function PresupuestoAsambleaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [cantidadUnidades, setCantidadUnidades] = useState(0);

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestoActivo, setPresupuestoActivo] =
    useState<Presupuesto | null>(null);

  const [detalles, setDetalles] = useState<DetallePresupuesto[]>([]);
  const [gastos, setGastos] = useState<GastoReal[]>([]);

  const [tituloReporte, setTituloReporte] = useState(
    "Propuesta de Presupuesto Anual",
  );

  const [notaAsamblea, setNotaAsamblea] = useState(
    "Este reporte presenta el presupuesto estimado, la cuota sugerida y los principales renglones de gastos para conocimiento y aprobación de la asamblea.",
  );

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
      setMensaje("Error cargando detalle del presupuesto: " + error.message);
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

  function imprimir() {
    window.print();
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

  const resumenCategorias = useMemo(() => {
    const condominioIdNumero = Number(condominioId);
    const presupuestoId = Number(presupuestoActivo?.id || 0);

    if (!condominioIdNumero || !presupuestoId) return [];

    const mapa = new Map<string, ResumenCategoria>();

    /**
     * Primero se crean las categorías SOLO desde las partidas del presupuesto activo.
     * Esto evita que gastos sueltos creen categorías mezcladas en el reporte.
     */
    detalles
      .filter(
        (d) =>
          Number(d.condominio_id) === condominioIdNumero &&
          Number(d.presupuesto_id) === presupuestoId,
      )
      .forEach((d) => {
        const categoria = normalizarCategoria(d.categoria);

        const actual =
          mapa.get(categoria) ||
          ({
            categoria,
            presupuestadoMensual: 0,
            presupuestadoAnual: 0,
            ejecutadoAnual: 0,
            diferencia: 0,
            porcentajeEjecucion: 0,
          } as ResumenCategoria);

        actual.presupuestadoMensual += numero(d.monto_mensual_estimado);
        actual.presupuestadoAnual += numero(d.monto_anual_estimado);

        mapa.set(categoria, actual);
      });

    /**
     * Luego se suman los gastos reales SOLO si:
     * - pertenecen al condominio activo
     * - la categoría existe dentro del presupuesto seleccionado
     */
    gastos
      .filter((g) => Number(g.condominio_id) === condominioIdNumero)
      .forEach((g) => {
        const categoriaGasto = normalizarCategoria(g.categoria || g.concepto);
        const actual = mapa.get(categoriaGasto);

        if (!actual) return;

        actual.ejecutadoAnual += montoGasto(g);

        mapa.set(categoriaGasto, actual);
      });

    return Array.from(mapa.values())
      .map((item) => {
        const diferencia = item.presupuestadoAnual - item.ejecutadoAnual;

        const porcentajeEjecucion =
          item.presupuestadoAnual > 0
            ? (item.ejecutadoAnual / item.presupuestadoAnual) * 100
            : 0;

        return {
          ...item,
          diferencia,
          porcentajeEjecucion,
        };
      })
      .sort((a, b) => b.presupuestadoAnual - a.presupuestadoAnual);
  }, [detalles, gastos, condominioId, presupuestoActivo]);

  const totalPresupuestoMensual = detallesSeguros.reduce(
    (sum, d) => sum + numero(d.monto_mensual_estimado),
    0,
  );

  const totalPresupuestoAnual = detallesSeguros.reduce(
    (sum, d) => sum + numero(d.monto_anual_estimado),
    0,
  );

  const totalRealAnual = resumenCategorias.reduce(
    (sum, item) => sum + numero(item.ejecutadoAnual),
    0,
  );

  const diferenciaAnual = totalPresupuestoAnual - totalRealAnual;

  const porcentajeEjecucion =
    totalPresupuestoAnual > 0
      ? (totalRealAnual / totalPresupuestoAnual) * 100
      : 0;

  const cuotaActual = numero(presupuestoActivo?.cuota_actual);
  const cuotaSugerida = numero(presupuestoActivo?.cuota_sugerida);
  const cuotaRedondeada =
    cuotaSugerida > 0 ? Math.ceil(cuotaSugerida / 100) * 100 : 0;

  const ingresoMensualActual = cuotaActual * cantidadUnidades;
  const ingresoAnualActual = ingresoMensualActual * 12;

  const ingresoMensualSugerido = cuotaSugerida * cantidadUnidades;
  const ingresoAnualSugerido = ingresoMensualSugerido * 12;

  const diferenciaCuota = cuotaSugerida - cuotaActual;
  const diferenciaIngresoMensual = ingresoMensualSugerido - ingresoMensualActual;

  function exportarCSV() {
    const encabezados = [
      "Categoría",
      "Presupuestado mensual",
      "Presupuestado anual",
      "Ejecutado anual",
      "Diferencia",
      "% ejecución",
    ];

    const filas = resumenCategorias.map((item) => [
      item.categoria,
      item.presupuestadoMensual.toFixed(2),
      item.presupuestadoAnual.toFixed(2),
      item.ejecutadoAnual.toFixed(2),
      item.diferencia.toFixed(2),
      item.porcentajeEjecucion.toFixed(2),
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
    a.download = `reporte_asamblea_presupuesto_${anio}_${
      condominioNombre || "condominio"
    }.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <PageContainer>
      <div className="no-print">
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
          title="Reporte para Asamblea"
          subtitle={`Resumen profesional del presupuesto, cuota sugerida y comparativo anual. Condominio: ${
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
        <div className="no-print rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <div className="no-print">
        <SectionCard
          title="Parámetros del reporte"
          subtitle="Seleccione el año, presupuesto y personalice el texto para asamblea."
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

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Título del reporte
              </label>
              <input
                value={tituloReporte}
                onChange={(e) => setTituloReporte(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>

            <div className="md:col-span-5">
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Nota para asamblea
              </label>
              <textarea
                value={notaAsamblea}
                onChange={(e) => setNotaAsamblea(e.target.value)}
                className="min-h-24 w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title={tituloReporte}
        subtitle={`Residencial / Condominio: ${
          condominioNombre || "No identificado"
        } · Año ${anio}`}
      >
        <div className="mb-6 hidden border-b pb-4 print:block">
          <h1 className="text-center text-2xl font-black uppercase">
            {tituloReporte}
          </h1>
          <p className="mt-1 text-center text-sm font-bold">
            {condominioNombre || "Condominio no identificado"}
          </p>
          <p className="text-center text-sm">
            Año presupuestado: {anio} · Fecha impresión:{" "}
            {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        {!presupuestoActivo ? (
          <EmptyState
            title="Sin presupuesto"
            description="No hay presupuesto seleccionado para generar el reporte."
          />
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-slate-50 p-5">
              <h2 className="text-lg font-black text-slate-900">
                Resumen ejecutivo
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {notaAsamblea}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <InfoCompacta
                label="Unidades activas"
                value={`${cantidadUnidades}`}
              />
              <InfoCompacta
                label="Cuota actual"
                value={`RD$ ${dinero(cuotaActual)}`}
              />
              <InfoCompacta
                label="Cuota sugerida"
                value={`RD$ ${dinero(cuotaSugerida)}`}
              />
              <InfoCompacta
                label="Cuota redondeada"
                value={`RD$ ${dinero(cuotaRedondeada)}`}
              />
            </div>

            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-right">Mensual</th>
                  <th className="px-4 py-3 text-right">Anual</th>
                  <th className="px-4 py-3 text-left">Observación</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 font-black">
                    Ingreso con cuota actual
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(ingresoMensualActual)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(ingresoAnualActual)}
                  </td>
                  <td className="px-4 py-3">
                    Basado en {cantidadUnidades} unidad(es) activas.
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-3 font-black">
                    Presupuesto estimado
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(totalPresupuestoMensual)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(totalPresupuestoAnual)}
                  </td>
                  <td className="px-4 py-3">
                    Total de partidas presupuestadas.
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-3 font-black">
                    Ingreso con cuota sugerida
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(ingresoMensualSugerido)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(ingresoAnualSugerido)}
                  </td>
                  <td className="px-4 py-3">
                    Diferencia mensual estimada: RD${" "}
                    {dinero(diferenciaIngresoMensual)}.
                  </td>
                </tr>

                <tr className="bg-blue-50 font-black text-blue-900">
                  <td className="px-4 py-3">
                    Diferencia por unidad recomendada
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(diferenciaCuota)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(diferenciaCuota * 12)}
                  </td>
                  <td className="px-4 py-3">
                    Diferencia entre cuota actual y cuota sugerida.
                  </td>
                </tr>
              </tbody>
            </DataTable>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Resumen por categoría"
        subtitle="Detalle consolidado para revisión de la asamblea."
      >
        {resumenCategorias.length === 0 ? (
          <EmptyState
            title="Sin partidas"
            description="No hay partidas presupuestarias para mostrar."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-right">Presup. mensual</th>
                <th className="px-4 py-3 text-right">Presup. anual</th>
                <th className="px-4 py-3 text-right">Ejecutado anual</th>
                <th className="px-4 py-3 text-right">Diferencia</th>
                <th className="px-4 py-3 text-right">% ejecución</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {resumenCategorias.map((item) => (
                <tr key={item.categoria} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-black">{item.categoria}</td>

                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(item.presupuestadoMensual)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(item.presupuestadoAnual)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(item.ejecutadoAnual)}
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
                </tr>
              ))}

              <tr className="bg-slate-100 font-black">
                <td className="px-4 py-3">Totales</td>

                <td className="px-4 py-3 text-right">
                  RD$ {dinero(totalPresupuestoMensual)}
                </td>

                <td className="px-4 py-3 text-right">
                  RD$ {dinero(totalPresupuestoAnual)}
                </td>

                <td className="px-4 py-3 text-right">
                  RD$ {dinero(totalRealAnual)}
                </td>

                <td
                  className={`px-4 py-3 text-right ${
                    diferenciaAnual < 0 ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  RD$ {dinero(diferenciaAnual)}
                </td>

                <td className="px-4 py-3 text-right">
                  {porcentajeEjecucion.toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 print:border-0">
        <p className="font-black text-slate-900">Nota:</p>
        <p>
          Este reporte es una herramienta de apoyo para la presentación y
          revisión del presupuesto anual en asamblea. Los montos pueden ser
          ajustados por la administración antes de su aprobación definitiva.
        </p>
      </div>

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