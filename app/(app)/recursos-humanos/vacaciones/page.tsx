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

type VacacionPermiso = {
  id: number;
  condominio_id: number;
  condominio: string;

  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;

  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  cantidad_dias: number;

  estado: string;
  motivo: string;
  observacion: string;

  aprobado_por: string;
  fecha_aprobacion: string;

  created_at: string;
};

const tiposSolicitud = [
  "Vacaciones",
  "Permiso",
  "Licencia",
  "Ausencia justificada",
  "Permiso médico",
  "Permiso personal",
];

const estadosSolicitud = ["Pendiente", "Aprobado", "Rechazado"];

export default function VacacionesPermisosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [solicitudes, setSolicitudes] = useState<VacacionPermiso[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [empleadoId, setEmpleadoId] = useState("");
  const [tipo, setTipo] = useState("Vacaciones");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [cantidadDias, setCantidadDias] = useState(1);
  const [estado, setEstado] = useState("Pendiente");
  const [motivo, setMotivo] = useState("");
  const [observacion, setObservacion] = useState("");

  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "Administración";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(usuario);

    if (id) {
      cargarEmpleados(id);
      cargarSolicitudes(id);
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

  async function cargarSolicitudes(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("rh_vacaciones_permisos")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando vacaciones/permisos: " + error.message);
      return;
    }

    setSolicitudes((data as VacacionPermiso[]) || []);
  }

  function calcularDias(inicio: string, fin: string) {
    if (!inicio || !fin) return 1;

    const fecha1 = new Date(`${inicio}T00:00:00`);
    const fecha2 = new Date(`${fin}T00:00:00`);

    const diferencia = fecha2.getTime() - fecha1.getTime();
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24)) + 1;

    return dias > 0 ? dias : 1;
  }

  function manejarFechaInicio(valor: string) {
    setFechaInicio(valor);
    setCantidadDias(calcularDias(valor, fechaFin));
  }

  function manejarFechaFin(valor: string) {
    setFechaFin(valor);
    setCantidadDias(calcularDias(fechaInicio, valor));
  }

  function limpiarFormulario() {
    setEditandoId(null);

    setEmpleadoId("");
    setTipo("Vacaciones");
    setFechaInicio("");
    setFechaFin("");
    setCantidadDias(1);
    setEstado("Pendiente");
    setMotivo("");
    setObservacion("");
  }

  function editarSolicitud(solicitud: VacacionPermiso) {
    setEditandoId(solicitud.id);

    setEmpleadoId(String(solicitud.empleado_id));
    setTipo(solicitud.tipo || "Vacaciones");
    setFechaInicio(solicitud.fecha_inicio || "");
    setFechaFin(solicitud.fecha_fin || "");
    setCantidadDias(Number(solicitud.cantidad_dias || 1));
    setEstado(solicitud.estado || "Pendiente");
    setMotivo(solicitud.motivo || "");
    setObservacion(solicitud.observacion || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarSolicitud(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!empleadoId) {
      alert("Debe seleccionar un empleado.");
      return;
    }

    if (!tipo) {
      alert("Debe seleccionar el tipo de solicitud.");
      return;
    }

    if (!fechaInicio) {
      alert("Debe indicar la fecha de inicio.");
      return;
    }

    if (!fechaFin) {
      alert("Debe indicar la fecha fin.");
      return;
    }

    const diasCalculados = calcularDias(fechaInicio, fechaFin);

    if (diasCalculados <= 0) {
      alert("La fecha fin no puede ser menor que la fecha de inicio.");
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

      tipo,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      cantidad_dias: diasCalculados,

      estado,
      motivo: motivo.trim(),
      observacion: observacion.trim(),

      aprobado_por:
        estado === "Aprobado" || estado === "Rechazado" ? usuarioNombre : null,
      fecha_aprobacion:
        estado === "Aprobado" || estado === "Rechazado"
          ? new Date().toISOString().slice(0, 10)
          : null,
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("rh_vacaciones_permisos")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando solicitud: " + error.message);
        return;
      }

      alert("Solicitud modificada correctamente.");
      limpiarFormulario();
      cargarSolicitudes(condominioId);
      return;
    }

    const { error } = await supabase
      .from("rh_vacaciones_permisos")
      .insert([registro]);

    setGuardando(false);

    if (error) {
      alert("Error guardando solicitud: " + error.message);
      return;
    }

    alert("Solicitud registrada correctamente.");
    limpiarFormulario();
    cargarSolicitudes(condominioId);
  }

  async function actualizarEstado(
    solicitud: VacacionPermiso,
    nuevoEstado: string
  ) {
    const confirmar = confirm(
      `¿Desea cambiar esta solicitud a "${nuevoEstado}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_vacaciones_permisos")
      .update({
        estado: nuevoEstado,
        aprobado_por:
          nuevoEstado === "Aprobado" || nuevoEstado === "Rechazado"
            ? usuarioNombre
            : null,
        fecha_aprobacion:
          nuevoEstado === "Aprobado" || nuevoEstado === "Rechazado"
            ? new Date().toISOString().slice(0, 10)
            : null,
      })
      .eq("id", solicitud.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    alert("Estado actualizado correctamente.");
    cargarSolicitudes(condominioId);
  }

  async function eliminarSolicitud(solicitud: VacacionPermiso) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar la solicitud de ${solicitud.nombre_empleado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_vacaciones_permisos")
      .delete()
      .eq("id", solicitud.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando solicitud: " + error.message);
      return;
    }

    alert("Solicitud eliminada correctamente.");
    cargarSolicitudes(condominioId);
  }

  const solicitudesFiltradas = solicitudes.filter((s) => {
    const cumpleEstado = filtroEstado === "Todos" || s.estado === filtroEstado;
    const cumpleTipo = filtroTipo === "Todos" || s.tipo === filtroTipo;

    return cumpleEstado && cumpleTipo;
  });

  const pendientes = solicitudes.filter((s) => s.estado === "Pendiente").length;
  const aprobadas = solicitudes.filter((s) => s.estado === "Aprobado").length;
  const rechazadas = solicitudes.filter((s) => s.estado === "Rechazado").length;

  const diasAprobados = solicitudes
    .filter((s) => s.estado === "Aprobado")
    .reduce((sum, s) => sum + Number(s.cantidad_dias || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Vacaciones / Permisos
        </h1>

        <p className="text-slate-500 mt-2">
          Control de vacaciones, permisos, licencias y ausencias justificadas del
          personal.
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
          <p className="text-sm text-slate-500">Solicitudes</p>
          <h2 className="text-3xl font-black">{solicitudes.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pendientes</p>
          <h2 className="text-3xl font-black text-yellow-700">
            {pendientes}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Aprobadas</p>
          <h2 className="text-3xl font-black text-green-700">{aprobadas}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Rechazadas</p>
          <h2 className="text-3xl font-black text-red-700">{rechazadas}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Días aprobados</p>
          <h2 className="text-3xl font-black text-blue-700">
            {diasAprobados}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar solicitud" : "Registrar solicitud"}
        </h2>

        <form
          onSubmit={guardarSolicitud}
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
            <label className="block text-sm font-semibold mb-1">
              Tipo de solicitud *
            </label>

            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {tiposSolicitud.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha inicio *
            </label>

            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => manejarFechaInicio(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha fin *
            </label>

            <input
              type="date"
              value={fechaFin}
              onChange={(e) => manejarFechaFin(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Cantidad de días
            </label>

            <input
              value={cantidadDias}
              readOnly
              className="border rounded-xl px-4 py-3 w-full bg-slate-100 font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {estadosSolicitud.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">Motivo</label>

            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Motivo de la solicitud"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Observación administrativa
            </label>

            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Observaciones internas"
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
                : "Guardar solicitud"}
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
            <h2 className="text-xl font-black">Listado de solicitudes</h2>

            <p className="text-sm text-slate-500">
              Solicitudes registradas para el personal del condominio activo.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Tipo
              </label>

              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="border rounded-xl px-4 py-2 bg-white"
              >
                <option value="Todos">Todos</option>

                {tiposSolicitud.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
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

                {estadosSolicitud.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div>Cargando solicitudes...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Tipo</th>
                  <th className="p-3 border text-left">Fechas</th>
                  <th className="p-3 border text-center">Días</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-left">Motivo</th>
                  <th className="p-3 border text-left">Aprobación</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {solicitudesFiltradas.map((solicitud) => (
                  <tr key={solicitud.id} className="hover:bg-slate-50">
                    <td className="p-3 border">
                      <p className="font-bold">{solicitud.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {solicitud.numero_empleado} · {solicitud.cargo || "-"}
                      </p>
                    </td>

                    <td className="p-3 border font-bold">{solicitud.tipo}</td>

                    <td className="p-3 border">
                      <p>Desde: {solicitud.fecha_inicio}</p>
                      <p className="text-xs text-slate-500">
                        Hasta: {solicitud.fecha_fin}
                      </p>
                    </td>

                    <td className="p-3 border text-center font-black">
                      {solicitud.cantidad_dias}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          solicitud.estado === "Aprobado"
                            ? "bg-green-100 text-green-700"
                            : solicitud.estado === "Rechazado"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {solicitud.estado}
                      </span>
                    </td>

                    <td className="p-3 border">
                      <p>{solicitud.motivo || "-"}</p>

                      {solicitud.observacion && (
                        <p className="text-xs text-slate-500 mt-1">
                          Obs.: {solicitud.observacion}
                        </p>
                      )}
                    </td>

                    <td className="p-3 border">
                      {solicitud.aprobado_por ? (
                        <>
                          <p className="font-bold">{solicitud.aprobado_por}</p>
                          <p className="text-xs text-slate-500">
                            {solicitud.fecha_aprobacion || "-"}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-400">Pendiente</span>
                      )}
                    </td>

                    <td className="p-3 border">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => editarSolicitud(solicitud)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        {solicitud.estado !== "Aprobado" && (
                          <button
                            onClick={() =>
                              actualizarEstado(solicitud, "Aprobado")
                            }
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Aprobar
                          </button>
                        )}

                        {solicitud.estado !== "Rechazado" && (
                          <button
                            onClick={() =>
                              actualizarEstado(solicitud, "Rechazado")
                            }
                            className="bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Rechazar
                          </button>
                        )}

                        <button
                          onClick={() => eliminarSolicitud(solicitud)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {solicitudesFiltradas.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={8}
                    >
                      No hay solicitudes registradas con este filtro.
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