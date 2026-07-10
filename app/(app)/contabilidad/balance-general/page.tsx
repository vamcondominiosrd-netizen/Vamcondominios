"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Landmark } from "lucide-react";
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

export default function BalanceGeneralPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
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
      .in("tipo", ["Activo", "Pasivo", "Patrimonio"])
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

  const cuentasConSaldo = useMemo(() => {
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

      let saldo = 0;

      if (cuenta.tipo === "Activo") {
        saldo = debito - credito;
      } else {
        saldo = credito - debito;
      }

      return {
        ...cuenta,
        saldo,
      };
    });
  }, [cuentas, detalles]);

  const activos = cuentasConSaldo.filter(
    (c) => c.tipo === "Activo"
  );

  const pasivos = cuentasConSaldo.filter(
    (c) => c.tipo === "Pasivo"
  );

  const patrimonio = cuentasConSaldo.filter(
    (c) => c.tipo === "Patrimonio"
  );

  const totalActivos = activos.reduce(
    (acc, item) => acc + Number(item.saldo || 0),
    0
  );

  const totalPasivos = pasivos.reduce(
    (acc, item) => acc + Number(item.saldo || 0),
    0
  );

  const totalPatrimonio = patrimonio.reduce(
    (acc, item) => acc + Number(item.saldo || 0),
    0
  );

  const totalPasivoPatrimonio =
    totalPasivos + totalPatrimonio;

  const cuadrado =
    Math.abs(totalActivos - totalPasivoPatrimonio) < 0.01;

  function formatoMonto(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

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
              <Landmark className="h-6 w-6" />
            </span>
            Balance General
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Situación financiera del condominio.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Activos
            </p>
            <h2 className="text-2xl font-bold text-blue-700">
              RD$ {formatoMonto(totalActivos)}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">
              Pasivo + Patrimonio
            </p>
            <h2 className="text-2xl font-bold text-indigo-700">
              RD$ {formatoMonto(totalPasivoPatrimonio)}
            </h2>
          </div>

          <div
            className={`rounded-2xl border p-4 shadow-sm ${
              cuadrado
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <p className="text-sm text-slate-500">
              Estado
            </p>

            <h2
              className={`text-xl font-bold ${
                cuadrado
                  ? "text-green-700"
                  : "text-red-700"
              }`}
            >
              {cuadrado
                ? "Balance Cuadrado"
                : "Balance Descudrado"}
            </h2>
          </div>

        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 font-bold text-blue-800">
              Activos
            </div>

            <table className="w-full text-sm">
              <tbody>
                {activos.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100"
                  >
                    <td className="px-4 py-3">
                      {item.codigo}
                    </td>
                    <td className="px-4 py-3">
                      {item.nombre}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      RD$ {formatoMonto(item.saldo)}
                    </td>
                  </tr>
                ))}

                <tr className="bg-blue-50 font-bold">
                  <td
                    colSpan={2}
                    className="px-4 py-3"
                  >
                    Total Activos
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {formatoMonto(totalActivos)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

            <div className="bg-indigo-50 px-4 py-3 font-bold text-indigo-800">
              Pasivos
            </div>

            <table className="w-full text-sm">
              <tbody>
                {pasivos.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100"
                  >
                    <td className="px-4 py-3">
                      {item.codigo}
                    </td>
                    <td className="px-4 py-3">
                      {item.nombre}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      RD$ {formatoMonto(item.saldo)}
                    </td>
                  </tr>
                ))}

                <tr className="bg-indigo-50 font-bold">
                  <td
                    colSpan={2}
                    className="px-4 py-3"
                  >
                    Total Pasivos
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {formatoMonto(totalPasivos)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="bg-purple-50 px-4 py-3 font-bold text-purple-800 border-t">
              Patrimonio
            </div>

            <table className="w-full text-sm">
              <tbody>
                {patrimonio.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100"
                  >
                    <td className="px-4 py-3">
                      {item.codigo}
                    </td>
                    <td className="px-4 py-3">
                      {item.nombre}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      RD$ {formatoMonto(item.saldo)}
                    </td>
                  </tr>
                ))}

                <tr className="bg-purple-50 font-bold">
                  <td
                    colSpan={2}
                    className="px-4 py-3"
                  >
                    Total Patrimonio
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {formatoMonto(totalPatrimonio)}
                  </td>
                </tr>
              </tbody>
            </table>

          </section>

        </div>

      </div>
    </main>
  );
}