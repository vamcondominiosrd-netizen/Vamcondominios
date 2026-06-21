"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Incidencia = {
  id: number;
  propietario_id?: number | null;
  condominio_id?: number | null;
  condominio?: string | null;
  unidad_id?: number | null;
  no_apartamento?: string | null;
  nombre_propietario?: string | null;
  cedula?: string | null;
  telefono?: string | null;
  tipo_incidencia?: string | null;
  categoria?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  prioridad?: string | null;
  evidencia_url?: string | null;
  foto_url?: string | null;
  estado?: string | null;
  responsable?: string | null;
  comentario_admin?: string | null;
  comentario_tecnico?: string | null;
  evidencia_cierre_url?: string | null;
  fecha_reporte?: string | null;
  fecha_cierre?: string | null;
  created_at?: string | null;
};

export default function MobileTecnicoIncidenciasPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [usuarioAdminId, setUsuarioAdminId] = useState("");

  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [filtroEstado, setFiltroEstado] = useState("ABIERTAS");
  const [buscar, setBuscar] = useState("");

  const [incidenciaActiva, setIncidenciaActiva] = useState<Incidencia | null>(
    null
  );
  const [comentarioTecnico, setComentarioTecnico] = useState("");
  const [archivoCierre, setArchivoCierre] = useState<File | null>(null);

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

    cargarIncidencias(id);
  }, [router]);

  async function cargarIncidencias(id: string) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("incidencias")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando incidencias: " + error.message);
      return;
    }

    setIncidencias((data as Incidencia[]) || []);
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

  function evidenciaInicial(i: Incidencia) {
    return i.evidencia_url || i.foto_url || "";
  }

  function tipoIncidencia(i: Incidencia) {
    return i.tipo_incidencia || i.categoria || "-";
  }

  function colorEstado(estado?: string | null) {
    if (estado === "Reportado" || estado === "Pendiente") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (estado === "Recibido" || estado === "En revisión") {
      return "bg-orange-100 text-orange-700";
    }

    if (estado === "En proceso") {
      return "bg-blue-100 text-blue-700";
    }

    if (estado === "Pendiente proveedor") {
      return "bg-purple-100 text-purple-700";
    }

    if (estado === "Resuelto" || estado === "Cerrado") {
      return "bg-green-100 text-green-700";
    }

    if (estado === "Rechazado") {
      return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  function colorPrioridad(prioridad?: string | null) {
    if (prioridad === "Urgente") return "bg-red-100 text-red-700";
    if (prioridad === "Alta") return "bg-orange-100 text-orange-700";
    if (prioridad === "Baja") return "bg-slate-100 text-slate-700";
    return "bg-blue-100 text-blue-700";
  }

  function abrirCerrar(i: Incidencia) {
    setIncidenciaActiva(i);
    setComentarioTecnico(i.comentario_tecnico || "");
    setArchivoCierre(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarCerrar() {
    setIncidenciaActiva(null);
    setComentarioTecnico("");
    setArchivoCierre(null);
  }

  async function subirArchivoCierre(archivo: File | null) {
    if (!archivo) return null;

    const extension = archivo.name.split(".").pop();
    const nombreArchivo = `${condominioId}/cierres/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("incidencias-cierres")
      .upload(nombreArchivo, archivo);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("incidencias-cierres")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function marcarEnProceso(i: Incidencia) {
    const confirmar = confirm(
      `¿Desea marcar la incidencia #${i.id} como En proceso?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("incidencias")
      .update({
        estado: "En proceso",
        responsable: usuarioNombre || "Técnico VAM",
      })
      .eq("id", i.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando incidencia: " + error.message);
      return;
    }

    alert("Incidencia marcada en proceso.");
    cargarIncidencias(condominioId);
  }

  async function cerrarIncidencia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!incidenciaActiva) {
      alert("Debe seleccionar una incidencia.");
      return;
    }

    if (!comentarioTecnico.trim()) {
      alert("Debe escribir el comentario técnico del cierre.");
      return;
    }

    const confirmar = confirm(
      `¿Desea cerrar la incidencia #${incidenciaActiva.id}?`
    );

    if (!confirmar) return;

    setLoading(true);
    setMensaje("");

    try {
      const evidenciaCierreUrl = await subirArchivoCierre(archivoCierre);

      const { error } = await supabase
        .from("incidencias")
        .update({
          estado: "Cerrado",
          comentario_tecnico: comentarioTecnico.trim(),
          comentario_admin: comentarioTecnico.trim(),
          responsable: usuarioNombre || "Técnico VAM",
          tecnico_cierre_id: usuarioAdminId ? Number(usuarioAdminId) : null,
          tecnico_cierre_nombre: usuarioNombre || "Técnico VAM",
          evidencia_cierre_url:
            evidenciaCierreUrl || incidenciaActiva.evidencia_cierre_url || null,
          fecha_cierre: new Date().toISOString(),
        })
        .eq("id", incidenciaActiva.id)
        .eq("condominio_id", Number(condominioId));

      if (error) {
        alert("Error cerrando incidencia: " + error.message);
        setLoading(false);
        return;
      }

      alert("Incidencia cerrada correctamente.");
      cancelarCerrar();
      await cargarIncidencias(condominioId);
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

  const incidenciasFiltradas = useMemo(() => {
    let lista = incidencias;

    if (filtroEstado === "ABIERTAS") {
      lista = lista.filter(
        (i) => i.estado !== "Cerrado" && i.estado !== "Resuelto"
      );
    } else if (filtroEstado !== "TODOS") {
      lista = lista.filter((i) => i.estado === filtroEstado);
    }

    if (buscar.trim()) {
      const texto = buscar.toLowerCase().trim();

      lista = lista.filter((i) => {
        const cadena = `
          ${i.id || ""}
          ${i.no_apartamento || ""}
          ${i.nombre_propietario || ""}
          ${i.titulo || ""}
          ${i.descripcion || ""}
          ${i.tipo_incidencia || ""}
          ${i.categoria || ""}
          ${i.prioridad || ""}
          ${i.estado || ""}
        `.toLowerCase();

        return cadena.includes(texto);
      });
    }

    return lista;
  }, [incidencias, filtroEstado, buscar]);

  const abiertas = incidencias.filter(
    (i) => i.estado !== "Cerrado" && i.estado !== "Resuelto"
  ).length;

  const cerradas = incidencias.filter(
    (i) => i.estado === "Cerrado" || i.estado === "Resuelto"
  ).length;

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
                Incidencias
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Consultar y cerrar incidencias desde el celular.
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
              onClick={() => cargarIncidencias(condominioId)}
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

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white border shadow-sm p-4">
            <p className="text-sm text-slate-500">Abiertas</p>
            <p className="text-2xl font-black text-yellow-700">{abiertas}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-4">
            <p className="text-sm text-slate-500">Cerradas</p>
            <p className="text-2xl font-black text-green-700">{cerradas}</p>
          </div>
        </section>

        {incidenciaActiva && (
          <section className="rounded-3xl bg-white border-2 border-green-300 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Cerrar incidencia #{incidenciaActiva.id}
                </h2>
                <p className="text-sm text-slate-500">
                  {incidenciaActiva.titulo || "Sin título"}
                </p>
              </div>

              <button
                type="button"
                onClick={cancelarCerrar}
                className="rounded-xl bg-slate-100 border px-3 py-2 text-xs font-bold text-slate-700"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={cerrarIncidencia} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">
                  Comentario técnico
                </label>
                <textarea
                  value={comentarioTecnico}
                  onChange={(e) => setComentarioTecnico(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  rows={4}
                  placeholder="Describa el trabajo realizado..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  Foto final / evidencia cierre
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) =>
                    setArchivoCierre(e.target.files?.[0] || null)
                  }
                  className="w-full rounded-xl border px-4 py-3 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-green-700 py-3 font-black text-white disabled:opacity-60"
              >
                {loading ? "Cerrando..." : "Cerrar incidencia"}
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
              <option value="ABIERTAS">Abiertas</option>
              <option value="TODOS">Todas</option>
              <option value="Reportado">Reportado</option>
              <option value="Recibido">Recibido</option>
              <option value="En revisión">En revisión</option>
              <option value="En proceso">En proceso</option>
              <option value="Pendiente proveedor">Pendiente proveedor</option>
              <option value="Resuelto">Resuelto</option>
              <option value="Cerrado">Cerrado</option>
              <option value="Rechazado">Rechazado</option>
            </select>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Buscar por apto, título o descripción..."
            />
          </div>
        </section>

        <section className="space-y-3">
          {loading && (
            <div className="rounded-2xl bg-white border shadow-sm p-5 text-sm text-slate-500">
              Cargando incidencias...
            </div>
          )}

          {!loading &&
            incidenciasFiltradas.map((i) => (
              <div key={i.id} className="rounded-3xl bg-white border shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${colorEstado(
                          i.estado
                        )}`}
                      >
                        {i.estado || "Sin estado"}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${colorPrioridad(
                          i.prioridad
                        )}`}
                      >
                        {i.prioridad || "Normal"}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900">
                      #{i.id} - {i.titulo || "Incidencia"}
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      Apto. {i.no_apartamento || "-"} ·{" "}
                      {fechaDominicana(i.fecha_reporte || i.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-600 space-y-1">
                  <p>
                    <strong>Tipo:</strong> {tipoIncidencia(i)}
                  </p>
                  <p>
                    <strong>Propietario:</strong>{" "}
                    {i.nombre_propietario || "-"}
                  </p>
                  <p>
                    <strong>Teléfono:</strong> {i.telefono || "-"}
                  </p>
                  <p>
                    <strong>Descripción:</strong> {i.descripcion || "-"}
                  </p>
                </div>

                {i.comentario_admin && (
                  <div className="mt-3 rounded-2xl bg-slate-50 border p-3">
                    <p className="text-xs font-bold text-slate-500">
                      Comentario administración
                    </p>
                    <p className="text-sm text-slate-700">
                      {i.comentario_admin}
                    </p>
                  </div>
                )}

                {i.comentario_tecnico && (
                  <div className="mt-3 rounded-2xl bg-green-50 border border-green-100 p-3">
                    <p className="text-xs font-bold text-green-700">
                      Comentario técnico
                    </p>
                    <p className="text-sm text-green-800">
                      {i.comentario_tecnico}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {evidenciaInicial(i) && (
                    <a
                      href={evidenciaInicial(i)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white"
                    >
                      Evidencia inicial
                    </a>
                  )}

                  {i.evidencia_cierre_url && (
                    <a
                      href={i.evidencia_cierre_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-green-700 px-3 py-2 text-xs font-bold text-white"
                    >
                      Evidencia cierre
                    </a>
                  )}
                </div>

                {i.estado !== "Cerrado" && i.estado !== "Resuelto" && (
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    {i.estado !== "En proceso" && (
                      <button
                        type="button"
                        onClick={() => marcarEnProceso(i)}
                        className="w-full rounded-xl bg-blue-700 py-3 text-sm font-black text-white"
                      >
                        Marcar en proceso
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => abrirCerrar(i)}
                      className="w-full rounded-xl bg-green-700 py-3 text-sm font-black text-white"
                    >
                      Cerrar incidencia
                    </button>
                  </div>
                )}
              </div>
            ))}

          {!loading && incidenciasFiltradas.length === 0 && (
            <div className="rounded-3xl bg-white border shadow-sm p-6 text-center text-sm text-slate-500">
              No hay incidencias para mostrar.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}