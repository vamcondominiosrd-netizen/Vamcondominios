"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function MobileAdminAnunciosPage() {
  const router = useRouter();

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
  const [busqueda, setBusqueda] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id || !nombre) {
      router.push("/mobile");
      return;
    }

    setCondominioId(id);
    setCondominio(nombre);
    cargarAnuncios(id);
  }, [router]);

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

    setAnuncios((data as Anuncio[]) || []);
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

  function limpiarFormulario() {
    setTipoAnuncio("");
    setTitulo("");
    setDescripcion("");
    setPrioridad("Normal");
    setFechaVencimiento("");
    setImagenArchivo(null);
    setDocumentoArchivo(null);
    setMostrarFormulario(false);

    const inputImagen = document.getElementById(
      "imagenAnuncioMobile"
    ) as HTMLInputElement | null;

    const inputDocumento = document.getElementById(
      "documentoAnuncioMobile"
    ) as HTMLInputElement | null;

    if (inputImagen) inputImagen.value = "";
    if (inputDocumento) inputDocumento.value = "";
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
      limpiarFormulario();
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

  function cerrarSesion() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");

    router.push("/mobile");
  }

  const anunciosFiltrados = anuncios.filter((a) => {
    const cumpleEstado = filtroEstado === "" || a.estado === filtroEstado;

    const texto = `${a.tipo_anuncio || ""} ${a.titulo || ""} ${
      a.descripcion || ""
    } ${a.prioridad || ""} ${a.estado || ""} ${a.condominio || ""}`
      .toLowerCase()
      .trim();

    const cumpleBusqueda = texto.includes(busqueda.toLowerCase().trim());

    return cumpleEstado && cumpleBusqueda;
  });

  const activos = anunciosFiltrados.filter((a) => a.estado === "Activo").length;
  const urgentes = anunciosFiltrados.filter(
    (a) => a.prioridad === "Urgente"
  ).length;
  const inactivos = anunciosFiltrados.filter(
    (a) => a.estado === "Inactivo"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <section className="bg-cyan-700 text-white rounded-b-3xl p-5 shadow">
        <Link href="/mobile/admin" className="text-sm opacity-90">
          ← Volver al menú
        </Link>

        <h1 className="text-2xl font-black mt-3">Anuncios</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominio || "Condominio no seleccionado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Publicación de avisos, comunicados y documentos para propietarios.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-2xl border shadow-sm p-3">
            <p className="text-xs text-slate-500">Total</p>
            <h2 className="text-xl font-black">{anunciosFiltrados.length}</h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-3">
            <p className="text-xs text-slate-500">Activos</p>
            <h2 className="text-xl font-black text-green-700">{activos}</h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-3">
            <p className="text-xs text-slate-500">Urgentes</p>
            <h2 className="text-xl font-black text-red-700">{urgentes}</h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-3">
            <p className="text-xs text-slate-500">Inactivos</p>
            <h2 className="text-xl font-black text-slate-700">{inactivos}</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
          <button
            onClick={() => setMostrarFormulario(true)}
            className="w-full bg-cyan-700 text-white py-3 rounded-xl font-bold"
          >
            + Crear anuncio
          </button>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>

            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Título, tipo, descripción, prioridad..."
            />
          </div>

          <button
            onClick={() => cargarAnuncios(condominioId)}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
          >
            Actualizar
          </button>
        </div>

        {mostrarFormulario && (
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h2 className="text-lg font-black text-slate-900 mb-4">
              Crear anuncio
            </h2>

            <form onSubmit={guardarAnuncio} className="space-y-3">
              <div className="bg-slate-50 border rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">Condominio</p>
                <p className="font-bold">{condominio || "No seleccionado"}</p>
              </div>

              <select
                value={tipoAnuncio}
                onChange={(e) => setTipoAnuncio(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="">Seleccione tipo de anuncio</option>

                {tipos.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Título del anuncio *"
              />

              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="Baja">Baja</option>
                <option value="Normal">Normal</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Fecha vencimiento
                </label>

                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Imagen / flyer
                </label>

                <input
                  id="imagenAnuncioMobile"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => setImagenArchivo(e.target.files?.[0] || null)}
                  className="border rounded-xl px-4 py-3 w-full bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Documento PDF / Word
                </label>

                <input
                  id="documentoAnuncioMobile"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) =>
                    setDocumentoArchivo(e.target.files?.[0] || null)
                  }
                  className="border rounded-xl px-4 py-3 w-full bg-white"
                />
              </div>

              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                rows={4}
                placeholder="Descripción o contenido del comunicado *"
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-cyan-700 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {guardando ? "Publicando..." : "Publicar"}
                </button>

                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="bg-slate-500 text-white py-3 rounded-xl font-bold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            Cargando anuncios...
          </div>
        ) : (
          <div className="space-y-3">
            {anunciosFiltrados.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-2xl border shadow-sm overflow-hidden"
              >
                {a.imagen_url && (
                  <img
                    src={a.imagen_url}
                    alt={a.titulo}
                    className="w-full h-48 object-cover"
                  />
                )}

                <div className="p-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${colorPrioridad(
                        a.prioridad
                      )}`}
                    >
                      {a.prioridad || "Normal"}
                    </span>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${colorEstado(
                        a.estado
                      )}`}
                    >
                      {a.estado || "Activo"}
                    </span>

                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {a.tipo_anuncio || "General"}
                    </span>
                  </div>

                  <h2 className="text-xl font-black text-slate-900">
                    {a.titulo}
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Publicado: {a.fecha_publicacion || "-"}
                  </p>

                  {a.fecha_vencimiento && (
                    <p className="text-xs text-slate-500">
                      Vence: {a.fecha_vencimiento}
                    </p>
                  )}

                  <p className="mt-3 text-sm">{a.descripcion}</p>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {a.documento_url ? (
                      <a
                        href={a.documento_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-900 text-white py-2 rounded-xl text-center text-sm font-bold"
                      >
                        Ver documento
                      </a>
                    ) : (
                      <div className="bg-slate-100 text-slate-400 py-2 rounded-xl text-center text-sm font-bold">
                        Sin documento
                      </div>
                    )}

                    {a.estado === "Activo" ? (
                      <button
                        onClick={() => cambiarEstado(a.id, "Inactivo")}
                        className="bg-red-700 text-white py-2 rounded-xl text-sm font-bold"
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => cambiarEstado(a.id, "Activo")}
                        className="bg-green-700 text-white py-2 rounded-xl text-sm font-bold"
                      >
                        Activar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {anunciosFiltrados.length === 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
                No hay anuncios registrados.
              </div>
            )}
          </div>
        )}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 text-center">
          <Link
            href="/mobile/admin"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">🏠</div>
            Inicio
          </Link>

          <Link
            href="/mobile/admin/banco"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">🏦</div>
            Banco
          </Link>

          <Link
            href="/mobile/admin/anuncios"
            className="py-3 text-xs font-bold text-cyan-700"
          >
            <div className="text-xl">📢</div>
            Anuncios
          </Link>

          <button
            type="button"
            onClick={cerrarSesion}
            className="py-3 text-xs font-bold text-red-600"
          >
            <div className="text-xl">🚪</div>
            Salir
          </button>
        </div>
      </nav>
    </main>
  );
}