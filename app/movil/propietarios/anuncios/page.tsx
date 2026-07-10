"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { ArrowLeft, Bell, ImageIcon, FileText } from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
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
    cargarAnuncios(prop);
  }, [router]);

  async function cargarAnuncios(prop: PropietarioActual) {
    setLoading(true);
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

    setLoading(false);

    if (error) {
      setMensaje("Error cargando anuncios: " + error.message);
      return;
    }

    setAnuncios(data || []);
  }

  function formatearFecha(fecha?: string | null) {
    if (!fecha) return "Sin fecha";

    return new Date(fecha).toLocaleDateString("es-DO");
  }

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

        <p className="text-sm text-slate-300">Comunicaciones</p>
        <h1 className="text-xl font-bold">Anuncios</h1>

        <p className="text-xs text-slate-300">
          {propietario.condominio_nombre} · {propietario.no_apartamento}
        </p>
      </header>

      {mensaje && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 text-sm">
          {mensaje}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-5 text-center text-slate-500">
          Cargando anuncios...
        </div>
      ) : anuncios.length === 0 ? (
        <div className="bg-white rounded-3xl border shadow-sm p-6 text-center">
          <Bell className="mx-auto text-slate-400 mb-2" size={32} />

          <p className="font-bold text-slate-700">No hay anuncios</p>

          <p className="text-sm text-slate-500 mt-1">
            Cuando la administración publique un aviso, aparecerá aquí.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {anuncios.map((item) => {
            const texto = item.contenido || item.descripcion || "";

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border shadow-sm p-5"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-blue-700">
                      {item.tipo_anuncio || "Anuncio"}
                    </p>

                    <h2 className="text-lg font-bold text-slate-900 mt-1">
                      {item.titulo}
                    </h2>

                    {item.prioridad && (
                      <span
                        className={`inline-block mt-2 px-2 py-1 rounded-xl text-xs font-bold ${
                          item.prioridad === "Alta" ||
                          item.prioridad === "Urgente"
                            ? "bg-red-100 text-red-700"
                            : item.prioridad === "Media"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        Prioridad: {item.prioridad}
                      </span>
                    )}
                  </div>

                  <Bell className="text-blue-700 shrink-0" size={22} />
                </div>

                {item.imagen_url && (
                  <img
                    src={item.imagen_url}
                    alt={item.titulo}
                    className="mt-4 w-full rounded-2xl border object-cover"
                  />
                )}

                {texto && (
                  <p className="text-sm text-slate-600 mt-3 whitespace-pre-line">
                    {texto}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  {item.imagen_url && (
                    <a
                      href={item.imagen_url}
                      target="_blank"
                      className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                    >
                      <ImageIcon size={15} />
                      Ver imagen
                    </a>
                  )}

                  {item.documento_url && (
                    <a
                      href={item.documento_url}
                      target="_blank"
                      className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                    >
                      <FileText size={15} />
                      Ver documento
                    </a>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-4">
                  Publicado:{" "}
                  {formatearFecha(
                    item.fecha_publicacion || item.publicado_en || item.created_at
                  )}
                </p>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}