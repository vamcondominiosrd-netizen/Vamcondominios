"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle,
  Eye,
  FileText,
  Image as ImageIcon,
  LockKeyhole,
  Megaphone,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Star,
  Users,
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

type ModoVisualizacion = "Normal" | "Destacado" | "Obligatorio";
type FrecuenciaVisualizacion =
  | "Una vez"
  | "Cada inicio"
  | "Hasta confirmar";

type Anuncio = {
  id: number;
  condominio: string;
  tipo_anuncio: string;
  titulo: string;
  descripcion: string;
  contenido?: string | null;
  prioridad: string;
  imagen_url: string;
  documento_url: string;
  fecha_publicacion: string;
  fecha_vencimiento: string | null;
  estado: string;
  created_by: string;
  created_at: string;
  condominio_id?: number;
};

type ConfiguracionAnuncio = {
  version: 1;
  descripcion: string;
  modo_visualizacion: ModoVisualizacion;
  mostrar_al_inicio: boolean;
  requiere_confirmacion: boolean;
  frecuencia_visualizacion: FrecuenciaVisualizacion;
  permitir_cerrar: boolean;
  texto_confirmacion: string;
  destinatarios: "Todos los propietarios";
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

const CONFIGURACION_PREDETERMINADA: ConfiguracionAnuncio = {
  version: 1,
  descripcion: "",
  modo_visualizacion: "Normal",
  mostrar_al_inicio: false,
  requiere_confirmacion: false,
  frecuencia_visualizacion: "Una vez",
  permitir_cerrar: true,
  texto_confirmacion: "He leído esta comunicación",
  destinatarios: "Todos los propietarios",
};

function construirContenido(configuracion: ConfiguracionAnuncio) {
  return JSON.stringify({
    vam_anuncio_config: configuracion,
  });
}

function obtenerConfiguracion(anuncio: Anuncio): ConfiguracionAnuncio {
  if (!anuncio.contenido) {
    return {
      ...CONFIGURACION_PREDETERMINADA,
      descripcion: anuncio.descripcion || "",
    };
  }

  try {
    const contenido = JSON.parse(anuncio.contenido);

    if (contenido?.vam_anuncio_config) {
      return {
        ...CONFIGURACION_PREDETERMINADA,
        ...contenido.vam_anuncio_config,
        descripcion:
          contenido.vam_anuncio_config.descripcion ||
          anuncio.descripcion ||
          "",
      };
    }
  } catch {
    // Compatibilidad con anuncios antiguos cuyo contenido era texto plano.
  }

  return {
    ...CONFIGURACION_PREDETERMINADA,
    descripcion: anuncio.descripcion || anuncio.contenido || "",
  };
}

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "-";

  const fechaNormalizada = fecha.includes("T")
    ? fecha
    : `${fecha}T00:00:00`;

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(fechaNormalizada));
}

export default function AnunciosPage() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anuncioVistaPrevia, setAnuncioVistaPrevia] =
    useState<Anuncio | null>(null);

  const [condominio, setCondominio] = useState("");
  const [condominioId, setCondominioId] = useState("");

  const [tipoAnuncio, setTipoAnuncio] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState("Normal");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [imagenArchivo, setImagenArchivo] = useState<File | null>(null);
  const [documentoArchivo, setDocumentoArchivo] = useState<File | null>(null);

  const [modoVisualizacion, setModoVisualizacion] =
    useState<ModoVisualizacion>("Normal");
  const [mostrarAlInicio, setMostrarAlInicio] = useState(false);
  const [requiereConfirmacion, setRequiereConfirmacion] = useState(false);
  const [frecuenciaVisualizacion, setFrecuenciaVisualizacion] =
    useState<FrecuenciaVisualizacion>("Una vez");
  const [permitirCerrar, setPermitirCerrar] = useState(true);
  const [textoConfirmacion, setTextoConfirmacion] = useState(
    "He leído esta comunicación"
  );

  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroModo, setFiltroModo] = useState("");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominio(nombre);

    if (id) cargarAnuncios(id);
  }, []);

  async function cargarAnuncios(id: string) {
    if (!id) return;

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

    setModoVisualizacion("Normal");
    setMostrarAlInicio(false);
    setRequiereConfirmacion(false);
    setFrecuenciaVisualizacion("Una vez");
    setPermitirCerrar(true);
    setTextoConfirmacion("He leído esta comunicación");

    const inputImagen = document.getElementById(
      "imagenAnuncio"
    ) as HTMLInputElement | null;

    const inputDocumento = document.getElementById(
      "documentoAnuncio"
    ) as HTMLInputElement | null;

    if (inputImagen) inputImagen.value = "";
    if (inputDocumento) inputDocumento.value = "";
  }

  function seleccionarModo(modo: ModoVisualizacion) {
    setModoVisualizacion(modo);

    if (modo === "Normal") {
      setMostrarAlInicio(false);
      setRequiereConfirmacion(false);
      setFrecuenciaVisualizacion("Una vez");
      setPermitirCerrar(true);
      return;
    }

    if (modo === "Destacado") {
      setMostrarAlInicio(true);
      setRequiereConfirmacion(false);
      setFrecuenciaVisualizacion("Cada inicio");
      setPermitirCerrar(true);
      return;
    }

    setMostrarAlInicio(true);
    setRequiereConfirmacion(true);
    setFrecuenciaVisualizacion("Hasta confirmar");
    setPermitirCerrar(false);
  }

  async function subirArchivo(archivo: File, carpeta: string) {
    const extension = archivo.name.split(".").pop() || "archivo";
    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const nombreCarpeta = (condominio || "general")
      .trim()
      .replace(/[^\w\-áéíóúÁÉÍÓÚñÑ]+/g, "-");

    const rutaArchivo = `${nombreCarpeta}/${carpeta}/${nombreArchivo}`;

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

    if (
      !condominio ||
      !condominioId ||
      !tipoAnuncio ||
      !titulo.trim() ||
      !descripcion.trim()
    ) {
      alert("Debe completar tipo de anuncio, título y descripción.");
      return;
    }

    if (requiereConfirmacion && !textoConfirmacion.trim()) {
      alert("Debe indicar el texto del botón de confirmación.");
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
        documentoUrl = await subirArchivo(
          documentoArchivo,
          "documentos"
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const configuracion: ConfiguracionAnuncio = {
        version: 1,
        descripcion: descripcion.trim(),
        modo_visualizacion: modoVisualizacion,
        mostrar_al_inicio: mostrarAlInicio,
        requiere_confirmacion: requiereConfirmacion,
        frecuencia_visualizacion: frecuenciaVisualizacion,
        permitir_cerrar: permitirCerrar,
        texto_confirmacion:
          textoConfirmacion.trim() || "He leído esta comunicación",
        destinatarios: "Todos los propietarios",
      };

      const { error } = await supabase.from("anuncios").insert([
        {
          condominio_id: Number(condominioId),
          condominio,
          tipo_anuncio: tipoAnuncio,
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          contenido: construirContenido(configuracion),
          prioridad,
          imagen_url: imagenUrl,
          documento_url: documentoUrl,
          fecha_publicacion: new Date().toISOString().slice(0, 10),
          fecha_vencimiento: fechaVencimiento || null,
          estado: "Activo",
          created_by: user?.email || "",
        },
      ]);

      if (error) {
        alert("Error guardando anuncio: " + error.message);
        return;
      }

      alert("Anuncio publicado correctamente.");
      limpiarFormulario();
      setDrawerOpen(false);
      await cargarAnuncios(condominioId);
    } catch (err: unknown) {
      const mensaje =
        err instanceof Error ? err.message : "Error desconocido";

      alert("Error publicando anuncio: " + mensaje);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(id: number, nuevoEstado: string) {
    if (!condominioId) return;

    const confirmar = confirm(
      `¿Desea cambiar el estado del anuncio a ${nuevoEstado}?`
    );

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

    await cargarAnuncios(condominioId);
  }

  function colorPrioridad(valor: string) {
    if (valor === "Urgente") return "bg-red-100 text-red-700";
    if (valor === "Alta") return "bg-orange-100 text-orange-700";
    if (valor === "Baja") return "bg-slate-100 text-slate-700";
    return "bg-blue-100 text-blue-700";
  }

  function colorModo(modo: ModoVisualizacion) {
    if (modo === "Obligatorio") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    if (modo === "Destacado") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  const anunciosConConfiguracion = useMemo(
    () =>
      anuncios.map((anuncio) => ({
        anuncio,
        configuracion: obtenerConfiguracion(anuncio),
      })),
    [anuncios]
  );

  const anunciosFiltrados = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    return anunciosConConfiguracion.filter(
      ({ anuncio, configuracion }) => {
        if (filtroEstado && anuncio.estado !== filtroEstado) return false;

        if (
          filtroModo &&
          configuracion.modo_visualizacion !== filtroModo
        ) {
          return false;
        }

        if (!texto) return true;

        const combinado = `
          ${anuncio.titulo || ""}
          ${anuncio.descripcion || ""}
          ${anuncio.tipo_anuncio || ""}
          ${anuncio.prioridad || ""}
          ${anuncio.estado || ""}
          ${anuncio.created_by || ""}
          ${configuracion.modo_visualizacion || ""}
        `.toLowerCase();

        return combinado.includes(texto);
      }
    );
  }, [
    anunciosConConfiguracion,
    buscar,
    filtroEstado,
    filtroModo,
  ]);

  const activos = anuncios.filter((a) => a.estado === "Activo").length;

  const obligatorios = anunciosConConfiguracion.filter(
    ({ configuracion }) =>
      configuracion.modo_visualizacion === "Obligatorio"
  ).length;

  const destacados = anunciosConConfiguracion.filter(
    ({ configuracion }) =>
      configuracion.modo_visualizacion === "Destacado"
  ).length;

  const configuracionVistaPrevia = anuncioVistaPrevia
    ? obtenerConfiguracion(anuncioVistaPrevia)
    : null;

  return (
    <PageContainer>
      <PageHeader
        title="Centro de Comunicaciones"
        subtitle="Un solo módulo para avisos normales, destacados y publicaciones obligatorias."
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
              disabled={!condominioId || loading}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
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
          title="Obligatorios"
          value={obligatorios}
          subtitle="Requieren atención"
          icon={ShieldAlert}
          tone="red"
        />
        <StatCard
          title="Destacados"
          value={destacados}
          subtitle="Visibles al inicio"
          icon={Star}
          tone="amber"
        />
      </div>

      <SectionCard
        title="Listado de anuncios"
        subtitle={`Condominio activo: ${
          condominio || "No seleccionado"
        }`}
      >
        <ActionBar
          search={buscar}
          onSearch={setBuscar}
          placeholder="Buscar título, tipo, prioridad, modo o estado..."
        >
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">Todos los estados</option>
            {estadosFiltro.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>

          <select
            value={filtroModo}
            onChange={(e) => setFiltroModo(e.target.value)}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">Todos los modos</option>
            <option value="Normal">Normal</option>
            <option value="Destacado">Destacado</option>
            <option value="Obligatorio">Obligatorio</option>
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
                  <th className="px-4 py-3 text-center">Visualización</th>
                  <th className="px-4 py-3 text-center">Prioridad</th>
                  <th className="px-4 py-3 text-center">Publicación</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Adjuntos</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {anunciosFiltrados.map(
                  ({ anuncio: a, configuracion }) => (
                    <tr
                      key={a.id}
                      className="bg-white hover:bg-slate-50"
                    >
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
                            <p className="font-black text-slate-900">
                              {a.titulo}
                            </p>
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
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${colorModo(
                            configuracion.modo_visualizacion
                          )}`}
                        >
                          {configuracion.modo_visualizacion ===
                            "Obligatorio" && (
                            <LockKeyhole className="h-3.5 w-3.5" />
                          )}

                          {configuracion.modo_visualizacion ===
                            "Destacado" && (
                            <Star className="h-3.5 w-3.5" />
                          )}

                          {configuracion.modo_visualizacion ===
                            "Normal" && (
                            <Bell className="h-3.5 w-3.5" />
                          )}

                          {configuracion.modo_visualizacion}
                        </span>

                        {configuracion.requiere_confirmacion && (
                          <p className="mt-1 text-[11px] font-bold text-red-600">
                            Requiere confirmación
                          </p>
                        )}
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
                        <p className="font-bold">
                          {formatearFecha(a.fecha_publicacion)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Vence: {formatearFecha(a.fecha_vencimiento)}
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
                            <span className="text-xs text-slate-400">
                              Sin adjuntos
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAnuncioVistaPrevia(a)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver
                          </button>

                          {a.estado === "Activo" ? (
                            <button
                              type="button"
                              onClick={() =>
                                cambiarEstado(a.id, "Inactivo")
                              }
                              className="rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800"
                            >
                              Desactivar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                cambiarEstado(a.id, "Activo")
                              }
                              className="rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                            >
                              Activar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </DataTable>
          )}
        </div>
      </SectionCard>

      <PageDrawer
        open={drawerOpen}
        title="Nuevo anuncio"
        onClose={() => {
          if (!guardando) setDrawerOpen(false);
        }}
      >
        <form onSubmit={guardarAnuncio} className="space-y-5">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-blue-700" />
              <div>
                <p className="font-black text-blue-900">
                  Centro de comunicaciones unificado
                </p>
                <p className="mt-1 text-sm text-blue-700">
                  Desde este formulario puede publicar anuncios normales,
                  destacados u obligatorios.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-slate-800">
              Modo de visualización *
            </label>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => seleccionarModo("Normal")}
                className={`rounded-2xl border p-4 text-left transition ${
                  modoVisualizacion === "Normal"
                    ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 h-5 w-5 text-blue-700" />
                  <div>
                    <p className="font-black text-slate-900">
                      Anuncio normal
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Se publica en el módulo de anuncios sin bloquear el
                      acceso del propietario.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => seleccionarModo("Destacado")}
                className={`rounded-2xl border p-4 text-left transition ${
                  modoVisualizacion === "Destacado"
                    ? "border-amber-500 bg-amber-50 ring-2 ring-amber-100"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Star className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-black text-slate-900">
                      Anuncio destacado
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Aparece al inicio, pero el propietario puede cerrarlo
                      y continuar.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => seleccionarModo("Obligatorio")}
                className={`rounded-2xl border p-4 text-left transition ${
                  modoVisualizacion === "Obligatorio"
                    ? "border-red-600 bg-red-50 ring-2 ring-red-100"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-0.5 h-5 w-5 text-red-700" />
                  <div>
                    <p className="font-black text-slate-900">
                      Anuncio obligatorio
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Se muestra después del login y exige confirmación de
                      lectura para continuar.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

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
              placeholder="Ej. Convocatoria a Asamblea General"
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
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) =>
                    setFechaVencimiento(e.target.value)
                  }
                  className="w-full rounded-xl border py-3 pl-10 pr-4 text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Descripción *
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              rows={6}
              placeholder="Contenido completo del comunicado"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Imagen / flyer
            </label>
            <input
              id="imagenAnuncio"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) =>
                setImagenArchivo(e.target.files?.[0] || null)
              }
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
              onChange={(e) =>
                setDocumentoArchivo(e.target.files?.[0] || null)
              }
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            />
            {documentoArchivo && (
              <p className="mt-1 text-xs text-slate-500">
                Documento seleccionado:{" "}
                <b>{documentoArchivo.name}</b>
              </p>
            )}
          </div>

          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-slate-700" />
              <div>
                <p className="font-black text-slate-900">
                  Configuración de visualización
                </p>
                <p className="text-xs text-slate-500">
                  Destinatarios actuales: todos los propietarios del
                  condominio.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start justify-between gap-4 rounded-xl border bg-white p-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Mostrar después de iniciar sesión
                  </p>
                  <p className="text-xs text-slate-500">
                    Presentar el anuncio al entrar al portal.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={mostrarAlInicio}
                  disabled={modoVisualizacion === "Obligatorio"}
                  onChange={(e) =>
                    setMostrarAlInicio(e.target.checked)
                  }
                  className="mt-1 h-5 w-5"
                />
              </label>

              <label className="flex items-start justify-between gap-4 rounded-xl border bg-white p-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Requiere confirmación de lectura
                  </p>
                  <p className="text-xs text-slate-500">
                    Registrar que el propietario presionó el botón de
                    confirmación.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requiereConfirmacion}
                  disabled={modoVisualizacion === "Obligatorio"}
                  onChange={(e) => {
                    const valor = e.target.checked;
                    setRequiereConfirmacion(valor);

                    if (valor) {
                      setMostrarAlInicio(true);
                      setFrecuenciaVisualizacion("Hasta confirmar");
                    }
                  }}
                  className="mt-1 h-5 w-5"
                />
              </label>

              <label className="flex items-start justify-between gap-4 rounded-xl border bg-white p-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Permitir cerrar sin confirmar
                  </p>
                  <p className="text-xs text-slate-500">
                    En anuncios obligatorios esta opción permanece
                    desactivada.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={permitirCerrar}
                  disabled={modoVisualizacion === "Obligatorio"}
                  onChange={(e) =>
                    setPermitirCerrar(e.target.checked)
                  }
                  className="mt-1 h-5 w-5"
                />
              </label>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">
                  Frecuencia de visualización
                </label>
                <select
                  value={frecuenciaVisualizacion}
                  disabled={modoVisualizacion === "Obligatorio"}
                  onChange={(e) =>
                    setFrecuenciaVisualizacion(
                      e.target.value as FrecuenciaVisualizacion
                    )
                  }
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm disabled:bg-slate-100"
                >
                  <option value="Una vez">Una vez</option>
                  <option value="Cada inicio">En cada inicio</option>
                  <option value="Hasta confirmar">
                    Hasta confirmar lectura
                  </option>
                </select>
              </div>

              {requiereConfirmacion && (
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Texto del botón de confirmación
                  </label>
                  <input
                    type="text"
                    value={textoConfirmacion}
                    onChange={(e) =>
                      setTextoConfirmacion(e.target.value)
                    }
                    className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                    placeholder="He leído esta comunicación"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-black">Versión para prueba inmediata</p>
            <p className="mt-1">
              La configuración se guarda dentro del campo{" "}
              <b>contenido</b> de la tabla actual. No requiere modificar la
              base de datos para probar la publicación y el listado.
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
              disabled={guardando}
              onClick={() => setDrawerOpen(false)}
              className="rounded-xl border px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </PageDrawer>

      {anuncioVistaPrevia && configuracionVistaPrevia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div
              className={`border-b p-5 ${
                configuracionVistaPrevia.modo_visualizacion ===
                "Obligatorio"
                  ? "bg-red-50"
                  : configuracionVistaPrevia.modo_visualizacion ===
                    "Destacado"
                  ? "bg-amber-50"
                  : "bg-blue-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-2xl p-3 ${colorModo(
                      configuracionVistaPrevia.modo_visualizacion
                    )}`}
                  >
                    {configuracionVistaPrevia.modo_visualizacion ===
                    "Obligatorio" ? (
                      <LockKeyhole className="h-6 w-6" />
                    ) : configuracionVistaPrevia.modo_visualizacion ===
                      "Destacado" ? (
                      <Star className="h-6 w-6" />
                    ) : (
                      <Bell className="h-6 w-6" />
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      {configuracionVistaPrevia.modo_visualizacion}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      {anuncioVistaPrevia.titulo}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {anuncioVistaPrevia.tipo_anuncio} ·{" "}
                      {formatearFecha(
                        anuncioVistaPrevia.fecha_publicacion
                      )}
                    </p>
                  </div>
                </div>

                {configuracionVistaPrevia.permitir_cerrar && (
                  <button
                    type="button"
                    onClick={() => setAnuncioVistaPrevia(null)}
                    className="rounded-xl border bg-white p-2 text-slate-500 hover:bg-slate-50"
                    aria-label="Cerrar vista previa"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-5 p-6">
              {anuncioVistaPrevia.imagen_url && (
                <img
                  src={anuncioVistaPrevia.imagen_url}
                  alt={anuncioVistaPrevia.titulo}
                  className="max-h-[420px] w-full rounded-2xl border object-contain"
                />
              )}

              <div className="whitespace-pre-wrap text-base leading-7 text-slate-700">
                {anuncioVistaPrevia.descripcion}
              </div>

              {anuncioVistaPrevia.documento_url && (
                <a
                  href={anuncioVistaPrevia.documento_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800"
                >
                  <FileText className="h-4 w-4" />
                  Abrir documento adjunto
                </a>
              )}

              <div className="grid grid-cols-1 gap-3 rounded-2xl border bg-slate-50 p-4 text-sm md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-700" />
                  <span>
                    <b>Destinatarios:</b> Todos los propietarios
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-700" />
                  <span>
                    <b>Frecuencia:</b>{" "}
                    {
                      configuracionVistaPrevia.frecuencia_visualizacion
                    }
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
                {configuracionVistaPrevia.requiere_confirmacion && (
                  <button
                    type="button"
                    onClick={() => setAnuncioVistaPrevia(null)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-black text-white hover:bg-blue-800"
                  >
                    <CheckCircle className="h-5 w-5" />
                    {configuracionVistaPrevia.texto_confirmacion}
                  </button>
                )}

                {!configuracionVistaPrevia.requiere_confirmacion && (
                  <button
                    type="button"
                    onClick={() => setAnuncioVistaPrevia(null)}
                    className="rounded-xl border px-5 py-3 font-black text-slate-700 hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                )}
              </div>

              {configuracionVistaPrevia.modo_visualizacion ===
                "Obligatorio" && (
                <p className="text-center text-xs text-red-600">
                  Vista previa administrativa: en el portal del propietario
                  este anuncio deberá confirmarse antes de continuar.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
