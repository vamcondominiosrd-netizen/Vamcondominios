"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  FileText,
  BookOpen,
  ListChecks,
  BarChart3,
  TrendingUp,
  Landmark,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
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

export default function DashboardContablePage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargarDatos() {
    setCargando(true);
    setError("");

    const { data: cuentasData, error: errorCuentas } = await supabase
      .from("contabilidad_cuentas")
      .select("id,codigo,nombre,tipo")
      .eq("condominio_id", condominioId)
      .eq("estado", "Activo");

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

    const { data: asientosData, error: errorAsientos } = await supabase
      .from("contabilidad_asientos")
      .select("id,fecha,referencia,descripcion,estado,total_debito,total_credito,origen")
      .eq("condominio_id", condominioId)
      .order("id", { ascending: false })
      .limit(5);

    if (errorAsientos) {
      setError(errorAsientos.message);
      setCargando(false);
      return;
    }

    setCuentas(cuentasData || []);
    setDetalles(detallesData || []);
    setAsientos(asientosData || []);
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

  const resumen = useMemo(() => {
    let ingresos = 0;
    let gastos = 0;
    let activos = 0;
    let pasivos = 0;
    let patrimonio = 0;
    let totalDebito = 0;
    let totalCredito = 0;

    cuentas.forEach((cuenta) => {
      const movs = detalles.filter((d) => d.cuenta_id === cuenta.id);

      const debito = movs.reduce((acc, m) => acc + Number(m.debito || 0), 0);
      const credito = movs.reduce((acc, m) => acc + Number(m.credito || 0), 0);

      totalDebito += debito;
      totalCredito += credito;

      if (cuenta.tipo === "Ingreso") ingresos += credito - debito;
      if (cuenta.tipo === "Gasto") gastos += debito - credito;
      if (cuenta.tipo === "Activo") activos += debito - credito;
      if (cuenta.tipo === "Pasivo") pasivos += credito - debito;
      if (cuenta.tipo === "Patrimonio") patrimonio += credito - debito;
    });

    return {
      ingresos,
      gastos,
      resultado: ingresos - gastos,
      activos,
      pasivos,
      patrimonio,
      totalDebito,
      totalCredito,
      diferencia: totalDebito - totalCredito,
      asientosBorrador: asientos.filter((a) => a.estado === "Borrador").length,
    };
  }, [cuentas, detalles, asientos]);

  const balanceCuadrado = Math.abs(resumen.diferencia) < 0.01;
  const superavit = resumen.resultado >= 0;

  const accesos = [
    {
      titulo: "Nuevo Asiento",
      href: "/contabilidad/asientos",
      icono: FileText,
    },
    {
      titulo: "Plan de Cuentas",
      href: "/contabilidad/plan-cuentas",
      icono: BookOpen,
    },
    {
      titulo: "Mayor General",
      href: "/contabilidad/mayor-general",
      icono: ListChecks,
    },
    {
      titulo: "Balance Comprobación",
      href: "/contabilidad/balance-comprobacion",
      icono: BarChart3,
    },
    {
      titulo: "Estado Resultados",
      href: "/contabilidad/estado-resultados",
      icono: TrendingUp,
    },
    {
      titulo: "Balance General",
      href: "/contabilidad/balance-general",
      icono: Landmark,
    },
  ];

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
              <LayoutDashboard className="h-6 w-6" />
            </span>
            Dashboard Ejecutivo Contable
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Centro financiero gerencial del condominio.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {cargando ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Cargando dashboard contable...
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Ingresos</p>
                <h2 className="mt-1 text-2xl font-bold text-green-700">
                  RD$ {formatoMonto(resumen.ingresos)}
                </h2>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Gastos</p>
                <h2 className="mt-1 text-2xl font-bold text-red-700">
                  RD$ {formatoMonto(resumen.gastos)}
                </h2>
              </div>

              <div
                className={`rounded-2xl border p-4 shadow-sm ${
                  superavit
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <p className="text-sm text-slate-500">
                  {superavit ? "Superávit" : "Déficit"}
                </p>
                <h2
                  className={`mt-1 text-2xl font-bold ${
                    superavit ? "text-green-700" : "text-red-700"
                  }`}
                >
                  RD$ {formatoMonto(resumen.resultado)}
                </h2>
              </div>

              <div
                className={`rounded-2xl border p-4 shadow-sm ${
                  balanceCuadrado
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <p className="text-sm text-slate-500">Balance</p>
                <h2
                  className={`mt-1 flex items-center gap-2 text-xl font-bold ${
                    balanceCuadrado ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {balanceCuadrado ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                  {balanceCuadrado ? "Cuadrado" : "Descuadrado"}
                </h2>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Activos</p>
                <h2 className="mt-1 text-xl font-bold text-blue-700">
                  RD$ {formatoMonto(resumen.activos)}
                </h2>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Pasivos</p>
                <h2 className="mt-1 text-xl font-bold text-indigo-700">
                  RD$ {formatoMonto(resumen.pasivos)}
                </h2>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Patrimonio</p>
                <h2 className="mt-1 text-xl font-bold text-purple-700">
                  RD$ {formatoMonto(resumen.patrimonio)}
                </h2>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  Estado Financiero
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                    <span>Total Débito</span>
                    <strong>RD$ {formatoMonto(resumen.totalDebito)}</strong>
                  </div>

                  <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                    <span>Total Crédito</span>
                    <strong>RD$ {formatoMonto(resumen.totalCredito)}</strong>
                  </div>

                  <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                    <span>Diferencia</span>
                    <strong>RD$ {formatoMonto(resumen.diferencia)}</strong>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  Alertas Contables
                </h2>

                <div className="space-y-3 text-sm">
                  {!balanceCuadrado && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                      El balance de comprobación está descuadrado.
                    </div>
                  )}

                  {resumen.asientosBorrador > 0 && (
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-yellow-700">
                      Existen {resumen.asientosBorrador} asientos en borrador.
                    </div>
                  )}

                  {balanceCuadrado && resumen.asientosBorrador === 0 && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-green-700">
                      No hay alertas contables importantes.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-800">
                Accesos Rápidos
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {accesos.map((item) => {
                  const Icono = item.icono;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <Icono className="h-5 w-5" />
                      </span>
                      <span className="font-semibold text-slate-700">
                        {item.titulo}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-800">
                Últimos Asientos
              </h2>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Referencia</th>
                      <th className="px-4 py-3 text-left">Descripción</th>
                      <th className="px-4 py-3 text-right">Débito</th>
                      <th className="px-4 py-3 text-right">Crédito</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {asientos.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No hay asientos registrados.
                        </td>
                      </tr>
                    ) : (
                      asientos.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">{a.fecha}</td>
                          <td className="px-4 py-3">{a.referencia || "-"}</td>
                          <td className="px-4 py-3">{a.descripcion}</td>
                          <td className="px-4 py-3 text-right">
                            RD$ {formatoMonto(Number(a.total_debito || 0))}
                          </td>
                          <td className="px-4 py-3 text-right">
                            RD$ {formatoMonto(Number(a.total_credito || 0))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              {a.estado}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}