"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import ActionBar from "@/components/vam/enterprise/ActionBar";

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
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
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
    setMostrarFormulario(true);
    setNombre(item.nombre || "");
    setCargo(item.cargo || "Presidente");
    setCedula(item.cedula || "");
    setTelefono(item.telefono || "");
    setCorreo(item.correo || "");
    setFechaInicio(item.fecha_inicio || "");
    setFechaFin(item.fecha_fin || "");
    setEstado(item.estado || "Activo");
    setObservacion(item.observacion || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
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
      setMostrarFormulario(false);
      cargarDirectiva(condominioId);
      return;
    }

    const { error } = await supabase.from("directiva_condominio").insert([registro]);

    setGuardando(false);

    if (error) {
      setMensaje("Error registrando directiva: " + error.message);
      return;
    }

    setMensaje("Miembro de directiva registrado correctamente.");
    limpiarFormulario();
    setMostrarFormulario(false);
    cargarDirectiva(condominioId);
  }

  async function cambiarEstadoDirectiva(item: Directiva) {
    const nuevoEstado = item.estado === "Activo" ? "Inactivo" : "Activo";
    const confirmar = confirm(`¿Desea cambiar el estado de ${item.nombre} a ${nuevoEstado}?`);

    if (!confirmar) return;

    const { error } = await supabase
      .from("directiva_condominio")
      .update({ estado: nuevoEstado })
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error cambiando estado: " + error.message);
      return;
    }

    cargarDirectiva(condominioId);
  }

  async function borrarDirectiva(item: Directiva) {
    const confirmar = confirm(`¿Seguro que desea borrar de la directiva a ${item.nombre}?`);

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
    const confirmar = confirm(`¿Desea cambiar el usuario ${usuario.nombre} a ${nuevoEstado}?`);

    if (!confirmar) return;

    const { error } = await supabase
      .from("usuarios_admin")
      .update({ estado: nuevoEstado })
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

  const totalDirectivaActiva = directiva.filter((d) => d.estado === "Activo").length;
  const totalUsuariosActivos = usuarios.filter((u) => u.estado === "Activo").length;

  return (
    <PageContainer>
      <PageHeader
        title="Directiva y Usuarios"
        subtitle="Registro de directiva del condominio y control de usuarios administrativos."
        badge="Centro Residencial"
        icon={ShieldCheck}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("directiva")}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                tab === "directiva"
                  ? "bg-blue-700 text-white"
                  : "border bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Directiva
            </button>

            <button
              type="button"
              onClick={() => setTab("usuarios")}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                tab === "usuarios"
                  ? "bg-blue-700 text-white"
                  : "border bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Usuarios
            </button>

            <button
              type="button"
              onClick={() => {
                if (tab === "directiva") {
                  limpiarFormulario();
                  setMostrarFormulario((actual) => !actual);
                }
              }}
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
            >
              {mostrarFormulario ? "Ocultar formulario" : "+ Nueva Directiva"}
            </button>

            <button
              type="button"
              onClick={() => cargarTodo(condominioId)}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        }
      />

      {mensaje && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Miembros"
          value={directiva.length}
          subtitle="Directiva registrada"
          icon={Users}
          tone="blue"
        />

        <StatCard
          title="Directiva activa"
          value={totalDirectivaActiva}
          subtitle="Miembros activos"
          icon={CheckCircle}
          tone="green"
        />

        <StatCard
          title="Usuarios"
          value={usuarios.length}
          subtitle="Usuarios admin"
          icon={UserCog}
          tone="slate"
        />

        <StatCard
          title="Usuarios activos"
          value={totalUsuariosActivos}
          subtitle="Con acceso activo"
          icon={ShieldCheck}
          tone="blue"
        />
      </div>

      {tab === "directiva" && mostrarFormulario && (
        <SectionCard
          title={editandoId ? "Modificar miembro de directiva" : "Registrar miembro de directiva"}
          subtitle="Complete los datos del miembro o representante del condominio."
        >
          <form
            onSubmit={guardarDirectiva}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="Nombre completo *"
            />

            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
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

            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="Cédula"
            />

            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="Teléfono"
            />

            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="Correo"
            />

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>

            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />

            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />

            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm md:col-span-3"
              rows={2}
              placeholder="Observación"
            />

            <div className="flex flex-col gap-3 md:col-span-3 md:flex-row">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
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
                  onClick={() => {
                    limpiarFormulario();
                    setMostrarFormulario(false);
                  }}
                  className="rounded-xl bg-slate-600 px-5 py-3 font-bold text-white hover:bg-slate-700"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard
        title={tab === "directiva" ? "Directiva registrada" : "Usuarios del sistema"}
        subtitle={`Condominio activo: ${condominioNombre || "No seleccionado"}`}
      >
        <ActionBar
          search={buscar}
          onSearch={setBuscar}
          placeholder={
            tab === "directiva"
              ? "Buscar directiva, cargo, cédula, teléfono..."
              : "Buscar usuario, rol o estado..."
          }
        >
          <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            <Search className="h-4 w-4" />
            {tab === "directiva"
              ? `${directivaFiltrada.length} registros`
              : `${usuariosFiltrados.length} usuarios`}
          </div>
        </ActionBar>

        <div className="mt-4 overflow-x-auto rounded-2xl border">
          {tab === "directiva" ? (
            loading ? (
              <div className="p-6 text-sm text-slate-500">Cargando directiva...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Cargo</th>
                    <th className="px-4 py-3 text-left">Contacto</th>
                    <th className="px-4 py-3 text-left">Período</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acción</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {directivaFiltrada.map((d) => (
                    <tr key={d.id} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{d.nombre}</p>
                        <p className="text-xs text-slate-500">
                          Cédula: {d.cedula || "-"}
                        </p>
                      </td>

                      <td className="px-4 py-3 font-semibold">{d.cargo}</td>

                      <td className="px-4 py-3">
                        <p>{d.telefono || "-"}</p>
                        <p className="text-xs text-slate-500">{d.correo || "-"}</p>
                      </td>

                      <td className="px-4 py-3">
                        <p>{d.fecha_inicio || "-"}</p>
                        <p className="text-xs text-slate-500">
                          Hasta: {d.fecha_fin || "-"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
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
                            className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => cambiarEstadoDirectiva(d)}
                            className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800"
                          >
                            {d.estado === "Activo" ? "Inactivar" : "Activar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => borrarDirectiva(d)}
                            className="rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800"
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {directivaFiltrada.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No hay miembros de directiva registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">{u.nombre}</td>
                    <td className="px-4 py-3">{u.rol}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
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
                            ? "rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800"
                            : "rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                        }
                      >
                        {u.estado === "Activo" ? "Inactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}

                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No hay usuarios administrativos registrados para este condominio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </SectionCard>
    </PageContainer>
  );
}