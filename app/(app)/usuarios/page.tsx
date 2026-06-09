"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Directiva = {
  id: number;
  condominio_id: number;
  nombre: string;
  cargo: string;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  observacion: string | null;
  created_at: string;
};

type UsuarioAdmin = {
  id: number;
  user_id: string | null;
  condominio_id: number;
  nombre: string;
  rol: string;
  estado: string;
};

export default function DirectivaUsuariosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [tab, setTab] = useState<"directiva" | "usuarios">("directiva");

  const [directiva, setDirectiva] = useState<Directiva[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [buscar, setBuscar] = useState("");

  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("Presidente");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [estado, setEstado] = useState("Activo");
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreActivo = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombreActivo);

    if (!id) {
      setMensaje("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarTodo(id);
  }, []);

  async function cargarTodo(id: string) {
    await Promise.all([cargarDirectiva(id), cargarUsuarios(id)]);
  }

  async function cargarDirectiva(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("directiva_condominio")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando directiva: " + error.message);
      return;
    }

    setDirectiva((data as Directiva[]) || []);
  }

  async function cargarUsuarios(id: string) {
    const { data, error } = await supabase
      .from("usuarios_admin")
      .select("id, user_id, condominio_id, nombre, rol, estado")
      .eq("condominio_id", Number(id))
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje("Error cargando usuarios: " + error.message);
      return;
    }

    setUsuarios((data as UsuarioAdmin[]) || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setCargo("Presidente");
    setCedula("");
    setTelefono("");
    setCorreo("");
    setFechaInicio("");
    setFechaFin("");
    setEstado("Activo");
    setObservacion("");
  }

  function editarDirectiva(item: Directiva) {
    setEditandoId(item.id);
    setNombre(item.nombre || "");
    setCargo(item.cargo || "Presidente");
    setCedula(item.cedula || "");
    setTelefono(item.telefono || "");
    setCorreo(item.correo || "");
    setFechaInicio(item.fecha_inicio || "");
    setFechaFin(item.fecha_fin || "");
    setEstado(item.estado || "Activo");
    setObservacion(item.observacion || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function guardarDirectiva(e: React.FormEvent) {
    e.preventDefault();
    setMensaje("");

    if (!condominioId) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    if (!nombre.trim()) {
      setMensaje("Debe indicar el nombre del miembro de la directiva.");
      return;
    }

    if (!cargo.trim()) {
      setMensaje("Debe indicar el cargo.");
      return;
    }

    setGuardando(true);

    const registro = {
      condominio_id: Number(condominioId),
      nombre: nombre.trim(),
      cargo: cargo.trim(),
      cedula: cedula.trim() || null,
      telefono: telefono.trim() || null,
      correo: correo.trim() || null,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      estado,
      observacion: observacion.trim() || null,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("directiva_condominio")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        setMensaje("Error actualizando directiva: " + error.message);
        return;
      }

      setMensaje("Miembro de directiva actualizado correctamente.");
      limpiarFormulario();
      cargarDirectiva(condominioId);
      return;
    }

    const { error } = await supabase
      .from("directiva_condominio")
      .insert([registro]);

    setGuardando(false);

    if (error) {
      setMensaje("Error registrando directiva: " + error.message);
      return;
    }

    setMensaje("Miembro de directiva registrado correctamente.");
    limpiarFormulario();
    cargarDirectiva(condominioId);
  }

  async function cambiarEstadoDirectiva(item: Directiva) {
    const nuevoEstado = item.estado === "Activo" ? "Inactivo" : "Activo";

    const confirmar = confirm(
      `¿Desea cambiar el estado de ${item.nombre} a ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("directiva_condominio")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error cambiando estado: " + error.message);
      return;
    }

    cargarDirectiva(condominioId);
  }

  async function borrarDirectiva(item: Directiva) {
    const confirmar = confirm(
      `¿Seguro que desea borrar de la directiva a ${item.nombre}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("directiva_condominio")
      .delete()
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error borrando directiva: " + error.message);
      return;
    }

    setMensaje("Registro borrado correctamente.");
    cargarDirectiva(condominioId);
  }

  async function cambiarEstadoUsuario(usuario: UsuarioAdmin) {
    const nuevoEstado = usuario.estado === "Activo" ? "Inactivo" : "Activo";

    const confirmar = confirm(
      `¿Desea cambiar el usuario ${usuario.nombre} a ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("usuarios_admin")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", usuario.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error actualizando usuario: " + error.message);
      return;
    }

    cargarUsuarios(condominioId);
  }

  const directivaFiltrada = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    if (!texto) return directiva;

    return directiva.filter((d) => {
      const combinado = `
        ${d.nombre || ""}
        ${d.cargo || ""}
        ${d.cedula || ""}
        ${d.telefono || ""}
        ${d.correo || ""}
        ${d.estado || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [directiva, buscar]);

  const usuariosFiltrados = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    if (!texto) return usuarios;

    return usuarios.filter((u) => {
      const combinado = `
        ${u.nombre || ""}
        ${u.rol || ""}
        ${u.estado || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [usuarios, buscar]);

  const totalDirectivaActiva = directiva.filter(
    (d) => d.estado === "Activo"
  ).length;

  const totalUsuariosActivos = usuarios.filter(
    (u) => u.estado === "Activo"
  ).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Directiva y Usuarios
        </h1>

        <p className="text-slate-500 mt-2">
          Registro de directiva del condominio y control de usuarios administrativos.
        </p>

        <p className="text-sm text-blue-700 font-bold mt-3">
          Condominio activo: {condominioNombre || "No seleccionado"}
        </p>
      </div>

      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Miembros directiva</p>
          <h2 className="text-3xl font-black">{directiva.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Directiva activa</p>
          <h2 className="text-3xl font-black text-green-700">
            {totalDirectivaActiva}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Usuarios</p>
          <h2 className="text-3xl font-black">{usuarios.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Usuarios activos</p>
          <h2 className="text-3xl font-black text-blue-700">
            {totalUsuariosActivos}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("directiva")}
              className={`px-4 py-2 rounded-xl font-bold ${
                tab === "directiva"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Directiva
            </button>

            <button
              type="button"
              onClick={() => setTab("usuarios")}
              className={`px-4 py-2 rounded-xl font-bold ${
                tab === "usuarios"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Usuarios del sistema
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full md:w-96"
              placeholder="Buscar..."
            />
          </div>
        </div>
      </div>

      {tab === "directiva" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <h2 className="text-xl font-black mb-4">
              {editandoId ? "Modificar miembro de directiva" : "Registrar miembro de directiva"}
            </h2>

            <form
              onSubmit={guardarDirectiva}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Nombre completo *
                </label>

                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="Nombre del miembro"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Cargo *
                </label>

                <select
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full bg-white"
                >
                  <option value="Presidente">Presidente</option>
                  <option value="Vicepresidente">Vicepresidente</option>
                  <option value="Tesorero">Tesorero</option>
                  <option value="Secretario">Secretario</option>
                  <option value="Vocal">Vocal</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Representante">Representante</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Cédula
                </label>

                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="000-0000000-0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Teléfono
                </label>

                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="809-000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Correo
                </label>

                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Estado
                </label>

                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full bg-white"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Fecha inicio
                </label>

                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Fecha fin
                </label>

                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-semibold mb-1">
                  Observación
                </label>

                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  rows={3}
                  placeholder="Observaciones adicionales"
                />
              </div>

              <div className="md:col-span-3 flex flex-col md:flex-row gap-3">
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
                >
                  {guardando
                    ? "Guardando..."
                    : editandoId
                    ? "Guardar cambios"
                    : "Guardar directiva"}
                </button>

                {editandoId && (
                  <button
                    type="button"
                    onClick={limpiarFormulario}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold"
                  >
                    Cancelar edición
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <h2 className="text-xl font-black mb-4">
              Directiva registrada
            </h2>

            {loading ? (
              <p>Cargando directiva...</p>
            ) : (
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Nombre</th>
                      <th className="px-4 py-3 text-left">Cargo</th>
                      <th className="px-4 py-3 text-left">Teléfono</th>
                      <th className="px-4 py-3 text-left">Correo</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {directivaFiltrada.map((d) => (
                      <tr key={d.id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-bold">{d.nombre}</p>
                          <p className="text-xs text-slate-500">
                            Cédula: {d.cedula || "-"}
                          </p>
                        </td>

                        <td className="px-4 py-3">{d.cargo}</td>

                        <td className="px-4 py-3">{d.telefono || "-"}</td>

                        <td className="px-4 py-3">{d.correo || "-"}</td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              d.estado === "Activo"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {d.estado}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => editarDirectiva(d)}
                              className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => cambiarEstadoDirectiva(d)}
                              className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                            >
                              {d.estado === "Activo" ? "Inactivar" : "Activar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => borrarDirectiva(d)}
                              className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                            >
                              Borrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {directivaFiltrada.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No hay miembros de directiva registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "usuarios" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-black">Usuarios del sistema</h2>

              <p className="text-sm text-slate-500">
                Estos son los usuarios administrativos asociados al condominio activo.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-sm max-w-xl">
              La creación de usuarios con correo y clave se manejará desde el
              panel Full Administrador para garantizar seguridad.
            </div>
          </div>

          <div className="overflow-x-auto border rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-3 font-bold">{u.nombre}</td>

                    <td className="px-4 py-3">{u.rol}</td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          u.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {u.estado}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => cambiarEstadoUsuario(u)}
                        className={
                          u.estado === "Activo"
                            ? "bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                            : "bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                        }
                      >
                        {u.estado === "Activo" ? "Inactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}

                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay usuarios administrativos registrados para este condominio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}