"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { ArrowLeft, Upload, CheckCircle } from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono?: string;
  correo?: string;
};

type AreaSocial = {
  id: number;
  nombre_area: string;
  costo_reserva: number;
};

type Reserva = {
  id: number;
  fecha_reserva: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  motivo?: string | null;
  cantidad_personas?: number | null;
  monto_pagado?: number | null;
  comprobante_url?: string | null;
  estado?: string | null;
  created_at?: string | null;
  areas_sociales?: {
    nombre_area?: string | null;
  } | null;
};

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(valor || 0);
}

export default function ReservasPropietariosPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );

  const [areas, setAreas] = useState<AreaSocial[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  const [areaId, setAreaId] = useState("");
  const [fechaReserva, setFechaReserva] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [cantidadPersonas, setCantidadPersonas] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingReservas, setLoadingReservas] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("propietario_actual");

    if (!raw) {
      router.push("/movil/propietarios/login");
      return;
    }

    const prop = JSON.parse(raw);
    setPropietario(prop);
    cargarAreas(prop);
    cargarReservas(prop);
  }, [router]);

  async function cargarAreas(prop: PropietarioActual) {
    const { data, error } = await supabase
      .from("areas_sociales")
      .select("id, nombre_area, costo_reserva")
      .eq("condominio", prop.condominio_nombre)
      .eq("estado", "activa")
      .order("nombre_area");

    if (error) {
      setMensaje("Error cargando áreas sociales: " + error.message);
      return;
    }

    setAreas(data || []);
  }

  async function cargarReservas(prop: PropietarioActual) {
    setLoadingReservas(true);

    const { data, error } = await supabase
      .from("reservas_areas_sociales")
      .select(`
        id,
        fecha_reserva,
        hora_inicio,
        hora_fin,
        motivo,
        cantidad_personas,
        monto_pagado,
        comprobante_url,
        estado,
        created_at,
        areas_sociales (
          nombre_area
        )
      `)
      .eq("propietario_id", prop.propietario_id)
      .order("created_at", { ascending: false });

    setLoadingReservas(false);

    if (error) {
      setMensaje("Error cargando reservas: " + error.message);
      return;
    }

    setReservas(data || []);
  }

  async function subirComprobante() {
    if (!comprobante) return "";

    const extension = comprobante.name.split(".").pop();
    const nombreArchivo = `reservas/${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("comprobantes-reservas")
      .upload(nombreArchivo, comprobante, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error("Error subiendo comprobante: " + error.message);
    }

    const { data } = supabase.storage
      .from("comprobantes-reservas")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function guardarReserva() {
    if (!propietario) return;

    setMensaje("");
    setExito(false);

    if (!areaId) {
      setMensaje("Debe seleccionar el área social.");
      return;
    }

    if (!fechaReserva) {
      setMensaje("Debe seleccionar la fecha de la reserva.");
      return;
    }

    if (!horaInicio || !horaFin) {
      setMensaje("Debe indicar la hora de inicio y la hora de fin.");
      return;
    }

    if (!motivo.trim()) {
      setMensaje("Debe indicar el motivo de la reserva.");
      return;
    }

    setLoading(true);

    try {
      const comprobanteUrl = await subirComprobante();

      const { error } = await supabase.from("reservas_areas_sociales").insert([
        {
          area_social_id: Number(areaId),
          propietario_id: propietario.propietario_id,
          condominio: propietario.condominio_nombre,
          no_apartamento: propietario.no_apartamento,
          nombre_propietario: propietario.nombre_propietario,
          cedula: propietario.cedula,
          telefono: propietario.telefono || "",
          fecha_reserva: fechaReserva,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          motivo: motivo.trim(),
          cantidad_personas: Number(cantidadPersonas || 0),
          monto_pagado: Number(montoPagado || 0),
          comprobante_url: comprobanteUrl,
          estado: "Pendiente aprobación",
        },
      ]);

      if (error) {
        setMensaje("Error registrando reserva: " + error.message);
        return;
      }

      setExito(true);
      setMensaje("Reserva enviada correctamente. Quedará pendiente de aprobación.");

      setAreaId("");
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

      await cargarReservas(propietario);
    } catch (err: any) {
      setMensaje(err.message || "Error registrando reserva.");
    } finally {
      setLoading(false);
    }
  }

  const areaSeleccionada = areas.find((a) => String(a.id) === areaId);

  if (!propietario) {
    return <div className="p-6 text-center text-slate-500">Cargando...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <header className="bg-slate-950 text-white rounded-3xl p-5 shadow">
        <button
          onClick={() => router.push("/movil/propietarios/dashboard")}
          className="flex items-center gap-2 text-sm text-slate-300 mb-4"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <p className="text-sm text-slate-300">Reservas</p>
        <h1 className="text-xl font-bold">Área social</h1>
        <p className="text-xs text-slate-300">
          {propietario.condominio_nombre} · {propietario.no_apartamento}
        </p>
      </header>

      {mensaje && (
        <div
          className={`rounded-2xl p-3 text-sm ${
            exito
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {exito && <CheckCircle className="inline mr-1" size={16} />}
          {mensaje}
        </div>
      )}

      <section className="bg-white rounded-3xl border shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Área social
          </label>

          <select
            value={areaId}
            onChange={(e) => {
              setAreaId(e.target.value);
              const area = areas.find((a) => String(a.id) === e.target.value);
              if (area) {
                setMontoPagado(String(area.costo_reserva || ""));
              }
            }}
            className="w-full border rounded-2xl px-4 py-3 bg-white"
          >
            <option value="">Seleccione área social</option>

            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre_area} - {formatoMoneda(Number(a.costo_reserva || 0))}
              </option>
            ))}
          </select>

          {areas.length === 0 && (
            <p className="text-xs text-orange-600 mt-1">
              No hay áreas sociales activas para este condominio.
            </p>
          )}
        </div>

        {areaSeleccionada && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
            <p className="text-xs text-blue-700">Costo de reserva</p>
            <p className="font-bold text-blue-900">
              {formatoMoneda(Number(areaSeleccionada.costo_reserva || 0))}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Fecha de reserva
          </label>
          <input
            type="date"
            value={fechaReserva}
            onChange={(e) => setFechaReserva(e.target.value)}
            className="w-full border rounded-2xl px-4 py-3"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Hora inicio
            </label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full border rounded-2xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Hora fin
            </label>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="w-full border rounded-2xl px-4 py-3"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Cantidad de personas
          </label>
          <input
            type="number"
            value={cantidadPersonas}
            onChange={(e) => setCantidadPersonas(e.target.value)}
            placeholder="Ej. 20"
            className="w-full border rounded-2xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Monto pagado
          </label>
          <input
            type="number"
            step="0.01"
            value={montoPagado}
            onChange={(e) => setMontoPagado(e.target.value)}
            placeholder="0.00"
            className="w-full border rounded-2xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Motivo de la reserva
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. Cumpleaños familiar"
            rows={3}
            className="w-full border rounded-2xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Comprobante
          </label>

          <label className="border-2 border-dashed rounded-3xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50">
            <Upload className="text-blue-700 mb-2" size={28} />

            <span className="text-sm font-bold text-slate-700">
              Subir comprobante
            </span>

            <span className="text-xs text-slate-500 mt-1">
              PDF o imagen del pago de la reserva
            </span>

            <input
              id="comprobanteReserva"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setComprobante(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          {comprobante && (
            <p className="text-xs text-slate-600 mt-2">
              Archivo seleccionado: <b>{comprobante.name}</b>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={guardarReserva}
          disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white py-4 rounded-2xl font-bold text-lg"
        >
          {loading ? "Enviando..." : "Enviar solicitud"}
        </button>
      </section>

      <section className="bg-white rounded-3xl border shadow-sm p-5">
        <h2 className="font-bold text-slate-900 mb-3">Mis reservas</h2>

        {loadingReservas ? (
          <p className="text-sm text-slate-500">Cargando reservas...</p>
        ) : reservas.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tiene reservas registradas.
          </p>
        ) : (
          <div className="space-y-3">
            {reservas.map((r) => (
              <div key={r.id} className="border rounded-2xl p-3">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">
                      {r.areas_sociales?.nombre_area || "Área social"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.fecha_reserva} · {r.hora_inicio || "--"} a{" "}
                      {r.hora_fin || "--"}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-bold h-fit rounded-xl px-2 py-1 ${
                      r.estado === "Aprobada"
                        ? "bg-green-100 text-green-700"
                        : r.estado === "Rechazada"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {r.estado || "Pendiente"}
                  </span>
                </div>

                {r.motivo && (
                  <p className="text-sm text-slate-600 mt-2">{r.motivo}</p>
                )}

                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="bg-slate-50 rounded-xl p-2">
                    <p className="text-slate-500">Personas</p>
                    <p className="font-bold">{r.cantidad_personas || 0}</p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2">
                    <p className="text-slate-500">Monto</p>
                    <p className="font-bold">
                      {formatoMoneda(Number(r.monto_pagado || 0))}
                    </p>
                  </div>
                </div>

                {r.comprobante_url && (
                  <a
                    href={r.comprobante_url}
                    target="_blank"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-700"
                  >
                    Ver comprobante
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}