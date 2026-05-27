"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Incidencia = {
  id: number;
  propietario_id: number;
  condominio_id?: number;
  condominio: string;
  unidad_id?: number;
  no_apartamento: string;
  nombre_propietario: string;
  telefono: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: string;
  foto_url: string;
  estado: string;
  origen: string;
  comentario_admin: string;
  fecha_cierre: string;
  created_at: string;
  responsable?: string;
  fecha_estimada_solucion?: string;
};

export default function IncidenciasPage() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(false);

  const [comentarios, setComentarios] = useState<Record<number, string>>({});
  const [responsables, setResponsables] = useState<Record<number, string>>({});
  const [fechasSolucion, setFechasSolucion] = useState<Record<number, string>>(
    {}
  );

  const [filtroEstado, setFiltroEstado] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  useEffect(() => {
    const nombre = localStorage.getItem("condominio_nombre") || "";
    setCondominioNombre(nombre);

    if (nombre) {
      cargarIncidencias(nombre);
    }
  }, []);

  async function cargarIncidencias(nombre: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("incidencias")
      .select("*")
      .eq("condominio", nombre)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando incidencias: " + error.message);
      return;
    }

    setIncidencias(data || []);
  }

  async function actualizarIncidencia(id: number, nuevoEstado: string) {
    const comentario = comentarios[id] || "";
    const responsable = responsables[id] || "";
    const fechaEstimada = fechasSolucion[id] || null;

    const updateData: any = {
      estado: nuevoEstado,
      comentario_admin: comentario,
      responsable,
      fecha_estimada_solucion: fechaEstimada,
    };

    if (nuevoEstado === "Resuelto" || nuevoEstado === "Cerrado") {
      updateData.fecha_cierre = new Date().toISOString();
    }

    const { error } = await supabase
      .from("incidencias")
      .update(updateData)
      .eq("id", id)
      .eq("condominio", condominioNombre);

    if (error) {
      alert("Error actualizando incidencia: " + error.message);
      return;
    }

    alert("Incidencia actualizada correctamente.");
    cargarIncidencias(condominioNombre);
  }

  const incidenciasFiltradas = incidencias.filter((i) => {
    const cumpleEstado = filtroEstado === "" || i.estado === filtroEstado;
    return cumpleEstado;
  });

  const abiertas = incidenciasFiltradas.filter(
    (i) => i.estado !== "Resuelto" && i.estado !== "Cerrado"
  ).length;

  const resueltas = incidenciasFiltradas.filter(
    (i) => i.estado === "Resuelto" || i.estado === "Cerrado"
  ).length;

  function colorEstado(estado: string) {
    if (estado === "Pendiente") return "bg-yellow-100 text-yellow-800";
    if (estado === "En proceso") return "bg-blue-100 text-blue-800";
    if (estado === "Resuelto") return "bg-green-100 text-green-800";
    if (estado === "Cerrado") return "bg-slate-100 text-slate-700";
    if (estado === "Rechazado") return "bg-red-100 text-red-800";
    return "bg-orange-100 text-orange-800";
  }

  function colorPrioridad(prioridad: string) {
    if (prioridad === "Urgente") return "bg-red-100 text-red-800";
    if (prioridad === "Alta") return "bg-orange-100 text-orange-800";
    if (prioridad === "Baja") return "bg-slate-100 text-slate-700";
    return "bg-blue-100 text-blue-800";
  }

  const estados = [
    "Pendiente",
    "En proceso",
    "Resuelto",
    "Cerrado",
    "Rechazado",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Incidencias de Propietarios</h1>
        <p className="text-slate-500">
          Gestión y seguimiento de incidencias reportadas desde VAM Móvil.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Condominio activo
        </p>
        <p className="font-bold text-slate-800 mt-1">
          {condominioNombre || "No seleccionado"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total incidencias</p>
          <h2 className="text-2xl font-bold">{incidenciasFiltradas.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Abiertas</p>
          <h2 className="text-2xl font-bold text-yellow-700">{abiertas}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Resueltas / Cerradas</p>
          <h2 className="text-2xl font-bold text-green-700">{resueltas}</h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Filtros</h2>

        <div>
          <label className="block text-sm font-semibold mb-1">Estado</label>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
          >
            <option value="">Todos</option>

            {estados.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Listado de incidencias</h2>

        {loading ? (
          <p>Cargando incidencias...</p>
        ) : (
          <div className="space-y-4">
            {incidenciasFiltradas.map((i) => (
              <div key={i.id} className="border rounded-2xl p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${colorEstado(
                          i.estado
                        )}`}
                      >
                        {i.estado}
                      </span>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${colorPrioridad(
                          i.prioridad
                        )}`}
                      >
                        {i.prioridad}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold">
                      #{i.id} - {i.titulo}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {i.condominio} | Apto. {i.no_apartamento}
                    </p>

                    <p className="text-sm text-slate-500">
                      Propietario: <strong>{i.nombre_propietario}</strong>
                    </p>

                    <p className="text-sm text-slate-500">
                      Categoría: <strong>{i.categoria || "-"}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-500">Fecha reporte</p>

                    <p className="font-bold">
                      {new Date(i.created_at).toLocaleDateString("es-DO")}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-slate-500">Descripción</p>
                  <p className="text-sm">{i.descripcion}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-slate-500">Teléfono</p>
                    <p className="font-semibold">{i.telefono || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Origen</p>
                    <p className="font-semibold">{i.origen || "-"}</p>
                  </div>
                </div>

                <div className="mt-4">
                  {i.foto_url ? (
                    <a
                      href={i.foto_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg inline-block"
                    >
                      Ver evidencia
                    </a>
                  ) : (
                    <span className="text-slate-400">Sin evidencia</span>
                  )}
                </div>

                {i.comentario_admin && (
                  <div className="mt-4 bg-slate-50 rounded-xl p-3">
                    <p className="text-sm font-semibold">
                      Comentario administración
                    </p>
                    <p className="text-sm">{i.comentario_admin}</p>
                  </div>
                )}

                {i.estado !== "Cerrado" && i.estado !== "Resuelto" && (
                  <div className="mt-5 border-t pt-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold mb-1">
                          Responsable
                        </label>

                        <input
                          type="text"
                          value={responsables[i.id] || ""}
                          onChange={(e) =>
                            setResponsables({
                              ...responsables,
                              [i.id]: e.target.value,
                            })
                          }
                          className="border rounded-lg px-3 py-2 w-full"
                          placeholder="Persona asignada"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-1">
                          Fecha estimada solución
                        </label>

                        <input
                          type="date"
                          value={fechasSolucion[i.id] || ""}
                          onChange={(e) =>
                            setFechasSolucion({
                              ...fechasSolucion,
                              [i.id]: e.target.value,
                            })
                          }
                          className="border rounded-lg px-3 py-2 w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">
                        Comentario administrativo
                      </label>

                      <textarea
                        value={comentarios[i.id] || ""}
                        onChange={(e) =>
                          setComentarios({
                            ...comentarios,
                            [i.id]: e.target.value,
                          })
                        }
                        className="border rounded-lg px-3 py-2 w-full"
                        rows={2}
                        placeholder="Respuesta o seguimiento"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => actualizarIncidencia(i.id, "En proceso")}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-lg"
                      >
                        En proceso
                      </button>

                      <button
                        onClick={() => actualizarIncidencia(i.id, "Resuelto")}
                        className="bg-green-700 text-white px-4 py-2 rounded-lg"
                      >
                        Resolver
                      </button>

                      <button
                        onClick={() => actualizarIncidencia(i.id, "Rechazado")}
                        className="bg-red-700 text-white px-4 py-2 rounded-lg"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {incidenciasFiltradas.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No hay incidencias registradas.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}