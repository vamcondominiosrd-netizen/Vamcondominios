"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type EvidenciaOperativa = {
  id: number;
  condominio_id: number;
  fecha: string;
  tipo_evidencia: string;
  descripcion: string | null;
  ubicacion: string | null;
  evidencia_url: string | null;
  tecnico_id: number | null;
  tecnico_nombre: string | null;
  estado: string;
  created_at: string | null;
};

export default function MobileTecnicoEvidenciasPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [usuarioAdminId, setUsuarioAdminId] = useState("");

  const [evidencias, setEvidencias] = useState<EvidenciaOperativa[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [tipoEvidencia, setTipoEvidencia] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);

  const [buscar, setBuscar] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");

  const tipos = [
    "Limpieza",
    "Basura",
    "Bomba de agua",
    "Cisterna",
    "Tinacos",
    "Área común",
    "Portón",
    "Electricidad",
    "Parqueo",
    "Jardinería",
    "Seguridad",
    "Otro",
  ];

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

    cargarEvidencias(id);
  }, [router]);

  async function cargarEvidencias(id: string) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("evidencias_operativas")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false })
      .limit(30);

    setLoading(false);

    if (error) {
      setMensaje("Error cargando evidencias: " + error.message);
      return;
    }

    setEvidencias((data as EvidenciaOperativa[]) || []);
  }

  function limpiarFormulario() {
    setFecha(new Date().toISOString().slice(0, 10));
    setTipoEvidencia("");
    setUbicacion("");
    setDescripcion("");
    setArchivo(null);
  }

  function fechaDominicana(fechaValor?: string | null) {
    if (!fechaValor) return "-";

    const d = new Date(fechaValor);

    if (Number.isNaN(d.getTime())) return fechaValor;

    return d.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  async function subirArchivoEvidencia(archivoSubir: File | null) {
    if (!archivoSubir) return null;

    const extension = archivoSubir.name.split(".").pop();
    const nombreArchivo = `${condominioId}/evidencias/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("evidencias-operativas")
      .upload(nombreArchivo, archivoSubir);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("evidencias-operativas")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function guardarEvidencia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (!fecha) {
      alert("Debe indicar la fecha.");
      return;
    }

    if (!tipoEvidencia) {
      alert("Debe seleccionar el tipo de evidencia.");
      return;
    }

    if (!descripcion.trim()) {
      alert("Debe escribir una descripción.");
      return;
    }

    if (!archivo) {
      alert("Debe subir una foto o evidencia.");
      return;
    }

    const confirmar = confirm("¿Desea guardar esta evidencia operativa?");

    if (!confirmar) return;

    setLoading(true);
    setMensaje("");

    try {
      const evidenciaUrl = await subirArchivoEvidencia(archivo);

      const { error } = await supabase.from("evidencias_operativas").insert([
        {
          condominio_id: Number(condominioId),
          fecha,
          tipo_evidencia: tipoEvidencia,
          descripcion: descripcion.trim(),
          ubicacion: ubicacion.trim() || null,
          evidencia_url: evidenciaUrl,
          tecnico_id: usuarioAdminId ? Number(usuarioAdminId) : null,
          tecnico_nombre: usuarioNombre || "Técnico VAM",
          estado: "Registrado",
        },
      ]);

      if (error) {
        alert("Error guardando evidencia: " + error.message);
        setLoading(false);
        return;
      }

      alert("Evidencia registrada correctamente.");
      limpiarFormulario();
      await cargarEvidencias(condominioId);
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

  const evidenciasFiltradas = useMemo(() => {
    let lista = evidencias;

    if (filtroTipo !== "TODOS") {
      lista = lista.filter((e) => e.tipo_evidencia === filtroTipo);
    }

    if (buscar.trim()) {
      const texto = buscar.toLowerCase().trim();

      lista = lista.filter((e) => {
        const cadena = `
          ${e.id || ""}
          ${e.tipo_evidencia || ""}
          ${e.descripcion || ""}
          ${e.ubicacion || ""}
          ${e.tecnico_nombre || ""}
          ${e.estado || ""}
        `.toLowerCase();

        return cadena.includes(texto);
      });
    }

    return lista;
  }, [evidencias, filtroTipo, buscar]);

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
                Evidencias Operativas
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Subir fotos de trabajos, áreas comunes y situaciones del
                condominio.
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
              onClick={() => cargarEvidencias(condominioId)}
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

        <section className="rounded-3xl bg-white border shadow-sm p-5">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            Nueva evidencia
          </h2>

          <form onSubmit={guardarEvidencia} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Tipo de evidencia
              </label>
              <select
                value={tipoEvidencia}
                onChange={(e) => setTipoEvidencia(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 bg-white"
              >
                <option value="">Seleccione</option>
                {tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Ubicación
              </label>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                placeholder="Ej. Área común, bomba, parqueo, depósito..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                rows={3}
                placeholder="Describa la evidencia..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Foto / evidencia
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                className="w-full rounded-xl border px-4 py-3 bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-purple-700 py-3 font-black text-white disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar evidencia"}
            </button>

            <button
              type="button"
              onClick={limpiarFormulario}
              className="w-full rounded-xl border bg-slate-50 py-3 font-bold text-slate-800"
            >
              Limpiar
            </button>
          </form>
        </section>

        <section className="rounded-3xl bg-white border shadow-sm p-5">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            Filtros
          </h2>

          <div className="space-y-3">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 bg-white"
            >
              <option value="TODOS">Todos los tipos</option>
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Buscar por descripción o ubicación..."
            />
          </div>
        </section>

        <section className="space-y-3">
          {loading && (
            <div className="rounded-2xl bg-white border shadow-sm p-5 text-sm text-slate-500">
              Cargando evidencias...
            </div>
          )}

          {!loading &&
            evidenciasFiltradas.map((e) => (
              <div key={e.id} className="rounded-3xl bg-white border shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                      {e.tipo_evidencia}
                    </span>

                    <h3 className="text-lg font-black text-slate-900 mt-2">
                      Evidencia #{e.id}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {fechaDominicana(e.fecha)}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    {e.estado}
                  </span>
                </div>

                <div className="mt-3 text-sm text-slate-600 space-y-1">
                  <p>
                    <strong>Ubicación:</strong> {e.ubicacion || "-"}
                  </p>
                  <p>
                    <strong>Descripción:</strong> {e.descripcion || "-"}
                  </p>
                  <p>
                    <strong>Técnico:</strong> {e.tecnico_nombre || "-"}
                  </p>
                </div>

                {e.evidencia_url && (
                  <div className="mt-4">
                    <a
                      href={e.evidencia_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-xl bg-purple-700 px-4 py-3 text-sm font-black text-white"
                    >
                      Ver evidencia
                    </a>
                  </div>
                )}
              </div>
            ))}

          {!loading && evidenciasFiltradas.length === 0 && (
            <div className="rounded-3xl bg-white border shadow-sm p-6 text-center text-sm text-slate-500">
              No hay evidencias registradas.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}