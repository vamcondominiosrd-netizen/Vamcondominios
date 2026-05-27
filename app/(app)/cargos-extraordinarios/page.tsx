"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export default function CargosExtraordinariosPage() {

  const [condominioId, setCondominioId] =
    useState("");

  const [concepto, setConcepto] =
    useState("");

  const [monto, setMonto] =
    useState("");

  const [anio, setAnio] =
    useState(
      new Date().getFullYear().toString()
    );

  const [mes, setMes] =
    useState(
      (
        new Date().getMonth() + 1
      ).toString()
    );

  useEffect(() => {

    const id =
      localStorage.getItem("condominio_id");

    if (!id) return;

    setCondominioId(id);

  }, []);

  async function generarCargoExtraordinario() {

    if (
      !concepto ||
      !monto ||
      !anio ||
      !mes
    ) {

      alert(
        "Debe completar todos los campos."
      );

      return;
    }

    const confirmar = confirm(
      `¿Desea generar el cargo extraordinario "${concepto}" por RD$ ${Number(
        monto
      ).toLocaleString()} para todas las unidades?`
    );

    if (!confirmar) return;

    const { data: unidades, error } =
      await supabase
        .from("unidades")
        .select(`
          id,
          client_id,
          propietario_id
        `)
        .eq(
          "condominio_id",
          Number(condominioId)
        )
        .eq("activa", true);

    if (error) {

      alert(error.message);

      return;
    }

    const periodo =
      `${anio}-${String(mes).padStart(2, "0")}`;

    const registros =
      (unidades || []).map(
        (u) => ({
          client_id: u.client_id,
          condominio_id:
            Number(condominioId),
          unidad_id: u.id,
          propietario_id:
            u.propietario_id,
          periodo,
          anio: Number(anio),
          mes: Number(mes),
          concepto,
          tipo_cargo:
            "EXTRAORDINARIO",
          monto: Number(monto),
          monto_pagado: 0,
          balance: Number(monto),
          estado: "PENDIENTE",
        })
      );

    const {
      error: insertError
    } =
      await supabase
        .from("cargos_periodicos")
        .insert(registros);

    if (insertError) {

      alert(
        "Error creando cargos: " +
          insertError.message
      );

      return;
    }

    alert(
      "Cargos extraordinarios generados correctamente."
    );

    setConcepto("");
    setMonto("");
  }

  return (
    <div className="space-y-6">

      <div className="bg-white rounded-2xl border shadow-sm p-5">

        <h1 className="text-3xl font-bold">
          Cargos Extraordinarios
        </h1>

        <p className="text-slate-500 mt-1">
          Cree cargos especiales para todas las unidades del condominio.
        </p>

      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Concepto del cargo
            </label>

            <input
              type="text"
              value={concepto}
              onChange={(e) =>
                setConcepto(
                  e.target.value
                )
              }
              placeholder="Ejemplo: Pintura edificio"
              className="border rounded-xl px-4 py-3 w-full"
            />

          </div>

          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Monto por unidad
            </label>

            <input
              type="number"
              value={monto}
              onChange={(e) =>
                setMonto(
                  e.target.value
                )
              }
              placeholder="Ejemplo: 2000"
              className="border rounded-xl px-4 py-3 w-full"
            />

          </div>

          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Año
            </label>

            <input
              type="number"
              value={anio}
              onChange={(e) =>
                setAnio(
                  e.target.value
                )
              }
              className="border rounded-xl px-4 py-3 w-full"
            />

          </div>

          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Mes
            </label>

            <select
              value={mes}
              onChange={(e) =>
                setMes(
                  e.target.value
                )
              }
              className="border rounded-xl px-4 py-3 w-full"
            >

              <option value="1">
                Enero
              </option>

              <option value="2">
                Febrero
              </option>

              <option value="3">
                Marzo
              </option>

              <option value="4">
                Abril
              </option>

              <option value="5">
                Mayo
              </option>

              <option value="6">
                Junio
              </option>

              <option value="7">
                Julio
              </option>

              <option value="8">
                Agosto
              </option>

              <option value="9">
                Septiembre
              </option>

              <option value="10">
                Octubre
              </option>

              <option value="11">
                Noviembre
              </option>

              <option value="12">
                Diciembre
              </option>

            </select>

          </div>

        </div>

        <div className="mt-6">

          <button
            onClick={
              generarCargoExtraordinario
            }
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl"
          >
            Generar cargo extraordinario
          </button>

        </div>

      </div>

    </div>
  );
}