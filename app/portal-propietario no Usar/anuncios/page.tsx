"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Anuncio = {
  id: number;
  condominio: string;
  tipo_anuncio: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  imagen_url: string;
  documento_url: string;
  fecha_publicacion: string;
  fecha_vencimiento: string;
  estado: string;
};

export default function PortalAnunciosPage() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominio, setCondominio] = useState("Lote 9");

  useEffect(() => {
    cargarAnuncios();
  }, [condominio]);

  async function cargarAnuncios() {
    setLoading(true);

    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("anuncios")
      .select("*")
      .eq("estado", "activo")
      .or(`condominio.eq.${condominio},condominio.eq.Todos`)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando anuncios: " + error.message);
      return;
    }

    const anunciosValidos = (data || []).filter((a: any) => {
      if (!a.fecha_vencimiento) return true;

      return a.fecha_vencimiento >= hoy;
    });

    setAnuncios(anunciosValidos);
  }

  function colorPrioridad(prioridad: string) {
    if (prioridad === "Urgente") {
      return "bg-red-100 text-red-800";
    }

    if (prioridad === "Alta") {
      return "bg-orange-100 text-orange-800";
    }

    if (prioridad === "Baja") {
      return "bg-slate-100 text-slate-700";
    }

    return "bg-blue-100 text-blue-800";
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-slate-950 text-white rounded-2xl p-6 text-center shadow">
          <h1 className="text-2xl font-bold">
            Anuncios del Condominio
          </h1>

          <p className="text-sm text-slate-300 mt-1">
            Portal de Propietarios
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow">
          <label className="block text-sm font-semibold mb-2">
            Seleccionar condominio
          </label>

          <select
            value={condominio}
            onChange={(e) => setCondominio(e.target.value)}
            className="border rounded-lg px-3 py-3 w-full"
          >
            <option value="Lote 9">Lote 9</option>
            <option value="Lote 11">Lote 11</option>
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-6 shadow">
            Cargando anuncios...
          </div>
        ) : (
          <>
            {anuncios.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-2xl shadow overflow-hidden"
              >
                {a.imagen_url && (
                  <img
                    src={a.imagen_url}
                    alt={a.titulo}
                    className="w-full h-52 object-cover"
                  />
                )}

                <div className="p-5">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${colorPrioridad(
                        a.prioridad
                      )}`}
                    >
                      {a.prioridad}
                    </span>

                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {a.tipo_anuncio}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold">
                    {a.titulo}
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Publicado: {a.fecha_publicacion}
                  </p>

                  {a.fecha_vencimiento && (
                    <p className="text-sm text-slate-500">
                      Válido hasta: {a.fecha_vencimiento}
                    </p>
                  )}

                  <p className="mt-4 text-sm whitespace-pre-line">
                    {a.descripcion}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-5">
                    {a.documento_url && (
                      <a
                        href={a.documento_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg inline-block"
                      >
                        Ver documento
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {anuncios.length === 0 && (
              <div className="bg-white rounded-2xl p-6 shadow text-center text-slate-500">
                No hay anuncios disponibles.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}