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
    setEmpresaNombre(empresa?.nombre || "VAM Administración de Condominios");
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
        empresaNombreActual: empresa?.nombre || "VAM Administración de Condominios",
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
    <main className="min-h-screen overflow-hidden bg-[#06265a] p-2 text-[#071f4d] lg:p-3">
      <div className="mx-auto flex h-[calc(100vh-16px)] max-h-[940px] min-h-[690px] w-full max-w-[1620px] items-center justify-center lg:h-[calc(100vh-24px)]">
        <section className="relative grid h-full w-full overflow-hidden rounded-[18px] border border-white/30 bg-white shadow-2xl lg:grid-cols-[1.42fr_0.78fr]">
          <div className="absolute inset-0 bg-[url('/login-condominio-bg.png')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/42 to-sky-600/10" />
          <div className="absolute inset-x-0 bottom-0 h-[118px] bg-[#06265a]" />
          <div className="absolute inset-x-0 bottom-[102px] h-[42px] rounded-t-[55%] bg-[#06265a] shadow-[0_-5px_0_rgba(204,156,49,0.95)]" />

          <aside className="relative z-10 hidden h-full flex-col justify-center px-12 pb-[126px] pt-8 lg:flex xl:px-16 2xl:px-20">
            <div className="max-w-[430px] -translate-y-2">
              <img
                src="/logo.jpg"
                alt="VAM Administración de Condominios"
                className="mb-6 h-[145px] w-auto object-contain xl:h-[165px]"
              />

              <h1 className="max-w-[380px] text-[31px] font-black leading-[1.1] tracking-[-0.04em] text-[#071f4d] xl:text-[35px]">
                Gestión inteligente,
                <span className="block text-[#c79a37]">comunidades</span>
                tranquilas
              </h1>

              <div className="mt-3 h-[3px] w-14 rounded-full bg-[#c79a37]" />

              <p className="mt-4 max-w-[380px] text-[13px] font-medium leading-6 text-[#0c2b5f] xl:text-[14px]">
                La plataforma integral que simplifica la administración de tu
                condominio, mejora la comunicación y optimiza cada proceso.
              </p>

              <div className="mt-6 space-y-3">
                <Feature
                  icon="▥"
                  title="Administración eficiente"
                  text="Control total de tus operaciones en un solo lugar."
                />
                <Feature
                  icon="◎"
                  title="Comunicación efectiva"
                  text="Conecta con propietarios y residentes al instante."
                />
                <Feature
                  icon="↗"
                  title="Reportes inteligentes"
                  text="Información clara para tomar mejores decisiones."
                />
                <Feature
                  icon="◇"
                  title="Seguridad y confianza"
                  text="Plataforma segura con altos estándares de protección."
                />
              </div>
            </div>
          </aside>

          <section className="relative z-20 flex h-full items-center justify-center px-4 pb-[126px] pt-6 sm:px-8 lg:px-10 xl:px-12">
            <div className="w-full max-w-[455px] rounded-[24px] border border-white/80 bg-white/97 px-7 py-6 shadow-[0_22px_70px_rgba(3,22,54,0.30)] backdrop-blur-xl xl:max-w-[480px] xl:px-8 xl:py-7">
              <div className="mb-5 text-center">
                <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full border border-[#d2a23b]/40 bg-[#062b63] p-2 shadow-lg xl:h-[104px] xl:w-[104px]">
                  <img
                    src={condominioSeleccionado?.logo_url || "/logo.jpg"}
                    alt="Logo VAM"
                    className="h-full w-full rounded-full object-contain"
                  />
                </div>

                <h2 className="text-[23px] font-black leading-tight text-[#08235a] xl:text-[25px]">
                  Bienvenido a
                  <span className="block text-[#c79a37]">VAM CONDOMINIOS</span>
                </h2>
                <div className="mx-auto mt-2 h-[2px] w-16 bg-[#c79a37]" />
                <p className="mt-3 text-[13px] font-medium leading-5 text-[#163361]">
                  {condominios.length === 0
                    ? "Inicia sesión para acceder a tu panel de administración"
                    : "Selecciona el condominio con el que deseas trabajar"}
                </p>
              </div>

              {condominios.length === 0 ? (
                <form onSubmit={iniciarSesion} className="space-y-3.5">
                  <InputBox
                    label="Correo electrónico"
                    icon="✉"
                    type="email"
                    value={usuario}
                    placeholder="Ingresa tu correo electrónico"
                    onChange={(value) => {
                      setUsuario(value);
                      setMensaje("");
                    }}
                  />

                  <InputBox
                    label="Contraseña"
                    icon="🔒"
                    type="password"
                    value={clave}
                    placeholder="Ingresa tu contraseña"
                    onChange={(value) => {
                      setClave(value);
                      setMensaje("");
                    }}
                  />

                  <div className="flex items-center justify-between text-xs font-semibold text-[#0a2a5f]">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 rounded border-slate-300 accent-[#082b67]"
                      />
                      Recordarme
                    </label>
                    <Link href="/recuperar-clave" className="text-blue-700 hover:underline">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>

                  {mensaje && <Mensaje texto={mensaje} />}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-1 flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#061f4c] to-[#064496] py-3.5 text-[16px] font-black text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl disabled:opacity-60"
                  >
                    <span className="text-[#d8a23a]">✦</span>
                    {loading ? "Validando..." : "Iniciar sesión"}
                  </button>
                </form>
              ) : (
                <div className="space-y-3.5">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/90 p-3 text-sm text-[#082b67]">
                    Empresa: <b>{empresaNombre}</b>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-[#08235a]">
                      Condominio asignado
                    </label>
                    <select
                      value={condominioId}
                      onChange={(e) => {
                        setCondominioId(e.target.value);
                        setMensaje("");
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-[#08235a] outline-none transition focus:border-[#c79a37] focus:ring-4 focus:ring-[#c79a37]/15"
                    >
                      <option value="">Seleccione condominio</option>
                      {condominios.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {mensaje && <Mensaje texto={mensaje} />}

                  <button
                    type="button"
                    onClick={entrarConCondominio}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#061f4c] to-[#064496] py-3.5 text-[16px] font-black text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl"
                  >
                    <span className="text-[#d8a23a]">➜</span>
                    Entrar al condominio
                  </button>
                </div>
              )}

              <div className="my-4 flex items-center gap-4 text-xs font-semibold text-slate-500">
                <div className="h-px flex-1 bg-slate-200" />
                <span>acceso administrativo</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link
                href="/super-login"
                className="block w-full rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-black text-[#082b67] shadow-sm transition hover:border-[#c79a37] hover:bg-[#fffaf0]"
              >
                Entrar como Full Administrador
              </Link>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center text-[10px] font-bold text-[#082b67]">
                <div>🛡️<br />Datos protegidos</div>
                <div>☁️<br />Disponibilidad 24/7</div>
                <div>🎧<br />Soporte especializado</div>
              </div>
            </div>
          </section>

          <footer className="absolute inset-x-0 bottom-0 z-30 hidden h-[104px] items-center justify-center px-10 lg:flex">
            <div className="grid w-full max-w-[1080px] grid-cols-3 overflow-hidden rounded-[24px] border border-white/20 bg-[#05265a]/97 text-white shadow-2xl">
              <Contact icon="☎" title="Llámanos" main="829-792-9292" sub="Línea de atención" />
              <Contact icon="✉" title="Escríbenos" main="vamcondominiosrd@gmail.com" sub="Correo electrónico" />
              <Contact icon="🎧" title="Soporte disponible" main="Estamos para ayudarte" sub="siempre que lo necesites" />
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d2a23b] bg-[#062b63] text-base font-black text-[#d8a23a] shadow-md">
        {icon}
      </div>
      <div>
        <p className="text-[12px] font-black text-[#08235a]">{title}</p>
        <p className="mt-1 max-w-[260px] text-[11px] font-medium leading-4 text-[#17345f]">
          {text}
        </p>
      </div>
    </div>
  );
}

function InputBox({
  label,
  icon,
  type,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  icon: string;
  type: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-[#08235a]">{label}</label>
      <div className="flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 transition focus-within:border-[#c79a37] focus-within:ring-4 focus-within:ring-[#c79a37]/15">
        <span className="mr-3 text-base text-[#082b67]">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[13px] font-semibold text-[#08235a] outline-none placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}

function Mensaje({ texto }: { texto: string }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-800">
      {texto}
    </div>
  );
}

function Contact({ icon, title, main, sub }: { icon: string; title: string; main: string; sub: string }) {
  return (
    <div className="flex items-center justify-center gap-3 border-r border-white/15 px-5 py-3 last:border-r-0">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#d2a23b] text-xl text-[#d8a23a]">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-white/90">{title}</p>
        <p className="text-base font-black leading-tight">{main}</p>
        <p className="text-xs text-white/80">{sub}</p>
      </div>
    </div>
  );
}
