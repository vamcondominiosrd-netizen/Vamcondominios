"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  BellRing,
  Building2,
  CheckCheck,
  ChevronRight,
  Inbox,
  MessageSquareText,
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

function formatoFecha(valor?: string | null) {
  if (!valor) return "";

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
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

export default function ComunicacionesPropietarioPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(null);
  const [comunicaciones, setComunicaciones] = useState<Comunicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
      void cargarComunicaciones(sesion, token);
    } catch {
      router.replace("/movil/propietarios/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function cargarComunicaciones(prop: PropietarioActual, token: string) {
    setCargando(true);
    setError("");

    const { data, error: errorRpc } = await supabase.rpc(
      RPC_LISTAR_COMUNICACIONES,
      {
        p_token: token,
        p_condominio_id: prop.condominio_id,
        p_unidad_id: prop.unidad_id,
      }
    );

    if (errorRpc) {
      console.error("Error cargando comunicaciones:", errorRpc);
      setError("No se pudieron cargar las comunicaciones en este momento.");
      setComunicaciones([]);
      setCargando(false);
      return;
    }

    const lista = normalizarComunicaciones(data)
      .filter((item) => String(item.estado || "").toUpperCase() !== "ANULADA")
      .sort((a, b) =>
        String(b.enviada_at || "").localeCompare(String(a.enviada_at || ""))
      );

    setComunicaciones(lista);
    setCargando(false);
  }

  function abrirComunicacion(item: Comunicacion) {
    try {
      sessionStorage.setItem(
        `vam_comunicacion_${item.id}`,
        JSON.stringify(item)
      );
    } catch {
      // Si sessionStorage falla, la pantalla detalle vuelve a consultar por RPC.
    }

    router.push(`/movil/propietarios/comunicaciones/${item.id}`);
  }

  const pendientes = useMemo(
    () => comunicaciones.filter((item) => !item.leida_at).length,
    [comunicaciones]
  );

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-16 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/movil/propietarios/dashboard")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/20"
              aria-label="Volver al inicio"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-blue-100">
                {propietario?.condominio_nombre || "VAM Condominios"}
              </p>
              <h1 className="text-xl font-black tracking-tight">
                Mis comunicaciones
              </h1>
              {propietario && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-blue-100">
                  <Building2 size={13} />
                  Unidad {propietario.no_apartamento}
                </p>
              )}
            </div>

            {pendientes > 0 && (
              <span className="flex min-h-9 min-w-9 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-black text-white shadow-lg ring-2 ring-white/30">
                {pendientes > 99 ? "99+" : pendientes}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="-mt-10 mx-auto max-w-lg space-y-4 px-4">
        <section className="rounded-[1.6rem] border border-white/60 bg-white p-4 shadow-xl shadow-slate-900/10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <MessageSquareText size={22} />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Comunicaciones para usted
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Consulte aquí sus recordatorios y mensajes enviados por la administración.
              </p>
            </div>
          </div>
        </section>

        {cargando && (
          <section className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </section>
        )}

        {!cargando && error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </section>
        )}

        {!cargando && !error && comunicaciones.length === 0 && (
          <section className="rounded-[1.6rem] border border-slate-200 bg-white p-7 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Inbox size={26} />
            </span>
            <h2 className="mt-4 text-base font-black text-slate-900">
              No tiene comunicaciones
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">
              Cuando la administración le envíe una comunicación, aparecerá disponible en esta sección.
            </p>
          </section>
        )}

        {!cargando && !error && comunicaciones.length > 0 && (
          <section className="space-y-3">
            {comunicaciones.map((item) => {
              const noLeida = !item.leida_at;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => abrirComunicacion(item)}
                  className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition active:scale-[0.99] ${
                    noLeida
                      ? "border-red-200 bg-gradient-to-r from-red-50 to-white hover:border-red-300"
                      : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        noLeida
                          ? "bg-red-600 text-white"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {noLeida ? <BellRing size={20} /> : <CheckCheck size={20} />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                            noLeida
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {noLeida ? "Nueva" : "Leída"}
                        </span>

                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {etiquetaTipo(item.tipo)}
                        </span>
                      </div>

                      <h3 className="mt-2 line-clamp-2 text-sm font-black leading-5 text-slate-900">
                        {item.titulo || "Comunicación"}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                        {item.periodo && (
                          <span className="font-semibold">Período: {item.periodo}</span>
                        )}
                        {item.enviada_at && <span>{formatoFecha(item.enviada_at)}</span>}
                      </div>
                    </div>

                    <ChevronRight
                      size={19}
                      className={`mt-1 shrink-0 transition group-hover:translate-x-0.5 ${
                        noLeida ? "text-red-500" : "text-slate-300"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </section>
        )}

        <footer className="pb-2 pt-1 text-center">
          <p className="text-[10px] text-slate-400">
            VAM Administración de Condominios
          </p>
        </footer>
      </div>
    </main>
  );
}
