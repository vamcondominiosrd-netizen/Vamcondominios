"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Plus, Search, X } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Cuenta = {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  nivel: number;
  permite_movimiento: boolean;
  estado: string;
};

const tiposCuenta = ["Activo", "Pasivo", "Patrimonio", "Ingreso", "Gasto"];

export default function PlanCuentasPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    tipo: "Activo",
    nivel: 1,
    permite_movimiento: true,
    estado: "Activo",
  });

  async function cargarCuentas() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase
     .from("contabilidad_cuentas")
     .select("id,condominio_id,codigo,nombre,tipo,nivel,permite_movimiento,estado")
     .eq("condominio_id", 1)
     .order("codigo", { ascending: true });

    if (error) {
      setError(error.message);
      setCuentas([]);
    } else {
      setCuentas(data || []);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarCuentas();
  }, []);

  function limpiarFormulario() {
    setForm({
      codigo: "",
      nombre: "",
      tipo: "Activo",
      nivel: 1,
      permite_movimiento: true,
      estado: "Activo",
    });
  }

  async function guardarCuenta() {
    setError("");

    if (!form.codigo.trim()) {
      setError("El código de la cuenta es obligatorio.");
      return;
    }

    if (!form.nombre.trim()) {
      setError("El nombre de la cuenta es obligatorio.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("contabilidad_plan_maestro").insert({
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      nivel: Number(form.nivel),
      permite_movimiento: form.permite_movimiento,
      estado: form.estado,
    });

    if (error) {
      setError(error.message);
    } else {
      limpiarFormulario();
      setModalAbierto(false);
      await cargarCuentas();
    }

    setGuardando(false);
  }

  const cuentasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return cuentas;

    return cuentas.filter(
      (cuenta) =>
        cuenta.codigo.toLowerCase().includes(texto) ||
        cuenta.nombre.toLowerCase().includes(texto) ||
        cuenta.tipo.toLowerCase().includes(texto)
    );
  }, [busqueda, cuentas]);

  const resumen = useMemo(() => {
    return {
      Activo: cuentas.filter((c) => c.tipo === "Activo").length,
      Pasivo: cuentas.filter((c) => c.tipo === "Pasivo").length,
      Patrimonio: cuentas.filter((c) => c.tipo === "Patrimonio").length,
      Ingreso: cuentas.filter((c) => c.tipo === "Ingreso").length,
      Gasto: cuentas.filter((c) => c.tipo === "Gasto").length,
    };
  }, [cuentas]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                <BookOpen className="h-6 w-6" />
              </span>
              Plan de Cuentas
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Catálogo contable SaaS multi-condominio para activos, pasivos,
              patrimonio, ingresos y gastos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nueva cuenta
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-5">
          {[
            ["Activos", resumen.Activo],
            ["Pasivos", resumen.Pasivo],
            ["Patrimonio", resumen.Patrimonio],
            ["Ingresos", resumen.Ingreso],
            ["Gastos", resumen.Gasto],
          ].map(([titulo, valor]) => (
            <div
              key={titulo}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-slate-500">{titulo}</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-800">
                {valor}
              </h2>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Cuentas contables
            </h2>

            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por código, nombre o tipo..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Nivel</th>
                  <th className="px-4 py-3 font-semibold">Movimiento</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">
                {cargando ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Cargando plan de cuentas...
                    </td>
                  </tr>
                ) : cuentasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No hay cuentas contables para mostrar.
                    </td>
                  </tr>
                ) : (
                  cuentasFiltradas.map((cuenta) => (
                    <tr key={cuenta.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {cuenta.codigo}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {cuenta.nombre}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {cuenta.tipo}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {cuenta.nivel}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {cuenta.permite_movimiento ? "Sí" : "No"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          {cuenta.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                Nueva cuenta contable
              </h2>

              <button
                type="button"
                onClick={() => {
                  limpiarFormulario();
                  setModalAbierto(false);
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Código
                </label>
                <input
                  value={form.codigo}
                  onChange={(e) =>
                    setForm({ ...form, codigo: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Ej: 5.6"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nombre
                </label>
                <input
                  value={form.nombre}
                  onChange={(e) =>
                    setForm({ ...form, nombre: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Ej: Reparaciones y mantenimiento"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Tipo
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) =>
                      setForm({ ...form, tipo: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {tiposCuenta.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Nivel
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.nivel}
                    onChange={(e) =>
                      setForm({ ...form, nivel: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.permite_movimiento}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      permite_movimiento: e.target.checked,
                    })
                  }
                />
                Permite movimiento
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    limpiarFormulario();
                    setModalAbierto(false);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarCuenta}
                  disabled={guardando}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {guardando ? "Guardando..." : "Guardar cuenta"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}