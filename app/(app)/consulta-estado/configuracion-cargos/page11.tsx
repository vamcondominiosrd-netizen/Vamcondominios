"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  CircleDollarSign,
  Percent,
  Save,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";

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

  function dinero(valor: string) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <PageContainer>
      <PageHeader
        title="Configuración de Cargos"
        subtitle="Defina la cuota ordinaria, día límite de pago y reglas de mora del condominio activo."
        badge="Centro Residencial"
        icon={CircleDollarSign}
        action={
          <button
            onClick={guardarConfiguracion}
            disabled={guardando || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
          >
            <Save className="h-4 w-4" />
            {guardando ? "Guardando..." : "Guardar configuración"}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Cuota ordinaria"
          value={`RD$ ${dinero(cuotaOrdinaria)}`}
          subtitle="Monto mensual"
          icon={CircleDollarSign}
          tone="green"
        />

        <StatCard
          title="Día límite"
          value={diaLimitePago || "-"}
          subtitle="Pago sin recargo"
          icon={CalendarDays}
          tone="blue"
        />

        <StatCard
          title="Inicio mora"
          value={diaInicioMora || "-"}
          subtitle="Día de aplicación"
          icon={CalendarDays}
          tone="amber"
        />

        <StatCard
          title="Mora activa"
          value={moraActiva ? "Sí" : "No"}
          subtitle={`${porcentajeMora || 0}% de mora`}
          icon={moraActiva ? CheckCircle : Percent}
          tone={moraActiva ? "green" : "slate"}
        />
      </div>

      {loading ? (
        <SectionCard>
          <div className="p-6 text-sm text-slate-500">
            Cargando configuración...
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Reglas de cobro"
          subtitle={`Condominio activo: ${
            condominioNombre || "No seleccionado"
          }`}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Cuota ordinaria mensual RD$ *
              </label>

              <input
                type="number"
                value={cuotaOrdinaria}
                onChange={(e) => setCuotaOrdinaria(e.target.value)}
                placeholder="Ejemplo: 4500"
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Día límite de pago *
              </label>

              <input
                type="number"
                value={diaLimitePago}
                onChange={(e) => setDiaLimitePago(e.target.value)}
                placeholder="Ejemplo: 5"
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />

              <p className="mt-1 text-xs text-slate-500">
                Día máximo recomendado para pagar sin recargo.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Día inicio mora *
              </label>

              <input
                type="number"
                value={diaInicioMora}
                onChange={(e) => setDiaInicioMora(e.target.value)}
                placeholder="Ejemplo: 10"
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />

              <p className="mt-1 text-xs text-slate-500">
                Día desde el cual se podrá aplicar mora.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Porcentaje mora %
              </label>

              <input
                type="number"
                value={porcentajeMora}
                onChange={(e) => setPorcentajeMora(e.target.value)}
                placeholder="Ejemplo: 5"
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />

              <p className="mt-1 text-xs text-slate-500">
                Porcentaje que se aplicará sobre el cargo pendiente.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Aplicar mora automática
              </label>

              <select
                value={moraActiva ? "SI" : "NO"}
                onChange={(e) => setMoraActiva(e.target.value === "SI")}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              >
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>

              <p className="mt-1 text-xs text-slate-500">
                Esta opción será utilizada por el módulo de Cargo Mantenimiento
                para aplicar la mora.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <button
              onClick={guardarConfiguracion}
              disabled={guardando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
            >
              <Save className="h-4 w-4" />
              {guardando ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </SectionCard>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
        <h3 className="mb-1 font-bold">Nota importante</h3>

        <p className="text-sm">
          La generación de cargos mensuales se hará desde el módulo de Cargo
          Mantenimiento. Este módulo solo guarda las reglas de cobro del
          condominio.
        </p>
      </div>
    </PageContainer>
  );
}