"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type ModoLogin = "propietario" | "directiva";

export default function MovilLoginPage() {
  const router = useRouter();

  const [modo, setModo] = useState<ModoLogin>("propietario");

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [condominioLogoUrl, setCondominioLogoUrl] = useState("");

  const [unidadId, setUnidadId] = useState("");
  const [cedula, setCedula] = useState("");

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
      setMensaje(error.message);
      return;
    }

    setCondominios(data || []);
  }

  async function seleccionarCondominio(id: string) {
    setCondominioId(id);
    setUnidadId("");
    setMensaje("");

    const condominioSeleccionado = condominios.find(
      (c) => String(c.id) === id
    );

    setCondominioNombre(condominioSeleccionado?.nombre || "");
    setCondominioLogoUrl(condominioSeleccionado?.logo_url || "");

    if (!id) {
      setUnidades([]);
      return;
    }

    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo");

    if (error) {
      setMensaje(error.message);
      return;
    }

    setUnidades(data || []);
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

  async function entrarPropietario() {
    if (!condominioId || !unidadId || !cedula) {
      setMensaje("Debe completar condominio, apartamento y cédula.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const unidadCodigo =
      unidades.find((u) => String(u.id) === unidadId)?.codigo || "";

    const cedulaLimpia = cedula.replace(/\D/g, "");

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

    setLoading(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    const propietario = (propietarios || []).find((p: any) => {
      const cedulaDB = String(p.cedula || "").replace(/\D/g, "");
      return cedulaDB === cedulaLimpia;
    });

    if (!propietario) {
      setMensaje("La cédula no coincide con el apartamento seleccionado.");
      return;
    }

    limpiarSesionesLocales();

    localStorage.setItem(
      "propietario_actual",
      JSON.stringify({
        propietario_id: propietario.id,
        condominio_id: Number(condominioId),
        condominio_nombre: condominioNombre,
        unidad_id: Number(unidadId),
        no_apartamento: unidadCodigo,
        nombre_propietario: propietario.nombre_propietario,
        cedula: propietario.cedula,
        telefono: propietario.telefono,
        correo: propietario.correo,
      })
    );

    router.push("/movil");
  }

  async function entrarDirectiva() {
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

    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", uid)
      .maybeSingle();

    setLoading(false);

    if (perfilError) {
      setMensaje("Error validando perfil: " + perfilError.message);
      return;
    }

    if (perfil && perfil.active === false) {
      await supabase.auth.signOut();
      setMensaje("Este usuario está inactivo.");
      return;
    }

    const rol =
      perfil?.role ||
      data.user.user_metadata?.role ||
      "Usuario";

    const rolNormalizado = String(rol).toLowerCase();

    const rolPermitido =
      rolNormalizado.includes("tesorero") ||
      rolNormalizado.includes("tesoreria") ||
      rolNormalizado.includes("tesorería") ||
      rolNormalizado.includes("presidente") ||
      rolNormalizado.includes("admin") ||
      rolNormalizado.includes("administrador") ||
      rolNormalizado.includes("super");

    if (!rolPermitido) {
      await supabase.auth.signOut();
      setMensaje(
        "Este usuario no tiene permiso para entrar al módulo móvil de directiva."
      );
      return;
    }

    limpiarSesionesLocales();

    localStorage.setItem("condominio_id", condominioId);
    localStorage.setItem("condominio_nombre", condominioNombre);
    localStorage.setItem("condominio_logo_url", condominioLogoUrl || "");

    localStorage.setItem("usuario_admin_id", uid);
    localStorage.setItem(
      "usuario_nombre",
      data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.email ||
        "Usuario"
    );
    localStorage.setItem("usuario_rol", rol);

    router.push("/movil");
  }

  function cambiarModo(nuevoModo: ModoLogin) {
    setModo(nuevoModo);
    setMensaje("");
    setCedula("");
    setUsuario("");
    setClave("");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 flex items-center">
      <div className="max-w-md mx-auto w-full space-y-4">
        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow">
          <h1 className="text-3xl font-bold">VAM Móvil</h1>

          <p className="text-slate-300 text-sm mt-2">
            Acceso móvil para propietarios, tesorero, presidente y
            administración.
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cambiarModo("propietario")}
            className={`rounded-xl py-3 text-sm font-bold ${
              modo === "propietario"
                ? "bg-blue-700 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Propietario
          </button>

          <button
            type="button"
            onClick={() => cambiarModo("directiva")}
            className={`rounded-xl py-3 text-sm font-bold ${
              modo === "directiva"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Directiva
          </button>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
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

          {modo === "propietario" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Apartamento
                </label>

                <select
                  value={unidadId}
                  onChange={(e) => setUnidadId(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 bg-white"
                >
                  <option value="">Seleccione apartamento</option>

                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Cédula del propietario
                </label>

                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Cédula del propietario"
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>

              <button
                type="button"
                onClick={entrarPropietario}
                disabled={loading}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl py-3 font-bold"
              >
                {loading ? "Validando..." : "Entrar como propietario"}
              </button>
            </>
          )}

          {modo === "directiva" && (
            <>
              <div className="bg-slate-50 border rounded-xl p-3 text-sm text-slate-600">
                Acceso para tesorero, presidente, administrador o super
                administrador.
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Usuario
                </label>

                <input
                  type="email"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
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
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="Digite su clave"
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>

              <button
                type="button"
                onClick={entrarDirectiva}
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-950 disabled:opacity-50 text-white rounded-xl py-3 font-bold"
              >
                {loading ? "Validando..." : "Entrar como directiva"}
              </button>
            </>
          )}

          {mensaje && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 text-sm">
              {mensaje}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          VAM Administración de Condominios
        </p>
      </div>
    </main>
  );
}