"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type PuntoChecklist = {
  punto: string;
  resultado: string;
  comentario: string;
};

type Visita = {
  id: number;
  condominio_id: number;
  tecnico_id: number | null;
  tecnico_nombre: string | null;
  fecha: string;
  titulo: string;
  hora_llegada: string | null;
  hora_salida: string | null;
  observacion_general: string | null;
  foto_general_url: string | null;
  estado: string;
  created_at: string | null;
};

type DetalleVisita = {
  id: number;
  visita_id: number;
  punto: string;
  resultado: string;
  comentario: string | null;
  evidencia_url: string | null;
};

export default function MobileTecnicoChecklistVisitaPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [usuarioAdminId, setUsuarioAdminId] = useState("");

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [horaLlegada, setHoraLlegada] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [observacionGeneral, setObservacionGeneral] = useState("");
  const [fotoGeneral, setFotoGeneral] = useState<File | null>(null);

  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [detalles, setDetalles] = useState<DetalleVisita[]>([]);
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<Visita | null>(
    null
  );

  const puntosBase = [
    "Bomba de agua",
    "Cisterna",
    "Tinacos",
    "Portón eléctrico",
    "Luces áreas comunes",
    "Basura",
    "Parqueos",
    "Área común",
    "Gas",
    "Seguridad",
    "Limpieza",
  ];

  const [puntos, setPuntos] = useState<PuntoChecklist[]>(
    puntosBase.map((p) => ({
      punto: p,
      resultado: "Bien",
      comentario: "",
    }))
  );

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

    cargarVisitas(id, usuarioId);
  }, [router]);

  async function cargarVisitas(id: string, tecnicoId?: string) {
    const idTecnico = tecnicoId || usuarioAdminId;

    setLoading(true);
    setMensaje("");

    let query = supabase
      .from("checklist_visitas")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("id", { ascending: false })
      .limit(10);

    if (idTecnico) {
      query = query.eq("tecnico_id", Number(idTecnico));
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      setMensaje("Error cargando visitas: " + error.message);
      return;
    }

    setVisitas((data as Visita[]) || []);
  }

  async function cargarDetalleVisita(visita: Visita) {
    setVisitaSeleccionada(visita);
    setLoading(true);

    const { data, error } = await supabase
      .from("checklist_visitas_detalle")
      .select("*")
      .eq("visita_id", visita.id)
      .order("id", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando detalle: " + error.message);
      return;
    }

    setDetalles((data as DetalleVisita[]) || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function actualizarPunto(index: number, campo: keyof PuntoChecklist, valor: string) {
    setPuntos((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              [campo]: valor,
            }
          : p
      )
    );
  }

  function limpiarFormulario() {
    setFecha(new Date().toISOString().slice(0, 10));
    setHoraLlegada("");
    setHoraSalida("");
    setObservacionGeneral("");
    setFotoGeneral(null);
    setPuntos(
      puntosBase.map((p) => ({
        punto: p,
        resultado: "Bien",
        comentario: "",
      }))
    );
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

  function colorResultado(resultado: string) {
    if (resultado === "Bien") return "bg-green-100 text-green-700";
    if (resultado === "Requiere Atención")
      return "bg-yellow-100 text-yellow-700";
    if (resultado === "Crítico") return "bg-red-100 text-red-700";
    if (resultado === "No Aplica") return "bg-slate-100 text-slate-700";
    return "bg-slate-100 text-slate-700";
  }

  async function subirFotoGeneral(archivo: File | null) {
    if (!archivo) return null;

    const extension = archivo.name.split(".").pop();
    const nombreArchivo = `${condominioId}/visitas/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("checklist-visitas")
      .upload(nombreArchivo, archivo);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("checklist-visitas")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function guardarChecklist(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (!fecha) {
      alert("Debe indicar la fecha.");
      return;
    }

    if (!horaLlegada) {
      alert("Debe indicar la hora de llegada.");
      return;
    }

    if (!horaSalida) {
      alert("Debe indicar la hora de salida.");
      return;
    }

    const puntosCriticos = puntos.filter((p) => p.resultado === "Crítico");
    const puntosAtencion = puntos.filter(
      (p) => p.resultado === "Requiere Atención"
    );

    const confirmar = confirm(
      `¿Desea guardar este checklist?\n\nRequieren atención: ${puntosAtencion.length}\nCríticos: ${puntosCriticos.length}`
    );

    if (!confirmar) return;

    setLoading(true);
    setMensaje("");

    try {
      const fotoUrl = await subirFotoGeneral(fotoGeneral);

      const { data: visitaData, error: visitaError } = await supabase
        .from("checklist_visitas")
        .insert([
          {
            condominio_id: Number(condominioId),
            tecnico_id: usuarioAdminId ? Number(usuarioAdminId) : null,
            tecnico_nombre: usuarioNombre || "Técnico VAM",
            fecha,
            titulo: "Checklist de visita",
            hora_llegada: horaLlegada || null,
            hora_salida: horaSalida || null,
            observacion_general: observacionGeneral.trim() || null,
            foto_general_url: fotoUrl,
            estado: "Registrado",
          },
        ])
        .select("id")
        .single();

      if (visitaError) {
        alert("Error guardando visita: " + visitaError.message);
        setLoading(false);
        return;
      }

      const detallesInsert = puntos.map((p) => ({
        visita_id: visitaData.id,
        punto: p.punto,
        resultado: p.resultado,
        comentario: p.comentario.trim() || null,
        evidencia_url: null,
      }));

      const { error: detalleError } = await supabase
        .from("checklist_visitas_detalle")
        .insert(detallesInsert);

      if (detalleError) {
        alert("La visita se creó, pero falló el detalle: " + detalleError.message);
        setLoading(false);
        return;
      }

      alert("Checklist guardado correctamente.");
      limpiarFormulario();
      await cargarVisitas(condominioId, usuarioAdminId);
    } catch (error: any) {
      alert("Error subiendo foto: " + error.message);
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

  const resumenActual = useMemo(() => {
    return {
      bien: puntos.filter((p) => p.resultado === "Bien").length,
      atencion: puntos.filter((p) => p.resultado === "Requiere Atención").length,
      critico: puntos.filter((p) => p.resultado === "Crítico").length,
      noAplica: puntos.filter((p) => p.resultado === "No Aplica").length,
    };
  }, [puntos]);

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
                Checklist de Visita
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Revisión operativa del condominio.
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
              onClick={() => cargarVisitas(condominioId, usuarioAdminId)}
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

        {visitaSeleccionada && (
          <section className="rounded-3xl bg-white border-2 border-blue-300 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Detalle visita #{visitaSeleccionada.id}
                </h2>
                <p className="text-sm text-slate-500">
                  {fechaDominicana(visitaSeleccionada.fecha)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setVisitaSeleccionada(null);
                  setDetalles([]);
                }}
                className="rounded-xl bg-slate-100 border px-3 py-2 text-xs font-bold text-slate-700"
              >
                Cerrar
              </button>
            </div>

            <div className="text-sm text-slate-600 space-y-1">
              <p>
                <strong>Llegada:</strong>{" "}
                {visitaSeleccionada.hora_llegada || "-"}
              </p>
              <p>
                <strong>Salida:</strong> {visitaSeleccionada.hora_salida || "-"}
              </p>
              <p>
                <strong>Observación:</strong>{" "}
                {visitaSeleccionada.observacion_general || "-"}
              </p>
            </div>

            {visitaSeleccionada.foto_general_url && (
              <div className="mt-4">
                <a
                  href={visitaSeleccionada.foto_general_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
                >
                  Ver foto general
                </a>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {detalles.map((d) => (
                <div key={d.id} className="rounded-2xl border bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-900">{d.punto}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${colorResultado(
                        d.resultado
                      )}`}
                    >
                      {d.resultado}
                    </span>
                  </div>

                  {d.comentario && (
                    <p className="text-sm text-slate-600 mt-2">
                      {d.comentario}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-4 gap-2">
          <div className="rounded-2xl bg-white border shadow-sm p-3 text-center">
            <p className="text-xs text-slate-500">Bien</p>
            <p className="text-xl font-black text-green-700">
              {resumenActual.bien}
            </p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-3 text-center">
            <p className="text-xs text-slate-500">Atención</p>
            <p className="text-xl font-black text-yellow-700">
              {resumenActual.atencion}
            </p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-3 text-center">
            <p className="text-xs text-slate-500">Crítico</p>
            <p className="text-xl font-black text-red-700">
              {resumenActual.critico}
            </p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-3 text-center">
            <p className="text-xs text-slate-500">N/A</p>
            <p className="text-xl font-black text-slate-700">
              {resumenActual.noAplica}
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white border shadow-sm p-5">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            Nueva visita
          </h2>

          <form onSubmit={guardarChecklist} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">
                  Hora llegada
                </label>
                <input
                  type="time"
                  value={horaLlegada}
                  onChange={(e) => setHoraLlegada(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  Hora salida
                </label>
                <input
                  type="time"
                  value={horaSalida}
                  onChange={(e) => setHoraSalida(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Foto general
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setFotoGeneral(e.target.files?.[0] || null)}
                className="w-full rounded-xl border px-4 py-3 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Observación general
              </label>
              <textarea
                value={observacionGeneral}
                onChange={(e) => setObservacionGeneral(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                rows={3}
                placeholder="Resumen general de la visita..."
              />
            </div>

            <div className="space-y-3">
              {puntos.map((p, index) => (
                <div key={p.punto} className="rounded-2xl border bg-slate-50 p-4">
                  <p className="font-black text-slate-900">{p.punto}</p>

                  <div className="mt-3">
                    <label className="block text-sm font-bold mb-1">
                      Estado
                    </label>
                    <select
                      value={p.resultado}
                      onChange={(e) =>
                        actualizarPunto(index, "resultado", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3 bg-white"
                    >
                      <option value="Bien">Bien</option>
                      <option value="Requiere Atención">
                        Requiere Atención
                      </option>
                      <option value="Crítico">Crítico</option>
                      <option value="No Aplica">No Aplica</option>
                    </select>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-bold mb-1">
                      Comentario
                    </label>
                    <textarea
                      value={p.comentario}
                      onChange={(e) =>
                        actualizarPunto(index, "comentario", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      rows={2}
                      placeholder="Comentario opcional..."
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-700 py-3 font-black text-white disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar checklist"}
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
          <h2 className="text-lg font-black text-slate-900">
            Últimas visitas
          </h2>

          <div className="mt-4 space-y-3">
            {visitas.map((v) => (
              <div key={v.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">
                      Visita #{v.id}
                    </p>
                    <p className="text-sm text-slate-500">
                      {fechaDominicana(v.fecha)}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    {v.estado}
                  </span>
                </div>

                <div className="mt-3 text-sm text-slate-600 space-y-1">
                  <p>
                    <strong>Llegada:</strong> {v.hora_llegada || "-"}
                  </p>
                  <p>
                    <strong>Salida:</strong> {v.hora_salida || "-"}
                  </p>
                  <p>
                    <strong>Observación:</strong>{" "}
                    {v.observacion_general || "-"}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => cargarDetalleVisita(v)}
                    className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
                  >
                    Ver detalle
                  </button>

                  {v.foto_general_url && (
                    <a
                      href={v.foto_general_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-black text-white"
                    >
                      Foto
                    </a>
                  )}
                </div>
              </div>
            ))}

            {!loading && visitas.length === 0 && (
              <p className="text-sm text-slate-500">
                No hay visitas registradas.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}