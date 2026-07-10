"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Search } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Cuenta = {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
};

type Detalle = {
  cuenta_id: number;
  debito: number;
  credito: number;
};

const condominioId = 1;

export default function BalanceComprobacionPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargarDatos() {
    setCargando(true);
    setError("");

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

    const { data: detallesData, error: errorDetalles } = await supabase
      .from("contabilidad_asientos_detalle")
      .select("cuenta_id,debito,credito");

    if (errorDetalles) {
      setError(errorDetalles.message);
      setCargando(false);
      return;
    }

    setCuentas(cuentasData || []);
    setDetalles(detallesData || []);
    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const balance = useMemo(() => {
    return cuentas.map((cuenta) => {
      const movimientos = detalles.filter(
        (d) => d.cuenta_id === cuenta.id
      );

      const debito = movimientos.reduce(
        (acc, item) => acc + Number(item.debito || 0),
        0
      );

      const credito = movimientos.reduce(
        (acc, item) => acc + Number(item.credito || 0),
        0
      );

      return {
        ...cuenta,
        debito,
        credito,
        saldo: debito - credito,
      };
    });
  }, [cuentas, detalles]);

  const balanceFiltrado = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return balance;

    return balance.filter(
      (item) =>
        item.codigo.toLowerCase().includes(texto) ||
        item.nombre.toLowerCase().includes(texto) ||
        item.tipo.toLowerCase().includes(texto)
    );
  }, [balance, busqueda]);

  const totales = useMemo(() => {
    const debito = balance.reduce(
      (acc, item) => acc + Number(item.debito || 0),
      0
    );

    const credito = balance.reduce(
      (acc, item) => acc + Number(item.credito || 0),
      0
    );

    return {
      debito,
      credito,
      diferencia: debito - credito,
    };
  }, [balance]);

  function formatoMonto(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const cuadrado = Math.abs(totales.diferencia) < 0.01;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
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
              <BarChart3 className="h-6 w-6" />
            </span>
            Balance de Comprobación
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Resumen contable de débitos, créditos y saldos por cuenta.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Débito</p>
            <h2 className="mt-1 text-xl font-bold text-slate-800">
              RD$ {formatoMonto(totales.debito)}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Crédito</p>
            <h2 className="mt-1 text-xl font-bold text-slate-800">
              RD$ {formatoMonto(totales.credito)}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Diferencia</p>
            <h2 className="mt-1 text-xl font-bold text-slate-800">
              RD$ {formatoMonto(totales.diferencia)}
            </h2>
          </div>

          <div
            className={`rounded-2xl border p-4 shadow-sm ${
              cuadrado
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <p className="text-sm text-slate-500">Estado</p>
            <h2
              className={`mt-1 text-lg font-bold ${
                cuadrado ? "text-green-700" : "text-red-700"
              }`}
            >
              {cuadrado ? "Balance Cuadrado" : "Balance Descudrado"}
            </h2>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex justify-end">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cuenta..."
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Cuenta</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-right">Débito</th>
                  <th className="px-4 py-3 text-right">Crédito</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Cargando balance...
                    </td>
                  </tr>
                ) : (
                  balanceFiltrado.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">
                        {item.codigo}
                      </td>

                      <td className="px-4 py-3">
                        {item.nombre}
                      </td>

                      <td className="px-4 py-3">
                        {item.tipo}
                      </td>

                      <td className="px-4 py-3 text-right">
                        RD$ {formatoMonto(item.debito)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        RD$ {formatoMonto(item.credito)}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold">
                        RD$ {formatoMonto(item.saldo)}
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