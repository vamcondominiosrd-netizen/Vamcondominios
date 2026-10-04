"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
};

type SeguimientoPago = {
  id: number;
  monto: number;
  concepto: string | null;
  fecha_pago: string | null;
  metodo_pago: string | null;
  banco: string | null;
  referencia: string | null;
  estado: "ENVIADO" | "RECIBIDO" | "APLICADO" | "RECHAZADO";
  estado_original: string | null;
  enviado_at: string | null;
  recibido_at: string | null;
  revisado_at: string | null;
  aplicado_at: string | null;
  observacion_revision: string | null;
  pago_id: number | null;
  comprobante_url: string | null;
};

const API_SEGUIMIENTO = "/api/propietarios/pagos/seguimiento";
const MODULO_VERSION = "1.0";

function dinero(v: number) {
  return Number(v || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaHoraDO(valor: string | null) {
  if (!valor) return "Pendiente";

  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;

  return d.toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fechaDO(valor: string | null) {
  if (!valor) return "-";
  const base = String(valor).split("T")[0];
  const [y, m, d] = base.split("-");
  return y && m && d ? `${d}/${m}/${y}` : base;
}

function estadoTitulo(estado: SeguimientoPago["estado"]) {
  if (estado === "APLICADO") return "Pago aplicado a su cuenta";
  if (estado === "RECIBIDO") return "Recibido por VAM";
  if (estado === "RECHAZADO") return "Requiere corrección";
  return "Comprobante enviado";
}

function estadoClase(estado: SeguimientoPago["estado"]) {
  if (estado === "APLICADO") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (estado === "RECIBIDO") return "bg-blue-50 text-blue-700 border-blue-200";
  if (estado === "RECHAZADO") return "bg-red-50 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function SeguimientoPagosPropietarioPage() {
  const router = useRouter();
  const [propietario, setPropietario] = useState<PropietarioActual | null>(null);
  const [pagos, setPagos] = useState<SeguimientoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [ultimoPagoId, setUltimoPagoId] = useState<number | null>(null);

  useEffect(() => {
    void inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cerrarSesion() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("propietario_token");
    localStorage.removeItem("propietario_token_expira");
    localStorage.removeItem("ultimo_pago_movil_id");
    router.replace("/movil/propietarios/login");
  }

  async function inicializar() {
    try {
      const raw = localStorage.getItem("propietario_actual");
      const token = String(localStorage.getItem("propietario_token") || "").trim();
      const ultimo = Number(localStorage.getItem("ultimo_pago_movil_id") || 0);

      if (!raw || !token) {
        cerrarSesion();
        return;
      }

      const prop = JSON.parse(raw) as PropietarioActual;

      if (!prop?.condominio_id || !prop?.unidad_id) {
        cerrarSesion();
        return;
      }

      setPropietario(prop);
      setUltimoPagoId(ultimo > 0 ? ultimo : null);
      await cargarPagos(prop, token);
    } catch (error) {
      console.error("Inicializando seguimiento:", error);
      setMensaje("No se pudo cargar el seguimiento de pagos.");
      setLoading(false);
    }
  }

  async function cargarPagos(
    prop = propietario,
    tokenRecibido?: string,
  ) {
    if (!prop) return;

    const token = String(
      tokenRecibido || localStorage.getItem("propietario_token") || "",
    ).trim();

    if (!token) {
      cerrarSesion();
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const params = new URLSearchParams({
        condominio_id: String(prop.condominio_id),
        unidad_id: String(prop.unidad_id),
      });

      const response = await fetch(`${API_SEGUIMIENTO}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const resultado = await response.json().catch(() => ({}));

      if (response.status === 401) {
        cerrarSesion();
        return;
      }

      if (!response.ok || resultado?.ok !== true) {
        throw new Error(resultado?.mensaje || "No se pudo consultar el seguimiento.");
      }

      setPagos(Array.isArray(resultado.pagos) ? resultado.pagos : []);
    } catch (error: any) {
      setMensaje(error?.message || "No se pudo consultar el seguimiento.");
    } finally {
      setLoading(false);
    }
  }

  const pagoDestacado = useMemo(() => {
    if (!pagos.length) return null;
    if (ultimoPagoId) {
      return pagos.find((p) => p.id === ultimoPagoId) || pagos[0];
    }
    return pagos[0];
  }, [pagos, ultimoPagoId]);

  if (!propietario) {
    return <div className="p-6 text-center text-slate-500">Cargando...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-5 text-white shadow">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/movil/propietarios/pagos")}
            className="inline-flex items-center gap-2 text-sm text-blue-100"
          >
            <ArrowLeft size={18} /> Volver a pagos
          </button>

          <button
            type="button"
            onClick={() => cargarPagos()}
            disabled={loading}
            className="rounded-xl bg-white/10 p-2 text-white disabled:opacity-50"
            aria-label="Actualizar seguimiento"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
          Seguimiento de pagos
        </p>
        <h1 className="mt-1 text-2xl font-black">Unidad {propietario.no_apartamento}</h1>
        <p className="mt-1 text-sm text-blue-100">{propietario.condominio_nombre}</p>
      </header>

      {mensaje && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {mensaje}
        </div>
      )}

      {pagoDestacado && (
        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Último pago enviado
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">
                RD$ {dinero(pagoDestacado.monto)}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {pagoDestacado.concepto || "Pago"} · {fechaDO(pagoDestacado.fecha_pago)}
              </p>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${estadoClase(
                pagoDestacado.estado,
              )}`}
            >
              {estadoTitulo(pagoDestacado.estado)}
            </span>
          </div>

          <div className="mt-6 space-y-0">
            <Paso
              titulo="Comprobante enviado"
              detalle={fechaHoraDO(pagoDestacado.enviado_at)}
              completo={true}
              ultimo={false}
            />

            <Paso
              titulo="Recibido por VAM"
              detalle={
                pagoDestacado.estado === "ENVIADO"
                  ? "Pendiente de recepción"
                  : fechaHoraDO(pagoDestacado.recibido_at || pagoDestacado.revisado_at)
              }
              completo={
                pagoDestacado.estado === "RECIBIDO" ||
                pagoDestacado.estado === "APLICADO"
              }
              rechazado={pagoDestacado.estado === "RECHAZADO"}
              ultimo={false}
            />

            <Paso
              titulo="Pago aplicado a su cuenta"
              detalle={
                pagoDestacado.estado === "APLICADO"
                  ? fechaHoraDO(pagoDestacado.aplicado_at)
                  : pagoDestacado.estado === "RECHAZADO"
                    ? "No aplicado"
                    : "Pendiente de aplicación"
              }
              completo={pagoDestacado.estado === "APLICADO"}
              rechazado={pagoDestacado.estado === "RECHAZADO"}
              ultimo={true}
            />
          </div>

          {pagoDestacado.estado === "RECHAZADO" && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="flex items-center gap-2 font-black">
                <XCircle size={18} /> Comprobante requiere corrección
              </div>
              <p className="mt-2 leading-6">
                {pagoDestacado.observacion_revision ||
                  "VAM indicó que debe corregir o reenviar el comprobante."}
              </p>
              <button
                type="button"
                onClick={() => router.push("/movil/propietarios/pagos")}
                className="mt-3 w-full rounded-xl bg-red-700 py-3 font-bold text-white"
              >
                Enviar nuevo comprobante
              </button>
            </div>
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {pagoDestacado.comprobante_url && (
              <button
                type="button"
                onClick={() =>
                  window.open(
                    pagoDestacado.comprobante_url || "",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-3 font-bold text-blue-700"
              >
                <Eye size={18} /> Ver comprobante enviado
              </button>
            )}

            {pagoDestacado.estado === "APLICADO" && (
              <button
                type="button"
                onClick={() => router.push("/movil/propietarios/recibos")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 font-bold text-white"
              >
                <FileCheck2 size={18} /> Ver recibo de pago
              </button>
            )}
          </div>

          {pagoDestacado.estado === "APLICADO" && (
            <button
              type="button"
              onClick={() => router.push("/movil/propietarios/estado-cuenta")}
              className="mt-2 w-full rounded-xl bg-slate-100 py-3 font-bold text-slate-800"
            >
              Ver estado de cuenta actualizado
            </button>
          )}
        </section>
      )}

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-blue-700" size={20} />
          <h2 className="font-black text-slate-900">Mis pagos enviados</h2>
        </div>

        {loading && pagos.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Cargando pagos enviados...
          </div>
        ) : pagos.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Todavía no hay pagos enviados desde esta unidad.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {pagos.map((p) => (
              <article
                key={p.id}
                className={`rounded-2xl border p-4 ${
                  pagoDestacado?.id === p.id
                    ? "border-blue-200 bg-blue-50/40"
                    : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-900">
                      RD$ {dinero(p.monto)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {fechaDO(p.fecha_pago)} · {p.banco || p.metodo_pago || "Pago"}
                    </div>
                    {p.referencia && (
                      <div className="mt-1 text-xs text-slate-400">
                        Ref. {p.referencia}
                      </div>
                    )}
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${estadoClase(
                      p.estado,
                    )}`}
                  >
                    {estadoTitulo(p.estado)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="pb-2 pt-1 text-center text-[10px] text-slate-400">
        VAM Administración de Condominios · Seguimiento de Pagos V{MODULO_VERSION}
      </footer>
    </div>
  );
}

function Paso({
  titulo,
  detalle,
  completo,
  rechazado = false,
  ultimo,
}: {
  titulo: string;
  detalle: string;
  completo: boolean;
  rechazado?: boolean;
  ultimo: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
            rechazado
              ? "border-red-600 bg-red-600 text-white"
              : completo
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-300 bg-white text-slate-400"
          }`}
        >
          {rechazado ? (
            <XCircle size={17} />
          ) : completo ? (
            <CheckCircle2 size={17} />
          ) : (
            <Clock3 size={16} />
          )}
        </div>
        {!ultimo && (
          <div
            className={`h-12 w-0.5 ${
              completo ? "bg-emerald-300" : "bg-slate-200"
            }`}
          />
        )}
      </div>

      <div className="pb-5 pt-1">
        <div className="text-sm font-black text-slate-900">{titulo}</div>
        <div className="mt-1 text-xs text-slate-500">{detalle}</div>
      </div>
    </div>
  );
}
