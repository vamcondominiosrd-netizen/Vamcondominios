"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileImage,
  FileText,
  Landmark,
  Loader2,
  ReceiptText,
  ShieldCheck,
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

type Gasto = {
  id: number;
  condominio_id: number | null;
  fecha: string | null;
  categoria: string | null;
  descripcion: string | null;
  proveedor: string | null;
  monto: number | string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  itbis: number | string | null;
  total: number | string | null;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  factura_url: string | null;
  estado: string | null;
  cheque_url: string | null;
  numero_cheque: string | null;
  fecha_pago: string | null;
  pagado: boolean | null;
};

const money = (v: unknown) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(v || 0));

const fmt = (v?: string | null) => {
  if (!v) return "-";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : String(v);
};

const periodoFecha = (v?: string | null) => (v ? String(v).slice(0, 7) : "");

const esPeriodoCerrado = (estado?: string | null) =>
  ["cerrado", "cerrada"].includes(
    String(estado || "")
      .trim()
      .toLowerCase()
  );

const RUTA_RESUMEN =
  "/movil/propietarios/resumen-financiero";

export default function DetalleGastoPropietarioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);
  const [gasto, setGasto] = useState<Gasto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void cargar();
  }, [params?.id]);

  async function cargar() {
    setLoading(true);
    setError("");

    try {
      const raw = localStorage.getItem("propietario_actual");

      if (!raw) {
        router.replace("/movil/propietarios/login");
        return;
      }

      const s = JSON.parse(raw) as PropietarioActual;

      if (!s?.propietario_id || !s?.condominio_id || !s?.unidad_id) {
        router.replace("/movil/propietarios/login");
        return;
      }

      const id = Number(params?.id);

      if (!Number.isFinite(id) || id <= 0) {
        setError("El gasto indicado no es válido.");
        return;
      }

      setPropietario(s);

      const { data, error: gastoError } = await supabase
        .from("gastos")
        .select(
          "id,condominio_id,fecha,categoria,descripcion,proveedor,monto,concepto,detalle_gasto,itbis,total,no_factura,ncf,metodo_pago,cuenta_banco,factura_url,estado,cheque_url,numero_cheque,fecha_pago,pagado"
        )
        .eq("id", id)
        .eq("condominio_id", s.condominio_id)
        .maybeSingle();

      if (gastoError) throw gastoError;

      if (!data) {
        setError("No se encontró el gasto o no pertenece a este condominio.");
        return;
      }

      const gastoEncontrado = data as Gasto;
      const periodo = periodoFecha(
        gastoEncontrado.fecha_pago || gastoEncontrado.fecha
      );

      if (!periodo) {
        setError(
          "El gasto no tiene una fecha válida para verificar el cierre mensual."
        );
        return;
      }

      const { data: cierreData, error: cierreError } = await supabase
        .from("banco_cierres_mensuales")
        .select("periodo,estado")
        .eq("condominio_id", s.condominio_id)
        .eq("periodo", periodo)
        .limit(1)
        .maybeSingle();

      if (cierreError) throw cierreError;

      if (!cierreData || !esPeriodoCerrado(cierreData.estado)) {
        setError(
          "Este gasto pertenece a un periodo que todavía no está cerrado y no puede ser consultado por propietarios."
        );
        return;
      }

      setGasto(gastoEncontrado);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el gasto.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600">
            <Loader2 size={20} className="animate-spin text-blue-700" />
            Cargando gasto...
          </div>
        </div>
      </main>
    );
  }

  if (!propietario) return null;

  if (error || !gasto) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => router.push(RUTA_RESUMEN)}
            className="mb-4 flex items-center gap-2 text-sm font-bold text-blue-800"
          >
            <ArrowLeft size={18} />
            Volver al resumen
          </button>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error || "No se encontró el gasto."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-7 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push(RUTA_RESUMEN)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Volver al resumen"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200">
                Transparencia financiera
              </p>
              <h1 className="truncate text-base font-black">
                Detalle del gasto
              </h1>
            </div>

            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              <ShieldCheck size={18} />
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
            {propietario.condominio_logo_url ? (
              <img
                src={propietario.condominio_logo_url}
                alt={propietario.condominio_nombre}
                className="h-11 w-11 rounded-xl bg-white object-contain p-1.5"
              />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xs font-black text-blue-900">
                VAM
              </span>
            )}

            <div>
              <p className="text-sm font-extrabold">
                {propietario.condominio_nombre}
              </p>
              <p className="text-[11px] text-blue-100">
                Unidad {propietario.no_apartamento}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <section className="rounded-[1.4rem] border bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
            {gasto.categoria || "Gasto"}
          </p>

          <h2 className="mt-1 text-base font-black text-slate-900">
            {gasto.concepto ||
              gasto.descripcion ||
              gasto.detalle_gasto ||
              "Gasto operativo"}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {gasto.proveedor || "Proveedor no indicado"}
          </p>

          <div className="mt-4 rounded-2xl bg-gradient-to-br from-blue-800 to-blue-950 p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-200">
              Total pagado
            </p>
            <p className="mt-1 text-2xl font-black">
              {money(gasto.total || gasto.monto)}
            </p>
          </div>
        </section>

        <section className="rounded-[1.4rem] border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">
            Información del gasto
          </h3>

          <div className="mt-3 divide-y divide-slate-100">
            <Fila
              icono={<CalendarDays size={15} />}
              etiqueta="Fecha"
              valor={fmt(gasto.fecha_pago || gasto.fecha)}
            />
            <Fila
              icono={<ReceiptText size={15} />}
              etiqueta="Factura"
              valor={gasto.no_factura || "-"}
            />
            <Fila
              icono={<FileText size={15} />}
              etiqueta="NCF"
              valor={gasto.ncf || "-"}
            />
            <Fila
              icono={<WalletCards size={15} />}
              etiqueta="Método de pago"
              valor={gasto.metodo_pago || "-"}
            />
            <Fila
              icono={<Landmark size={15} />}
              etiqueta="Cuenta"
              valor={gasto.cuenta_banco || "-"}
            />
            <Fila
              icono={<FileText size={15} />}
              etiqueta="Cheque"
              valor={gasto.numero_cheque || "-"}
            />
            <Fila
              icono={<CheckCircle2 size={15} />}
              etiqueta="Estado"
              valor={
                gasto.pagado ? "Pagado" : gasto.estado || "Registrado"
              }
            />
          </div>
        </section>

        {(gasto.descripcion || gasto.detalle_gasto) && (
          <section className="rounded-[1.4rem] border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-black">Descripción</h3>
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
              {gasto.detalle_gasto || gasto.descripcion}
            </p>
          </section>
        )}

        <section className="rounded-[1.4rem] border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black">Documentos anexos</h3>
          <p className="mt-1 text-[10px] text-slate-500">
            Soportes cargados desde el módulo de gastos
          </p>

          <div className="mt-4 space-y-2">
            {gasto.factura_url && (
              <a
                href={gasto.factura_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-extrabold text-blue-800"
              >
                <span className="flex items-center gap-2">
                  <FileImage size={16} />
                  Ver factura
                </span>
                <ExternalLink size={14} />
              </a>
            )}

            {gasto.cheque_url && (
              <a
                href={gasto.cheque_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-extrabold text-emerald-800"
              >
                <span className="flex items-center gap-2">
                  <FileText size={16} />
                  Ver cheque o comprobante
                </span>
                <ExternalLink size={14} />
              </a>
            )}

            {!gasto.factura_url && !gasto.cheque_url && (
              <div className="rounded-xl bg-slate-100 px-3 py-4 text-center text-xs text-slate-500">
                Este gasto no tiene documentos anexos disponibles.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Fila({
  icono,
  etiqueta,
  valor,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        {icono}
      </span>

      <div>
        <p className="text-[10px] text-slate-400">{etiqueta}</p>
        <p className="text-xs font-extrabold text-slate-800">{valor}</p>
      </div>
    </div>
  );
}
