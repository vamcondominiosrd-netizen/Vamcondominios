"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Empleado = {
  id: number;
  numero_empleado: string | null;
  nombre: string | null;
  cargo: string | null;
  departamento: string | null;
  estado: string | null;
};

type Asistencia = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  empleado_id: number;
  numero_empleado: string | null;
  nombre_empleado: string | null;
  cargo: string | null;
  departamento: string | null;
  fecha: string | null;
  hora_entrada: string | null;
  hora_salida: string | null;
  estado: string | null;
  observacion: string | null;
  created_at: string | null;
};

const ESTADOS = ["Presente", "Tarde", "Ausente", "Permiso", "Licencia", "Vacaciones"];

export default function AsistenciaPage() {
  const guardandoRef = useRef(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const hoy = new Date().toISOString().slice(0, 10);

  const [empleadoId, setEmpleadoId] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [horaEntrada, setHoraEntrada] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [estado, setEstado] = useState("Presente");
  const [observacion, setObservacion] = useState("");

  const [filtroFecha, setFiltroFecha] = useState(hoy);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarEmpleados(id);
      cargarAsistencias(id, hoy);
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

  async function cargarAsistencias(id: string, fechaConsulta: string) {
    setLoading(true);

    let query = supabase
      .from("rh_asistencia")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (fechaConsulta) {
      query = query.eq("fecha", fechaConsulta);
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
    setFecha(hoy);
    setHoraEntrada("");
    setHoraSalida("");
    setEstado("Presente");
    setObservacion("");
  }

  function editarAsistencia(a: Asistencia) {
    setEditandoId(a.id);
    setEmpleadoId(String(a.empleado_id || ""));
    setFecha((a.fecha || hoy).slice(0, 10));
    setHoraEntrada((a.hora_entrada || "").slice(0, 5));
    setHoraSalida((a.hora_salida || "").slice(0, 5));
    setEstado(a.estado || "Presente");
    setObservacion(a.observacion || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarAsistencia(e: React.FormEvent) {
    e.preventDefault();

    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);

    try {
      if (!condominioId) {
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
        condominio: condominioNombre || "",
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

      if (editandoId) {
        const { error } = await supabase
          .from("rh_asistencia")
          .update(registro)
          .eq("id", editandoId)
          .eq("condominio_id", Number(condominioId));

        if (error) {
          alert("Error modificando asistencia: " + error.message);
          return;
        }

        alert("Asistencia modificada correctamente.");
        setFiltroFecha(fecha);
        limpiarFormulario();
        await cargarAsistencias(condominioId, fecha);
        return;
      }

      const { data: existente, error: errorExiste } = await supabase
        .from("rh_asistencia")
        .select("id")
        .eq("condominio_id", Number(condominioId))
        .eq("empleado_id", Number(empleadoId))
        .eq("fecha", fecha)
        .limit(1);

      if (errorExiste) {
        alert("Error validando duplicado: " + errorExiste.message);
        return;
      }

      if (existente && existente.length > 0) {
        const idExistente = existente[0].id;

        const { error } = await supabase
          .from("rh_asistencia")
          .update(registro)
          .eq("id", idExistente)
          .eq("condominio_id", Number(condominioId));

        if (error) {
          alert("Error actualizando asistencia existente: " + error.message);
          return;
        }

        alert("Ya existía una asistencia para ese empleado y fecha. Fue actualizada.");
        setFiltroFecha(fecha);
        limpiarFormulario();
        await cargarAsistencias(condominioId, fecha);
        return;
      }

      const { error } = await supabase.from("rh_asistencia").insert([registro]);

      if (error) {
        alert("Error guardando asistencia: " + error.message);
        return;
      }

      alert("Asistencia registrada correctamente.");
      setFiltroFecha(fecha);
      limpiarFormulario();
      await cargarAsistencias(condominioId, fecha);
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }

  async function eliminarAsistencia(a: Asistencia) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar la asistencia de ${a.nombre_empleado || "este empleado"}?`
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
    await cargarAsistencias(condominioId, filtroFecha);
  }

  function buscar() {
    if (!condominioId) return;
    cargarAsistencias(condominioId, filtroFecha);
  }

  function verTodo() {
    setFiltroFecha("");
    if (!condominioId) return;
    cargarAsistencias(condominioId, "");
  }

  const asistenciasFiltradas = asistencias.filter((a) => {
    const texto = `${a.numero_empleado || ""} ${a.nombre_empleado || ""} ${
      a.cargo || ""
    } ${a.departamento || ""}`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());
    const coincideEstado = filtroEstado === "Todos" || a.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  const presentes = asistenciasFiltradas.filter((a) => a.estado === "Presente").length;
  const tarde = asistenciasFiltradas.filter((a) => a.estado === "Tarde").length;
  const ausentes = asistenciasFiltradas.filter((a) => a.estado === "Ausente").length;
  const permisos = asistenciasFiltradas.filter((a) => a.estado === "Permiso").length;

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  const labelClass = "mb-1 block text-xs font-semibold text-slate-700";

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 pb-6">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Asistencia del Personal
            </h1>
            <p className="text-sm text-slate-500">
              Registro diario de asistencia, entradas, salidas y permisos.
            </p>
          </div>

          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm">
            <span className="text-slate-500">Condominio: </span>
            <span className="font-bold text-slate-800">
              {condominioNombre || "No identificado"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Registros</p>
          <h2 className="text-2xl font-black">{asistenciasFiltradas.length}</h2>
        </div>

        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Presentes</p>
          <h2 className="text-2xl font-black text-green-700">{presentes}</h2>
        </div>

        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Tarde</p>
          <h2 className="text-2xl font-black text-yellow-700">{tarde}</h2>
        </div>

        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Ausentes</p>
          <h2 className="text-2xl font-black text-red-700">{ausentes}</h2>
        </div>

        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Permisos</p>
          <h2 className="text-2xl font-black text-blue-700">{permisos}</h2>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-slate-900">
          {editandoId ? "Modificar asistencia" : "Registrar asistencia"}
        </h2>

        <form onSubmit={guardarAsistencia} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Empleado *</label>
              <select
                value={empleadoId}
                onChange={(e) => setEmpleadoId(e.target.value)}
                className={`${inputClass} bg-white`}
              >
                <option value="">Seleccione empleado</option>
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.numero_empleado || "-"} - {emp.nombre || "-"} -{" "}
                    {emp.cargo || "-"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className={`${inputClass} bg-white`}
              >
                {ESTADOS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Hora entrada</label>
              <input
                type="time"
                value={horaEntrada}
                onChange={(e) => setHoraEntrada(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Hora salida</label>
              <input
                type="time"
                value={horaSalida}
                onChange={(e) => setHoraSalida(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Observación</label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className={inputClass}
                rows={2}
                placeholder="Comentario adicional"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
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
                className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Reporte de asistencia
            </h2>
            <p className="text-sm text-slate-500">
              Filtra por fecha, estado o empleado.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 md:w-auto md:grid-cols-5">
            <div>
              <label className={labelClass}>Fecha</label>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className={`${inputClass} bg-white`}
              >
                <option value="Todos">Todos</option>
                {ESTADOS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Buscar</label>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className={inputClass}
                placeholder="Empleado..."
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={buscar}
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                Buscar
              </button>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={verTodo}
                className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
              >
                Ver todo
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Cargando asistencia...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2 text-left">Fecha</th>
                  <th className="border p-2 text-left">Empleado</th>
                  <th className="border p-2 text-left">Cargo</th>
                  <th className="border p-2 text-left">Entrada</th>
                  <th className="border p-2 text-left">Salida</th>
                  <th className="border p-2 text-center">Estado</th>
                  <th className="border p-2 text-left">Observación</th>
                  <th className="border p-2 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {asistenciasFiltradas.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="border p-2 font-bold">{a.fecha || "-"}</td>

                    <td className="border p-2">
                      <p className="font-bold">{a.nombre_empleado || "-"}</p>
                      <p className="text-[11px] text-slate-500">
                        {a.numero_empleado || "-"}
                      </p>
                    </td>

                    <td className="border p-2">
                      <p>{a.cargo || "-"}</p>
                      <p className="text-[11px] text-slate-500">
                        {a.departamento || "-"}
                      </p>
                    </td>

                    <td className="border p-2">{a.hora_entrada || "-"}</td>
                    <td className="border p-2">{a.hora_salida || "-"}</td>

                    <td className="border p-2 text-center">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                          a.estado === "Presente"
                            ? "bg-green-100 text-green-700"
                            : a.estado === "Tarde"
                            ? "bg-yellow-100 text-yellow-700"
                            : a.estado === "Ausente"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {a.estado || "-"}
                      </span>
                    </td>

                    <td className="border p-2">{a.observacion || "-"}</td>

                    <td className="border p-2">
                      <div className="flex flex-wrap justify-center gap-1">
                        <button
                          onClick={() => editarAsistencia(a)}
                          className="rounded bg-slate-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-slate-800"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => eliminarAsistencia(a)}
                          className="rounded bg-red-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-800"
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
                      className="border p-4 text-center text-slate-500"
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
