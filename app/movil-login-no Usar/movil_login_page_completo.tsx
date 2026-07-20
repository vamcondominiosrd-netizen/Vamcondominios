"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserRound,
  UsersRound,
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

type ModoLogin = "propietario" | "directiva";

type PerfilDirectiva = {
  role?: string | null;
  active?: boolean | null;
};

const ROLES_PERMITIDOS = [
  "presidente",
  "tesorero",
  "tesoreria",
  "tesorería",
  "secretario",
  "secretaria",
  "vocal",
  "miembro directiva",
  "miembro de directiva",
  "administrador",
  "administrador condominio",
  "administrador general",
  "super administrador",
  "superadmin",
];

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function rolAutorizado(rol: unknown) {
  const rolNormalizado = normalizarTexto(rol);

  return ROLES_PERMITIDOS.some((permitido) => {
    const permitidoNormalizado = normalizarTexto(permitido);
    return (
      rolNormalizado === permitidoNormalizado ||
      rolNormalizado.includes(permitidoNormalizado)
    );
  });
}

export default function MovilLoginPage() {
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
  const [tipoMensaje, setTipoMensaje] = useState<"error" | "info">("info");
  const [loading, setLoading] = useState(false);
  const [cargandoCondominios, setCargandoCondominios] = useState(true);
  const [cargandoUnidades, setCargandoUnidades] = useState(false);

  useEffect(() => {
    void cargarCondominios();
  }, []);

  const condominioSeleccionado = useMemo(
    () =>
      condominios.find((condominio) => String(condominio.id) === condominioId) ||
      null,
    [condominios, condominioId]
  );

  async function cargarCondominios() {
    setCargandoCondominios(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre, logo_url")
      .order("nombre", { ascending: true });

    setCargandoCondominios(false);

    if (error) {
      mostrarError("No se pudieron cargar los condominios: " + error.message);
      return;
    }

    setCondominios((data || []) as Condominio[]);
  }

  async function seleccionarCondominio(id: string) {
    setCondominioId(id);
    setUnidadId("");
    setUnidades([]);
    setMensaje("");

    if (!id || modo !== "propietario") return;

    setCargandoUnidades(true);

    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    setCargandoUnidades(false);

    if (error) {
      mostrarError("No se pudieron cargar los apartamentos: " + error.message);
      return;
    }

    setUnidades((data || []) as Unidad[]);
  }

  async function cargarUnidadesPropietario() {
    if (!condominioId) {
      setUnidades([]);
      return;
    }

    setCargandoUnidades(true);

    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(condominioId))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    setCargandoUnidades(false);

    if (error) {
      mostrarError("No se pudieron cargar los apartamentos: " + error.message);
      return;
    }

    setUnidades((data || []) as Unidad[]);
  }

  function mostrarError(texto: string) {
    setTipoMensaje("error");
    setMensaje(texto);
  }

  function mostrarInfo(texto: string) {
    setTipoMensaje("info");
    setMensaje(texto);
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

  async function entrarPropietario() {
    if (!condominioId || !unidadId || !cedula.trim()) {
      mostrarError("Debe completar condominio, apartamento y cédula.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const unidadCodigo =
        unidades.find((unidad) => String(unidad.id) === unidadId)?.codigo || "";

      if (!unidadCodigo) {
        mostrarError("No se pudo identificar el apartamento seleccionado.");
        return;
      }

      const cedulaLimpia = cedula.replace(/\D/g, "");

      if (!cedulaLimpia) {
        mostrarError("Debe indicar una cédula válida.");
        return;
      }

      const { data: propietarios, error } = await supabase
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
        mostrarError(error.message);
        return;
      }

      const propietario = (propietarios || []).find((registro: any) => {
        const cedulaDB = String(registro.cedula || "").replace(/\D/g, "");
        return cedulaDB === cedulaLimpia;
      });

      if (!propietario) {
        mostrarError(
          "La cédula no coincide con el apartamento seleccionado."
        );
        return;
      }

      /*
       * Evita que quede activa una sesión administrativa de Supabase
       * mientras se utiliza el portal de propietarios.
       */
      await supabase.auth.signOut();
      limpiarSesionesLocales();

      localStorage.setItem(
        "propietario_actual",
        JSON.stringify({
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
        })
      );

      router.replace("/movil/propietarios/dashboard");
    } catch (error: any) {
      mostrarError(
        error?.message || "No se pudo completar el acceso del propietario."
      );
    } finally {
      setLoading(false);
    }
  }

  async function entrarDirectiva() {
    if (!condominioId) {
      mostrarError("Debe seleccionar un condominio.");
      return;
    }

    if (!usuario.trim() || !clave) {
      mostrarError("Debe indicar usuario y clave.");
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
        mostrarError("Usuario o clave incorrecta.");
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
        mostrarError("Error validando el perfil: " + perfilError.message);
        return;
      }

      const perfil = (perfilData || {}) as PerfilDirectiva;

      if (perfil.active === false) {
        await supabase.auth.signOut();
        mostrarError("Este usuario está inactivo.");
        return;
      }

      const rol =
        perfil.role ||
        data.user.user_metadata?.role ||
        data.user.app_metadata?.role ||
        "Usuario";

      if (!rolAutorizado(rol)) {
        await supabase.auth.signOut();
        mostrarError(
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

      /*
       * Sesión principal del portal de directiva.
       */
      localStorage.setItem(
        "directiva_actual",
        JSON.stringify(sesionDirectiva)
      );

      /*
       * Claves de compatibilidad con módulos administrativos existentes.
       */
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
      mostrarError(
        error?.message || "No se pudo completar el acceso de la directiva."
      );
    } finally {
      setLoading(false);
    }
  }

  async function cambiarModo(nuevoModo: ModoLogin) {
    if (loading) return;

    setModo(nuevoModo);
    setMensaje("");
    setCedula("");
    setUsuario("");
    setClave("");
    setMostrarClave(false);
    setUnidadId("");
    setUnidades([]);

    if (nuevoModo === "propietario" && condominioId) {
      await cargarUnidadesPropietario();
    }
  }

  function manejarEnter(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== "Enter" || loading) return;

    if (modo === "propietario") {
      void entrarPropietario();
    } else {
      void entrarDirectiva();
    }
  }

  return (
    <main className="flex min-h-dvh items-center bg-slate-100 px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-blue-950 shadow-lg">
              VAM
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight">VAM Móvil</h1>
              <p className="mt-1 text-sm leading-5 text-blue-100">
                Acceso seguro para propietarios y miembros autorizados de la
                directiva.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => void cambiarModo("propietario")}
            disabled={loading}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition ${
              modo === "propietario"
                ? "bg-blue-700 text-white shadow"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <UserRound size={18} />
            Propietario
          </button>

          <button
            type="button"
            onClick={() => void cambiarModo("directiva")}
            disabled={loading}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition ${
              modo === "directiva"
                ? "bg-slate-950 text-white shadow"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <UsersRound size={18} />
            Directiva
          </button>
        </section>

        <section className="space-y-4 rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Building2 size={17} className="text-blue-700" />
              Condominio
            </label>

            <select
              value={condominioId}
              onChange={(evento) =>
                void seleccionarCondominio(evento.target.value)
              }
              disabled={cargandoCondominios || loading}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                {cargandoCondominios
                  ? "Cargando condominios..."
                  : "Seleccione condominio"}
              </option>

              {condominios.map((condominio) => (
                <option key={condominio.id} value={condominio.id}>
                  {condominio.nombre}
                </option>
              ))}
            </select>
          </div>

          {modo === "propietario" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  Apartamento
                </label>

                <select
                  value={unidadId}
                  onChange={(evento) => setUnidadId(evento.target.value)}
                  disabled={!condominioId || cargandoUnidades || loading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {cargandoUnidades
                      ? "Cargando apartamentos..."
                      : "Seleccione apartamento"}
                  </option>

                  {unidades.map((unidad) => (
                    <option key={unidad.id} value={unidad.id}>
                      {unidad.codigo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  Cédula del propietario
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  value={cedula}
                  onChange={(evento) => setCedula(evento.target.value)}
                  onKeyDown={manejarEnter}
                  placeholder="000-0000000-0"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              <button
                type="button"
                onClick={() => void entrarPropietario()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-3.5 font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={19} className="animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <UserRound size={19} />
                    Entrar como propietario
                  </>
                )}
              </button>
            </>
          )}

          {modo === "directiva" && (
            <>
              <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-5 text-blue-900">
                <ShieldCheck size={21} className="mt-0.5 shrink-0" />
                <p>
                  Acceso para presidente, tesorero, secretario, vocal y
                  administradores autorizados.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  Correo electrónico
                </label>

                <input
                  type="email"
                  autoComplete="email"
                  value={usuario}
                  onChange={(evento) => setUsuario(evento.target.value)}
                  onKeyDown={manejarEnter}
                  placeholder="usuario@correo.com"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  Clave
                </label>

                <div className="relative">
                  <KeyRound
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={mostrarClave ? "text" : "password"}
                    autoComplete="current-password"
                    value={clave}
                    onChange={(evento) => setClave(evento.target.value)}
                    onKeyDown={manejarEnter}
                    placeholder="Digite su clave"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-12 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarClave((actual) => !actual)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    aria-label={
                      mostrarClave ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {mostrarClave ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void entrarDirectiva()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={19} className="animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={19} />
                    Entrar como directiva
                  </>
                )}
              </button>
            </>
          )}

          {mensaje && (
            <div
              className={`rounded-xl border p-3 text-sm font-semibold leading-5 ${
                tipoMensaje === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {mensaje}
            </div>
          )}
        </section>

        <p className="text-center text-xs font-medium text-slate-400">
          VAM Administración de Condominios
        </p>
      </div>
    </main>
  );
}
