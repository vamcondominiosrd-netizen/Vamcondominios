"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  FileText,
  BookOpen,
  ClipboardList,
  DollarSign,
  Megaphone,
  Scale,
  Wrench,
  Eye,
  PenLine,
} from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
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

  return new Date(fecha).toLocaleDateString("es-DO");
}

function IconoCategoria({ categoria }: { categoria: string }) {
  const c = String(categoria || "").toLowerCase();

  if (c.includes("reglamento")) {
    return <BookOpen className="text-blue-700" size={24} />;
  }

  if (c.includes("acta")) {
    return <ClipboardList className="text-purple-700" size={24} />;
  }

  if (c.includes("financiero") || c.includes("presupuesto")) {
    return <DollarSign className="text-green-700" size={24} />;
  }

  if (c.includes("comunicación") || c.includes("comunicacion")) {
    return <Megaphone className="text-orange-700" size={24} />;
  }

  if (c.includes("legal")) {
    return <Scale className="text-slate-700" size={24} />;
  }

  if (c.includes("mantenimiento")) {
    return <Wrench className="text-red-700" size={24} />;
  }

  return <FileText className="text-blue-700" size={24} />;
}

export default function DocumentosPropietariosPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("propietario_actual");

    if (!raw) {
      router.push("/movil/propietarios/login");
      return;
    }

    const prop = JSON.parse(raw);
    setPropietario(prop);
    cargarDocumentos(prop);
  }, [router]);

  async function cargarDocumentos(prop: PropietarioActual) {
    setLoading(true);
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

    setLoading(false);

    if (error) {
      setMensaje("Error cargando documentos: " + error.message);
      return;
    }

    setDocumentos(data || []);
  }

  const categorias = [
    "Todos",
    ...Array.from(new Set(documentos.map((d) => d.categoria).filter(Boolean))),
  ];

  const documentosFiltrados =
    categoriaFiltro === "Todos"
      ? documentos
      : documentos.filter((d) => d.categoria === categoriaFiltro);

  if (!propietario) {
    return <div className="p-6 text-center text-slate-500">Cargando...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <header className="bg-slate-950 text-white rounded-3xl p-5 shadow">
        <button
          onClick={() => router.push("/movil/propietarios/dashboard")}
          className="flex items-center gap-2 text-sm text-slate-300 mb-4"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <p className="text-sm text-slate-300">Biblioteca digital</p>
        <h1 className="text-xl font-bold">Documentos</h1>

        <p className="text-xs text-slate-300">
          {propietario.condominio_nombre} · {propietario.no_apartamento}
        </p>
      </header>

      {mensaje && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 text-sm">
          {mensaje}
        </div>
      )}

      <section className="bg-white rounded-3xl border shadow-sm p-4">
        <label className="block text-sm font-bold text-slate-700 mb-1">
          Filtrar por categoría
        </label>

        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="w-full border rounded-2xl px-4 py-3 bg-white"
        >
          {categorias.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
      </section>

      {loading ? (
        <div className="bg-white rounded-3xl p-5 text-center text-slate-500">
          Cargando documentos...
        </div>
      ) : documentosFiltrados.length === 0 ? (
        <div className="bg-white rounded-3xl border shadow-sm p-6 text-center">
          <FileText className="mx-auto text-slate-400 mb-2" size={36} />

          <p className="font-bold text-slate-700">No hay documentos</p>

          <p className="text-sm text-slate-500 mt-1">
            Cuando la administración publique documentos, aparecerán aquí.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {documentosFiltrados.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl border shadow-sm p-5"
            >
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                  <IconoCategoria categoria={doc.categoria} />
                </div>

                <div className="flex-1">
                  <p className="text-xs font-bold text-blue-700">
                    {doc.categoria}
                  </p>

                  <h2 className="font-bold text-slate-900 leading-tight mt-1">
                    {doc.titulo}
                  </h2>

                  <p className="text-xs text-slate-400 mt-1">
                    Publicado: {formatearFecha(doc.fecha_publicacion)}
                  </p>
                </div>
              </div>

              {doc.descripcion && (
                <p className="text-sm text-slate-600 mt-3 whitespace-pre-line">
                  {doc.descripcion}
                </p>
              )}

              {doc.requiere_firma && (
                <div className="mt-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-2xl p-3 text-sm flex gap-2">
                  <PenLine size={18} />
                  <span>Este documento requiere firma o aceptación.</span>
                </div>
              )}

              {doc.archivo_url ? (
                <a
                  href={doc.archivo_url}
                  target="_blank"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-blue-700 text-white rounded-2xl py-3 font-bold"
                >
                  <Eye size={18} />
                  Ver documento
                </a>
              ) : (
                <div className="mt-4 bg-slate-100 text-slate-500 rounded-2xl py-3 text-center text-sm">
                  Documento sin archivo adjunto
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}