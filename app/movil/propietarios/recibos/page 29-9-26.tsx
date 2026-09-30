"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
};

type Pago = {
  id: number;
  condominio_id: number | null;
  unidad_id: number | null;
  monto: number | string | null;
  fecha_pago: string | null;
  referencia: string | null;
  metodo_pago: string | null;
  metodo: string | null;
  descripcion: string | null;
  periodo: string | null;
  comprobante_url: string | null;
  created_at: string | null;
};

type PagoAplicacion = {
  pago_id: number | null;
  monto_aplicado: number | string | null;
  cargos_periodicos:
    | {
        periodo: string | null;
      }
    | {
        periodo: string | null;
      }[]
    | null;
};

const meses: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

function formatMoney(valor: unknown) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function formatDate(valor: string | null | undefined) {
  if (!valor) return "-";
  const texto = String(valor).slice(0, 10);
  const [anio, mes, dia] = texto.split("-");
  if (!anio || !mes || !dia) return texto;
  return `${dia}/${mes}/${anio}`;
}

function formatPeriodo(valor: string | null | undefined) {
  if (!valor) return "";

  const partes = String(valor)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return partes
    .map((periodo) => {
      const [anioRaw, mesRaw] = periodo.split("-");
      const anio = Number(anioRaw);
      const mes = Number(mesRaw);

      if (!anio || !mes || !meses[mes]) return periodo;
      return `${meses[mes]} ${anio}`;
    })
    .join(", ");
}

export default function RecibosPropietarioPage() {
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [periodosPorPago, setPeriodosPorPago] = useState<
    Record<number, string>
  >({});
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function inicializar() {
    setCargando(true);
    setError("");

    try {
      const raw = localStorage.getItem("propietario_actual");

      if (!raw) {
        router.replace("/movil/propietarios/login");
        return;
      }

      const sesion = JSON.parse(raw) as PropietarioActual;

      if (!sesion?.condominio_id || !sesion?.unidad_id) {
        router.replace("/movil/propietarios/login");
        return;
      }

      setPropietario(sesion);
      await cargarPagos(sesion);
    } catch {
      setError("No se pudo cargar la información del propietario.");
    } finally {
      setCargando(false);
    }
  }

  async function cargarPagos(
    sesion: PropietarioActual,
    modoActualizacion = false
  ) {
    if (modoActualizacion) setActualizando(true);
    setError("");

    const { data, error: pagosError } = await supabase
      .from("pagos")
      .select(`
        id,
        condominio_id,
        unidad_id,
        monto,
        fecha_pago,
        referencia,
        metodo_pago,
        metodo,
        descripcion,
        periodo,
        comprobante_url,
        created_at
      `)
      .eq("condominio_id", sesion.condominio_id)
      .eq("unidad_id", sesion.unidad_id)
      .order("fecha_pago", { ascending: false })
      .order("id", { ascending: false });

    if (pagosError) {
      setPagos([]);
      setError(`No se pudieron cargar los recibos: ${pagosError.message}`);
      if (modoActualizacion) setActualizando(false);
      return;
    }

    const pagosData = (data || []) as Pago[];
    setPagos(pagosData);

    const ids = pagosData.map((pago) => pago.id);

    if (ids.length > 0) {
      const { data: aplicacionesData } = await supabase
        .from("pagos_aplicaciones")
        .select(`
          pago_id,
          monto_aplicado,
          cargos_periodicos (
            periodo
          )
        `)
        .in("pago_id", ids);

      const mapa: Record<number, string[]> = {};

      ((aplicacionesData || []) as PagoAplicacion[]).forEach((item) => {
        const pagoId = Number(item.pago_id || 0);
        if (!pagoId) return;

        const cargo = Array.isArray(item.cargos_periodicos)
          ? item.cargos_periodicos[0]
          : item.cargos_periodicos;

        const periodo = cargo?.periodo || "";
        if (!periodo) return;

        if (!mapa[pagoId]) mapa[pagoId] = [];
        if (!mapa[pagoId].includes(periodo)) mapa[pagoId].push(periodo);
      });

      const normalizado: Record<number, string> = {};
      Object.entries(mapa).forEach(([id, valores]) => {
        normalizado[Number(id)] = valores.sort().join(",");
      });

      setPeriodosPorPago(normalizado);
    } else {
      setPeriodosPorPago({});
    }

    if (modoActualizacion) setActualizando(false);
  }

  const pagosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return pagos;

    return pagos.filter((pago) => {
      const periodo =
        periodosPorPago[pago.id] || pago.periodo || "";
      const contenido = [
        pago.referencia,
        pago.metodo_pago,
        pago.metodo,
        pago.descripcion,
        periodo,
        pago.fecha_pago,
        pago.monto,
      ]
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [pagos, busqueda, periodosPorPago]);

  const totalPagado = useMemo(
    () =>
      pagos.reduce(
        (total, pago) => total + Number(pago.monto || 0),
        0
      ),
    [pagos]
  );

  if (cargando) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 size={20} className="animate-spin text-blue-700" />
            Cargando recibos...
          </div>
        </div>
      </main>
    );
  }

  if (!propietario) return null;

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-7 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/movil/propietarios/dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Volver"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200">
                Pagos
              </p>
              <h1 className="truncate text-base font-black">
                Recibos y comprobantes
              </h1>
            </div>

            <button
              type="button"
              onClick={() => cargarPagos(propietario, true)}
              disabled={actualizando}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 disabled:opacity-60"
              aria-label="Actualizar"
            >
              <RefreshCw
                size={18}
                className={actualizando ? "animate-spin" : ""}
              />
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-3">
            <p className="text-sm font-extrabold">
              {propietario.nombre_propietario}
            </p>
            <p className="mt-0.5 text-xs text-blue-100">
              Unidad {propietario.no_apartamento}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ReceiptText size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-slate-400">
              Recibos
            </p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {pagos.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700">
              <WalletCards size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-emerald-700">
              Total pagado
            </p>
            <p className="mt-1 text-base font-black text-emerald-800">
              {formatMoney(totalPagado)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por periodo, referencia o método"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
            {error}
          </div>
        )}

        <section className="space-y-3">
          {pagosFiltrados.length === 0 ? (
            <div className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-8 text-center shadow-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <FileText size={22} />
              </span>
              <h2 className="mt-3 text-sm font-black text-slate-900">
                No hay recibos disponibles
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Los pagos registrados para esta unidad aparecerán aquí.
              </p>
            </div>
          ) : (
            pagosFiltrados.map((pago) => {
              const periodoRaw =
                periodosPorPago[pago.id] || pago.periodo || "";
              const periodoTexto =
                formatPeriodo(periodoRaw) || "Periodo no identificado";
              const metodo =
                pago.metodo_pago || pago.metodo || "Método no indicado";

              return (
                <article
                  key={pago.id}
                  className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Recibo PG-{String(pago.id).padStart(5, "0")}
                      </p>
                      <h2 className="mt-1 text-sm font-black text-slate-900">
                        {periodoTexto}
                      </h2>
                    </div>

                    <p className="shrink-0 text-base font-black text-blue-900">
                      {formatMoney(pago.monto)}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="flex items-center gap-1 text-slate-400">
                        <CalendarDays size={12} />
                        Fecha
                      </p>
                      <p className="mt-1 font-bold text-slate-700">
                        {formatDate(pago.fecha_pago)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="flex items-center gap-1 text-slate-400">
                        <CreditCard size={12} />
                        Método
                      </p>
                      <p className="mt-1 truncate font-bold text-slate-700">
                        {metodo}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px]">
                    <span className="text-slate-400">Referencia: </span>
                    <span className="font-bold text-slate-700">
                      {pago.referencia || "-"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/movil/propietarios/recibos/${pago.id}`)
                      }
                      className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-800 text-xs font-extrabold text-white"
                    >
                      <ReceiptText size={16} />
                      Ver recibo
                    </button>

                    {pago.comprobante_url ? (
                      <a
                        href={pago.comprobante_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700"
                      >
                        <ExternalLink size={15} />
                        Comprobante
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-400"
                      >
                        Sin comprobante
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
