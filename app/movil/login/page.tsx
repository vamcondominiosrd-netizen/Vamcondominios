"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  UserRound,
  UsersRound,
  HardHat,
} from "lucide-react";

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

type PerfilDirectiva = {
  role: string | null;
  active: boolean | null;
};

type UsuarioTecnico = {
  id: number;
  user_id: string;
  condominio_id: number;
  nombre: string | null;
  rol: string | null;
  estado: string | null;
};

type ModoLogin = "propietario" | "directiva" | "tecnico";

const ROLES_DIRECTIVA_PERMITIDOS = [
  "ADMIN",
  "USER_VIEW",
];

function limpiarCedula(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function rolPermitido(rol: unknown) {
  const rolNormalizado = normalizarTexto(rol);

  return ROLES_DIRECTIVA_PERMITIDOS.some((permitido) => {
    const permitidoNormalizado = normalizarTexto(permitido);

    return (
      rolNormalizado === permitidoNormalizado ||
      rolNormalizado.includes(permitidoNormalizado)
    );
  });
}

export default function LoginMovilPage() {
  const router = useRouter();

  const [modo, setModo] = useState<ModoLogin>("propietario");

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [cedula, setCedula] = useState("");

  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoCondominios, setCargandoCondominios] = useState(true);
  const [cargandoUnidades, setCargandoUnidades] = useState(false);

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
      .order("codigo");

    setCargandoUnidades(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setUnidades((data || []) as Unidad[]);
  }

  async function seleccionarCondominio(id: string) {
    setCondominioId(id);
    setUnidadId("");
    setUnidades([]);
    setMensaje("");

    if (modo === "propietario" && id) {
      await cargarUnidades(id);
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

  async function entrarPropietario(event?: FormEvent<HTMLFormElement>) {
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

      if (!unidadCodigo) {
        setMensaje("No se pudo identificar la unidad seleccionada.");
        return;
      }

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

      await supabase.auth.signOut();
      limpiarSesionesLocales();

      const sesionPropietario = {
        tipo_usuario: "PROPIETARIO",
        propietario_id: propietario.id,
        condominio_id: Number(condominioId),
        condominio_nombre:
          condominioSeleccionado?.nombre || "Condominio",
        condominio_logo_url: condominioSeleccionado?.logo_url || "",
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
      localStorage.setItem(
        "condominio_nombre",
        condominioSeleccionado?.nombre || "Condominio"
      );
      localStorage.setItem(
        "condominio_logo_url",
        condominioSeleccionado?.logo_url || ""
      );

      router.replace("/movil/propietarios/dashboard");
    } catch (error: any) {
      setMensaje(
        error?.message || "No se pudo completar el acceso del propietario."
      );
    } finally {
      setLoading(false);
    }
  }

  async function entrarDirectiva(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!condominioId) {
      setMensaje("Debe seleccionar un condominio.");
      return;
    }

    if (!usuario.trim() || !clave) {
      setMensaje("Debe indicar correo y clave.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: usuario.trim().toLowerCase(),
        password: clave,
      });

      if (error || !data.user) {
        setMensaje("Usuario o clave incorrecta.");
        return;
      }

      const uid = data.user.id;

      const { data: perfilData, error: perfilError } = await supabase
        .from("profiles")
        .select("role, active")
        .eq("id", uid)
        .maybeSingle();

      if (perfilError) {
        await supabase.auth.signOut();
        setMensaje("Error validando el perfil: " + perfilError.message);
        return;
      }

      const perfil = (perfilData || {}) as PerfilDirectiva;

      if (perfil.active === false) {
        await supabase.auth.signOut();
        setMensaje("Este usuario está inactivo.");
        return;
      }

      const rol =
        perfil.role ||
        data.user.user_metadata?.role ||
        data.user.app_metadata?.role ||
        "Usuario";

      if (!rolPermitido(rol)) {
        await supabase.auth.signOut();
        setMensaje(
          "Este usuario no tiene permiso para entrar al módulo móvil de directiva."
        );
        return;
      }

      const nombreUsuario =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.email ||
        "Miembro de la directiva";

      const sesionDirectiva = {
        tipo_usuario: "DIRECTIVA",
        usuario_id: uid,
        usuario_nombre: nombreUsuario,
        nombre: nombreUsuario,
        correo: data.user.email || usuario.trim().toLowerCase(),
        rol,
        condominio_id: Number(condominioId),
        condominio_nombre:
          condominioSeleccionado?.nombre || "Condominio",
        condominio_logo_url: condominioSeleccionado?.logo_url || "",
      };

      limpiarSesionesLocales();

      localStorage.setItem(
        "directiva_actual",
        JSON.stringify(sesionDirectiva)
      );

      localStorage.setItem("condominio_id", String(condominioId));
      localStorage.setItem(
        "condominio_nombre",
        condominioSeleccionado?.nombre || "Condominio"
      );
      localStorage.setItem(
        "condominio_logo_url",
        condominioSeleccionado?.logo_url || ""
      );
      localStorage.setItem("usuario_admin_id", uid);
      localStorage.setItem("usuario_nombre", nombreUsuario);
      localStorage.setItem("usuario_rol", String(rol));

      router.replace("/movil/directiva");
    } catch (error: any) {
      await supabase.auth.signOut();
      setMensaje(
        error?.message || "No se pudo completar el acceso de la directiva."
      );
    } finally {
      setLoading(false);
    }
  }


  async function entrarTecnico(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!condominioId) {
      setMensaje("Debe seleccionar un condominio.");
      return;
    }

    if (!usuario.trim() || !clave) {
      setMensaje("Debe indicar correo y clave.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: usuario.trim().toLowerCase(),
          password: clave,
        });

      if (authError || !authData.user) {
        setMensaje("Usuario o clave incorrecta.");
        return;
      }

      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios_admin")
        .select("id, user_id, condominio_id, nombre, rol, estado")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (usuarioError || !usuarioData) {
        await supabase.auth.signOut();
        setMensaje("Este usuario no está registrado como técnico.");
        return;
      }

      const tecnico = usuarioData as UsuarioTecnico;
      const rolTecnico = normalizarTexto(tecnico.rol);
      const estadoTecnico = normalizarTexto(tecnico.estado);

      if (estadoTecnico !== "activo") {
        await supabase.auth.signOut();
        setMensaje("Este usuario técnico está inactivo.");
        return;
      }

      if (rolTecnico !== "tecnico") {
        await supabase.auth.signOut();
        setMensaje("Este acceso es exclusivamente para técnicos VAM.");
        return;
      }

      if (Number(tecnico.condominio_id) !== Number(condominioId)) {
        await supabase.auth.signOut();
        setMensaje("El técnico no está asignado al condominio seleccionado.");
        return;
      }

      const nombreUsuario =
        tecnico.nombre ||
        authData.user.user_metadata?.full_name ||
        authData.user.email ||
        "Técnico VAM";

      limpiarSesionesLocales();

      localStorage.setItem("usuario_admin_id", String(tecnico.id));
      localStorage.setItem("usuario_nombre", nombreUsuario);
      localStorage.setItem("usuario_rol", "tecnico");
      localStorage.setItem("condominio_id", String(tecnico.condominio_id));
      localStorage.setItem(
        "condominio_nombre",
        condominioSeleccionado?.nombre || "Condominio asignado"
      );
      localStorage.setItem(
        "condominio_logo_url",
        condominioSeleccionado?.logo_url || ""
      );

      router.replace("/movil/tecnico");
    } catch (error: any) {
      await supabase.auth.signOut();
      setMensaje(
        error?.message || "No se pudo completar el acceso técnico."
      );
    } finally {
      setLoading(false);
    }
  }

  async function cambiarModo(nuevoModo: ModoLogin) {
    if (loading) return;

    setModo(nuevoModo);
    setMensaje("");
    setUnidadId("");
    setUnidades([]);
    setCedula("");
    setUsuario("");
    setClave("");
    setMostrarClave(false);

    if (nuevoModo === "propietario" && condominioId) {
      await cargarUnidades(condominioId);
    }
  }

  const tituloPortal =
    modo === "propietario"
      ? "VAM Propietarios"
      : modo === "directiva"
        ? "VAM Directiva"
        : "VAM Técnico";

  const descripcionPortal =
    modo === "propietario"
      ? "Acceso móvil al condominio"
      : modo === "directiva"
        ? "Información gerencial del condominio"
        : "Operaciones y trabajos técnicos";

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 px-3 py-3 sm:px-4 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100dvh-24px)] w-full max-w-sm items-center justify-center">
        <section className="w-full overflow-hidden rounded-[1.6rem] bg-white shadow-2xl shadow-black/30">
          <div className="bg-gradient-to-r from-blue-800 to-blue-950 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              {condominioSeleccionado?.logo_url ? (
                <img
                  src={condominioSeleccionado.logo_url}
                  alt={
                    condominioSeleccionado.nombre || "Logo del condominio"
                  }
                  className="h-12 w-12 rounded-xl bg-white object-contain p-1.5"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-base font-black text-blue-900">
                  VAM
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-base font-extrabold">
                  {tituloPortal}
                </p>
                <p className="text-xs text-blue-100">
                  {descripcionPortal}
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-5">
            <div className="mb-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => void cambiarModo("propietario")}
                disabled={loading}
                className={`flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-extrabold transition ${
                  modo === "propietario"
                    ? "bg-blue-800 text-white shadow-sm"
                    : "text-slate-600"
                }`}
              >
                <UserRound size={16} />
                Propietario
              </button>

              <button
                type="button"
                onClick={() => void cambiarModo("directiva")}
                disabled={loading}
                className={`flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-extrabold transition ${
                  modo === "directiva"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600"
                }`}
              >
                <UsersRound size={16} />
                Directiva
              </button>

              <button
                type="button"
                onClick={() => void cambiarModo("tecnico")}
                disabled={loading}
                className={`flex h-10 items-center justify-center gap-1 rounded-lg text-[11px] font-extrabold transition ${
                  modo === "tecnico"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-600"
                }`}
              >
                <HardHat size={15} />
                Técnico
              </button>
            </div>

            <div className="mb-4">
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                Iniciar sesión
              </h1>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {modo === "propietario"
                  ? "Seleccione su condominio, unidad y escriba su cédula."
                  : modo === "directiva"
                    ? "Seleccione el condominio e ingrese su correo y clave."
                    : "Seleccione su condominio e ingrese sus credenciales técnicas."}
              </p>
            </div>

            <form
              onSubmit={
                modo === "propietario"
                  ? entrarPropietario
                  : modo === "directiva"
                    ? entrarDirectiva
                    : entrarTecnico
              }
              className="space-y-3"
            >
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

              {modo === "propietario" ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="flex gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-[11px] leading-4 text-blue-900">
                    <ShieldCheck size={18} className="shrink-0" />
                    {modo === "directiva"
                      ? "Acceso para miembros autorizados de la directiva y administración."
                      : "Acceso para técnicos asignados al condominio seleccionado."}
                  </div>

                  <div>
                    <label
                      htmlFor="usuario"
                      className="mb-1 block text-xs font-bold text-slate-700"
                    >
                      Correo electrónico
                    </label>
                    <input
                      id="usuario"
                      type="email"
                      autoComplete="email"
                      value={usuario}
                      onChange={(event) => setUsuario(event.target.value)}
                      placeholder="usuario@correo.com"
                      disabled={loading}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="clave"
                      className="mb-1 block text-xs font-bold text-slate-700"
                    >
                      Clave
                    </label>

                    <div className="relative">
                      <KeyRound
                        size={17}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="clave"
                        type={mostrarClave ? "text" : "password"}
                        autoComplete="current-password"
                        value={clave}
                        onChange={(event) => setClave(event.target.value)}
                        placeholder="Digite su clave"
                        disabled={loading}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                      />

                      <button
                        type="button"
                        onClick={() => setMostrarClave((actual) => !actual)}
                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                        aria-label={
                          mostrarClave
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                      >
                        {mostrarClave ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

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
                className={`mt-1 flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  modo === "propietario"
                    ? "bg-blue-800 hover:bg-blue-900"
                    : modo === "directiva"
                      ? "bg-slate-950 hover:bg-black"
                      : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {loading
                  ? "Validando..."
                  : modo === "propietario"
                    ? "Entrar como propietario"
                    : modo === "directiva"
                      ? "Entrar como directiva"
                      : "Entrar como técnico"}
              </button>
            </form>

            <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-[11px] leading-4 text-slate-500">
              {modo === "propietario"
                ? "Consulta estado de cuenta, pagos, recibos e incidencias."
                : modo === "directiva"
                  ? "Consulta morosidad, ingresos, gastos, cierres y caja chica."
                  : "Gestiona gas, incidencias, evidencias, trabajos y visitas técnicas."}
            </div>

            <p className="mt-3 text-center text-[10px] text-slate-400">
              VAM Administración de Condominios
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
