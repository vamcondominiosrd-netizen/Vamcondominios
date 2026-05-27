"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Anuncio = {
  id: number;
  condominio: string;
  tipo_anuncio: string;
  titulo: string;
  descripcion: string;
  contenido?: string;
  prioridad: string;
  imagen_url: string;
  documento_url: string;
  fecha_publicacion: string;
  fecha_vencimiento: string;
  estado: string;
  created_by: string;
  created_at: string;
  condominio_id?: number;
};

export default function AnunciosPage() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [condominio, setCondominio] = useState("");
  const [condominioId, setCondominioId] = useState("");

  const [tipoAnuncio, setTipoAnuncio] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState("Normal");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [imagenArchivo, setImagenArchivo] = useState<File | null>(null);
  const [documentoArchivo, setDocumentoArchivo] = useState<File | null>(null);

  const [filtroEstado, setFiltroEstado] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominio(nombre);

    if (id) {
      cargarAnuncios(id);
    }
  }, []);

  async function cargarAnuncios(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("anuncios")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando anuncios: " + error.message);
      return;
    }

    setAnuncios(data || []);
  }

  async function subirArchivo(archivo: File, carpeta: string) {
    const extension = archivo.name.split(".").pop();

    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const rutaArchivo = `${condominio || "general"}/${carpeta}/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("anuncios-condominio")
      .upload(rutaArchivo, archivo);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("anuncios-condominio")
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  async function guardarAnuncio(e: React.FormEvent) {
    e.preventDefault();

    if (!condominio || !condominioId || !tipoAnuncio || !titulo || !descripcion) {
      alert("Debe completar tipo de anuncio, título y descripción.");
      return;
    }

    try {
      setGuardando(true);

      let imagenUrl = "";
      let documentoUrl = "";

      if (imagenArchivo) {
        imagenUrl = await subirArchivo(imagenArchivo, "imagenes");
      }

      if (documentoArchivo) {
        documentoUrl = await subirArchivo(documentoArchivo, "documentos");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("anuncios").insert([
        {
          condominio_id: Number(condominioId),
          condominio,
          tipo_anuncio: tipoAnuncio,
          titulo,
          descripcion,
          contenido: descripcion,
          prioridad,
          imagen_url: imagenUrl,
          documento_url: documentoUrl,
          fecha_publicacion: new Date().toISOString().slice(0, 10),
          fecha_vencimiento: fechaVencimiento || null,
          estado: "Activo",
          created_by: user?.email || "",
        },
      ]);

      setGuardando(false);

      if (error) {
        alert("Error guardando anuncio: " + error.message);
        return;
      }

      alert("Anuncio publicado correctamente.");

      setTipoAnuncio("");
      setTitulo("");
      setDescripcion("");
      setPrioridad("Normal");
      setFechaVencimiento("");
      setImagenArchivo(null);
      setDocumentoArchivo(null);

      const inputImagen = document.getElementById(
        "imagenAnuncio"
      ) as HTMLInputElement | null;

      const inputDocumento = document.getElementById(
        "documentoAnuncio"
      ) as HTMLInputElement | null;

      if (inputImagen) inputImagen.value = "";
      if (inputDocumento) inputDocumento.value = "";

      cargarAnuncios(condominioId);
    } catch (err: any) {
      setGuardando(false);
      alert("Error subiendo archivo: " + err.message);
    }
  }

  async function cambiarEstado(id: number, nuevoEstado: string) {
    const confirmar = confirm(`¿Desea cambiar el estado a ${nuevoEstado}?`);

    if (!confirmar) return;

    const { error } = await supabase
      .from("anuncios")
      .update({ estado: nuevoEstado })
      .eq("id", id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando anuncio: " + error.message);
      return;
    }

    alert("Estado actualizado correctamente.");
    cargarAnuncios(condominioId);
  }

  const anunciosFiltrados = anuncios.filter((a) => {
    const cumpleEstado = filtroEstado === "" || a.estado === filtroEstado;
    return cumpleEstado;
  });

  function colorPrioridad(prioridad: string) {
    if (prioridad === "Urgente") return "bg-red-100 text-red-800";
    if (prioridad === "Alta") return "bg-orange-100 text-orange-800";
    if (prioridad === "Baja") return "bg-slate-100 text-slate-700";
    return "bg-blue-100 text-blue-800";
  }

  function colorEstado(estado: string) {
    if (estado === "Activo") return "bg-green-100 text-green-800";
    if (estado === "Inactivo") return "bg-slate-100 text-slate-700";
    if (estado === "Vencido") return "bg-red-100 text-red-800";
    return "bg-blue-100 text-blue-800";
  }

  const tipos = [
    "Informativo",
    "Urgente",
    "Mantenimiento",
    "Asamblea",
    "Cobro",
    "Seguridad",
    "Evento",
    "General",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Anuncios y Comunicaciones</h1>
        <p className="text-slate-500">
          Publicación de avisos, comunicados y documentos para los propietarios.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Condominio activo
        </p>
        <p className="font-bold text-slate-800 mt-1">
          {condominio || "No seleccionado"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total anuncios</p>
          <h2 className="text-2xl font-bold">{anunciosFiltrados.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Activos</p>
          <h2 className="text-2xl font-bold text-green-700">
            {anunciosFiltrados.filter((a) => a.estado === "Activo").length}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Urgentes</p>
          <h2 className="text-2xl font-bold text-red-700">
            {anunciosFiltrados.filter((a) => a.prioridad === "Urgente").length}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Inactivos</p>
          <h2 className="text-2xl font-bold text-slate-700">
            {anunciosFiltrados.filter((a) => a.estado === "Inactivo").length}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Crear anuncio</h2>

        <form
          onSubmit={guardarAnuncio}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Condominio
            </label>

            <input
              type="text"
              value={condominio}
              disabled
              className="border rounded-lg px-3 py-2 w-full bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tipo de anuncio *
            </label>

            <select
              value={tipoAnuncio}
              onChange={(e) => setTipoAnuncio(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Seleccione tipo</option>

              {tipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Título *</label>

            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Ej. Mantenimiento programado"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Prioridad</label>

            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="Baja">Baja</option>
              <option value="Normal">Normal</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha vencimiento
            </label>

            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Imagen / flyer
            </label>

            <input
              id="imagenAnuncio"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => setImagenArchivo(e.target.files?.[0] || null)}
              className="border rounded-lg px-3 py-2 w-full bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Documento PDF
            </label>

            <input
              id="documentoAnuncio"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setDocumentoArchivo(e.target.files?.[0] || null)}
              className="border rounded-lg px-3 py-2 w-full bg-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Descripción *
            </label>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              rows={4}
              placeholder="Contenido del comunicado"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {guardando ? "Publicando..." : "Publicar anuncio"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Listado de anuncios</h2>
            <p className="text-sm text-slate-500">
              Anuncios del condominio activo.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full md:w-48"
            >
              <option value="">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p>Cargando anuncios...</p>
        ) : (
          <div className="space-y-4">
            {anunciosFiltrados.map((a) => (
              <div key={a.id} className="border rounded-2xl p-5">
                <div className="flex flex-col md:flex-row gap-4">
                  {a.imagen_url && (
                    <img
                      src={a.imagen_url}
                      alt={a.titulo}
                      className="w-full md:w-52 h-40 object-cover rounded-xl border"
                    />
                  )}

                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${colorPrioridad(
                          a.prioridad
                        )}`}
                      >
                        {a.prioridad}
                      </span>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${colorEstado(
                          a.estado
                        )}`}
                      >
                        {a.estado}
                      </span>

                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {a.tipo_anuncio}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold">{a.titulo}</h3>

                    <p className="text-sm text-slate-500 mt-1">
                      {a.condominio} | Publicado: {a.fecha_publicacion || "-"}
                    </p>

                    {a.fecha_vencimiento && (
                      <p className="text-sm text-slate-500">
                        Vence: {a.fecha_vencimiento}
                      </p>
                    )}

                    <p className="mt-3 text-sm">{a.descripcion}</p>

                    <div className="flex flex-wrap gap-2 mt-4">
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

                      {a.estado === "Activo" ? (
                        <button
                          onClick={() => cambiarEstado(a.id, "Inactivo")}
                          className="bg-red-700 text-white px-4 py-2 rounded-lg"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => cambiarEstado(a.id, "Activo")}
                          className="bg-green-700 text-white px-4 py-2 rounded-lg"
                        >
                          Activar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {anunciosFiltrados.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No hay anuncios registrados.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}