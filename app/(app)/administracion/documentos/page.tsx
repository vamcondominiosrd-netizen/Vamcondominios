"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Download,
  Eye,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  Upload,
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buscar, setBuscar] = useState("");

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

    setDocumentos((data as Documento[]) || []);
  }

  function limpiarFormulario() {
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
      limpiarFormulario();
      setDrawerOpen(false);
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

  const documentosFiltrados = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    if (!texto) return documentos;

    return documentos.filter((doc) => {
      const combinado = `
        ${doc.titulo || ""}
        ${doc.descripcion || ""}
        ${doc.categoria || ""}
        ${doc.estado || ""}
        ${doc.condominio || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [documentos, buscar]);

  const publicados = documentos.filter((d) => d.estado === "Publicado").length;
  const borradores = documentos.filter((d) => d.estado === "Borrador").length;
  const visibles = documentos.filter((d) => d.visible_propietarios).length;

  return (
    <PageContainer>
      <PageHeader
        title="Documentos"
        subtitle="Administración de reglamentos, actas, estados financieros y comunicaciones visibles para propietarios."
        badge="Centro Residencial"
        icon={FileText}
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
              <Upload className="h-4 w-4" />
              Nuevo documento
            </button>

            <button
              type="button"
              onClick={cargarDocumentos}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        }
      />

      {mensaje && (
        <div
          className={`rounded-xl p-3 text-sm ${
            exito
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Total documentos"
          value={documentos.length}
          subtitle="Registrados"
          icon={FileText}
          tone="blue"
        />

        <StatCard
          title="Publicados"
          value={publicados}
          subtitle="Estado publicado"
          icon={CheckCircle}
          tone="green"
        />

        <StatCard
          title="Borradores"
          value={borradores}
          subtitle="Pendientes"
          icon={FileText}
          tone="amber"
        />

        <StatCard
          title="Visibles"
          value={visibles}
          subtitle="Para propietarios"
          icon={Eye}
          tone="slate"
        />
      </div>

      <SectionCard
        title="Documentos registrados"
        subtitle="Solo se muestran documentos del condominio activo."
      >
        <ActionBar
          search={buscar}
          onSearch={setBuscar}
          placeholder="Buscar título, categoría, estado o descripción..."
        >
          <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            <Search className="h-4 w-4" />
            {documentosFiltrados.length} registros
          </div>
        </ActionBar>

        <div className="mt-4">
          {loadingLista ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
              Cargando documentos...
            </div>
          ) : documentosFiltrados.length === 0 ? (
            <EmptyState
              title="Sin documentos"
              description="No hay documentos registrados para este condominio."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Documento</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Visible</th>
                  <th className="px-4 py-3 text-center">Fecha</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {documentosFiltrados.map((doc) => (
                  <tr key={doc.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <FileText size={18} className="mt-0.5 text-blue-700" />

                        <div>
                          <p className="font-black text-slate-900">
                            {doc.titulo}
                          </p>

                          {doc.descripcion && (
                            <p className="text-xs text-slate-500">
                              {doc.descripcion}
                            </p>
                          )}

                          {doc.requiere_firma && (
                            <p className="mt-1 text-xs font-bold text-orange-600">
                              Requiere firma
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">{doc.categoria}</td>

                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={doc.estado} />
                    </td>

                    <td className="px-4 py-3 text-center">
                      {doc.visible_propietarios ? (
                        <span className="inline-flex items-center gap-1 font-bold text-green-700">
                          <CheckCircle size={15} />
                          Sí
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-red-700">
                          <XCircle size={15} />
                          No
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {doc.fecha_publicacion
                        ? new Date(doc.fecha_publicacion).toLocaleDateString(
                            "es-DO"
                          )
                        : "-"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-center gap-2">
                        {doc.archivo_url && (
                          <a
                            href={doc.archivo_url}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                          >
                            <Eye size={14} />
                            Ver
                          </a>
                        )}

                        {doc.archivo_url && (
                          <a
                            href={doc.archivo_url}
                            download
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
                          >
                            <Download size={14} />
                            Descargar
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => cambiarVisible(doc)}
                          className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                          {doc.visible_propietarios ? "Ocultar" : "Mostrar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarDocumento(doc.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
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
        title="Nuevo documento"
        onClose={() => setDrawerOpen(false)}
      >
        <div className="space-y-4">
          <select
            value={condominioId}
            disabled
            className="w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm text-slate-700"
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

          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
          >
            {categorias.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Reglamento interno 2026"
            className="w-full rounded-xl border px-4 py-3 text-sm"
          />

          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
          >
            {estados.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>

          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            placeholder="Descripción breve del documento"
            className="w-full rounded-xl border px-4 py-3 text-sm"
          />

          <input
            id="archivoDocumento"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
          />

          {archivo && (
            <p className="text-xs text-slate-500">
              Archivo seleccionado: <b>{archivo.name}</b>
            </p>
          )}

          <label className="flex items-center gap-2 rounded-xl border bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={visiblePropietarios}
              onChange={(e) => setVisiblePropietarios(e.target.checked)}
            />
            <span className="text-sm font-semibold">Visible propietarios</span>
          </label>

          <label className="flex items-center gap-2 rounded-xl border bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={requiereFirma}
              onChange={(e) => setRequiereFirma(e.target.checked)}
            />
            <span className="text-sm font-semibold">Requiere firma</span>
          </label>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={guardarDocumento}
              disabled={loading || !condominioId}
              className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
            >
              {loading ? "Guardando..." : "Guardar documento"}
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-xl border px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </PageDrawer>
    </PageContainer>
  );
}