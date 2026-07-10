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
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img
              src={condominioSeleccionado?.logo_url || "/logo.jpg"}
              alt="Logo"
              className="h-24 w-24 object-contain rounded-xl border bg-white p-2"
            />
          </div>

          <h1 className="text-3xl font-bold text-slate-800">VAM Enterprise</h1>
          <p className="text-slate-500 mt-2">
            Acceso seguro por empresa y condominio asignado
          </p>
        </div>

        {condominios.length === 0 ? (
          <form onSubmit={iniciarSesion} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Usuario
              </label>

              <input
                type="email"
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value);
                  setMensaje("");
                }}
                placeholder="usuario@correo.com"
                className="w-full border border-slate-300 rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Clave
              </label>

              <input
                type="password"
                value={clave}
                onChange={(e) => {
                  setClave(e.target.value);
                  setMensaje("");
                }}
                placeholder="Digite su clave"
                className="w-full border border-slate-300 rounded-lg px-4 py-3"
              />
            </div>

            {mensaje && (
              <div className="bg-blue-50 text-blue-700 text-sm rounded-lg px-4 py-3">
                {mensaje}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg disabled:opacity-60"
            >
              {loading ? "Validando..." : "Entrar al sistema"}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 text-sm">
              Empresa: <b>{empresaNombre}</b>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Condominio asignado
              </label>

              <select
                value={condominioId}
                onChange={(e) => {
                  setCondominioId(e.target.value);
                  setMensaje("");
                }}
                className="w-full border border-slate-300 rounded-lg px-4 py-3"
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
              <div className="bg-blue-50 text-blue-700 text-sm rounded-lg px-4 py-3">
                {mensaje}
              </div>
            )}

            <button
              type="button"
              onClick={entrarConCondominio}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg"
            >
              Entrar al condominio
            </button>
          </div>
        )}

        <div className="mt-6 pt-5 border-t text-center">
          <p className="text-xs text-slate-500 mb-3">
            Acceso exclusivo del dueño del sistema
          </p>

          <Link
            href="/super-login"
            className="block w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg"
          >
            Entrar como Full Administrador
          </Link>
        </div>
      </div>
    </main>
  );
}