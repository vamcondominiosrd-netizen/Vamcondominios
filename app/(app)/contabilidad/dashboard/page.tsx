"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  BookOpen,
  ListChecks,
  BarChart3,
  TrendingUp,
  Landmark,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Wallet,
  Building2,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";
import VamHeader from "@/components/vam/layout/VamHeader";
import VamToolbar from "@/components/vam/layout/VamToolbar";
import VamStatCard from "@/components/vam/cards/VamStatCard";
import VamLoading from "@/components/vam/shared/VamLoading";
import VamEmpty from "@/components/vam/shared/VamEmpty";

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
      .select(
        "id,fecha,referencia,descripcion,estado,total_debito,total_credito,origen"
      )
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

  function exportarExcel() {
    const filas = [
      ["Indicador", "Valor"],
      ["Ingresos", resumen.ingresos],
      ["Gastos", resumen.gastos],
      ["Resultado", resumen.resultado],
      ["Activos", resumen.activos],
      ["Pasivos", resumen.pasivos],
      ["Patrimonio", resumen.patrimonio],
      ["Total Débito", resumen.totalDebito],
      ["Total Crédito", resumen.totalCredito],
      ["Diferencia", resumen.diferencia],
    ];

    const csv = filas
      .map((fila) => fila.map((valor) => `"${valor}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "dashboard-contable-vam.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function exportarPdf() {
    window.print();
  }

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
        <VamHeader
          title="Dashboard Ejecutivo Contable"
          subtitle="Centro financiero gerencial del condominio."
          badge="Contabilidad"
        />

        <VamToolbar
          showRefresh
          showExcel
          showPdf
          showPrint
          onRefresh={cargarDatos}
          onExcel={exportarExcel}
          onPdf={exportarPdf}
          onPrint={() => window.print()}
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {cargando ? (
          <VamLoading text="Cargando dashboard contable..." />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <VamStatCard
                title="Ingresos"
                value={`RD$ ${formatoMonto(resumen.ingresos)}`}
                subtitle="Ingresos acumulados"
                tone="green"
                icon={DollarSign}
              />

              <VamStatCard
                title="Gastos"
                value={`RD$ ${formatoMonto(resumen.gastos)}`}
                subtitle="Gastos acumulados"
                tone="red"
                icon={Wallet}
              />

              <VamStatCard
                title={superavit ? "Superávit" : "Déficit"}
                value={`RD$ ${formatoMonto(resumen.resultado)}`}
                subtitle="Resultado financiero"
                tone={superavit ? "green" : "red"}
                icon={TrendingUp}
              />

              <VamStatCard
                title="Balance"
                value={balanceCuadrado ? "Cuadrado" : "Descuadrado"}
                subtitle={`Diferencia RD$ ${formatoMonto(resumen.diferencia)}`}
                tone={balanceCuadrado ? "green" : "red"}
                icon={balanceCuadrado ? CheckCircle : AlertTriangle}
              />
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <VamStatCard
                title="Activos"
                value={`RD$ ${formatoMonto(resumen.activos)}`}
                subtitle="Total activos"
                tone="blue"
                icon={Building2}
              />

              <VamStatCard
                title="Pasivos"
                value={`RD$ ${formatoMonto(resumen.pasivos)}`}
                subtitle="Total pasivos"
                tone="purple"
                icon={Landmark}
              />

              <VamStatCard
                title="Patrimonio"
                value={`RD$ ${formatoMonto(resumen.patrimonio)}`}
                subtitle="Total patrimonio"
                tone="slate"
                icon={BarChart3}
              />
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

              {asientos.length === 0 ? (
                <VamEmpty
                  title="Sin asientos contables"
                  description="Todavía no existen asientos registrados."
                />
              ) : (
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
                      {asientos.map((a) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}