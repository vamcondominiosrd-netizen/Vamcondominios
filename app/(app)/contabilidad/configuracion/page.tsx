"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Save } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Cuenta = {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
};

type Configuracion = {
  cuenta_banco_operativo_id: string;
  cuenta_banco_reserva_id: string;
  cuenta_caja_chica_id: string;
  cuenta_cxc_id: string;
  cuenta_ingreso_mantenimiento_id: string;
  cuenta_ingreso_mora_id: string;
  cuenta_otros_ingresos_id: string;
  cuenta_gasto_administrativo_id: string;
  cuenta_gasto_operativo_id: string;
  cuenta_gasto_servicios_basicos_id: string;
  cuenta_gasto_nomina_id: string;
  cuenta_gasto_profesional_id: string;
};

const condominioId = 1;

const campos = [
  ["cuenta_banco_operativo_id", "Banco Operativo"],
  ["cuenta_banco_reserva_id", "Banco Fondo Reserva"],
  ["cuenta_caja_chica_id", "Caja Chica"],
  ["cuenta_cxc_id", "Cuentas por Cobrar"],
  ["cuenta_ingreso_mantenimiento_id", "Ingreso Mantenimiento"],
  ["cuenta_ingreso_mora_id", "Ingreso Mora"],
  ["cuenta_otros_ingresos_id", "Otros Ingresos"],
  ["cuenta_gasto_administrativo_id", "Gasto Administrativo"],
  ["cuenta_gasto_operativo_id", "Gasto Operativo"],
  ["cuenta_gasto_servicios_basicos_id", "Servicios Básicos"],
  ["cuenta_gasto_nomina_id", "Gasto Nómina"],
  ["cuenta_gasto_profesional_id", "Gasto Profesional"],
] as const;

export default function ConfiguracionContablePage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState<Configuracion>({
    cuenta_banco_operativo_id: "",
    cuenta_banco_reserva_id: "",
    cuenta_caja_chica_id: "",
    cuenta_cxc_id: "",
    cuenta_ingreso_mantenimiento_id: "",
    cuenta_ingreso_mora_id: "",
    cuenta_otros_ingresos_id: "",
    cuenta_gasto_administrativo_id: "",
    cuenta_gasto_operativo_id: "",
    cuenta_gasto_servicios_basicos_id: "",
    cuenta_gasto_nomina_id: "",
    cuenta_gasto_profesional_id: "",
  });

  async function cargarDatos() {
    setCargando(true);
    setError("");
    setMensaje("");

    const { data: cuentasData, error: errorCuentas } = await supabase
      .from("contabilidad_cuentas")
      .select("id,codigo,nombre,tipo")
      .eq("condominio_id", condominioId)
      .eq("estado", "Activo")
      .order("codigo", { ascending: true });

    if (errorCuentas) {
      setError(errorCuentas.message);
      setCargando(false);
      return;
    }

    setCuentas(cuentasData || []);

    const { data: configData, error: errorConfig } = await supabase
      .from("contabilidad_configuracion")
      .select("*")
      .eq("condominio_id", condominioId)
      .maybeSingle();

    if (errorConfig) {
      setError(errorConfig.message);
      setCargando(false);
      return;
    }

    if (configData) {
      setForm({
        cuenta_banco_operativo_id: configData.cuenta_banco_operativo_id
          ? String(configData.cuenta_banco_operativo_id)
          : "",
        cuenta_banco_reserva_id: configData.cuenta_banco_reserva_id
          ? String(configData.cuenta_banco_reserva_id)
          : "",
        cuenta_caja_chica_id: configData.cuenta_caja_chica_id
          ? String(configData.cuenta_caja_chica_id)
          : "",
        cuenta_cxc_id: configData.cuenta_cxc_id
          ? String(configData.cuenta_cxc_id)
          : "",
        cuenta_ingreso_mantenimiento_id:
          configData.cuenta_ingreso_mantenimiento_id
            ? String(configData.cuenta_ingreso_mantenimiento_id)
            : "",
        cuenta_ingreso_mora_id: configData.cuenta_ingreso_mora_id
          ? String(configData.cuenta_ingreso_mora_id)
          : "",
        cuenta_otros_ingresos_id: configData.cuenta_otros_ingresos_id
          ? String(configData.cuenta_otros_ingresos_id)
          : "",
        cuenta_gasto_administrativo_id:
          configData.cuenta_gasto_administrativo_id
            ? String(configData.cuenta_gasto_administrativo_id)
            : "",
        cuenta_gasto_operativo_id: configData.cuenta_gasto_operativo_id
          ? String(configData.cuenta_gasto_operativo_id)
          : "",
        cuenta_gasto_servicios_basicos_id:
          configData.cuenta_gasto_servicios_basicos_id
            ? String(configData.cuenta_gasto_servicios_basicos_id)
            : "",
        cuenta_gasto_nomina_id: configData.cuenta_gasto_nomina_id
          ? String(configData.cuenta_gasto_nomina_id)
          : "",
        cuenta_gasto_profesional_id: configData.cuenta_gasto_profesional_id
          ? String(configData.cuenta_gasto_profesional_id)
          : "",
      });
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function convertirValor(valor: string) {
    return valor ? Number(valor) : null;
  }

  async function guardarConfiguracion() {
    setGuardando(true);
    setError("");
    setMensaje("");

    const payload = {
      condominio_id: condominioId,
      cuenta_banco_operativo_id: convertirValor(form.cuenta_banco_operativo_id),
      cuenta_banco_reserva_id: convertirValor(form.cuenta_banco_reserva_id),
      cuenta_caja_chica_id: convertirValor(form.cuenta_caja_chica_id),
      cuenta_cxc_id: convertirValor(form.cuenta_cxc_id),
      cuenta_ingreso_mantenimiento_id: convertirValor(
        form.cuenta_ingreso_mantenimiento_id
      ),
      cuenta_ingreso_mora_id: convertirValor(form.cuenta_ingreso_mora_id),
      cuenta_otros_ingresos_id: convertirValor(form.cuenta_otros_ingresos_id),
      cuenta_gasto_administrativo_id: convertirValor(
        form.cuenta_gasto_administrativo_id
      ),
      cuenta_gasto_operativo_id: convertirValor(form.cuenta_gasto_operativo_id),
      cuenta_gasto_servicios_basicos_id: convertirValor(
        form.cuenta_gasto_servicios_basicos_id
      ),
      cuenta_gasto_nomina_id: convertirValor(form.cuenta_gasto_nomina_id),
      cuenta_gasto_profesional_id: convertirValor(
        form.cuenta_gasto_profesional_id
      ),
      estado: "Activo",
    };

    const { error } = await supabase
      .from("contabilidad_configuracion")
      .upsert(payload, {
        onConflict: "condominio_id",
      });

    if (error) {
      setError(error.message);
    } else {
      setMensaje("Configuración contable guardada correctamente.");
      await cargarDatos();
    }

    setGuardando(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link
            href="/contabilidad"
            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Contabilidad
          </Link>

          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
              <Settings className="h-6 w-6" />
            </span>
            Configuración Contable
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Define las cuentas que utilizará VAM para generar asientos
            automáticos por condominio.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {mensaje}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {cargando ? (
            <p className="text-sm text-slate-500">
              Cargando configuración contable...
            </p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {campos.map(([campo, label]) => (
                  <div key={campo}>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {label}
                    </label>

                    <select
                      value={form[campo]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [campo]: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Seleccione una cuenta</option>
                      {cuentas.map((cuenta) => (
                        <option key={cuenta.id} value={cuenta.id}>
                          {cuenta.codigo} - {cuenta.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={guardarConfiguracion}
                  disabled={guardando}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {guardando ? "Guardando..." : "Guardar configuración"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}