"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  PlusCircle,
  Users,
  LogOut,
  ArrowRight,
  RefreshCcw,
  UserPlus,
  KeyRound,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type Condominio = {
  id: number;
  nombre: string;
  logo_url: string | null;
  rnc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  estado?: string | null;
};

type UsuarioAdmin = {
  id: number;
  user_id: string;
  condominio_id: number;
  nombre: string;
  rol: string;
  estado: string;
};

export default function SuperAdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [superNombre, setSuperNombre] = useState("");

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);

  const [nombre, setNombre] = useState("");
  const [rnc, setRnc] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [usuarioCondominioId, setUsuarioCondominioId] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [usuarioClave, setUsuarioClave] = useState("");
  const [usuarioRol, setUsuarioRol] = useState("admin");

  useEffect(() => {
    validarAcceso();
  }, []);

  async function validarAcceso() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/super-login");
      return;
    }

    const { data: superData, error } = await supabase
      .from("super_admins")
      .select("id, nombre, activo")
      .eq("user_id", userData.user.id)
      .eq("activo", true)
      .maybeSingle();

    if (error || !superData) {
      await supabase.auth.signOut();
      router.push("/super-login");
      return;
    }

    setSuperNombre(superData.nombre || "Full Administrador");

    await cargarTodo();

    setLoading(false);
  }

  async function cargarTodo() {
    await Promise.all([cargarCondominios(), cargarUsuarios()]);
  }

  async function cargarCondominios() {
    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre, logo_url, rnc, direccion, telefono, estado")
      .order("id", { ascending: true });

    if (error) {
      setMensaje("Error cargando condominios: " + error.message);
      return;
    }

    setCondominios(data || []);
  }

  async function cargarUsuarios() {
    const { data, error } = await supabase
      .from("usuarios_admin")
      .select("id, user_id, condominio_id, nombre, rol, estado")
      .order("id", { ascending: false });

    if (error) {
      setMensaje("Error cargando usuarios: " + error.message);
      return;
    }

    setUsuarios(data || []);
  }

  async function crearCondominio(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre.trim()) {
      setMensaje("Debe indicar el nombre del condominio.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    const { error } = await supabase.from("condominios").insert([
      {
        nombre: nombre.trim(),
        rnc: rnc.trim() || null,
        direccion: direccion.trim() || null,
        telefono: telefono.trim() || null,
        logo_url: logoUrl.trim() || null,
        estado: "Activo",
      },
    ]);

    setGuardando(false);

    if (error) {
      setMensaje("Error creando condominio: " + error.message);
      return;
    }

    alert("Condominio creado correctamente.");

    setNombre("");
    setRnc("");
    setDireccion("");
    setTelefono("");
    setLogoUrl("");

    cargarCondominios();
  }

  async function crearUsuarioSaaS(e: React.FormEvent) {
    e.preventDefault();

    if (
      !usuarioCondominioId ||
      !usuarioNombre.trim() ||
      !usuarioEmail.trim() ||
      !usuarioClave.trim() ||
      !usuarioRol.trim()
    ) {
      setMensaje(
        "Debe completar condominio, nombre, correo, clave temporal y rol."
      );
      return;
    }

    if (usuarioClave.length < 6) {
      setMensaje("La clave temporal debe tener al menos 6 caracteres.");
      return;
    }

    const confirmar = confirm(
      `¿Desea crear este usuario y asociarlo al condominio?\n\nNombre: ${usuarioNombre}\nCorreo: ${usuarioEmail}\nRol: ${usuarioRol}`
    );

    if (!confirmar) return;

    setGuardando(true);
    setMensaje("");

    const response = await fetch("/api/super-admin/crear-usuario", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        condominio_id: Number(usuarioCondominioId),
        nombre: usuarioNombre.trim(),
        email: usuarioEmail.trim(),
        password: usuarioClave,
        rol: usuarioRol,
        estado: "Activo",
      }),
    });

    const result = await response.json();

    setGuardando(false);

    if (!response.ok || !result.ok) {
      setMensaje(result.error || "No se pudo crear el usuario.");
      return;
    }

    alert("Usuario creado y asociado correctamente.");

    setUsuarioCondominioId("");
    setUsuarioNombre("");
    setUsuarioEmail("");
    setUsuarioClave("");
    setUsuarioRol("admin");

    cargarUsuarios();
  }

  function entrarAlCondominio(condominio: Condominio) {
    localStorage.setItem("condominio_id", String(condominio.id));
    localStorage.setItem("condominio_nombre", condominio.nombre || "");
    localStorage.setItem("condominio_logo_url", condominio.logo_url || "");
    localStorage.setItem("usuario_rol", "super_admin");
    localStorage.setItem("usuario_nombre", superNombre || "Full Administrador");

    router.push("/dashboard");
  }

  async function cambiarEstadoUsuario(usuario: UsuarioAdmin) {
    const nuevoEstado = usuario.estado === "Activo" ? "Inactivo" : "Activo";

    const confirmar = confirm(
      `¿Desea cambiar el estado del usuario ${usuario.nombre} a ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("usuarios_admin")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", usuario.id);

    if (error) {
      alert("Error actualizando usuario: " + error.message);
      return;
    }

    cargarUsuarios();
  }

  async function cambiarPasswordUsuario(usuario: UsuarioAdmin) {
    const nuevaClave = prompt(
      `Digite la nueva clave temporal para ${usuario.nombre}:`
    );

    if (!nuevaClave) return;

    if (nuevaClave.length < 6) {
      alert("La clave debe tener al menos 6 caracteres.");
      return;
    }

    const confirmar = confirm(
      `¿Desea cambiar la clave del usuario ${usuario.nombre}?`
    );

    if (!confirmar) return;

    setGuardando(true);
    setMensaje("");

    const response = await fetch("/api/super-admin/cambiar-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: usuario.user_id,
        password: nuevaClave,
      }),
    });

    const result = await response.json();

    setGuardando(false);

    if (!response.ok || !result.ok) {
      setMensaje(result.error || "No se pudo cambiar la clave.");
      return;
    }

    alert("Clave actualizada correctamente.");
  }

  async function cerrarSesion() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_admin_id");
    localStorage.removeItem("super_admin_id");

    await supabase.auth.signOut();

    router.push("/login");
  }

  function nombreCondominio(id: number) {
    const condominio = condominios.find((c) => Number(c.id) === Number(id));
    return condominio?.nombre || `Condominio ${id}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-6">
          Validando acceso Full Administrador...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-2xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Panel Global SaaS
              </p>

              <h1 className="text-3xl font-black text-slate-900 mt-1">
                Full Administrador
              </h1>

              <p className="text-sm text-slate-500 mt-2">
                Bienvenido, {superNombre}. Desde aquí puede crear condominios,
                crear usuarios, cambiar claves y asociarlos a cada condominio.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={cargarTodo}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-3 rounded-xl font-bold flex items-center gap-2"
              >
                <RefreshCcw className="h-5 w-5" />
                Actualizar
              </button>

              <button
                type="button"
                onClick={cerrarSesion}
                className="bg-red-700 hover:bg-red-800 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2"
              >
                <LogOut className="h-5 w-5" />
                Salir
              </button>
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
            {mensaje}
          </div>
        )}

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                <PlusCircle className="h-7 w-7 text-blue-700" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Crear nuevo condominio
                </h2>
                <p className="text-sm text-slate-500">
                  Setting inicial del condominio.
                </p>
              </div>
            </div>

            <form onSubmit={crearCondominio} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nombre del condominio
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Ej. Colinas del Oeste Lote 4"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    RNC
                  </label>
                  <input
                    type="text"
                    value={rnc}
                    onChange={(e) => setRnc(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="RNC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="Teléfono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Dirección"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  URL del logo
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="https://..."
                />
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white rounded-xl px-5 py-3 font-bold"
              >
                {guardando ? "Guardando..." : "Crear condominio"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <UserPlus className="h-7 w-7 text-emerald-700" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Crear usuario por condominio
                </h2>
                <p className="text-sm text-slate-500">
                  Crea el usuario en Auth y lo asocia al condominio.
                </p>
              </div>
            </div>

            <form onSubmit={crearUsuarioSaaS} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Condominio
                </label>

                <select
                  value={usuarioCondominioId}
                  onChange={(e) => setUsuarioCondominioId(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 bg-white"
                >
                  <option value="">Seleccione condominio</option>

                  {condominios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nombre completo
                </label>

                <input
                  type="text"
                  value={usuarioNombre}
                  onChange={(e) => setUsuarioNombre(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Nombre del usuario"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Correo electrónico
                </label>

                <input
                  type="email"
                  value={usuarioEmail}
                  onChange={(e) => setUsuarioEmail(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="correo@dominio.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Clave temporal
                </label>

                <input
                  type="password"
                  value={usuarioClave}
                  onChange={(e) => setUsuarioClave(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Rol
                </label>

                <select
                  value={usuarioRol}
                  onChange={(e) => setUsuarioRol(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 bg-white"
                >
                  <option value="admin">Admin</option>
                  <option value="administrador">Administrador</option>
                  <option value="presidente">Presidente</option>
                  <option value="tesorero">Tesorero</option>
                  <option value="secretario">Secretario</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl px-5 py-3 font-bold"
              >
                {guardando ? "Creando usuario..." : "Crear usuario"}
              </button>
            </form>
          </div>
        </section>

        <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-slate-700" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Condominios registrados
              </h2>
              <p className="text-sm text-slate-500">
                Listado general de condominios del sistema.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Logo</th>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">RNC</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {condominios.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">{c.id}</td>

                    <td className="px-4 py-3">
                      {c.logo_url ? (
                        <img
                          src={c.logo_url}
                          alt={c.nombre}
                          className="h-10 w-10 rounded-xl object-contain border bg-white p-1"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-slate-500" />
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 font-semibold">{c.nombre}</td>

                    <td className="px-4 py-3">{c.rnc || "-"}</td>

                    <td className="px-4 py-3">{c.telefono || "-"}</td>

                    <td className="px-4 py-3">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                        {c.estado || "Activo"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => entrarAlCondominio(c)}
                        className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                      >
                        Entrar
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {condominios.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay condominios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <Users className="h-7 w-7 text-emerald-700" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Usuarios por condominio
              </h2>
              <p className="text-sm text-slate-500">
                Usuarios administrativos asociados a condominios.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Condominio</th>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">{u.id}</td>

                    <td className="px-4 py-3">
                      {nombreCondominio(u.condominio_id)}
                    </td>

                    <td className="px-4 py-3 font-semibold">{u.nombre}</td>

                    <td className="px-4 py-3">{u.rol}</td>

                    <td className="px-4 py-3">
                      <span
                        className={
                          u.estado === "Activo"
                            ? "bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"
                            : "bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"
                        }
                      >
                        {u.estado}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-wrap gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => cambiarPasswordUsuario(u)}
                          className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1"
                        >
                          <KeyRound className="h-4 w-4" />
                          Cambiar clave
                        </button>

                        <button
                          type="button"
                          onClick={() => cambiarEstadoUsuario(u)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                        >
                          {u.estado === "Activo" ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {usuarios.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay usuarios administrativos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}