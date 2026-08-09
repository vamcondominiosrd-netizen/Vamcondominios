"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  CircleDollarSign,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Package,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Settings,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";
import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

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
  const [errorModal, setErrorModal] = useState("");

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
    setErrorModal("");
  }

  function cerrarCrear() {
    setMostrarCrear(false);
    setFormCrear(FORMULARIO_CREAR_VACIO);
    setErrorModal("");
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
    setErrorModal("");
  }

  function cerrarEdicion() {
    setUsuarioSeleccionado(null);
    setFormEditar(null);
    setErrorModal("");
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
      setErrorModal("Debe completar nombre, correo y clave temporal.");
      return;
    }

    if (password.length < 8) {
      setErrorModal("La clave temporal debe tener al menos 8 caracteres.");
      return;
    }

    if (formCrear.rolIds.length === 0) {
      setErrorModal("Debe seleccionar al menos un rol.");
      return;
    }

    setGuardando(true);
    setMensaje("");
    setError("");
    setErrorModal("");

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
      setErrorModal(err?.message || "No fue posible crear el usuario.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarCambiosUsuario() {
    if (!condominioId || !formEditar) return;

    if (!formEditar.nombre.trim()) {
      setErrorModal("El nombre del usuario es obligatorio.");
      return;
    }

    if (formEditar.rolIds.length === 0) {
      setErrorModal("Debe seleccionar al menos un rol.");
      return;
    }

    setActualizando(true);
    setMensaje("");
    setError("");
    setErrorModal("");

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
      setErrorModal(err?.message || "No fue posible actualizar el usuario.");
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
    <>
      <PageContainer>
        <ModuleMenu
          title="Configuración"
          subtitle="Parámetros, módulos, usuarios, roles y accesos del condominio."
          tone="slate"
          items={[
            {
              href: "/configuracion",
              label: "Inicio configuración",
              icon: LayoutDashboard,
            },
            {
              href: "/consulta-estado/configuracion-cargos",
              label: "Cargos y generación",
              icon: CircleDollarSign,
            },
            {
              href: "/configuracion/tipos-cargos",
              label: "Tipos de cargos",
              icon: Settings,
            },
            {
              href: "/configuracion/configuracion-usuarios-sistema/modulos",
              label: "Módulos habilitados",
              icon: Package,
            },
            {
              href: "/configuracion/configuracion-usuarios-sistema/usuarios",
              label: "Usuarios y accesos",
              icon: Users,
            },
            {
              href: "/configuracion/configuracion-usuarios-sistema/roles",
              label: "Roles y permisos",
              icon: ShieldCheck,
            },
          ]}
        />

        <ModuleToolbar
          title="Usuarios y Accesos"
          subtitle={`Creación, asignación de roles y control de acceso. Condominio: ${
            condominioNombre || "No seleccionado"
          }.`}
          icon={Users}
          actions={
            <ModuleActions
              onRefresh={() =>
                condominioId ? cargarDatos(condominioId) : undefined
              }
              extra={
                <button
                  type="button"
                  onClick={abrirCrear}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                >
                  <UserPlus className="h-4 w-4" />
                  Crear usuario
                </button>
              }
            />
          }
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
          <InfoBox
            label="Usuarios registrados"
            value={`${usuarios.length}`}
            tone="slate"
          />
          <InfoBox
            label="Usuarios activos"
            value={`${usuariosActivos}`}
            tone="emerald"
          />
          <InfoBox
            label="Usuarios inactivos"
            value={`${usuariosInactivos}`}
            tone="amber"
          />
          <InfoBox
            label="Condominio activo"
            value={condominioNombre || "No seleccionado"}
            tone="blue"
            compact
          />
        </div>

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

        <SectionCard
          title="Personal autorizado"
          subtitle="Usuarios asociados al condominio, sus roles y el estado de acceso."
          action={
            cargando ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando
              </div>
            ) : (
              <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                Registros: {usuariosFiltrados.length}
              </div>
            )
          }
        >
          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Buscar por nombre, correo o rol..."
              />
            </div>
          </div>

          {cargando ? (
            <p className="text-sm text-slate-500">Cargando usuarios...</p>
          ) : !condominioId ? (
            <EmptyState
              title="Condominio no identificado"
              description="No se encontró un condominio activo. Debe iniciar sesión nuevamente."
            />
          ) : usuariosFiltrados.length === 0 ? (
            <EmptyState
              title="Sin usuarios"
              description="No hay usuarios registrados o no coinciden con la búsqueda."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Correo</th>
                  <th className="px-4 py-3 text-left">Roles</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.user_id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => seleccionarUsuario(usuario)}
                        className="flex items-center gap-3 text-left"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-black text-blue-700">
                          {usuario.nombre.slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          <span className="block font-black text-slate-900">
                            {usuario.nombre}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {usuario.rol_condominio || "Sin rol principal"}
                          </span>
                        </span>
                      </button>
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {usuario.correo || "Sin correo registrado"}
                    </td>

                    <td className="px-4 py-3">
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

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                          usuario.activo
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {usuario.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => seleccionarUsuario(usuario)}
                          className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
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
                              : "bg-emerald-700 hover:bg-emerald-800"
                          }`}
                        >
                          {usuario.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </SectionCard>

        <SectionCard
          title="Flujo recomendado"
          subtitle="Orden sugerido para administrar usuarios y permisos de forma segura."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <FlujoPaso
              numero="1"
              titulo="Crear roles"
              descripcion="Defina primero los roles y permisos necesarios para el condominio."
            />
            <FlujoPaso
              numero="2"
              titulo="Crear usuario"
              descripcion="Registre el correo, la clave temporal y los datos del personal."
            />
            <FlujoPaso
              numero="3"
              titulo="Asignar accesos"
              descripcion="Seleccione uno o varios roles según sus responsabilidades."
            />
            <FlujoPaso
              numero="4"
              titulo="Supervisar"
              descripcion="Active, desactive y revise periódicamente los accesos vigentes."
            />
          </div>
        </SectionCard>
      </PageContainer>

{mostrarCrear && (
  <Modal titulo="Crear usuario" onCerrar={cerrarCrear}>
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Se creará una cuenta de acceso y se asociará únicamente al
        condominio actual.
      </div>

      {errorModal && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <X className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{errorModal}</span>
        </div>
      )}

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

      {errorModal && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <X className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{errorModal}</span>
        </div>
      )}

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
    </>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
  compact = false,
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber" | "blue";
  compact?: boolean;
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 border-blue-100"
          : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2
        className={`mt-2 font-black ${
          compact ? "truncate text-lg" : "text-2xl"
        }`}
        title={value}
      >
        {value}
      </h2>
    </div>
  );
}

function FlujoPaso({
  numero,
  titulo,
  descripcion,
}: {
  numero: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white">
        {numero}
      </div>
      <p className="font-black text-slate-900">{titulo}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {descripcion}
      </p>
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
