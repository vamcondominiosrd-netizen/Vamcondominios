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

type Turno = {
  id: number;
  condominio_id: number;
  condominio: string;

  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;

  nombre_turno: string;
  hora_entrada: string;
  hora_salida: string;

  dias_laborales: string;
  fecha_inicio: string;
  fecha_fin: string;

  estado: string;
  observacion: string;

  created_at: string;
};

const turnosPreestablecidos = [
  {
    nombre: "Administrativo",
    hora_entrada: "08:00",
    hora_salida: "17:00",
  },
  {
    nombre: "Turno Diurno",
    hora_entrada: "07:00",
    hora_salida: "15:00",
  },
  {
    nombre: "Turno Vespertino",
    hora_entrada: "15:00",
    hora_salida: "23:00",
  },
  {
    nombre: "Turno Nocturno",
    hora_entrada: "23:00",
    hora_salida: "07:00",
  },
  {
    nombre: "Vigilancia 12 Horas Día",
    hora_entrada: "06:00",
    hora_salida: "18:00",
  },
  {
    nombre: "Vigilancia 12 Horas Noche",
    hora_entrada: "18:00",
    hora_salida: "06:00",
  },
  {
    nombre: "Medio Tiempo Mañana",
    hora_entrada: "08:00",
    hora_salida: "12:00",
  },
  {
    nombre: "Medio Tiempo Tarde",
    hora_entrada: "14:00",
    hora_salida: "18:00",
  },
  {
    nombre: "Fines de Semana",
    hora_entrada: "08:00",
    hora_salida: "18:00",
  },
];

const diasSemana = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function TurnosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [empleadoId, setEmpleadoId] = useState("");
  const [nombreTurno, setNombreTurno] = useState("");
  const [horaEntrada, setHoraEntrada] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [estado, setEstado] = useState("Activo");
  const [observacion, setObservacion] = useState("");

  const [filtroEstado, setFiltroEstado] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarEmpleados(id);
      cargarTurnos(id);
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

  async function cargarTurnos(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("rh_turnos")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando turnos: " + error.message);
      return;
    }

    setTurnos((data as Turno[]) || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);

    setEmpleadoId("");
    setNombreTurno("");
    setHoraEntrada("");
    setHoraSalida("");
    setDiasSeleccionados([]);
    setFechaInicio("");
    setFechaFin("");
    setEstado("Activo");
    setObservacion("");
  }

  function seleccionarTurno(valor: string) {
    setNombreTurno(valor);

    const turno = turnosPreestablecidos.find((t) => t.nombre === valor);

    if (turno) {
      setHoraEntrada(turno.hora_entrada);
      setHoraSalida(turno.hora_salida);
    }
  }

  function toggleDia(dia: string) {
    if (diasSeleccionados.includes(dia)) {
      setDiasSeleccionados(diasSeleccionados.filter((d) => d !== dia));
      return;
    }

    setDiasSeleccionados([...diasSeleccionados, dia]);
  }

  function seleccionarLunesViernes() {
    setDiasSeleccionados(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]);
  }

  function seleccionarTodosLosDias() {
    setDiasSeleccionados([...diasSemana]);
  }

  function limpiarDias() {
    setDiasSeleccionados([]);
  }

  function convertirDiasTexto(dias: string[]) {
    return dias.join(", ");
  }

  function convertirTextoADias(texto: string) {
    if (!texto) return [];

    return texto
      .split(",")
      .map((d) => d.trim())
      .filter((d) => diasSemana.includes(d));
  }

  function editarTurno(turno: Turno) {
    setEditandoId(turno.id);

    setEmpleadoId(String(turno.empleado_id));
    setNombreTurno(turno.nombre_turno || "");
    setHoraEntrada(turno.hora_entrada || "");
    setHoraSalida(turno.hora_salida || "");
    setDiasSeleccionados(convertirTextoADias(turno.dias_laborales || ""));
    setFechaInicio(turno.fecha_inicio || "");
    setFechaFin(turno.fecha_fin || "");
    setEstado(turno.estado || "Activo");
    setObservacion(turno.observacion || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarTurno(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!empleadoId) {
      alert("Debe seleccionar un empleado.");
      return;
    }

    if (!nombreTurno) {
      alert("Debe seleccionar el turno.");
      return;
    }

    if (!horaEntrada) {
      alert("Debe indicar la hora de entrada.");
      return;
    }

    if (!horaSalida) {
      alert("Debe indicar la hora de salida.");
      return;
    }

    if (diasSeleccionados.length === 0) {
      alert("Debe seleccionar por lo menos un día laboral.");
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

      nombre_turno: nombreTurno,
      hora_entrada: horaEntrada,
      hora_salida: horaSalida,

      dias_laborales: convertirDiasTexto(diasSeleccionados),
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,

      estado,
      observacion: observacion.trim(),
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("rh_turnos")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando turno: " + error.message);
        return;
      }

      alert("Turno modificado correctamente.");
      limpiarFormulario();
      cargarTurnos(condominioId);
      return;
    }

    const { error } = await supabase.from("rh_turnos").insert([registro]);

    setGuardando(false);

    if (error) {
      alert("Error guardando turno: " + error.message);
      return;
    }

    alert("Turno registrado correctamente.");
    limpiarFormulario();
    cargarTurnos(condominioId);
  }

  async function eliminarTurno(turno: Turno) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar el turno de ${turno.nombre_empleado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_turnos")
      .delete()
      .eq("id", turno.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando turno: " + error.message);
      return;
    }

    alert("Turno eliminado correctamente.");
    cargarTurnos(condominioId);
  }

  const turnosFiltrados = turnos.filter((t) => {
    if (filtroEstado === "Todos") return true;
    return t.estado === filtroEstado;
  });

  const totalTurnos = turnos.length;
  const turnosActivos = turnos.filter((t) => t.estado === "Activo").length;
  const turnosInactivos = turnos.filter((t) => t.estado === "Inactivo").length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Turnos del Personal
        </h1>

        <p className="text-slate-500 mt-2">
          Asignación de horarios, jornadas y días laborales del personal.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total turnos</p>
          <h2 className="text-3xl font-black">{totalTurnos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Activos</p>
          <h2 className="text-3xl font-black text-green-700">
            {turnosActivos}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Inactivos</p>
          <h2 className="text-3xl font-black text-red-700">
            {turnosInactivos}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar turno" : "Registrar turno"}
        </h2>

        <form
          onSubmit={guardarTurno}
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
              Turno preestablecido *
            </label>

            <select
              value={nombreTurno}
              onChange={(e) => seleccionarTurno(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Seleccione turno</option>

              {turnosPreestablecidos.map((turno) => (
                <option key={turno.nombre} value={turno.nombre}>
                  {turno.nombre} ({turno.hora_entrada} - {turno.hora_salida})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Hora entrada *
            </label>

            <input
              type="time"
              value={horaEntrada}
              onChange={(e) => setHoraEntrada(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />

            <p className="text-xs text-slate-500 mt-1">
              Se llena automáticamente al elegir el turno, pero puede ajustarse.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Hora salida *
            </label>

            <input
              type="time"
              value={horaSalida}
              onChange={(e) => setHoraSalida(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />

            <p className="text-xs text-slate-500 mt-1">
              Se llena automáticamente al elegir el turno, pero puede ajustarse.
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div>
                <label className="block text-sm font-semibold">
                  Días laborales *
                </label>

                <p className="text-xs text-slate-500">
                  Seleccione los días correspondientes al turno.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={seleccionarLunesViernes}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold"
                >
                  Lunes a Viernes
                </button>

                <button
                  type="button"
                  onClick={seleccionarTodosLosDias}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold"
                >
                  Todos
                </button>

                <button
                  type="button"
                  onClick={limpiarDias}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {diasSemana.map((dia) => (
                <label
                  key={dia}
                  className={`border rounded-xl p-3 text-center cursor-pointer font-bold text-sm transition ${
                    diasSeleccionados.includes(dia)
                      ? "bg-blue-700 text-white border-blue-700"
                      : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={diasSeleccionados.includes(dia)}
                    onChange={() => toggleDia(dia)}
                    className="hidden"
                  />

                  {dia}
                </label>
              ))}
            </div>

            {diasSeleccionados.length > 0 && (
              <p className="text-sm text-blue-700 font-semibold mt-3">
                Días seleccionados: {convertirDiasTexto(diasSeleccionados)}
              </p>
            )}
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

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
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
              placeholder="Observación del turno"
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
                : "Guardar turno"}
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
            <h2 className="text-xl font-black">Listado de turnos</h2>
            <p className="text-sm text-slate-500">
              Turnos asignados al personal del condominio activo.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Filtrar estado
            </label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-4 py-2 bg-white"
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div>Cargando turnos...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Turno</th>
                  <th className="p-3 border text-left">Horario</th>
                  <th className="p-3 border text-left">Días</th>
                  <th className="p-3 border text-left">Vigencia</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-left">Observación</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {turnosFiltrados.map((turno) => (
                  <tr key={turno.id} className="hover:bg-slate-50">
                    <td className="p-3 border">
                      <p className="font-bold">{turno.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {turno.numero_empleado} · {turno.cargo || "-"}
                      </p>
                    </td>

                    <td className="p-3 border font-bold">
                      {turno.nombre_turno}
                    </td>

                    <td className="p-3 border">
                      {turno.hora_entrada || "-"} a {turno.hora_salida || "-"}
                    </td>

                    <td className="p-3 border">
                      {turno.dias_laborales || "-"}
                    </td>

                    <td className="p-3 border">
                      <p>Desde: {turno.fecha_inicio || "-"}</p>
                      <p className="text-xs text-slate-500">
                        Hasta: {turno.fecha_fin || "Indefinido"}
                      </p>
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          turno.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {turno.estado}
                      </span>
                    </td>

                    <td className="p-3 border">{turno.observacion || "-"}</td>

                    <td className="p-3 border">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => editarTurno(turno)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => eliminarTurno(turno)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {turnosFiltrados.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={8}
                    >
                      No hay turnos registrados con este filtro.
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