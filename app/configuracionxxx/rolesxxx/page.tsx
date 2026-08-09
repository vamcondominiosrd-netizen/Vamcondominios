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
  Trash2,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

type Permiso = {
  id: number;
  codigo: string;
  modulo: string;
  descripcion: string | null;
  activo: boolean;
};

type Rol = {
  id: number;
  empresa_id: number;
  condominio_id: number | null;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
  activo: boolean;
  editable: boolean;
  permiso_ids: number[];
  created_at?: string | null;
  updated_at?: string | null;
};

type RespuestaRoles = {
  ok: boolean;
  error?: string;
  mensaje?: string;
  roles?: Rol[];
  permisos?: Permiso[];
  empresa_id?: number;
  condominio_id?: number;
  puede_administrar_todos_los_permisos?: boolean;
};

type FormularioRol = {
  id: number | null;
  nombre: string;
  descripcion: string;
  activo: boolean;
  permisoIds: number[];
  editable: boolean;
  esSistema: boolean;
  condominioId: number | null;
};

const FORMULARIO_VACIO: FormularioRol = {
  id: null,
  nombre: "",
  descripcion: "",
  activo: true,
  permisoIds: [],
  editable: true,
  esSistema: false,
  condominioId: null,
};

export default function RolesPermisosPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominioNombre, setCondominioNombre] = useState("");
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [formulario, setFormulario] =
    useState<FormularioRol>(FORMULARIO_VACIO);
  const [creando, setCreando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [busquedaRol, setBusquedaRol] = useState("");
  const [busquedaPermiso, setBusquedaPermiso] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [modulosAbiertos, setModulosAbiertos] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const id = Number(localStorage.getItem("condominio_id") || 0);
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre);
    void cargarRoles(id);
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
  ): Promise<RespuestaRoles> {
    const token = await obtenerToken();

    const response = await fetch(url, {
      ...opciones,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(opciones.headers || {}),
      },
    });

    const resultado = (await response.json()) as RespuestaRoles;

    if (!response.ok || !resultado.ok) {
      throw new Error(
        resultado.error || "No fue posible completar la operación."
      );
    }

    return resultado;
  }

  async function cargarRoles(id: number, seleccionarId?: number | null) {
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const resultado = await solicitudApi(
        `/api/configuracion/roles?condominio_id=${id}`
      );

      const nuevosRoles = resultado.roles || [];
      const nuevosPermisos = resultado.permisos || [];

      setRoles(nuevosRoles);
      setPermisos(nuevosPermisos);

      const todosLosModulos = new Set(
        nuevosPermisos.map((permiso) => permiso.modulo || "General")
      );
      setModulosAbiertos(todosLosModulos);

      if (creando && seleccionarId === undefined) {
        return;
      }

      const rolSeleccionado =
        nuevosRoles.find((rol) => rol.id === seleccionarId) ||
        nuevosRoles.find((rol) => rol.id === formulario.id) ||
        nuevosRoles[0];

      if (rolSeleccionado) {
        seleccionarRol(rolSeleccionado);
      } else {
        nuevoRol();
      }
    } catch (err: any) {
      setError(err?.message || "No fue posible cargar los roles.");
    } finally {
      setCargando(false);
    }
  }

  function seleccionarRol(rol: Rol) {
    setCreando(false);
    setFormulario({
      id: rol.id,
      nombre: rol.nombre || "",
      descripcion: rol.descripcion || "",
      activo: rol.activo !== false,
      permisoIds: Array.isArray(rol.permiso_ids) ? rol.permiso_ids : [],
      editable: rol.editable === true,
      esSistema: rol.es_sistema === true,
      condominioId: rol.condominio_id,
    });
    setMensaje("");
    setError("");
  }

  function nuevoRol() {
    setCreando(true);
    setFormulario({
      ...FORMULARIO_VACIO,
      condominioId,
    });
    setMensaje("");
    setError("");
  }

  const rolesFiltrados = useMemo(() => {
    const texto = busquedaRol.trim().toLowerCase();

    if (!texto) return roles;

    return roles.filter(
      (rol) =>
        rol.nombre.toLowerCase().includes(texto) ||
        String(rol.descripcion || "")
          .toLowerCase()
          .includes(texto)
    );
  }, [roles, busquedaRol]);

  const permisosFiltrados = useMemo(() => {
    const texto = busquedaPermiso.trim().toLowerCase();

    if (!texto) return permisos;

    return permisos.filter(
      (permiso) =>
        permiso.codigo.toLowerCase().includes(texto) ||
        permiso.modulo.toLowerCase().includes(texto) ||
        String(permiso.descripcion || "")
          .toLowerCase()
          .includes(texto)
    );
  }, [permisos, busquedaPermiso]);

  const permisosPorModulo = useMemo(() => {
    const grupos = new Map<string, Permiso[]>();

    for (const permiso of permisosFiltrados) {
      const modulo = permiso.modulo || "General";
      const actuales = grupos.get(modulo) || [];
      actuales.push(permiso);
      grupos.set(modulo, actuales);
    }

    return Array.from(grupos.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "es")
    );
  }, [permisosFiltrados]);

  function alternarModulo(modulo: string) {
    setModulosAbiertos((actuales) => {
      const nuevos = new Set(actuales);

      if (nuevos.has(modulo)) {
        nuevos.delete(modulo);
      } else {
        nuevos.add(modulo);
      }

      return nuevos;
    });
  }

  function alternarPermiso(permisoId: number) {
    if (!formulario.editable) return;

    setFormulario((actual) => {
      const existe = actual.permisoIds.includes(permisoId);

      return {
        ...actual,
        permisoIds: existe
          ? actual.permisoIds.filter((id) => id !== permisoId)
          : [...actual.permisoIds, permisoId],
      };
    });
  }

  function marcarModulo(permisosModulo: Permiso[], seleccionar: boolean) {
    if (!formulario.editable) return;

    const idsModulo = permisosModulo.map((permiso) => permiso.id);

    setFormulario((actual) => {
      const base = actual.permisoIds.filter((id) => !idsModulo.includes(id));

      return {
        ...actual,
        permisoIds: seleccionar ? [...base, ...idsModulo] : base,
      };
    });
  }

  async function guardarRol() {
    if (!condominioId) return;

    const nombre = formulario.nombre.trim();

    if (nombre.length < 3) {
      setError("El nombre del rol debe tener al menos 3 caracteres.");
      return;
    }

    if (!formulario.editable) {
      setError("Los roles globales del sistema son de consulta.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const cuerpo = {
        condominio_id: condominioId,
        nombre,
        descripcion: formulario.descripcion.trim() || null,
        activo: formulario.activo,
        permiso_ids: formulario.permisoIds,
        ...(formulario.id ? { rol_id: formulario.id } : {}),
      };

      const resultado = await solicitudApi("/api/configuracion/roles", {
        method: formulario.id ? "PATCH" : "POST",
        body: JSON.stringify(cuerpo),
      });

      const rolGuardadoId = resultado.rol?.id || formulario.id || null;

      setMensaje(
        resultado.mensaje ||
          (formulario.id
            ? "Rol actualizado correctamente."
            : "Rol creado correctamente.")
      );
      setCreando(false);
      await cargarRoles(condominioId, rolGuardadoId);
    } catch (err: any) {
      setError(err?.message || "No fue posible guardar el rol.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarRol() {
    if (!condominioId || !formulario.id || !formulario.editable) return;

    const confirmado = window.confirm(
      `¿Desea eliminar el rol "${formulario.nombre}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    setEliminando(true);
    setError("");
    setMensaje("");

    try {
      const resultado = await solicitudApi(
        `/api/configuracion/roles?condominio_id=${condominioId}&rol_id=${formulario.id}`,
        { method: "DELETE" }
      );

      setMensaje(resultado.mensaje || "Rol eliminado correctamente.");
      setFormulario(FORMULARIO_VACIO);
      await cargarRoles(condominioId);
    } catch (err: any) {
      setError(err?.message || "No fue posible eliminar el rol.");
    } finally {
      setEliminando(false);
    }
  }

  const totalSeleccionados = formulario.permisoIds.length;
  const esSoloLectura = !formulario.editable;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100">
                <ShieldCheck className="h-8 w-8 text-blue-700" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-700">
                  Seguridad y accesos
                </p>
                <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">
                  Roles y permisos
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Configure qué funciones puede utilizar cada tipo de usuario en{" "}
                  <strong>{condominioNombre || "el condominio actual"}</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => condominioId && cargarRoles(condominioId)}
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
                onClick={nuevoRol}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
              >
                <Plus className="h-4 w-4" />
                Nuevo rol
              </button>
            </div>
          </div>
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

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-black text-slate-900">Roles</h2>
                  <p className="text-xs text-slate-500">
                    {roles.length} rol(es) disponibles
                  </p>
                </div>
                <Users className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={busquedaRol}
                  onChange={(event) => setBusquedaRol(event.target.value)}
                  placeholder="Buscar rol..."
                  className="w-full bg-transparent py-2.5 text-sm outline-none"
                />
              </div>
            </div>

            <div className="max-h-[690px] overflow-y-auto p-2">
              {cargando ? (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Cargando roles...
                </div>
              ) : (
                <>
                  {creando && (
                    <button
                      type="button"
                      className="mb-2 flex w-full items-center justify-between rounded-2xl bg-blue-700 px-4 py-3 text-left text-white"
                    >
                      <span>
                        <span className="block font-black">Nuevo rol</span>
                        <span className="block text-xs text-blue-100">
                          Sin guardar
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}

                  {rolesFiltrados.map((rol) => {
                    const seleccionado =
                      !creando && formulario.id === Number(rol.id);

                    return (
                      <button
                        key={rol.id}
                        type="button"
                        onClick={() => seleccionarRol(rol)}
                        className={`mb-2 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                          seleccionado
                            ? "border-blue-700 bg-blue-50"
                            : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-black text-slate-800">
                            {rol.nombre}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span
                              className={`rounded-full px-2 py-0.5 font-bold ${
                                rol.activo
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {rol.activo ? "Activo" : "Inactivo"}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
                              {rol.condominio_id === null
                                ? "Global"
                                : "Condominio"}
                            </span>
                          </span>
                        </span>

                        <ChevronRight
                          className={`h-5 w-5 shrink-0 ${
                            seleccionado
                              ? "text-blue-700"
                              : "text-slate-300"
                          }`}
                        />
                      </button>
                    );
                  })}

                  {rolesFiltrados.length === 0 && !creando && (
                    <div className="p-8 text-center text-sm text-slate-500">
                      No se encontraron roles.
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>

          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">
                      {creando
                        ? "Crear nuevo rol"
                        : formulario.nombre || "Seleccione un rol"}
                    </h2>

                    {esSoloLectura && formulario.id && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                        Rol global · Solo consulta
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {totalSeleccionados} permiso(s) seleccionado(s)
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {formulario.id && formulario.editable && (
                    <button
                      type="button"
                      onClick={eliminarRol}
                      disabled={eliminando || guardando}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      {eliminando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Eliminar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={guardarRol}
                    disabled={
                      guardando ||
                      eliminando ||
                      esSoloLectura ||
                      !formulario.nombre.trim()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {guardando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {formulario.id ? "Guardar cambios" : "Crear rol"}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Nombre del rol
                  </label>
                  <input
                    value={formulario.nombre}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        nombre: event.target.value,
                      }))
                    }
                    disabled={esSoloLectura}
                    placeholder="Ej. Encargado de cobros"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Estado
                  </label>
                  <select
                    value={formulario.activo ? "activo" : "inactivo"}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        activo: event.target.value === "activo",
                      }))
                    }
                    disabled={esSoloLectura}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Descripción
                  </label>
                  <textarea
                    value={formulario.descripcion}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        descripcion: event.target.value,
                      }))
                    }
                    disabled={esSoloLectura}
                    rows={3}
                    placeholder="Explique qué responsabilidad tendrá este rol."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5 md:p-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100">
                      <KeyRound className="h-6 w-6 text-violet-700" />
                    </div>
                    <div>
                      <h2 className="font-black text-slate-900">
                        Matriz de permisos
                      </h2>
                      <p className="text-sm text-slate-500">
                        Seleccione las acciones autorizadas para este rol.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      value={busquedaPermiso}
                      onChange={(event) =>
                        setBusquedaPermiso(event.target.value)
                      }
                      placeholder="Buscar permiso..."
                      className="w-full bg-transparent py-2.5 text-sm outline-none lg:w-64"
                    />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                {permisosPorModulo.map(([modulo, permisosModulo]) => {
                  const abierto = modulosAbiertos.has(modulo);
                  const seleccionadosModulo = permisosModulo.filter((permiso) =>
                    formulario.permisoIds.includes(permiso.id)
                  ).length;
                  const todosSeleccionados =
                    permisosModulo.length > 0 &&
                    seleccionadosModulo === permisosModulo.length;

                  return (
                    <div key={modulo}>
                      <div className="flex flex-col justify-between gap-3 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:px-6">
                        <button
                          type="button"
                          onClick={() => alternarModulo(modulo)}
                          className="flex items-center gap-3 text-left"
                        >
                          <ChevronRight
                            className={`h-5 w-5 text-slate-500 transition ${
                              abierto ? "rotate-90" : ""
                            }`}
                          />
                          <span>
                            <span className="block font-black text-slate-800">
                              {modulo}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {seleccionadosModulo} de {permisosModulo.length}{" "}
                              seleccionados
                            </span>
                          </span>
                        </button>

                        {formulario.editable && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                marcarModulo(permisosModulo, true)
                              }
                              disabled={todosSeleccionados}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                            >
                              Marcar todos
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                marcarModulo(permisosModulo, false)
                              }
                              disabled={seleccionadosModulo === 0}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                            >
                              Limpiar
                            </button>
                          </div>
                        )}
                      </div>

                      {abierto && (
                        <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-3">
                          {permisosModulo.map((permiso) => {
                            const seleccionado =
                              formulario.permisoIds.includes(permiso.id);

                            return (
                              <button
                                key={permiso.id}
                                type="button"
                                onClick={() => alternarPermiso(permiso.id)}
                                disabled={esSoloLectura}
                                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                                  seleccionado
                                    ? "border-green-300 bg-green-50"
                                    : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                                } disabled:cursor-default`}
                              >
                                <span
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                    seleccionado
                                      ? "border-green-600 bg-green-600 text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {seleccionado && (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </span>

                                <span className="min-w-0">
                                  <span className="block break-words text-sm font-black text-slate-800">
                                    {permiso.descripcion || permiso.codigo}
                                  </span>
                                  <span className="mt-1 block break-all text-[11px] font-semibold text-slate-500">
                                    {permiso.codigo}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!cargando && permisosPorModulo.length === 0 && (
                  <div className="p-10 text-center text-sm text-slate-500">
                    No se encontraron permisos con el filtro indicado.
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
