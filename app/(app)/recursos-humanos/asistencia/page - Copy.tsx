"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Empleado = {
  id: number;
  numero_empleado: string;
  nombre: string;
  cargo: string;
  departamento: string;
  estado: string;
};

type Asistencia = {
  id: number;
  condominio_id: number;
  condominio: string;

  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;

  fecha: string;
  hora_entrada: string;
  hora_salida: string;

  estado: string;
  observacion: string;

  created_at: string;
};

export default function AsistenciaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [empleadoId, setEmpleadoId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [horaEntrada, setHoraEntrada] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [estado, setEstado] = useState("Presente");
  const [observacion, setObservacion] = useState("");

  const [filtroFecha, setFiltroFecha] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarEmpleados(id);
      cargarAsistencias(id, filtroFecha);
    }
  }, []);

  async function cargarEmpleados(id: string) {
    const { data, error } = await supabase
      .from("empleados")
      .select("id, numero_empleado, nombre, cargo, departamento, estado")
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando empleados: " + error.message);
      return;
    }

    setEmpleados((data as Empleado[]) || []);
  }

  async function cargarAsistencias(id: string, fechaBuscar: string) {
    setLoading(true);

    let query = supabase
      .from("rh_asistencia")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("fecha", { ascending: false })
      .order("nombre_empleado", { ascending: true });

    if (fechaBuscar) {
      query = query.eq("fecha", fechaBuscar);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando asistencia: " + error.message);
      return;
    }

    setAsistencias((data as Asistencia[]) || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setEmpleadoId("");
    setFecha(new Date().toISOString().slice(0, 10));
    setHoraEntrada("");
    setHoraSalida("");
    setEstado("Presente");
    setObservacion("");
  }

  function editarAsistencia(a: Asistencia) {
    setEditandoId(a.id);
    setEmpleadoId(String(a.empleado_id));
    setFecha(a.fecha || "");
    setHoraEntrada(a.hora_entrada || "");
    setHoraSalida(a.hora_salida || "");
    setEstado(a.estado || "Presente");
    setObservacion(a.observacion || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarAsistencia(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!empleadoId) {
      alert("Debe seleccionar un empleado.");
      return;
    }

    if (!fecha) {
      alert("Debe indicar la fecha.");
      return;
    }

    const empleado = empleados.find((emp) => String(emp.id) === empleadoId);

    if (!empleado) {
      alert("Empleado no encontrado.");
      return;
    }

    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,

      empleado_id: Number(empleadoId),
      numero_empleado: empleado.numero_empleado || "",
      nombre_empleado: empleado.nombre || "",
      cargo: empleado.cargo || "",
      departamento: empleado.departamento || "",

      fecha,
      hora_entrada: horaEntrada || null,
      hora_salida: horaSalida || null,

      estado,
      observacion: observacion.trim(),
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("rh_asistencia")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando asistencia: " + error.message);
        return;
      }

      alert("Asistencia modificada correctamente.");
      limpiarFormulario();
      cargarAsistencias(condominioId, filtroFecha);
      return;
    }

    const { error } = await supabase.from("rh_asistencia").insert([registro]);

    setGuardando(false);

    if (error) {
      alert("Error guardando asistencia: " + error.message);
      return;
    }

    alert("Asistencia registrada correctamente.");
    limpiarFormulario();
    cargarAsistencias(condominioId, filtroFecha);
  }

  async function eliminarAsistencia(a: Asistencia) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar la asistencia de ${a.nombre_empleado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_asistencia")
      .delete()
      .eq("id", a.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando asistencia: " + error.message);
      return;
    }

    alert("Asistencia eliminada correctamente.");
    cargarAsistencias(condominioId, filtroFecha);
  }

  function buscarPorFecha() {
    if (!condominioId) return;
    cargarAsistencias(condominioId, filtroFecha);
  }

  const asistenciasFiltradas = asistencias.filter((a) => {
    if (filtroEstado === "Todos") return true;
    return a.estado === filtroEstado;
  });

  const presentes = asistenciasFiltradas.filter(
    (a) => a.estado === "Presente"
  ).length;

  const tarde = asistenciasFiltradas.filter((a) => a.estado === "Tarde").length;

  const ausentes = asistenciasFiltradas.filter(
    (a) => a.estado === "Ausente"
  ).length;

  const permisos = asistenciasFiltradas.filter(
    (a) => a.estado === "Permiso"
  ).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Asistencia del Personal
        </h1>

        <p className="text-slate-500 mt-2">
          Registro diario de asistencia, entradas, salidas, tardanzas y permisos.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Registros</p>
          <h2 className="text-3xl font-black">{asistenciasFiltradas.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Presentes</p>
          <h2 className="text-3xl font-black text-green-700">{presentes}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Tarde</p>
          <h2 className="text-3xl font-black text-yellow-700">{tarde}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Ausentes</p>
          <h2 className="text-3xl font-black text-red-700">{ausentes}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Permisos</p>
          <h2 className="text-3xl font-black text-blue-700">{permisos}</h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar asistencia" : "Registrar asistencia"}
        </h2>

        <form
          onSubmit={guardarAsistencia}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Empleado *
            </label>

            <select
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Seleccione empleado</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.numero_empleado} - {emp.nombre} - {emp.cargo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Fecha *</label>

            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Hora entrada
            </label>

            <input
              type="time"
              value={horaEntrada}
              onChange={(e) => setHoraEntrada(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Hora salida
            </label>

            <input
              type="time"
              value={horaSalida}
              onChange={(e) => setHoraSalida(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="Presente">Presente</option>
              <option value="Tarde">Tarde</option>
              <option value="Ausente">Ausente</option>
              <option value="Permiso">Permiso</option>
              <option value="Licencia">Licencia</option>
              <option value="Vacaciones">Vacaciones</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Observación
            </label>

            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Comentario adicional"
            />
          </div>

          <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
            >
              {guardando
                ? "Guardando..."
                : editandoId
                ? "Guardar cambios"
                : "Guardar asistencia"}
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

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-black">Reporte de asistencia</h2>
            <p className="text-sm text-slate-500">
              Consulta los registros por fecha y estado.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="border rounded-xl px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border rounded-xl px-4 py-2 bg-white"
              >
                <option value="Todos">Todos</option>
                <option value="Presente">Presente</option>
                <option value="Tarde">Tarde</option>
                <option value="Ausente">Ausente</option>
                <option value="Permiso">Permiso</option>
                <option value="Licencia">Licencia</option>
                <option value="Vacaciones">Vacaciones</option>
              </select>
            </div>

            <button
              onClick={buscarPorFecha}
              className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold"
            >
              Buscar
            </button>
          </div>
        </div>

        {loading ? (
          <div>Cargando asistencia...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Fecha</th>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Cargo</th>
                  <th className="p-3 border text-left">Entrada</th>
                  <th className="p-3 border text-left">Salida</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-left">Observación</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {asistenciasFiltradas.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="p-3 border">{a.fecha}</td>

                    <td className="p-3 border">
                      <p className="font-bold">{a.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {a.numero_empleado}
                      </p>
                    </td>

                    <td className="p-3 border">
                      <p>{a.cargo || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {a.departamento || "-"}
                      </p>
                    </td>

                    <td className="p-3 border">{a.hora_entrada || "-"}</td>
                    <td className="p-3 border">{a.hora_salida || "-"}</td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          a.estado === "Presente"
                            ? "bg-green-100 text-green-700"
                            : a.estado === "Tarde"
                            ? "bg-yellow-100 text-yellow-700"
                            : a.estado === "Ausente"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {a.estado}
                      </span>
                    </td>

                    <td className="p-3 border">{a.observacion || "-"}</td>

                    <td className="p-3 border">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => editarAsistencia(a)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => eliminarAsistencia(a)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {asistenciasFiltradas.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={8}
                    >
                      No hay registros de asistencia para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}