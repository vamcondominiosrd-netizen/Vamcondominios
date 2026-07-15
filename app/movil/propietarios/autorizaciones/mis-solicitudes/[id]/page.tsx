"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Car,
  CheckCircle2,
  CircleX,
  Clock3,
  FileClock,
  Loader2,
  Package,
  QrCode,
  ShieldCheck,
  UserRound,
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
  condominio_id: number;
  condominio: string | null;
  codigo_autorizacion: string | null;
  propietario_id: number | null;
  unidad_id: number | null;
  propietario: string | null;
  unidad: string | null;
  tipo_solicitud: string | null;
  tipo_trabajo: string | null;
  tipo_servicio: string | null;
  tipo_visitante: string | null;
  area_acceso: string | null;
  fecha_solicitud: string | null;
  fecha_programada: string;
  hora_entrada: string | null;
  hora_salida_estimada: string | null;
  nombre_visitante: string | null;
  cedula_visitante: string | null;
  telefono_visitante: string | null;
  empresa: string | null;
  vehiculo_marca: string | null;
  vehiculo_modelo: string | null;
  vehiculo_color: string | null;
  vehiculo_placa: string | null;
  cantidad_personas: number | null;
  descripcion: string | null;
  articulos_entran: string | null;
  articulos_salen: string | null;
  estado: string | null;
  estado_financiero: string | null;
  motivo_rechazo: string | null;
  observacion_admin: string | null;
  aprobado_por: string | null;
  fecha_aprobacion: string | null;
  rechazado_por: string | null;
  fecha_rechazo: string | null;
  qr_code: string | null;
  qr_generado: boolean | null;
  qr_generado_fecha: string | null;
  fecha_entrada: string | null;
  fecha_salida: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function normalizarEstado(valor: string | null | undefined) {
  return String(valor || "PENDIENTE")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function formatDate(valor: string | null | undefined, conHora = false) {
  if (!valor) return "-";

  const fecha = new Date(valor.length <= 10 ? `${valor}T00:00:00` : valor);

  if (Number.isNaN(fecha.getTime())) return String(valor).slice(0, 10);

  return fecha.toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(conHora
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });
}

function formatTime(valor: string | null | undefined) {
  if (!valor) return "-";

  const [horaRaw, minuto = "00"] = String(valor).split(":");
  const hora = Number(horaRaw);

  if (!Number.isFinite(hora)) return String(valor);

  const periodo = hora >= 12 ? "p. m." : "a. m.";
  return `${hora % 12 || 12}:${minuto} ${periodo}`;
}

function configuracionEstado(estadoOriginal: string | null) {
  const estado = normalizarEstado(estadoOriginal);

  if (["APROBADA", "APROBADO"].includes(estado)) {
    return {
      texto: "Aprobada",
      descripcion: "La administración aprobó esta solicitud.",
      clases: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icono: CheckCircle2,
    };
  }

  if (["RECHAZADA", "RECHAZADO"].includes(estado)) {
    return {
      texto: "Rechazada",
      descripcion: "La administración rechazó esta solicitud.",
      clases: "border-red-200 bg-red-50 text-red-700",
      icono: CircleX,
    };
  }

  if (
    ["FINALIZADA", "FINALIZADO", "COMPLETADA", "COMPLETADO"].includes(estado)
  ) {
    return {
      texto: "Finalizada",
      descripcion: "El proceso de autorización fue completado.",
      clases: "border-slate-200 bg-slate-100 text-slate-700",
      icono: ShieldCheck,
    };
  }

  if (["EN_PROCESO", "PROCESO"].includes(estado)) {
    return {
      texto: "En proceso",
      descripcion: "La administración está revisando esta solicitud.",
      clases: "border-violet-200 bg-violet-50 text-violet-700",
      icono: FileClock,
    };
  }

  return {
    texto: "Pendiente",
    descripcion: "La solicitud fue recibida y está pendiente de revisión.",
    clases: "border-amber-200 bg-amber-50 text-amber-700",
    icono: Clock3,
  };
}

export default function DetalleAutorizacionPropietarioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);
  const [solicitud, setSolicitud] = useState<Autorizacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const solicitudId = useMemo(() => Number(params?.id), [params?.id]);

  useEffect(() => {
    void cargarDetalle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId]);

  async function cargarDetalle() {
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

      if (!Number.isFinite(solicitudId) || solicitudId <= 0) {
        setError("La solicitud indicada no es válida.");
        return;
      }

      setPropietario(sesion);

      const { data, error: consultaError } = await supabase
        .from("autorizaciones")
        .select("*")
        .eq("id", solicitudId)
        .eq("condominio_id", sesion.condominio_id)
        .eq("propietario_id", sesion.propietario_id)
        .eq("unidad_id", sesion.unidad_id)
        .maybeSingle();

      if (consultaError) throw consultaError;

      if (!data) {
        setError("No se encontró la solicitud o no pertenece a esta unidad.");
        return;
      }

      setSolicitud(data as Autorizacion);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el detalle de la solicitud.");
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
            Cargando detalle...
          </div>
        </div>
      </main>
    );
  }

  if (!propietario) return null;

  if (error || !solicitud) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/movil/propietarios/autorizaciones/mis-solicitudes"
              )
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-800"
          >
            <ArrowLeft size={18} />
            Volver
          </button>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error || "No se encontró la solicitud."}
          </div>
        </div>
      </main>
    );
  }

  const estado = configuracionEstado(solicitud.estado);
  const IconoEstado = estado.icono;
  const estaAprobada = ["APROBADA", "APROBADO"].includes(
    normalizarEstado(solicitud.estado)
  );
  const estaRechazada = ["RECHAZADA", "RECHAZADO"].includes(
    normalizarEstado(solicitud.estado)
  );

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-7 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/movil/propietarios/autorizaciones/mis-solicitudes"
                )
              }
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
                Detalle de solicitud
              </h1>
            </div>

            <div className="h-10 w-10" />
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200">
              {solicitud.codigo_autorizacion || `Solicitud #${solicitud.id}`}
            </p>
            <h2 className="mt-1 text-lg font-black">
              {solicitud.tipo_trabajo ||
                solicitud.tipo_solicitud ||
                "Autorización de trabajo"}
            </h2>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <section className={`rounded-[1.4rem] border p-4 ${estado.clases}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70">
              <IconoEstado size={23} />
            </span>

            <div>
              <p className="text-sm font-black">{estado.texto}</p>
              <p className="mt-1 text-xs leading-5">{estado.descripcion}</p>
            </div>
          </div>
        </section>

        {estaRechazada && solicitud.motivo_rechazo && (
          <section className="rounded-[1.4rem] border border-red-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-black text-red-700">
              Motivo del rechazo
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-700">
              {solicitud.motivo_rechazo}
            </p>
          </section>
        )}

        {solicitud.observacion_admin && (
          <section className="rounded-[1.4rem] border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-black text-blue-900">
              Observación de la administración
            </h3>
            <p className="mt-2 text-xs leading-5 text-blue-800">
              {solicitud.observacion_admin}
            </p>
          </section>
        )}

        {estaAprobada && solicitud.qr_code && (
          <section className="rounded-[1.4rem] border border-emerald-200 bg-white p-4 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <QrCode size={25} />
            </span>

            <h3 className="mt-3 text-sm font-black text-slate-900">
              Código de autorización
            </h3>
            <p className="mt-2 rounded-xl bg-slate-100 px-3 py-3 font-mono text-sm font-black tracking-wide text-slate-800">
              {solicitud.qr_code}
            </p>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Presente este código al personal de seguridad.
            </p>
          </section>
        )}

        <Seccion titulo="Solicitud" icono={<Wrench size={18} />}>
          <Dato
            etiqueta="Tipo de solicitud"
            valor={solicitud.tipo_solicitud || "Autorización de trabajo"}
          />
          <Dato
            etiqueta="Tipo de trabajo"
            valor={solicitud.tipo_trabajo || "-"}
          />
          <Dato
            etiqueta="Fecha solicitada"
            valor={formatDate(solicitud.fecha_solicitud)}
          />
          <Dato
            etiqueta="Fecha programada"
            valor={formatDate(solicitud.fecha_programada)}
          />
          <Dato
            etiqueta="Horario"
            valor={`${formatTime(solicitud.hora_entrada)} - ${formatTime(
              solicitud.hora_salida_estimada
            )}`}
          />
        </Seccion>

        <Seccion titulo="Propietario y unidad" icono={<Building2 size={18} />}>
          <Dato
            etiqueta="Propietario"
            valor={solicitud.propietario || propietario.nombre_propietario}
          />
          <Dato
            etiqueta="Condominio"
            valor={solicitud.condominio || propietario.condominio_nombre}
          />
          <Dato
            etiqueta="Unidad"
            valor={solicitud.unidad || propietario.no_apartamento}
          />
        </Seccion>

        <Seccion titulo="Persona autorizada" icono={<UserRound size={18} />}>
          <Dato
            etiqueta="Nombre"
            valor={solicitud.nombre_visitante || "-"}
          />
          <Dato
            etiqueta="Cédula"
            valor={solicitud.cedula_visitante || "-"}
          />
          <Dato
            etiqueta="Teléfono"
            valor={solicitud.telefono_visitante || "-"}
          />
          <Dato
            etiqueta="Empresa"
            valor={solicitud.empresa || "-"}
          />
          <Dato
            etiqueta="Cantidad de personas"
            valor={String(solicitud.cantidad_personas || 1)}
          />
        </Seccion>

        {(solicitud.vehiculo_marca ||
          solicitud.vehiculo_modelo ||
          solicitud.vehiculo_color ||
          solicitud.vehiculo_placa) && (
          <Seccion titulo="Vehículo" icono={<Car size={18} />}>
            <Dato
              etiqueta="Marca"
              valor={solicitud.vehiculo_marca || "-"}
            />
            <Dato
              etiqueta="Modelo"
              valor={solicitud.vehiculo_modelo || "-"}
            />
            <Dato
              etiqueta="Color"
              valor={solicitud.vehiculo_color || "-"}
            />
            <Dato
              etiqueta="Placa"
              valor={solicitud.vehiculo_placa || "-"}
            />
          </Seccion>
        )}

        {(solicitud.articulos_entran ||
          solicitud.articulos_salen ||
          solicitud.descripcion) && (
          <Seccion titulo="Artículos y observaciones" icono={<Package size={18} />}>
            <Dato
              etiqueta="Artículos que entran"
              valor={solicitud.articulos_entran || "-"}
              vertical
            />
            <Dato
              etiqueta="Artículos que salen"
              valor={solicitud.articulos_salen || "-"}
              vertical
            />
            <Dato
              etiqueta="Descripción"
              valor={solicitud.descripcion || "-"}
              vertical
            />
          </Seccion>
        )}

        {(solicitud.fecha_aprobacion ||
          solicitud.fecha_rechazo ||
          solicitud.fecha_entrada ||
          solicitud.fecha_salida) && (
          <Seccion titulo="Historial" icono={<CalendarDays size={18} />}>
            <Dato
              etiqueta="Creada"
              valor={formatDate(solicitud.created_at, true)}
            />
            {solicitud.fecha_aprobacion && (
              <Dato
                etiqueta="Aprobada"
                valor={formatDate(solicitud.fecha_aprobacion, true)}
              />
            )}
            {solicitud.fecha_rechazo && (
              <Dato
                etiqueta="Rechazada"
                valor={formatDate(solicitud.fecha_rechazo, true)}
              />
            )}
            {solicitud.fecha_entrada && (
              <Dato
                etiqueta="Entrada"
                valor={formatDate(solicitud.fecha_entrada, true)}
              />
            )}
            {solicitud.fecha_salida && (
              <Dato
                etiqueta="Salida"
                valor={formatDate(solicitud.fecha_salida, true)}
              />
            )}
          </Seccion>
        )}
      </div>
    </main>
  );
}

function Seccion({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          {icono}
        </span>
        <h3 className="text-sm font-black text-slate-900">{titulo}</h3>
      </div>

      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function Dato({
  etiqueta,
  valor,
  vertical = false,
}: {
  etiqueta: string;
  valor: string;
  vertical?: boolean;
}) {
  return (
    <div
      className={`py-2.5 text-xs ${
        vertical
          ? "space-y-1"
          : "flex items-start justify-between gap-4"
      }`}
    >
      <span className="text-slate-500">{etiqueta}</span>
      <span
        className={`font-bold text-slate-800 ${
          vertical ? "block leading-5" : "max-w-[62%] text-right"
        }`}
      >
        {valor}
      </span>
    </div>
  );
}
