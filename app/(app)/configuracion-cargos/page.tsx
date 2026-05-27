"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export default function ConfiguracionCargosPage() {

  const [condominioId, setCondominioId] =
    useState("");

  const [configId, setConfigId] =
    useState<number | null>(null);

  const [cuotaOrdinaria, setCuotaOrdinaria] =
    useState("");

  const [diaLimitePago, setDiaLimitePago] =
    useState("5");

  const [diaInicioMora, setDiaInicioMora] =
    useState("10");

  const [porcentajeMora, setPorcentajeMora] =
    useState("5");

  const [moraActiva, setMoraActiva] =
    useState(false);

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

    cargarConfiguracion(id);

  }, []);

  async function cargarConfiguracion(
    id: string
  ) {

    const { data } =
      await supabase
        .from(
          "configuracion_cargos"
        )
        .select("*")
        .eq(
          "condominio_id",
          Number(id)
        )
        .maybeSingle();

    if (data) {

      setConfigId(data.id);

      setCuotaOrdinaria(
        String(
          data.cuota_ordinaria || 0
        )
      );

      setDiaLimitePago(
        String(
          data.dia_limite_pago || 5
        )
      );

      setDiaInicioMora(
        String(
          data.dia_inicio_mora || 10
        )
      );

      setPorcentajeMora(
        String(
          data.porcentaje_mora || 5
        )
      );

      setMoraActiva(
        data.mora_activa || false
      );
    }
  }

  async function guardarConfiguracion() {

    if (!cuotaOrdinaria) {

      alert(
        "Debe indicar la cuota ordinaria mensual."
      );

      return;
    }

    const registro = {

      condominio_id:
        Number(condominioId),

      cuota_ordinaria:
        Number(cuotaOrdinaria),

      dia_limite_pago:
        Number(diaLimitePago),

      dia_inicio_mora:
        Number(diaInicioMora),

      porcentaje_mora:
        Number(porcentajeMora),

      mora_activa:
        moraActiva,

      activa: true,
    };

    if (configId) {

      const { error } =
        await supabase
          .from(
            "configuracion_cargos"
          )
          .update(registro)
          .eq("id", configId);

      if (error) {

        alert(error.message);

        return;
      }

      alert(
        "Configuración actualizada correctamente."
      );

    } else {

      const { error } =
        await supabase
          .from(
            "configuracion_cargos"
          )
          .insert([registro]);

      if (error) {

        alert(error.message);

        return;
      }

      alert(
        "Configuración guardada correctamente."
      );

      cargarConfiguracion(
        condominioId
      );
    }
  }

  async function generarCargos() {

    if (
      !anio ||
      !mes ||
      !cuotaOrdinaria
    ) {

      alert(
        "Debe completar año, mes y cuota ordinaria."
      );

      return;
    }

    const confirmar = confirm(
      `¿Desea generar los cargos ordinarios del mes ${mes}/${anio} por RD$ ${Number(
        cuotaOrdinaria
      ).toLocaleString()} para todas las unidades activas?`
    );

    if (!confirmar) return;

    const { error } =
      await supabase.rpc(
        "generar_cargos_mensuales",
        {
          p_condominio_id:
            Number(condominioId),

          p_anio:
            Number(anio),

          p_mes:
            Number(mes),

          p_monto:
            Number(
              cuotaOrdinaria
            ),

          p_tipo:
            "ORDINARIO",
        }
      );

    if (error) {

      alert(
        "Error generando cargos: " +
          error.message
      );

      return;
    }

    alert(
      "Cargos mensuales generados correctamente."
    );
  }

  return (
    <div className="space-y-6">

      <div className="bg-white rounded-2xl border shadow-sm p-5">

        <h1 className="text-3xl font-bold">
          Configuración de Cuotas y Cargos
        </h1>

        <p className="text-slate-500 mt-1">
          Defina cuotas, mora automática y generación mensual de cargos.
        </p>

      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">

        <h2 className="text-xl font-bold mb-5">
          Configuración general
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Cuota ordinaria mensual
            </label>

            <input
              type="number"
              value={cuotaOrdinaria}
              onChange={(e) =>
                setCuotaOrdinaria(
                  e.target.value
                )
              }
              placeholder="Ejemplo: 4500"
              className="border rounded-xl px-4 py-3 w-full"
            />

          </div>

          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Día límite de pago
            </label>

            <input
              type="number"
              value={diaLimitePago}
              onChange={(e) =>
                setDiaLimitePago(
                  e.target.value
                )
              }
              placeholder="Ejemplo: 5"
              className="border rounded-xl px-4 py-3 w-full"
            />

          </div>

          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Día inicio mora
            </label>

            <input
              type="number"
              value={diaInicioMora}
              onChange={(e) =>
                setDiaInicioMora(
                  e.target.value
                )
              }
              placeholder="Ejemplo: 10"
              className="border rounded-xl px-4 py-3 w-full"
            />

          </div>

          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Porcentaje mora
            </label>

            <input
              type="number"
              value={porcentajeMora}
              onChange={(e) =>
                setPorcentajeMora(
                  e.target.value
                )
              }
              placeholder="Ejemplo: 5"
              className="border rounded-xl px-4 py-3 w-full"
            />

          </div>

          <div className="md:col-span-2">

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Aplicar mora automática
            </label>

            <select
              value={
                moraActiva
                  ? "SI"
                  : "NO"
              }
              onChange={(e) =>
                setMoraActiva(
                  e.target.value ===
                    "SI"
                )
              }
              className="border rounded-xl px-4 py-3 w-full"
            >

              <option value="NO">
                NO
              </option>

              <option value="SI">
                SI
              </option>

            </select>

          </div>

        </div>

        <div className="mt-5">

          <button
            onClick={
              guardarConfiguracion
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
          >
            Guardar configuración
          </button>

        </div>

      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">

        <h2 className="text-xl font-bold mb-2">
          Generar cargos mensuales
        </h2>

        <p className="text-sm text-slate-500 mb-5">
          Este proceso crea los cargos ordinarios para todas las unidades activas.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

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

              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>

            </select>

          </div>

          <div className="flex items-end">

            <button
              onClick={
                generarCargos
              }
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-5 py-3 w-full"
            >
              Generar cargos
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}