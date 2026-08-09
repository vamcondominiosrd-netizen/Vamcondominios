"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

type RolDisponible = {
  id: number;
  empresa_id: number;
  condominio_id: number | null;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
  activo: boolean;
};

type RolUsuario = {
  asignacion_id: number;
  id: number;
  nombre: string;
  condominio_id: number | null;
  es_sistema: boolean;
};

type UsuarioCondominio = {
  acceso_id: number;
  user_id: string;
  nombre: string;
  correo: string | null;
  rol_global: string | null;
  rol_condominio: string | null;
  activo: boolean;
  roles: RolUsuario[];
  created_at: string | null;
};

type RespuestaApi = {
  ok: boolean;
  error?: string;
  mensaje?: string;
  usuarios?: UsuarioCondominio[];
  roles?: RolDisponible[];
  user_id?: string;
};

type FormularioCrear = {
  nombre: string;
  email: string;
  telefono: string;
  password: string;
  rolIds: number[];
};

type FormularioEditar = {
  userId: string;
  nombre: string;
  correo: string;
  activo: boolean;
  rolIds: number[];
};

const FORMULARIO_CREAR_VACIO: FormularioCrear = {
  nombre: "",
  email: "",
  telefono: "",
  password: "",
  rolIds: [],
};

export default function UsuariosAccesosPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominioNombre, setCondominioNombre] = useState("");

  const [usuarios, setUsuarios] = useState<UsuarioCondominio[]>([]);
  const [roles, setRoles] = useState<RolDisponible[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [actualizando, setActualizando] = useState(false);

  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState<UsuarioCondominio | null>(null);

  const [formCrear, setFormCrear] = useState<FormularioCrear>(
    FORMULARIO_CREAR_VACIO
  );
  const [formEditar, setFormEditar] = useState<FormularioEditar | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const id = Number(localStorage.getItem("condominio_id") || 0);
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre);
    void cargarDatos(id);
  }, [router]);

  async function obtenerToken() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("La sesión expiró. Inicie sesión nuevamente.");
    }

    return session.access_token;
  }

  async function solicitudApi(
    url: string,
    opciones: RequestInit = {}
  ): Promise<RespuestaApi> {
    const token = await obtenerToken();

    const response = await fetch(url, {
      ...opciones,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(opciones.headers || {}),
      },
    });

    const resultado = (await response.json()) as RespuestaApi;

    if (!response.ok || !resultado.ok) {
      throw new Error(
        resultado.error || "No fue posible completar la operación."
      );
    }

    return resultado;
  }

  async function cargarDatos(id: number, conservarSeleccion = true) {
    setCargando(true);
    setError("");

    try {
      const resultado = await solicitudApi(
        `/api/configuracion/usuarios?condominio_id=${id}`
      );

      const nuevosUsuarios = resultado.usuarios || [];
      const nuevosRoles = resultado.roles || [];

      setUsuarios(nuevosUsuarios);
      setRoles(nuevosRoles);

      if (conservarSeleccion && usuarioSeleccionado) {
        const actualizado = nuevosUsuarios.find(
          (usuario) => usuario.user_id === usuarioSeleccionado.user_id
        );

        if (actualizado) {
          seleccionarUsuario(actualizado);
        } else {
          cerrarEdicion();
        }
      }
    } catch (err: any) {
      setError(err?.message || "No fue posible cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  }

  function abrirCrear() {
    setMostrarCrear(true);
    setUsuarioSeleccionado(null);
    setFormEditar(null);
    setFormCrear(FORMULARIO_CREAR_VACIO);
    setMensaje("");
    setError("");
  }

  function cerrarCrear() {
    setMostrarCrear(false);
    setFormCrear(FORMULARIO_CREAR_VACIO);
  }

  function seleccionarUsuario(usuario: UsuarioCondominio) {
    setMostrarCrear(false);
    setUsuarioSeleccionado(usuario);
    setFormEditar({
      userId: usuario.user_id,
      nombre: usuario.nombre || "",
      correo: usuario.correo || "",
      activo: usuario.activo === true,
      rolIds: (usuario.roles || []).map((rol) => Number(rol.id)),
    });
    setMensaje("");
    setError("");
  }

  function cerrarEdicion() {
    setUsuarioSeleccionado(null);
    setFormEditar(null);
  }

  function alternarRolCrear(rolId: number) {
    setFormCrear((actual) => ({
      ...actual,
      rolIds: actual.rolIds.includes(rolId)
        ? actual.rolIds.filter((id) => id !== rolId)
        : [...actual.rolIds, rolId],
    }));
  }

  function alternarRolEditar(rolId: number) {
    setFormEditar((actual) => {
      if (!actual) return actual;

      return {
        ...actual,
        rolIds: actual.rolIds.includes(rolId)
          ? actual.rolIds.filter((id) => id !== rolId)
          : [...actual.rolIds, rolId],
      };
    });
  }

  async function crearUsuario() {
    if (!condominioId) return;

    const nombre = formCrear.nombre.trim();
    const email = formCrear.email.trim().toLowerCase();
    const password = formCrear.password;

    if (!nombre || !email || !password) {
      setError("Debe completar nombre, correo y clave temporal.");
      return;
    }

    if (password.length < 8) {
      setError("La clave temporal debe tener al menos 8 caracteres.");
      return;
    }

    if (formCrear.rolIds.length === 0) {
      setError("Debe seleccionar al menos un rol.");
      return;
    }

    setGuardando(true);
    setMensaje("");
    setError("");

    try {
      const resultado = await solicitudApi("/api/configuracion/usuarios", {
        method: "POST",
        body: JSON.stringify({
          condominio_id: condominioId,
          nombre,
          email,
          telefono: formCrear.telefono.trim() || null,
          password,
          rol_ids: formCrear.rolIds,
        }),
      });

      setMensaje(resultado.mensaje || "Usuario creado correctamente.");
      cerrarCrear();
      await cargarDatos(condominioId, false);
    } catch (err: any) {
      setError(err?.message || "No fue posible crear el usuario.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarCambiosUsuario() {
    if (!condominioId || !formEditar) return;

    if (!formEditar.nombre.trim()) {
      setError("El nombre del usuario es obligatorio.");
      return;
    }

    if (formEditar.rolIds.length === 0) {
      setError("Debe seleccionar al menos un rol.");
      return;
    }

    setActualizando(true);
    setMensaje("");
    setError("");

    try {
      const resultado = await solicitudApi("/api/configuracion/usuarios", {
        method: "PATCH",
        body: JSON.stringify({
          condominio_id: condominioId,
          user_id: formEditar.userId,
          nombre: formEditar.nombre.trim(),
          activo: formEditar.activo,
          rol_ids: formEditar.rolIds,
        }),
      });

      setMensaje(resultado.mensaje || "Usuario actualizado correctamente.");
      await cargarDatos(condominioId, true);
    } catch (err: any) {
      setError(err?.message || "No fue posible actualizar el usuario.");
    } finally {
      setActualizando(false);
    }
  }

  async function cambiarEstadoUsuario(usuario: UsuarioCondominio) {
    if (!condominioId) return;

    const nuevoEstado = !usuario.activo;
    const accion = nuevoEstado ? "activar" : "desactivar";

    const confirmado = window.confirm(
      `¿Desea ${accion} el acceso de ${usuario.nombre}?`
    );

    if (!confirmado) return;

    setActualizando(true);
    setMensaje("");
    setError("");

    try {
      const resultado = await solicitudApi("/api/configuracion/usuarios", {
        method: "PATCH",
        body: JSON.stringify({
          condominio_id: condominioId,
          user_id: usuario.user_id,
          activo: nuevoEstado,
        }),
      });

      setMensaje(resultado.mensaje || "Estado actualizado correctamente.");
      await cargarDatos(condominioId, true);
    } catch (err: any) {
      setError(err?.message || "No fue posible cambiar el estado.");
    } finally {
      setActualizando(false);
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return usuarios;

    return usuarios.filter((usuario) => {
      const rolesTexto = (usuario.roles || [])
        .map((rol) => rol.nombre)
        .join(" ")
        .toLowerCase();

      return (
        usuario.nombre.toLowerCase().includes(texto) ||
        String(usuario.correo || "")
          .toLowerCase()
          .includes(texto) ||
        rolesTexto.includes(texto)
      );
    });
  }, [usuarios, busqueda]);

  const usuariosActivos = usuarios.filter((usuario) => usuario.activo).length;
  const usuariosInactivos = usuarios.length - usuariosActivos;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100">
                <Users className="h-8 w-8 text-blue-700" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-700">
                  Seguridad y accesos
                </p>
                <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">
                  Usuarios y accesos
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Administre el personal autorizado para trabajar en{" "}
                  <strong>{condominioNombre || "el condominio actual"}</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => condominioId && cargarDatos(condominioId)}
                disabled={cargando}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`}
                />
                Actualizar
              </button>

              <button
                type="button"
                onClick={abrirCrear}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
              >
                <UserPlus className="h-4 w-4" />
                Crear usuario
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ResumenCard
            titulo="Usuarios registrados"
            valor={usuarios.length}
            detalle="Accesos del condominio"
            icono={Users}
            tono="blue"
          />
          <ResumenCard
            titulo="Usuarios activos"
            valor={usuariosActivos}
            detalle="Con acceso permitido"
            icono={UserCheck}
            tono="green"
          />
          <ResumenCard
            titulo="Usuarios inactivos"
            valor={usuariosInactivos}
            detalle="Acceso bloqueado"
            icono={UserX}
            tono="red"
          />
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            <X className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mensaje && (
          <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
            <Check className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{mensaje}</span>
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Personal autorizado
              </h2>
              <p className="text-sm text-slate-500">
                Seleccione un usuario para modificar roles o estado.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar usuario o rol..."
                className="w-full bg-transparent py-2.5 text-sm outline-none md:w-64"
              />
            </div>
          </div>

          {cargando ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando usuarios...
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 font-black text-slate-700">
                No hay usuarios para mostrar
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Cree el primer usuario administrativo del condominio.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 text-left">Usuario</th>
                    <th className="px-5 py-3 text-left">Correo</th>
                    <th className="px-5 py-3 text-left">Roles</th>
                    <th className="px-5 py-3 text-center">Estado</th>
                    <th className="px-5 py-3 text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {usuariosFiltrados.map((usuario) => (
                    <tr
                      key={usuario.user_id}
                      className="bg-white hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => seleccionarUsuario(usuario)}
                          className="flex items-center gap-3 text-left"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-black text-blue-700">
                            {usuario.nombre.slice(0, 1).toUpperCase()}
                          </span>

                          <span>
                            <span className="block font-black text-slate-800">
                              {usuario.nombre}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {usuario.rol_condominio || "Sin rol principal"}
                            </span>
                          </span>
                        </button>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {usuario.correo || "Sin correo registrado"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(usuario.roles || []).length > 0 ? (
                            usuario.roles.map((rol) => (
                              <span
                                key={`${usuario.user_id}-${rol.id}`}
                                className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700"
                              >
                                {rol.nombre}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs font-semibold text-red-600">
                              Sin roles asignados
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            usuario.activo
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {usuario.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => seleccionarUsuario(usuario)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            Editar
                            <ChevronRight className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => cambiarEstadoUsuario(usuario)}
                            disabled={actualizando}
                            className={`rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                              usuario.activo
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-green-700 hover:bg-green-800"
                            }`}
                          >
                            {usuario.activo ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {mostrarCrear && (
        <Modal titulo="Crear usuario" onCerrar={cerrarCrear}>
          <div className="space-y-5">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              Se creará una cuenta de acceso y se asociará únicamente al
              condominio actual.
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo
                etiqueta="Nombre completo"
                valor={formCrear.nombre}
                onChange={(valor) =>
                  setFormCrear((actual) => ({ ...actual, nombre: valor }))
                }
                placeholder="Nombre del usuario"
              />

              <Campo
                etiqueta="Correo electrónico"
                tipo="email"
                valor={formCrear.email}
                onChange={(valor) =>
                  setFormCrear((actual) => ({ ...actual, email: valor }))
                }
                placeholder="correo@dominio.com"
              />

              <Campo
                etiqueta="Teléfono"
                valor={formCrear.telefono}
                onChange={(valor) =>
                  setFormCrear((actual) => ({ ...actual, telefono: valor }))
                }
                placeholder="809-000-0000"
              />

              <Campo
                etiqueta="Clave temporal"
                tipo="password"
                valor={formCrear.password}
                onChange={(valor) =>
                  setFormCrear((actual) => ({ ...actual, password: valor }))
                }
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <SelectorRoles
              roles={roles}
              seleccionados={formCrear.rolIds}
              onAlternar={alternarRolCrear}
            />

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={cerrarCrear}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={crearUsuario}
                disabled={guardando}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {guardando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Crear usuario
              </button>
            </div>
          </div>
        </Modal>
      )}

      {usuarioSeleccionado && formEditar && (
        <Modal titulo="Editar usuario" onCerrar={cerrarEdicion}>
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-500">
                Correo de acceso
              </p>
              <p className="mt-1 font-bold text-slate-800">
                {formEditar.correo || "Sin correo registrado"}
              </p>
            </div>

            <Campo
              etiqueta="Nombre completo"
              valor={formEditar.nombre}
              onChange={(valor) =>
                setFormEditar((actual) =>
                  actual ? { ...actual, nombre: valor } : actual
                )
              }
              placeholder="Nombre del usuario"
            />

            <div>
              <label className="mb-2 block text-sm font-black text-slate-700">
                Estado del acceso
              </label>

              <select
                value={formEditar.activo ? "activo" : "inactivo"}
                onChange={(event) =>
                  setFormEditar((actual) =>
                    actual
                      ? {
                          ...actual,
                          activo: event.target.value === "activo",
                        }
                      : actual
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <SelectorRoles
              roles={roles}
              seleccionados={formEditar.rolIds}
              onAlternar={alternarRolEditar}
            />

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={cerrarEdicion}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardarCambiosUsuario}
                disabled={actualizando}
                className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {actualizando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar cambios
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

function ResumenCard({
  titulo,
  valor,
  detalle,
  icono: Icono,
  tono,
}: {
  titulo: string;
  valor: number;
  detalle: string;
  icono: any;
  tono: "blue" | "green" | "red";
}) {
  const estilos = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{titulo}</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{valor}</p>
          <p className="mt-1 text-xs text-slate-500">{detalle}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${estilos[tono]}`}
        >
          <Icono className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function Campo({
  etiqueta,
  valor,
  onChange,
  placeholder,
  tipo = "text",
}: {
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  tipo?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {etiqueta}
      </label>
      <input
        type={tipo}
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function SelectorRoles({
  roles,
  seleccionados,
  onAlternar,
}: {
  roles: RolDisponible[];
  seleccionados: number[];
  onAlternar: (rolId: number) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-violet-700" />
        <div>
          <p className="font-black text-slate-800">Roles asignados</p>
          <p className="text-xs text-slate-500">
            Seleccione uno o varios roles para este usuario.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {roles.map((rol) => {
          const seleccionado = seleccionados.includes(Number(rol.id));

          return (
            <button
              key={rol.id}
              type="button"
              onClick={() => onAlternar(Number(rol.id))}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                seleccionado
                  ? "border-green-300 bg-green-50"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                  seleccionado
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {seleccionado && <Check className="h-3.5 w-3.5" />}
              </span>

              <span>
                <span className="block font-black text-slate-800">
                  {rol.nombre}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {rol.descripcion ||
                    (rol.condominio_id === null
                      ? "Rol global de la empresa"
                      : "Rol del condominio")}
                </span>
              </span>
            </button>
          );
        })}

        {roles.length === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 md:col-span-2">
            No hay roles activos disponibles. Cree primero un rol en Roles y
            permisos.
          </div>
        )}
      </div>
    </div>
  );
}

function Modal({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <KeyRound className="h-5 w-5 text-blue-700" />
            </div>
            <h2 className="text-xl font-black text-slate-900">{titulo}</h2>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 md:p-6">{children}</div>
      </div>
    </div>
  );
}
