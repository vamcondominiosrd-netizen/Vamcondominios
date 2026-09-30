"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  ImageIcon,
  Loader2,
  PlusCircle,
  RefreshCw,
  Send,
  Upload,
  Wrench,
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

type Incidencia = {
  id: number;
  titulo?: string | null;
  categoria?: string | null;
  descripcion?: string | null;
  prioridad?: string | null;
  estado?: string | null;
  foto_url?: string | null;
  created_at?: string | null;
};

const CATEGORIAS = [
  "Agua",
  "Electricidad",
  "Basura",
  "Seguridad",
  "Áreas comunes",
  "Parqueo",
  "Portón / acceso",
  "Limpieza",
  "Otro",
];

const PRIORIDADES = ["Baja", "Media", "Alta", "Urgente"];

function normalizar(valor?: string | null) {
  return String(valor || "").trim().toLowerCase();
}

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "-";
  const valor = String(fecha).slice(0, 10);
  const [anio, mes, dia] = valor.split("-");
  if (!anio || !mes || !dia) return valor;
  return `${dia}/${mes}/${anio}`;
}

function claseEstado(estado?: string | null) {
  const valor = normalizar(estado);
  if (["cerrada", "cerrado", "resuelta", "resuelto"].includes(valor)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["en proceso", "proceso", "trabajando"].includes(valor)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-red-200 bg-red-50 text-red-700";
}

function clasePrioridad(prioridad?: string | null) {
  const valor = normalizar(prioridad);
  if (valor === "urgente" || valor === "alta") return "text-red-700";
  if (valor === "media") return "text-amber-700";
  return "text-slate-600";
}

export default function IncidenciasPropietariosPage() {
  const router = useRouter();
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  const [propietario, setPropietario] = useState<PropietarioActual | null>(null);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [foto, setFoto] = useState<File | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    void inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function inicializar() {
    setLoadingLista(true);
    setMensaje("");

    try {
      const raw = localStorage.getItem("propietario_actual");
      if (!raw) {
        router.replace("/movil/propietarios/login");
        return;
      }

      const sesion = JSON.parse(raw) as PropietarioActual;
      if (!sesion?.propietario_id || !sesion?.condominio_id || !sesion?.unidad_id) {
        router.replace("/movil/propietarios/login");
        return;
      }

      setPropietario(sesion);
      await cargarIncidencias(sesion);
    } catch {
      setMensaje("No se pudo cargar la información del propietario.");
      setExito(false);
    } finally {
      setLoadingLista(false);
    }
  }

  async function cargarIncidencias(
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
      .from("incidencias")
      .select("id, titulo, categoria, descripcion, prioridad, estado, foto_url, created_at")
      .eq("condominio_id", prop.condominio_id)
      .eq("unidad_id", prop.unidad_id)
      .order("created_at", { ascending: false });

    if (error) {
      setMensaje(`No se pudieron cargar las incidencias: ${error.message}`);
      setExito(false);
      setIncidencias([]);
    } else {
      setIncidencias((data || []) as Incidencia[]);
    }

    if (modoActualizacion) setActualizando(false);
  }

  async function subirFoto(prop: PropietarioActual) {
    if (!foto) return "";

    const extension = foto.name.split(".").pop()?.toLowerCase() || "jpg";
    const nombreArchivo = `incidencias/${prop.condominio_id}/${prop.unidad_id}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("incidencias")
      .upload(nombreArchivo, foto, { cacheControl: "3600", upsert: false });

    if (error) throw new Error(`Error subiendo foto: ${error.message}`);

    const { data } = supabase.storage.from("incidencias").getPublicUrl(nombreArchivo);
    return data.publicUrl;
  }

  function limpiarFormulario() {
    setTitulo("");
    setDescripcion("");
    setCategoria("");
    setPrioridad("Media");
    setFoto(null);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  }

  async function enviarIncidencia() {
    if (!propietario || loading) return;

    setMensaje("");
    setExito(false);

    if (!titulo.trim()) {
      setMensaje("Debe indicar el título de la incidencia.");
      return;
    }
    if (!categoria) {
      setMensaje("Debe seleccionar la categoría.");
      return;
    }
    if (!descripcion.trim()) {
      setMensaje("Debe describir la situación.");
      return;
    }

    setLoading(true);

    try {
      const fotoUrl = await subirFoto(propietario);

      const { error } = await supabase.from("incidencias").insert([
        {
          condominio: propietario.condominio_nombre,
          condominio_id: propietario.condominio_id,
          unidad_id: propietario.unidad_id,
          no_apartamento: propietario.no_apartamento,
          propietario_id: propietario.propietario_id,
          nombre_propietario: propietario.nombre_propietario,
          telefono: propietario.telefono || "",
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          categoria,
          prioridad,
          foto_url: fotoUrl,
          estado: "Pendiente",
          origen: "VAM Móvil",
        },
      ]);

      if (error) throw error;

      limpiarFormulario();
      setExito(true);
      setMensaje("Incidencia enviada correctamente.");
      await cargarIncidencias(propietario, false, true);
    } catch (error: any) {
      setExito(false);
      setMensaje(error?.message || "Error registrando incidencia.");
    } finally {
      setLoading(false);
    }
  }

  const incidenciasPendientes = useMemo(
    () =>
      incidencias.filter((item) => {
        const estado = normalizar(item.estado);
        return !["cerrada", "cerrado", "resuelta", "resuelto"].includes(estado);
      }).length,
    [incidencias]
  );

  const incidenciasCerradas = incidencias.length - incidenciasPendientes;

  if (loadingLista && !propietario) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 size={20} className="animate-spin text-blue-700" />
            Cargando incidencias...
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
            <button type="button" onClick={() => router.push("/movil/propietarios/dashboard")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10" aria-label="Volver">
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200">Atención al propietario</p>
              <h1 className="truncate text-base font-black">Incidencias</h1>
            </div>

            <button type="button" onClick={() => cargarIncidencias(propietario, true)} disabled={actualizando} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 disabled:opacity-60" aria-label="Actualizar">
              <RefreshCw size={18} className={actualizando ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
            {propietario.condominio_logo_url ? (
              <img src={propietario.condominio_logo_url} alt={propietario.condominio_nombre} className="h-11 w-11 rounded-xl bg-white object-contain p-1.5" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xs font-black text-blue-900">VAM</div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{propietario.condominio_nombre}</p>
              <p className="mt-0.5 text-[11px] text-blue-100">Unidad {propietario.no_apartamento}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-700"><Clock3 size={18} /></span>
            <p className="mt-3 text-[11px] font-bold uppercase text-amber-700">Pendientes</p>
            <p className="mt-1 text-xl font-black text-amber-800">{incidenciasPendientes}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700"><CheckCircle2 size={18} /></span>
            <p className="mt-3 text-[11px] font-bold uppercase text-emerald-700">Cerradas</p>
            <p className="mt-1 text-xl font-black text-emerald-800">{incidenciasCerradas}</p>
          </div>
        </section>

        {mensaje && (
          <div className={`rounded-2xl border px-4 py-3 text-xs leading-5 ${exito ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            <div className="flex items-start gap-2">
              {exito ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertTriangle size={17} className="mt-0.5 shrink-0" />}
              <span>{mensaje}</span>
            </div>
          </div>
        )}

        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><PlusCircle size={20} /></span>
            <div>
              <h2 className="text-sm font-black text-slate-900">Reportar incidencia</h2>
              <p className="text-[10px] text-slate-500">Complete los datos de la situación</p>
            </div>
          </div>

          <div className="space-y-4">
            <Campo etiqueta="Título">
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Fuga de agua en escalera" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </Campo>

            <Campo etiqueta="Categoría">
              <div className="relative">
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  <option value="">Seleccione categoría</option>
                  {CATEGORIAS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </Campo>

            <Campo etiqueta="Prioridad">
              <div className="grid grid-cols-4 gap-2">
                {PRIORIDADES.map((item) => (
                  <button key={item} type="button" onClick={() => setPrioridad(item)} className={`h-10 rounded-xl border text-[11px] font-extrabold transition ${prioridad === item ? item === "Urgente" || item === "Alta" ? "border-red-600 bg-red-600 text-white" : item === "Media" ? "border-amber-500 bg-amber-500 text-white" : "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
                    {item}
                  </button>
                ))}
              </div>
            </Campo>

            <Campo etiqueta="Descripción">
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Describa la situación" rows={4} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </Campo>

            <Campo etiqueta="Foto o evidencia">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
                <Upload className="text-blue-700" size={25} />
                <span className="mt-2 text-xs font-extrabold text-slate-700">Seleccionar imagen</span>
                <span className="mt-1 text-[10px] text-slate-500">JPG, PNG o WEBP</span>
                <input ref={inputFotoRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setFoto(e.target.files?.[0] || null)} className="hidden" />
              </label>

              {foto && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Camera size={15} className="shrink-0 text-blue-700" />
                    <p className="truncate text-[11px] font-bold text-blue-800">{foto.name}</p>
                  </div>
                  <button type="button" onClick={() => { setFoto(null); if (inputFotoRef.current) inputFotoRef.current.value = ""; }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500" aria-label="Quitar foto">
                    <X size={14} />
                  </button>
                </div>
              )}
            </Campo>

            <button type="button" onClick={enviarIncidencia} disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-800 text-sm font-extrabold text-white transition hover:bg-blue-900 disabled:bg-slate-400">
              {loading ? <><Loader2 size={17} className="animate-spin" />Enviando...</> : <><Send size={17} />Enviar incidencia</>}
            </button>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-black text-slate-900">Mis incidencias</h2>
              <p className="text-[10px] text-slate-500">Historial de reportes de la unidad</p>
            </div>
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-extrabold text-slate-700">{incidencias.length}</span>
          </div>

          {loadingLista ? (
            <div className="flex items-center justify-center gap-2 rounded-[1.4rem] border border-slate-200 bg-white px-4 py-8 text-xs text-slate-500 shadow-sm"><Loader2 size={17} className="animate-spin text-blue-700" />Cargando historial...</div>
          ) : incidencias.length === 0 ? (
            <div className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-8 text-center shadow-sm">
              <Wrench className="mx-auto text-blue-700" size={31} />
              <p className="mt-3 text-sm font-black text-slate-900">No tiene incidencias</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Los reportes enviados aparecerán en esta sección.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidencias.map((item) => (
                <article key={item.id} className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">{item.categoria || "Sin categoría"}</p>
                      <h3 className="mt-1 text-sm font-black leading-5 text-slate-900">{item.titulo || "Incidencia"}</h3>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${claseEstado(item.estado)}`}>{item.estado || "Pendiente"}</span>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-xs leading-5 text-slate-600">{item.descripcion || "Sin descripción"}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-[10px]">
                    <span className={`font-extrabold ${clasePrioridad(item.prioridad)}`}>Prioridad: {item.prioridad || "Media"}</span>
                    <span className="flex items-center gap-1 text-slate-400"><CalendarDays size={12} />{formatearFecha(item.created_at)}</span>
                  </div>

                  {item.foto_url && (
                    <a href={item.foto_url} target="_blank" rel="noopener noreferrer" className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-xs font-extrabold text-blue-800">
                      <ImageIcon size={15} />Ver evidencia<ExternalLink size={13} />
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-extrabold text-slate-700">{etiqueta}</label>
      {children}
    </div>
  );
}
