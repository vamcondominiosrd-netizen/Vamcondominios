"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Plus, Search } from "lucide-react";
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

  async function cargarAsientos() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("contabilidad_asientos")
      .select(`
        id,
        fecha,
        referencia,
        descripcion,
        estado,
        total_debito,
        total_credito,
        origen
      `)
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
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
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
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Cargando asientos...
                    </td>
                  </tr>
                ) : asientosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No existen asientos contables registrados.
                    </td>
                  </tr>
                ) : (
                  asientosFiltrados.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{item.id}</td>

                      <td className="px-4 py-3">{item.fecha}</td>

                      <td className="px-4 py-3">
                        {item.referencia || "-"}
                      </td>

                      <td className="px-4 py-3">
                        {item.descripcion}
                      </td>

                      <td className="px-4 py-3">
                        {item.origen || "MANUAL"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {Number(item.total_debito || 0).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {Number(item.total_credito || 0).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
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
    </main>
  );
}