"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono: string;
  correo: string;
};

type Anuncio = {
  id: number;
  titulo: string;
  contenido: string;
  prioridad: string;
  fecha_publicacion: string;
  imagen_url?: string;
  created_at: string;
};

export default function MovilAnunciosPage() {
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);

  const [anuncios, setAnuncios] =
    useState<Anuncio[]>([]);

  const [mensaje, setMensaje] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {

    const data =
      localStorage.getItem(
        "propietario_actual"
      );

    if (!data) {

      router.push(
        "/movil-login"
      );

      return;
    }

    const prop =
      JSON.parse(data);

    setPropietario(prop);

    cargarAnuncios(prop);

  }, [router]);

  async function cargarAnuncios(
    prop: PropietarioActual
  ) {

    setLoading(true);

    setMensaje("");

    const { data, error } =
      await supabase
        .from("anuncios")
        .select(`
          id,
          titulo,
          contenido,
          prioridad,
          fecha_publicacion,
          imagen_url,
          created_at
        `)
        .eq(
          "condominio_id",
          prop.condominio_id
        )
        .eq(
          "estado",
          "Activo"
        )
        .order(
          "fecha_publicacion",
          {
            ascending: false,
          }
        );

    setLoading(false);

    if (error) {

      setMensaje(error.message);

      return;
    }

    setAnuncios(data || []);
  }

  function colorPrioridad(
    prioridad: string
  ) {

    if (
      prioridad ===
      "Urgente"
    ) {

      return "bg-red-100 text-red-700";

    }

    if (
      prioridad ===
      "Alta"
    ) {

      return "bg-orange-100 text-orange-700";

    }

    if (
      prioridad ===
      "Media"
    ) {

      return "bg-yellow-100 text-yellow-700";

    }

    return "bg-blue-100 text-blue-700";
  }

  if (!propietario) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">

      <div className="max-w-md mx-auto space-y-4">

        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow">

          <Link
            href="/movil"
            className="text-sm text-amber-300"
          >
            ← Volver
          </Link>

          <h1 className="text-2xl font-bold mt-3">
            Anuncios
          </h1>

          <p className="text-slate-300 text-sm mt-1">
            {propietario.condominio_nombre}
          </p>

          <p className="text-slate-300 text-sm">
            Comunicaciones oficiales del condominio.
          </p>

        </div>

        {mensaje && (

          <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 text-sm">

            {mensaje}

          </div>

        )}

        {loading ? (

          <div className="bg-white rounded-2xl p-5 text-center">

            Cargando anuncios...

          </div>

        ) : (

          <div className="space-y-4">

            {anuncios.map(
              (a) => (

                <div
                  key={a.id}
                  className="bg-white rounded-2xl border shadow-sm overflow-hidden"
                >

                  {a.imagen_url && (

                    <img
                      src={a.imagen_url}
                      alt={a.titulo}
                      className="w-full h-52 object-cover"
                    />

                  )}

                  <div className="p-5">

                    <div className="flex justify-between items-start gap-3">

                      <h2 className="text-xl font-bold text-slate-800">
                        {a.titulo}
                      </h2>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${colorPrioridad(
                          a.prioridad
                        )}`}
                      >

                        {a.prioridad}

                      </span>

                    </div>

                    <p className="text-sm text-slate-500 mt-2">

                      {new Date(
                        a.fecha_publicacion
                      ).toLocaleDateString(
                        "es-DO"
                      )}

                    </p>

                    <div className="mt-4 text-sm text-slate-700 whitespace-pre-line">

                      {a.contenido}

                    </div>
                    
                  </div>

                </div>

              )
            )}

            {anuncios.length ===
              0 && (

              <div className="bg-white rounded-2xl p-6 text-center text-slate-500">

                No hay anuncios publicados.

              </div>

            )}

          </div>

        )}

        <p className="text-center text-xs text-slate-400 pt-4">

          VAM Administración de Condominios

        </p>

      </div>

    </main>
  );
}