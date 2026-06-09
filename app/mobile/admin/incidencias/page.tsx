"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const estados = [
  "Pendiente",
  "En proceso",
  "Resuelto",
  "Cerrado",
  "Rechazado",
];

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

function formatearFecha(fecha: string) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleDateString("es-DO");
  } catch {
    return fecha;
  }
}

export default function MobileAdminIncidenciasPage() {
  const router = useRouter();

  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(false);

  const [comentarios, setComentarios] = useState<Record<number, string>>({});
  const [responsables, setResponsables] = useState<Record<number, string>>({});
  const [fechasSolucion, setFechasSolucion] = useState<Record<number, string>>(
    {}
  );

  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id || !nombre) {
      router.push("/mobile");
      return;
    }

    setCondominioNombre(nombre);
    cargarIncidencias(nombre);
  }, [router]);

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

    setIncidencias((data as Incidencia[]) || []);

    const comentariosIniciales: Record<number, string> = {};
    const responsablesIniciales: Record<number, string> = {};
    const fechasIniciales: Record<number, string> = {};

    ((data as Incidencia[]) || []).forEach((item) => {
      comentariosIniciales[item.id] = item.comentario_admin || "";
      responsablesIniciales[item.id] = item.responsable || "";
      fechasIniciales[item.id] = item.fecha_estimada_solucion || "";
    });

    setComentarios(comentariosIniciales);
    setResponsables(responsablesIniciales);
    setFechasSolucion(fechasIniciales);
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

  function cerrarSesion() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");

    router.push("/mobile");
  }

  const incidenciasFiltradas = incidencias.filter((i) => {
    const cumpleEstado = filtroEstado === "" || i.estado === filtroEstado;

    const texto = `${i.id || ""} ${i.estado || ""} ${i.prioridad || ""} ${
      i.titulo || ""
    } ${i.descripcion || ""} ${i.condominio || ""} ${
      i.no_apartamento || ""
    } ${i.nombre_propietario || ""} ${i.telefono || ""} ${
      i.categoria || ""
    } ${i.origen || ""} ${i.responsable || ""} ${
      i.comentario_admin || ""
    }`
      .toLowerCase()
      .trim();

    const cumpleBusqueda = texto.includes(busqueda.toLowerCase().trim());

    return cumpleEstado && cumpleBusqueda;
  });

  const abiertas = incidenciasFiltradas.filter(
    (i) => i.estado !== "Resuelto" && i.estado !== "Cerrado"
  ).length;

  const resueltas = incidenciasFiltradas.filter(
    (i) => i.estado === "Resuelto" || i.estado === "Cerrado"
  ).length;

  const urgentes = incidenciasFiltradas.filter(
    (i) => i.prioridad === "Urgente" || i.prioridad === "Alta"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <section className="bg-slate-900 text-white rounded-b-3xl p-5 shadow">
        <Link href="/mobile/admin" className="text-sm opacity-90">
          ← Volver al menú
        </Link>

        <h1 className="text-2xl font-black mt-3">Incidencias</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominioNombre || "Condominio no seleccionado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Gestión y seguimiento de reportes realizados desde VAM Móvil.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Total</p>
            <h2 className="text-2xl font-black">{incidenciasFiltradas.length}</h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Abiertas</p>
            <h2 className="text-2xl font-black text-yellow-700">{abiertas}</h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Urgentes</p>
            <h2 className="text-2xl font-black text-red-700">{urgentes}</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Todos</option>

              {estados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>

            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Apartamento, propietario, categoría, título..."
            />
          </div>

          <button
            onClick={() => cargarIncidencias(condominioNombre)}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
          >
            Actualizar
          </button>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">Resueltas / Cerradas</p>
              <h2 className="text-xl font-black text-green-700">{resueltas}</h2>
            </div>

            <div>
              <p className="text-xs text-slate-500">Filtro actual</p>
              <h2 className="text-sm font-black text-slate-800">
                {filtroEstado || "Todos los estados"}
              </h2>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            Cargando incidencias...
          </div>
        ) : (
          <div className="space-y-3">
            {incidenciasFiltradas.map((i) => (
              <div
                key={i.id}
                className="bg-white rounded-2xl border shadow-sm p-4"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${colorEstado(
                      i.estado
                    )}`}
                  >
                    {i.estado || "Pendiente"}
                  </span>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${colorPrioridad(
                      i.prioridad
                    )}`}
                  >
                    {i.prioridad || "Normal"}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Incidencia</p>
                    <h2 className="text-lg font-black text-slate-900">
                      #{i.id} - {i.titulo || "Sin título"}
                    </h2>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Fecha</p>
                    <p className="text-sm font-bold">
                      {formatearFecha(i.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Apartamento</p>
                    <p className="font-bold">{i.no_apartamento || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Categoría</p>
                    <p className="font-bold">{i.categoria || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Propietario</p>
                    <p className="font-bold">{i.nombre_propietario || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Teléfono</p>
                    <p className="font-bold">{i.telefono || "-"}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-slate-500">Descripción</p>
                  <p className="text-sm">{i.descripcion || "-"}</p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Origen</p>
                    <p className="font-bold">{i.origen || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Responsable</p>
                    <p className="font-bold">{i.responsable || "-"}</p>
                  </div>
                </div>

                {i.fecha_estimada_solucion && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500">
                      Fecha estimada solución
                    </p>
                    <p className="font-bold">
                      {formatearFecha(i.fecha_estimada_solucion)}
                    </p>
                  </div>
                )}

                {i.foto_url ? (
                  <a
                    href={i.foto_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 block bg-slate-900 text-white py-2 rounded-xl text-center text-sm font-bold"
                  >
                    Ver evidencia
                  </a>
                ) : (
                  <div className="mt-4 bg-slate-100 text-slate-400 py-2 rounded-xl text-center text-sm font-bold">
                    Sin evidencia
                  </div>
                )}

                {i.comentario_admin && (
                  <div className="mt-4 bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500">
                      Comentario administración
                    </p>
                    <p className="text-sm">{i.comentario_admin}</p>
                  </div>
                )}

                {i.estado !== "Cerrado" && i.estado !== "Resuelto" && (
                  <div className="mt-5 border-t pt-4 space-y-3">
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
                        className="border rounded-xl px-4 py-3 w-full"
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
                        className="border rounded-xl px-4 py-3 w-full"
                      />
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
                        className="border rounded-xl px-4 py-3 w-full"
                        rows={3}
                        placeholder="Respuesta o seguimiento"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => actualizarIncidencia(i.id, "En proceso")}
                        className="bg-yellow-600 text-white py-2 rounded-xl text-xs font-bold"
                      >
                        En proceso
                      </button>

                      <button
                        onClick={() => actualizarIncidencia(i.id, "Resuelto")}
                        className="bg-green-700 text-white py-2 rounded-xl text-xs font-bold"
                      >
                        Resolver
                      </button>

                      <button
                        onClick={() => actualizarIncidencia(i.id, "Rechazado")}
                        className="bg-red-700 text-white py-2 rounded-xl text-xs font-bold"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {incidenciasFiltradas.length === 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
                No hay incidencias registradas.
              </div>
            )}
          </div>
        )}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 text-center">
          <Link
            href="/mobile/admin"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">🏠</div>
            Inicio
          </Link>

          <Link
            href="/mobile/admin/banco"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">🏦</div>
            Banco
          </Link>

          <Link
            href="/mobile/admin/incidencias"
            className="py-3 text-xs font-bold text-slate-900"
          >
            <div className="text-xl">🛠️</div>
            Incidencias
          </Link>

          <button
            type="button"
            onClick={cerrarSesion}
            className="py-3 text-xs font-bold text-red-600"
          >
            <div className="text-xl">🚪</div>
            Salir
          </button>
        </div>
      </nav>
    </main>
  );
}