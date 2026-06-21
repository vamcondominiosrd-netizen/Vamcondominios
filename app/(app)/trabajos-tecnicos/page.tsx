"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Tecnico = {
  id: number;
  user_id: string;
  condominio_id: number;
  nombre: string;
  rol: string;
  estado: string;
};

type Incidencia = {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  no_apartamento: string | null;
  estado: string | null;
};

type TrabajoTecnico = {
  id: number;
  condominio_id: number;
  tecnico_id: number | null;
  tecnico_nombre: string | null;
  tipo_trabajo: string;
  incidencia_id: number | null;
  titulo: string;
  descripcion: string | null;
  ubicacion: string | null;
  prioridad: string;
  fecha_asignacion: string;
  fecha_limite: string | null;
  fecha_inicio: string | null;
  fecha_completado: string | null;
  fecha_revisado: string | null;
  estado: string;
  comentario_tecnico: string | null;
  evidencia_url: string | null;
  creado_por_id: number | null;
  creado_por_nombre: string | null;
  created_at: string | null;
};

export default function TrabajosTecnicosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [usuarioAdminId, setUsuarioAdminId] = useState("");

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [trabajos, setTrabajos] = useState<TrabajoTecnico[]>([]);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [tecnicoId, setTecnicoId] = useState("");
  const [tipoTrabajo, setTipoTrabajo] = useState("OPERATIVO");
  const [incidenciaId, setIncidenciaId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [prioridad, setPrioridad] = useState("Normal");
  const [fechaAsignacion, setFechaAsignacion] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [fechaLimite, setFechaLimite] = useState("");

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroTecnico, setFiltroTecnico] = useState("TODOS");

  const tiposTrabajo = ["OPERATIVO", "INCIDENCIA", "EVIDENCIA", "GAS", "OTRO"];
  const prioridades = ["Baja", "Normal", "Alta", "Urgente"];

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "";
    const usuarioId = localStorage.getItem("usuario_admin_id") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(usuario);
    setUsuarioAdminId(usuarioId);

    if (!id) {
      setMensaje("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarTodo(id);
  }, []);

  async function cargarTodo(id: string) {
    setLoading(true);
    setMensaje("");

    await Promise.all([
      cargarTecnicos(id),
      cargarIncidencias(id),
      cargarTrabajos(id),
    ]);

    setLoading(false);
  }

  async function cargarTecnicos(id: string) {
    const { data, error } = await supabase
      .from("usuarios_admin")
      .select("id, user_id, condominio_id, nombre, rol, estado")
      .eq("condominio_id", Number(id))
      .eq("rol", "tecnico")
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje("Error cargando técnicos: " + error.message);
      return;
    }

    setTecnicos((data as Tecnico[]) || []);
  }

  async function cargarIncidencias(id: string) {
    const { data, error } = await supabase
      .from("incidencias")
      .select("id, titulo, descripcion, no_apartamento, estado")
      .eq("condominio_id", Number(id))
      .not("estado", "in", '("Cerrado","Resuelto","Rechazado")')
      .order("id", { ascending: false })
      .limit(100);

    if (error) {
      setMensaje("Error cargando incidencias: " + error.message);
      return;
    }

    setIncidencias((data as Incidencia[]) || []);
  }

  async function cargarTrabajos(id: string) {
    const { data, error } = await supabase
      .from("trabajos_tecnicos")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("id", { ascending: false });

    if (error) {
      setMensaje("Error cargando trabajos técnicos: " + error.message);
      return;
    }

    setTrabajos((data as TrabajoTecnico[]) || []);
  }

  function limpiarFormulario() {
    setTecnicoId("");
    setTipoTrabajo("OPERATIVO");
    setIncidenciaId("");
    setTitulo("");
    setDescripcion("");
    setUbicacion("");
    setPrioridad("Normal");
    setFechaAsignacion(new Date().toISOString().slice(0, 10));
    setFechaLimite("");
  }

  function nombreTecnico(id?: number | null) {
    return tecnicos.find((t) => Number(t.id) === Number(id))?.nombre || "-";
  }

  function fechaDominicana(fecha?: string | null) {
    if (!fecha) return "-";

    const d = new Date(fecha);

    if (Number.isNaN(d.getTime())) return fecha;

    return d.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function colorEstado(estado?: string | null) {
    if (estado === "Asignado") return "bg-yellow-100 text-yellow-700";
    if (estado === "En proceso") return "bg-blue-100 text-blue-700";
    if (estado === "Completado") return "bg-purple-100 text-purple-700";
    if (estado === "Revisado") return "bg-green-100 text-green-700";
    if (estado === "Anulado") return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-700";
  }

  function colorPrioridad(valor?: string | null) {
    if (valor === "Urgente") return "bg-red-100 text-red-700";
    if (valor === "Alta") return "bg-orange-100 text-orange-700";
    if (valor === "Baja") return "bg-slate-100 text-slate-700";
    return "bg-blue-100 text-blue-700";
  }

  async function guardarTrabajo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (!tecnicoId) {
      alert("Debe seleccionar el técnico.");
      return;
    }

    if (!titulo.trim()) {
      alert("Debe indicar el título del trabajo.");
      return;
    }

    if (!fechaAsignacion) {
      alert("Debe indicar la fecha de asignación.");
      return;
    }

    const tecnico = tecnicos.find((t) => Number(t.id) === Number(tecnicoId));

    if (!tecnico) {
      alert("Técnico no encontrado.");
      return;
    }

    const confirmar = confirm(
      `¿Desea asignar este trabajo a ${tecnico.nombre}?`
    );

    if (!confirmar) return;

    setLoading(true);
    setMensaje("");

    const { error } = await supabase.from("trabajos_tecnicos").insert([
      {
        condominio_id: Number(condominioId),
        tecnico_id: Number(tecnicoId),
        tecnico_nombre: tecnico.nombre,
        tipo_trabajo: tipoTrabajo,
        incidencia_id: incidenciaId ? Number(incidenciaId) : null,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        ubicacion: ubicacion.trim() || null,
        prioridad,
        fecha_asignacion: fechaAsignacion,
        fecha_limite: fechaLimite || null,
        estado: "Asignado",
        creado_por_id: usuarioAdminId ? Number(usuarioAdminId) : null,
        creado_por_nombre: usuarioNombre || "Administración",
      },
    ]);

    if (error) {
      alert("Error creando trabajo técnico: " + error.message);
      setLoading(false);
      return;
    }

    alert("Trabajo técnico asignado correctamente.");
    limpiarFormulario();
    await cargarTrabajos(condominioId);
    setLoading(false);
  }

  async function cambiarEstado(trabajo: TrabajoTecnico, nuevoEstado: string) {
    const confirmar = confirm(
      `¿Desea cambiar el trabajo #${trabajo.id} a estado ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const payload: any = {
      estado: nuevoEstado,
    };

    if (nuevoEstado === "Revisado") {
      payload.fecha_revisado = new Date().toISOString();
    }

    const { error } = await supabase
      .from("trabajos_tecnicos")
      .update(payload)
      .eq("id", trabajo.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando trabajo: " + error.message);
      return;
    }

    await cargarTrabajos(condominioId);
  }

  const trabajosFiltrados = useMemo(() => {
    let lista = trabajos;

    if (filtroEstado !== "TODOS") {
      lista = lista.filter((t) => t.estado === filtroEstado);
    }

    if (filtroTecnico !== "TODOS") {
      lista = lista.filter(
        (t) => Number(t.tecnico_id) === Number(filtroTecnico)
      );
    }

    if (buscar.trim()) {
      const texto = buscar.toLowerCase().trim();

      lista = lista.filter((t) => {
        const cadena = `
          ${t.id || ""}
          ${t.tecnico_nombre || ""}
          ${t.tipo_trabajo || ""}
          ${t.titulo || ""}
          ${t.descripcion || ""}
          ${t.ubicacion || ""}
          ${t.prioridad || ""}
          ${t.estado || ""}
          ${t.comentario_tecnico || ""}
        `.toLowerCase();

        return cadena.includes(texto);
      });
    }

    return lista;
  }, [trabajos, filtroEstado, filtroTecnico, buscar]);

  const totalAsignados = trabajos.filter((t) => t.estado === "Asignado").length;
  const totalProceso = trabajos.filter((t) => t.estado === "En proceso").length;
  const totalCompletados = trabajos.filter(
    (t) => t.estado === "Completado"
  ).length;
  const totalRevisados = trabajos.filter((t) => t.estado === "Revisado").length;

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
                Trabajos Técnicos
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Asigne tareas operativas a técnicos VAM y revise los trabajos
                completados desde el celular.
              </p>

              <p className="text-sm text-blue-700 font-bold mt-3">
                Condominio activo: {condominioNombre || "No seleccionado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/catalogo-tecnicos"
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Catálogo técnicos
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

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Asignados</p>
            <h2 className="text-3xl font-black text-yellow-700">
              {totalAsignados}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">En proceso</p>
            <h2 className="text-3xl font-black text-blue-700">
              {totalProceso}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Completados</p>
            <h2 className="text-3xl font-black text-purple-700">
              {totalCompletados}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Revisados</p>
            <h2 className="text-3xl font-black text-green-700">
              {totalRevisados}
            </h2>
          </div>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">
            Nuevo trabajo técnico
          </h2>

          <form
            onSubmit={guardarTrabajo}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
          >
            <div>
              <label className="block text-sm font-bold mb-1">Técnico</label>
              <select
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="">Seleccione</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Tipo trabajo
              </label>
              <select
                value={tipoTrabajo}
                onChange={(e) => setTipoTrabajo(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                {tiposTrabajo.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            {tipoTrabajo === "INCIDENCIA" && (
              <div>
                <label className="block text-sm font-bold mb-1">
                  Incidencia relacionada
                </label>
                <select
                  value={incidenciaId}
                  onChange={(e) => setIncidenciaId(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full bg-white"
                >
                  <option value="">Seleccione</option>
                  {incidencias.map((i) => (
                    <option key={i.id} value={i.id}>
                      #{i.id} - {i.titulo || i.descripcion || "Incidencia"}{" "}
                      {i.no_apartamento ? `(${i.no_apartamento})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold mb-1">
                Prioridad
              </label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                {prioridades.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">Título</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Ej. Revisar bomba de agua"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Ubicación
              </label>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Ej. Área de bomba"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Fecha asignación
              </label>
              <input
                type="date"
                value={fechaAsignacion}
                onChange={(e) => setFechaAsignacion(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Fecha límite
              </label>
              <input
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-bold mb-1">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                rows={3}
                placeholder="Describa claramente el trabajo que debe realizar el técnico..."
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-bold w-full"
              >
                Asignar trabajo
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">Filtros</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">Buscar</label>
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Buscar por título, técnico, ubicación..."
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
                <option value="Asignado">Asignado</option>
                <option value="En proceso">En proceso</option>
                <option value="Completado">Completado</option>
                <option value="Revisado">Revisado</option>
                <option value="Anulado">Anulado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Técnico</label>
              <select
                value={filtroTecnico}
                onChange={(e) => setFiltroTecnico(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="TODOS">Todos</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">
            Trabajos asignados
          </h2>

          <div className="overflow-auto border rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">ID</th>
                  <th className="p-3 border text-left">Técnico</th>
                  <th className="p-3 border text-left">Tipo</th>
                  <th className="p-3 border text-left">Título</th>
                  <th className="p-3 border text-left">Ubicación</th>
                  <th className="p-3 border text-center">Prioridad</th>
                  <th className="p-3 border text-center">Fechas</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Evidencia</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {trabajosFiltrados.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-bold">{t.id}</td>

                    <td className="p-3 border">
                      {t.tecnico_nombre || nombreTecnico(t.tecnico_id)}
                    </td>

                    <td className="p-3 border">{t.tipo_trabajo}</td>

                    <td className="p-3 border max-w-md">
                      <p className="font-bold text-slate-900">{t.titulo}</p>
                      <p className="text-xs text-slate-500">
                        {t.descripcion || "-"}
                      </p>
                      {t.incidencia_id && (
                        <p className="text-xs font-bold text-blue-700 mt-1">
                          Incidencia #{t.incidencia_id}
                        </p>
                      )}
                    </td>

                    <td className="p-3 border">{t.ubicacion || "-"}</td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${colorPrioridad(
                          t.prioridad
                        )}`}
                      >
                        {t.prioridad}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      <p className="text-xs">
                        Asignado: {fechaDominicana(t.fecha_asignacion)}
                      </p>
                      <p className="text-xs">
                        Límite: {fechaDominicana(t.fecha_limite)}
                      </p>
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${colorEstado(
                          t.estado
                        )}`}
                      >
                        {t.estado}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      {t.evidencia_url ? (
                        <a
                          href={t.evidencia_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                        >
                          Ver evidencia
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Sin evidencia
                        </span>
                      )}
                    </td>

                    <td className="p-3 border text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        {t.estado === "Completado" && (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(t, "Revisado")}
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                          >
                            Revisar
                          </button>
                        )}

                        {t.estado !== "Anulado" && t.estado !== "Revisado" && (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(t, "Anulado")}
                            className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                          >
                            Anular
                          </button>
                        )}

                        {t.estado === "Anulado" && (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(t, "Asignado")}
                            className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                          >
                            Restaurar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {trabajosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-6 border text-center text-slate-500"
                    >
                      No hay trabajos técnicos registrados.
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