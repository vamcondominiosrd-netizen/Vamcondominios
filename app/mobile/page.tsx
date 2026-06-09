"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Condominio = {
  id: number;
  nombre: string;
  logo_url?: string | null;
};

export default function MobileAdminLoginPage() {
  const router = useRouter();

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [condominioLogoUrl, setCondominioLogoUrl] = useState("");

  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarCondominios();
  }, []);

  async function cargarCondominios() {
    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre, logo_url")
      .order("nombre");

    if (error) {
      setMensaje("Error cargando condominios: " + error.message);
      return;
    }

    setCondominios(data || []);
  }

  function seleccionarCondominio(id: string) {
    setCondominioId(id);
    setMensaje("");

    const condominioSeleccionado = condominios.find(
      (c) => String(c.id) === id
    );

    setCondominioNombre(condominioSeleccionado?.nombre || "");
    setCondominioLogoUrl(condominioSeleccionado?.logo_url || "");
  }

  function limpiarSesionesLocales() {
    localStorage.removeItem("propietario_actual");

    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");

    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
  }

  async function entrarAdministrador(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      setMensaje("Debe seleccionar un condominio.");
      return;
    }

    if (!usuario || !clave) {
      setMensaje("Debe indicar usuario y clave.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: usuario.trim(),
      password: clave,
    });

    if (error || !data.user) {
      setLoading(false);
      setMensaje("Usuario o clave incorrecta.");
      return;
    }

    const uid = data.user.id;

    const { data: adminData, error: adminError } = await supabase
      .from("usuarios_admin")
      .select("id, user_id, condominio_id, nombre, rol, estado")
      .eq("user_id", uid)
      .eq("condominio_id", Number(condominioId))
      .eq("estado", "Activo")
      .maybeSingle();

    if (adminError || !adminData) {
      await supabase.auth.signOut();

      setLoading(false);
      setMensaje("Este usuario no pertenece al condominio seleccionado.");
      return;
    }

    const rolNormalizado = String(adminData.rol || "").toLowerCase();

    const rolPermitido =
      rolNormalizado.includes("admin") ||
      rolNormalizado.includes("administrador") ||
      rolNormalizado.includes("super") ||
      rolNormalizado.includes("presidente") ||
      rolNormalizado.includes("tesorero") ||
      rolNormalizado.includes("tesoreria") ||
      rolNormalizado.includes("tesorería") ||
      rolNormalizado.includes("directiva");

    if (!rolPermitido) {
      await supabase.auth.signOut();

      setLoading(false);
      setMensaje("Este usuario no tiene permiso para entrar al móvil administrativo.");
      return;
    }

    limpiarSesionesLocales();

    localStorage.setItem("condominio_id", condominioId);
    localStorage.setItem("condominio_nombre", condominioNombre);
    localStorage.setItem("condominio_logo_url", condominioLogoUrl || "");

    localStorage.setItem("usuario_admin_id", String(adminData.id));
    localStorage.setItem("usuario_nombre", adminData.nombre || usuario);
    localStorage.setItem("usuario_rol", adminData.rol || "Administrador");

    setLoading(false);

    router.push("/mobile/admin");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 flex items-center">
      <div className="max-w-md mx-auto w-full space-y-4">
        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow">
          <div className="flex items-center gap-4">
            {condominioLogoUrl ? (
              <img
                src={condominioLogoUrl}
                alt={condominioNombre || "Logo"}
                className="h-16 w-16 rounded-2xl object-contain bg-white p-2"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">
                🏢
              </div>
            )}

            <div>
              <p className="text-sm text-slate-300">
                Acceso administrativo
              </p>

              <h1 className="text-3xl font-black">
                VAM Admin
              </h1>
            </div>
          </div>

          <p className="text-slate-300 text-sm mt-4">
            Versión móvil para administradores, directiva, tesorería y usuarios autorizados.
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="mb-5">
            <h2 className="text-xl font-black text-slate-900">
              Iniciar sesión
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Seleccione el condominio e ingrese sus credenciales administrativas.
            </p>
          </div>

          <form onSubmit={entrarAdministrador} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Condominio
              </label>

              <select
                value={condominioId}
                onChange={(e) => seleccionarCondominio(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">Seleccione condominio</option>

                {condominios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {condominioNombre && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-600 font-semibold">
                  Condominio seleccionado
                </p>

                <p className="text-sm text-blue-900 font-bold">
                  {condominioNombre}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
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
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
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
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            {mensaje && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                {mensaje}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-950 disabled:opacity-50 text-white rounded-xl py-3 font-bold"
            >
              {loading ? "Validando acceso..." : "Entrar al panel móvil"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4 text-center">
          <p className="text-xs text-slate-500">
            VAM Administración de Condominios
          </p>

          <p className="text-xs text-slate-400 mt-1">
            Sistema móvil administrativo
          </p>
        </div>
      </div>
    </main>
  );
}