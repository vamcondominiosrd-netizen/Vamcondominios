"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type CondominioAsignado = {
  id: number;
  nombre: string;
  logo_url: string | null;
};

type DatosSesion = {
  uid: string;
  empresaActualId: number;
  empresaNombreActual: string;
  usuarioNombreActual: string;
  rolGlobalActual: string;
  condominio: CondominioAsignado;
  permisos: string[];
};

const CLAVES_SESION = [
  "user_id",
  "empresa_id",
  "empresa_nombre",
  "condominio_id",
  "condominio_nombre",
  "condominio_logo_url",
  "usuario_rol",
  "usuario_nombre",
  "permisos_usuario",
];

export default function LoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"error" | "info">("info");
  const [loading, setLoading] = useState(false);

  const [userId, setUserId] = useState("");
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [empresaLogoUrl, setEmpresaLogoUrl] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [rolGlobal, setRolGlobal] = useState("");

  const [condominios, setCondominios] = useState<CondominioAsignado[]>([]);
  const [condominioId, setCondominioId] = useState("");

  const seleccionandoCondominio = condominios.length > 0;

  function mostrarError(texto: string) {
    setTipoMensaje("error");
    setMensaje(texto);
  }

  function mostrarInfo(texto: string) {
    setTipoMensaje("info");
    setMensaje(texto);
  }

  function limpiarSesionLocal() {
    CLAVES_SESION.forEach((claveSesion) => {
      localStorage.removeItem(claveSesion);
    });
  }

  async function iniciarSesion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const correoLimpio = usuario.trim();

    if (!correoLimpio || !clave) {
      mostrarError("Debe indicar usuario y clave.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: correoLimpio,
        password: clave,
      });

      if (error || !data.user) {
        mostrarError("Usuario o clave incorrecta.");
        return;
      }

      limpiarSesionLocal();

      const uid = data.user.id;
      setUserId(uid);

      const { data: empresaData, error: empresaError } = await supabase
        .from("usuarios_empresas")
        .select(`
          id,
          user_id,
          empresa_id,
          nombre_usuario,
          correo,
          rol_global,
          activo,
          empresas (
            id,
            nombre,
            logo_url
          )
        `)
        .eq("user_id", uid)
        .eq("activo", true)
        .maybeSingle();

      if (empresaError || !empresaData) {
        await supabase.auth.signOut();
        mostrarError(
          "Este usuario no tiene empresa asignada en VAM Enterprise."
        );
        return;
      }

      const empresaRelacion: any = Array.isArray(
        (empresaData as any).empresas
      )
        ? (empresaData as any).empresas[0]
        : (empresaData as any).empresas;

      const empresaActualId = Number((empresaData as any).empresa_id);
      const empresaNombreActual = empresaRelacion?.nombre || "";
      const empresaLogoActual = empresaRelacion?.logo_url || "";
      const usuarioNombreActual =
        (empresaData as any).nombre_usuario || correoLimpio;
      const rolGlobalActual = (empresaData as any).rol_global || "";

      setEmpresaId(empresaActualId);
      setEmpresaNombre(empresaNombreActual);
      setEmpresaLogoUrl(empresaLogoActual);
      setUsuarioNombre(usuarioNombreActual);
      setRolGlobal(rolGlobalActual);

      const { data: condominiosData, error: condominiosError } =
        await supabase
          .from("usuarios_condominios")
          .select(`
            condominio_id,
            rol_condominio,
            condominios (
              id,
              nombre,
              logo_url,
              sucursal_id
            )
          `)
          .eq("user_id", uid)
          .eq("empresa_id", empresaActualId)
          .eq("activo", true);

      if (condominiosError) {
        await supabase.auth.signOut();
        mostrarError("Error cargando los condominios asignados.");
        return;
      }

      const lista: CondominioAsignado[] = (condominiosData || [])
        .map((item: any) => {
          const condominioRelacion = Array.isArray(item.condominios)
            ? item.condominios[0]
            : item.condominios;

          return {
            id: Number(condominioRelacion?.id),
            nombre: condominioRelacion?.nombre || "",
            logo_url: condominioRelacion?.logo_url || null,
          };
        })
        .filter((condominio) => condominio.id && condominio.nombre);

      if (lista.length === 0) {
        await supabase.auth.signOut();
        mostrarError("Este usuario no tiene condominios asignados.");
        return;
      }

      const permisos = await cargarPermisosUsuario(uid, empresaActualId);

      if (lista.length === 1) {
        guardarSesion({
          uid,
          empresaActualId,
          empresaNombreActual,
          usuarioNombreActual,
          rolGlobalActual,
          condominio: lista[0],
          permisos,
        });

        router.replace("/dashboard");
        router.refresh();
        return;
      }

      localStorage.setItem(
        "permisos_usuario",
        JSON.stringify(permisos || [])
      );

      setCondominios(lista);
      setCondominioId("");
      mostrarInfo("Seleccione el condominio con el que desea trabajar.");
    } catch (error) {
      console.error("Error en el inicio de sesión:", error);
      mostrarError("No fue posible completar el inicio de sesión.");
    } finally {
      setLoading(false);
    }
  }

  async function cargarPermisosUsuario(
    uid: string,
    empresaActualId: number
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from("usuarios_roles")
      .select(`
        rol_id,
        roles (
          id,
          nombre,
          roles_permisos (
            permisos (
              codigo
            )
          )
        )
      `)
      .eq("user_id", uid)
      .eq("empresa_id", empresaActualId)
      .eq("activo", true);

    if (error) {
      console.error("Error cargando permisos:", error.message);
      return [];
    }

    const permisos: string[] = [];

    (data || []).forEach((usuarioRol: any) => {
      const rol = Array.isArray(usuarioRol.roles)
        ? usuarioRol.roles[0]
        : usuarioRol.roles;

      const rolesPermisos = rol?.roles_permisos || [];

      rolesPermisos.forEach((rolPermiso: any) => {
        const permiso = Array.isArray(rolPermiso.permisos)
          ? rolPermiso.permisos[0]
          : rolPermiso.permisos;

        if (permiso?.codigo && !permisos.includes(permiso.codigo)) {
          permisos.push(permiso.codigo);
        }
      });
    });

    return permisos;
  }

  function guardarSesion({
    uid,
    empresaActualId,
    empresaNombreActual,
    usuarioNombreActual,
    rolGlobalActual,
    condominio,
    permisos,
  }: DatosSesion) {
    localStorage.setItem("user_id", uid);
    localStorage.setItem("empresa_id", String(empresaActualId));
    localStorage.setItem("empresa_nombre", empresaNombreActual);

    localStorage.setItem("condominio_id", String(condominio.id));
    localStorage.setItem("condominio_nombre", condominio.nombre);
    localStorage.setItem(
      "condominio_logo_url",
      condominio.logo_url || ""
    );

    localStorage.setItem("usuario_rol", rolGlobalActual);
    localStorage.setItem("usuario_nombre", usuarioNombreActual);
    localStorage.setItem(
      "permisos_usuario",
      JSON.stringify(permisos || [])
    );
  }

  async function entrarConCondominio() {
    if (!condominioId) {
      mostrarError("Debe seleccionar un condominio.");
      return;
    }

    const condominio = condominios.find(
      (item) => String(item.id) === condominioId
    );

    if (!condominio || !empresaId || !userId) {
      mostrarError("No se pudo validar el condominio seleccionado.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const permisos = await cargarPermisosUsuario(userId, empresaId);

      guardarSesion({
        uid: userId,
        empresaActualId: empresaId,
        empresaNombreActual: empresaNombre,
        usuarioNombreActual: usuarioNombre,
        rolGlobalActual: rolGlobal,
        condominio,
        permisos,
      });

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error entrando al condominio:", error);
      mostrarError("No fue posible entrar al condominio seleccionado.");
    } finally {
      setLoading(false);
    }
  }

  async function volverAlLogin() {
    setLoading(true);

    try {
      await supabase.auth.signOut();
    } finally {
      limpiarSesionLocal();
      setCondominios([]);
      setCondominioId("");
      setUserId("");
      setEmpresaId(null);
      setEmpresaNombre("");
      setEmpresaLogoUrl("");
      setUsuarioNombre("");
      setRolGlobal("");
      setClave("");
      setMensaje("");
      setLoading(false);
    }
  }

  const condominioSeleccionado = condominios.find(
    (item) => String(item.id) === condominioId
  );

  const logoActual =
    condominioSeleccionado?.logo_url || empresaLogoUrl || "/logo.jpg";

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#e7eef7] p-2 sm:p-3 lg:p-4">
      <section className="mx-auto grid h-full w-full max-w-[1380px] overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_28px_80px_rgba(7,42,76,0.25)] lg:grid-cols-[1.08fr_0.92fr]">
        <aside className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#062f56_0%,#084c82_42%,#0b6aa7_72%,#1689bd_100%)] lg:flex lg:flex-col lg:justify-between lg:p-8 xl:p-10">
          <div className="absolute -left-32 -top-36 h-[390px] w-[390px] rounded-full border border-white/10 bg-white/[0.06]" />
          <div className="absolute -bottom-44 -right-32 h-[470px] w-[470px] rounded-full border border-white/10 bg-white/[0.06]" />
          <div className="absolute left-[13%] top-[30%] h-24 w-24 rotate-12 rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-md" />
          <div className="absolute bottom-[19%] right-[13%] h-16 w-16 -rotate-12 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md" />

          <div className="relative z-10 inline-flex w-fit items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white shadow-lg">
              <img
                src="/logo.jpg"
                alt="VAM Condominios"
                className="h-full w-full object-contain p-1"
              />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/60">
                Administración inteligente
              </p>
              <p className="text-base font-extrabold text-white">
                VAM Condominios
              </p>
            </div>
          </div>

          <div className="relative z-10 max-w-[590px]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/90 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_5px_rgba(110,231,183,0.13)]" />
              Plataforma multicondominio
            </div>

            <h1 className="text-[38px] font-black leading-[1.04] tracking-[-0.045em] text-white xl:text-[50px]">
              Toda la administración en una sola plataforma.
            </h1>

            <p className="mt-4 max-w-[555px] text-sm leading-6 text-white/72 xl:text-base xl:leading-7">
              Finanzas, propietarios, operaciones, seguridad y recursos
              humanos conectados para ofrecer una gestión más clara,
              eficiente y segura.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                ["01", "Control financiero"],
                ["02", "Acceso por roles"],
                ["03", "Datos por condominio"],
              ].map(([numero, texto]) => (
                <div
                  key={numero}
                  className="rounded-2xl border border-white/12 bg-white/[0.08] px-4 py-3.5 backdrop-blur-md"
                >
                  <p className="text-[10px] font-black text-white/38">
                    {numero}
                  </p>
                  <p className="mt-1.5 text-xs font-bold leading-5 text-white xl:text-sm">
                    {texto}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[10px] font-semibold text-white/42">
            <span>VAM Administración de Condominios</span>
            <span>Seguro · Ágil · Multicondominio</span>
          </div>
        </aside>

        <div className="relative flex min-h-0 items-center justify-center overflow-hidden px-4 py-4 sm:px-7 sm:py-5 lg:px-10 xl:px-14">
          <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_right,rgba(8,76,130,0.15),transparent_62%)] lg:hidden" />

          <div className="relative w-full max-w-[430px]">
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200">
                  <img
                    src="/logo.jpg"
                    alt="VAM Condominios"
                    className="h-full w-full object-contain p-1"
                  />
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Administración inteligente
                  </p>
                  <p className="text-sm font-extrabold text-slate-800">
                    VAM Condominios
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                Sistema activo
              </span>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <div
                className={`h-1.5 flex-1 rounded-full ${
                  seleccionandoCondominio ? "bg-[#9db9d1]" : "bg-[#084c82]"
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full ${
                  seleccionandoCondominio ? "bg-[#084c82]" : "bg-slate-200"
                }`}
              />
            </div>

            {!seleccionandoCondominio ? (
              <>
                <div className="mb-5">
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[#084c82]">
                    Paso 1 de 2 · Acceso seguro
                  </p>
                  <h2 className="text-[30px] font-black tracking-[-0.04em] text-slate-900 sm:text-[34px]">
                    Bienvenido de nuevo
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">
                    Ingresa tus credenciales para validar tu empresa y los
                    condominios asignados.
                  </p>
                </div>

                <form onSubmit={iniciarSesion} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="usuario"
                      className="mb-1.5 block text-[12px] font-bold text-slate-700"
                    >
                      Correo electrónico
                    </label>

                    <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 transition focus-within:border-[#0b6aa7] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#dceaf4]">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[18px] w-[18px] flex-none text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M4 6.5h16v11H4z" />
                        <path d="m4.5 7 7.5 6 7.5-6" />
                      </svg>

                      <input
                        id="usuario"
                        type="email"
                        autoComplete="email"
                        value={usuario}
                        onChange={(e) => {
                          setUsuario(e.target.value);
                          setMensaje("");
                        }}
                        placeholder="usuario@correo.com"
                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="clave"
                      className="mb-1.5 block text-[12px] font-bold text-slate-700"
                    >
                      Contraseña
                    </label>

                    <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 transition focus-within:border-[#0b6aa7] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#dceaf4]">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[18px] w-[18px] flex-none text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="5" y="10" width="14" height="10" rx="2" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>

                      <input
                        id="clave"
                        type={mostrarClave ? "text" : "password"}
                        autoComplete="current-password"
                        value={clave}
                        onChange={(e) => {
                          setClave(e.target.value);
                          setMensaje("");
                        }}
                        placeholder="Digite su clave"
                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                      />

                      <button
                        type="button"
                        onClick={() => setMostrarClave((valor) => !valor)}
                        className="grid h-8 w-8 flex-none place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={
                          mostrarClave
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                      >
                        {mostrarClave ? (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-[18px] w-[18px]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M3 3l18 18" />
                            <path d="M10.7 10.8a2 2 0 0 0 2.5 2.5" />
                            <path d="M9.9 4.2A11 11 0 0 1 21 12a14 14 0 0 1-2.1 3.4" />
                            <path d="M6.2 6.2A13 13 0 0 0 3 12s3.2 6 9 6a9 9 0 0 0 3.2-.6" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-[18px] w-[18px]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M3 12s3.2-6 9-6 9 6 9 6-3.2 6-9 6-9-6-9-6Z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {mensaje && (
                    <div
                      className={`rounded-2xl border px-3.5 py-2.5 text-xs font-semibold leading-5 ${
                        tipoMensaje === "error"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-[#bfd6e7] bg-[#edf5fa] text-[#084c82]"
                      }`}
                    >
                      {mensaje}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#062f56_0%,#084c82_52%,#0b6aa7_100%)] px-4 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(8,76,130,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(8,76,130,0.38)] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                        Validando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Entrar al sistema
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 12h14" />
                          <path d="m13 6 6 6-6 6" />
                        </svg>
                      </span>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-5">
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[#084c82]">
                    Paso 2 de 2 · Condominio
                  </p>
                  <h2 className="text-[28px] font-black tracking-[-0.04em] text-slate-900 sm:text-[32px]">
                    Selecciona dónde trabajar
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">
                    Hola, {usuarioNombre || "usuario"}. Elige uno de tus
                    condominios asignados.
                  </p>
                </div>

                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#c5d9e8] bg-[#f1f6fa] p-3">
                  <div className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-xl border border-white bg-white shadow-sm">
                    <img
                      src={logoActual}
                      alt={empresaNombre || "Empresa"}
                      className="h-full w-full object-contain p-1.5"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0b6aa7]">
                      Empresa activa
                    </p>
                    <p className="truncate text-sm font-extrabold text-slate-800">
                      {empresaNombre || "VAM Enterprise"}
                    </p>
                    <p className="truncate text-[11px] font-medium text-slate-500">
                      {rolGlobal || "Usuario autorizado"}
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="condominio"
                    className="mb-1.5 block text-[12px] font-bold text-slate-700"
                  >
                    Condominio asignado
                  </label>

                  <select
                    id="condominio"
                    value={condominioId}
                    onChange={(e) => {
                      setCondominioId(e.target.value);
                      setMensaje("");
                    }}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#0b6aa7] focus:bg-white focus:ring-4 focus:ring-[#dceaf4]"
                  >
                    <option value="">Seleccione un condominio</option>

                    {condominios.map((condominio) => (
                      <option key={condominio.id} value={condominio.id}>
                        {condominio.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {condominioSeleccionado && (
                  <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <img
                        src={condominioSeleccionado.logo_url || "/logo.jpg"}
                        alt={condominioSeleccionado.nombre}
                        className="h-full w-full object-contain p-1.5"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Condominio seleccionado
                      </p>
                      <p className="truncate text-sm font-extrabold text-slate-800">
                        {condominioSeleccionado.nombre}
                      </p>
                    </div>
                  </div>
                )}

                {mensaje && (
                  <div
                    className={`mt-3 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold leading-5 ${
                      tipoMensaje === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-[#bfd6e7] bg-[#edf5fa] text-[#084c82]"
                    }`}
                  >
                    {mensaje}
                  </div>
                )}

                <button
                  type="button"
                  onClick={entrarConCondominio}
                  disabled={loading}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#062f56_0%,#084c82_52%,#0b6aa7_100%)] px-4 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(8,76,130,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(8,76,130,0.38)] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar al condominio
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M5 12h14" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={volverAlLogin}
                  disabled={loading}
                  className="mt-2 h-10 w-full rounded-xl text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                >
                  Volver y usar otra cuenta
                </button>
              </>
            )}

            {!seleccionandoCondominio && (
              <div className="mt-4 border-t border-slate-100 pt-4 text-center">
                <p className="mb-2 text-[10px] font-semibold text-slate-400">
                  Acceso exclusivo del dueño del sistema
                </p>

                <Link
                  href="/super-login"
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-[#bfd6e7] bg-[#edf5fa] px-4 text-[11px] font-extrabold text-[#084c82] transition hover:border-[#0b6aa7] hover:bg-[#e2eef6]"
                >
                  Entrar como Full Administrador
                </Link>
              </div>
            )}

            <p className="mt-3 text-center text-[9px] font-semibold text-slate-400">
              VAM Condominios · Acceso seguro y multicondominio
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
