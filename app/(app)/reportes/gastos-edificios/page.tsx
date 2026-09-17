"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Gauge,
  Landmark,
  Loader2,
  Minus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Tags,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type EdificioRelacion = {
  codigo: string | null;
  nombre: string | null;
};

type DistribucionSolicitud = {
  id: number;
  solicitud_id: number;
  edificio_id: number;
  monto_asignado: number | string;
  porcentaje_asignado: number | string | null;
  edificios?: EdificioRelacion | EdificioRelacion[] | null;
};

type ProveedorRelacion = {
  nombre_proveedor: string | null;
};

type CategoriaRelacion = {
  nombre_categoria: string | null;
};

type SolicitudPago = {
  id: number;
  numero_solicitud: number | null;
  condominio_id: number | null;
  fecha_solicitud: string | null;
  concepto: string | null;
  detalle: string | null;
  total: number | string | null;
  estado: string | null;
  prioridad: string | null;
  no_factura: string | null;
  ncf: string | null;
  alcance_gasto: string | null;
  catalogo_proveedores?:
    | ProveedorRelacion
    | ProveedorRelacion[]
    | null;
  catalogo_categoria_gastos?:
    | CategoriaRelacion
    | CategoriaRelacion[]
    | null;
  solicitudes_pago_edificios?: DistribucionSolicitud[] | null;
};

type DetalleDistribucion = {
  id: string;
  solicitudId: number;
  numeroSolicitud: number | null;
  fecha: string;
  edificioId: number;
  edificioCodigo: string;
  edificioNombre: string;
  concepto: string;
  proveedor: string;
  categoria: string;
  estado: string;
  prioridad: string;
  noFactura: string;
  ncf: string;
  totalSolicitud: number;
  montoAsignado: number;
  porcentajeAsignado: number;
};

type ResumenEdificio = {
  edificioId: number;
  codigo: string;
  nombre: string;
  total: number;
  totalAnterior: number;
  variacionAbsoluta: number;
  variacionPorcentual: number | null;
  cantidadSolicitudes: number;
  porcentajeGeneral: number;
  detalles: DetalleDistribucion[];
};

type RankingItem = {
  nombre: string;
  total: number;
  porcentaje: number;
  cantidad: number;
};

type AlertaGerencial = {
  nivel: "alto" | "medio" | "info";
  titulo: string;
  detalle: string;
};

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const limpio = String(value)
    .replace(/RD\$/gi, "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();

  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : 0;
}

function formatMoney(value: unknown): string {
  return moneda.format(toNumber(value));
}

function textoRelacion<T>(
  relacion: T | T[] | null | undefined,
  campo: keyof T,
  fallback = "-"
): string {
  const objeto = Array.isArray(relacion) ? relacion[0] : relacion;
  const valor = objeto?.[campo];
  const texto = String(valor ?? "").trim();
  return texto || fallback;
}

function formatDate(value: unknown): string {
  if (!value) return "-";

  const texto = String(value).slice(0, 10);
  const [anio, mes, dia] = texto.split("-");

  if (!anio || !mes || !dia) return texto;

  return `${dia}/${mes}/${anio}`;
}

function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function periodoAnterior(periodo: string): string {
  const [anioTexto, mesTexto] = periodo.split("-");
  const fecha = new Date(Number(anioTexto), Number(mesTexto) - 2, 1);

  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function nombrePeriodo(periodo: string): string {
  const [anioTexto, mesTexto] = periodo.split("-");
  const anio = Number(anioTexto);
  const mes = Number(mesTexto);

  if (!anio || !mes || mes < 1 || mes > 12) return periodo;

  const fecha = new Date(anio, mes - 1, 1);
  const nombreMes = fecha.toLocaleDateString("es-DO", { month: "long" });

  return `${nombreMes.charAt(0).toUpperCase()}${nombreMes.slice(1)} ${anio}`;
}

function rangoPeriodo(periodo: string) {
  const [anioTexto, mesTexto] = periodo.split("-");
  const anio = Number(anioTexto);
  const mes = Number(mesTexto);

  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const siguiente = new Date(anio, mes, 1);

  const hasta = `${siguiente.getFullYear()}-${String(
    siguiente.getMonth() + 1,
  ).padStart(2, "0")}-01`;

  return { desde, hasta };
}

function generarPeriodos(cantidad = 36): string[] {
  const hoy = new Date();
  const resultado: string[] = [];

  for (let i = 0; i < cantidad; i += 1) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);

    resultado.push(
      `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
        2,
        "0",
      )}`,
    );
  }

  return resultado;
}

function estadoNormalizado(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function esEstadoAprobadoOPosterior(value: unknown): boolean {
  const estado = estadoNormalizado(value);

  return [
    "aprobado por presidente",
    "aprobada",
    "pagada",
    "pagado",
    "procesada",
    "procesado",
  ].includes(estado);
}

function solicitudesADetalles(
  solicitudes: SolicitudPago[],
): DetalleDistribucion[] {
  const resultado: DetalleDistribucion[] = [];

  solicitudes.forEach((solicitud) => {
    const distribuciones = solicitud.solicitudes_pago_edificios || [];

    distribuciones.forEach((distribucion) => {
      const edificioRelacion = Array.isArray(distribucion.edificios)
        ? distribucion.edificios[0]
        : distribucion.edificios;

      resultado.push({
        id: `${solicitud.id}-${distribucion.id}`,
        solicitudId: solicitud.id,
        numeroSolicitud: solicitud.numero_solicitud,
        fecha: solicitud.fecha_solicitud || "",
        edificioId: Number(distribucion.edificio_id),
        edificioCodigo:
          String(edificioRelacion?.codigo || "").trim() || "-",
        edificioNombre:
          String(edificioRelacion?.nombre || "").trim() ||
          `Edificio ${edificioRelacion?.codigo || "-"}`,
        concepto: String(solicitud.concepto || "Sin concepto"),
        proveedor: textoRelacion(
          solicitud.catalogo_proveedores,
          "nombre_proveedor",
          "-",
        ),
        categoria: textoRelacion(
          solicitud.catalogo_categoria_gastos,
          "nombre_categoria",
          "Sin categoría",
        ),
        estado: String(solicitud.estado || "-"),
        prioridad: String(solicitud.prioridad || "Normal"),
        noFactura: String(solicitud.no_factura || "-"),
        ncf: String(solicitud.ncf || "-"),
        totalSolicitud: toNumber(solicitud.total),
        montoAsignado: toNumber(distribucion.monto_asignado),
        porcentajeAsignado: toNumber(distribucion.porcentaje_asignado),
      });
    });
  });

  return resultado;
}

function agruparRanking(
  detalles: DetalleDistribucion[],
  campo: "categoria" | "proveedor",
): RankingItem[] {
  const mapa = new Map<string, { total: number; solicitudes: Set<number> }>();

  detalles.forEach((item) => {
    const nombre = String(item[campo] || "Sin información").trim();
    const actual = mapa.get(nombre);

    if (actual) {
      actual.total += item.montoAsignado;
      actual.solicitudes.add(item.solicitudId);
    } else {
      mapa.set(nombre, {
        total: item.montoAsignado,
        solicitudes: new Set([item.solicitudId]),
      });
    }
  });

  const totalGeneral = detalles.reduce(
    (sum, item) => sum + item.montoAsignado,
    0,
  );

  return Array.from(mapa.entries())
    .map(([nombre, datos]) => ({
      nombre,
      total: datos.total,
      porcentaje:
        totalGeneral > 0 ? (datos.total / totalGeneral) * 100 : 0,
      cantidad: datos.solicitudes.size,
    }))
    .sort((a, b) => b.total - a.total);
}

function variacionPorcentual(
  actual: number,
  anterior: number,
): number | null {
  if (anterior === 0) return actual === 0 ? 0 : null;
  return ((actual - anterior) / anterior) * 100;
}

export default function ReporteGastosEdificiosGerencialPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominioNombre, setCondominioNombre] = useState("");

  const [periodo, setPeriodo] = useState(periodoActual());
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "aprobados">(
    "todos",
  );
  const [buscar, setBuscar] = useState("");

  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [solicitudesAnterior, setSolicitudesAnterior] = useState<
    SolicitudPago[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState("");

  const [edificioAbierto, setEdificioAbierto] = useState<number | null>(null);

  useEffect(() => {
    const id = Number(localStorage.getItem("condominio_id") || 0);
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    if (!id) {
      setError("No hay condominio activo. Debe iniciar sesión nuevamente.");
      setLoading(false);
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);

    void cargarReporte(id, periodo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!condominioId) return;
    void cargarReporte(condominioId, periodo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, condominioId]);

  async function consultarPeriodo(id: number, periodoConsulta: string) {
    const { desde, hasta } = rangoPeriodo(periodoConsulta);

    const { data, error: queryError } = await supabase
      .from("solicitudes_pago")
      .select(
        `
        id,
        numero_solicitud,
        condominio_id,
        fecha_solicitud,
        concepto,
        detalle,
        total,
        estado,
        prioridad,
        no_factura,
        ncf,
        alcance_gasto,
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria),
        solicitudes_pago_edificios(
          id,
          solicitud_id,
          edificio_id,
          monto_asignado,
          porcentaje_asignado,
          edificios(codigo,nombre)
        )
      `,
      )
      .eq("condominio_id", id)
      .eq("alcance_gasto", "EDIFICIOS")
      .gte("fecha_solicitud", desde)
      .lt("fecha_solicitud", hasta)
      .order("fecha_solicitud", { ascending: true })
      .order("id", { ascending: true });

    if (queryError) throw queryError;

    return (data || []) as SolicitudPago[];
  }

  async function cargarReporte(id: number, periodoSeleccionado: string) {
    setConsultando(true);
    setError("");

    try {
      const anterior = periodoAnterior(periodoSeleccionado);

      const [actualData, anteriorData] = await Promise.all([
        consultarPeriodo(id, periodoSeleccionado),
        consultarPeriodo(id, anterior),
      ]);

      setSolicitudes(actualData);
      setSolicitudesAnterior(anteriorData);
    } catch (err: any) {
      setSolicitudes([]);
      setSolicitudesAnterior([]);
      setError(
        err?.message ||
          "No fue posible cargar el análisis gerencial por edificios.",
      );
    } finally {
      setConsultando(false);
      setLoading(false);
    }
  }

  const detallesBase = useMemo(
    () => solicitudesADetalles(solicitudes),
    [solicitudes],
  );

  const detallesAnteriorBase = useMemo(
    () => solicitudesADetalles(solicitudesAnterior),
    [solicitudesAnterior],
  );

  const detallesFiltrados = useMemo(() => {
    const texto = buscar.trim().toLowerCase();

    return detallesBase.filter((item) => {
      if (
        filtroEstado === "aprobados" &&
        !esEstadoAprobadoOPosterior(item.estado)
      ) {
        return false;
      }

      if (!texto) return true;

      const contenido = [
        item.edificioCodigo,
        item.edificioNombre,
        item.concepto,
        item.proveedor,
        item.categoria,
        item.estado,
        item.noFactura,
        item.ncf,
        item.solicitudId,
        item.numeroSolicitud,
      ]
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [detallesBase, buscar, filtroEstado]);

  const detallesAnteriorFiltrados = useMemo(() => {
    return detallesAnteriorBase.filter((item) => {
      if (
        filtroEstado === "aprobados" &&
        !esEstadoAprobadoOPosterior(item.estado)
      ) {
        return false;
      }

      return true;
    });
  }, [detallesAnteriorBase, filtroEstado]);

  const totalDistribuido = useMemo(
    () =>
      detallesFiltrados.reduce(
        (sum, item) => sum + Number(item.montoAsignado || 0),
        0,
      ),
    [detallesFiltrados],
  );

  const totalAnterior = useMemo(
    () =>
      detallesAnteriorFiltrados.reduce(
        (sum, item) => sum + Number(item.montoAsignado || 0),
        0,
      ),
    [detallesAnteriorFiltrados],
  );

  const variacionTotal = variacionPorcentual(
    totalDistribuido,
    totalAnterior,
  );

  const resumenAnteriorPorEdificio = useMemo(() => {
    const mapa = new Map<number, number>();

    detallesAnteriorFiltrados.forEach((item) => {
      mapa.set(
        item.edificioId,
        (mapa.get(item.edificioId) || 0) + item.montoAsignado,
      );
    });

    return mapa;
  }, [detallesAnteriorFiltrados]);

  const resumenEdificios = useMemo<ResumenEdificio[]>(() => {
    const mapa = new Map<
      number,
      Omit<
        ResumenEdificio,
        | "totalAnterior"
        | "variacionAbsoluta"
        | "variacionPorcentual"
        | "cantidadSolicitudes"
        | "porcentajeGeneral"
      >
    >();

    detallesFiltrados.forEach((item) => {
      const actual = mapa.get(item.edificioId);

      if (actual) {
        actual.total += item.montoAsignado;
        actual.detalles.push(item);
      } else {
        mapa.set(item.edificioId, {
          edificioId: item.edificioId,
          codigo: item.edificioCodigo,
          nombre: item.edificioNombre,
          total: item.montoAsignado,
          detalles: [item],
        });
      }
    });

    return Array.from(mapa.values())
      .map((item) => {
        const solicitudesUnicas = new Set(
          item.detalles.map((detalle) => detalle.solicitudId),
        );

        const anterior =
          resumenAnteriorPorEdificio.get(item.edificioId) || 0;

        return {
          ...item,
          totalAnterior: anterior,
          variacionAbsoluta: item.total - anterior,
          variacionPorcentual: variacionPorcentual(item.total, anterior),
          cantidadSolicitudes: solicitudesUnicas.size,
          porcentajeGeneral:
            totalDistribuido > 0 ? (item.total / totalDistribuido) * 100 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [
    detallesFiltrados,
    resumenAnteriorPorEdificio,
    totalDistribuido,
  ]);

  const rankingCategorias = useMemo(
    () => agruparRanking(detallesFiltrados, "categoria"),
    [detallesFiltrados],
  );

  const rankingProveedores = useMemo(
    () => agruparRanking(detallesFiltrados, "proveedor"),
    [detallesFiltrados],
  );

  const solicitudesUnicas = useMemo(
    () => new Set(detallesFiltrados.map((item) => item.solicitudId)).size,
    [detallesFiltrados],
  );

  const edificioMayor = resumenEdificios[0] || null;
  const categoriaMayor = rankingCategorias[0] || null;
  const proveedorMayor = rankingProveedores[0] || null;

  const gastoIndividualMayor = useMemo(() => {
    return detallesFiltrados
      .slice()
      .sort((a, b) => b.montoAsignado - a.montoAsignado)[0] || null;
  }, [detallesFiltrados]);

  const promedioPorEdificio =
    resumenEdificios.length > 0
      ? totalDistribuido / resumenEdificios.length
      : 0;

  const solicitudesDescuadradas = useMemo(() => {
    const porSolicitud = new Map<
      number,
      { total: number; distribuido: number; numero: number | null }
    >();

    detallesBase.forEach((item) => {
      const actual = porSolicitud.get(item.solicitudId);

      if (actual) {
        actual.distribuido += item.montoAsignado;
      } else {
        porSolicitud.set(item.solicitudId, {
          total: item.totalSolicitud,
          distribuido: item.montoAsignado,
          numero: item.numeroSolicitud,
        });
      }
    });

    return Array.from(porSolicitud.entries()).filter(
      ([, datos]) => Math.abs(datos.total - datos.distribuido) > 0.01,
    );
  }, [detallesBase]);

  const alertas = useMemo<AlertaGerencial[]>(() => {
    const resultado: AlertaGerencial[] = [];

    if (solicitudesDescuadradas.length > 0) {
      resultado.push({
        nivel: "alto",
        titulo: "Distribuciones descuadradas",
        detalle: `${solicitudesDescuadradas.length} solicitud(es) no coinciden con su total. Requieren revisión.`,
      });
    }

    if (edificioMayor && edificioMayor.porcentajeGeneral >= 35) {
      resultado.push({
        nivel:
          edificioMayor.porcentajeGeneral >= 50 ? "alto" : "medio",
        titulo: "Concentración de gasto por edificio",
        detalle: `${edificioMayor.nombre} concentra ${edificioMayor.porcentajeGeneral.toFixed(
          1,
        )}% del gasto distribuido del período.`,
      });
    }

    if (categoriaMayor && categoriaMayor.porcentaje >= 40) {
      resultado.push({
        nivel:
          categoriaMayor.porcentaje >= 60 ? "alto" : "medio",
        titulo: "Concentración por categoría",
        detalle: `${categoriaMayor.nombre} representa ${categoriaMayor.porcentaje.toFixed(
          1,
        )}% del total distribuido.`,
      });
    }

    if (proveedorMayor && proveedorMayor.porcentaje >= 50) {
      resultado.push({
        nivel: "medio",
        titulo: "Dependencia de proveedor",
        detalle: `${proveedorMayor.nombre} concentra ${proveedorMayor.porcentaje.toFixed(
          1,
        )}% del gasto distribuido.`,
      });
    }

    if (
      gastoIndividualMayor &&
      totalDistribuido > 0 &&
      (gastoIndividualMayor.montoAsignado / totalDistribuido) * 100 >= 30
    ) {
      const participacion =
        (gastoIndividualMayor.montoAsignado / totalDistribuido) * 100;

      resultado.push({
        nivel: "medio",
        titulo: "Asignación individual relevante",
        detalle: `${gastoIndividualMayor.edificioNombre} tiene una asignación de ${formatMoney(
          gastoIndividualMayor.montoAsignado,
        )}, equivalente al ${participacion.toFixed(1)}% del período.`,
      });
    }

    if (
      variacionTotal !== null &&
      variacionTotal >= 25 &&
      totalDistribuido > 0
    ) {
      resultado.push({
        nivel: variacionTotal >= 50 ? "alto" : "medio",
        titulo: "Aumento frente al mes anterior",
        detalle: `El gasto distribuido aumentó ${variacionTotal.toFixed(
          1,
        )}% respecto a ${nombrePeriodo(periodoAnterior(periodo))}.`,
      });
    }

    if (resultado.length === 0 && totalDistribuido > 0) {
      resultado.push({
        nivel: "info",
        titulo: "Sin alertas relevantes",
        detalle:
          "No se detectan concentraciones o variaciones que superen los umbrales gerenciales configurados.",
      });
    }

    return resultado;
  }, [
    solicitudesDescuadradas,
    edificioMayor,
    categoriaMayor,
    proveedorMayor,
    gastoIndividualMayor,
    totalDistribuido,
    variacionTotal,
    periodo,
  ]);

  const maximoEdificio = edificioMayor?.total || 0;
  const maximoCategoria = rankingCategorias[0]?.total || 0;
  const maximoProveedor = rankingProveedores[0]?.total || 0;

  function refrescar() {
    if (!condominioId) return;
    void cargarReporte(condominioId, periodo);
  }

  function imprimir() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando reporte gerencial por edificios...
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print">
        <ModuleMenu
          title="Reportes"
          subtitle="Análisis financiero y gerencial del condominio."
          tone="blue"
          items={[
            {
              href: "/reportes",
              label: "Dashboard reportes",
              icon: BarChart3,
            },
            {
              href: "/reportes/gastos-edificios",
              label: "Gastos por edificios",
              icon: Building2,
            },
          ]}
        />

        <ModuleToolbar
          title="Reporte Gerencial de Gastos por Edificios"
          subtitle={`Concentración, variación, alertas y detalle de gastos específicos. Condominio: ${
            condominioNombre || "No seleccionado"
          }.`}
          icon={Gauge}
          actions={
            <ModuleActions
              onRefresh={refrescar}
              extra={
                <button
                  type="button"
                  onClick={imprimir}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
              }
            />
          }
        />
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      <div className="no-print mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[220px_220px_1fr]">
        <div>
          <label className="mb-1 flex items-center gap-2 text-sm font-black text-slate-700">
            <CalendarDays className="h-4 w-4" />
            Período
          </label>
          <select
            value={periodo}
            onChange={(event) => setPeriodo(event.target.value)}
            className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
          >
            {generarPeriodos().map((item) => (
              <option key={item} value={item}>
                {nombrePeriodo(item)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-black text-slate-700">
            Estado
          </label>
          <select
            value={filtroEstado}
            onChange={(event) =>
              setFiltroEstado(
                event.target.value as "todos" | "aprobados",
              )
            }
            className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
          >
            <option value="todos">Todas las solicitudes</option>
            <option value="aprobados">Aprobadas / ejecutadas</option>
          </select>
        </div>

        <div>
          <label className="mb-1 flex items-center gap-2 text-sm font-black text-slate-700">
            <Search className="h-4 w-4" />
            Buscar
          </label>
          <input
            type="text"
            value={buscar}
            onChange={(event) => setBuscar(event.target.value)}
            className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
            placeholder="Edificio, concepto, proveedor, categoría, factura..."
          />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label="Total distribuido"
          value={formatMoney(totalDistribuido)}
          subtitle={nombrePeriodo(periodo)}
          tone="blue"
          icon={CircleDollarSign}
        />

        <KpiVariacion
          actual={totalDistribuido}
          anterior={totalAnterior}
          variacion={variacionTotal}
          periodoAnteriorTexto={nombrePeriodo(periodoAnterior(periodo))}
        />

        <Kpi
          label="Edificios afectados"
          value={String(resumenEdificios.length)}
          subtitle={`${solicitudesUnicas} solicitud(es)`}
          tone="emerald"
          icon={Building2}
        />

        <Kpi
          label="Promedio por edificio"
          value={formatMoney(promedioPorEdificio)}
          subtitle="Sobre el total distribuido"
          tone="amber"
          icon={BarChart3}
        />

        <Kpi
          label="Mayor concentración"
          value={
            edificioMayor
              ? `${edificioMayor.porcentajeGeneral.toFixed(1)}%`
              : "0.0%"
          }
          subtitle={
            edificioMayor
              ? edificioMayor.nombre
              : "Sin distribución"
          }
          tone={
            edificioMayor && edificioMayor.porcentajeGeneral >= 50
              ? "red"
              : "slate"
          }
          icon={Gauge}
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Resumen ejecutivo"
          subtitle="Principales variables que explican el gasto del período."
        >
          {totalDistribuido <= 0 ? (
            <EmptyState
              title="Sin información gerencial"
              description="No existen distribuciones para el período y filtros seleccionados."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ExecutiveCard
                icon={Building2}
                label="Edificio con mayor gasto"
                principal={edificioMayor?.nombre || "-"}
                secundario={
                  edificioMayor
                    ? `${formatMoney(
                        edificioMayor.total,
                      )} · ${edificioMayor.porcentajeGeneral.toFixed(
                        1,
                      )}% del total`
                    : "-"
                }
              />

              <ExecutiveCard
                icon={Tags}
                label="Categoría principal"
                principal={categoriaMayor?.nombre || "-"}
                secundario={
                  categoriaMayor
                    ? `${formatMoney(
                        categoriaMayor.total,
                      )} · ${categoriaMayor.porcentaje.toFixed(1)}%`
                    : "-"
                }
              />

              <ExecutiveCard
                icon={UsersRound}
                label="Proveedor principal"
                principal={proveedorMayor?.nombre || "-"}
                secundario={
                  proveedorMayor
                    ? `${formatMoney(
                        proveedorMayor.total,
                      )} · ${proveedorMayor.porcentaje.toFixed(1)}%`
                    : "-"
                }
              />

              <ExecutiveCard
                icon={Landmark}
                label="Mayor asignación individual"
                principal={
                  gastoIndividualMayor?.edificioNombre || "-"
                }
                secundario={
                  gastoIndividualMayor
                    ? `${formatMoney(
                        gastoIndividualMayor.montoAsignado,
                      )} · ${gastoIndividualMayor.concepto}`
                    : "-"
                }
              />
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Alertas gerenciales"
          subtitle="Señales automáticas para revisión administrativa."
          action={
            <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
              {alertas.length} alerta(s)
            </span>
          }
        >
          <div className="space-y-3">
            {alertas.length === 0 ? (
              <EmptyState
                title="Sin alertas"
                description="No hay información suficiente para evaluar alertas."
              />
            ) : (
              alertas.map((alerta, index) => (
                <AlertaCard key={`${alerta.titulo}-${index}`} alerta={alerta} />
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <RankingCard
          title="Gasto por categoría"
          subtitle="Qué tipo de gasto explica la mayor parte del período."
          icon={Tags}
          items={rankingCategorias}
          maximo={maximoCategoria}
        />

        <RankingCard
          title="Gasto por proveedor"
          subtitle="Concentración de los montos distribuidos por suplidor."
          icon={UsersRound}
          items={rankingProveedores}
          maximo={maximoProveedor}
        />
      </div>

      <SectionCard
        title="Ranking de edificios"
        subtitle={`Comparación con ${nombrePeriodo(
          periodoAnterior(periodo),
        )} y participación dentro del total distribuido.`}
        action={
          consultando ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Consultando
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              {resumenEdificios.length} edificio(s)
            </div>
          )
        }
      >
        {resumenEdificios.length === 0 ? (
          <EmptyState
            title="Sin distribución registrada"
            description="No existen solicitudes clasificadas por edificios para el período y filtros seleccionados."
          />
        ) : (
          <div className="space-y-3">
            {resumenEdificios.map((edificio, index) => {
              const ancho =
                maximoEdificio > 0
                  ? Math.max(5, (edificio.total / maximoEdificio) * 100)
                  : 0;

              return (
                <div
                  key={edificio.edificioId}
                  className="print-break-inside-avoid rounded-2xl border bg-white p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-black text-blue-700">
                        {index + 1}
                      </div>

                      <div>
                        <p className="font-black text-slate-900">
                          {edificio.nombre}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          Código {edificio.codigo} ·{" "}
                          {edificio.cantidadSolicitudes} solicitud(es)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:min-w-[520px]">
                      <MiniDato
                        label="Actual"
                        value={formatMoney(edificio.total)}
                      />
                      <MiniDato
                        label="Mes anterior"
                        value={formatMoney(edificio.totalAnterior)}
                      />
                      <MiniDato
                        label="Participación"
                        value={`${edificio.porcentajeGeneral.toFixed(1)}%`}
                      />
                      <MiniDato
                        label="Variación"
                        value={
                          edificio.variacionPorcentual === null
                            ? "Nuevo"
                            : `${edificio.variacionPorcentual >= 0 ? "+" : ""}${edificio.variacionPorcentual.toFixed(
                                1,
                              )}%`
                        }
                        emphasis={
                          edificio.variacionPorcentual !== null &&
                          Math.abs(edificio.variacionPorcentual) >= 25
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${ancho}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="mt-5">
        <SectionCard
          title="Drill-down por edificio"
          subtitle="Abra un edificio para llegar hasta la solicitud que explica cada monto."
        >
          {resumenEdificios.length === 0 ? (
            <EmptyState
              title="Sin detalle disponible"
              description="No hay registros para mostrar con los filtros seleccionados."
            />
          ) : (
            <div className="space-y-3">
              {resumenEdificios.map((edificio) => {
                const abierto = edificioAbierto === edificio.edificioId;

                return (
                  <div
                    key={edificio.edificioId}
                    className="overflow-hidden rounded-2xl border bg-white"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setEdificioAbierto(
                          abierto ? null : edificio.edificioId,
                        )
                      }
                      className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {abierto ? (
                          <ChevronDown className="h-5 w-5 shrink-0 text-blue-700" />
                        ) : (
                          <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                        )}

                        <div>
                          <p className="font-black text-slate-900">
                            {edificio.nombre}
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            {edificio.cantidadSolicitudes} solicitud(es)
                          </p>
                        </div>
                      </div>

                      <p className="shrink-0 font-black text-blue-800">
                        {formatMoney(edificio.total)}
                      </p>
                    </button>

                    {abierto && (
                      <div className="overflow-x-auto border-t">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-3 py-3 text-left">Solicitud</th>
                              <th className="px-3 py-3 text-left">Fecha</th>
                              <th className="px-3 py-3 text-left">Categoría</th>
                              <th className="px-3 py-3 text-left">Concepto</th>
                              <th className="px-3 py-3 text-left">Proveedor</th>
                              <th className="px-3 py-3 text-left">Estado</th>
                              <th className="px-3 py-3 text-right">
                                Total solicitud
                              </th>
                              <th className="px-3 py-3 text-right">
                                Asignado edificio
                              </th>
                              <th className="px-3 py-3 text-right">%</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y">
                            {edificio.detalles
                              .slice()
                              .sort((a, b) =>
                                String(a.fecha).localeCompare(String(b.fecha)),
                              )
                              .map((item) => (
                                <tr key={item.id} className="align-top">
                                  <td className="px-3 py-3 font-black text-slate-800">
                                    #{item.numeroSolicitud || item.solicitudId}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3">
                                    {formatDate(item.fecha)}
                                  </td>
                                  <td className="px-3 py-3">
                                    {item.categoria}
                                  </td>
                                  <td className="min-w-[240px] px-3 py-3">
                                    <p className="font-semibold text-slate-900">
                                      {item.concepto}
                                    </p>
                                    {(item.noFactura !== "-" ||
                                      item.ncf !== "-") && (
                                      <p className="mt-1 text-xs text-slate-500">
                                        Factura: {item.noFactura} · NCF:{" "}
                                        {item.ncf}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-3 py-3">
                                    {item.proveedor}
                                  </td>
                                  <td className="px-3 py-3">
                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                                      {item.estado}
                                    </span>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                                    {formatMoney(item.totalSolicitud)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3 text-right font-black text-blue-800">
                                    {formatMoney(item.montoAsignado)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3 text-right font-black">
                                    {item.porcentajeAsignado.toFixed(2)}%
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
        <div className="flex gap-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Este tablero es analítico y gerencial. Los montos asignados por
            edificio no crean gastos adicionales ni alteran el gasto financiero
            original. El total oficial del gasto continúa su curso normal.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}

function Kpi({
  label,
  value,
  subtitle,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtitle: string;
  tone: "slate" | "blue" | "emerald" | "amber" | "red";
  icon: any;
}) {
  const clases =
    tone === "blue"
      ? "border-blue-100 bg-blue-50 text-blue-800"
      : tone === "emerald"
        ? "border-emerald-100 bg-emerald-50 text-emerald-800"
        : tone === "amber"
          ? "border-amber-100 bg-amber-50 text-amber-800"
          : tone === "red"
            ? "border-red-100 bg-red-50 text-red-800"
            : "border-slate-200 bg-white text-slate-800";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${clases}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide opacity-70">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black">{value}</p>
          <p className="mt-1 text-xs font-semibold opacity-70">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-white/60 p-2">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function KpiVariacion({
  actual,
  anterior,
  variacion,
  periodoAnteriorTexto,
}: {
  actual: number;
  anterior: number;
  variacion: number | null;
  periodoAnteriorTexto: string;
}) {
  const sube = variacion !== null && variacion > 0;
  const baja = variacion !== null && variacion < 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Variación mensual
          </p>
          <div className="mt-2 flex items-center gap-2">
            <p
              className={`text-2xl font-black ${
                sube
                  ? "text-red-700"
                  : baja
                    ? "text-emerald-700"
                    : "text-slate-800"
              }`}
            >
              {variacion === null
                ? "Nuevo"
                : `${variacion >= 0 ? "+" : ""}${variacion.toFixed(1)}%`}
            </p>

            {sube ? (
              <ArrowUpRight className="h-5 w-5 text-red-600" />
            ) : baja ? (
              <ArrowDownRight className="h-5 w-5 text-emerald-600" />
            ) : (
              <Minus className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {periodoAnteriorTexto}: {formatMoney(anterior)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>

      {actual === 0 && anterior === 0 && (
        <p className="mt-2 text-xs font-semibold text-slate-400">
          Sin movimiento en ambos períodos.
        </p>
      )}
    </div>
  );
}

function ExecutiveCard({
  icon: Icon,
  label,
  principal,
  secundario,
}: {
  icon: any;
  label: string;
  principal: string;
  secundario: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-slate-500">
            {label}
          </p>
          <p className="mt-1 truncate font-black text-slate-900" title={principal}>
            {principal}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {secundario}
          </p>
        </div>
      </div>
    </div>
  );
}

function AlertaCard({ alerta }: { alerta: AlertaGerencial }) {
  const clases =
    alerta.nivel === "alto"
      ? "border-red-200 bg-red-50 text-red-900"
      : alerta.nivel === "medio"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-blue-200 bg-blue-50 text-blue-900";

  return (
    <div className={`rounded-2xl border p-4 ${clases}`}>
      <div className="flex gap-3">
        {alerta.nivel === "alto" ? (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        )}
        <div>
          <p className="font-black">{alerta.titulo}</p>
          <p className="mt-1 text-sm font-semibold opacity-90">
            {alerta.detalle}
          </p>
        </div>
      </div>
    </div>
  );
}

function RankingCard({
  title,
  subtitle,
  icon: Icon,
  items,
  maximo,
}: {
  title: string;
  subtitle: string;
  icon: any;
  items: RankingItem[];
  maximo: number;
}) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      {items.length === 0 ? (
        <EmptyState
          title="Sin información"
          description="No hay registros suficientes para construir el ranking."
        />
      ) : (
        <div className="space-y-4">
          {items.slice(0, 8).map((item, index) => {
            const ancho =
              maximo > 0 ? Math.max(4, (item.total / maximo) * 100) : 0;

            return (
              <div key={`${item.nombre}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-700">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-black text-slate-900"
                        title={item.nombre}
                      >
                        {item.nombre}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        {item.cantidad} solicitud(es) ·{" "}
                        {item.porcentaje.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <p className="shrink-0 text-sm font-black text-slate-900">
                    {formatMoney(item.total)}
                  </p>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-700"
                    style={{ width: `${ancho}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function MiniDato({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-black ${
          emphasis ? "text-amber-700" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
