"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { ArrowLeft, Upload, CheckCircle } from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
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

export default function IncidenciasPropietariosPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );

  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [foto, setFoto] = useState<File | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("propietario_actual");

    if (!raw) {
      router.push("/movil/propietarios/login");
      return;
    }

    const prop = JSON.parse(raw);
    setPropietario(prop);
    cargarIncidencias(prop);
  }, [router]);

  async function cargarIncidencias(prop: PropietarioActual) {
    setLoadingLista(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("incidencias")
      .select(
        "id, titulo, categoria, descripcion, prioridad, estado, foto_url, created_at"
      )
      .eq("condominio_id", prop.condominio_id)
      .eq("unidad_id", prop.unidad_id)
      .order("created_at", { ascending: false });

    setLoadingLista(false);

    if (error) {
      setMensaje("Error cargando incidencias: " + error.message);
      return;
    }

    setIncidencias(data || []);
  }

  async function subirFoto(prop: PropietarioActual) {
    if (!foto) return "";

    const extension = foto.name.split(".").pop();
    const nombreArchivo = `incidencias/${prop.condominio_id}/${prop.unidad_id}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("incidencias")
      .upload(nombreArchivo, foto, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error("Error subiendo foto: " + error.message);
    }

    const { data } = supabase.storage
      .from("incidencias")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function enviarIncidencia() {
    if (!propietario) return;

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

      if (error) {
        setMensaje("Error registrando incidencia: " + error.message);
        setLoading(false);
        return;
      }

      setExito(true);
      setMensaje("Incidencia enviada correctamente.");

      setTitulo("");
      setDescripcion("");
      setCategoria("");
      setPrioridad("Media");
      setFoto(null);

      const inputFile = document.getElementById(
        "fotoIncidencia"
      ) as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";

      await cargarIncidencias(propietario);
    } catch (err: any) {
      setMensaje(err.message || "Error registrando incidencia.");
    } finally {
      setLoading(false);
    }
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

        <p className="text-sm text-slate-300">Reportar incidencia</p>
        <h1 className="text-xl font-bold">{propietario.no_apartamento}</h1>
        <p className="text-xs text-slate-300">
          {propietario.condominio_nombre}
        </p>
      </header>

      {mensaje && (
        <div
          className={`rounded-2xl p-3 text-sm ${
            exito
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {exito && <CheckCircle className="inline mr-1" size={16} />}
          {mensaje}
        </div>
      )}

      <section className="bg-white rounded-3xl border shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Título
          </label>

          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Fuga de agua en escalera"
            className="w-full border rounded-2xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Categoría
          </label>

          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full border rounded-2xl px-4 py-3 bg-white"
          >
            <option value="">Seleccione categoría</option>
            <option value="Agua">Agua</option>
            <option value="Electricidad">Electricidad</option>
            <option value="Basura">Basura</option>
            <option value="Seguridad">Seguridad</option>
            <option value="Áreas comunes">Áreas comunes</option>
            <option value="Parqueo">Parqueo</option>
            <option value="Portón / acceso">Portón / acceso</option>
            <option value="Limpieza">Limpieza</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Prioridad
          </label>

          <select
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
            className="w-full border rounded-2xl px-4 py-3 bg-white"
          >
            <option value="Baja">Prioridad baja</option>
            <option value="Media">Prioridad media</option>
            <option value="Alta">Prioridad alta</option>
            <option value="Urgente">Urgente</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Descripción
          </label>

          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describa la situación"
            rows={4}
            className="w-full border rounded-2xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Foto / evidencia
          </label>

          <label className="border-2 border-dashed rounded-3xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50">
            <Upload className="text-blue-700 mb-2" size={28} />

            <span className="text-sm font-bold text-slate-700">
              Subir foto
            </span>

            <span className="text-xs text-slate-500 mt-1">
              Imagen opcional de la incidencia
            </span>

            <input
              id="fotoIncidencia"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => setFoto(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          {foto && (
            <p className="text-xs text-slate-600 mt-2">
              Archivo seleccionado: <b>{foto.name}</b>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={enviarIncidencia}
          disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white py-4 rounded-2xl font-bold text-lg"
        >
          {loading ? "Enviando..." : "Enviar incidencia"}
        </button>
      </section>

      <section className="bg-white rounded-3xl border shadow-sm p-5">
        <h2 className="font-bold text-slate-900 mb-3">Mis incidencias</h2>

        {loadingLista ? (
          <p className="text-sm text-slate-500">Cargando historial...</p>
        ) : incidencias.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tiene incidencias registradas.
          </p>
        ) : (
          <div className="space-y-3">
            {incidencias.map((item) => (
              <div key={item.id} className="border rounded-2xl p-3">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">
                      {item.titulo || "Incidencia"}
                    </p>

                    <p className="text-xs text-slate-500">
                      {item.categoria || "Sin categoría"} ·{" "}
                      {item.prioridad || "Media"}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-bold h-fit rounded-xl px-2 py-1 ${
                      item.estado === "Cerrada"
                        ? "bg-green-100 text-green-700"
                        : item.estado === "En proceso"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.estado || "Pendiente"}
                  </span>
                </div>

                <p className="text-sm text-slate-600 mt-2">
                  {item.descripcion}
                </p>

                {item.foto_url && (
                  <a
                    href={item.foto_url}
                    target="_blank"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-700"
                  >
                    Ver foto
                  </a>
                )}

                {item.created_at && (
                  <p className="text-xs text-slate-400 mt-2">
                    Fecha:{" "}
                    {new Date(item.created_at).toLocaleDateString("es-DO")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}