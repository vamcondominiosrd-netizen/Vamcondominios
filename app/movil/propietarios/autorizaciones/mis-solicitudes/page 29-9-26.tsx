"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleX,
  Clock3,
  FileClock,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Wrench,
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

type Autorizacion = {
  id: number;
  codigo_autorizacion: string | null;
  tipo_solicitud: string | null;
  tipo_trabajo: string | null;
  fecha_solicitud: string | null;
  fecha_programada: string;
  hora_entrada: string | null;
  hora_salida_estimada: string | null;
  nombre_visitante: string | null;
  empresa: string | null;
  estado: string | null;
  estado_financiero: string | null;
  motivo_rechazo: string | null;
  observacion_admin: string | null;
  fecha_aprobacion: string | null;
  fecha_rechazo: string | null;
  qr_generado: boolean | null;
  created_at: string | null;
};

type FiltroEstado = "TODAS" | "PENDIENTE" | "APROBADA" | "RECHAZADA" | "FINALIZADA";

function normalizarEstado(valor: string | null | undefined) {
  return String(valor || "PENDIENTE")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function formatDate(valor: string | null | undefined) {
  if (!valor) return "-";

  const fecha = new Date(`${String(valor).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(fecha.getTime())) return String(valor).slice(0, 10);

  return fecha.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(valor: string | null | undefined) {
  if (!valor) return "-";

  const partes = String(valor).split(":");
  const horas = Number(partes[0]);
  const minutos = partes[1] || "00";

  if (!Number.isFinite(horas)) return String(valor);

  const periodo = horas >= 12 ? "p. m." : "a. m.";
  const hora12 = horas % 12 || 12;

  return `${hora12}:${minutos} ${periodo}`;
}

function configuracionEstado(estadoOriginal: string | null) {
  const estado = normalizarEstado(estadoOriginal);

  if (["APROBADA", "APROBADO"].includes(estado)) {
    return {
      texto: "Aprobada",
      clases: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icono: CheckCircle2,
    };
  }

  if (["RECHAZADA", "RECHAZADO"].includes(estado)) {
    return {
      texto: "Rechazada",
      clases: "bg-red-50 text-red-700 border-red-200",
      icono: CircleX,
    };
  }

  if (
    ["FINALIZADA", "FINALIZADO", "COMPLETADA", "COMPLETADO"].includes(estado)
  ) {
    return {
      texto: "Finalizada",
      clases: "bg-slate-100 text-slate-700 border-slate-200",
      icono: ShieldCheck,
    };
  }

  if (["EN_PROCESO", "PROCESO"].includes(estado)) {
    return {
      texto: "En proceso",
      clases: "bg-violet-50 text-violet-700 border-violet-200",
      icono: FileClock,
    };
  }

  return {
    texto: "Pendiente",
    clases: "bg-amber-50 text-amber-700 border-amber-200",
    icono: Clock3,
  };
}

export default function AutorizacionesPropietarioPage() {
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);
  const [solicitudes, setSolicitudes] = useState<Autorizacion[]>([]);
  const [filtro, setFiltro] = useState<FiltroEstado>("TODAS");
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

      if (
        !sesion?.propietario_id ||
        !sesion?.condominio_id ||
        !sesion?.unidad_id
      ) {
        router.replace("/movil/propietarios/login");
        return;
      }

      setPropietario(sesion);
      await cargarSolicitudes(sesion);
    } catch {
      setError("No se pudo cargar la información del propietario.");
    } finally {
      setCargando(false);
    }
  }

  async function cargarSolicitudes(
    sesion: PropietarioActual,
    modoActualizacion = false
  ) {
    if (modoActualizacion) setActualizando(true);
    setError("");

    const { data, error: consultaError } = await supabase
      .from("autorizaciones")
      .select(`
        id,
        codigo_autorizacion,
        tipo_solicitud,
        tipo_trabajo,
        fecha_solicitud,
        fecha_programada,
        hora_entrada,
        hora_salida_estimada,
        nombre_visitante,
        empresa,
        estado,
        estado_financiero,
        motivo_rechazo,
        observacion_admin,
        fecha_aprobacion,
        fecha_rechazo,
        qr_generado,
        created_at
      `)
      .eq("condominio_id", sesion.condominio_id)
      .eq("propietario_id", sesion.propietario_id)
      .eq("unidad_id", sesion.unidad_id)
      .order("created_at", { ascending: false });

    if (consultaError) {
      setError(`No se pudieron cargar las solicitudes: ${consultaError.message}`);
      setSolicitudes([]);
    } else {
      setSolicitudes((data || []) as Autorizacion[]);
    }

    if (modoActualizacion) setActualizando(false);
  }

  const solicitudesFiltradas = useMemo(() => {
    if (filtro === "TODAS") return solicitudes;

    return solicitudes.filter((solicitud) => {
      const estado = normalizarEstado(solicitud.estado);

      if (filtro === "PENDIENTE") {
        return ["PENDIENTE", "EN_PROCESO", "PROCESO"].includes(estado);
      }

      if (filtro === "APROBADA") {
        return ["APROBADA", "APROBADO"].includes(estado);
      }

      if (filtro === "RECHAZADA") {
        return ["RECHAZADA", "RECHAZADO"].includes(estado);
      }

      return ["FINALIZADA", "FINALIZADO", "COMPLETADA", "COMPLETADO"].includes(
        estado
      );
    });
  }, [solicitudes, filtro]);

  const resumen = useMemo(() => {
    return solicitudes.reduce(
      (acumulado, solicitud) => {
        const estado = normalizarEstado(solicitud.estado);

        if (["APROBADA", "APROBADO"].includes(estado)) {
          acumulado.aprobadas += 1;
        } else if (["RECHAZADA", "RECHAZADO"].includes(estado)) {
          acumulado.rechazadas += 1;
        } else if (
          ["FINALIZADA", "FINALIZADO", "COMPLETADA", "COMPLETADO"].includes(
            estado
          )
        ) {
          acumulado.finalizadas += 1;
        } else {
          acumulado.pendientes += 1;
        }

        return acumulado;
      },
      {
        pendientes: 0,
        aprobadas: 0,
        rechazadas: 0,
        finalizadas: 0,
      }
    );
  }, [solicitudes]);

  if (cargando) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 size={20} className="animate-spin text-blue-700" />
            Cargando solicitudes...
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
                Autorizaciones
              </p>
              <h1 className="truncate text-base font-black">
                Mis solicitudes
              </h1>
            </div>

            <button
              type="button"
              onClick={() => cargarSolicitudes(propietario, true)}
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

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">
                {propietario.nombre_propietario}
              </p>
              <p className="mt-0.5 text-xs text-blue-100">
                Unidad {propietario.no_apartamento}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/movil/propietarios/autorizaciones")
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-blue-900 shadow-lg"
            >
              <Plus size={17} />
              Nueva
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <section className="grid grid-cols-4 gap-2">
          <ResumenEstado
            titulo="Pendientes"
            cantidad={resumen.pendientes}
            clase="bg-amber-50 text-amber-700 border-amber-200"
          />
          <ResumenEstado
            titulo="Aprobadas"
            cantidad={resumen.aprobadas}
            clase="bg-emerald-50 text-emerald-700 border-emerald-200"
          />
          <ResumenEstado
            titulo="Rechazadas"
            cantidad={resumen.rechazadas}
            clase="bg-red-50 text-red-700 border-red-200"
          />
          <ResumenEstado
            titulo="Finalizadas"
            cantidad={resumen.finalizadas}
            clase="bg-slate-50 text-slate-700 border-slate-200"
          />
        </section>

        <section className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {[
              ["TODAS", "Todas"],
              ["PENDIENTE", "Pendientes"],
              ["APROBADA", "Aprobadas"],
              ["RECHAZADA", "Rechazadas"],
              ["FINALIZADA", "Finalizadas"],
            ].map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor as FiltroEstado)}
                className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                  filtro === valor
                    ? "border-blue-800 bg-blue-800 text-white"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
            {error}
          </div>
        )}

        <section className="space-y-3">
          {solicitudesFiltradas.length === 0 ? (
            <div className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Wrench size={23} />
              </div>
              <h2 className="mt-3 text-sm font-black text-slate-900">
                No hay solicitudes
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                No existen solicitudes para el filtro seleccionado.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/movil/propietarios/autorizaciones")
                }
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-800 px-4 text-xs font-extrabold text-white"
              >
                <Plus size={16} />
                Crear solicitud
              </button>
            </div>
          ) : (
            solicitudesFiltradas.map((solicitud) => {
              const estado = configuracionEstado(solicitud.estado);
              const IconoEstado = estado.icono;

              return (
                <button
                  key={solicitud.id}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/movil/propietarios/autorizaciones/${solicitud.id}`
                    )
                  }
                  className="w-full rounded-[1.4rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        {solicitud.codigo_autorizacion || `Solicitud #${solicitud.id}`}
                      </p>

                      <h2 className="mt-1 truncate text-sm font-black text-slate-900">
                        {solicitud.tipo_trabajo ||
                          solicitud.tipo_solicitud ||
                          "Autorización de trabajo"}
                      </h2>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${estado.clases}`}
                    >
                      <IconoEstado size={13} />
                      {estado.texto}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="flex items-center gap-1 text-slate-400">
                        <CalendarDays size={12} />
                        Fecha
                      </p>
                      <p className="mt-1 font-bold text-slate-700">
                        {formatDate(solicitud.fecha_programada)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="flex items-center gap-1 text-slate-400">
                        <Clock3 size={12} />
                        Horario
                      </p>
                      <p className="mt-1 font-bold text-slate-700">
                        {formatTime(solicitud.hora_entrada)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">
                        Persona autorizada
                      </p>
                      <p className="truncate text-xs font-bold text-slate-700">
                        {solicitud.nombre_visitante || "Sin especificar"}
                      </p>
                    </div>

                    <ChevronRight size={18} className="shrink-0 text-slate-300" />
                  </div>

                  {normalizarEstado(solicitud.estado).includes("RECHAZ") &&
                    solicitud.motivo_rechazo && (
                      <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] leading-5 text-red-700">
                        <strong>Motivo:</strong> {solicitud.motivo_rechazo}
                      </div>
                    )}
                </button>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

function ResumenEstado({
  titulo,
  cantidad,
  clase,
}: {
  titulo: string;
  cantidad: number;
  clase: string;
}) {
  return (
    <div className={`rounded-2xl border p-2.5 text-center ${clase}`}>
      <p className="text-lg font-black">{cantidad}</p>
      <p className="mt-0.5 truncate text-[9px] font-bold">{titulo}</p>
    </div>
  );
}
