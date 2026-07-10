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
  created_at: string;
};

export default function AreasSocialesPage() {

  const [areas, setAreas] =
    useState<AreaSocial[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [condominio, setCondominio] =
    useState("");

  const [condominioId, setCondominioId] =
    useState("");

  const [nombreArea, setNombreArea] =
    useState("");

  const [descripcion, setDescripcion] =
    useState("");

  const [costoReserva, setCostoReserva] =
    useState("");

  const [horaInicio, setHoraInicio] =
    useState("");

  const [horaFin, setHoraFin] =
    useState("");

  const [reglas, setReglas] =
    useState("");

  useEffect(() => {

    const nombre =
      localStorage.getItem(
        "condominio_nombre"
      ) || "";

    const id =
      localStorage.getItem(
        "condominio_id"
      ) || "";

    setCondominio(nombre);
    setCondominioId(id);

    cargarAreas(nombre);

  }, []);

  async function cargarAreas(
    nombreCondominio: string
  ) {

    setLoading(true);

    const { data, error } =
      await supabase
        .from("areas_sociales")
        .select("*")
        .eq(
          "condominio",
          nombreCondominio
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    setLoading(false);

    if (error) {

      alert(
        "Error cargando áreas sociales: " +
          error.message
      );

      return;
    }

    setAreas(data || []);
  }

  async function guardarArea(
    e: React.FormEvent
  ) {

    e.preventDefault();

    if (
      !condominio ||
      !nombreArea
    ) {

      alert(
        "Debe completar el nombre del área."
      );

      return;
    }

    const { error } =
      await supabase
        .from("areas_sociales")
        .insert([
          {
            condominio,
            
            nombre_area:
              nombreArea,

            descripcion,

            costo_reserva:
              Number(
                costoReserva || 0
              ),

            hora_inicio:
              horaInicio || null,

            hora_fin:
              horaFin || null,

            reglas,

            estado:
              "activa",
          },
        ]);

    if (error) {

      alert(
        "Error guardando área social: " +
          error.message
      );

      return;
    }

    alert(
      "Área social registrada correctamente."
    );

    setNombreArea("");
    setDescripcion("");
    setCostoReserva("");
    setHoraInicio("");
    setHoraFin("");
    setReglas("");

    cargarAreas(
      condominio
    );
  }

  async function cambiarEstado(
    id: number,
    nuevoEstado: string
  ) {

    const confirmar =
      confirm(
        `¿Desea cambiar el estado a ${nuevoEstado}?`
      );

    if (!confirmar)
      return;

    const { error } =
      await supabase
        .from("areas_sociales")
        .update({
          estado:
            nuevoEstado,
        })
        .eq("id", id)
        .eq(
          "condominio",
          condominio
        );

    if (error) {

      alert(
        "Error actualizando área: " +
          error.message
      );

      return;
    }

    alert(
      "Estado actualizado correctamente."
    );

    cargarAreas(
      condominio
    );
  }

  const activas =
    areas.filter(
      (a) =>
        a.estado ===
        "activa"
    ).length;

  const inactivas =
    areas.filter(
      (a) =>
        a.estado ===
        "inactiva"
    ).length;

  return (
    <div className="space-y-6">

      <div>

        <h1 className="text-3xl font-bold">
          Áreas Sociales
        </h1>

        <p className="text-slate-500">
          Catálogo de áreas disponibles para reservas.
        </p>

      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">

        <p className="text-xs uppercase tracking-wide text-slate-500">
          Condominio activo
        </p>

        <p className="font-bold text-slate-800 mt-1">
          {condominio}
        </p>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white rounded-2xl p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Total áreas
          </p>

          <h2 className="text-2xl font-bold">
            {areas.length}
          </h2>

        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Activas
          </p>

          <h2 className="text-2xl font-bold text-green-700">
            {activas}
          </h2>

        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Inactivas
          </p>

          <h2 className="text-2xl font-bold text-red-700">
            {inactivas}
          </h2>

        </div>

      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">

        <h2 className="text-xl font-bold mb-4">
          Registrar área social
        </h2>

        <form
          onSubmit={guardarArea}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >

          <div className="md:col-span-2">

            <label className="block text-sm font-semibold mb-1">
              Condominio
            </label>

            <input
              type="text"
              value={condominio}
              readOnly
              className="border rounded-lg px-3 py-2 w-full bg-slate-100"
            />

          </div>

          <div>

            <label className="block text-sm font-semibold mb-1">
              Nombre del área *
            </label>

            <input
              type="text"
              value={nombreArea}
              onChange={(e) =>
                setNombreArea(
                  e.target.value
                )
              }
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Ej. Gazebo, salón social"
            />

          </div>

          <div>

            <label className="block text-sm font-semibold mb-1">
              Costo reserva RD$
            </label>

            <input
              type="number"
              step="0.01"
              value={costoReserva}
              onChange={(e) =>
                setCostoReserva(
                  e.target.value
                )
              }
              className="border rounded-lg px-3 py-2 w-full"
            />

          </div>

          <div>

            <label className="block text-sm font-semibold mb-1">
              Hora inicio
            </label>

            <input
              type="time"
              value={horaInicio}
              onChange={(e) =>
                setHoraInicio(
                  e.target.value
                )
              }
              className="border rounded-lg px-3 py-2 w-full"
            />

          </div>

          <div>

            <label className="block text-sm font-semibold mb-1">
              Hora fin
            </label>

            <input
              type="time"
              value={horaFin}
              onChange={(e) =>
                setHoraFin(
                  e.target.value
                )
              }
              className="border rounded-lg px-3 py-2 w-full"
            />

          </div>

          <div className="md:col-span-2">

            <label className="block text-sm font-semibold mb-1">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(e) =>
                setDescripcion(
                  e.target.value
                )
              }
              className="border rounded-lg px-3 py-2 w-full"
              rows={3}
            />

          </div>

          <div className="md:col-span-2">

            <label className="block text-sm font-semibold mb-1">
              Reglas
            </label>

            <textarea
              value={reglas}
              onChange={(e) =>
                setReglas(
                  e.target.value
                )
              }
              className="border rounded-lg px-3 py-2 w-full"
              rows={3}
            />

          </div>

          <div className="md:col-span-2">

            <button
              type="submit"
              className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800"
            >
              Guardar área social
            </button>

          </div>

        </form>

      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">

        <h2 className="text-xl font-bold mb-4">
          Áreas sociales registradas
        </h2>

        {loading ? (

          <p>
            Cargando áreas...
          </p>

        ) : (

          <div className="space-y-4">

            {areas.map((a) => (

              <div
                key={a.id}
                className="border rounded-2xl p-5"
              >

                <div className="flex flex-col md:flex-row md:justify-between gap-4">

                  <div>

                    <h3 className="text-xl font-bold">
                      {a.nombre_area}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {a.descripcion}
                    </p>

                    {a.reglas && (

                      <p className="mt-2 text-sm text-slate-600">

                        <strong>
                          Reglas:
                        </strong>

                        {" "}

                        {a.reglas}

                      </p>

                    )}

                  </div>

                  <div className="text-right">

                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        a.estado ===
                        "activa"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >

                      {a.estado}

                    </span>

                    <p className="mt-3 text-xl font-bold text-green-700">

                      RD$

                      {Number(
                        a.costo_reserva || 0
                      ).toLocaleString(
                        "es-DO",
                        {
                          minimumFractionDigits: 2,
                        }
                      )}

                    </p>

                    <p className="text-sm text-slate-500 mt-2">

                      {a.hora_inicio || "--"}

                      {" - "}

                      {a.hora_fin || "--"}

                    </p>

                  </div>

                </div>

                <div className="flex gap-2 mt-4">

                  {a.estado ===
                  "activa" ? (

                    <button
                      onClick={() =>
                        cambiarEstado(
                          a.id,
                          "inactiva"
                        )
                      }
                      className="bg-red-700 text-white px-4 py-2 rounded-lg"
                    >
                      Inactivar
                    </button>

                  ) : (

                    <button
                      onClick={() =>
                        cambiarEstado(
                          a.id,
                          "activa"
                        )
                      }
                      className="bg-green-700 text-white px-4 py-2 rounded-lg"
                    >
                      Activar
                    </button>

                  )}

                </div>

              </div>

            ))}

            {areas.length ===
              0 && (

              <div className="p-6 text-center text-slate-500">
                No hay áreas sociales registradas.
              </div>

            )}

          </div>

        )}

      </div>

    </div>
  );
}