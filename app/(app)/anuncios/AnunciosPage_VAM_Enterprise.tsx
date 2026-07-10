"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle,
  Eye,
  FileText,
  Image as ImageIcon,
  Megaphone,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import ActionBar from "@/components/vam/enterprise/ActionBar";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";
import StatusBadge from "@/components/vam/enterprise/StatusBadge";
import PageDrawer from "@/components/vam/enterprise/PageDrawer";

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
  "Comunicado",
  "Aviso",
  "Emergencia",
  "Mantenimiento",
  "Asamblea",
  "Cobro",
  "Seguridad",
  "Evento",
  "Circular",
  "Reglamento",
  "Informativo",
  "General",
];

const prioridades = ["Baja", "Normal", "Alta", "Urgente"];
const estadosFiltro = ["Activo", "Inactivo", "Vencido"];

export default function AnunciosPage() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominio(nombre);

    if (id) cargarAnuncios(id);
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

    setAnuncios((data as Anuncio[]) || []);
  }

  function limpiarFormulario() {
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

    if (error) throw new Error(error.message);

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

      if (imagenArchivo) imagenUrl = await subirArchivo(imagenArchivo, "imagenes");
      if (documentoArchivo) documentoUrl = await subirArchivo(documentoArchivo, "documentos");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("anuncios").insert([
        {
          condominio_id: Number(condominioId),
          condominio,
          tipo_anuncio: tipoAnuncio,
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          contenido: descripcion.trim(),
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
      setDrawerOpen(false);
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

    cargarAnuncios(condominioId);
  }

  function colorPrioridad(valor: string) {
    if (valor === "Urgente") return "bg-red-100 text-red-700";
    if (valor === "Alta") return "bg-orange-100 text-orange-700";
    if (valor === "Baja") return "bg-slate-100 text-slate-700";
    return "bg-blue-100 text-blue-700";
  }

  const anunciosFiltrados = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    return anuncios.filter((a) => {
      if (filtroEstado && a.estado !== filtroEstado) return false;
      if (!texto) return true;

      const combinado = `
        ${a.titulo || ""}
        ${a.descripcion || ""}
        ${a.tipo_anuncio || ""}
        ${a.prioridad || ""}
        ${a.estado || ""}
        ${a.created_by || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [anuncios, buscar, filtroEstado]);

  const activos = anuncios.filter((a) => a.estado === "Activo").length;
  const inactivos = anuncios.filter((a) => a.estado === "Inactivo").length;
  const urgentes = anuncios.filter((a) => a.prioridad === "Urgente").length;

  return (
    <PageContainer>
      <PageHeader
        title="Centro de Comunicaciones"
        subtitle="Publicación de avisos, comunicados, documentos y anuncios para propietarios."
        badge="Centro Residencial"
        icon={Megaphone}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                limpiarFormulario();
                setDrawerOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
            >
              <Send className="h-4 w-4" />
              Nuevo anuncio
            </button>

            <button
              type="button"
              onClick={() => cargarAnuncios(condominioId)}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Total anuncios"
          value={anuncios.length}
          subtitle="Registrados"
          icon={Megaphone}
          tone="blue"
        />
        <StatCard
          title="Activos"
          value={activos}
          subtitle="Publicados"
          icon={CheckCircle}
          tone="green"
        />
        <StatCard
          title="Urgentes"
          value={urgentes}
          subtitle="Alta prioridad"
          icon={Bell}
          tone="red"
        />
        <StatCard
          title="Inactivos"
          value={inactivos}
          subtitle="No visibles"
          icon={XCircle}
          tone="slate"
        />
      </div>

      <SectionCard
        title="Listado de anuncios"
        subtitle={`Condominio activo: ${condominio || "No seleccionado"}`}
      >
        <ActionBar
          search={buscar}
          onSearch={setBuscar}
          placeholder="Buscar título, tipo, prioridad o estado..."
        >
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">Todos</option>
            {estadosFiltro.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            <Search className="h-4 w-4" />
            {anunciosFiltrados.length} registros
          </div>
        </ActionBar>

        <div className="mt-4">
          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
              Cargando anuncios...
            </div>
          ) : anunciosFiltrados.length === 0 ? (
            <EmptyState
              title="Sin anuncios"
              description="No hay anuncios registrados para esta consulta."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Anuncio</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-center">Prioridad</th>
                  <th className="px-4 py-3 text-center">Publicación</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Adjuntos</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {anunciosFiltrados.map((a) => (
                  <tr key={a.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        {a.imagen_url ? (
                          <img
                            src={a.imagen_url}
                            alt={a.titulo}
                            className="h-14 w-20 rounded-xl border object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-20 items-center justify-center rounded-xl border bg-slate-100 text-slate-400">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}

                        <div>
                          <p className="font-black text-slate-900">{a.titulo}</p>
                          <p className="line-clamp-2 max-w-xl text-xs text-slate-500">
                            {a.descripcion}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Publicado por: {a.created_by || "-"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-700">
                      {a.tipo_anuncio || "-"}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${colorPrioridad(
                          a.prioridad
                        )}`}
                      >
                        {a.prioridad || "Normal"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <p className="font-bold">{a.fecha_publicacion || "-"}</p>
                      <p className="text-xs text-slate-500">
                        Vence: {a.fecha_vencimiento || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={a.estado} />
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        {a.imagen_url && (
                          <a
                            href={a.imagen_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                          >
                            Imagen
                          </a>
                        )}

                        {a.documento_url && (
                          <a
                            href={a.documento_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Documento
                          </a>
                        )}

                        {!a.imagen_url && !a.documento_url && (
                          <span className="text-xs text-slate-400">Sin adjuntos</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-center gap-2">
                        {a.estado === "Activo" ? (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(a.id, "Inactivo")}
                            className="rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(a.id, "Activo")}
                            className="rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                          >
                            Activar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </div>
      </SectionCard>

      <PageDrawer
        open={drawerOpen}
        title="Nuevo anuncio"
        onClose={() => setDrawerOpen(false)}
      >
        <form onSubmit={guardarAnuncio} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Tipo de anuncio *
            </label>
            <select
              value={tipoAnuncio}
              onChange={(e) => setTipoAnuncio(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
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
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="Ej. Mantenimiento programado"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Prioridad
              </label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              >
                {prioridades.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Fecha vencimiento
              </label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Imagen / flyer
            </label>
            <input
              id="imagenAnuncio"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => setImagenArchivo(e.target.files?.[0] || null)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            />
            {imagenArchivo && (
              <p className="mt-1 text-xs text-slate-500">
                Imagen seleccionada: <b>{imagenArchivo.name}</b>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Documento PDF / Word
            </label>
            <input
              id="documentoAnuncio"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setDocumentoArchivo(e.target.files?.[0] || null)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            />
            {documentoArchivo && (
              <p className="mt-1 text-xs text-slate-500">
                Documento seleccionado: <b>{documentoArchivo.name}</b>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Descripción *
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              rows={5}
              placeholder="Contenido del comunicado"
            />
          </div>

          <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-bold text-slate-800">Próxima fase</p>
            <p className="mt-1">
              Aquí agregaremos publicar en app, portal, push, email, WhatsApp y programación automática.
            </p>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
            >
              <Send className="h-4 w-4" />
              {guardando ? "Publicando..." : "Publicar anuncio"}
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-xl border px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </PageDrawer>
    </PageContainer>
  );
}
