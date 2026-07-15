"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  UserRound,
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
  unidades:
    | {
        codigo: string | null;
        propietario_nombre: string | null;
      }
    | {
        codigo: string | null;
        propietario_nombre: string | null;
      }[]
    | null;
};

type AplicacionPago = {
  id: number;
  pago_id: number | null;
  monto_aplicado: number | string | null;
  observacion: string | null;
  cargos_periodicos:
    | {
        periodo: string | null;
        concepto: string | null;
        monto: number | string | null;
        balance: number | string | null;
        estado: string | null;
      }
    | {
        periodo: string | null;
        concepto: string | null;
        monto: number | string | null;
        balance: number | string | null;
        estado: string | null;
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

function dinero(valor: unknown) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function fecha(valor: string | null | undefined) {
  if (!valor) return "-";
  const texto = String(valor).slice(0, 10);
  const [anio, mes, dia] = texto.split("-");
  if (!anio || !mes || !dia) return texto;
  return `${dia}/${mes}/${anio}`;
}

function periodoBonito(valor: string | null | undefined) {
  if (!valor) return "-";

  return String(valor)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [anioRaw, mesRaw] = item.split("-");
      const anio = Number(anioRaw);
      const mes = Number(mesRaw);
      if (!anio || !mes || !meses[mes]) return item;
      return `${meses[mes]} ${anio}`;
    })
    .join(", ");
}

export default function ReciboPropietarioMovilPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);
  const [pago, setPago] = useState<Pago | null>(null);
  const [aplicaciones, setAplicaciones] = useState<AplicacionPago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const pagoId = useMemo(() => Number(params?.id), [params?.id]);

  useEffect(() => {
    void cargarRecibo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagoId]);

  async function cargarRecibo() {
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

      if (!Number.isFinite(pagoId) || pagoId <= 0) {
        setError("El recibo indicado no es válido.");
        return;
      }

      setPropietario(sesion);

      const { data, error: pagoError } = await supabase
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
          created_at,
          unidades (
            codigo,
            propietario_nombre
          )
        `)
        .eq("id", pagoId)
        .eq("condominio_id", sesion.condominio_id)
        .eq("unidad_id", sesion.unidad_id)
        .maybeSingle();

      if (pagoError) throw pagoError;

      if (!data) {
        setError("No se encontró el recibo o no pertenece a esta unidad.");
        return;
      }

      setPago(data as Pago);

      const { data: aplicacionesData, error: aplicacionesError } =
        await supabase
          .from("pagos_aplicaciones")
          .select(`
            id,
            pago_id,
            monto_aplicado,
            observacion,
            cargos_periodicos (
              periodo,
              concepto,
              monto,
              balance,
              estado
            )
          `)
          .eq("pago_id", pagoId)
          .order("id", { ascending: true });

      if (aplicacionesError) {
        setAplicaciones([]);
      } else {
        setAplicaciones((aplicacionesData || []) as AplicacionPago[]);
      }
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el recibo.");
    } finally {
      setCargando(false);
    }
  }

  if (cargando) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 size={20} className="animate-spin text-blue-700" />
            Cargando recibo...
          </div>
        </div>
      </main>
    );
  }

  if (!propietario) return null;

  if (error || !pago) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => router.push("/movil/propietarios/recibos")}
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-800"
          >
            <ArrowLeft size={18} />
            Volver a recibos
          </button>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error || "No se encontró el recibo."}
          </div>
        </div>
      </main>
    );
  }

  const unidad = Array.isArray(pago.unidades)
    ? pago.unidades[0]
    : pago.unidades;

  const periodosAplicados = aplicaciones
    .map((item) => {
      const cargo = Array.isArray(item.cargos_periodicos)
        ? item.cargos_periodicos[0]
        : item.cargos_periodicos;
      return cargo?.periodo || "";
    })
    .filter(Boolean);

  const periodoTexto =
    periodoBonito(
      periodosAplicados.length > 0
        ? Array.from(new Set(periodosAplicados)).join(",")
        : pago.periodo
    ) || "-";

  const totalAplicado = aplicaciones.reduce(
    (total, item) => total + Number(item.monto_aplicado || 0),
    0
  );

  const noAplicado = Math.max(Number(pago.monto || 0) - totalAplicado, 0);
  const numeroRecibo = `PG-${String(pago.id).padStart(5, "0")}`;

  return (
    <main
      id="recibo-propietario-movil"
      className="min-h-dvh bg-slate-100 pb-8 print:bg-white print:pb-0"
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

          #recibo-propietario-movil,
          #recibo-propietario-movil * {
            visibility: visible !important;
          }

          #recibo-propietario-movil {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>

      <header className="no-print bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-7 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/movil/propietarios/recibos")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Volver"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200">
                Recibos
              </p>
              <h1 className="truncate text-base font-black">
                Detalle del recibo
              </h1>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Imprimir"
            >
              <Printer size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4 print:max-w-none print:px-0 print:pt-0">
        <section className="print-card rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              {propietario.condominio_logo_url ? (
                <img
                  src={propietario.condominio_logo_url}
                  alt={propietario.condominio_nombre}
                  className="h-12 w-12 rounded-2xl bg-white object-contain p-1.5 ring-1 ring-slate-200"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-900 text-sm font-black text-white">
                  VAM
                </span>
              )}

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
                  VAM Administración
                </p>
                <h2 className="text-sm font-black text-slate-900">
                  Recibo de pago
                </h2>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-slate-400">Recibo</p>
              <p className="text-sm font-black text-slate-900">
                {numeroRecibo}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-gradient-to-br from-blue-800 to-blue-950 p-4 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-200">
                  Monto recibido
                </p>
                <p className="mt-1 text-2xl font-black">
                  {dinero(pago.monto)}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <WalletCards size={22} />
              </span>
            </div>

            <p className="mt-2 text-xs text-blue-100">
              Pago registrado correctamente
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <DatoIcono
              icono={<Building2 size={16} />}
              etiqueta="Condominio"
              valor={propietario.condominio_nombre}
            />
            <DatoIcono
              icono={<UserRound size={16} />}
              etiqueta="Unidad"
              valor={unidad?.codigo || propietario.no_apartamento}
            />
            <DatoIcono
              icono={<CalendarDays size={16} />}
              etiqueta="Fecha"
              valor={fecha(pago.fecha_pago)}
            />
            <DatoIcono
              icono={<CreditCard size={16} />}
              etiqueta="Método"
              valor={pago.metodo_pago || pago.metodo || "-"}
            />
          </div>
        </section>

        <section className="print-card rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ReceiptText size={18} />
            </span>
            <h3 className="text-sm font-black text-slate-900">
              Datos del pago
            </h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <Fila etiqueta="Propietario" valor={propietario.nombre_propietario} />
            <Fila etiqueta="Periodo pagado" valor={periodoTexto} />
            <Fila etiqueta="Referencia" valor={pago.referencia || "-"} />
            <Fila
              etiqueta="Monto aplicado"
              valor={dinero(totalAplicado)}
            />
            {noAplicado > 0 && (
              <Fila
                etiqueta="Monto no aplicado"
                valor={dinero(noAplicado)}
              />
            )}
          </div>
        </section>

        <section className="print-card rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Aplicación del pago
              </h3>
              <p className="text-[10px] text-slate-500">
                Detalle de los periodos cubiertos
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {aplicaciones.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                Este pago no tiene aplicaciones registradas.
              </div>
            ) : (
              aplicaciones.map((item) => {
                const cargo = Array.isArray(item.cargos_periodicos)
                  ? item.cargos_periodicos[0]
                  : item.cargos_periodicos;

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900">
                          {periodoBonito(cargo?.periodo)}
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-slate-500">
                          {cargo?.concepto || item.observacion || "Pago aplicado"}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-black text-emerald-700">
                        {dinero(item.monto_aplicado)}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">
                        Balance actual
                      </span>
                      <span
                        className={`font-bold ${
                          Number(cargo?.balance || 0) <= 0
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {dinero(cargo?.balance)}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {pago.descripcion && (
          <section className="print-card rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <FileText size={18} />
              </span>
              <h3 className="text-sm font-black text-slate-900">
                Observación
              </h3>
            </div>

            <p className="text-xs leading-5 text-slate-600">
              {pago.descripcion}
            </p>
          </section>
        )}

        {pago.comprobante_url && (
          <a
            href={pago.comprobante_url}
            target="_blank"
            rel="noopener noreferrer"
            className="no-print flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 text-sm font-extrabold text-blue-800"
          >
            <ExternalLink size={17} />
            Ver comprobante cargado
          </a>
        )}

        <section className="print-card rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0 text-emerald-700"
            />
            <p className="text-xs leading-5 text-emerald-800">
              Este recibo confirma que el pago fue registrado para la unidad{" "}
              <strong>{unidad?.codigo || propietario.no_apartamento}</strong>.
              Para cualquier aclaración, contacte a la administración.
            </p>
          </div>
        </section>

        <p className="pb-2 text-center text-[10px] text-slate-400">
          VAM Administración de Condominios · 829-792-9292
        </p>
      </div>
    </main>
  );
}

function DatoIcono({
  icono,
  etiqueta,
  valor,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icono}
        <span className="text-[10px]">{etiqueta}</span>
      </div>
      <p className="mt-1.5 break-words font-bold text-slate-800">
        {valor || "-"}
      </p>
    </div>
  );
}

function Fila({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-slate-500">{etiqueta}</span>
      <span className="max-w-[62%] text-right font-bold text-slate-800">
        {valor}
      </span>
    </div>
  );
}
