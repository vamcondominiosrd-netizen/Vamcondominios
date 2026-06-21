"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

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

export default function MobileTecnicoTrabajosPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [usuarioAdminId, setUsuarioAdminId] = useState("");

  const [trabajos, setTrabajos] = useState<TrabajoTecnico[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [filtroEstado, setFiltroEstado] = useState("ACTIVOS");
  const [buscar, setBuscar] = useState("");

  const [trabajoActivo, setTrabajoActivo] = useState<TrabajoTecnico | null>(
    null
  );
  const [comentarioTecnico, setComentarioTecnico] = useState("");
  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "";
    const rol = localStorage.getItem("usuario_rol") || "";
    const usuarioId = localStorage.getItem("usuario_admin_id") || "";

    if (!id || rol !== "tecnico") {
      router.push("/mobile/tecnico/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(usuario);
    setUsuarioAdminId(usuarioId);

    cargarTrabajos(id, usuarioId);
  }, [router]);

  async function cargarTrabajos(id: string, tecnicoId?: string) {
    const tecnico = tecnicoId || usuarioAdminId;

    if (!tecnico) {
      setMensaje("No se encontró el ID del técnico.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("trabajos_tecnicos")
      .select("*")
      .eq("condominio_id", Number(id))
      .eq("tecnico_id", Number(tecnico))
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando trabajos técnicos: " + error.message);
      return;
    }

    setTrabajos((data as TrabajoTecnico[]) || []);
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

  function abrirCompletar(trabajo: TrabajoTecnico) {
    setTrabajoActivo(trabajo);
    setComentarioTecnico(trabajo.comentario_tecnico || "");
    setArchivoEvidencia(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarCompletar() {
    setTrabajoActivo(null);
    setComentarioTecnico("");
    setArchivoEvidencia(null);
  }

  async function subirEvidencia(archivo: File | null) {
    if (!archivo) return null;

    const extension = archivo.name.split(".").pop();
    const nombreArchivo = `${condominioId}/trabajos/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("trabajos-tecnicos")
      .upload(nombreArchivo, archivo);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("trabajos-tecnicos")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function marcarEnProceso(trabajo: TrabajoTecnico) {
    const confirmar = confirm(
      `¿Desea marcar el trabajo #${trabajo.id} como En proceso?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("trabajos_tecnicos")
      .update({
        estado: "En proceso",
        fecha_inicio: new Date().toISOString(),
      })
      .eq("id", trabajo.id)
      .eq("condominio_id", Number(condominioId))
      .eq("tecnico_id", Number(usuarioAdminId));

    if (error) {
      alert("Error actualizando trabajo: " + error.message);
      return;
    }

    alert("Trabajo marcado en proceso.");
    await cargarTrabajos(condominioId);
  }

  async function completarTrabajo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!trabajoActivo) {
      alert("Debe seleccionar un trabajo.");
      return;
    }

    if (!comentarioTecnico.trim()) {
      alert("Debe escribir el comentario del trabajo realizado.");
      return;
    }

    const confirmar = confirm(
      `¿Desea completar el trabajo #${trabajoActivo.id}?`
    );

    if (!confirmar) return;

    setLoading(true);
    setMensaje("");

    try {
      const evidenciaUrl = await subirEvidencia(archivoEvidencia);

      const { error } = await supabase
        .from("trabajos_tecnicos")
        .update({
          estado: "Completado",
          comentario_tecnico: comentarioTecnico.trim(),
          evidencia_url: evidenciaUrl || trabajoActivo.evidencia_url || null,
          fecha_completado: new Date().toISOString(),
          fecha_inicio: trabajoActivo.fecha_inicio || new Date().toISOString(),
        })
        .eq("id", trabajoActivo.id)
        .eq("condominio_id", Number(condominioId))
        .eq("tecnico_id", Number(usuarioAdminId));

      if (error) {
        alert("Error completando trabajo: " + error.message);
        setLoading(false);
        return;
      }

      alert("Trabajo completado correctamente.");
      cancelarCompletar();
      await cargarTrabajos(condominioId);
    } catch (error: any) {
      alert("Error subiendo evidencia: " + error.message);
    }

    setLoading(false);
  }

  async function cerrarSesion() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_admin_id");

    await supabase.auth.signOut();

    router.push("/mobile/tecnico/login");
  }

  const trabajosFiltrados = useMemo(() => {
    let lista = trabajos;

    if (filtroEstado === "ACTIVOS") {
      lista = lista.filter(
        (t) => t.estado === "Asignado" || t.estado === "En proceso"
      );
    } else if (filtroEstado !== "TODOS") {
      lista = lista.filter((t) => t.estado === filtroEstado);
    }

    if (buscar.trim()) {
      const texto = buscar.toLowerCase().trim();

      lista = lista.filter((t) => {
        const cadena = `
          ${t.id || ""}
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
  }, [trabajos, filtroEstado, buscar]);

  const asignados = trabajos.filter((t) => t.estado === "Asignado").length;
  const enProceso = trabajos.filter((t) => t.estado === "En proceso").length;
  const completados = trabajos.filter((t) => t.estado === "Completado").length;

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-md space-y-4">
        <section className="rounded-3xl bg-white border shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                VAM Administradora
              </p>
              <h1 className="text-2xl font-black text-slate-900">
                Mis Trabajos
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Trabajos asignados para realizar desde el celular.
              </p>
            </div>

            <button
              type="button"
              onClick={cerrarSesion}
              className="rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white"
            >
              Salir
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 border p-3 text-sm">
            <p className="text-slate-500">Técnico</p>
            <p className="font-bold text-slate-900">
              {usuarioNombre || "Técnico VAM"}
            </p>

            <p className="text-slate-500 mt-2">Condominio</p>
            <p className="font-bold text-slate-900">
              {condominioNombre || "No seleccionado"}
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              href="/mobile/tecnico"
              className="flex-1 rounded-xl bg-slate-800 px-4 py-3 text-center text-sm font-bold text-white"
            >
              Menú
            </Link>

            <button
              type="button"
              onClick={() => cargarTrabajos(condominioId)}
              className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white"
            >
              Actualizar
            </button>
          </div>
        </section>

        {mensaje && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm font-bold text-red-700">
            {mensaje}
          </div>
        )}

        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white border shadow-sm p-4">
            <p className="text-xs text-slate-500">Asignados</p>
            <p className="text-2xl font-black text-yellow-700">{asignados}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-4">
            <p className="text-xs text-slate-500">Proceso</p>
            <p className="text-2xl font-black text-blue-700">{enProceso}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-4">
            <p className="text-xs text-slate-500">Complet.</p>
            <p className="text-2xl font-black text-purple-700">{completados}</p>
          </div>
        </section>

        {trabajoActivo && (
          <section className="rounded-3xl bg-white border-2 border-green-300 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Completar trabajo #{trabajoActivo.id}
                </h2>
                <p className="text-sm text-slate-500">
                  {trabajoActivo.titulo}
                </p>
              </div>

              <button
                type="button"
                onClick={cancelarCompletar}
                className="rounded-xl bg-slate-100 border px-3 py-2 text-xs font-bold text-slate-700"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={completarTrabajo} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">
                  Comentario del trabajo realizado
                </label>
                <textarea
                  value={comentarioTecnico}
                  onChange={(e) => setComentarioTecnico(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  rows={4}
                  placeholder="Describa lo realizado..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  Foto / evidencia
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) =>
                    setArchivoEvidencia(e.target.files?.[0] || null)
                  }
                  className="w-full rounded-xl border px-4 py-3 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-green-700 py-3 font-black text-white disabled:opacity-60"
              >
                {loading ? "Completando..." : "Completar trabajo"}
              </button>
            </form>
          </section>
        )}

        <section className="rounded-3xl bg-white border shadow-sm p-5">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            Filtros
          </h2>

          <div className="space-y-3">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 bg-white"
            >
              <option value="ACTIVOS">Activos</option>
              <option value="TODOS">Todos</option>
              <option value="Asignado">Asignado</option>
              <option value="En proceso">En proceso</option>
              <option value="Completado">Completado</option>
              <option value="Revisado">Revisado</option>
              <option value="Anulado">Anulado</option>
            </select>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Buscar trabajo..."
            />
          </div>
        </section>

        <section className="space-y-3">
          {loading && (
            <div className="rounded-2xl bg-white border shadow-sm p-5 text-sm text-slate-500">
              Cargando trabajos...
            </div>
          )}

          {!loading &&
            trabajosFiltrados.map((t) => (
              <div key={t.id} className="rounded-3xl bg-white border shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${colorEstado(
                          t.estado
                        )}`}
                      >
                        {t.estado}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${colorPrioridad(
                          t.prioridad
                        )}`}
                      >
                        {t.prioridad}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900">
                      #{t.id} - {t.titulo}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {t.tipo_trabajo} · Asignado{" "}
                      {fechaDominicana(t.fecha_asignacion)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-600 space-y-1">
                  <p>
                    <strong>Ubicación:</strong> {t.ubicacion || "-"}
                  </p>
                  <p>
                    <strong>Fecha límite:</strong>{" "}
                    {fechaDominicana(t.fecha_limite)}
                  </p>
                  <p>
                    <strong>Descripción:</strong> {t.descripcion || "-"}
                  </p>

                  {t.incidencia_id && (
                    <p>
                      <strong>Incidencia:</strong> #{t.incidencia_id}
                    </p>
                  )}
                </div>

                {t.comentario_tecnico && (
                  <div className="mt-3 rounded-2xl bg-green-50 border border-green-100 p-3">
                    <p className="text-xs font-bold text-green-700">
                      Comentario técnico
                    </p>
                    <p className="text-sm text-green-800">
                      {t.comentario_tecnico}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {t.evidencia_url && (
                    <a
                      href={t.evidencia_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white"
                    >
                      Evidencia
                    </a>
                  )}
                </div>

                {t.estado === "Asignado" && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => marcarEnProceso(t)}
                      className="w-full rounded-xl bg-blue-700 py-3 text-sm font-black text-white"
                    >
                      Marcar en proceso
                    </button>
                  </div>
                )}

                {t.estado === "En proceso" && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => abrirCompletar(t)}
                      className="w-full rounded-xl bg-green-700 py-3 text-sm font-black text-white"
                    >
                      Completar trabajo
                    </button>
                  </div>
                )}
              </div>
            ))}

          {!loading && trabajosFiltrados.length === 0 && (
            <div className="rounded-3xl bg-white border shadow-sm p-6 text-center text-sm text-slate-500">
              No hay trabajos para mostrar.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}