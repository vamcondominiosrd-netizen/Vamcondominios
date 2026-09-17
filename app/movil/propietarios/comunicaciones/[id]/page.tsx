"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  BellRing,
  Building2,
  CalendarDays,
  CheckCheck,
  Clock3,
  ReceiptText,
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

type Comunicacion = {
  id: number;
  titulo: string;
  mensaje?: string | null;
  tipo?: string | null;
  periodo?: string | null;
  prioridad?: string | null;
  estado?: string | null;
  monto?: number | string | null;
  fecha_vencimiento?: string | null;
  enviada_at?: string | null;
  leida_at?: string | null;
};

const RPC_LISTAR_COMUNICACIONES = "listar_comunicaciones_propietario";
const RPC_MARCAR_LEIDA = "marcar_comunicacion_leida_propietario";

function normalizarComunicaciones(data: unknown): Comunicacion[] {
  if (Array.isArray(data)) return data as Comunicacion[];

  if (data && typeof data === "object") {
    const objeto = data as Record<string, unknown>;

    if (Array.isArray(objeto.comunicaciones)) {
      return objeto.comunicaciones as Comunicacion[];
    }

    if (Array.isArray(objeto.data)) {
      return objeto.data as Comunicacion[];
    }
  }

  return [];
}

function formatoFecha(valor?: string | null, incluirHora = false) {
  if (!valor) return "";

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(incluirHora
      ? {
          hour: "2-digit" as const,
          minute: "2-digit" as const,
        }
      : {}),
  }).format(fecha);
}

function formatoMoneda(valor?: number | string | null) {
  if (valor === null || valor === undefined || valor === "") return "";

  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function etiquetaTipo(tipo?: string | null) {
  switch (String(tipo || "").toUpperCase()) {
    case "RECORDATORIO_CUOTA":
      return "Recordatorio de cuota";
    case "AVISO":
      return "Aviso";
    default:
      return tipo?.replaceAll("_", " ") || "Comunicación";
  }
}

export default function ComunicacionPropietarioDetallePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const comunicacionId = Number(params?.id);

  const [propietario, setPropietario] = useState<PropietarioActual | null>(null);
  const [comunicacion, setComunicacion] = useState<Comunicacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isFinite(comunicacionId) || comunicacionId <= 0) {
      setError("La comunicación solicitada no es válida.");
      setCargando(false);
      return;
    }

    try {
      const raw = localStorage.getItem("propietario_actual");
      const token = localStorage.getItem("propietario_token");

      if (!raw || !token) {
        router.replace("/movil/propietarios/login");
        return;
      }

      const sesion = JSON.parse(raw) as PropietarioActual;

      if (!sesion?.propietario_id || !sesion?.condominio_id || !sesion?.unidad_id) {
        router.replace("/movil/propietarios/login");
        return;
      }

      setPropietario(sesion);
      void cargarDetalle(sesion, token);
    } catch {
      router.replace("/movil/propietarios/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comunicacionId, router]);

  async function cargarDetalle(prop: PropietarioActual, token: string) {
    setCargando(true);
    setError("");

    let encontrada: Comunicacion | null = null;

    try {
      const cache = sessionStorage.getItem(`vam_comunicacion_${comunicacionId}`);
      if (cache) {
        encontrada = JSON.parse(cache) as Comunicacion;
      }
    } catch {
      encontrada = null;
    }

    // Siempre se valida nuevamente contra el servidor para no confiar solamente
    // en la información guardada en sessionStorage.
    const { data, error: errorRpc } = await supabase.rpc(
      RPC_LISTAR_COMUNICACIONES,
      {
        p_token: token,
        p_condominio_id: prop.condominio_id,
        p_unidad_id: prop.unidad_id,
      }
    );

    if (errorRpc) {
      console.error("Error validando comunicación:", errorRpc);

      if (!encontrada) {
        setError("No se pudo abrir esta comunicación en este momento.");
        setCargando(false);
        return;
      }
    } else {
      const lista = normalizarComunicaciones(data);
      encontrada = lista.find((item) => Number(item.id) === comunicacionId) || null;
    }

    if (!encontrada || String(encontrada.estado || "").toUpperCase() === "ANULADA") {
      setError("Esta comunicación no está disponible.");
      setCargando(false);
      return;
    }

    setComunicacion(encontrada);
    setCargando(false);

    if (!encontrada.leida_at) {
      void marcarComoLeida(prop, token, encontrada);
    }
  }

  async function marcarComoLeida(
    prop: PropietarioActual,
    token: string,
    item: Comunicacion
  ) {
    const { error: errorLectura } = await supabase.rpc(RPC_MARCAR_LEIDA, {
      p_token: token,
      p_comunicacion_id: item.id,
      p_condominio_id: prop.condominio_id,
      p_unidad_id: prop.unidad_id,
    });

    if (errorLectura) {
      // La comunicación puede visualizarse aunque falle el registro de lectura.
      // El error se deja en consola para no bloquear al propietario.
      console.error("No se pudo registrar la lectura:", errorLectura);
      return;
    }

    const leidaAt = new Date().toISOString();

    setComunicacion((actual) =>
      actual ? { ...actual, estado: "LEIDA", leida_at: leidaAt } : actual
    );

    try {
      sessionStorage.setItem(
        `vam_comunicacion_${item.id}`,
        JSON.stringify({ ...item, estado: "LEIDA", leida_at: leidaAt })
      );
    } catch {
      // No es crítico para el flujo.
    }
  }

  if (cargando) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
            Abriendo comunicación...
          </div>
        </div>
      </main>
    );
  }

  if (error || !comunicacion) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => router.push("/movil/propietarios/comunicaciones")}
            className="mb-4 flex items-center gap-2 text-sm font-bold text-blue-800"
          >
            <ArrowLeft size={18} />
            Volver a comunicaciones
          </button>

          <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-red-700">
              {error || "No se pudo cargar la comunicación."}
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-16 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/movil/propietarios/comunicaciones")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/20"
              aria-label="Volver a comunicaciones"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-blue-100">
                {propietario?.condominio_nombre || "VAM Condominios"}
              </p>
              <h1 className="truncate text-lg font-black tracking-tight">
                Comunicación
              </h1>
              {propietario && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-blue-100">
                  <Building2 size={13} />
                  Unidad {propietario.no_apartamento}
                </p>
              )}
            </div>

            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              {comunicacion.leida_at ? <CheckCheck size={20} /> : <BellRing size={20} />}
            </span>
          </div>
        </div>
      </header>

      <div className="-mt-10 mx-auto max-w-lg space-y-4 px-4">
        <article className="overflow-hidden rounded-[1.6rem] border border-white/60 bg-white shadow-xl shadow-slate-900/10">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                {etiquetaTipo(comunicacion.tipo)}
              </span>

              {comunicacion.leida_at && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                  Leída
                </span>
              )}
            </div>

            <h2 className="mt-4 text-xl font-black leading-7 tracking-tight text-slate-950">
              {comunicacion.titulo || "Comunicación"}
            </h2>

            {comunicacion.enviada_at && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock3 size={13} />
                Enviada el {formatoFecha(comunicacion.enviada_at, true)}
              </p>
            )}
          </div>

          {(comunicacion.periodo ||
            comunicacion.monto !== null && comunicacion.monto !== undefined ||
            comunicacion.fecha_vencimiento) && (
            <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-3">
              {comunicacion.periodo && (
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Período
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-800">
                    {comunicacion.periodo}
                  </p>
                </div>
              )}

              {comunicacion.monto !== null && comunicacion.monto !== undefined && (
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <ReceiptText size={11} />
                    Monto
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-800">
                    {formatoMoneda(comunicacion.monto)}
                  </p>
                </div>
              )}

              {comunicacion.fecha_vencimiento && (
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <CalendarDays size={11} />
                    Fecha límite
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-800">
                    {formatoFecha(comunicacion.fecha_vencimiento)}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="p-5">
            <div className="whitespace-pre-line text-sm leading-7 text-slate-700">
              {comunicacion.mensaje || "Esta comunicación no contiene un mensaje adicional."}
            </div>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <p className="text-xs font-bold text-blue-900">
                Administración del {propietario?.condominio_nombre || "condominio"}
              </p>
              <p className="mt-1 text-[11px] text-blue-700">
                Gestión realizada a través de VAM Administración de Condominios.
              </p>
            </div>
          </div>
        </article>

        <button
          type="button"
          onClick={() => router.push("/movil/propietarios/comunicaciones")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-800 px-4 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-900 active:scale-[0.99]"
        >
          <ArrowLeft size={17} />
          Volver a mis comunicaciones
        </button>

        <footer className="pb-2 pt-1 text-center">
          <p className="text-[10px] text-slate-400">
            VAM Administración de Condominios
          </p>
        </footer>
      </div>
    </main>
  );
}
