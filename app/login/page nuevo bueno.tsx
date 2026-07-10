"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type CondominioAsignado = {
  id: number;
  nombre: string;
  logo_url: string | null;
};

export default function LoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const [userId, setUserId] = useState("");
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [rolGlobal, setRolGlobal] = useState("");

  const [condominios, setCondominios] = useState<CondominioAsignado[]>([]);
  const [condominioId, setCondominioId] = useState("");

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();

    if (!usuario || !clave) {
      setMensaje("Debe indicar usuario y clave.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: usuario,
      password: clave,
    });

    if (error || !data.user) {
      setLoading(false);
      setMensaje("Usuario o clave incorrecta.");
      return;
    }

    const uid = data.user.id;
    setUserId(uid);

    const { data: empresaData, error: empresaError } = await supabase
      .from("usuarios_empresas")
      .select(
        `
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
      `,
      )
      .eq("user_id", uid)
      .eq("activo", true)
      .maybeSingle();

    if (empresaError || !empresaData) {
      await supabase.auth.signOut();
      setLoading(false);
      setMensaje("Este usuario no tiene empresa asignada en VAM Enterprise.");
      return;
    }

    const empresa = Array.isArray(empresaData.empresas)
      ? empresaData.empresas[0]
      : empresaData.empresas;

    const empresaActualId = Number(empresaData.empresa_id);

    setEmpresaId(empresaActualId);
    setEmpresaNombre(empresa?.nombre || "");
    setUsuarioNombre(empresaData.nombre_usuario || "");
    setRolGlobal(empresaData.rol_global || "");

    const { data: condominiosData, error: condominiosError } = await supabase
      .from("usuarios_condominios")
      .select(
        `
        condominio_id,
        rol_condominio,
        condominios (
          id,
          nombre,
          logo_url,
          sucursal_id
        )
      `,
      )
      .eq("user_id", uid)
      .eq("empresa_id", empresaActualId)
      .eq("activo", true);

    if (condominiosError) {
      await supabase.auth.signOut();
      setLoading(false);
      setMensaje("Error cargando condominios asignados.");
      return;
    }

    const lista: CondominioAsignado[] = (condominiosData || [])
      .map((item: any) => {
        const c = Array.isArray(item.condominios)
          ? item.condominios[0]
          : item.condominios;

        return {
          id: Number(c?.id),
          nombre: c?.nombre || "",
          logo_url: c?.logo_url || null,
        };
      })
      .filter((c) => c.id && c.nombre);

    if (lista.length === 0) {
      await supabase.auth.signOut();
      setLoading(false);
      setMensaje("Este usuario no tiene condominios asignados.");
      return;
    }

    const permisos = await cargarPermisosUsuario(uid, empresaActualId);

    if (lista.length === 1) {
      guardarSesion({
        uid,
        empresaActualId,
        empresaNombreActual: empresa?.nombre || "",
        usuarioNombreActual: empresaData.nombre_usuario || "",
        rolGlobalActual: empresaData.rol_global || "",
        condominio: lista[0],
        permisos,
      });

      setLoading(false);
      router.push("/dashboard");
      return;
    }

    localStorage.setItem("permisos_usuario", JSON.stringify(permisos || []));

    setCondominios(lista);
    setLoading(false);
    setMensaje("Seleccione el condominio con el que desea trabajar.");
  }

  async function cargarPermisosUsuario(uid: string, empresaActualId: number) {
    const { data, error } = await supabase
      .from("usuarios_roles")
      .select(
        `
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
      `,
      )
      .eq("user_id", uid)
      .eq("empresa_id", empresaActualId)
      .eq("activo", true);

    if (error) {
      console.error("Error cargando permisos:", error.message);
      return [];
    }

    const permisos: string[] = [];

    (data || []).forEach((ur: any) => {
      const rol = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      const rolesPermisos = rol?.roles_permisos || [];

      rolesPermisos.forEach((rp: any) => {
        const permiso = Array.isArray(rp.permisos)
          ? rp.permisos[0]
          : rp.permisos;

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
  }: {
    uid: string;
    empresaActualId: number;
    empresaNombreActual: string;
    usuarioNombreActual: string;
    rolGlobalActual: string;
    condominio: CondominioAsignado;
    permisos: string[];
  }) {
    localStorage.setItem("user_id", uid);
    localStorage.setItem("empresa_id", String(empresaActualId));
    localStorage.setItem("empresa_nombre", empresaNombreActual);

    localStorage.setItem("condominio_id", String(condominio.id));
    localStorage.setItem("condominio_nombre", condominio.nombre);
    localStorage.setItem("condominio_logo_url", condominio.logo_url || "");

    localStorage.setItem("usuario_rol", rolGlobalActual);
    localStorage.setItem("usuario_nombre", usuarioNombreActual);

    localStorage.setItem("permisos_usuario", JSON.stringify(permisos || []));
  }

  async function entrarConCondominio() {
    if (!condominioId) {
      setMensaje("Debe seleccionar un condominio.");
      return;
    }

    const condominio = condominios.find((c) => String(c.id) === condominioId);

    if (!condominio || !empresaId) {
      setMensaje("No se pudo validar el condominio seleccionado.");
      return;
    }

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

    router.push("/dashboard");
  }

  const condominioSeleccionado = condominios.find(
    (c) => String(c.id) === condominioId,
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eaf4ff] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.20),_transparent_34%),linear-gradient(135deg,_#f8fbff_0%,_#dcefff_45%,_#f6fbff_100%)]" />
      <div className="absolute -left-28 top-16 h-80 w-80 rounded-full bg-blue-300/30 blur-3xl" />
      <div className="absolute -right-28 bottom-8 h-96 w-96 rounded-full bg-amber-300/25 blur-3xl" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid h-[min(860px,calc(100vh-48px))] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-[0_30px_90px_rgba(15,23,42,0.20)] backdrop-blur-xl lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative hidden overflow-hidden bg-[#0c4f9f] lg:block">
            <div className="absolute inset-0 bg-[url('/login-condominio-bg.png')] bg-cover bg-center opacity-95" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0f7bd3]/88 via-[#116bb9]/72 to-[#082f63]/90" />
            <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#061d42]/85 to-transparent" />
            <div className="absolute right-10 top-10 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur-md">
              SaaS Multi-Condominios
            </div>

            <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/40 bg-white/95 p-2 shadow-2xl">
                  <img
                    src="/logo.jpg"
                    alt="VAM Condominios"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200">
                    VAM Condominios
                  </p>
                  <h1 className="mt-1 text-3xl font-black leading-tight text-white xl:text-4xl">
                    Administración inteligente
                  </h1>
                </div>
              </div>

              <div className="max-w-xl pb-5">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />{" "}
                  Plataforma segura y moderna
                </div>
                <h2 className="text-4xl font-black leading-[1.05] tracking-tight text-white xl:text-5xl">
                  Control total de tu condominio en una sola plataforma.
                </h2>
                <p className="mt-5 max-w-lg text-base leading-7 text-blue-50 xl:text-lg">
                  Pagos, reportes, autorizaciones, incidencias y comunicación
                  con propietarios desde un sistema centralizado, seguro y
                  profesional.
                </p>

                <div className="mt-7 grid grid-cols-2 gap-3 text-sm text-white">
                  {[
                    "Multi-condominio",
                    "Control financiero",
                    "Seguridad y acceso",
                    "Reportes ejecutivos",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/14 px-3 py-2 backdrop-blur-md"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-sm font-black text-blue-950">
                        ✓
                      </span>
                      <span className="font-semibold">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-2 py-1 text-sm text-white backdrop-blur-md">
                <span>📞 829-792-9292</span>
                <span>✉️ vamcondominiosrd@gmail.com</span>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 items-center justify-center bg-white/80 px-5 py-5 sm:px-8 lg:px-10">
            <div className="w-full max-w-[420px]">
              <div className="mb-5 text-center lg:hidden">
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-100 bg-white p-2 shadow-xl">
                  <img
                    src="/logo.jpg"
                    alt="VAM Condominios"
                    className="h-full w-full object-contain"
                  />
                </div>
                <h1 className="text-2xl font-black text-slate-900">
                  VAM Condominios
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Administración inteligente
                </p>
              </div>

              <div className="rounded-[1.7rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.14)] sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">
                      Acceso seguro
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      {condominios.length === 0
                        ? "Bienvenido"
                        : "Seleccione condominio"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {condominios.length === 0
                        ? "Ingrese sus credenciales para continuar."
                        : "Elija el condominio con el que trabajará."}
                    </p>
                  </div>
                  <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-2 sm:flex">
                    <img
                      src={condominioSeleccionado?.logo_url || "/logo.jpg"}
                      alt="Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>

                {condominios.length === 0 ? (
                  <form onSubmit={iniciarSesion} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-slate-700">
                        Usuario
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          ✉
                        </span>
                        <input
                          type="email"
                          value={usuario}
                          onChange={(e) => {
                            setUsuario(e.target.value);
                            setMensaje("");
                          }}
                          placeholder="usuario@correo.com"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-slate-700">
                        Clave
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          🔒
                        </span>
                        <input
                          type="password"
                          value={clave}
                          onChange={(e) => {
                            setClave(e.target.value);
                            setMensaje("");
                          }}
                          placeholder="Digite su clave"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    {mensaje && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                        {mensaje}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f4f95] via-[#1268bd] to-[#0f4f95] px-5 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-blue-900/20 transition hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition duration-700 group-hover:translate-x-full" />
                      <span className="relative">
                        {loading ? "Validando acceso..." : "Entrar al sistema"}
                      </span>
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                      Empresa: <b>{empresaNombre}</b>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-slate-700">
                        Condominio asignado
                      </label>
                      <select
                        value={condominioId}
                        onChange={(e) => {
                          setCondominioId(e.target.value);
                          setMensaje("");
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="">Seleccione condominio</option>
                        {condominios.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {mensaje && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                        {mensaje}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={entrarConCondominio}
                      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f4f95] via-[#1268bd] to-[#0f4f95] px-5 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-blue-900/20 transition hover:scale-[1.01] hover:shadow-xl"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition duration-700 group-hover:translate-x-full" />
                      <span className="relative">Entrar al condominio</span>
                    </button>
                  </div>
                )}

                <div className="mt-5 border-t border-slate-100 pt-4 text-center">
                  <p className="mb-3 text-xs font-semibold text-slate-500">
                    Acceso exclusivo del dueño del sistema
                  </p>
                  <Link
                    href="/super-login"
                    className="block w-full rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-black text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"
                  >
                    Entrar como Full Administrador
                  </Link>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-semibold text-slate-500">
                <span>📞 829-792-9292</span>
                <span>✉️ vamcondominiosrd@gmail.com</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
