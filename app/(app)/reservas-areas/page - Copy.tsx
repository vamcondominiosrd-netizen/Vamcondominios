"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type AreaSocial = {
  id: number;
  nombre_area: string;
  costo_reserva: number;
};

type Unidad = {
  id: number;
  codigo: string;
};

type Reserva = {
  id: number;
  condominio: string;
  no_apartamento: string;
  nombre_propietario: string;
  telefono: string;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  cantidad_personas: number;
  monto_pagado: number;
  comprobante_url: string;
  estado: string;
  comentario_admin: string;
  created_at: string;
  areas_sociales?: {
    nombre_area: string;
  };
};

export default function ReservasAreasAdminPage() {
  const [condominio, setCondominio] = useState("");
  const [condominioId, setCondominioId] = useState("");

  const [areas, setAreas] = useState<AreaSocial[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});

  const [areaSocialId, setAreaSocialId] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [fechaReserva, setFechaReserva] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [cantidadPersonas, setCantidadPersonas] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const id = localStorage.getItem("condominio_id") || "";

    setCondominio(nombre);
    setCondominioId(id);

    if (nombre && id) {
      cargarDatos(nombre, id);
    }
  }, []);

  async function cargarDatos(nombre: string, id: string) {
    await Promise.all([
      cargarAreas(nombre),
      cargarUnidades(id),
      cargarReservas(nombre),
    ]);
  }

  async function cargarAreas(nombre: string) {
    const { data, error } = await supabase
      .from("areas_sociales")
      .select("id, nombre_area, costo_reserva")
      .eq("condominio", nombre)
      .eq("estado", "activa")
      .order("nombre_area");

    if (error) {
      alert("Error cargando áreas: " + error.message);
      return;
    }

    setAreas(data || []);
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo");

    if (error) {
      alert("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades(data || []);
  }

  async function cargarReservas(nombre: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("reservas_areas_sociales")
      .select(`
        *,
        areas_sociales(nombre_area)
      `)
      .eq("condominio", nombre)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando reservas: " + error.message);
      return;
    }

    setReservas((data as Reserva[]) || []);
  }

  async function subirComprobante() {
    if (!comprobante) return "";

    const extension = comprobante.name.split(".").pop();
    const nombreArchivo = `${condominioId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const { error } = await supabase.storage
      .from("comprobantes-reservas")
      .upload(nombreArchivo, comprobante);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("comprobantes-reservas")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function guardarReserva(e: React.FormEvent) {
    e.preventDefault();

    if (!areaSocialId || !unidadId || !fechaReserva || !horaInicio || !horaFin) {
      alert("Debe completar área, apartamento, fecha y horario.");
      return;
    }

    const unidad = unidades.find((u) => String(u.id) === unidadId);

    if (!unidad) {
      alert("Debe seleccionar una unidad válida.");
      return;
    }

    const { data: propietario, error: errorPropietario } = await supabase
      .from("propietarios_apartamentos")
      .select("id, nombre_propietario, cedula, telefono, no_apartamento")
      .eq("condominio_id", Number(condominioId))
      .eq("no_apartamento", unidad.codigo)
      .maybeSingle();

    if (errorPropietario || !propietario) {
      alert("No se encontró propietario para este apartamento.");
      return;
    }

    try {
      const comprobanteUrl = await subirComprobante();

      const { error } = await supabase.from("reservas_areas_sociales").insert([
        {
          area_social_id: Number(areaSocialId),
          propietario_id: propietario.id,
          condominio,
          no_apartamento: unidad.codigo,
          nombre_propietario: propietario.nombre_propietario,
          cedula: propietario.cedula,
          telefono: propietario.telefono,
          fecha_reserva: fechaReserva,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          motivo,
          cantidad_personas: Number(cantidadPersonas || 0),
          monto_pagado: Number(montoPagado || 0),
          comprobante_url: comprobanteUrl,
          estado: "Pendiente aprobación",
        },
      ]);

      if (error) {
        alert("Error guardando reserva: " + error.message);
        return;
      }

      alert("Reserva registrada correctamente.");

      setAreaSocialId("");
      setUnidadId("");
      setFechaReserva("");
      setHoraInicio("");
      setHoraFin("");
      setMotivo("");
      setCantidadPersonas("");
      setMontoPagado("");
      setComprobante(null);

      const inputFile = document.getElementById(
        "comprobanteReserva"
      ) as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";

      cargarReservas(condominio);
    } catch (err: any) {
      alert("Error subiendo comprobante: " + err.message);
    }
  }

  async function actualizarReserva(id: number, nuevoEstado: string) {
    const comentario = comentarios[id] || "";

    if (
      (nuevoEstado === "Rechazada" || nuevoEstado === "Cancelada") &&
      !comentario
    ) {
      alert("Debe escribir un comentario.");
      return;
    }

    const confirmar = confirm(`¿Desea cambiar la reserva a ${nuevoEstado}?`);

    if (!confirmar) return;

    const { error } = await supabase
      .from("reservas_areas_sociales")
      .update({
        estado: nuevoEstado,
        comentario_admin: comentario,
        fecha_aprobacion:
          nuevoEstado === "Aprobada" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("condominio", condominio);

    if (error) {
      alert("Error actualizando reserva: " + error.message);
      return;
    }

    alert("Reserva actualizada correctamente.");
    cargarReservas(condominio);
  }

  const reservasFiltradas = reservas.filter(
    (r) => filtroEstado === "" || r.estado === filtroEstado
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reservas de Áreas Sociales</h1>
        <p className="text-slate-500">
          Solicitud, aprobación y seguimiento de reservas.
        </p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Condominio activo
        </p>
        <p className="font-bold mt-1">{condominio}</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Nueva reserva</h2>

        <form
          onSubmit={guardarReserva}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <select
            value={areaSocialId}
            onChange={(e) => setAreaSocialId(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
          >
            <option value="">Seleccione área social</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre_area} - RD${Number(a.costo_reserva || 0).toLocaleString("es-DO")}
              </option>
            ))}
          </select>

          <select
            value={unidadId}
            onChange={(e) => setUnidadId(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
          >
            <option value="">Seleccione apartamento</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.codigo}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fechaReserva}
            onChange={(e) => setFechaReserva(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <input
            type="number"
            value={cantidadPersonas}
            onChange={(e) => setCantidadPersonas(e.target.value)}
            placeholder="Cantidad de personas"
            className="border rounded-lg px-3 py-2 w-full"
          />

          <input
            type="number"
            step="0.01"
            value={montoPagado}
            onChange={(e) => setMontoPagado(e.target.value)}
            placeholder="Monto pagado RD$"
            className="border rounded-lg px-3 py-2 w-full"
          />

          <input
            id="comprobanteReserva"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setComprobante(e.target.files?.[0] || null)}
            className="border rounded-lg px-3 py-2 w-full md:col-span-2"
          />

          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de la reserva"
            rows={3}
            className="border rounded-lg px-3 py-2 w-full md:col-span-2"
          />

          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800"
            >
              Guardar reserva
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between mb-4 gap-4">
          <h2 className="text-xl font-bold">Listado de reservas</h2>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="Pendiente aprobación">Pendiente aprobación</option>
            <option value="Aprobada">Aprobada</option>
            <option value="Rechazada">Rechazada</option>
            <option value="Cancelada">Cancelada</option>
            <option value="Finalizada">Finalizada</option>
          </select>
        </div>

        {loading ? (
          <p>Cargando reservas...</p>
        ) : (
          <div className="space-y-4">
            {reservasFiltradas.map((r) => (
              <div key={r.id} className="border rounded-2xl p-5">
                <h3 className="text-xl font-bold">
                  Reserva #{r.id} - {r.areas_sociales?.nombre_area}
                </h3>

                <p className="text-sm text-slate-500">
                  Apto. {r.no_apartamento} | Propietario:{" "}
                  <strong>{r.nombre_propietario}</strong>
                </p>

                <p className="text-sm mt-2">
                  Fecha: {r.fecha_reserva} | Horario: {r.hora_inicio} -{" "}
                  {r.hora_fin}
                </p>

                <p className="text-sm mt-2">
                  Estado: <strong>{r.estado}</strong>
                </p>

                {r.comprobante_url && (
                  <a
                    href={r.comprobante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg inline-block mt-3"
                  >
                    Ver comprobante
                  </a>
                )}

                {r.estado === "Pendiente aprobación" && (
                  <div className="mt-4 border-t pt-4 space-y-3">
                    <textarea
                      value={comentarios[r.id] || ""}
                      onChange={(e) =>
                        setComentarios({
                          ...comentarios,
                          [r.id]: e.target.value,
                        })
                      }
                      placeholder="Comentario administrativo"
                      className="border rounded-lg px-3 py-2 w-full"
                      rows={2}
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => actualizarReserva(r.id, "Aprobada")}
                        className="bg-green-700 text-white px-4 py-2 rounded-lg"
                      >
                        Aprobar
                      </button>

                      <button
                        onClick={() => actualizarReserva(r.id, "Rechazada")}
                        className="bg-red-700 text-white px-4 py-2 rounded-lg"
                      >
                        Rechazar
                      </button>

                      <button
                        onClick={() => actualizarReserva(r.id, "Cancelada")}
                        className="bg-slate-700 text-white px-4 py-2 rounded-lg"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {reservasFiltradas.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No hay reservas registradas.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}