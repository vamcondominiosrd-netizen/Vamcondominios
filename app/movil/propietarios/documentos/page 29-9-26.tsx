"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  DollarSign,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Loader2,
  Megaphone,
  PenLine,
  RefreshCw,
  Scale,
  Search,
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

type Documento = {
  id: number;
  titulo: string;
  descripcion?: string | null;
  categoria: string;
  archivo_url?: string | null;
  fecha_publicacion?: string | null;
  requiere_firma?: boolean | null;
};

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "Sin fecha";

  const valor = String(fecha).slice(0, 10);
  const [anio, mes, dia] = valor.split("-");

  if (!anio || !mes || !dia) return valor;

  return `${dia}/${mes}/${anio}`;
}

function obtenerIconoCategoria(categoria?: string | null) {
  const valor = String(categoria || "").toLowerCase();

  if (valor.includes("reglamento")) return BookOpen;
  if (valor.includes("acta")) return ClipboardList;
  if (valor.includes("financiero") || valor.includes("presupuesto")) {
    return DollarSign;
  }
  if (
    valor.includes("comunicación") ||
    valor.includes("comunicacion")
  ) {
    return Megaphone;
  }
  if (valor.includes("legal")) return Scale;
  if (valor.includes("mantenimiento")) return Wrench;

  return FileText;
}

export default function DocumentosPropietariosPage() {
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
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
      await cargarDocumentos(sesion);
    } catch {
      setMensaje("No se pudo cargar la información del propietario.");
    } finally {
      setLoading(false);
    }
  }

  async function cargarDocumentos(
    prop: PropietarioActual,
    modoActualizacion = false
  ) {
    if (modoActualizacion) setActualizando(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("documentos_condominio")
      .select(`
        id,
        titulo,
        descripcion,
        categoria,
        archivo_url,
        fecha_publicacion,
        requiere_firma
      `)
      .eq("condominio_id", prop.condominio_id)
      .eq("estado", "Publicado")
      .eq("visible_propietarios", true)
      .order("fecha_publicacion", { ascending: false });

    if (error) {
      setMensaje(`No se pudieron cargar los documentos: ${error.message}`);
      setDocumentos([]);
    } else {
      setDocumentos((data || []) as Documento[]);
    }

    if (modoActualizacion) setActualizando(false);
  }

  const categorias = useMemo(
    () => [
      "Todos",
      ...Array.from(
        new Set(
          documentos
            .map((documento) => documento.categoria)
            .filter(Boolean)
        )
      ),
    ],
    [documentos]
  );

  const documentosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return documentos.filter((documento) => {
      const coincideCategoria =
        categoriaFiltro === "Todos" ||
        documento.categoria === categoriaFiltro;

      if (!coincideCategoria) return false;
      if (!texto) return true;

      return [
        documento.titulo,
        documento.descripcion,
        documento.categoria,
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });
  }, [documentos, categoriaFiltro, busqueda]);

  const documentosConFirma = useMemo(
    () => documentos.filter((documento) => documento.requiere_firma).length,
    [documentos]
  );

  if (loading) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 size={20} className="animate-spin text-blue-700" />
            Cargando documentos...
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
                Biblioteca digital
              </p>
              <h1 className="truncate text-base font-black">
                Documentos
              </h1>
            </div>

            <button
              type="button"
              onClick={() => cargarDocumentos(propietario, true)}
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
              <FolderOpen size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-slate-400">
              Publicados
            </p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {documentos.length}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-700">
              <PenLine size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-amber-700">
              Requieren firma
            </p>
            <p className="mt-1 text-xl font-black text-amber-800">
              {documentosConFirma}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="space-y-3">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar documentos"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="relative">
              <select
                value={categoriaFiltro}
                onChange={(event) =>
                  setCategoriaFiltro(event.target.value)
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {categorias.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
            {mensaje}
          </div>
        )}

        <section className="space-y-3">
          {documentosFiltrados.length === 0 ? (
            <div className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-8 text-center shadow-sm">
              <FileText className="mx-auto text-blue-700" size={32} />
              <p className="mt-3 text-sm font-black text-slate-900">
                No hay documentos
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Cuando la administración publique documentos, aparecerán aquí.
              </p>
            </div>
          ) : (
            documentosFiltrados.map((documento) => {
              const Icono = obtenerIconoCategoria(documento.categoria);

              return (
                <article
                  key={documento.id}
                  className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Icono size={23} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
                        {documento.categoria || "Documento"}
                      </p>

                      <h2 className="mt-1 text-sm font-black leading-5 text-slate-900">
                        {documento.titulo}
                      </h2>

                      <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                        <CalendarDays size={12} />
                        Publicado:{" "}
                        {formatearFecha(documento.fecha_publicacion)}
                      </p>
                    </div>
                  </div>

                  {documento.descripcion && (
                    <p className="mt-3 whitespace-pre-line text-xs leading-5 text-slate-600">
                      {documento.descripcion}
                    </p>
                  )}

                  {documento.requiere_firma && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-700">
                      <PenLine size={16} className="mt-0.5 shrink-0" />
                      <span>
                        Este documento requiere firma o aceptación.
                      </span>
                    </div>
                  )}

                  {documento.archivo_url ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <a
                        href={documento.archivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-800 text-xs font-extrabold text-white"
                      >
                        <Eye size={15} />
                        Ver
                      </a>

                      <a
                        href={documento.archivo_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-700"
                      >
                        <Download size={15} />
                        Descargar
                      </a>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl bg-slate-100 px-3 py-3 text-center text-xs text-slate-500">
                      Documento sin archivo adjunto
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
