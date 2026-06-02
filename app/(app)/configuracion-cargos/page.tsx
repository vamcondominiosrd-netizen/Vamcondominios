"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export default function ConfiguracionCargosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [configId, setConfigId] = useState<number | null>(null);
  const [cuotaOrdinaria, setCuotaOrdinaria] = useState("");
  const [diaLimitePago, setDiaLimitePago] = useState("5");
  const [diaInicioMora, setDiaInicioMora] = useState("10");
  const [porcentajeMora, setPorcentajeMora] = useState("5");
  const [moraActiva, setMoraActiva] = useState(false);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarConfiguracion(id);
    }
  }, []);

  async function cargarConfiguracion(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("configuracion_cargos")
      .select("*")
      .eq("condominio_id", Number(id))
      .maybeSingle();

    setLoading(false);

    if (error) {
      alert("Error cargando configuración: " + error.message);
      return;
    }

    if (data) {
      setConfigId(data.id);
      setCuotaOrdinaria(String(data.cuota_ordinaria || 0));
      setDiaLimitePago(String(data.dia_limite_pago || 5));
      setDiaInicioMora(String(data.dia_inicio_mora || 10));
      setPorcentajeMora(String(data.porcentaje_mora || 5));
      setMoraActiva(data.mora_activa || false);
    }
  }

  async function guardarConfiguracion() {
    if (!condominioId) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (!cuotaOrdinaria || Number(cuotaOrdinaria) <= 0) {
      alert("Debe indicar una cuota ordinaria mensual válida.");
      return;
    }

    if (!diaLimitePago || Number(diaLimitePago) <= 0) {
      alert("Debe indicar el día límite de pago.");
      return;
    }

    if (!diaInicioMora || Number(diaInicioMora) <= 0) {
      alert("Debe indicar el día de inicio de mora.");
      return;
    }

    if (!porcentajeMora || Number(porcentajeMora) < 0) {
      alert("Debe indicar el porcentaje de mora.");
      return;
    }

    setGuardando(true);

    const registro = {
      condominio_id: Number(condominioId),
      cuota_ordinaria: Number(cuotaOrdinaria),
      dia_limite_pago: Number(diaLimitePago),
      dia_inicio_mora: Number(diaInicioMora),
      porcentaje_mora: Number(porcentajeMora),
      mora_activa: moraActiva,
      activa: true,
    };

    if (configId) {
      const { error } = await supabase
        .from("configuracion_cargos")
        .update(registro)
        .eq("id", configId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error actualizando configuración: " + error.message);
        return;
      }

      alert("Configuración actualizada correctamente.");
      cargarConfiguracion(condominioId);
      return;
    }

    const { error } = await supabase.from("configuracion_cargos").insert([
      registro,
    ]);

    setGuardando(false);

    if (error) {
      alert("Error guardando configuración: " + error.message);
      return;
    }

    alert("Configuración guardada correctamente.");
    cargarConfiguracion(condominioId);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h1 className="text-3xl font-bold">Configuración de Cargos</h1>

        <p className="text-slate-500 mt-1">
          Defina la cuota ordinaria, día límite de pago y reglas de mora del
          condominio activo.
        </p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Condominio activo
        </p>

        <p className="font-bold text-slate-800 mt-1">
          {condominioNombre || "No seleccionado"}
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          Cargando configuración...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-xl font-bold mb-5">Configuración general</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 bg-slate-50 border rounded-xl px-4 py-3">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Condominio
              </label>

              <p className="font-semibold text-slate-800">
                {condominioNombre || "No identificado"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Cuota ordinaria mensual RD$ *
              </label>

              <input
                type="number"
                value={cuotaOrdinaria}
                onChange={(e) => setCuotaOrdinaria(e.target.value)}
                placeholder="Ejemplo: 4500"
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Día límite de pago *
              </label>

              <input
                type="number"
                value={diaLimitePago}
                onChange={(e) => setDiaLimitePago(e.target.value)}
                placeholder="Ejemplo: 5"
                className="border rounded-xl px-4 py-3 w-full"
              />

              <p className="text-xs text-slate-500 mt-1">
                Día máximo recomendado para pagar sin recargo.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Día inicio mora *
              </label>

              <input
                type="number"
                value={diaInicioMora}
                onChange={(e) => setDiaInicioMora(e.target.value)}
                placeholder="Ejemplo: 10"
                className="border rounded-xl px-4 py-3 w-full"
              />

              <p className="text-xs text-slate-500 mt-1">
                Día desde el cual se podrá aplicar mora.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Porcentaje mora %
              </label>

              <input
                type="number"
                value={porcentajeMora}
                onChange={(e) => setPorcentajeMora(e.target.value)}
                placeholder="Ejemplo: 5"
                className="border rounded-xl px-4 py-3 w-full"
              />

              <p className="text-xs text-slate-500 mt-1">
                Porcentaje que se aplicará sobre el cargo pendiente.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Aplicar mora automática
              </label>

              <select
                value={moraActiva ? "SI" : "NO"}
                onChange={(e) => setMoraActiva(e.target.value === "SI")}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>

              <p className="text-xs text-slate-500 mt-1">
                Esta opción será utilizada por el módulo de Cargo Mantenimiento
                para aplicar la mora.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-3">
            <button
              onClick={guardarConfiguracion}
              disabled={guardando}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
            >
              {guardando ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-800">
        <h3 className="font-bold mb-1">Nota importante</h3>

        <p className="text-sm">
          La generación de cargos mensuales se hará desde el módulo de Cargo
          Mantenimiento. Este módulo solo guarda las reglas de cobro del
          condominio.
        </p>
      </div>
    </div>
  );
}