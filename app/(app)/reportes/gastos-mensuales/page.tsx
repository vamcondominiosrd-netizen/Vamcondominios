"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

type PerfilUsuario = {
  condominio_id: number | null;
  condominio: string | null;
  nombre?: string | null;
  rol?: string | null;
};

type GastoDB = {
  id: number;
  condominio_id: number | null;
  proveedor?: string | null;
  concepto?: string | null;
  descripcion?: string | null;
  detalle_gasto?: string | null;
  categoria?: string | null;
  total?: number | string | null;
  monto?: number | string | null;
  itbis?: number | string | null;
  no_factura?: string | null;
  ncf?: string | null;
  metodo_pago?: string | null;
  numero_cheque?: string | null;
  fecha_pago?: string | null;
  created_at?: string | null;
};

type CajaChicaDB = {
  id: number;
  condominio_id?: number | null;
  condominio?: string | null;
  fecha?: string | null;
  fecha_gasto?: string | null;
  monto?: number | string | null;
  concepto?: string | null;
  descripcion?: string | null;
  detalle?: string | null;
  categoria?: string | null;
  proveedor?: string | null;
  beneficiario?: string | null;
  numero_documento?: string | null;
  numero_recibo?: string | null;
  no_factura?: string | null;
  ncf?: string | null;
  metodo_pago?: string | null;
  created_at?: string | null;
};

type DetalleGasto = {
  id: string;
  fuente: "GASTO" | "CAJA_CHICA";
  fechaISO: string;
  fechaTexto: string;
  numeroDocumento: string;
  numeroOrden: number | null;
  concepto: string;
  proveedor: string;
  categoria: string;
  factura: string;
  ncf: string;
  metodoPago: string;
  monto: number;
};

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const limpio = String(value)
    .replace(/RD\$/gi, "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();

  const resultado = Number(limpio);
  return Number.isFinite(resultado) ? resultado : 0;
}

function formatMoney(value: unknown): string {
  return moneda.format(toNumber(value));
}

function limpiarTexto(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined) return fallback;
  const texto = String(value).trim();
  return texto || fallback;
}

function normalizarTexto(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

function formatDate(value: unknown): string {
  if (!value) return "-";

  const texto = String(value);
  const fechaBase = texto.length === 10 ? `${texto}T12:00:00` : texto;
  const fecha = new Date(fechaBase);

  if (Number.isNaN(fecha.getTime())) return texto.slice(0, 10);

  return fecha.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function extraerNumeroDocumento(value: unknown): number | null {
  const texto = String(value || "").trim();
  if (!texto) return null;

  const coincidencia = texto.match(/\d+/);
  if (!coincidencia) return null;

  const numero = Number(coincidencia[0]);
  return Number.isFinite(numero) ? numero : null;
}

function ordenarPorCheque(a: DetalleGasto, b: DetalleGasto): number {
  if (a.numeroOrden !== null && b.numeroOrden !== null) {
    if (a.numeroOrden !== b.numeroOrden) {
      return a.numeroOrden - b.numeroOrden;
    }
  } else if (a.numeroOrden !== null) {
    return -1;
  } else if (b.numeroOrden !== null) {
    return 1;
  }

  const documento = a.numeroDocumento.localeCompare(
    b.numeroDocumento,
    "es",
    { numeric: true, sensitivity: "base" }
  );

  if (documento !== 0) return documento;

  const fecha = a.fechaISO.localeCompare(b.fechaISO);
  if (fecha !== 0) return fecha;

  return a.id.localeCompare(b.id);
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

export default function ReporteGastosMensualesPage() {
  const [loading, setLoading] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [periodo, setPeriodo] = useState(periodoActual());
  const [gastos, setGastos] = useState<DetalleGasto[]>([]);

  const totalGastosGenerales = useMemo(
    () =>
      gastos
        .filter((item) => item.fuente === "GASTO")
        .reduce((sum, item) => sum + item.monto, 0),
    [gastos]
  );

  const totalCajaChica = useMemo(
    () =>
      gastos
        .filter((item) => item.fuente === "CAJA_CHICA")
        .reduce((sum, item) => sum + item.monto, 0),
    [gastos]
  );

  const totalMes = totalGastosGenerales + totalCajaChica;

  const resumenCategorias = useMemo(() => {
    const mapa = new Map<string, number>();

    gastos.forEach((item) => {
      const categoria = limpiarTexto(item.categoria, "Sin categoría");
      mapa.set(categoria, (mapa.get(categoria) || 0) + item.monto);
    });

    return Array.from(mapa.entries())
      .map(([categoria, total]) => ({
        categoria,
        total,
        porcentaje: totalMes > 0 ? (total / totalMes) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [gastos, totalMes]);

  const gastoMayor = useMemo(() => {
    if (gastos.length === 0) return null;
    return [...gastos].sort((a, b) => b.monto - a.monto)[0];
  }, [gastos]);

  useEffect(() => {
    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (perfil?.condominio_id) {
      cargarReporte(perfil.condominio_id, perfil.condominio || "", periodo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, perfil?.condominio_id]);

  async function inicializar() {
    setLoading(true);
    setError(null);

    try {
      const contexto = await obtenerContextoUsuario();

      if (!contexto.condominio_id) {
        throw new Error(
          "No se pudo identificar el condominio activo del usuario."
        );
      }

      setPerfil(contexto);
      await cargarReporte(
        contexto.condominio_id,
        contexto.condominio || "",
        periodo
      );
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  async function obtenerContextoUsuario(): Promise<PerfilUsuario> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No hay usuario logueado.");

    async function buscarPerfil(campo: string, valor: string) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq(campo, valor)
          .maybeSingle();

        if (!error && data) return data;
      } catch {
        return null;
      }

      return null;
    }

    let perfilEncontrado: any = null;

    perfilEncontrado = await buscarPerfil("id", user.id);
    if (!perfilEncontrado) {
      perfilEncontrado = await buscarPerfil("user_id", user.id);
    }
    if (!perfilEncontrado) {
      perfilEncontrado = await buscarPerfil("auth_id", user.id);
    }
    if (!perfilEncontrado && user.email) {
      perfilEncontrado = await buscarPerfil("email", user.email);
    }

    let condominioId =
      perfilEncontrado?.condominio_id ??
      perfilEncontrado?.id_condominio ??
      perfilEncontrado?.condominioId ??
      null;

    let condominioNombre =
      perfilEncontrado?.condominio ??
      perfilEncontrado?.nombre_condominio ??
      perfilEncontrado?.condominio_nombre ??
      null;

    if (!condominioId && typeof window !== "undefined") {
      const llaves = [
        "condominio_id",
        "condominioId",
        "selectedCondominioId",
        "vam_condominio_id",
        "condominio_actual",
        "vam_condominio_actual",
        "condominioSeleccionado",
        "selectedCondominio",
        "condominio",
      ];

      for (const llave of llaves) {
        const raw = localStorage.getItem(llave);
        if (!raw) continue;

        try {
          const parsed = JSON.parse(raw);
          const posibleId =
            parsed?.id ??
            parsed?.condominio_id ??
            parsed?.id_condominio ??
            parsed?.condominioId ??
            raw;

          const numeroId = Number(posibleId);

          if (Number.isFinite(numeroId) && numeroId > 0) {
            condominioId = numeroId;
            condominioNombre =
              parsed?.nombre ??
              parsed?.condominio ??
              parsed?.nombre_condominio ??
              parsed?.condominio_nombre ??
              condominioNombre;
            break;
          }
        } catch {
          const numeroId = Number(raw);

          if (Number.isFinite(numeroId) && numeroId > 0) {
            condominioId = numeroId;
            break;
          }
        }
      }
    }

    if (!condominioId) {
      return { condominio_id: null, condominio: null };
    }

    try {
      const { data: condominioData } = await supabase
        .from("condominios")
        .select("id, nombre")
        .eq("id", Number(condominioId))
        .maybeSingle();

      if (condominioData?.nombre) {
        condominioNombre = condominioData.nombre;
      }
    } catch {
      // Se mantiene el nombre obtenido del perfil o localStorage.
    }

    return {
      condominio_id: Number(condominioId),
      condominio: condominioNombre || "Condominio",
      nombre:
        perfilEncontrado?.nombre ??
        perfilEncontrado?.full_name ??
        perfilEncontrado?.name ??
        null,
      rol: perfilEncontrado?.rol ?? perfilEncontrado?.role ?? null,
    };
  }

  async function cargarReporte(
    condominioId: number,
    condominioNombre: string,
    periodoSeleccionado: string
  ) {
    setConsultando(true);
    setError(null);

    try {
      const { desde, hasta } = rangoPeriodo(periodoSeleccionado);

      const [gastosData, cajaData] = await Promise.all([
        cargarGastosGenerales(condominioId, desde, hasta),
        cargarCajaChica(condominioId, condominioNombre, desde, hasta),
      ]);

      const detalle: DetalleGasto[] = [
        ...gastosData.map(mapearGastoGeneral),
        ...cajaData.map(mapearCajaChica),
      ]
        .filter((item) => item.monto > 0)
        .sort(ordenarPorCheque);

      setGastos(detalle);
    } catch (err: any) {
      setError(err?.message || "No se pudo consultar el reporte.");
      setGastos([]);
    } finally {
      setConsultando(false);
    }
  }

  async function cargarGastosGenerales(
    condominioId: number,
    desde: string,
    hasta: string
  ): Promise<GastoDB[]> {
    const { data, error } = await supabase
      .from("gastos")
      .select(`
        id,
        condominio_id,
        proveedor,
        concepto,
        descripcion,
        detalle_gasto,
        categoria,
        total,
        monto,
        itbis,
        no_factura,
        ncf,
        metodo_pago,
        numero_cheque,
        fecha_pago,
        created_at
      `)
      .eq("condominio_id", condominioId)
      .gte("fecha_pago", desde)
      .lt("fecha_pago", hasta)
      .order("fecha_pago", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw new Error("Error cargando gastos: " + error.message);
    }

    return (data || []) as GastoDB[];
  }

  async function cargarCajaChica(
    condominioId: number,
    condominioNombre: string,
    desde: string,
    hasta: string
  ): Promise<CajaChicaDB[]> {
    const resultados: CajaChicaDB[] = [];
    const vistos = new Set<number>();

    async function agregar(data: any[] | null) {
      (data || []).forEach((row) => {
        const id = Number(row.id);
        if (!Number.isFinite(id) || vistos.has(id)) return;
        vistos.add(id);
        resultados.push(row as CajaChicaDB);
      });
    }

    try {
      const porId = await supabase
        .from("caja_chica")
        .select("*")
        .eq("condominio_id", condominioId)
        .gte("fecha", desde)
        .lt("fecha", hasta)
        .order("fecha", { ascending: true })
        .order("id", { ascending: true });

      if (!porId.error) {
        await agregar(porId.data);
      }
    } catch {
      // La tabla histórica puede no tener condominio_id.
    }

    if (condominioNombre) {
      try {
        const porNombre = await supabase
          .from("caja_chica")
          .select("*")
          .ilike("condominio", `%${condominioNombre}%`)
          .gte("fecha", desde)
          .lt("fecha", hasta)
          .order("fecha", { ascending: true })
          .order("id", { ascending: true });

        if (!porNombre.error) {
          await agregar(porNombre.data);
        }
      } catch {
        // Se conserva cualquier resultado obtenido por condominio_id.
      }
    }

    return resultados;
  }

  function mapearGastoGeneral(row: GastoDB): DetalleGasto {
    const numeroDocumento = limpiarTexto(row.numero_cheque, "-");
    const fechaISO = String(row.fecha_pago || row.created_at || "").slice(0, 10);

    return {
      id: `gasto-${row.id}`,
      fuente: "GASTO",
      fechaISO,
      fechaTexto: formatDate(fechaISO),
      numeroDocumento,
      numeroOrden: extraerNumeroDocumento(numeroDocumento),
      concepto: limpiarTexto(
        row.concepto || row.descripcion || row.detalle_gasto,
        "Gasto operativo"
      ),
      proveedor: limpiarTexto(row.proveedor, "Proveedor / beneficiario"),
      categoria: limpiarTexto(row.categoria, "Gasto operativo"),
      factura: limpiarTexto(row.no_factura, "-"),
      ncf: limpiarTexto(row.ncf, "-"),
      metodoPago: limpiarTexto(row.metodo_pago, "-"),
      monto: toNumber(row.total || row.monto),
    };
  }

  function mapearCajaChica(row: CajaChicaDB): DetalleGasto {
    const fechaISO = String(
      row.fecha || row.fecha_gasto || row.created_at || ""
    ).slice(0, 10);

    const numeroDocumento = limpiarTexto(
      row.numero_documento || row.numero_recibo,
      "-"
    );

    return {
      id: `caja-${row.id}`,
      fuente: "CAJA_CHICA",
      fechaISO,
      fechaTexto: formatDate(fechaISO),
      numeroDocumento,
      numeroOrden: extraerNumeroDocumento(numeroDocumento),
      concepto: limpiarTexto(
        row.concepto || row.descripcion || row.detalle,
        "Gasto de Caja Chica"
      ),
      proveedor: limpiarTexto(
        row.proveedor || row.beneficiario,
        "Caja Chica"
      ),
      categoria: limpiarTexto(row.categoria, "Caja Chica"),
      factura: limpiarTexto(row.no_factura, "-"),
      ncf: limpiarTexto(row.ncf, "-"),
      metodoPago: limpiarTexto(row.metodo_pago, "Caja Chica"),
      monto: toNumber(row.monto),
    };
  }

  function recargar() {
    if (!perfil?.condominio_id) return;

    cargarReporte(
      perfil.condominio_id,
      perfil.condominio || "",
      periodo
    );
  }

  function imprimirReporte() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando reporte de gastos...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="reporte-gastos-mensuales"
      className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:px-0 print:py-0"
    >
      <style jsx global>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0.35in;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden !important;
          }

          #reporte-gastos-mensuales,
          #reporte-gastos-mensuales * {
            visibility: visible !important;
          }

          #reporte-gastos-mensuales {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            max-width: none !important;
            width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          .print-summary {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 5px !important;
          }

          .print-summary > div {
            padding: 7px !important;
            border-radius: 9px !important;
          }

          .print-summary p:first-child {
            font-size: 7.5px !important;
          }

          .print-summary p:last-child {
            font-size: 11px !important;
            margin-top: 3px !important;
          }

          .print-chart {
            display: none !important;
          }

          .print-table {
            font-size: 8.5px !important;
            line-height: 1.15 !important;
          }

          .print-table th,
          .print-table td {
            padding: 3px 4px !important;
          }

          .print-table thead {
            display: table-header-group !important;
          }

          .print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-header {
            padding-bottom: 8px !important;
            margin-bottom: 8px !important;
          }

          .print-header h1 {
            font-size: 18px !important;
            line-height: 1.05 !important;
          }

          .print-header p {
            font-size: 9px !important;
          }

          .print-section-title {
            margin-top: 8px !important;
            margin-bottom: 5px !important;
            font-size: 11px !important;
          }

          .print-footer {
            margin-top: 10px !important;
            font-size: 8px !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-5 flex max-w-6xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
            VAM Administración
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">
            Reporte de Gastos Mensuales
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta visual y reporte imprimible de los gastos de un mes específico.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="text-sm font-bold text-slate-700">
            Mes
            <select
              value={periodo}
              onChange={(event) => setPeriodo(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-56"
            >
              {generarPeriodos(36).map((item) => (
                <option key={item} value={item}>
                  {nombrePeriodo(item)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={recargar}
            disabled={consultando}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {consultando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar
          </button>

          <button
            type="button"
            onClick={imprimirReporte}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-black text-white hover:bg-blue-900"
          >
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="no-print mx-auto mb-5 max-w-6xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <main className="print-card mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <header className="print-header mb-6 border-b-4 border-blue-900 pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-800">
                VAM Administradora de Condominios
              </p>
              <h1 className="mt-2 text-3xl font-black uppercase text-slate-950">
                Reporte de Gastos Mensuales
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Detalle de gastos operativos y Caja Chica.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 md:min-w-80">
              <div className="flex justify-between gap-4">
                <span className="font-bold">Condominio:</span>
                <span className="text-right">
                  {perfil?.condominio || "Condominio"}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="font-bold">Periodo:</span>
                <span>{nombrePeriodo(periodo)}</span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="font-bold">Fecha de emisión:</span>
                <span>{formatDate(new Date().toISOString())}</span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="font-bold">Registros:</span>
                <span>{gastos.length}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="print-summary grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ResumenCard
            label="Total del mes"
            valor={formatMoney(totalMes)}
            icon={<WalletCards className="h-5 w-5" />}
            clase="border-blue-200 bg-blue-50 text-blue-900"
          />
          <ResumenCard
            label="Gastos generales"
            valor={formatMoney(totalGastosGenerales)}
            icon={<ReceiptText className="h-5 w-5" />}
            clase="border-red-200 bg-red-50 text-red-800"
          />
          <ResumenCard
            label="Caja Chica"
            valor={formatMoney(totalCajaChica)}
            icon={<FileText className="h-5 w-5" />}
            clase="border-amber-200 bg-amber-50 text-amber-800"
          />
          <ResumenCard
            label="Cantidad de gastos"
            valor={String(gastos.length)}
            icon={<CalendarDays className="h-5 w-5" />}
            clase="border-emerald-200 bg-emerald-50 text-emerald-800"
          />
        </section>

        <section className="print-chart mt-7 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-700" />
              <h2 className="font-black text-slate-900">
                Distribución por categoría
              </h2>
            </div>

            {resumenCategorias.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay gastos registrados para este mes.
              </p>
            ) : (
              <div className="space-y-4">
                {resumenCategorias.slice(0, 8).map((item) => (
                  <div key={item.categoria}>
                    <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                      <span className="font-semibold text-slate-700">
                        {item.categoria}
                      </span>
                      <span className="font-black text-slate-900">
                        {formatMoney(item.total)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-700"
                        style={{
                          width: `${Math.max(2, Math.min(100, item.porcentaje))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="font-black text-slate-900">Lectura rápida</h2>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="font-bold text-slate-900">Mayor gasto del mes</p>
                <p className="mt-1">
                  {gastoMayor
                    ? `${gastoMayor.concepto} — ${formatMoney(gastoMayor.monto)}`
                    : "No hay gastos registrados."}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="font-bold text-slate-900">
                  Participación de Caja Chica
                </p>
                <p className="mt-1">
                  {totalMes > 0
                    ? `${((totalCajaChica / totalMes) * 100).toFixed(1)}% del total mensual`
                    : "0.0% del total mensual"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="font-bold text-slate-900">Orden del reporte</p>
                <p className="mt-1">
                  Los gastos se muestran por número de cheque o documento. Los
                  registros sin número aparecen al final.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="print-section-title mb-3 mt-8 flex items-end justify-between gap-4">
            <h2 className="text-lg font-black uppercase tracking-wide text-slate-900">
              Detalle de gastos
            </h2>
            <p className="text-sm font-black text-red-700">
              Total: {formatMoney(totalMes)}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="print-table w-full min-w-[1050px] text-left text-xs md:text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-3">No. cheque / doc.</th>
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3">Concepto</th>
                  <th className="px-3 py-3">Proveedor / Beneficiario</th>
                  <th className="px-3 py-3">Categoría</th>
                  <th className="px-3 py-3">Factura / NCF</th>
                  <th className="px-3 py-3">Origen</th>
                  <th className="px-3 py-3 text-right">Monto</th>
                </tr>
              </thead>

              <tbody>
                {consultando ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      Consultando gastos...
                    </td>
                  </tr>
                ) : gastos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No hay gastos registrados para {nombrePeriodo(periodo)}.
                    </td>
                  </tr>
                ) : (
                  gastos.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-3 font-black text-slate-800">
                        {item.numeroDocumento}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {item.fechaTexto}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-900">
                          {item.concepto}
                        </div>
                        {item.metodoPago !== "-" && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            Método: {item.metodoPago}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">{item.proveedor}</td>
                      <td className="px-3 py-3">{item.categoria}</td>
                      <td className="px-3 py-3 text-xs">
                        <div>Factura: {item.factura}</div>
                        <div className="mt-1">NCF: {item.ncf}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black ${
                            item.fuente === "CAJA_CHICA"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {item.fuente === "CAJA_CHICA"
                            ? "Caja Chica"
                            : "Gasto"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-black text-red-700">
                        {formatMoney(item.monto)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {gastos.length > 0 && (
                <tfoot className="bg-slate-900 text-white">
                  <tr>
                    <td colSpan={7} className="px-3 py-3 text-right font-black">
                      TOTAL DEL MES
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-base font-black">
                      {formatMoney(totalMes)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <footer className="print-footer mt-7 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          Reporte generado por VAM Administradora de Condominios. Este documento
          resume los gastos registrados para el periodo seleccionado.
        </footer>
      </main>
    </div>
  );
}

function ResumenCard({
  label,
  valor,
  icon,
  clase,
}: {
  label: string;
  valor: string;
  icon: React.ReactNode;
  clase: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${clase}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide opacity-80">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-black">{valor}</p>
    </div>
  );
}
