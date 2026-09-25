"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

type MesReporte = {
  periodo: string;
  etiqueta: string;
  etiqueta_corta: string;
};

type MesDetalle = {
  monto: number;
  pagado: number;
  balance: number;
  estado: "PAGADO" | "PARCIAL" | "PENDIENTE" | "SIN_CARGO";
};

type FilaReporte = {
  unidad_id: number;
  propietario_id: number;
  unidad: string;
  propietario: string;
  facturado_periodo: number;
  pagado_periodo: number;
  balance_periodo: number;
  deuda_fecha_corte: number;
  estado_general: "AL_DIA" | "PARCIAL" | "CON_DEUDA";
  meses: Record<string, MesDetalle>;
};

type ResumenReporte = {
  propietarios: number;
  al_dia: number;
  con_deuda: number;
  parciales: number;
  facturado_periodo: number;
  pagado_periodo: number;
  balance_periodo: number;
  deuda_fecha_corte: number;
  porcentaje_cobranza: number;
};

type ReporteResponse = {
  ok: boolean;
  mensaje?: string;
  condominio?: {
    id: number;
    nombre: string;
    logo_url?: string | null;
  };
  filtros?: {
    periodo_desde: string;
    periodo_hasta: string;
    fecha_corte: string;
  };
  meses?: MesReporte[];
  resumen?: ResumenReporte;
  filas?: FilaReporte[];
  generado_at?: string;
  version?: string;
};

function periodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function fechaHoy() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

function moneda(valor?: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function monedaCompacta(valor?: number) {
  return new Intl.NumberFormat("es-DO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));
}

function fechaLarga(valor?: string | null) {
  if (!valor) return "";
  const fecha = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) return valor;

  return fecha.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fechaHora(valor?: string | null) {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";

  return fecha.toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dividirEnBloques<T>(items: T[], tamano: number) {
  const bloques: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) {
    bloques.push(items.slice(i, i + tamano));
  }
  return bloques;
}

function etiquetaEstado(estado: FilaReporte["estado_general"]) {
  if (estado === "AL_DIA") return "Al día";
  if (estado === "PARCIAL") return "Parcial";
  return "Con deuda";
}

function claseEstado(estado: FilaReporte["estado_general"]) {
  if (estado === "AL_DIA") return "bg-emerald-50 text-emerald-700";
  if (estado === "PARCIAL") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function celdaMes(detalle?: MesDetalle) {
  if (!detalle || detalle.estado === "SIN_CARGO") {
    return { principal: "—", secundario: "", clase: "text-slate-400" };
  }

  if (detalle.estado === "PAGADO") {
    return {
      principal: monedaCompacta(detalle.pagado),
      secundario: "Pagado",
      clase: "text-emerald-700",
    };
  }

  if (detalle.estado === "PARCIAL") {
    return {
      principal: monedaCompacta(detalle.pagado),
      secundario: `Bal. ${monedaCompacta(detalle.balance)}`,
      clase: "text-amber-700",
    };
  }

  return {
    principal: "0",
    secundario: `Debe ${monedaCompacta(detalle.balance)}`,
    clase: "text-red-700",
  };
}

export default function ReportePagosMorosidadDirectivaPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [condominioLogo, setCondominioLogo] = useState("");

  const [desde, setDesde] = useState(periodoActual());
  const [hasta, setHasta] = useState(periodoActual());
  const [fechaCorte, setFechaCorte] = useState(fechaHoy());

  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [orden, setOrden] = useState("UNIDAD");
  const [busqueda, setBusqueda] = useState("");

  const [reporte, setReporte] = useState<ReporteResponse | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const logo = localStorage.getItem("condominio_logo_url") || "";

    if (!id) {
      router.replace("/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre);
    setCondominioLogo(logo);
  }, [router]);

  useEffect(() => {
    if (!condominioId) return;
    void consultarReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId]);

  async function consultarReporte() {
    if (!condominioId || !desde || !hasta || !fechaCorte) return;

    setCargando(true);
    setMensaje("");

    try {
      const { data, error } = await supabase.rpc(
        "reporte_directiva_pagos_morosidad",
        {
          p_condominio_id: Number(condominioId),
          p_periodo_desde: desde,
          p_periodo_hasta: hasta,
          p_fecha_corte: fechaCorte,
        },
      );

      if (error) {
        setReporte(null);
        setMensaje(
          "No se pudo cargar el reporte: " +
            (error.message || "Error desconocido."),
        );
        return;
      }

      const respuesta = (data || {}) as ReporteResponse;

      if (!respuesta.ok) {
        setReporte(null);
        setMensaje(respuesta.mensaje || "No fue posible generar el reporte.");
        return;
      }

      setReporte(respuesta);
    } catch (error) {
      setReporte(null);
      setMensaje(
        error instanceof Error
          ? error.message
          : "No fue posible generar el reporte.",
      );
    } finally {
      setCargando(false);
    }
  }

  const meses = useMemo(() => reporte?.meses || [], [reporte]);
  const resumen = reporte?.resumen;

  const filasFiltradas = useMemo(() => {
    const filas = reporte?.filas || [];
    const termino = busqueda.trim().toLowerCase();

    const filtradas = filas.filter((fila) => {
      const deuda = Number(fila.deuda_fecha_corte || 0);

      let coincideEstado = true;

      if (estadoFiltro === "AL_DIA") {
        coincideEstado = deuda <= 0;
      } else if (estadoFiltro === "PARCIAL") {
        coincideEstado = fila.estado_general === "PARCIAL";
      } else if (estadoFiltro === "CON_DEUDA") {
        // Incluye cualquier propietario con balance pendiente,
        // aunque haya realizado un pago parcial.
        coincideEstado = deuda > 0;
      }

      const coincideBusqueda =
        !termino ||
        fila.unidad.toLowerCase().includes(termino) ||
        fila.propietario.toLowerCase().includes(termino);

      return coincideEstado && coincideBusqueda;
    });

    return [...filtradas].sort((a, b) => {
      switch (orden) {
        case "DEUDA_DESC":
          return (
            Number(b.deuda_fecha_corte || 0) -
            Number(a.deuda_fecha_corte || 0)
          );

        case "DEUDA_ASC":
          return (
            Number(a.deuda_fecha_corte || 0) -
            Number(b.deuda_fecha_corte || 0)
          );

        case "PAGADO_DESC":
          return (
            Number(b.pagado_periodo || 0) -
            Number(a.pagado_periodo || 0)
          );

        case "PROPIETARIO":
          return a.propietario.localeCompare(b.propietario, "es", {
            sensitivity: "base",
          });

        case "UNIDAD":
        default:
          return a.unidad.localeCompare(b.unidad, "es", {
            numeric: true,
            sensitivity: "base",
          });
      }
    });
  }, [reporte, estadoFiltro, busqueda, orden]);

  const bloquesImpresion = useMemo(() => dividirEnBloques(meses, 4), [meses]);

  const paginasImpresion = useMemo(() => {
    const paginas: Array<{
      meses: MesReporte[];
      filas: FilaReporte[];
      bloqueIndice: number;
      paginaDentroBloque: number;
      paginasBloque: number;
    }> = [];

    bloquesImpresion.forEach((bloque, bloqueIndice) => {
      const gruposFilas = dividirEnBloques(filasFiltradas, 26);

      gruposFilas.forEach((filasPagina, paginaDentroBloque) => {
        paginas.push({
          meses: bloque,
          filas: filasPagina,
          bloqueIndice,
          paginaDentroBloque,
          paginasBloque: gruposFilas.length,
        });
      });
    });

    return paginas;
  }, [bloquesImpresion, filasFiltradas]);

  const anchoTablaPantalla = useMemo(
    () => 703 + Math.max(meses.length, 1) * 110,
    [meses.length],
  );

  const nombreReporte =
    reporte?.condominio?.nombre || condominioNombre || "Condominio";
  const logoReporte = reporte?.condominio?.logo_url || condominioLogo || "";

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <style jsx global>{`
        .print-only { display: none; }

        @media print {
          @page { size: A4 landscape; margin: 7mm; }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Modo impresión de bajo consumo de tinta */
          #vam-report-print,
          #vam-report-print *,
          .print-page,
          .print-table,
          .print-table th,
          .print-table td {
            background: #ffffff !important;
            background-color: #ffffff !important;
            box-shadow: none !important;
          }

          .print-table th {
            color: #111827 !important;
            border-color: #9ca3af !important;
          }

          .print-table td {
            color: #111827;
            border-color: #d1d5db !important;
          }

          /* Oculta el layout general de VAM durante la impresión. */
          body header,
          body nav,
          body aside,
          body [class*="fixed"],
          body [class*="sticky"],
          .no-print,
          .screen-only {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .print-report {
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            color: #0f172a;
          }

          .print-page {
            width: 100%;
            min-height: 185mm;
            box-sizing: border-box;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid-page;
          }

          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .print-table {
            width: auto;
            margin: 0 auto;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 8.2px;
          }
          .print-table thead {
            display: table-header-group;
          }

          .print-table tfoot {
            display: table-row-group;
          }

          .print-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-table th, .print-table td {
            border: 1px solid #cbd5e1;
            padding: 3px 4px;
            vertical-align: middle;
            line-height: 1.2;
          }
          .print-table th {
            background: #ffffff !important;
            font-weight: 800;
          }
          /* print-report definido arriba */
        }
      `}</style>

      <div className="screen-only">
        <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-20 pt-5 text-white">
          <div className="mx-auto max-w-[1260px]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/20"
                aria-label="Regresar"
              >
                <ArrowLeft size={19} />
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.15em] text-blue-200">
                  {nombreReporte}
                </p>
                <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
                  Pagos y Morosidad por Propietario
                </h1>
                <p className="mt-1 text-xs text-blue-100 sm:text-sm">
                  Reporte gerencial para la Directiva
                </p>
              </div>

              <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-blue-100">
                v1.5
              </span>
            </div>
          </div>
        </header>

        <div className="-mt-14 mx-auto max-w-[1260px] space-y-5 px-4">
          <section className="rounded-[1.6rem] border border-white/60 bg-white p-5 shadow-xl shadow-slate-900/10">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
              <div>
                <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Desde
                </label>
                <input
                  type="month"
                  value={desde}
                  onChange={(event) => setDesde(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Hasta
                </label>
                <input
                  type="month"
                  value={hasta}
                  onChange={(event) => setHasta(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Deuda a la fecha de corte
                </label>
                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="date"
                    value={fechaCorte}
                    onChange={(event) => setFechaCorte(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void consultarReporte()}
                disabled={cargando}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 text-sm font-extrabold text-white transition hover:bg-blue-900 disabled:bg-slate-300"
              >
                {cargando ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                Consultar
              </button>
            </div>
          </section>

          {mensaje && (
            <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {mensaje}
            </section>
          )}

          {resumen && (
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Tarjeta titulo="Propietarios" valor={String(resumen.propietarios)} icono={<Users size={18} />} />
              <Tarjeta titulo="Al día" valor={String(resumen.al_dia)} icono={<CheckCircle2 size={18} />} />
              <Tarjeta titulo="Con deuda" valor={String(resumen.con_deuda)} icono={<WalletCards size={18} />} />
              <Tarjeta titulo="Pagado período" valor={moneda(resumen.pagado_periodo)} icono={<TrendingUp size={18} />} />
              <Tarjeta titulo="Deuda a la fecha" valor={moneda(resumen.deuda_fecha_corte)} icono={<FileText size={18} />} />
            </section>
          )}

          <section className="rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">Detalle por propietario</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Período {desde} a {hasta} · deuda vencida al {fechaLarga(fechaCorte)}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    placeholder="Apartamento o propietario"
                    className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs font-semibold outline-none focus:border-blue-500 sm:w-64"
                  />
                </div>

                <select
                  value={estadoFiltro}
                  onChange={(event) => {
                    const valor = event.target.value;
                    setEstadoFiltro(valor);

                    if (valor === "CON_DEUDA") {
                      setOrden("DEUDA_DESC");
                    }
                  }}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="TODOS">Todos</option>
                  <option value="AL_DIA">Al día</option>
                  <option value="PARCIAL">Parcial</option>
                  <option value="CON_DEUDA">Con deuda</option>
                </select>

                <select
                  value={orden}
                  onChange={(event) => setOrden(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                  aria-label="Ordenar reporte"
                >
                  <option value="UNIDAD">Ordenar: Apartamento</option>
                  <option value="DEUDA_DESC">Deuda: mayor a menor</option>
                  <option value="DEUDA_ASC">Deuda: menor a mayor</option>
                  <option value="PAGADO_DESC">Pagado: mayor a menor</option>
                  <option value="PROPIETARIO">Ordenar: Propietario</option>
                </select>

                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={!reporte || filasFiltradas.length === 0}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-extrabold text-white transition hover:bg-black disabled:bg-slate-300"
                >
                  <Printer size={16} />
                  Imprimir / PDF
                </button>
              </div>
            </div>

            {cargando ? (
              <div className="flex min-h-64 items-center justify-center gap-3 p-8 text-sm font-semibold text-slate-500">
                <Loader2 size={20} className="animate-spin text-blue-700" />
                Preparando reporte...
              </div>
            ) : filasFiltradas.length === 0 ? (
              <div className="p-10 text-center">
                <FileText size={36} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-black text-slate-700">No hay información para mostrar</p>
              </div>
            ) : (
              <div className="overflow-x-auto px-1 pb-1">
                <table
                  className="mx-auto table-fixed border-collapse"
                  style={{ width: `${anchoTablaPantalla}px` }}
                >
                  <colgroup>
                    <col style={{ width: "88px" }} />
                    <col style={{ width: "260px" }} />
                    {meses.map((mes) => (
                      <col key={`col-${mes.periodo}`} style={{ width: "110px" }} />
                    ))}
                    <col style={{ width: "125px" }} />
                    <col style={{ width: "125px" }} />
                    <col style={{ width: "105px" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Apto.</th>
                      <th className="sticky left-[88px] z-20 border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Propietario</th>

                      {meses.map((mes) => (
                        <th key={mes.periodo} className="border-b border-r border-slate-200 px-2 py-2 text-center text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                          {mes.etiqueta_corta}
                        </th>
                      ))}

                      <th className="border-b border-r border-slate-200 px-2 py-2 text-right text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Total pagado</th>
                      <th className="border-b border-r border-slate-200 px-2 py-2 text-right text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Deuda a fecha</th>
                      <th className="border-b border-slate-200 px-2 py-2 text-center text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filasFiltradas.map((fila) => (
                      <tr key={`${fila.unidad_id}-${fila.propietario_id}`}>
                        <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-2.5 py-2 text-[11px] font-black text-slate-900">{fila.unidad}</td>
                        <td className="sticky left-[88px] z-10 border-b border-r border-slate-100 bg-white px-2.5 py-2 text-[11px] font-semibold leading-tight text-slate-700">{fila.propietario}</td>

                        {meses.map((mes) => {
                          const info = celdaMes(fila.meses?.[mes.periodo]);
                          return (
                            <td key={mes.periodo} className="border-b border-r border-slate-100 px-2 py-2 text-center">
                              <p className={`text-[11px] font-black ${info.clase}`}>{info.principal}</p>
                              {info.secundario && (
                                <p className="mt-0.5 whitespace-nowrap text-[8px] font-semibold text-slate-400">{info.secundario}</p>
                              )}
                            </td>
                          );
                        })}

                        <td className="border-b border-r border-slate-100 px-2 py-2 text-right text-[11px] font-black text-blue-800">{moneda(fila.pagado_periodo)}</td>
                        <td className="border-b border-r border-slate-100 px-2 py-2 text-right text-[11px] font-black text-red-600">{moneda(fila.deuda_fecha_corte)}</td>
                        <td className="border-b border-slate-100 px-2 py-2 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold ${claseEstado(fila.estado_general)}`}>
                            {etiquetaEstado(fila.estado_general)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {resumen && (
              <div className="grid gap-2 border-t border-slate-100 bg-slate-50 p-4 text-xs sm:grid-cols-2 xl:grid-cols-4">
                <DatoPie titulo="Facturado período" valor={moneda(resumen.facturado_periodo)} />
                <DatoPie titulo="Pagado período" valor={moneda(resumen.pagado_periodo)} />
                <DatoPie titulo="Balance del período" valor={moneda(resumen.balance_periodo)} />
                <DatoPie titulo="% Cobranza" valor={`${Number(resumen.porcentaje_cobranza || 0).toFixed(2)}%`} />
              </div>
            )}
          </section>

          <div className="pb-2 text-right text-[10px] text-slate-400">
            Pagos y Morosidad por Propietario · v1.5
          </div>
        </div>
      </div>

      <div className="print-only print-report" id="vam-report-print">
        {paginasImpresion.map((pagina, indicePagina) => {
          const esUltimaPagina =
            indicePagina === paginasImpresion.length - 1;

          return (
            <section
              key={`print-page-${indicePagina}`}
              className="print-page"
            >
              <EncabezadoImpresion
                logo={logoReporte}
                condominio={nombreReporte}
                desde={desde}
                hasta={hasta}
                fechaCorte={fechaCorte}
                generadoAt={reporte?.generado_at}
                resumen={resumen}
                bloqueActual={pagina.bloqueIndice + 1}
                totalBloques={bloquesImpresion.length}
              />

              <table className="print-table">
                <colgroup>
                  <col style={{ width: "8%" }} />
                  <col
                    style={{
                      width:
                        pagina.meses.length <= 1 ? "34%" : "28%",
                    }}
                  />

                  {pagina.meses.map((mes) => (
                    <col
                      key={`print-col-${indicePagina}-${mes.periodo}`}
                      style={{
                        width:
                          pagina.meses.length === 1
                            ? "12%"
                            : pagina.meses.length === 2
                              ? "10%"
                              : pagina.meses.length === 3
                                ? "9%"
                                : "8%",
                      }}
                    />
                  ))}

                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>

                <thead>
                  <tr>
                    <th>Apto.</th>
                    <th>Propietario</th>

                    {pagina.meses.map((mes) => (
                      <th key={mes.periodo}>{mes.etiqueta_corta}</th>
                    ))}

                    <th>Total pagado</th>
                    <th>Deuda a fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {pagina.filas.map((fila) => (
                    <tr
                      key={`${indicePagina}-${fila.unidad_id}-${fila.propietario_id}`}
                    >
                      <td style={{ fontWeight: 800 }}>{fila.unidad}</td>
                      <td>{fila.propietario}</td>

                      {pagina.meses.map((mes) => {
                        const detalle = fila.meses?.[mes.periodo];

                        return (
                          <td
                            key={mes.periodo}
                            style={{ textAlign: "right" }}
                          >
                            <div style={{ fontWeight: 700 }}>
                              {detalle &&
                              detalle.estado !== "SIN_CARGO"
                                ? monedaCompacta(detalle.pagado)
                                : "—"}
                            </div>

                            {detalle?.estado === "PARCIAL" && (
                              <div
                                style={{
                                  marginTop: "1px",
                                  fontSize: "7px",
                                  color: "#374151",
                                }}
                              >
                                Bal. {monedaCompacta(detalle.balance)}
                              </div>
                            )}

                            {detalle?.estado === "PENDIENTE" && (
                              <div
                                style={{
                                  marginTop: "1px",
                                  fontSize: "7px",
                                  color: "#111827",
                                }}
                              >
                                Debe {monedaCompacta(detalle.balance)}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 800,
                        }}
                      >
                        {monedaCompacta(fila.pagado_periodo)}
                      </td>

                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 800,
                        }}
                      >
                        {monedaCompacta(fila.deuda_fecha_corte)}
                      </td>

                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: 700,
                        }}
                      >
                        {etiquetaEstado(fila.estado_general)}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {esUltimaPagina && resumen && (
                  <tfoot>
                    <tr>
                      <td
                        colSpan={2 + pagina.meses.length}
                        style={{ fontWeight: 900 }}
                      >
                        TOTALES GENERALES
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 900,
                        }}
                      >
                        {monedaCompacta(resumen.pagado_periodo)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 900,
                        }}
                      >
                        {monedaCompacta(resumen.deuda_fecha_corte)}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: 900,
                        }}
                      >
                        {Number(
                          resumen.porcentaje_cobranza || 0,
                        ).toFixed(1)}
                        %
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>

              <div
                style={{
                  marginTop: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #d1d5db",
                  paddingTop: "4px",
                  fontSize: "7.5px",
                  color: "#64748b",
                }}
              >
                <span>VAM Administración de Condominios</span>

                <span>
                  Página {indicePagina + 1} de {paginasImpresion.length}
                  {" · "}
                  Pagos y Morosidad por Propietario · v1.5
                </span>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function Tarjeta({ titulo, valor, icono }: { titulo: string; valor: string; icono: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icono}</span>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{titulo}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{valor}</p>
    </div>
  );
}

function DatoPie({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className="mt-1 font-black text-slate-800">{valor}</p>
    </div>
  );
}

function EncabezadoImpresion({
  logo,
  condominio,
  desde,
  hasta,
  fechaCorte,
  generadoAt,
  resumen,
  bloqueActual,
  totalBloques,
}: {
  logo: string;
  condominio: string;
  desde: string;
  hasta: string;
  fechaCorte: string;
  generadoAt?: string;
  resumen?: ResumenReporte;
  bloqueActual: number;
  totalBloques: number;
}) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", borderBottom: "1.5px solid #6b7280", paddingBottom: "7px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          {logo ? (
            <img src={logo} alt="" style={{ width: "38px", height: "38px", objectFit: "contain" }} />
          ) : (
            <div style={{ width: "38px", height: "38px", border: "1px solid #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "10px" }}>
              VAM
            </div>
          )}

          <div>
            <div style={{ fontSize: "12px", fontWeight: 900 }}>{condominio}</div>
            <div style={{ fontSize: "14px", fontWeight: 900 }}>Reporte de Pagos y Morosidad por Propietario</div>
          </div>
        </div>

        <div style={{ textAlign: "right", fontSize: "8px", lineHeight: 1.5 }}>
          <div>Período: <strong>{desde}</strong> a <strong>{hasta}</strong></div>
          <div>Deuda vencida al: <strong>{fechaLarga(fechaCorte)}</strong></div>
          <div>Generado: {fechaHora(generadoAt)}</div>
          {totalBloques > 1 && <div>Sección {bloqueActual} de {totalBloques}</div>}
        </div>
      </div>

      {resumen && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "5px", marginTop: "7px", marginBottom: "7px" }}>
          <ResumenPrint titulo="Propietarios" valor={String(resumen.propietarios)} />
          <ResumenPrint titulo="Al día" valor={String(resumen.al_dia)} />
          <ResumenPrint titulo="Con deuda" valor={String(resumen.con_deuda)} />
          <ResumenPrint titulo="Pagado" valor={monedaCompacta(resumen.pagado_periodo)} />
          <ResumenPrint titulo="Deuda" valor={monedaCompacta(resumen.deuda_fecha_corte)} />
          <ResumenPrint titulo="% Cobranza" valor={`${Number(resumen.porcentaje_cobranza || 0).toFixed(1)}%`} />
        </div>
      )}
    </div>
  );
}

function ResumenPrint({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div style={{ border: "1px solid #d1d5db", padding: "5px", textAlign: "center" }}>
      <div style={{ fontSize: "7px", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>{titulo}</div>
      <div style={{ marginTop: "2px", fontSize: "10px", fontWeight: 900 }}>{valor}</div>
    </div>
  );
}
