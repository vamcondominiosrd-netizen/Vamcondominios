"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import {
  Upload,
  FileText,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";

type Condominio = {
  id: number;
  nombre: string;
};

type Documento = {
  id: number;
  condominio_id: number;
  condominio: string;
  titulo: string;
  descripcion?: string | null;
  categoria: string;
  archivo_url?: string | null;
  estado: string;
  visible_propietarios: boolean;
  fecha_publicacion?: string | null;
  requiere_firma?: boolean | null;
  created_at?: string | null;
};

const categorias = [
  "Reglamento",
  "Acta",
  "Estado Financiero",
  "Presupuesto",
  "Comunicación",
  "Contrato",
  "Cotización",
  "Mantenimiento",
  "Legal",
  "Otro",
];

const estados = ["Publicado", "Borrador", "Archivado"];

export default function DocumentosAdministracionPage() {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [categoria, setCategoria] = useState("Reglamento");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("Publicado");
  const [visiblePropietarios, setVisiblePropietarios] = useState(true);
  const [requiereFirma, setRequiereFirma] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(false);

  useEffect(() => {
    cargarCondominioActivo();
    cargarDocumentos();
  }, []);

  async function cargarCondominioActivo() {
    const condominioIdLocal = localStorage.getItem("condominio_id");
    const condominioNombreLocal = localStorage.getItem("condominio_nombre");

    if (!condominioIdLocal) {
      setMensaje("No hay condominio seleccionado en la sesión.");
      return;
    }

    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre")
      .eq("id", Number(condominioIdLocal))
      .maybeSingle();

    if (error) {
      setMensaje("Error cargando condominio: " + error.message);
      return;
    }

    if (data) {
      setCondominios([data]);
      setCondominioId(String(data.id));
    } else if (condominioNombreLocal) {
      setCondominios([
        {
          id: Number(condominioIdLocal),
          nombre: condominioNombreLocal,
        },
      ]);
      setCondominioId(condominioIdLocal);
    }
  }

  async function cargarDocumentos() {
    setLoadingLista(true);

    const condominioIdLocal = localStorage.getItem("condominio_id");

    if (!condominioIdLocal) {
      setMensaje("No hay condominio seleccionado en la sesión.");
      setLoadingLista(false);
      return;
    }

    const { data, error } = await supabase
      .from("documentos_condominio")
      .select(`
        id,
        condominio_id,
        condominio,
        titulo,
        descripcion,
        categoria,
        archivo_url,
        estado,
        visible_propietarios,
        fecha_publicacion,
        requiere_firma,
        created_at
      `)
      .eq("condominio_id", Number(condominioIdLocal))
      .order("created_at", { ascending: false });

    setLoadingLista(false);

    if (error) {
      setMensaje("Error cargando documentos: " + error.message);
      return;
    }

    setDocumentos(data || []);
  }

  async function subirArchivo() {
    if (!archivo) return "";

    const extension = archivo.name.split(".").pop();
    const nombreLimpio = archivo.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();

    const ruta = `documentos/${condominioId}/${Date.now()}-${nombreLimpio}.${extension}`;

    const { error } = await supabase.storage
      .from("documentos-condominio")
      .upload(ruta, archivo, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error("Error subiendo archivo: " + error.message);
    }

    const { data } = supabase.storage
      .from("documentos-condominio")
      .getPublicUrl(ruta);

    return data.publicUrl;
  }

  async function guardarDocumento() {
    setMensaje("");
    setExito(false);

    if (!condominioId) {
      setMensaje("No hay condominio seleccionado.");
      return;
    }

    if (!titulo.trim()) {
      setMensaje("Debe indicar el título del documento.");
      return;
    }

    if (!categoria) {
      setMensaje("Debe seleccionar una categoría.");
      return;
    }

    if (!archivo) {
      setMensaje("Debe seleccionar un archivo.");
      return;
    }

    const condominio = condominios.find((c) => String(c.id) === condominioId);

    if (!condominio) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    try {
      setLoading(true);

      const archivoUrl = await subirArchivo();

      const { error } = await supabase.from("documentos_condominio").insert({
        condominio_id: Number(condominioId),
        condominio: condominio.nombre,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        categoria,
        archivo_url: archivoUrl,
        estado,
        visible_propietarios: visiblePropietarios,
        fecha_publicacion: new Date().toISOString().slice(0, 10),
        requiere_firma: requiereFirma,
        created_by: "Administración",
      });

      if (error) {
        setMensaje("Error guardando documento: " + error.message);
        return;
      }

      setExito(true);
      setMensaje("Documento guardado correctamente.");

      setCategoria("Reglamento");
      setTitulo("");
      setDescripcion("");
      setEstado("Publicado");
      setVisiblePropietarios(true);
      setRequiereFirma(false);
      setArchivo(null);

      const inputFile = document.getElementById(
        "archivoDocumento"
      ) as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";

      await cargarDocumentos();
    } catch (err: any) {
      setMensaje(err.message || "Error guardando documento.");
    } finally {
      setLoading(false);
    }
  }

  async function cambiarVisible(doc: Documento) {
    const { error } = await supabase
      .from("documentos_condominio")
      .update({
        visible_propietarios: !doc.visible_propietarios,
      })
      .eq("id", doc.id);

    if (error) {
      setMensaje("Error actualizando visibilidad: " + error.message);
      return;
    }

    await cargarDocumentos();
  }

  async function eliminarDocumento(id: number) {
    const confirmar = confirm("¿Seguro que desea eliminar este documento?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("documentos_condominio")
      .delete()
      .eq("id", id);

    if (error) {
      setMensaje("Error eliminando documento: " + error.message);
      return;
    }

    await cargarDocumentos();
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Documentos del Condominio
        </h1>

        <p className="text-slate-500">
          Administración de reglamentos, actas, estados financieros y
          comunicaciones visibles para propietarios.
        </p>
      </div>

      {mensaje && (
        <div
          className={`rounded-xl p-3 text-sm ${
            exito
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {mensaje}
        </div>
      )}

      <section className="bg-white border rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="text-blue-700" size={22} />
          <h2 className="font-bold text-slate-900">Nuevo documento</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Condominio
            </label>

            <select
              value={condominioId}
              disabled
              className="w-full border rounded-xl px-4 py-3 bg-slate-100 text-slate-700"
            >
              {condominios.length === 0 ? (
                <option value="">Sin condominio activo</option>
              ) : (
                condominios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Categoría
            </label>

            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 bg-white"
            >
              {categorias.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Título</label>

            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Reglamento interno 2026"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 bg-white"
            >
              {estados.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Descripción breve del documento"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Archivo</label>

            <input
              id="archivoDocumento"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              className="w-full border rounded-xl px-4 py-3 bg-white"
            />

            {archivo && (
              <p className="text-xs text-slate-500 mt-1">
                Archivo seleccionado: <b>{archivo.name}</b>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 bg-slate-50 border rounded-xl px-4 py-3">
              <input
                type="checkbox"
                checked={visiblePropietarios}
                onChange={(e) => setVisiblePropietarios(e.target.checked)}
              />
              <span className="text-sm font-semibold">
                Visible propietarios
              </span>
            </label>

            <label className="flex items-center gap-2 bg-slate-50 border rounded-xl px-4 py-3">
              <input
                type="checkbox"
                checked={requiereFirma}
                onChange={(e) => setRequiereFirma(e.target.checked)}
              />
              <span className="text-sm font-semibold">Requiere firma</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={guardarDocumento}
          disabled={loading || !condominioId}
          className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white rounded-xl px-6 py-3 font-bold"
        >
          {loading ? "Guardando..." : "Guardar documento"}
        </button>
      </section>

      <section className="bg-white border rounded-2xl shadow-sm p-5">
        <h2 className="font-bold text-slate-900 mb-4">
          Documentos registrados
        </h2>

        {loadingLista ? (
          <p className="text-slate-500">Cargando documentos...</p>
        ) : documentos.length === 0 ? (
          <p className="text-slate-500">
            No hay documentos registrados para este condominio.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left">Documento</th>
                  <th className="p-3 text-left">Condominio</th>
                  <th className="p-3 text-left">Categoría</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-left">Visible</th>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {documentos.map((doc) => (
                  <tr key={doc.id} className="border-t">
                    <td className="p-3">
                      <div className="flex items-start gap-2">
                        <FileText size={18} className="text-blue-700 mt-0.5" />

                        <div>
                          <p className="font-bold">{doc.titulo}</p>

                          {doc.descripcion && (
                            <p className="text-xs text-slate-500">
                              {doc.descripcion}
                            </p>
                          )}

                          {doc.requiere_firma && (
                            <p className="text-xs text-orange-600 font-bold mt-1">
                              Requiere firma
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3">{doc.condominio}</td>
                    <td className="p-3">{doc.categoria}</td>
                    <td className="p-3">{doc.estado}</td>

                    <td className="p-3">
                      {doc.visible_propietarios ? (
                        <span className="inline-flex items-center gap-1 text-green-700 font-bold">
                          <CheckCircle size={15} />
                          Sí
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 font-bold">
                          <XCircle size={15} />
                          No
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      {doc.fecha_publicacion
                        ? new Date(doc.fecha_publicacion).toLocaleDateString(
                            "es-DO"
                          )
                        : "-"}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {doc.archivo_url && (
                          <a
                            href={doc.archivo_url}
                            target="_blank"
                            className="inline-flex items-center gap-1 bg-slate-100 rounded-lg px-3 py-2 font-bold text-slate-700"
                          >
                            <Eye size={15} />
                            Ver
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => cambiarVisible(doc)}
                          className="bg-blue-50 text-blue-700 rounded-lg px-3 py-2 font-bold"
                        >
                          {doc.visible_propietarios ? "Ocultar" : "Mostrar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarDocumento(doc.id)}
                          className="inline-flex items-center gap-1 bg-red-50 text-red-700 rounded-lg px-3 py-2 font-bold"
                        >
                          <Trash2 size={15} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}