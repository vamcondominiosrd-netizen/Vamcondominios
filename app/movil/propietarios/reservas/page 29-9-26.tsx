"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  Send,
  Upload,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono?: string;
  correo?: string;
};

type AreaSocial = {
  id: number;
  nombre_area: string;
  costo_reserva: number;
};

type Reserva = {
  id: number;
  fecha_reserva: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  motivo?: string | null;
  cantidad_personas?: number | null;
  monto_pagado?: number | null;
  comprobante_url?: string | null;
  estado?: string | null;
  created_at?: string | null;
  areas_sociales?:
    | {
        nombre_area?: string | null;
      }
    | {
        nombre_area?: string | null;
      }[]
    | null;
};

function formatoMoneda(valor: number | string | null | undefined) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "-";

  const valor = String(fecha).slice(0, 10);
  const [anio, mes, dia] = valor.split("-");

  if (!anio || !mes || !dia) return valor;

  return `${dia}/${mes}/${anio}`;
}

function claseEstado(estado?: string | null) {
  const valor = String(estado || "").trim().toLowerCase();

  if (["aprobada", "aprobado"].includes(valor)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["rechazada", "rechazado"].includes(valor)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function ReservasPropietariosPage() {
  const router = useRouter();
  const inputComprobanteRef = useRef<HTMLInputElement | null>(null);

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);

  const [areas, setAreas] = useState<AreaSocial[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  const [areaId, setAreaId] = useState("");
  const [fechaReserva, setFechaReserva] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [cantidadPersonas, setCantidadPersonas] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingReservas, setLoadingReservas] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    void inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function inicializar() {
    setLoadingReservas(true);
    setMensaje("");

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

      await Promise.all([
        cargarAreas(sesion),
        cargarReservas(sesion),
      ]);
    } catch {
      setMensaje("No se pudo cargar la información del propietario.");
      setExito(false);
    } finally {
      setLoadingReservas(false);
    }
  }

  async function cargarAreas(prop: PropietarioActual) {
    const { data, error } = await supabase
      .from("areas_sociales")
      .select("id, nombre_area, costo_reserva")
      .eq("condominio", prop.condominio_nombre)
      .eq("estado", "activa")
      .order("nombre_area");

    if (error) {
      setMensaje(`No se pudieron cargar las áreas sociales: ${error.message}`);
      setAreas([]);
      return;
    }

    setAreas((data || []) as AreaSocial[]);
  }

  async function cargarReservas(
    prop: PropietarioActual,
    modoActualizacion = false,
    conservarMensaje = false
  ) {
    if (modoActualizacion) setActualizando(true);

    if (!conservarMensaje) {
      setMensaje("");
      setExito(false);
    }

    const { data, error } = await supabase
      .from("reservas_areas_sociales")
      .select(`
        id,
        fecha_reserva,
        hora_inicio,
        hora_fin,
        motivo,
        cantidad_personas,
        monto_pagado,
        comprobante_url,
        estado,
        created_at,
        areas_sociales (
          nombre_area
        )
      `)
      .eq("propietario_id", prop.propietario_id)
      .order("created_at", { ascending: false });

    if (error) {
      setMensaje(`No se pudieron cargar las reservas: ${error.message}`);
      setExito(false);
      setReservas([]);
    } else {
      setReservas((data || []) as Reserva[]);
    }

    if (modoActualizacion) setActualizando(false);
  }

  async function subirComprobante() {
    if (!comprobante) return "";

    const extension =
      comprobante.name.split(".").pop()?.toLowerCase() || "pdf";

    const nombreArchivo = `reservas/${propietario?.condominio_id || 0}/${
      propietario?.unidad_id || 0
    }-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("comprobantes-reservas")
      .upload(nombreArchivo, comprobante, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Error subiendo comprobante: ${error.message}`);
    }

    const { data } = supabase.storage
      .from("comprobantes-reservas")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  function limpiarFormulario() {
    setAreaId("");
    setFechaReserva("");
    setHoraInicio("");
    setHoraFin("");
    setMotivo("");
    setCantidadPersonas("");
    setMontoPagado("");
    setComprobante(null);

    if (inputComprobanteRef.current) {
      inputComprobanteRef.current.value = "";
    }
  }

  async function guardarReserva() {
    if (!propietario || loading) return;

    setMensaje("");
    setExito(false);

    if (!areaId) {
      setMensaje("Debe seleccionar el área social.");
      return;
    }

    if (!fechaReserva) {
      setMensaje("Debe seleccionar la fecha de la reserva.");
      return;
    }

    if (!horaInicio || !horaFin) {
      setMensaje("Debe indicar la hora de inicio y la hora de fin.");
      return;
    }

    if (horaFin <= horaInicio) {
      setMensaje("La hora de fin debe ser mayor que la hora de inicio.");
      return;
    }

    if (!motivo.trim()) {
      setMensaje("Debe indicar el motivo de la reserva.");
      return;
    }

    setLoading(true);

    try {
      const comprobanteUrl = await subirComprobante();

      const { error } = await supabase
        .from("reservas_areas_sociales")
        .insert([
          {
            area_social_id: Number(areaId),
            propietario_id: propietario.propietario_id,
            condominio: propietario.condominio_nombre,
            no_apartamento: propietario.no_apartamento,
            nombre_propietario: propietario.nombre_propietario,
            cedula: propietario.cedula,
            telefono: propietario.telefono || "",
            fecha_reserva: fechaReserva,
            hora_inicio: horaInicio,
            hora_fin: horaFin,
            motivo: motivo.trim(),
            cantidad_personas: Number(cantidadPersonas || 0),
            monto_pagado: Number(montoPagado || 0),
            comprobante_url: comprobanteUrl,
            estado: "Pendiente aprobación",
          },
        ]);

      if (error) throw error;

      limpiarFormulario();
      setExito(true);
      setMensaje(
        "Reserva enviada correctamente. Quedará pendiente de aprobación."
      );

      await cargarReservas(propietario, false, true);
    } catch (error: any) {
      setExito(false);
      setMensaje(error?.message || "Error registrando reserva.");
    } finally {
      setLoading(false);
    }
  }

  const areaSeleccionada = areas.find(
    (area) => String(area.id) === areaId
  );

  const reservasPendientes = useMemo(
    () =>
      reservas.filter((reserva) => {
        const estado = String(reserva.estado || "")
          .trim()
          .toLowerCase();

        return !["aprobada", "aprobado", "rechazada", "rechazado"].includes(
          estado
        );
      }).length,
    [reservas]
  );

  const reservasAprobadas = useMemo(
    () =>
      reservas.filter((reserva) =>
        ["aprobada", "aprobado"].includes(
          String(reserva.estado || "").trim().toLowerCase()
        )
      ).length,
    [reservas]
  );

  if (loadingReservas && !propietario) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 size={20} className="animate-spin text-blue-700" />
            Cargando reservas...
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
                Áreas sociales
              </p>
              <h1 className="truncate text-base font-black">
                Reservas
              </h1>
            </div>

            <button
              type="button"
              onClick={() => cargarReservas(propietario, true)}
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

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
            {propietario.condominio_logo_url ? (
              <img
                src={propietario.condominio_logo_url}
                alt={propietario.condominio_nombre}
                className="h-11 w-11 rounded-xl bg-white object-contain p-1.5"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xs font-black text-blue-900">
                VAM
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">
                {propietario.condominio_nombre}
              </p>
              <p className="mt-0.5 text-[11px] text-blue-100">
                Unidad {propietario.no_apartamento}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-700">
              <Clock3 size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-amber-700">
              Pendientes
            </p>
            <p className="mt-1 text-xl font-black text-amber-800">
              {reservasPendientes}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700">
              <CheckCircle2 size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-emerald-700">
              Aprobadas
            </p>
            <p className="mt-1 text-xl font-black text-emerald-800">
              {reservasAprobadas}
            </p>
          </div>
        </section>

        {mensaje && (
          <div
            className={`rounded-2xl border px-4 py-3 text-xs leading-5 ${
              exito
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-start gap-2">
              {exito ? (
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              )}
              <span>{mensaje}</span>
            </div>
          </div>
        )}

        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <MapPin size={20} />
            </span>

            <div>
              <h2 className="text-sm font-black text-slate-900">
                Solicitar reserva
              </h2>
              <p className="text-[10px] text-slate-500">
                Complete los datos del evento
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Campo etiqueta="Área social">
              <div className="relative">
                <select
                  value={areaId}
                  onChange={(event) => {
                    const valor = event.target.value;
                    setAreaId(valor);

                    const area = areas.find(
                      (item) => String(item.id) === valor
                    );

                    setMontoPagado(
                      area ? String(area.costo_reserva || "") : ""
                    );
                  }}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Seleccione área social</option>

                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.nombre_area} -{" "}
                      {formatoMoneda(area.costo_reserva)}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              {areas.length === 0 && (
                <p className="mt-1 text-[10px] text-amber-700">
                  No hay áreas sociales activas para este condominio.
                </p>
              )}
            </Campo>

            {areaSeleccionada && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3">
                <p className="text-[10px] text-blue-700">
                  Costo de reserva
                </p>
                <p className="mt-1 text-sm font-black text-blue-900">
                  {formatoMoneda(areaSeleccionada.costo_reserva)}
                </p>
              </div>
            )}

            <Campo etiqueta="Fecha de reserva">
              <input
                type="date"
                value={fechaReserva}
                onChange={(event) => setFechaReserva(event.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Hora inicio">
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(event) => setHoraInicio(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Campo>

              <Campo etiqueta="Hora fin">
                <input
                  type="time"
                  value={horaFin}
                  onChange={(event) => setHoraFin(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Campo>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Personas">
                <input
                  type="number"
                  min="0"
                  value={cantidadPersonas}
                  onChange={(event) =>
                    setCantidadPersonas(event.target.value)
                  }
                  placeholder="Ej. 20"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Campo>

              <Campo etiqueta="Monto pagado">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoPagado}
                  onChange={(event) => setMontoPagado(event.target.value)}
                  placeholder="0.00"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Campo>
            </div>

            <Campo etiqueta="Motivo de la reserva">
              <textarea
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                placeholder="Ej. Cumpleaños familiar"
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </Campo>

            <Campo etiqueta="Comprobante">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
                <Upload className="text-blue-700" size={25} />

                <span className="mt-2 text-xs font-extrabold text-slate-700">
                  Seleccionar comprobante
                </span>

                <span className="mt-1 text-[10px] text-slate-500">
                  PDF, JPG o PNG
                </span>

                <input
                  ref={inputComprobanteRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) =>
                    setComprobante(event.target.files?.[0] || null)
                  }
                  className="hidden"
                />
              </label>

              {comprobante && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText
                      size={15}
                      className="shrink-0 text-blue-700"
                    />
                    <p className="truncate text-[11px] font-bold text-blue-800">
                      {comprobante.name}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setComprobante(null);

                      if (inputComprobanteRef.current) {
                        inputComprobanteRef.current.value = "";
                      }
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500"
                    aria-label="Quitar comprobante"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </Campo>

            <button
              type="button"
              onClick={guardarReserva}
              disabled={loading || areas.length === 0}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-800 text-sm font-extrabold text-white transition hover:bg-blue-900 disabled:bg-slate-400"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Enviar solicitud
                </>
              )}
            </button>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Mis reservas
              </h2>
              <p className="text-[10px] text-slate-500">
                Historial de solicitudes
              </p>
            </div>

            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-extrabold text-slate-700">
              {reservas.length}
            </span>
          </div>

          {loadingReservas ? (
            <div className="flex items-center justify-center gap-2 rounded-[1.4rem] border border-slate-200 bg-white px-4 py-8 text-xs text-slate-500 shadow-sm">
              <Loader2 size={17} className="animate-spin text-blue-700" />
              Cargando reservas...
            </div>
          ) : reservas.length === 0 ? (
            <div className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-8 text-center shadow-sm">
              <CalendarDays className="mx-auto text-blue-700" size={31} />
              <p className="mt-3 text-sm font-black text-slate-900">
                No tiene reservas
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Las solicitudes enviadas aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservas.map((reserva) => {
                const area = Array.isArray(reserva.areas_sociales)
                  ? reserva.areas_sociales[0]
                  : reserva.areas_sociales;

                return (
                  <article
                    key={reserva.id}
                    className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
                          Área social
                        </p>

                        <h3 className="mt-1 text-sm font-black leading-5 text-slate-900">
                          {area?.nombre_area || "Área social"}
                        </h3>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${claseEstado(
                          reserva.estado
                        )}`}
                      >
                        {reserva.estado || "Pendiente"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <p className="flex items-center gap-1 text-slate-400">
                          <CalendarDays size={12} />
                          Fecha
                        </p>
                        <p className="mt-1 font-bold text-slate-700">
                          {formatearFecha(reserva.fecha_reserva)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <p className="flex items-center gap-1 text-slate-400">
                          <Clock3 size={12} />
                          Horario
                        </p>
                        <p className="mt-1 font-bold text-slate-700">
                          {reserva.hora_inicio || "--"} a{" "}
                          {reserva.hora_fin || "--"}
                        </p>
                      </div>
                    </div>

                    {reserva.motivo && (
                      <p className="mt-3 whitespace-pre-line text-xs leading-5 text-slate-600">
                        {reserva.motivo}
                      </p>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                        <p className="flex items-center gap-1 text-slate-400">
                          <Users size={12} />
                          Personas
                        </p>
                        <p className="mt-1 font-bold text-slate-700">
                          {reserva.cantidad_personas || 0}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                        <p className="flex items-center gap-1 text-slate-400">
                          <WalletCards size={12} />
                          Monto
                        </p>
                        <p className="mt-1 font-bold text-slate-700">
                          {formatoMoneda(reserva.monto_pagado)}
                        </p>
                      </div>
                    </div>

                    {reserva.comprobante_url && (
                      <a
                        href={reserva.comprobante_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-xs font-extrabold text-blue-800"
                      >
                        <FileText size={15} />
                        Ver comprobante
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-extrabold text-slate-700">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
