"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Search } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Cuenta = {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  categoria_financiera: string | null;
};

type Detalle = {
  cuenta_id: number;
  debito: number;
  credito: number;
};

const condominioId = 1;

export default function EstadoResultadosPage() {
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
      .select("id,codigo,nombre,tipo,categoria_financiera")
      .eq("condominio_id", condominioId)
      .eq("estado", "Activo")
      .in("tipo", ["Ingreso", "Gasto"])
      .order("codigo", { ascending: true });

    if (errorCuentas) {
      setError(errorCuentas.message);
      setCargando(false);
      return;
    }

    const cuentaIds = (cuentasData || []).map((c) => c.id);

    let detallesData: Detalle[] = [];

    if (cuentaIds.length > 0) {
      const { data, error } = await supabase
        .from("contabilidad_asientos_detalle")
        .select("cuenta_id,debito,credito")
        .in("cuenta_id", cuentaIds);

      if (error) {
        setError(error.message);
        setCargando(false);
        return;
      }

      detallesData = data || [];
    }

    setCuentas(cuentasData || []);
    setDetalles(detallesData);
    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function formatoMonto(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const cuentasConSaldo = useMemo(() => {
    return cuentas.map((cuenta) => {
      const movimientos = detalles.filter((d) => d.cuenta_id === cuenta.id);

      const debito = movimientos.reduce(
        (acc, item) => acc + Number(item.debito || 0),
        0
      );

      const credito = movimientos.reduce(
        (acc, item) => acc + Number(item.credito || 0),
        0
      );

      const monto =
        cuenta.tipo === "Ingreso"
          ? credito - debito
          : debito - credito;

      return {
        ...cuenta,
        debito,
        credito,
        monto,
      };
    });
  }, [cuentas, detalles]);

  const cuentasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return cuentasConSaldo;

    return cuentasConSaldo.filter(
      (item) =>
        item.codigo.toLowerCase().includes(texto) ||
        item.nombre.toLowerCase().includes(texto) ||
        item.tipo.toLowerCase().includes(texto)
    );
  }, [busqueda, cuentasConSaldo]);

  const ingresos = cuentasFiltradas.filter((c) => c.tipo === "Ingreso");
  const gastos = cuentasFiltradas.filter((c) => c.tipo === "Gasto");

  const totalIngresos = ingresos.reduce(
    (acc, item) => acc + Number(item.monto || 0),
    0
  );

  const totalGastos = gastos.reduce(
    (acc, item) => acc + Number(item.monto || 0),
    0
  );

  const resultado = totalIngresos - totalGastos;
  const esSuperavit = resultado >= 0;

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
              <TrendingUp className="h-6 w-6" />
            </span>
            Estado de Resultados
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Resumen de ingresos, gastos y resultado del período.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Ingresos</p>
            <h2 className="mt-1 text-xl font-bold text-green-700">
              RD$ {formatoMonto(totalIngresos)}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Gastos</p>
            <h2 className="mt-1 text-xl font-bold text-red-700">
              RD$ {formatoMonto(totalGastos)}
            </h2>
          </div>

          <div
            className={`rounded-2xl border p-4 shadow-sm ${
              esSuperavit
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <p className="text-sm text-slate-500">
              {esSuperavit ? "Superávit" : "Déficit"}
            </p>
            <h2
              className={`mt-1 text-xl font-bold ${
                esSuperavit ? "text-green-700" : "text-red-700"
              }`}
            >
              RD$ {formatoMonto(resultado)}
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

          {cargando ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Cargando estado de resultados...
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="bg-green-50 px-4 py-3 font-semibold text-green-800">
                  Ingresos
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-left">Cuenta</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {ingresos.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No hay ingresos registrados.
                        </td>
                      </tr>
                    ) : (
                      ingresos.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">
                            {item.codigo}
                          </td>
                          <td className="px-4 py-3">{item.nombre}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            RD$ {formatoMonto(item.monto)}
                          </td>
                        </tr>
                      ))
                    )}

                    <tr className="bg-green-50 font-bold text-green-800">
                      <td className="px-4 py-3" colSpan={2}>
                        Total Ingresos
                      </td>
                      <td className="px-4 py-3 text-right">
                        RD$ {formatoMonto(totalIngresos)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="bg-red-50 px-4 py-3 font-semibold text-red-800">
                  Gastos
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-left">Cuenta</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {gastos.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No hay gastos registrados.
                        </td>
                      </tr>
                    ) : (
                      gastos.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">
                            {item.codigo}
                          </td>
                          <td className="px-4 py-3">{item.nombre}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            RD$ {formatoMonto(item.monto)}
                          </td>
                        </tr>
                      ))
                    )}

                    <tr className="bg-red-50 font-bold text-red-800">
                      <td className="px-4 py-3" colSpan={2}>
                        Total Gastos
                      </td>
                      <td className="px-4 py-3 text-right">
                        RD$ {formatoMonto(totalGastos)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}