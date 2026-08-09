"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  FileText,
  LockKeyhole,
  ShieldAlert,
  Star,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Condominio = {
  id: number;
  nombre: string;
  logo_url?: string | null;
};

type Unidad = {
  id: number;
  codigo: string;
};

type PropietarioApartamento = {
  id: number;
  nombre_propietario: string | null;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  no_apartamento: string | null;
};

type ModoVisualizacion = "Normal" | "Destacado" | "Obligatorio";
type FrecuenciaVisualizacion =
  | "Una vez"
  | "Cada inicio"
  | "Hasta confirmar";

type ConfiguracionAnuncio = {
  version: number;
  descripcion: string;
  modo_visualizacion: ModoVisualizacion;
  mostrar_al_inicio: boolean;
  requiere_confirmacion: boolean;
  frecuencia_visualizacion: FrecuenciaVisualizacion;
  permitir_cerrar: boolean;
  texto_confirmacion: string;
  destinatarios: string;
};

type AnuncioInicio = {
  id: number;
  condominio_id: number;
  tipo_anuncio: string | null;
  titulo: string;
  descripcion: string | null;
  contenido: string | null;
  prioridad: string | null;
  imagen_url: string | null;
  documento_url: string | null;
  fecha_publicacion: string | null;
  fecha_vencimiento: string | null;
  estado: string | null;
  created_at: string | null;
};

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

const PRIORIDAD_ORDEN: Record<string, number> = {
  Urgente: 4,
  Alta: 3,
  Normal: 2,
  Baja: 1,
};

const MODO_ORDEN: Record<ModoVisualizacion, number> = {
  Obligatorio: 3,
  Destacado: 2,
  Normal: 1,
};

function limpiarCedula(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

function obtenerConfiguracion(anuncio: AnuncioInicio): ConfiguracionAnuncio {
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
    // Compatibilidad con anuncios anteriores cuyo contenido era texto plano.
  }

  return {
    ...CONFIGURACION_PREDETERMINADA,
    descripcion: anuncio.descripcion || anuncio.contenido || "",
  };
}

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "";

  const normalizada = fecha.includes("T") ? fecha : `${fecha}T00:00:00`;

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(normalizada));
}

function claveLectura(
  tipo: "visto" | "confirmado",
  condominioId: number,
  propietarioId: number,
  anuncioId: number
) {
  return `vam_anuncio_${tipo}_${condominioId}_${propietarioId}_${anuncioId}`;
}

export default function LoginPropietariosPage() {
  const router = useRouter();

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [condominioLogoUrl, setCondominioLogoUrl] = useState("");

  const [unidadId, setUnidadId] = useState("");
  const [cedula, setCedula] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoCondominios, setCargandoCondominios] = useState(true);
  const [cargandoUnidades, setCargandoUnidades] = useState(false);

  const [propietarioAutenticadoId, setPropietarioAutenticadoId] = useState<
    number | null
  >(null);
  const [anunciosInicio, setAnunciosInicio] = useState<AnuncioInicio[]>([]);
  const [indiceAnuncio, setIndiceAnuncio] = useState(0);
  const [mostrarAnuncio, setMostrarAnuncio] = useState(false);

  useEffect(() => {
    void cargarCondominios();
  }, []);

  const anuncioActual = anunciosInicio[indiceAnuncio] || null;

  const configuracionActual = useMemo(
    () => (anuncioActual ? obtenerConfiguracion(anuncioActual) : null),
    [anuncioActual]
  );

  async function cargarCondominios() {
    setCargandoCondominios(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre, logo_url")
      .order("nombre");

    setCargandoCondominios(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setCondominios(data || []);
  }

  async function seleccionarCondominio(id: string) {
    setCondominioId(id);
    setUnidadId("");
    setUnidades([]);
    setMensaje("");

    const seleccionado = condominios.find(
      (condominio) => String(condominio.id) === id
    );

    setCondominioNombre(seleccionado?.nombre || "");
    setCondominioLogoUrl(seleccionado?.logo_url || "");

    if (!id) return;

    setCargandoUnidades(true);

    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo");

    setCargandoUnidades(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setUnidades(data || []);
  }

  function limpiarSesion() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
  }

  function debeMostrarAnuncio(
    anuncio: AnuncioInicio,
    configuracion: ConfiguracionAnuncio,
    propietarioId: number
  ) {
    if (!configuracion.mostrar_al_inicio) return false;

    const idCondominio = Number(anuncio.condominio_id || condominioId);
    const confirmado = localStorage.getItem(
      claveLectura("confirmado", idCondominio, propietarioId, anuncio.id)
    );
    const visto = localStorage.getItem(
      claveLectura("visto", idCondominio, propietarioId, anuncio.id)
    );

    if (
      configuracion.modo_visualizacion === "Obligatorio" ||
      configuracion.requiere_confirmacion ||
      configuracion.frecuencia_visualizacion === "Hasta confirmar"
    ) {
      return confirmado !== "1";
    }

    if (configuracion.frecuencia_visualizacion === "Una vez") {
      return visto !== "1";
    }

    return true;
  }

  async function cargarAnunciosIniciales(propietarioId: number) {
    const hoy = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("anuncios")
      .select(`
        id,
        condominio_id,
        tipo_anuncio,
        titulo,
        descripcion,
        contenido,
        prioridad,
        imagen_url,
        documento_url,
        fecha_publicacion,
        fecha_vencimiento,
        estado,
        created_at
      `)
      .eq("condominio_id", Number(condominioId))
      .eq("estado", "Activo")
      .lte("fecha_publicacion", hoy)
      .or(`fecha_vencimiento.is.null,fecha_vencimiento.gte.${hoy}`)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("No fue posible cargar los anuncios iniciales:", error);
      return [];
    }

    return ((data || []) as AnuncioInicio[])
      .filter((anuncio) => {
        const configuracion = obtenerConfiguracion(anuncio);
        return debeMostrarAnuncio(anuncio, configuracion, propietarioId);
      })
      .sort((a, b) => {
        const configA = obtenerConfiguracion(a);
        const configB = obtenerConfiguracion(b);

        const diferenciaModo =
          MODO_ORDEN[configB.modo_visualizacion] -
          MODO_ORDEN[configA.modo_visualizacion];

        if (diferenciaModo !== 0) return diferenciaModo;

        const prioridadA = PRIORIDAD_ORDEN[a.prioridad || "Normal"] || 0;
        const prioridadB = PRIORIDAD_ORDEN[b.prioridad || "Normal"] || 0;

        if (prioridadB !== prioridadA) return prioridadB - prioridadA;

        return String(a.created_at || "").localeCompare(
          String(b.created_at || "")
        );
      });
  }

  async function entrar(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!condominioId || !unidadId || !cedula.trim()) {
      setMensaje("Debe completar condominio, apartamento y cédula.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const unidadCodigo =
        unidades.find((unidad) => String(unidad.id) === unidadId)?.codigo || "";

      const cedulaLimpia = limpiarCedula(cedula);

      const { data, error } = await supabase
        .from("propietarios_apartamentos")
        .select(`
          id,
          nombre_propietario,
          cedula,
          telefono,
          correo,
          no_apartamento
        `)
        .eq("condominio_id", Number(condominioId))
        .eq("no_apartamento", unidadCodigo);

      if (error) {
        setMensaje(error.message);
        return;
      }

      const propietario = ((data || []) as PropietarioApartamento[]).find(
        (registro) => limpiarCedula(registro.cedula || "") === cedulaLimpia
      );

      if (!propietario) {
        setMensaje("La cédula no coincide con el apartamento seleccionado.");
        return;
      }

      limpiarSesion();

      const sesionPropietario = {
        propietario_id: propietario.id,
        condominio_id: Number(condominioId),
        condominio_nombre: condominioNombre,
        condominio_logo_url: condominioLogoUrl,
        unidad_id: Number(unidadId),
        no_apartamento: unidadCodigo,
        nombre_propietario: propietario.nombre_propietario,
        cedula: propietario.cedula,
        telefono: propietario.telefono,
        correo: propietario.correo,
      };

      localStorage.setItem(
        "propietario_actual",
        JSON.stringify(sesionPropietario)
      );
      localStorage.setItem("condominio_id", String(condominioId));
      localStorage.setItem("condominio_nombre", condominioNombre);
      localStorage.setItem("condominio_logo_url", condominioLogoUrl);

      setPropietarioAutenticadoId(propietario.id);

      const anunciosPendientes = await cargarAnunciosIniciales(propietario.id);

      if (anunciosPendientes.length > 0) {
        setAnunciosInicio(anunciosPendientes);
        setIndiceAnuncio(0);
        setMostrarAnuncio(true);
        return;
      }

      router.replace("/movil/propietarios/dashboard");
    } finally {
      setLoading(false);
    }
  }

  function avanzarAnuncio(confirmado: boolean) {
    if (!anuncioActual || !propietarioAutenticadoId || !configuracionActual) {
      router.replace("/movil/propietarios/dashboard");
      return;
    }

    const idCondominio = Number(
      anuncioActual.condominio_id || condominioId
    );

    localStorage.setItem(
      claveLectura(
        "visto",
        idCondominio,
        propietarioAutenticadoId,
        anuncioActual.id
      ),
      "1"
    );

    if (confirmado) {
      localStorage.setItem(
        claveLectura(
          "confirmado",
          idCondominio,
          propietarioAutenticadoId,
          anuncioActual.id
        ),
        "1"
      );
    }

    const siguienteIndice = indiceAnuncio + 1;

    if (siguienteIndice < anunciosInicio.length) {
      setIndiceAnuncio(siguienteIndice);
      return;
    }

    setMostrarAnuncio(false);
    router.replace("/movil/propietarios/dashboard");
  }

  const requiereConfirmacion = Boolean(
    configuracionActual &&
      (configuracionActual.modo_visualizacion === "Obligatorio" ||
        configuracionActual.requiere_confirmacion)
  );

  const puedeCerrar = Boolean(
    configuracionActual?.permitir_cerrar && !requiereConfirmacion
  );

  function iconoAnuncio() {
    if (configuracionActual?.modo_visualizacion === "Obligatorio") {
      return <LockKeyhole className="h-6 w-6" />;
    }

    if (configuracionActual?.modo_visualizacion === "Destacado") {
      return <Star className="h-6 w-6" />;
    }

    return <Bell className="h-6 w-6" />;
  }

  function estiloCabeceraAnuncio() {
    if (configuracionActual?.modo_visualizacion === "Obligatorio") {
      return "from-red-700 to-red-950";
    }

    if (configuracionActual?.modo_visualizacion === "Destacado") {
      return "from-amber-600 to-orange-800";
    }

    return "from-blue-700 to-blue-950";
  }

  return (
    <>
      <main className="min-h-dvh bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 px-3 py-3 sm:px-4 sm:py-5">
        <div className="mx-auto flex min-h-[calc(100dvh-24px)] w-full max-w-sm items-center justify-center">
          <section className="w-full overflow-hidden rounded-[1.6rem] bg-white shadow-2xl shadow-black/30">
            <div className="bg-gradient-to-r from-blue-800 to-blue-950 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                {condominioLogoUrl ? (
                  <img
                    src={condominioLogoUrl}
                    alt={condominioNombre || "Logo del condominio"}
                    className="h-12 w-12 rounded-xl bg-white object-contain p-1.5"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-base font-black text-blue-900">
                    VAM
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold">
                    VAM Propietarios
                  </p>
                  <p className="text-xs text-blue-100">
                    Acceso móvil al condominio
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-5">
              <div className="mb-4">
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  Iniciar sesión
                </h1>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Seleccione su condominio, unidad y escriba su cédula.
                </p>
              </div>

              <form onSubmit={entrar} className="space-y-3">
                <div>
                  <label
                    htmlFor="condominio"
                    className="mb-1 block text-xs font-bold text-slate-700"
                  >
                    Condominio
                  </label>
                  <select
                    id="condominio"
                    value={condominioId}
                    onChange={(event) =>
                      void seleccionarCondominio(event.target.value)
                    }
                    disabled={cargandoCondominios || loading}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      {cargandoCondominios
                        ? "Cargando..."
                        : "Seleccione condominio"}
                    </option>

                    {condominios.map((condominio) => (
                      <option key={condominio.id} value={condominio.id}>
                        {condominio.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="unidad"
                    className="mb-1 block text-xs font-bold text-slate-700"
                  >
                    Apartamento / Unidad
                  </label>
                  <select
                    id="unidad"
                    value={unidadId}
                    onChange={(event) => setUnidadId(event.target.value)}
                    disabled={!condominioId || cargandoUnidades || loading}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      {cargandoUnidades
                        ? "Cargando..."
                        : !condominioId
                          ? "Seleccione primero el condominio"
                          : "Seleccione unidad"}
                    </option>

                    {unidades.map((unidad) => (
                      <option key={unidad.id} value={unidad.id}>
                        {unidad.codigo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="cedula"
                    className="mb-1 block text-xs font-bold text-slate-700"
                  >
                    Cédula del propietario
                  </label>
                  <input
                    id="cedula"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={cedula}
                    onChange={(event) => setCedula(event.target.value)}
                    placeholder="Digite su cédula"
                    disabled={loading}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </div>

                {mensaje && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
                  >
                    {mensaje}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-blue-800 px-4 text-sm font-extrabold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Validando y cargando avisos..." : "Entrar"}
                </button>
              </form>

              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-[11px] leading-4 text-slate-500">
                Consulta estado de cuenta, pagos, recibos e incidencias.
              </div>

              <p className="mt-3 text-center text-[10px] text-slate-400">
                VAM Administración de Condominios
              </p>
            </div>
          </section>
        </div>
      </main>

      {mostrarAnuncio && anuncioActual && configuracionActual && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-anuncio-inicial"
            className="max-h-[95dvh] w-full max-w-md overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl"
          >
            <header
              className={`bg-gradient-to-r ${estiloCabeceraAnuncio()} px-5 py-5 text-white`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-2xl bg-white/15 p-3">
                    {iconoAnuncio()}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/75">
                      {configuracionActual.modo_visualizacion}
                    </p>
                    <h2
                      id="titulo-anuncio-inicial"
                      className="mt-1 text-xl font-black leading-tight"
                    >
                      {anuncioActual.titulo}
                    </h2>
                  </div>
                </div>

                {puedeCerrar && (
                  <button
                    type="button"
                    onClick={() => avanzarAnuncio(false)}
                    className="rounded-xl bg-white/15 p-2 text-white transition hover:bg-white/25"
                    aria-label="Cerrar anuncio"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/80">
                {anuncioActual.tipo_anuncio && (
                  <span className="rounded-full bg-white/15 px-3 py-1">
                    {anuncioActual.tipo_anuncio}
                  </span>
                )}

                {anuncioActual.prioridad && (
                  <span className="rounded-full bg-white/15 px-3 py-1">
                    Prioridad: {anuncioActual.prioridad}
                  </span>
                )}

                {anuncioActual.fecha_publicacion && (
                  <span className="rounded-full bg-white/15 px-3 py-1">
                    {formatearFecha(anuncioActual.fecha_publicacion)}
                  </span>
                )}
              </div>
            </header>

            <div className="space-y-4 p-5">
              {anuncioActual.imagen_url && (
                <img
                  src={anuncioActual.imagen_url}
                  alt={anuncioActual.titulo}
                  className="max-h-[380px] w-full rounded-2xl border border-slate-200 object-contain"
                />
              )}

              <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {configuracionActual.descripcion ||
                  anuncioActual.descripcion ||
                  "Sin descripción."}
              </div>

              {anuncioActual.documento_url && (
                <a
                  href={anuncioActual.documento_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800"
                >
                  <FileText className="h-4 w-4" />
                  Ver documento adjunto
                </a>
              )}

              {requiereConfirmacion && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                    <div>
                      <p className="text-sm font-black text-red-900">
                        Confirmación requerida
                      </p>
                      <p className="mt-1 text-xs leading-5 text-red-700">
                        Debe confirmar que leyó esta comunicación antes de
                        ingresar al sistema.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
                <span>
                  Aviso {indiceAnuncio + 1} de {anunciosInicio.length}
                </span>
                <span>{condominioNombre}</span>
              </div>

              <button
                type="button"
                onClick={() => avanzarAnuncio(requiereConfirmacion)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-black text-white transition ${
                  requiereConfirmacion
                    ? "bg-blue-800 hover:bg-blue-900"
                    : "bg-slate-800 hover:bg-slate-900"
                }`}
              >
                {requiereConfirmacion ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}

                {requiereConfirmacion
                  ? configuracionActual.texto_confirmacion ||
                    "He leído esta comunicación"
                  : indiceAnuncio + 1 < anunciosInicio.length
                    ? "Continuar al siguiente aviso"
                    : "Continuar al sistema"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
