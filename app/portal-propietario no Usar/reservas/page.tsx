"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type AreaSocial = {
  id: number;
  condominio: string;
  nombre_area: string;
  descripcion: string;
  costo_reserva: number;
  hora_inicio: string;
  hora_fin: string;
  reglas: string;
  estado: string;
};

type Propietario = {
  id: number;
  condominio: string;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono: string;
};

export default function ReservasAreasPage() {
  const [areas, setAreas] = useState<AreaSocial[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [condominio, setCondominio] = useState("");
  const [noApartamento, setNoApartamento] = useState("");
  const [cedula, setCedula] = useState("");

  const [propietario, setPropietario] =
    useState<Propietario | null>(null);

  const [areaSeleccionada, setAreaSeleccionada] = useState("");
  const [fechaReserva, setFechaReserva] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [cantidadPersonas, setCantidadPersonas] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [comprobanteArchivo, setComprobanteArchivo] =
    useState<File | null>(null);

  const [reservasDia, setReservasDia] = useState<any[]>([]);

  useEffect(() => {
    cargarAreas();
  }, []);

  async function cargarAreas() {
    const { data, error } = await supabase
      .from("areas_sociales")
      .select("*")
      .eq("estado", "activa")
      .order("nombre_area");

    if (error) {
      alert("Error cargando áreas sociales.");
      return;
    }

    setAreas(data || []);
  }

  async function consultarPropietario(e: React.FormEvent) {
    e.preventDefault();

    if (!condominio || !noApartamento || !cedula) {
      alert("Debe completar los datos.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select(
        "id, condominio, no_apartamento, nombre_propietario, cedula, telefono"
      )
      .eq("condominio", condominio)
      .ilike("no_apartamento", noApartamento)
      .eq("cedula", cedula)
      .maybeSingle();

    setLoading(false);

    if (error) {
      alert("Error validando propietario.");
      return;
    }

    if (!data) {
      alert("Propietario no encontrado.");
      return;
    }

    setPropietario(data);
  }

  async function cargarReservasDia(areaId: string, fecha: string) {
    if (!areaId || !fecha) return;

    const { data } = await supabase
      .from("reservas_areas_sociales")
      .select("*")
      .eq("area_social_id", areaId)
      .eq("fecha_reserva", fecha)
      .neq("estado", "Rechazada");

    setReservasDia(data || []);
  }

  async function subirComprobante() {
    if (!comprobanteArchivo) return "";

    const extension = comprobanteArchivo.name.split(".").pop();

    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const rutaArchivo = `${propietario?.condominio}/${propietario?.no_apartamento}/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("comprobantes-reservas")
      .upload(rutaArchivo, comprobanteArchivo);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("comprobantes-reservas")
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  async function reservarArea(e: React.FormEvent) {
    e.preventDefault();

    if (
      !areaSeleccionada ||
      !fechaReserva ||
      !horaInicio ||
      !horaFin
    ) {
      alert("Debe completar los datos principales.");
      return;
    }

    const reservaDuplicada = reservasDia.find(
      (r) =>
        r.hora_inicio === horaInicio ||
        r.hora_fin === horaFin
    );

    if (reservaDuplicada) {
      alert("Ya existe una reserva en ese horario.");
      return;
    }

    try {
      setGuardando(true);

      let comprobanteUrl = "";

      if (comprobanteArchivo) {
        comprobanteUrl = await subirComprobante();
      }

      const area = areas.find(
        (a) => a.id === Number(areaSeleccionada)
      );

      const { error } = await supabase
        .from("reservas_areas_sociales")
        .insert([
          {
            area_social_id: Number(areaSeleccionada),
            propietario_id: propietario?.id,
            condominio: propietario?.condominio,
            no_apartamento: propietario?.no_apartamento,
            nombre_propietario:
              propietario?.nombre_propietario,
            cedula: propietario?.cedula,
            telefono: propietario?.telefono,
            fecha_reserva: fechaReserva,
            hora_inicio: horaInicio,
            hora_fin: horaFin,
            motivo,
            cantidad_personas: Number(
              cantidadPersonas || 0
            ),
            monto_pagado: Number(montoPagado || 0),
            comprobante_url: comprobanteUrl,
            estado: "Pendiente aprobación",
          },
        ]);

      setGuardando(false);

      if (error) {
        alert(
          "Error registrando reserva: " + error.message
        );
        return;
      }

      alert(
        "Reserva enviada correctamente para aprobación."
      );

      setAreaSeleccionada("");
      setFechaReserva("");
      setHoraInicio("");
      setHoraFin("");
      setMotivo("");
      setCantidadPersonas("");
      setMontoPagado("");
      setComprobanteArchivo(null);

      cargarReservasDia("", "");
    } catch (err: any) {
      setGuardando(false);
      alert(
        "Error subiendo comprobante: " + err.message
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-slate-950 text-white rounded-2xl p-6 text-center shadow">
          <h1 className="text-2xl font-bold">
            Reservar Área Social
          </h1>

          <p className="text-sm text-slate-300 mt-1">
            Portal de Propietarios
          </p>
        </div>

        {!propietario && (
          <div className="bg-white rounded-2xl p-6 shadow">
            <h2 className="text-xl font-bold mb-4">
              Validar propietario
            </h2>

            <form
              onSubmit={consultarPropietario}
              className="space-y-4"
            >
              <select
                value={condominio}
                onChange={(e) =>
                  setCondominio(e.target.value)
                }
                className="border rounded-lg px-3 py-3 w-full"
              >
                <option value="">
                  Seleccione condominio
                </option>

                <option value="Lote 9">
                  Lote 9
                </option>

                <option value="Lote 11">
                  Lote 11
                </option>
              </select>

              <input
                type="text"
                value={noApartamento}
                onChange={(e) =>
                  setNoApartamento(e.target.value)
                }
                className="border rounded-lg px-3 py-3 w-full"
                placeholder="Apartamento"
              />

              <input
                type="text"
                value={cedula}
                onChange={(e) =>
                  setCedula(e.target.value)
                }
                className="border rounded-lg px-3 py-3 w-full"
                placeholder="Cédula"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-700 text-white py-3 rounded-lg"
              >
                {loading
                  ? "Validando..."
                  : "Validar propietario"}
              </button>
            </form>
          </div>
        )}

        {propietario && (
          <>
            <div className="bg-white rounded-2xl p-5 shadow">
              <h2 className="text-xl font-bold">
                {propietario.nombre_propietario}
              </h2>

              <p className="text-sm text-slate-500">
                {propietario.condominio} | Apto.{" "}
                {propietario.no_apartamento}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow">
              <h2 className="text-xl font-bold mb-4">
                Nueva reserva
              </h2>

              <form
                onSubmit={reservarArea}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Área social
                  </label>

                  <select
                    value={areaSeleccionada}
                    onChange={(e) => {
                      setAreaSeleccionada(
                        e.target.value
                      );

                      cargarReservasDia(
                        e.target.value,
                        fechaReserva
                      );
                    }}
                    className="border rounded-lg px-3 py-3 w-full"
                  >
                    <option value="">
                      Seleccione área
                    </option>

                    {areas
                      .filter(
                        (a) =>
                          a.condominio ===
                          propietario.condominio
                      )
                      .map((a) => (
                        <option
                          key={a.id}
                          value={a.id}
                        >
                          {a.nombre_area} - RD$
                          {Number(
                            a.costo_reserva || 0
                          ).toLocaleString("es-DO")}
                        </option>
                      ))}
                  </select>
                </div>

                <input
                  type="date"
                  value={fechaReserva}
                  onChange={(e) => {
                    setFechaReserva(e.target.value);

                    cargarReservasDia(
                      areaSeleccionada,
                      e.target.value
                    );
                  }}
                  className="border rounded-lg px-3 py-3 w-full"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) =>
                      setHoraInicio(e.target.value)
                    }
                    className="border rounded-lg px-3 py-3 w-full"
                  />

                  <input
                    type="time"
                    value={horaFin}
                    onChange={(e) =>
                      setHoraFin(e.target.value)
                    }
                    className="border rounded-lg px-3 py-3 w-full"
                  />
                </div>

                <textarea
                  value={motivo}
                  onChange={(e) =>
                    setMotivo(e.target.value)
                  }
                  className="border rounded-lg px-3 py-3 w-full"
                  rows={3}
                  placeholder="Motivo de la reserva"
                />

                <input
                  type="number"
                  value={cantidadPersonas}
                  onChange={(e) =>
                    setCantidadPersonas(
                      e.target.value
                    )
                  }
                  className="border rounded-lg px-3 py-3 w-full"
                  placeholder="Cantidad personas"
                />

                <input
                  type="number"
                  step="0.01"
                  value={montoPagado}
                  onChange={(e) =>
                    setMontoPagado(e.target.value)
                  }
                  className="border rounded-lg px-3 py-3 w-full"
                  placeholder="Monto pagado"
                />

                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) =>
                    setComprobanteArchivo(
                      e.target.files?.[0] || null
                    )
                  }
                  className="border rounded-lg px-3 py-3 w-full bg-white"
                />

                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full bg-green-700 text-white py-3 rounded-lg"
                >
                  {guardando
                    ? "Enviando..."
                    : "Enviar reserva"}
                </button>
              </form>
            </div>

            {reservasDia.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow">
                <h2 className="text-lg font-bold mb-3">
                  Horarios ocupados
                </h2>

                <div className="space-y-2">
                  {reservasDia.map((r) => (
                    <div
                      key={r.id}
                      className="border rounded-xl p-3"
                    >
                      <p className="font-semibold">
                        {r.hora_inicio} -{" "}
                        {r.hora_fin}
                      </p>

                      <p className="text-sm text-slate-500">
                        Estado: {r.estado}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}