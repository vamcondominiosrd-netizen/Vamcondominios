"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono: string;
  correo: string;
};

type AreaSocial = {
  id: number;
  nombre_area: string;
  costo_reserva: number;
};

export default function MovilReservarAreaPage() {
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);

  const [areas, setAreas] =
    useState<AreaSocial[]>([]);

  const [areaId, setAreaId] =
    useState("");

  const [fechaReserva, setFechaReserva] =
    useState("");

  const [horaInicio, setHoraInicio] =
    useState("");

  const [horaFin, setHoraFin] =
    useState("");

  const [motivo, setMotivo] =
    useState("");

  const [cantidadPersonas, setCantidadPersonas] =
    useState("");

  const [montoPagado, setMontoPagado] =
    useState("");

  const [comprobante, setComprobante] =
    useState<File | null>(null);

  const [mensaje, setMensaje] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {

    const data =
      localStorage.getItem(
        "propietario_actual"
      );

    if (!data) {

      router.push(
        "/movil-login"
      );

      return;
    }

    const prop =
      JSON.parse(data);

    setPropietario(prop);

    cargarAreas(prop);

  }, [router]);

  async function cargarAreas(
    prop: PropietarioActual
  ) {

    const { data, error } =
      await supabase
        .from("areas_sociales")
        .select(`
          id,
          nombre_area,
          costo_reserva
        `)
        .eq(
          "condominio",
          prop.condominio_nombre
        )
        .eq(
          "estado",
          "activa"
        )
        .order("nombre_area");

    if (error) {

      setMensaje(error.message);

      return;
    }

    setAreas(data || []);
  }

  async function subirComprobante() {

    if (!comprobante)
      return "";

    const extension =
      comprobante.name
        .split(".")
        .pop();

    const nombreArchivo =
      `reservas/${Date.now()}.${extension}`;

    const { error } =
      await supabase.storage
        .from(
          "comprobantes-reservas"
        )
        .upload(
          nombreArchivo,
          comprobante
        );

    if (error) {

      throw new Error(
        error.message
      );

    }

    const { data } =
      supabase.storage
        .from(
          "comprobantes-reservas"
        )
        .getPublicUrl(
          nombreArchivo
        );

    return data.publicUrl;
  }

  async function guardarReserva() {

    if (
      !propietario ||
      !areaId ||
      !fechaReserva
    ) {

      setMensaje(
        "Debe completar área y fecha."
      );

      return;
    }

    setLoading(true);

    setMensaje("");

    try {

      const comprobanteUrl =
        await subirComprobante();

      const { error } =
        await supabase
          .from(
            "reservas_areas_sociales"
          )
          .insert([
            {
              area_social_id:
                Number(areaId),

              propietario_id:
                propietario.propietario_id,

              condominio:
                propietario.condominio_nombre,

              no_apartamento:
                propietario.no_apartamento,

              nombre_propietario:
                propietario.nombre_propietario,

              cedula:
                propietario.cedula,

              telefono:
                propietario.telefono,

              fecha_reserva:
                fechaReserva,

              hora_inicio:
                horaInicio,

              hora_fin:
                horaFin,

              motivo,

              cantidad_personas:
                Number(
                  cantidadPersonas || 0
                ),

              monto_pagado:
                Number(
                  montoPagado || 0
                ),

              comprobante_url:
                comprobanteUrl,

              estado:
                "Pendiente aprobación",
            },
          ]);

      setLoading(false);

      if (error) {

        setMensaje(
          error.message
        );

        return;
      }

      alert(
        "Reserva enviada correctamente."
      );

      setAreaId("");
      setFechaReserva("");
      setHoraInicio("");
      setHoraFin("");
      setMotivo("");
      setCantidadPersonas("");
      setMontoPagado("");
      setComprobante(null);

      const inputFile =
        document.getElementById(
          "comprobanteReserva"
        ) as HTMLInputElement | null;

      if (inputFile)
        inputFile.value = "";

    } catch (err: any) {

      setLoading(false);

      setMensaje(
        err.message
      );

    }
  }

  if (!propietario) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">

      <div className="max-w-md mx-auto space-y-4">

        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow">

          <Link
            href="/movil"
            className="text-sm text-amber-300"
          >
            ← Volver
          </Link>

          <h1 className="text-2xl font-bold mt-3">
            Reservar Área Social
          </h1>

          <p className="text-slate-300 text-sm mt-1">
            {propietario.condominio_nombre}
          </p>

          <p className="text-slate-300 text-sm">
            Apto. {propietario.no_apartamento}
          </p>

        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">

          <select
            value={areaId}
            onChange={(e) =>
              setAreaId(
                e.target.value
              )
            }
            className="w-full border rounded-xl px-4 py-3"
          >

            <option value="">
              Seleccione área social
            </option>

            {areas.map(
              (a) => (

                <option
                  key={a.id}
                  value={a.id}
                >

                  {a.nombre_area}

                  {" - RD$ "}

                  {Number(
                    a.costo_reserva || 0
                  ).toLocaleString(
                    "es-DO"
                  )}

                </option>

              )
            )}

          </select>

          <input
            type="date"
            value={fechaReserva}
            onChange={(e) =>
              setFechaReserva(
                e.target.value
              )
            }
            className="w-full border rounded-xl px-4 py-3"
          />

          <div className="grid grid-cols-2 gap-2">

            <input
              type="time"
              value={horaInicio}
              onChange={(e) =>
                setHoraInicio(
                  e.target.value
                )
              }
              className="border rounded-xl px-4 py-3"
            />

            <input
              type="time"
              value={horaFin}
              onChange={(e) =>
                setHoraFin(
                  e.target.value
                )
              }
              className="border rounded-xl px-4 py-3"
            />

          </div>

          <input
            type="number"
            value={
              cantidadPersonas
            }
            onChange={(e) =>
              setCantidadPersonas(
                e.target.value
              )
            }
            placeholder="Cantidad personas"
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            type="number"
            step="0.01"
            value={montoPagado}
            onChange={(e) =>
              setMontoPagado(
                e.target.value
              )
            }
            placeholder="Monto pagado"
            className="w-full border rounded-xl px-4 py-3"
          />

          <textarea
            value={motivo}
            onChange={(e) =>
              setMotivo(
                e.target.value
              )
            }
            placeholder="Motivo reserva"
            rows={3}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            id="comprobanteReserva"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) =>
              setComprobante(
                e.target.files?.[0] || null
              )
            }
            className="w-full border rounded-xl px-4 py-3"
          />

          <button
            onClick={
              guardarReserva
            }
            className="w-full bg-blue-700 text-white rounded-xl py-3 font-bold"
          >

            {loading
              ? "Enviando..."
              : "Enviar solicitud"}

          </button>

          {mensaje && (

            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 text-sm">

              {mensaje}

            </div>

          )}

        </div>

      </div>

    </main>
  );
}