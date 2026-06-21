"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type UsuarioTecnico = {
  id: number;
  user_id: string;
  condominio_id: number;
  nombre: string;
  rol: string;
  estado: string;
};

type TecnicoPerfil = {
  id: number;
  usuario_admin_id: number;
  condominio_id: number;
  telefono: string | null;
  especialidad: string | null;
  observacion: string | null;
  estado: string;
  created_at: string | null;
};

type TecnicoVista = UsuarioTecnico & {
  perfil?: TecnicoPerfil | null;
};

export default function CatalogoTecnicosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [usuariosTecnicos, setUsuariosTecnicos] = useState<UsuarioTecnico[]>([]);
  const [perfiles, setPerfiles] = useState<TecnicoPerfil[]>([]);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [editando, setEditando] = useState<TecnicoVista | null>(null);
  const [telefono, setTelefono] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [observacion, setObservacion] = useState("");
  const [estadoPerfil, setEstadoPerfil] = useState("Activo");

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const especialidades = [
    "General",
    "Gas",
    "Plomería",
    "Electricidad",
    "Bombas de agua",
    "Limpieza",
    "Mantenimiento",
    "Seguridad",
    "Jardinería",
    "Supervisión",
    "Otro",
  ];

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarTodo(id);
  }, []);

  async function cargarTodo(id: string) {
    setLoading(true);
    setMensaje("");

    await Promise.all([cargarUsuariosTecnicos(id), cargarPerfiles(id)]);

    setLoading(false);
  }

  async function cargarUsuariosTecnicos(id: string) {
    const { data, error } = await supabase
      .from("usuarios_admin")
      .select("id, user_id, condominio_id, nombre, rol, estado")
      .eq("condominio_id", Number(id))
      .eq("rol", "tecnico")
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje("Error cargando usuarios técnicos: " + error.message);
      return;
    }

    setUsuariosTecnicos((data as UsuarioTecnico[]) || []);
  }

  async function cargarPerfiles(id: string) {
    const { data, error } = await supabase
      .from("tecnicos_perfil")
      .select(
        "id, usuario_admin_id, condominio_id, telefono, especialidad, observacion, estado, created_at"
      )
      .eq("condominio_id", Number(id))
      .order("id", { ascending: false });

    if (error) {
      setMensaje("Error cargando perfiles de técnicos: " + error.message);
      return;
    }

    setPerfiles((data as TecnicoPerfil[]) || []);
  }

  const tecnicos = useMemo<TecnicoVista[]>(() => {
    return usuariosTecnicos.map((u) => {
      const perfil = perfiles.find(
        (p) => Number(p.usuario_admin_id) === Number(u.id)
      );

      return {
        ...u,
        perfil: perfil || null,
      };
    });
  }, [usuariosTecnicos, perfiles]);

  const tecnicosFiltrados = useMemo(() => {
    let lista = tecnicos;

    if (filtroEstado !== "TODOS") {
      lista = lista.filter((t) => {
        const estadoReal = t.perfil?.estado || t.estado || "Activo";
        return estadoReal === filtroEstado;
      });
    }

    if (buscar.trim()) {
      const texto = buscar.toLowerCase().trim();

      lista = lista.filter((t) => {
        const cadena = `
          ${t.id || ""}
          ${t.nombre || ""}
          ${t.rol || ""}
          ${t.estado || ""}
          ${t.perfil?.telefono || ""}
          ${t.perfil?.especialidad || ""}
          ${t.perfil?.observacion || ""}
          ${t.perfil?.estado || ""}
        `.toLowerCase();

        return cadena.includes(texto);
      });
    }

    return lista;
  }, [tecnicos, filtroEstado, buscar]);

  function editarTecnico(tecnico: TecnicoVista) {
    setEditando(tecnico);
    setTelefono(tecnico.perfil?.telefono || "");
    setEspecialidad(tecnico.perfil?.especialidad || "General");
    setObservacion(tecnico.perfil?.observacion || "");
    setEstadoPerfil(tecnico.perfil?.estado || "Activo");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicion() {
    setEditando(null);
    setTelefono("");
    setEspecialidad("");
    setObservacion("");
    setEstadoPerfil("Activo");
  }

  async function guardarPerfil(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (!editando) {
      alert("Debe seleccionar un técnico.");
      return;
    }

    if (!especialidad.trim()) {
      alert("Debe indicar la especialidad.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const payload = {
      usuario_admin_id: Number(editando.id),
      condominio_id: Number(condominioId),
      telefono: telefono.trim() || null,
      especialidad: especialidad.trim() || "General",
      observacion: observacion.trim() || null,
      estado: estadoPerfil,
    };

    if (editando.perfil?.id) {
      const { error } = await supabase
        .from("tecnicos_perfil")
        .update(payload)
        .eq("id", editando.perfil.id)
        .eq("condominio_id", Number(condominioId));

      if (error) {
        alert("Error actualizando perfil del técnico: " + error.message);
        setLoading(false);
        return;
      }

      alert("Perfil del técnico actualizado correctamente.");
    } else {
      const { error } = await supabase.from("tecnicos_perfil").insert([payload]);

      if (error) {
        alert("Error creando perfil del técnico: " + error.message);
        setLoading(false);
        return;
      }

      alert("Perfil del técnico creado correctamente.");
    }

    cancelarEdicion();
    await cargarTodo(condominioId);
    setLoading(false);
  }

  async function cambiarEstadoTecnico(tecnico: TecnicoVista, nuevoEstado: string) {
    const confirmar = confirm(
      `¿Desea cambiar el perfil de ${tecnico.nombre} a estado ${nuevoEstado}?`
    );

    if (!confirmar) return;

    setLoading(true);

    const payload = {
      usuario_admin_id: Number(tecnico.id),
      condominio_id: Number(condominioId),
      telefono: tecnico.perfil?.telefono || null,
      especialidad: tecnico.perfil?.especialidad || "General",
      observacion: tecnico.perfil?.observacion || null,
      estado: nuevoEstado,
    };

    if (tecnico.perfil?.id) {
      const { error } = await supabase
        .from("tecnicos_perfil")
        .update({ estado: nuevoEstado })
        .eq("id", tecnico.perfil.id)
        .eq("condominio_id", Number(condominioId));

      if (error) {
        alert("Error cambiando estado: " + error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.from("tecnicos_perfil").insert([payload]);

      if (error) {
        alert("Error creando perfil del técnico: " + error.message);
        setLoading(false);
        return;
      }
    }

    await cargarTodo(condominioId);
    setLoading(false);
  }

  const totalActivos = tecnicos.filter(
    (t) => (t.perfil?.estado || t.estado) === "Activo"
  ).length;

  const totalInactivos = tecnicos.filter(
    (t) => (t.perfil?.estado || t.estado) === "Inactivo"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-blue-700 uppercase tracking-wide">
                Operaciones
              </p>

              <h1 className="text-3xl font-black text-slate-900 mt-1">
                Catálogo de Técnicos
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Técnicos creados como usuarios del sistema con rol técnico. Aquí
                puede completar su perfil operativo para asignar trabajos.
              </p>

              <p className="text-sm text-blue-700 font-bold mt-3">
                Condominio activo: {condominioNombre || "No seleccionado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={() => cargarTodo(condominioId)}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Actualizar
              </button>
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-bold">
            {mensaje}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Total técnicos</p>
            <h2 className="text-3xl font-black text-slate-900">
              {tecnicos.length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Activos</p>
            <h2 className="text-3xl font-black text-green-700">
              {totalActivos}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Inactivos</p>
            <h2 className="text-3xl font-black text-red-700">
              {totalInactivos}
            </h2>
          </div>
        </section>

        {editando && (
          <section className="bg-white rounded-3xl border-2 border-blue-300 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Perfil operativo del técnico
                </h2>
                <p className="text-sm text-slate-500">
                  Técnico: <strong>{editando.nombre}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={cancelarEdicion}
                className="bg-slate-100 hover:bg-slate-200 border px-4 py-2 rounded-xl font-bold text-slate-700"
              >
                Cancelar
              </button>
            </div>

            <form
              onSubmit={guardarPerfil}
              className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
            >
              <div>
                <label className="block text-sm font-bold mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="829-000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  Especialidad
                </label>
                <select
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full bg-white"
                >
                  <option value="">Seleccione</option>
                  {especialidades.map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  Estado perfil
                </label>
                <select
                  value={estadoPerfil}
                  onChange={(e) => setEstadoPerfil(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full bg-white"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-1">
                  Observación
                </label>
                <input
                  type="text"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="Notas operativas del técnico"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-bold"
                >
                  Guardar perfil
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">Filtros</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-bold mb-1">Buscar</label>
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Buscar por nombre, teléfono, especialidad..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="TODOS">Todos</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Técnicos disponibles
              </h2>
              <p className="text-sm text-slate-500">
                Estos técnicos salen del módulo de usuarios con rol técnico.
              </p>
            </div>
          </div>

          <div className="overflow-auto border rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">ID Usuario</th>
                  <th className="p-3 border text-left">Nombre</th>
                  <th className="p-3 border text-left">Rol</th>
                  <th className="p-3 border text-left">Teléfono</th>
                  <th className="p-3 border text-left">Especialidad</th>
                  <th className="p-3 border text-left">Observación</th>
                  <th className="p-3 border text-center">Estado perfil</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {tecnicosFiltrados.map((tecnico) => {
                  const estadoReal = tecnico.perfil?.estado || tecnico.estado;

                  return (
                    <tr key={tecnico.id} className="hover:bg-slate-50">
                      <td className="p-3 border font-bold">{tecnico.id}</td>

                      <td className="p-3 border font-semibold">
                        {tecnico.nombre}
                      </td>

                      <td className="p-3 border">{tecnico.rol}</td>

                      <td className="p-3 border">
                        {tecnico.perfil?.telefono || "-"}
                      </td>

                      <td className="p-3 border">
                        {tecnico.perfil?.especialidad || "-"}
                      </td>

                      <td className="p-3 border">
                        {tecnico.perfil?.observacion || "-"}
                      </td>

                      <td className="p-3 border text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            estadoReal === "Activo"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {estadoReal}
                        </span>
                      </td>

                      <td className="p-3 border text-center">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => editarTecnico(tecnico)}
                            className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                          >
                            Editar perfil
                          </button>

                          {estadoReal === "Activo" ? (
                            <button
                              type="button"
                              onClick={() =>
                                cambiarEstadoTecnico(tecnico, "Inactivo")
                              }
                              className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                            >
                              Inactivar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                cambiarEstadoTecnico(tecnico, "Activo")
                              }
                              className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                            >
                              Activar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {tecnicosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-6 border text-center text-slate-500"
                    >
                      No hay técnicos creados para este condominio. Primero debe
                      crear un usuario con rol Técnico VAM desde Full
                      Administrador.
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