"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type CondominioAsignado = {
  id: number;
  nombre: string;
  logo_url: string | null;
  rol_condominio: string;
};

type DatosSesion = {
  uid: string;
  empresaId: number;
  empresaNombre: string;
  usuarioNombre: string;
  rolGlobal: string;
  condominio: CondominioAsignado;
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
  "usuario_admin_id",
  "permisos_usuario",
];

function normalizarRol(valor?: string | null) {
  return String(valor || "").trim().toLowerCase();
}

function rolAdministrativoPermitido(...roles: Array<string | null | undefined>) {
  return roles.some((rol) => {
    const valor = normalizarRol(rol);

    return (
      valor.includes("admin") ||
      valor.includes("administrador") ||
      valor.includes("presidente") ||
      valor.includes("tesorero") ||
      valor.includes("tesoreria") ||
      valor.includes("tesorería") ||
      valor.includes("secretario") ||
      valor.includes("supervisor") ||
      valor.includes("super")
    );
  });
}

export default function MobileAdminLoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const [uid, setUid] = useState("");
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [rolGlobal, setRolGlobal] = useState("");

  const [condominios, setCondominios] = useState<CondominioAsignado[]>([]);
  const [condominioId, setCondominioId] = useState("");

  function limpiarSesionLocal() {
    CLAVES_SESION.forEach((claveSesion) =>
      localStorage.removeItem(claveSesion),
    );
  }

  async function cerrarSesionActual() {
    await supabase.auth.signOut();
    limpiarSesionLocal();
  }

  function guardarSesion(datos: DatosSesion) {
    const rolSesion =
      datos.condominio.rol_condominio ||
      datos.rolGlobal ||
      "administrador";

    localStorage.setItem("user_id", datos.uid);
    localStorage.setItem("usuario_admin_id", datos.uid);
    localStorage.setItem("empresa_id", String(datos.empresaId));
    localStorage.setItem("empresa_nombre", datos.empresaNombre);

    localStorage.setItem("condominio_id", String(datos.condominio.id));
    localStorage.setItem("condominio_nombre", datos.condominio.nombre);
    localStorage.setItem(
      "condominio_logo_url",
      datos.condominio.logo_url || "",
    );

    localStorage.setItem("usuario_nombre", datos.usuarioNombre);
    localStorage.setItem("usuario_rol", rolSesion);
  }

  async function entrarAlCondominio(condominio: CondominioAsignado) {
    if (!uid || !empresaId) {
      setMensaje("No se pudo validar la sesión.");
      return;
    }

    if (!rolAdministrativoPermitido(rolGlobal, condominio.rol_condominio)) {
      await cerrarSesionActual();
      setMensaje(
        "Este usuario no tiene un rol administrativo autorizado para Caja Chica.",
      );
      return;
    }

    guardarSesion({
      uid,
      empresaId,
      empresaNombre,
      usuarioNombre,
      rolGlobal,
      condominio,
    });

    router.replace("/movil/admin");
    router.refresh();
  }

  async function iniciarSesion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const correo = usuario.trim();

    if (!correo || !clave) {
      setMensaje("Debe indicar usuario y contraseña.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      await cerrarSesionActual();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: correo,
        password: clave,
      });

      if (error || !data.user || !data.session) {
        setMensaje("Usuario o contraseña incorrecta.");
        return;
      }

      const userId = data.user.id;

      const { data: empresaData, error: empresaError } = await supabase
        .from("usuarios_empresas")
        .select(`
          empresa_id,
          nombre_usuario,
          rol_global,
          activo,
          empresas (
            id,
            nombre,
            logo_url
          )
        `)
        .eq("user_id", userId)
        .eq("activo", true)
        .maybeSingle();

      if (empresaError || !empresaData) {
        await cerrarSesionActual();
        setMensaje(
          "Este usuario no tiene una empresa activa asignada en VAM.",
        );
        return;
      }

      const empresaRelacion: any = Array.isArray(
        (empresaData as any).empresas,
      )
        ? (empresaData as any).empresas[0]
        : (empresaData as any).empresas;

      const empresaActualId = Number((empresaData as any).empresa_id);
      const empresaNombreActual =
        empresaRelacion?.nombre || "VAM Administradora";
      const usuarioNombreActual =
        (empresaData as any).nombre_usuario ||
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.email ||
        "Usuario";
      const rolGlobalActual = String(
        (empresaData as any).rol_global || "",
      );

      const { data: accesos, error: accesosError } = await supabase
        .from("usuarios_condominios")
        .select(`
          condominio_id,
          rol_condominio,
          activo,
          condominios (
            id,
            nombre,
            logo_url
          )
        `)
        .eq("user_id", userId)
        .eq("empresa_id", empresaActualId)
        .eq("activo", true);

      if (accesosError) {
        await cerrarSesionActual();
        setMensaje("No fue posible validar los condominios asignados.");
        return;
      }

      const lista = (accesos || [])
        .map((item: any): CondominioAsignado | null => {
          const condo = Array.isArray(item.condominios)
            ? item.condominios[0]
            : item.condominios;

          if (!condo?.id || !condo?.nombre) return null;

          return {
            id: Number(condo.id),
            nombre: String(condo.nombre),
            logo_url: condo.logo_url || null,
            rol_condominio: String(item.rol_condominio || ""),
          };
        })
        .filter(
          (item): item is CondominioAsignado =>
            Boolean(item) &&
            rolAdministrativoPermitido(
              rolGlobalActual,
              item?.rol_condominio,
            ),
        );

      if (lista.length === 0) {
        await cerrarSesionActual();
        setMensaje(
          "Este usuario no tiene acceso administrativo activo a ningún condominio.",
        );
        return;
      }

      setUid(userId);
      setEmpresaId(empresaActualId);
      setEmpresaNombre(empresaNombreActual);
      setUsuarioNombre(usuarioNombreActual);
      setRolGlobal(rolGlobalActual);

      if (lista.length === 1) {
        const unico = lista[0];

        guardarSesion({
          uid: userId,
          empresaId: empresaActualId,
          empresaNombre: empresaNombreActual,
          usuarioNombre: usuarioNombreActual,
          rolGlobal: rolGlobalActual,
          condominio: unico,
        });

        router.replace("/movil/admin");
        router.refresh();
        return;
      }

      setCondominios(lista);
      setCondominioId("");
      setMensaje("Seleccione el condominio con el que desea trabajar.");
    } catch (error: any) {
      await cerrarSesionActual();
      setMensaje(
        error?.message || "No fue posible completar el inicio de sesión.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function seleccionarCondominio() {
    const seleccionado = condominios.find(
      (condominio) => String(condominio.id) === condominioId,
    );

    if (!seleccionado) {
      setMensaje("Debe seleccionar un condominio.");
      return;
    }

    setLoading(true);

    try {
      await entrarAlCondominio(seleccionado);
    } finally {
      setLoading(false);
    }
  }

  async function volver() {
    setLoading(true);

    try {
      await cerrarSesionActual();
      setUid("");
      setEmpresaId(null);
      setEmpresaNombre("");
      setUsuarioNombre("");
      setRolGlobal("");
      setCondominios([]);
      setCondominioId("");
      setClave("");
      setMensaje("");
    } finally {
      setLoading(false);
    }
  }

  const seleccionandoCondominio = condominios.length > 1;

  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-6 flex items-center">
      <div className="mx-auto w-full max-w-md">
        <section className="overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-3xl shadow">
                🔐
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
                  VAM Condominio
                </p>
                <h1 className="text-2xl font-black">
                  Administración móvil
                </h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-blue-100">
              Acceso restringido para usuarios autorizados. La sesión y el
              condominio serán validados antes de permitir operaciones.
            </p>
          </div>

          <div className="p-5">
            {!seleccionandoCondominio ? (
              <form onSubmit={iniciarSesion} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={usuario}
                    onChange={(e) => {
                      setUsuario(e.target.value);
                      setMensaje("");
                    }}
                    placeholder="usuario@correo.com"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Contraseña
                  </label>

                  <div className="flex overflow-hidden rounded-xl border focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                    <input
                      type={mostrarClave ? "text" : "password"}
                      autoComplete="current-password"
                      value={clave}
                      onChange={(e) => {
                        setClave(e.target.value);
                        setMensaje("");
                      }}
                      placeholder="Digite su contraseña"
                      className="min-w-0 flex-1 px-4 py-3 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => setMostrarClave((valor) => !valor)}
                      className="border-l px-4 text-sm font-bold text-slate-600"
                    >
                      {mostrarClave ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </div>

                {mensaje && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
                    {mensaje}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-700 px-4 py-3 font-black text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {loading ? "Validando..." : "Iniciar sesión"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    Usuario validado
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-900">
                    Seleccione el condominio
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {usuarioNombre}
                  </p>
                </div>

                <select
                  value={condominioId}
                  onChange={(e) => {
                    setCondominioId(e.target.value);
                    setMensaje("");
                  }}
                  className="w-full rounded-xl border bg-white px-4 py-3"
                >
                  <option value="">Seleccione...</option>
                  {condominios.map((condominio) => (
                    <option key={condominio.id} value={condominio.id}>
                      {condominio.nombre}
                    </option>
                  ))}
                </select>

                {mensaje && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
                    {mensaje}
                  </div>
                )}

                <button
                  type="button"
                  onClick={seleccionarCondominio}
                  disabled={loading}
                  className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-black text-white disabled:opacity-50"
                >
                  {loading ? "Entrando..." : "Entrar a Administración"}
                </button>

                <button
                  type="button"
                  onClick={volver}
                  disabled={loading}
                  className="w-full rounded-xl border px-4 py-3 font-bold text-slate-600 disabled:opacity-50"
                >
                  Usar otra cuenta
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
