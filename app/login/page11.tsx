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
  const [verClave, setVerClave] = useState(false);

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
    localStorage.setItem("condominioSeleccionado", condominio.nombre);
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
    (c) => String(c.id) === condominioId
  );

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-slate-950 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.45),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(3,32,68,0.92))]" />
          <div className="absolute inset-0 opacity-30 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14 text-white">
            <div>
              <div className="flex items-center gap-4">
                <img
                  src="/logo.jpg"
                  alt="VAM Condominios"
                  className="h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-2xl"
                />

                <div>
                  <h1 className="text-4xl font-black tracking-tight">VAM</h1>
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-200">
                    Condominios
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-orange-200">
                    Administración inteligente
                  </p>
                </div>
              </div>

              <div className="mt-12 max-w-xl">
                <h2 className="text-5xl font-black leading-tight xl:text-6xl">
                  La administración de condominios{" "}
                  <span className="text-sky-400">más avanzada</span>
                </h2>

                <p className="mt-3 text-lg leading-4 text-slate-200">
                  Una plataforma completa para gestionar cobros, gastos,
                  incidencias, reservas, comunicaciones, permisos y estados
                  financieros desde un solo lugar.
                </p>
              </div>

              <div className="mt-6 grid max-w-xl gap-3">
                {[
                  ["📊", "Gestión financiera", "Cobros, pagos, gastos, reportes y morosidad automática."],
                  ["📣", "Comunicaciones", "Avisos, anuncios y notificaciones para residentes."],
                  ["🛠️", "Solicitudes y permisos", "Trabajos, mudanzas, servicios, incidencias y seguimiento."],
                  ["🛡️", "Seguridad y control", "Accesos, visitantes, evidencias y trazabilidad."],
                ].map(([icono, titulo, texto]) => (
                  <div
                    key={titulo}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/25 text-2xl">
                      {icono}
                    </div>
                    <div>
                      <p className="font-bold">{titulo}</p>
                      <p className="text-sm text-slate-200">{texto}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 grid grid-cols-4 gap-3 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              {[
                ["🏢", "Multi-condominio"],
                ["🔐", "Seguro"],
                ["☁️", "Acceso 24/7"],
                ["🎧", "Soporte"],
              ].map(([icono, texto]) => (
                <div key={texto} className="text-center">
                  <div className="text-3xl">{icono}</div>
                  <p className="mt-2 text-sm font-semibold text-slate-100">
                    {texto}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
          <div className="w-full max-w-xl">
            <div className="mb-8 text-center">
              <div className="mb-5 flex justify-center">
                <img
                  src={condominioSeleccionado?.logo_url || "/logo.jpg"}
                  alt="Logo"
                  className="h-28 w-28 rounded-3xl border bg-white object-contain p-3 shadow-xl"
                />
              </div>

              <h1 className="text-4xl font-black text-slate-900">
                VAM Condominios
              </h1>
              <p className="mt-2 text-sm uppercase tracking-[0.28em] text-slate-500">
                Administración inteligente
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl md:p-9">
              <div className="mb-7 text-center">
                <h2 className="text-3xl font-black text-slate-900">
                  Iniciar sesión
                </h2>
                <p className="mt-2 text-slate-500">
                  Accede a tu cuenta para continuar
                </p>
              </div>

              {condominios.length === 0 ? (
                <form onSubmit={iniciarSesion} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={usuario}
                      onChange={(e) => {
                        setUsuario(e.target.value);
                        setMensaje("");
                      }}
                      placeholder="usuario@correo.com"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={verClave ? "text" : "password"}
                        value={clave}
                        onChange={(e) => {
                          setClave(e.target.value);
                          setMensaje("");
                        }}
                        placeholder="Digite su clave"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pr-14 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => setVerClave(!verClave)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                      >
                        {verClave ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  {mensaje && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                      {mensaje}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-blue-900 px-5 py-4 font-bold text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-800 disabled:opacity-60"
                  >
                    {loading ? "Validando..." : "Iniciar sesión"}
                  </button>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                    Empresa: <b>{empresaNombre}</b>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Condominio asignado
                    </label>
                    <select
                      value={condominioId}
                      onChange={(e) => {
                        setCondominioId(e.target.value);
                        setMensaje("");
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
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
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                      {mensaje}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={entrarConCondominio}
                    className="w-full rounded-2xl bg-blue-900 px-5 py-4 font-bold text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-800"
                  >
                    Entrar al condominio
                  </button>
                </div>
              )}

              <div className="my-7 flex items-center gap-4 text-sm text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                <span>o</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link
                href="/portal-propietario"
                className="block w-full rounded-2xl border border-blue-900 px-5 py-4 text-center font-bold text-blue-900 transition hover:bg-blue-50"
              >
                Acceso para residentes
              </Link>

              <div className="mt-5 text-center">
                <Link
                  href="/super-login"
                  className="text-sm font-semibold text-slate-600 hover:text-blue-900"
                >
                  Acceso exclusivo Full Administrador
                </Link>
              </div>
            </div>

            <div className="mt-7 rounded-3xl bg-blue-900 p-4 text-white shadow-xl">
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <div>
                  <p className="font-bold">Contáctanos</p>
                  <p>829-792-9292</p>
                </div>
                <div>
                  <p className="font-bold">WhatsApp</p>
                  <p>829-792-9292</p>
                </div>
                <div>
                  <p className="font-bold">Email</p>
                  <p className="break-all">vamcondominiosrd@gmail.com</p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-sm italic text-blue-900">
              Tu condominio en buenas manos
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
