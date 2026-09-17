"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  BellRing,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FlaskConical,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

type Resumen = {
  pendientes: number;
  ya_generadas: number;
  por_generar: number;
  monto_pendiente: number;
};

type ItemPreview = {
  cargo_id: number;
  propietario_id: number;
  unidad_id: number;
  unidad: string;
  propietario: string;
  periodo: string;
  periodo_texto: string;
  concepto?: string | null;
  monto_original: number;
  monto_pagado: number;
  balance: number;
  fecha_vencimiento?: string | null;
  ya_generada: boolean;
};

type PreviewResponse = {
  ok: boolean;
  mensaje?: string;
  periodo?: string;
  periodo_texto?: string;
  resumen?: Resumen;
  items?: ItemPreview[];
};

type GenerarResponse = {
  ok: boolean;
  mensaje?: string;
  periodo?: string;
  periodo_texto?: string;
  generadas?: number;
  omitidas?: number;
};

type GenerarIndividualResponse = {
  ok: boolean;
  generada?: boolean;
  mensaje?: string;
  comunicacion_id?: number;
  unidad?: string;
  propietario?: string;
  periodo?: string;
  monto?: number;
};

function periodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function moneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "Sin fecha registrada";

  const fecha = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) return valor;

  return fecha.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ComunicacionesCuotaPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [periodo, setPeriodo] = useState(periodoActual());

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [unidadPrueba, setUnidadPrueba] = useState("");
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [generandoIndividual, setGenerandoIndividual] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.replace("/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ${id}`);
  }, [router]);

  useEffect(() => {
    if (!condominioId || !periodo) return;
    void cargarVistaPrevia(condominioId, periodo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId, periodo]);

  async function cargarVistaPrevia(id = condominioId, periodoValor = periodo) {
    if (!id || !periodoValor) return;

    setCargando(true);
    setMensaje("");

    try {
      const { data, error } = await supabase.rpc(
        "vista_previa_recordatorios_cuota",
        {
          p_condominio_id: Number(id),
          p_periodo: periodoValor,
        },
      );

      if (error) {
        setPreview(null);
        setMensaje(
          "No se pudo cargar la vista previa: " +
            (error.message || "Error desconocido."),
        );
        return;
      }

      const respuesta = (data || {}) as PreviewResponse;

      if (!respuesta.ok) {
        setPreview(null);
        setMensaje(
          respuesta.mensaje || "No fue posible preparar la vista previa.",
        );
        return;
      }

      setPreview(respuesta);

      const disponibles = (respuesta.items || []).filter(
        (item) => !item.ya_generada,
      );

      if (
        unidadPrueba &&
        !disponibles.some(
          (item) => String(item.unidad_id) === String(unidadPrueba),
        )
      ) {
        setUnidadPrueba("");
      }
    } catch (error) {
      setPreview(null);
      setMensaje(
        error instanceof Error
          ? error.message
          : "No fue posible preparar la vista previa.",
      );
    } finally {
      setCargando(false);
    }
  }

  async function generarComunicacionIndividual() {
    const seleccionado = items.find(
      (item) => String(item.unidad_id) === String(unidadPrueba),
    );

    if (!seleccionado || seleccionado.ya_generada) return;

    const confirmado = window.confirm(
      `Se generará únicamente una comunicación de prueba.\n\nApartamento: ${seleccionado.unidad}\nPropietario: ${seleccionado.propietario}\nPeríodo: ${seleccionado.periodo_texto}\nMonto: ${moneda(seleccionado.balance)}\n\n¿Desea continuar?`,
    );

    if (!confirmado) return;

    setGenerandoIndividual(true);
    setMensaje("");
    setExito("");

    try {
      const { data, error } = await supabase.rpc(
        "generar_recordatorio_cuota_individual",
        {
          p_condominio_id: Number(condominioId),
          p_periodo: periodo,
          p_unidad_id: Number(seleccionado.unidad_id),
        },
      );

      if (error) {
        setMensaje(
          "No se pudo generar la comunicación individual: " +
            (error.message || "Error desconocido."),
        );
        return;
      }

      const respuesta = (data || {}) as GenerarIndividualResponse;

      if (!respuesta.ok) {
        setMensaje(
          respuesta.mensaje || "No fue posible generar la comunicación.",
        );
        return;
      }

      if (respuesta.generada === false) {
        setMensaje(
          respuesta.mensaje ||
            "La comunicación ya había sido generada para este propietario.",
        );
      } else {
        setExito(
          `Prueba generada correctamente para ${respuesta.propietario || seleccionado.propietario} — Apto. ${respuesta.unidad || seleccionado.unidad}.`,
        );
      }

      setUnidadPrueba("");
      await cargarVistaPrevia(condominioId, periodo);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No fue posible generar la comunicación individual.",
      );
    } finally {
      setGenerandoIndividual(false);
    }
  }

  async function generarComunicaciones() {
    const cantidad = Number(preview?.resumen?.por_generar || 0);

    if (!condominioId || !periodo || cantidad <= 0) return;

    const confirmado = window.confirm(
      `ATENCIÓN: esta opción generará ${cantidad} comunicación${
        cantidad === 1 ? "" : "es"
      } para todos los propietarios pendientes de ${
        preview?.periodo_texto || periodo
      }.\n\nPara pruebas recomendamos usar primero "Prueba individual".\n\n¿Desea continuar con la generación masiva?`,
    );

    if (!confirmado) return;

    setGenerando(true);
    setMensaje("");
    setExito("");

    try {
      const { data, error } = await supabase.rpc(
        "generar_recordatorios_cuota",
        {
          p_condominio_id: Number(condominioId),
          p_periodo: periodo,
        },
      );

      if (error) {
        setMensaje(
          "No se pudieron generar las comunicaciones: " +
            (error.message || "Error desconocido."),
        );
        return;
      }

      const respuesta = (data || {}) as GenerarResponse;

      if (!respuesta.ok) {
        setMensaje(
          respuesta.mensaje || "No fue posible generar las comunicaciones.",
        );
        return;
      }

      setExito(
        `Proceso masivo completado: ${Number(
          respuesta.generadas || 0,
        )} comunicación(es) generada(s).`,
      );

      await cargarVistaPrevia(condominioId, periodo);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No fue posible generar las comunicaciones.",
      );
    } finally {
      setGenerando(false);
    }
  }

  const resumen: Resumen = preview?.resumen || {
    pendientes: 0,
    ya_generadas: 0,
    por_generar: 0,
    monto_pendiente: 0,
  };

  const items = useMemo(() => preview?.items || [], [preview]);

  const candidatosPrueba = useMemo(
    () => items.filter((item) => !item.ya_generada),
    [items],
  );

  const propietarioPrueba = useMemo(
    () =>
      items.find(
        (item) => String(item.unidad_id) === String(unidadPrueba),
      ) || null,
    [items, unidadPrueba],
  );

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-20 pt-5 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/20"
              aria-label="Regresar al dashboard"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.15em] text-blue-200">
                {condominioNombre || "VAM Condominios"}
              </p>
              <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
                Comunicaciones de cuota
              </h1>
              <p className="mt-1 text-xs text-blue-100 sm:text-sm">
                Recordatorio preventivo para propietarios con cuota pendiente.
              </p>
            </div>

            <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-white/10 sm:flex">
              <BellRing size={24} />
            </div>
          </div>
        </div>
      </header>

      <div className="-mt-14 mx-auto max-w-6xl space-y-5 px-4">
        <section className="rounded-[1.6rem] border border-white/60 bg-white p-5 shadow-xl shadow-slate-900/10">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label
                htmlFor="periodo"
                className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500"
              >
                Período de la cuota
              </label>
              <div className="relative max-w-xs">
                <CalendarDays
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="periodo"
                  type="month"
                  value={periodo}
                  onChange={(event) => {
                    setPeriodo(event.target.value);
                    setUnidadPrueba("");
                    setExito("");
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void cargarVistaPrevia()}
              disabled={cargando || generando || generandoIndividual}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <RefreshCw size={17} />
              )}
              Actualizar
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-blue-700" />
              <p>
                VAM solamente incluirá cargos de mantenimiento con{" "}
                <strong>balance pendiente mayor que cero</strong>. Si el
                recordatorio del mismo período ya fue generado, no lo volverá a
                crear.
              </p>
            </div>
          </div>
        </section>

        {mensaje && (
          <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {mensaje}
          </section>
        )}

        {exito && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              {exito}
            </div>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Users size={18} />
            </span>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Cuotas pendientes
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900">
              {resumen.pendientes}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <BellRing size={18} />
            </span>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Por generar
            </p>
            <p className="mt-1 text-2xl font-black text-blue-800">
              {resumen.por_generar}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </span>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Ya generadas
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-700">
              {resumen.ya_generadas}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <CircleDollarSign size={18} />
            </span>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Balance pendiente
            </p>
            <p className="mt-1 text-xl font-black text-red-600">
              {moneda(resumen.monto_pendiente)}
            </p>
          </div>
        </section>

        <section className="rounded-[1.6rem] border-2 border-violet-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <FlaskConical size={21} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Prueba individual
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Genere el recordatorio para un solo propietario antes de
                    utilizar la generación masiva.
                  </p>
                </div>

                <span className="mt-2 inline-flex w-fit rounded-full bg-violet-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-violet-700 sm:mt-0">
                  Recomendado para pruebas
                </span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label
                    htmlFor="unidad-prueba"
                    className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500"
                  >
                    Propietario / apartamento
                  </label>

                  <div className="relative">
                    <UserRound
                      size={18}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <select
                      id="unidad-prueba"
                      value={unidadPrueba}
                      onChange={(event) => {
                        setUnidadPrueba(event.target.value);
                        setMensaje("");
                        setExito("");
                      }}
                      disabled={
                        cargando ||
                        generando ||
                        generandoIndividual ||
                        candidatosPrueba.length === 0
                      }
                      className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">
                        {candidatosPrueba.length > 0
                          ? "Seleccione un propietario..."
                          : "No hay comunicaciones pendientes para probar"}
                      </option>

                      {candidatosPrueba.map((item) => (
                        <option
                          key={item.cargo_id}
                          value={String(item.unidad_id)}
                        >
                          Apto. {item.unidad} — {item.propietario} —{" "}
                          {moneda(item.balance)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={generarComunicacionIndividual}
                  disabled={
                    !propietarioPrueba ||
                    propietarioPrueba.ya_generada ||
                    cargando ||
                    generando ||
                    generandoIndividual
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {generandoIndividual ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <FlaskConical size={18} />
                  )}
                  {generandoIndividual
                    ? "Generando prueba..."
                    : "Generar prueba individual"}
                </button>
              </div>

              {propietarioPrueba && (
                <div className="mt-4 grid gap-3 rounded-2xl bg-violet-50/70 p-4 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Apartamento
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {propietarioPrueba.unidad}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Propietario
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {propietarioPrueba.propietario}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Vencimiento
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {fechaCorta(propietarioPrueba.fecha_vencimiento)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Balance
                    </p>
                    <p className="mt-1 text-sm font-black text-red-600">
                      {moneda(propietarioPrueba.balance)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Vista previa general
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Revise los destinatarios. La opción de la derecha genera las
                comunicaciones para todos los pendientes.
              </p>
            </div>

            <button
              type="button"
              onClick={generarComunicaciones}
              disabled={
                cargando ||
                generando ||
                generandoIndividual ||
                Number(resumen.por_generar || 0) <= 0
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {generando ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              {generando
                ? "Generando..."
                : "Generar todas las comunicaciones"}
            </button>
          </div>

          {cargando ? (
            <div className="flex min-h-52 items-center justify-center gap-3 p-6 text-sm font-semibold text-slate-500">
              <Loader2 size={20} className="animate-spin text-blue-700" />
              Preparando vista previa...
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2
                size={34}
                className="mx-auto text-emerald-500"
              />
              <h3 className="mt-3 text-sm font-black text-slate-800">
                No hay cuotas pendientes para este período
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                No se generará ninguna comunicación.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Apartamento
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Propietario
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Vencimiento
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Balance
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Comunicación
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.cargo_id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4 text-sm font-black text-slate-900">
                          {item.unidad}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {item.propietario}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {fechaCorta(item.fecha_vencimiento)}
                        </td>
                        <td className="px-5 py-4 text-right text-sm font-black text-red-600">
                          {moneda(item.balance)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {item.ya_generada ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                              Generada
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {items.map((item) => (
                  <div key={item.cargo_id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          Apto. {item.unidad}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-600">
                          {item.propietario}
                        </p>
                      </div>

                      {item.ya_generada ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                          Generada
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-blue-700">
                          Pendiente
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Vencimiento
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-700">
                          {fechaCorta(item.fecha_vencimiento)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Balance
                        </p>
                        <p className="mt-1 text-xs font-black text-red-600">
                          {moneda(item.balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
