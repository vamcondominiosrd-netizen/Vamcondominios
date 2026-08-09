"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
  UserRound,
  UsersRound,
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

type ModoPortal = "propietario" | "directiva";
type VistaPropietario = "entrar" | "activar";
type TipoMensaje = "error" | "exito" | "info";

type PerfilDirectiva = {
  role: string | null;
  active: boolean | null;
};

type VinculoDirectiva = {
  id: number;
  rol_condominio: string | null;
  activo: boolean | null;
};

type PropietarioSesion = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre?: string | null;
  condominio_logo_url?: string | null;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string | null;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
};

type RespuestaPropietario = {
  ok?: boolean;
  success?: boolean;
  mensaje?: string;
  message?: string;
  propietario?: PropietarioSesion;
  sesion?: PropietarioSesion;
  data?: PropietarioSesion;
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

const ROLES_DIRECTIVA_PERMITIDOS = [
  "admin",
  "administrador",
  "administrador general",
  "administrador condominio",
  "user_view",
  "presidente",
  "tesorero",
  "tesoreria",
  "secretario",
  "secretaria",
  "vocal",
  "miembro directiva",
  "miembro de directiva",
];

function limpiarCedula(valor: string) {
  return String(valor || "").replace(/\D/g, "").slice(0, 11);
}

function formatearCedula(valor: string) {
  const limpia = limpiarCedula(valor);

  if (limpia.length <= 3) return limpia;
  if (limpia.length <= 10) return `${limpia.slice(0, 3)}-${limpia.slice(3)}`;

  return `${limpia.slice(0, 3)}-${limpia.slice(3, 10)}-${limpia.slice(10)}`;
}

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function rolDirectivaPermitido(rol: unknown) {
  const normalizado = normalizarTexto(rol);

  return ROLES_DIRECTIVA_PERMITIDOS.some((permitido) => {
    const permitidoNormalizado = normalizarTexto(permitido);
    return (
      normalizado === permitidoNormalizado ||
      normalizado.includes(permitidoNormalizado)
    );
  });
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

function extraerRespuestaPropietario(valor: unknown): RespuestaPropietario {
  if (Array.isArray(valor)) {
    return (valor[0] || {}) as RespuestaPropietario;
  }

  if (valor && typeof valor === "object") {
    return valor as RespuestaPropietario;
  }

  return {};
}

export default function LoginMovilVAMPage() {
  const router = useRouter();

  const [modoPortal, setModoPortal] = useState<ModoPortal>("propietario");
  const [vistaPropietario, setVistaPropietario] =
    useState<VistaPropietario>("entrar");

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [unidadId, setUnidadId] = useState("");

  const [cedula, setCedula] = useState("");
  const [clavePropietario, setClavePropietario] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [codigoActivacion, setCodigoActivacion] = useState("");
  const [mostrarClavePropietario, setMostrarClavePropietario] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const [correoDirectiva, setCorreoDirectiva] = useState("");
  const [claveDirectiva, setClaveDirectiva] = useState("");
  const [mostrarClaveDirectiva, setMostrarClaveDirectiva] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<TipoMensaje>("info");
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

  const condominioSeleccionado = useMemo(
    () =>
      condominios.find(
        (condominio) => String(condominio.id) === condominioId
      ) || null,
    [condominios, condominioId]
  );

  const anuncioActual = anunciosInicio[indiceAnuncio] || null;

  const configuracionActual = useMemo(
    () => (anuncioActual ? obtenerConfiguracion(anuncioActual) : null),
    [anuncioActual]
  );

  function mostrarError(texto: string) {
    setTipoMensaje("error");
    setMensaje(texto);
  }

  function mostrarExito(texto: string) {
    setTipoMensaje("exito");
    setMensaje(texto);
  }

  function limpiarMensaje() {
    setMensaje("");
    setTipoMensaje("info");
  }

  async function cargarCondominios() {
    setCargandoCondominios(true);
    limpiarMensaje();

    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre, logo_url")
      .order("nombre", { ascending: true });

    setCargandoCondominios(false);

    if (error) {
      mostrarError("No fue posible cargar los condominios: " + error.message);
      return;
    }

    setCondominios((data || []) as Condominio[]);
  }

  async function cargarUnidades(id: string) {
    if (!id) {
      setUnidades([]);
      return;
    }

    setCargandoUnidades(true);

    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    setCargandoUnidades(false);

    if (error) {
      mostrarError("No fue posible cargar las unidades: " + error.message);
      return;
    }

    setUnidades((data || []) as Unidad[]);
  }

  async function seleccionarCondominio(id: string) {
    setCondominioId(id);
    setUnidadId("");
    setUnidades([]);
    limpiarMensaje();

    if (modoPortal === "propietario" && vistaPropietario === "activar" && id) {
      await cargarUnidades(id);
    }
  }

  async function cambiarPortal(nuevoModo: ModoPortal) {
    if (loading) return;

    setModoPortal(nuevoModo);
    setVistaPropietario("entrar");
    setUnidadId("");
    setUnidades([]);
    setCedula("");
    setClavePropietario("");
    setConfirmarClave("");
    setCodigoActivacion("");
    setCorreoDirectiva("");
    setClaveDirectiva("");
    limpiarMensaje();
  }

  async function cambiarVistaPropietario(nuevaVista: VistaPropietario) {
    if (loading) return;

    setVistaPropietario(nuevaVista);
    setUnidadId("");
    setUnidades([]);
    setClavePropietario("");
    setConfirmarClave("");
    setCodigoActivacion("");
    limpiarMensaje();

    if (nuevaVista === "activar" && condominioId) {
      await cargarUnidades(condominioId);
    }
  }

  function limpiarSesionesLocales() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("directiva_actual");
    localStorage.removeItem("usuario_actual");
    localStorage.removeItem("sesion_usuario");
    localStorage.removeItem("usuario");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
  }

  function guardarSesionPropietario(propietario: PropietarioSesion) {
    const condominio = condominios.find(
      (item) => item.id === Number(propietario.condominio_id)
    );

    const sesionPropietario = {
      tipo_usuario: "PROPIETARIO",
      propietario_id: Number(propietario.propietario_id),
      condominio_id: Number(propietario.condominio_id),
      condominio_nombre:
        propietario.condominio_nombre || condominio?.nombre || "Condominio",
      condominio_logo_url:
        propietario.condominio_logo_url || condominio?.logo_url || "",
      unidad_id: Number(propietario.unidad_id),
      no_apartamento: propietario.no_apartamento,
      nombre_propietario: propietario.nombre_propietario,
      cedula: propietario.cedula,
      telefono: propietario.telefono,
      correo: propietario.correo,
    };

    limpiarSesionesLocales();

    localStorage.setItem(
      "propietario_actual",
      JSON.stringify(sesionPropietario)
    );
    localStorage.setItem(
      "condominio_id",
      String(sesionPropietario.condominio_id)
    );
    localStorage.setItem(
      "condominio_nombre",
      sesionPropietario.condominio_nombre
    );
    localStorage.setItem(
      "condominio_logo_url",
      sesionPropietario.condominio_logo_url
    );

    setCondominioId(String(sesionPropietario.condominio_id));
    setPropietarioAutenticadoId(sesionPropietario.propietario_id);

    return sesionPropietario;
  }

  function validarCedulaYClave() {
    const cedulaLimpia = limpiarCedula(cedula);

    if (cedulaLimpia.length !== 11) {
      mostrarError("La cédula debe contener 11 dígitos.");
      return false;
    }

    if (clavePropietario.length < 6) {
      mostrarError("La contraseña debe tener al menos 6 caracteres.");
      return false;
    }

    return true;
  }

  async function entrarPropietario(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!validarCedulaYClave()) return;

    setLoading(true);
    limpiarMensaje();

    try {
      const { data, error } = await supabase.rpc(
        "iniciar_sesion_propietario",
        {
          p_cedula: limpiarCedula(cedula),
          p_clave: clavePropietario,
        }
      );

      if (error) {
        if (
          error.message.toLowerCase().includes("iniciar_sesion_propietario")
        ) {
          mostrarError(
            "Falta instalar la función segura iniciar_sesion_propietario en Supabase."
          );
        } else {
          mostrarError(error.message);
        }
        return;
      }

      const respuesta = extraerRespuestaPropietario(data);
      const fueCorrecto = respuesta.ok ?? respuesta.success ?? false;
      const propietario =
        respuesta.propietario || respuesta.sesion || respuesta.data;

      if (!fueCorrecto || !propietario) {
        mostrarError(
          respuesta.mensaje ||
            respuesta.message ||
            "Cédula o contraseña incorrecta."
        );
        return;
      }

      const sesion = guardarSesionPropietario(propietario);
      const anunciosPendientes = await cargarAnunciosIniciales(
        sesion.propietario_id,
        sesion.condominio_id
      );

      if (anunciosPendientes.length > 0) {
        setAnunciosInicio(anunciosPendientes);
        setIndiceAnuncio(0);
        setMostrarAnuncio(true);
        return;
      }

      router.replace("/movil/propietarios/dashboard");
    } catch (error: unknown) {
      mostrarError(
        error instanceof Error
          ? error.message
          : "No fue posible iniciar la sesión del propietario."
      );
    } finally {
      setLoading(false);
    }
  }

  async function activarCuenta(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!condominioId || !unidadId) {
      mostrarError("Debe seleccionar el condominio y el apartamento.");
      return;
    }

    if (!codigoActivacion.trim()) {
      mostrarError("Debe indicar el código de activación entregado por VAM.");
      return;
    }

    if (!validarCedulaYClave()) return;

    if (clavePropietario !== confirmarClave) {
      mostrarError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    limpiarMensaje();

    try {
      const { data, error } = await supabase.rpc(
        "activar_cuenta_propietario",
        {
          p_condominio_id: Number(condominioId),
          p_unidad_id: Number(unidadId),
          p_codigo_activacion: codigoActivacion.trim().toUpperCase(),
          p_cedula: limpiarCedula(cedula),
          p_clave: clavePropietario,
        }
      );

      if (error) {
        if (error.message.toLowerCase().includes("activar_cuenta_propietario")) {
          mostrarError(
            "Falta instalar la función segura activar_cuenta_propietario en Supabase."
          );
        } else {
          mostrarError(error.message);
        }
        return;
      }

      const respuesta = extraerRespuestaPropietario(data);
      const fueCorrecto = respuesta.ok ?? respuesta.success ?? false;
      const propietario =
        respuesta.propietario || respuesta.sesion || respuesta.data;

      if (!fueCorrecto || !propietario) {
        mostrarError(
          respuesta.mensaje ||
            respuesta.message ||
            "No fue posible activar la cuenta. Verifique los datos indicados."
        );
        return;
      }

      const sesion = guardarSesionPropietario(propietario);
      mostrarExito(
        "Cuenta activada correctamente. Su cédula ya quedó registrada en el perfil."
      );

      const anunciosPendientes = await cargarAnunciosIniciales(
        sesion.propietario_id,
        sesion.condominio_id
      );

      if (anunciosPendientes.length > 0) {
        setAnunciosInicio(anunciosPendientes);
        setIndiceAnuncio(0);
        setMostrarAnuncio(true);
        return;
      }

      router.replace("/movil/propietarios/dashboard");
    } catch (error: unknown) {
      mostrarError(
        error instanceof Error
          ? error.message
          : "No fue posible activar la cuenta del propietario."
      );
    } finally {
      setLoading(false);
    }
  }

  async function entrarDirectiva(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!condominioId) {
      mostrarError("Debe seleccionar el condominio.");
      return;
    }

    if (!correoDirectiva.trim() || !claveDirectiva) {
      mostrarError("Debe indicar correo y contraseña.");
      return;
    }

    setLoading(true);
    limpiarMensaje();

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: correoDirectiva.trim().toLowerCase(),
          password: claveDirectiva,
        });

      if (authError || !authData.user) {
        mostrarError("Correo o contraseña incorrectos.");
        return;
      }

      const uid = authData.user.id;

      const [perfilResultado, vinculoResultado] = await Promise.all([
        supabase
          .from("profiles")
          .select("role, active")
          .eq("id", uid)
          .maybeSingle(),
        supabase
          .from("usuarios_condominios")
          .select("id, rol_condominio, activo")
          .eq("user_id", uid)
          .eq("condominio_id", Number(condominioId))
          .eq("activo", true)
          .maybeSingle(),
      ]);

      if (perfilResultado.error) {
        await supabase.auth.signOut();
        mostrarError(
          "No fue posible validar el perfil: " + perfilResultado.error.message
        );
        return;
      }

      const perfil = (perfilResultado.data || {}) as PerfilDirectiva;
      const vinculo = (vinculoResultado.data || null) as VinculoDirectiva | null;

      if (perfil.active === false) {
        await supabase.auth.signOut();
        mostrarError("Este usuario está inactivo.");
        return;
      }

      if (vinculoResultado.error || !vinculo || vinculo.activo === false) {
        await supabase.auth.signOut();
        mostrarError(
          "Este usuario no está autorizado para el condominio seleccionado."
        );
        return;
      }

      const rol =
        vinculo.rol_condominio ||
        perfil.role ||
        authData.user.user_metadata?.role ||
        authData.user.app_metadata?.role ||
        "Usuario";

      if (!rolDirectivaPermitido(rol)) {
        await supabase.auth.signOut();
        mostrarError(
          "Este usuario no tiene permiso para entrar al módulo móvil de directiva."
        );
        return;
      }

      const nombreUsuario =
        authData.user.user_metadata?.full_name ||
        authData.user.user_metadata?.name ||
        authData.user.email ||
        "Miembro de la directiva";

      const sesionDirectiva = {
        tipo_usuario: "DIRECTIVA",
        usuario_id: uid,
        usuario_nombre: nombreUsuario,
        nombre: nombreUsuario,
        correo: authData.user.email || correoDirectiva.trim().toLowerCase(),
        rol,
        condominio_id: Number(condominioId),
        condominio_nombre:
          condominioSeleccionado?.nombre || "Condominio seleccionado",
        condominio_logo_url: condominioSeleccionado?.logo_url || "",
      };

      limpiarSesionesLocales();

      localStorage.setItem("directiva_actual", JSON.stringify(sesionDirectiva));
      localStorage.setItem("condominio_id", String(condominioId));
      localStorage.setItem(
        "condominio_nombre",
        sesionDirectiva.condominio_nombre
      );
      localStorage.setItem(
        "condominio_logo_url",
        sesionDirectiva.condominio_logo_url
      );
      localStorage.setItem("usuario_admin_id", uid);
      localStorage.setItem("usuario_nombre", nombreUsuario);
      localStorage.setItem("usuario_rol", String(rol));

      router.replace("/movil/directiva");
    } catch (error: unknown) {
      await supabase.auth.signOut();
      mostrarError(
        error instanceof Error
          ? error.message
          : "No fue posible iniciar la sesión de la directiva."
      );
    } finally {
      setLoading(false);
    }
  }

  function debeMostrarAnuncio(
    anuncio: AnuncioInicio,
    configuracion: ConfiguracionAnuncio,
    propietarioId: number
  ) {
    if (!configuracion.mostrar_al_inicio) return false;

    const idCondominio = Number(anuncio.condominio_id);
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

  async function cargarAnunciosIniciales(
    propietarioId: number,
    idCondominio: number
  ) {
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
      .eq("condominio_id", idCondominio)
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

  function avanzarAnuncio(confirmado: boolean) {
    if (!anuncioActual || !propietarioAutenticadoId || !configuracionActual) {
      router.replace("/movil/propietarios/dashboard");
      return;
    }

    const idCondominio = Number(anuncioActual.condominio_id);

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

  const claseMensaje =
    tipoMensaje === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tipoMensaje === "exito"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <>
      <main className="min-h-dvh bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-3 py-4 sm:px-5">
        <div className="mx-auto flex min-h-[calc(100dvh-32px)] w-full max-w-md items-center justify-center">
          <section className="w-full overflow-hidden rounded-[1.8rem] bg-white shadow-2xl shadow-black/30">
            <header className="bg-gradient-to-r from-blue-800 via-blue-900 to-slate-950 px-5 py-5 text-white">
              <div className="flex items-center gap-3">
                {condominioSeleccionado?.logo_url ? (
                  <img
                    src={condominioSeleccionado.logo_url}
                    alt={condominioSeleccionado.nombre}
                    className="h-13 w-13 rounded-2xl bg-white object-contain p-1.5"
                  />
                ) : (
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-white text-lg font-black text-blue-950 shadow-lg">
                    VAM
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-xl font-black tracking-tight">VAM Móvil</p>
                  <p className="mt-0.5 text-xs text-blue-100">
                    Acceso seguro al condominio
                  </p>
                </div>

                <div className="ml-auto rounded-full bg-white/10 p-2.5">
                  <ShieldCheck className="h-5 w-5 text-blue-100" />
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
                <button
                  type="button"
                  onClick={() => void cambiarPortal("propietario")}
                  disabled={loading}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${
                    modoPortal === "propietario"
                      ? "bg-white text-blue-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <UserRound className="h-4 w-4" />
                  Propietario
                </button>

                <button
                  type="button"
                  onClick={() => void cambiarPortal("directiva")}
                  disabled={loading}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${
                    modoPortal === "directiva"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <UsersRound className="h-4 w-4" />
                  Directiva
                </button>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Condominio
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={condominioId}
                    onChange={(event) =>
                      void seleccionarCondominio(event.target.value)
                    }
                    disabled={cargandoCondominios || loading}
                    className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      {cargandoCondominios
                        ? "Cargando condominios..."
                        : "Seleccione el condominio"}
                    </option>
                    {condominios.map((condominio) => (
                      <option key={condominio.id} value={condominio.id}>
                        {condominio.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {modoPortal === "propietario" ? (
                <div className="mt-4">
                  {vistaPropietario === "entrar" ? (
                    <form onSubmit={entrarPropietario} className="space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h1 className="text-xl font-black tracking-tight text-slate-900">
                              Iniciar sesión
                            </h1>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Use su cédula y la contraseña creada al activar la
                              cuenta.
                            </p>
                          </div>
                          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                            <KeyRound className="h-5 w-5" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Cédula
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="username"
                          value={cedula}
                          onChange={(event) =>
                            setCedula(formatearCedula(event.target.value))
                          }
                          placeholder="000-0000000-0"
                          disabled={loading}
                          className="h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={mostrarClavePropietario ? "text" : "password"}
                            autoComplete="current-password"
                            value={clavePropietario}
                            onChange={(event) =>
                              setClavePropietario(event.target.value)
                            }
                            placeholder="Digite su contraseña"
                            disabled={loading}
                            className="h-12 w-full rounded-xl border border-slate-200 px-3.5 pr-12 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setMostrarClavePropietario((actual) => !actual)
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Mostrar u ocultar contraseña"
                          >
                            {mostrarClavePropietario ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {mensaje && (
                        <div
                          role="alert"
                          className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${claseMensaje}`}
                        >
                          {mensaje}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 text-sm font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        {loading ? "Validando acceso..." : "Entrar a mi cuenta"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void cambiarVistaPropietario("activar")
                        }
                        disabled={loading}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-800 transition hover:bg-blue-100 disabled:opacity-60"
                      >
                        <UserPlus className="h-4 w-4" />
                        Activar mi cuenta por primera vez
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={activarCuenta} className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h1 className="text-xl font-black tracking-tight text-slate-900">
                            Activar mi cuenta
                          </h1>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Registre su cédula y cree la contraseña que utilizará
                            para entrar.
                          </p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                          <Sparkles className="h-5 w-5" />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Apartamento / Unidad
                        </label>
                        <select
                          value={unidadId}
                          onChange={(event) => setUnidadId(event.target.value)}
                          disabled={
                            !condominioId || cargandoUnidades || loading
                          }
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                        >
                          <option value="">
                            {cargandoUnidades
                              ? "Cargando unidades..."
                              : !condominioId
                                ? "Seleccione primero el condominio"
                                : "Seleccione su unidad"}
                          </option>
                          {unidades.map((unidad) => (
                            <option key={unidad.id} value={unidad.id}>
                              {unidad.codigo}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Código de activación
                        </label>
                        <input
                          type="text"
                          autoCapitalize="characters"
                          autoComplete="one-time-code"
                          value={codigoActivacion}
                          onChange={(event) =>
                            setCodigoActivacion(
                              event.target.value
                                .replace(/\s/g, "")
                                .toUpperCase()
                                .slice(0, 12)
                            )
                          }
                          placeholder="Código entregado por VAM"
                          disabled={loading}
                          className="h-12 w-full rounded-xl border border-slate-200 px-3.5 text-center text-sm font-black uppercase tracking-[0.18em] text-slate-800 outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Cédula del propietario
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="username"
                          value={cedula}
                          onChange={(event) =>
                            setCedula(formatearCedula(event.target.value))
                          }
                          placeholder="000-0000000-0"
                          disabled={loading}
                          className="h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Crear contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={mostrarClavePropietario ? "text" : "password"}
                            autoComplete="new-password"
                            value={clavePropietario}
                            onChange={(event) =>
                              setClavePropietario(event.target.value)
                            }
                            placeholder="Mínimo 6 caracteres"
                            disabled={loading}
                            className="h-12 w-full rounded-xl border border-slate-200 px-3.5 pr-12 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setMostrarClavePropietario((actual) => !actual)
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Mostrar u ocultar contraseña"
                          >
                            {mostrarClavePropietario ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Confirmar contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={mostrarConfirmacion ? "text" : "password"}
                            autoComplete="new-password"
                            value={confirmarClave}
                            onChange={(event) =>
                              setConfirmarClave(event.target.value)
                            }
                            placeholder="Repita su contraseña"
                            disabled={loading}
                            className="h-12 w-full rounded-xl border border-slate-200 px-3.5 pr-12 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setMostrarConfirmacion((actual) => !actual)
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Mostrar u ocultar confirmación"
                          >
                            {mostrarConfirmacion ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-[11px] leading-5 text-blue-800">
                        Al completar la activación, la cédula quedará guardada en
                        el perfil del propietario y será su usuario de acceso.
                      </div>

                      {mensaje && (
                        <div
                          role="alert"
                          className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${claseMensaje}`}
                        >
                          {mensaje}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {loading ? "Activando cuenta..." : "Activar mi cuenta"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void cambiarVistaPropietario("entrar")}
                        disabled={loading}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a iniciar sesión
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <form onSubmit={entrarDirectiva} className="mt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-slate-900">
                        Acceso de directiva
                      </h1>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Acceso exclusivo para usuarios autorizados del
                        condominio seleccionado.
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                      <UsersRound className="h-5 w-5" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      autoComplete="email"
                      value={correoDirectiva}
                      onChange={(event) =>
                        setCorreoDirectiva(event.target.value)
                      }
                      placeholder="usuario@correo.com"
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarClaveDirectiva ? "text" : "password"}
                        autoComplete="current-password"
                        value={claveDirectiva}
                        onChange={(event) =>
                          setClaveDirectiva(event.target.value)
                        }
                        placeholder="Digite su contraseña"
                        disabled={loading}
                        className="h-12 w-full rounded-xl border border-slate-200 px-3.5 pr-12 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setMostrarClaveDirectiva((actual) => !actual)
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Mostrar u ocultar contraseña"
                      >
                        {mostrarClaveDirectiva ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-600">
                    El sistema validará el usuario, su estado y su autorización
                    para el condominio seleccionado.
                  </div>

                  {mensaje && (
                    <div
                      role="alert"
                      className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${claseMensaje}`}
                    >
                      {mensaje}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    {loading ? "Validando usuario..." : "Entrar como directiva"}
                  </button>
                </form>
              )}

              <div className="mt-4 border-t border-slate-100 pt-3 text-center">
                <p className="text-[10px] font-semibold text-slate-400">
                  VAM Administración de Condominios
                </p>
              </div>
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
                <span>{condominioSeleccionado?.nombre || "Condominio"}</span>
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
