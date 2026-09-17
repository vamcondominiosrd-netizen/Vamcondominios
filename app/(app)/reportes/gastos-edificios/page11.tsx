"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  WalletCards,
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
  cantidadSolicitudes: number;
  porcentajeGeneral: number;
  detalles: DetalleDistribucion[];
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
    siguiente.getMonth() + 1
  ).padStart(2, "0")}-01`;

  return { desde, hasta };
}

function generarPeriodos(cantidad = 36): string[] {
  const hoy = new Date();
  const resultado: string[] = [];

  for (let i = 0; i < cantidad; i += 1) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);

    resultado.push(
      `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
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

export default function ReporteGastosEdificiosPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominioNombre, setCondominioNombre] = useState("");

  const [periodo, setPeriodo] = useState(periodoActual());
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "aprobados">(
    "todos"
  );
  const [buscar, setBuscar] = useState("");

  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
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

  async function cargarReporte(id: number, periodoSeleccionado: string) {
    setConsultando(true);
    setError("");

    try {
      const { desde, hasta } = rangoPeriodo(periodoSeleccionado);

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
        `
        )
        .eq("condominio_id", id)
        .eq("alcance_gasto", "EDIFICIOS")
        .gte("fecha_solicitud", desde)
        .lt("fecha_solicitud", hasta)
        .order("fecha_solicitud", { ascending: true })
        .order("id", { ascending: true });

      if (queryError) throw queryError;

      setSolicitudes((data || []) as SolicitudPago[]);
    } catch (err: any) {
      setSolicitudes([]);
      setError(
        err?.message ||
          "No fue posible cargar la distribución de gastos por edificios."
      );
    } finally {
      setConsultando(false);
      setLoading(false);
    }
  }

  const detalles = useMemo<DetalleDistribucion[]>(() => {
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
            "-"
          ),
          categoria: textoRelacion(
            solicitud.catalogo_categoria_gastos,
            "nombre_categoria",
            "Sin categoría"
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
  }, [solicitudes]);

  const detallesFiltrados = useMemo(() => {
    const texto = buscar.trim().toLowerCase();

    return detalles.filter((item) => {
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
  }, [detalles, buscar, filtroEstado]);

  const totalDistribuido = useMemo(
    () =>
      detallesFiltrados.reduce(
        (sum, item) => sum + Number(item.montoAsignado || 0),
        0
      ),
    [detallesFiltrados]
  );

  const resumenEdificios = useMemo<ResumenEdificio[]>(() => {
    const mapa = new Map<number, ResumenEdificio>();

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
          cantidadSolicitudes: 0,
          porcentajeGeneral: 0,
          detalles: [item],
        });
      }
    });

    return Array.from(mapa.values())
      .map((item) => {
        const solicitudesUnicas = new Set(
          item.detalles.map((detalle) => detalle.solicitudId)
        );

        return {
          ...item,
          cantidadSolicitudes: solicitudesUnicas.size,
          porcentajeGeneral:
            totalDistribuido > 0 ? (item.total / totalDistribuido) * 100 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [detallesFiltrados, totalDistribuido]);

  const solicitudesUnicas = useMemo(
    () => new Set(detallesFiltrados.map((item) => item.solicitudId)).size,
    [detallesFiltrados]
  );

  const edificioMayor = resumenEdificios[0] || null;
  const maximoEdificio = edificioMayor?.total || 0;

  const promedioPorEdificio =
    resumenEdificios.length > 0
      ? totalDistribuido / resumenEdificios.length
      : 0;

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
            Cargando reporte de gastos por edificios...
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
          title="Distribución de Gastos por Edificios"
          subtitle={`Análisis gerencial de gastos específicos distribuidos entre edificios. Condominio: ${
            condominioNombre || "No seleccionado"
          }.`}
          icon={Building2}
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
                event.target.value as "todos" | "aprobados"
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

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Total distribuido"
          value={formatMoney(totalDistribuido)}
          subtitle={nombrePeriodo(periodo)}
          tone="blue"
        />
        <Kpi
          label="Solicitudes"
          value={String(solicitudesUnicas)}
          subtitle="Con distribución por edificios"
          tone="slate"
        />
        <Kpi
          label="Edificios afectados"
          value={String(resumenEdificios.length)}
          subtitle={
            edificioMayor
              ? `Mayor gasto: ${edificioMayor.nombre}`
              : "Sin distribución"
          }
          tone="emerald"
        />
        <Kpi
          label="Promedio por edificio"
          value={formatMoney(promedioPorEdificio)}
          subtitle="Sobre el total distribuido"
          tone="amber"
        />
      </div>

      <SectionCard
        title="Distribución por edificio"
        subtitle="Participación de cada edificio en los gastos específicos del período."
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
            {resumenEdificios.map((edificio) => {
              const ancho =
                maximoEdificio > 0
                  ? Math.max(5, (edificio.total / maximoEdificio) * 100)
                  : 0;

              return (
                <div
                  key={edificio.edificioId}
                  className="print-break-inside-avoid rounded-2xl border bg-white p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <Building2 className="h-5 w-5" />
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
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xl font-black text-blue-800">
                        {formatMoney(edificio.total)}
                      </p>
                      <p className="text-xs font-black text-slate-500">
                        {edificio.porcentajeGeneral.toFixed(2)}% del total
                        distribuido
                      </p>
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
          title="Detalle por edificio"
          subtitle="Abra cada edificio para revisar las solicitudes que componen su gasto."
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
                          abierto ? null : edificio.edificioId
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
                                String(a.fecha).localeCompare(String(b.fecha))
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
            Este reporte es analítico. Los montos asignados por edificio no
            crean gastos adicionales ni alteran el gasto financiero original.
            El total oficial del gasto continúa su curso normal en el módulo de
            Gastos.
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
}: {
  label: string;
  value: string;
  subtitle: string;
  tone: "slate" | "blue" | "emerald" | "amber";
}) {
  const clases =
    tone === "blue"
      ? "border-blue-100 bg-blue-50 text-blue-800"
      : tone === "emerald"
        ? "border-emerald-100 bg-emerald-50 text-emerald-800"
        : tone === "amber"
          ? "border-amber-100 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-white text-slate-800";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${clases}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-70">{subtitle}</p>
    </div>
  );
}
