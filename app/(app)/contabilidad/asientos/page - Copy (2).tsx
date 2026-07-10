"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Plus, Search, X, Save } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Asiento = {
  id: number;
  fecha: string;
  referencia: string | null;
  descripcion: string;
  estado: string;
  total_debito: number;
  total_credito: number;
  origen: string | null;
};

const condominioId = 1;

export default function AsientosPage() {
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    tipo_documento: "DIARIO",
    referencia: "",
    descripcion: "",
  });

  async function cargarAsientos() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("contabilidad_asientos")
      .select(
        "id,fecha,referencia,descripcion,estado,total_debito,total_credito,origen"
      )
      .eq("condominio_id", condominioId)
      .order("id", { ascending: false });

    if (error) {
      setError(error.message);
      setAsientos([]);
    } else {
      setAsientos(data || []);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarAsientos();
  }, []);

  async function guardarCabeceraAsiento() {
    setError("");

    if (!form.fecha) {
      setError("La fecha es obligatoria.");
      return;
    }

    if (!form.descripcion.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("contabilidad_asientos").insert({
      condominio_id: condominioId,
      fecha: form.fecha,
      tipo_documento: form.tipo_documento,
      referencia: form.referencia.trim() || null,
      descripcion: form.descripcion.trim(),
      estado: "Borrador",
      total_debito: 0,
      total_credito: 0,
      origen: "MANUAL",
    });

    if (error) {
      setError(error.message);
    } else {
      setModalAbierto(false);
      setForm({
        fecha: new Date().toISOString().slice(0, 10),
        tipo_documento: "DIARIO",
        referencia: "",
        descripcion: "",
      });
      await cargarAsientos();
    }

    setGuardando(false);
  }

  const asientosFiltrados = asientos.filter((a) => {
    const texto = busqueda.toLowerCase();

    return (
      a.descripcion?.toLowerCase().includes(texto) ||
      a.referencia?.toLowerCase().includes(texto) ||
      a.origen?.toLowerCase().includes(texto)
    );
  });

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
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                <FileText className="h-6 w-6" />
              </span>
              Asientos Contables
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Registro de asientos manuales y automáticos del sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo Asiento
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex justify-end">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Referencia</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-left">Origen</th>
                  <th className="px-4 py-3 text-right">Débito</th>
                  <th className="px-4 py-3 text-right">Crédito</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {cargando ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      Cargando asientos...
                    </td>
                  </tr>
                ) : asientosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      No existen asientos contables registrados.
                    </td>
                  </tr>
                ) : (
                  asientosFiltrados.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{item.id}</td>
                      <td className="px-4 py-3">{item.fecha}</td>
                      <td className="px-4 py-3">{item.referencia || "-"}</td>
                      <td className="px-4 py-3">{item.descripcion}</td>
                      <td className="px-4 py-3">{item.origen || "MANUAL"}</td>
                      <td className="px-4 py-3 text-right">
                        {Number(item.total_debito || 0).toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {Number(item.total_credito || 0).toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                          {item.estado}
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
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                Nuevo Asiento Contable
              </h2>

              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Tipo documento
                  </label>
                  <select
                    value={form.tipo_documento}
                    onChange={(e) =>
                      setForm({ ...form, tipo_documento: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="DIARIO">Diario</option>
                    <option value="PAGO">Pago</option>
                    <option value="GASTO">Gasto</option>
                    <option value="NOMINA">Nómina</option>
                    <option value="AJUSTE">Ajuste</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Referencia
                </label>
                <input
                  value={form.referencia}
                  onChange={(e) =>
                    setForm({ ...form, referencia: e.target.value })
                  }
                  placeholder="Ej: AS-0001"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Descripción
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  placeholder="Descripción del asiento contable"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarCabeceraAsiento}
                  disabled={guardando}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {guardando ? "Guardando..." : "Guardar cabecera"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}