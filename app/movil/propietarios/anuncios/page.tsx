"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  FileText,
  ImageIcon,
  Loader2,
  Megaphone,
  RefreshCw,
  Search,
} from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  condominio_logo_url?: string;
};

type Anuncio = {
  id: number;
  titulo: string;
  contenido?: string | null;
  descripcion?: string | null;
  estado?: string | null;
  tipo_anuncio?: string | null;
  prioridad?: string | null;
  imagen_url?: string | null;
  documento_url?: string | null;
  fecha_publicacion?: string | null;
  fecha_vencimiento?: string | null;
  publicado_en?: string | null;
  created_at?: string | null;
};

export default function AnunciosPropietariosPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    void inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function inicializar() {
    setLoading(true);
    setMensaje("");

    try {
      const raw = localStorage.getItem("propietario_actual");

      if (!raw) {
        router.replace("/movil/propietarios/login");
        return;
      }

      const prop = JSON.parse(raw) as PropietarioActual;

      if (
        !prop?.propietario_id ||
        !prop?.condominio_id ||
        !prop?.unidad_id
      ) {
        router.replace("/movil/propietarios/login");
        return;
      }

      setPropietario(prop);
      await cargarAnuncios(prop);
    } catch {
      setMensaje("No se pudo cargar la información del propietario.");
    } finally {
      setLoading(false);
    }
  }

  async function cargarAnuncios(
    prop: PropietarioActual,
    modoActualizacion = false
  ) {
    if (modoActualizacion) setActualizando(true);
    setMensaje("");

    const hoy = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("anuncios")
      .select(`
        id,
        titulo,
        contenido,
        descripcion,
        estado,
        tipo_anuncio,
        prioridad,
        imagen_url,
        documento_url,
        fecha_publicacion,
        fecha_vencimiento,
        publicado_en,
        created_at
      `)
      .eq("condominio_id", prop.condominio_id)
      .in("estado", ["Publicado", "Activo", "PUBLICADO", "ACTIVO"])
      .or(`fecha_vencimiento.is.null,fecha_vencimiento.gte.${hoy}`)
      .order("created_at", { ascending: false });

    if (modoActualizacion) setActualizando(false);

    if (error) {
      setMensaje("Error cargando anuncios: " + error.message);
      return;
    }

    setAnuncios(data || []);
  }

  const anunciosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return anuncios;

    return anuncios.filter((item) =>
      [
        item.titulo,
        item.contenido,
        item.descripcion,
        item.tipo_anuncio,
        item.prioridad,
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto)
    );
  }, [anuncios, busqueda]);

  const anunciosImportantes = useMemo(
    () =>
      anuncios.filter((item) =>
        ["alta", "urgente"].includes(
          String(item.prioridad || "").trim().toLowerCase()
        )
      ).length,
    [anuncios]
  );

  function formatearFecha(fecha?: string | null) {
    if (!fecha) return "Sin fecha";

    return new Date(fecha).toLocaleDateString("es-DO");
  }

  if (loading) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 size={20} className="animate-spin text-blue-700" />
            Cargando anuncios...
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
                Comunicaciones
              </p>
              <h1 className="truncate text-base font-black">Anuncios</h1>
            </div>

            <button
              type="button"
              onClick={() => cargarAnuncios(propietario, true)}
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
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Megaphone size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-slate-400">
              Publicados
            </p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {anuncios.length}
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-red-700">
              <Bell size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-red-700">
              Importantes
            </p>
            <p className="mt-1 text-xl font-black text-red-800">
              {anunciosImportantes}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar anuncios"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </section>

        {mensaje && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
            {mensaje}
          </div>
        )}

        <section className="space-y-3">
          {anunciosFiltrados.length === 0 ? (
            <div className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-8 text-center shadow-sm">
              <Bell className="mx-auto text-blue-700" size={30} />
              <p className="mt-3 text-sm font-black text-slate-900">
                No hay anuncios
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Cuando la administración publique un aviso, aparecerá aquí.
              </p>
            </div>
          ) : (
            anunciosFiltrados.map((item) => {
              const texto = item.contenido || item.descripcion || "";
              const prioridad = String(item.prioridad || "").toLowerCase();
              const prioridadClase =
                prioridad === "alta" || prioridad === "urgente"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : prioridad === "media"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-slate-100 text-slate-700";

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm"
                >
                  {item.imagen_url && (
                    <img
                      src={item.imagen_url}
                      alt={item.titulo}
                      className="h-48 w-full object-cover"
                    />
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
                          {item.tipo_anuncio || "Anuncio"}
                        </p>
                        <h2 className="mt-1 text-base font-black leading-6 text-slate-900">
                          {item.titulo}
                        </h2>
                      </div>

                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <Bell size={19} />
                      </span>
                    </div>

                    {item.prioridad && (
                      <span
                        className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${prioridadClase}`}
                      >
                        Prioridad: {item.prioridad}
                      </span>
                    )}

                    {texto && (
                      <p className="mt-3 whitespace-pre-line text-xs leading-5 text-slate-600">
                        {texto}
                      </p>
                    )}

                    {(item.imagen_url || item.documento_url) && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {item.imagen_url && (
                          <a
                            href={item.imagen_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-700"
                          >
                            <ImageIcon size={15} />
                            Ver imagen
                          </a>
                        )}

                        {item.documento_url && (
                          <a
                            href={item.documento_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-xs font-extrabold text-blue-800"
                          >
                            <FileText size={15} />
                            Documento
                          </a>
                        )}
                      </div>
                    )}

                    <p className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                      <CalendarDays size={12} />
                      Publicado:{" "}
                      {formatearFecha(
                        item.fecha_publicacion ||
                          item.publicado_en ||
                          item.created_at
                      )}
                    </p>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
