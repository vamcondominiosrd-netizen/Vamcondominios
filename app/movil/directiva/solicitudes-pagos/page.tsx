"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import FiltroPeriodo, { rangoPeriodo } from "@/app/movil/directiva/components/FiltroPeriodo";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";

type RespuestaAcceso = {
  ok?: boolean;
  mensaje?: string;
  rol?: string;
  rol_general?: string;
  empresa_id?: number;
  condominio_id?: number;
};

type SolicitudPago = {
  id: number;
  numero_solicitud?: string | null;
  condominio_id: number | null;
  fecha_solicitud: string | null;
  concepto: string | null;
  detalle: string | null;
  monto: number | string | null;
  itbis: number | string | null;
  total: number | string | null;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  soporte_url: string | null;
  prioridad: string | null;
  estado: string | null;
  comentario_tesorero?: string | null;
  comentario_presidente?: string | null;
  catalogo_proveedores?: { nombre_proveedor?: string | null } | null;
  catalogo_categoria_gastos?: { nombre_categoria?: string | null } | null;
};

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

function n(valor: unknown) {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
}

function normalizar(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esPresidente(rol: unknown) {
  return normalizar(rol).includes("president");
}

function esTesorero(rol: unknown) {
  return normalizar(rol).includes("tesor");
}

function esEstadoPendiente(estado: unknown, rol: unknown) {
  const e = normalizar(estado);

  if (esTesorero(rol)) {
    return (
      e === "pendiente aprobacion tesorero" ||
      e === "pendiente tesorero" ||
      e === "pendiente_tesorero"
    );
  }

  if (esPresidente(rol)) {
    return (
      e === "aprobado por tesorero" ||
      e === "aprobada por tesorero" ||
      e === "pendiente aprobacion presidente" ||
      e === "pendiente presidente" ||
      e === "pendiente_presidente"
    );
  }

  return false;
}

function prioridadClase(prioridad: unknown) {
  const p = normalizar(prioridad);
  if (p === "urgente") return "bg-red-100 text-red-700";
  if (p === "alta") return "bg-orange-100 text-orange-700";
  return "bg-slate-100 text-slate-700";
}

export default function SolicitudesPagoDirectivaPage() {
  const router = useRouter();
  const [condominioId, setCondominioId] = useState(0);
  const [condominioNombre, setCondominioNombre] = useState("");
  const [rol, setRol] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState("");
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});
  const [solicitudAbierta, setSolicitudAbierta] = useState<SolicitudPago | null>(null);
  const [abriendoSoporteId, setAbriendoSoporteId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async (id: number, anioFiltro: number, mesFiltro: string) => {
    setCargando(true);
    setError("");

    try {
      const { data: accesoData, error: accesoError } = await supabase.rpc(
        "validar_acceso_directiva",
        { p_condominio_id: id },
      );

      if (accesoError) throw accesoError;

      const acceso = (accesoData || {}) as RespuestaAcceso;
      if (!acceso.ok) {
        throw new Error(acceso.mensaje || "No fue posible validar el acceso de Directiva.");
      }

      const rolActual = acceso.rol || "Directiva";
      setRol(rolActual);

      if (!esPresidente(rolActual) && !esTesorero(rolActual)) {
        setSolicitudes([]);
        return;
      }

      const { desde, hasta } = rangoPeriodo(anioFiltro, mesFiltro);

      const { data, error: solicitudesError } = await supabase
        .from("solicitudes_pago")
        .select(`
          id,
          numero_solicitud,
          condominio_id,
          fecha_solicitud,
          concepto,
          detalle,
          monto,
          itbis,
          total,
          no_factura,
          ncf,
          metodo_pago,
          cuenta_banco,
          soporte_url,
          prioridad,
          estado,
          comentario_tesorero,
          comentario_presidente,
          catalogo_proveedores(nombre_proveedor),
          catalogo_categoria_gastos(nombre_categoria)
        `)
        .eq("condominio_id", id)
        .gte("fecha_solicitud", desde)
        .lt("fecha_solicitud", hasta)
        .order("created_at", { ascending: false });

      if (solicitudesError) throw solicitudesError;

      const lista = ((data || []) as SolicitudPago[]).filter((item) =>
        esEstadoPendiente(item.estado, rolActual),
      );

      setSolicitudes(lista);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No fue posible cargar las solicitudes pendientes.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const id = Number(localStorage.getItem("condominio_id") || 0);
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.replace("/");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ${id}`);
    void cargar(id, anio, mes);
  }, [cargar, router]);

  const totalPendiente = useMemo(
    () => solicitudes.reduce((sum, item) => sum + n(item.total), 0),
    [solicitudes],
  );

  const urgentes = useMemo(
    () => solicitudes.filter((item) => normalizar(item.prioridad) === "urgente").length,
    [solicitudes],
  );

  const titulo = esTesorero(rol) ? "Firma del Tesorero" : "Firma del Presidente";
  const subtitulo = esTesorero(rol)
    ? "Solicitudes pendientes de revisión y aprobación por tesorería."
    : "Solicitudes aprobadas por tesorería pendientes de decisión final.";

  function extraerRutaSoporte(valor: string) {
    const url = String(valor || "").trim();
    if (!url) return "";

    const marcadores = [
      "/storage/v1/object/public/soportes-solicitudes-pago/",
      "/storage/v1/object/sign/soportes-solicitudes-pago/",
      "/storage/v1/object/authenticated/soportes-solicitudes-pago/",
      "soportes-solicitudes-pago/",
    ];

    for (const marcador of marcadores) {
      const posicion = url.indexOf(marcador);
      if (posicion >= 0) {
        const ruta = url.slice(posicion + marcador.length).split("?")[0];
        try {
          return decodeURIComponent(ruta);
        } catch {
          return ruta;
        }
      }
    }

    // Compatibilidad con registros que ya guardan solamente la ruta interna.
    if (!/^https?:\/\//i.test(url)) {
      return url.replace(/^\/+/, "");
    }

    return "";
  }

  async function abrirSoporte(s: SolicitudPago) {
    const urlOriginal = String(s.soporte_url || "").trim();
    if (!urlOriginal) {
      alert("Esta solicitud no tiene soporte adjunto.");
      return;
    }

    // Abrir la pestaña antes del await evita que Safari/Chrome móvil bloquee el popup.
    const ventana = window.open("about:blank", "_blank");
    if (ventana) {
      try {
        ventana.opener = null;
        ventana.document.title = "Abriendo soporte...";
        ventana.document.body.innerHTML =
          '<div style="font-family:system-ui;padding:24px">Abriendo documento...</div>';
      } catch {}
    }

    setAbriendoSoporteId(s.id);

    try {
      const ruta = extraerRutaSoporte(urlOriginal);

      if (ruta) {
        const { data, error: signedError } = await supabase.storage
          .from("soportes-solicitudes-pago")
          .createSignedUrl(ruta, 300);

        if (!signedError && data?.signedUrl) {
          if (ventana) ventana.location.href = data.signedUrl;
          else window.location.href = data.signedUrl;
          return;
        }
      }

      // Fallback para soportes históricos guardados como URL pública.
      if (ventana) ventana.location.href = urlOriginal;
      else window.location.href = urlOriginal;
    } catch (e: any) {
      if (ventana) ventana.close();
      alert(e?.message || "No fue posible abrir el soporte de la solicitud.");
    } finally {
      setAbriendoSoporteId(null);
    }
  }

  async function actualizarEstado(id: number, nuevoEstado: string) {
    const comentario = comentarios[id]?.trim() || "";

    const requiereComentario = [
      "Rechazado por tesorero",
      "Devuelto para corrección",
      "Rechazado por presidente",
      "Pendiente aclaración",
    ].includes(nuevoEstado);

    if (requiereComentario && !comentario) {
      alert("Debe escribir un comentario para completar esta acción.");
      return;
    }

    if (!confirm(`¿Está seguro de cambiar esta solicitud a: ${nuevoEstado}?`)) {
      return;
    }

    setProcesandoId(id);

    try {
      const cambios: Record<string, unknown> = { estado: nuevoEstado };

      if (esTesorero(rol)) {
        cambios.comentario_tesorero = comentario || null;
        cambios.fecha_revision_tesorero = new Date().toISOString();
      } else if (esPresidente(rol)) {
        cambios.comentario_presidente = comentario || null;
        cambios.fecha_revision_presidente = new Date().toISOString();
      } else {
        throw new Error("Su cargo no tiene autorización para firmar solicitudes.");
      }

      const { error: actualizarError } = await supabase
        .from("solicitudes_pago")
        .update(cambios)
        .eq("id", id)
        .eq("condominio_id", condominioId);

      if (actualizarError) throw actualizarError;

      setComentarios((actual) => ({ ...actual, [id]: "" }));
      if (solicitudAbierta?.id === id) setSolicitudAbierta(null);
      await cargar(condominioId, anio, mes);
    } catch (e: any) {
      alert(e?.message || "No fue posible actualizar la solicitud.");
    } finally {
      setProcesandoId(null);
    }
  }

  if (cargando) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[75vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
            <Loader2 className="animate-spin text-blue-700" size={21} />
            Cargando solicitudes del período...
          </div>
        </div>
      </main>
    );
  }

  const autorizado = esPresidente(rol) || esTesorero(rol);

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-12 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/movil/directiva")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Volver"
            >
              <ArrowLeft size={19} />
            </button>

            <button
              type="button"
              onClick={() => void cargar(condominioId, anio, mes)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Actualizar"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          <p className="mt-5 text-xs font-semibold text-blue-100">{condominioNombre}</p>
          <h1 className="mt-1 text-2xl font-black">{titulo}</h1>
          <p className="mt-2 text-sm text-blue-100">{subtitulo}</p>
        </div>
      </header>

      <div className="-mt-6 mx-auto max-w-lg space-y-4 px-4">
        <FiltroPeriodo
          anio={anio}
          mes={mes}
          onAnioChange={(nuevoAnio) => {
            setAnio(nuevoAnio);
            void cargar(condominioId, nuevoAnio, mes);
          }}
          onMesChange={(nuevoMes) => {
            setMes(nuevoMes);
            void cargar(condominioId, anio, nuevoMes);
          }}
          etiquetaTodo="Todo el año"
        />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!autorizado ? (
          <div className="rounded-[1.6rem] border border-blue-100 bg-white p-6 text-center shadow-sm">
            <p className="font-black text-slate-900">Sin firmas asignadas</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Su cargo actual ({rol || "Directiva"}) no tiene autorización para aprobar solicitudes de pago.
            </p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-3 gap-2.5">
              <Resumen titulo="Pendientes" valor={`${solicitudes.length}`} />
              <Resumen titulo="Urgentes" valor={`${urgentes}`} />
              <Resumen titulo="Monto" valor={moneda.format(totalPendiente)} pequeno />
            </section>

            {solicitudes.length === 0 ? (
              <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-6 text-center">
                <CheckCircle2 className="mx-auto text-emerald-700" size={30} />
                <h2 className="mt-3 font-black text-emerald-900">Todo al día</h2>
                <p className="mt-1 text-sm text-emerald-800">
                  No tiene solicitudes pendientes de firma en este momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {solicitudes.map((s) => (
                  <article
                    key={s.id}
                    className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-black text-slate-900">
                            {s.numero_solicitud || `Solicitud #${s.id}`}
                          </h2>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${prioridadClase(
                              s.prioridad,
                            )}`}
                          >
                            {s.prioridad || "Normal"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-700">
                          {s.concepto || "Sin concepto"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {s.fecha_solicitud || "Sin fecha"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] uppercase text-slate-400">Total</p>
                        <p className="text-base font-black text-emerald-700">
                          {moneda.format(n(s.total))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
                      <Dato titulo="Proveedor" valor={s.catalogo_proveedores?.nombre_proveedor || "-"} />
                      <Dato titulo="Categoría" valor={s.catalogo_categoria_gastos?.nombre_categoria || "-"} />
                      <Dato titulo="Monto" valor={moneda.format(n(s.monto))} />
                      <Dato titulo="ITBIS" valor={moneda.format(n(s.itbis))} />
                      <Dato titulo="Factura" valor={s.no_factura || "-"} />
                      <Dato titulo="NCF" valor={s.ncf || "-"} />
                    </div>

                    {s.detalle && (
                      <div className="mt-3 rounded-2xl border border-slate-100 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                          Detalle
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {s.detalle}
                        </p>
                      </div>
                    )}

                    {esPresidente(rol) && s.comentario_tesorero && (
                      <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                        <p className="text-xs font-black text-blue-900">Comentario del tesorero</p>
                        <p className="mt-1 text-sm text-blue-900">{s.comentario_tesorero}</p>
                      </div>
                    )}

                    <div className="mt-3 grid gap-2">
                      <button
                        type="button"
                        onClick={() => setSolicitudAbierta(s)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 py-3 text-sm font-black text-white"
                      >
                        <Eye size={17} /> Revisar solicitud y firmar
                      </button>

                      {s.soporte_url ? (
                        <button
                          type="button"
                          onClick={() => void abrirSoporte(s)}
                          disabled={abriendoSoporteId === s.id}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-black text-white disabled:opacity-50"
                        >
                          {abriendoSoporteId === s.id ? (
                            <Loader2 className="animate-spin" size={17} />
                          ) : (
                            <ExternalLink size={17} />
                          )}
                          {abriendoSoporteId === s.id ? "Abriendo soporte..." : "Ver soporte / factura"}
                        </button>
                      ) : (
                        <div className="rounded-xl bg-slate-100 py-3 text-center text-xs font-bold text-slate-400">
                          Sin soporte adjunto
                        </div>
                      )}
                    </div>

                    <textarea
                      value={comentarios[s.id] || ""}
                      onChange={(e) =>
                        setComentarios((actual) => ({
                          ...actual,
                          [s.id]: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder={`Comentario del ${esTesorero(rol) ? "tesorero" : "presidente"}`}
                      className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
                    />

                    {esTesorero(rol) ? (
                      <div className="mt-3 grid gap-2">
                        <Accion
                          texto="Aprobar y enviar al presidente"
                          icono={<CheckCircle2 size={17} />}
                          clase="bg-emerald-700 text-white"
                          disabled={procesandoId === s.id}
                          onClick={() => void actualizarEstado(s.id, "Aprobado por tesorero")}
                        />
                        <Accion
                          texto="Devolver para corrección"
                          icono={<RotateCcw size={17} />}
                          clase="bg-amber-600 text-white"
                          disabled={procesandoId === s.id}
                          onClick={() => void actualizarEstado(s.id, "Devuelto para corrección")}
                        />
                        <Accion
                          texto="Rechazar solicitud"
                          icono={<XCircle size={17} />}
                          clase="bg-red-700 text-white"
                          disabled={procesandoId === s.id}
                          onClick={() => void actualizarEstado(s.id, "Rechazado por tesorero")}
                        />
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-2">
                        <Accion
                          texto="Aprobar solicitud"
                          icono={<CheckCircle2 size={17} />}
                          clase="bg-emerald-700 text-white"
                          disabled={procesandoId === s.id}
                          onClick={() => void actualizarEstado(s.id, "Aprobado por presidente")}
                        />
                        <Accion
                          texto="Solicitar aclaración"
                          icono={<RotateCcw size={17} />}
                          clase="bg-amber-600 text-white"
                          disabled={procesandoId === s.id}
                          onClick={() => void actualizarEstado(s.id, "Pendiente aclaración")}
                        />
                        <Accion
                          texto="Rechazar solicitud"
                          icono={<XCircle size={17} />}
                          clase="bg-red-700 text-white"
                          disabled={procesandoId === s.id}
                          onClick={() => void actualizarEstado(s.id, "Rechazado por presidente")}
                        />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        <p className="pt-2 text-right text-[10px] font-semibold text-slate-400">
          Directiva Solicitudes · v1.1
        </p>
      </div>

      {solicitudAbierta && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.8rem] bg-white shadow-2xl sm:rounded-[1.8rem]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-blue-700">
                  Documento para firma
                </p>
                <h2 className="truncate text-lg font-black text-slate-950">
                  {solicitudAbierta.numero_solicitud ||
                    `Solicitud #${solicitudAbierta.id}`}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {esTesorero(rol) ? "Revisión del Tesorero" : "Revisión del Presidente"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSolicitudAbierta(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                aria-label="Cerrar documento"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">
                      Concepto
                    </p>
                    <p className="mt-1 text-base font-black text-slate-950">
                      {solicitudAbierta.concepto || "Sin concepto"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Fecha: {solicitudAbierta.fecha_solicitud || "-"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] uppercase text-slate-500">Total</p>
                    <p className="text-lg font-black text-emerald-700">
                      {moneda.format(n(solicitudAbierta.total))}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-xs">
                <Dato
                  titulo="Proveedor"
                  valor={solicitudAbierta.catalogo_proveedores?.nombre_proveedor || "-"}
                />
                <Dato
                  titulo="Categoría"
                  valor={solicitudAbierta.catalogo_categoria_gastos?.nombre_categoria || "-"}
                />
                <Dato titulo="Monto" valor={moneda.format(n(solicitudAbierta.monto))} />
                <Dato titulo="ITBIS" valor={moneda.format(n(solicitudAbierta.itbis))} />
                <Dato titulo="Factura" valor={solicitudAbierta.no_factura || "-"} />
                <Dato titulo="NCF" valor={solicitudAbierta.ncf || "-"} />
                <Dato titulo="Método" valor={solicitudAbierta.metodo_pago || "-"} />
                <Dato titulo="Cuenta" valor={solicitudAbierta.cuenta_banco || "-"} />
              </section>

              {solicitudAbierta.detalle && (
                <section className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Detalle de la solicitud
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {solicitudAbierta.detalle}
                  </p>
                </section>
              )}

              {esPresidente(rol) && solicitudAbierta.comentario_tesorero && (
                <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-black text-blue-900">
                    Comentario del tesorero
                  </p>
                  <p className="mt-1 text-sm leading-6 text-blue-900">
                    {solicitudAbierta.comentario_tesorero}
                  </p>
                </section>
              )}

              {solicitudAbierta.soporte_url ? (
                <button
                  type="button"
                  onClick={() => void abrirSoporte(solicitudAbierta)}
                  disabled={abriendoSoporteId === solicitudAbierta.id}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {abriendoSoporteId === solicitudAbierta.id ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <ExternalLink size={17} />
                  )}
                  {abriendoSoporteId === solicitudAbierta.id
                    ? "Abriendo documento..."
                    : "Abrir soporte / factura"}
                </button>
              ) : (
                <div className="rounded-xl bg-amber-50 px-3 py-3 text-center text-xs font-bold text-amber-800">
                  Esta solicitud no tiene soporte adjunto.
                </div>
              )}

              <textarea
                value={comentarios[solicitudAbierta.id] || ""}
                onChange={(e) =>
                  setComentarios((actual) => ({
                    ...actual,
                    [solicitudAbierta.id]: e.target.value,
                  }))
                }
                rows={3}
                placeholder={`Comentario del ${
                  esTesorero(rol) ? "tesorero" : "presidente"
                }`}
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
              />

              {esTesorero(rol) ? (
                <div className="grid gap-2 pb-3">
                  <Accion
                    texto="Aprobar y enviar al presidente"
                    icono={<CheckCircle2 size={17} />}
                    clase="bg-emerald-700 text-white"
                    disabled={procesandoId === solicitudAbierta.id}
                    onClick={() =>
                      void actualizarEstado(
                        solicitudAbierta.id,
                        "Aprobado por tesorero",
                      )
                    }
                  />
                  <Accion
                    texto="Devolver para corrección"
                    icono={<RotateCcw size={17} />}
                    clase="bg-amber-600 text-white"
                    disabled={procesandoId === solicitudAbierta.id}
                    onClick={() =>
                      void actualizarEstado(
                        solicitudAbierta.id,
                        "Devuelto para corrección",
                      )
                    }
                  />
                  <Accion
                    texto="Rechazar solicitud"
                    icono={<XCircle size={17} />}
                    clase="bg-red-700 text-white"
                    disabled={procesandoId === solicitudAbierta.id}
                    onClick={() =>
                      void actualizarEstado(
                        solicitudAbierta.id,
                        "Rechazado por tesorero",
                      )
                    }
                  />
                </div>
              ) : (
                <div className="grid gap-2 pb-3">
                  <Accion
                    texto="Aprobar solicitud"
                    icono={<CheckCircle2 size={17} />}
                    clase="bg-emerald-700 text-white"
                    disabled={procesandoId === solicitudAbierta.id}
                    onClick={() =>
                      void actualizarEstado(
                        solicitudAbierta.id,
                        "Aprobado por presidente",
                      )
                    }
                  />
                  <Accion
                    texto="Solicitar aclaración"
                    icono={<RotateCcw size={17} />}
                    clase="bg-amber-600 text-white"
                    disabled={procesandoId === solicitudAbierta.id}
                    onClick={() =>
                      void actualizarEstado(
                        solicitudAbierta.id,
                        "Pendiente aclaración",
                      )
                    }
                  />
                  <Accion
                    texto="Rechazar solicitud"
                    icono={<XCircle size={17} />}
                    clase="bg-red-700 text-white"
                    disabled={procesandoId === solicitudAbierta.id}
                    onClick={() =>
                      void actualizarEstado(
                        solicitudAbierta.id,
                        "Rechazado por presidente",
                      )
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Resumen({
  titulo,
  valor,
  pequeno = false,
}: {
  titulo: string;
  valor: string;
  pequeno?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className={`mt-2 font-black text-slate-900 ${pequeno ? "text-[11px] leading-4" : "text-2xl"}`}>
        {valor}
      </p>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className="mt-1 break-words font-bold text-slate-800">{valor}</p>
    </div>
  );
}

function Accion({
  texto,
  icono,
  clase,
  disabled,
  onClick,
}: {
  texto: string;
  icono: React.ReactNode;
  clase: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black disabled:opacity-50 ${clase}`}
    >
      {disabled ? <Loader2 className="animate-spin" size={17} /> : icono}
      {texto}
    </button>
  );
}
