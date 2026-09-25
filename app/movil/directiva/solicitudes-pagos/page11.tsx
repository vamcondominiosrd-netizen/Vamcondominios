"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
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
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async (id: number) => {
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
    void cargar(id);
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
      await cargar(condominioId);
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
            Cargando solicitudes...
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
              onClick={() => void cargar(condominioId)}
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

                    <div className="mt-3">
                      {s.soporte_url ? (
                        <a
                          href={s.soporte_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-black text-white"
                        >
                          <FileText size={17} /> Ver soporte
                        </a>
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
          Directiva Solicitudes · v1.0
        </p>
      </div>
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
