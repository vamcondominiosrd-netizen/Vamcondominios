"use client";

import Link from "next/link";
import {
  BarChart3,
  FileSpreadsheet,
  WalletCards,
  AlertTriangle,
  ReceiptText,
  TrendingUp,
  Download,
  ArrowRight,
} from "lucide-react";

type ModuloReporte = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  fondo: string;
  iconoColor: string;
};

export default function ReportesPage() {
  const modulos: ModuloReporte[] = [
    {
      titulo: "Centro de Reportes",
      descripcion:
        "Vista general de reportes disponibles del condominio activo.",
      href: "/reportes",
      icono: BarChart3,
      fondo: "from-blue-600 to-blue-800",
      iconoColor: "text-blue-700",
    },
    {
      titulo: "Estado Financiero",
      descripcion:
        "Consultar balances, ingresos, egresos y situación financiera.",
      href: "/reportes/estado-financiero",
      icono: FileSpreadsheet,
      fondo: "from-emerald-600 to-emerald-800",
      iconoColor: "text-emerald-700",
    },
    {
      titulo: "Ingresos vs Gastos",
      descripcion:
        "Analizar ingresos y gastos por mes, período o categoría.",
      href: "/reportes/ingresos-gastos",
      icono: TrendingUp,
      fondo: "from-purple-600 to-purple-800",
      iconoColor: "text-purple-700",
    },
    {
      titulo: "Cuentas por Cobrar",
      descripcion:
        "Revisar balances pendientes por apartamento y período.",
      href: "/reportes/cuentas-por-cobrar",
      icono: WalletCards,
      fondo: "from-amber-500 to-orange-700",
      iconoColor: "text-amber-700",
    },
    {
      titulo: "Morosidad",
      descripcion:
        "Reporte de propietarios con pagos pendientes o vencidos.",
      href: "/morosidad",
      icono: AlertTriangle,
      fondo: "from-red-600 to-red-800",
      iconoColor: "text-red-700",
    },
    {
      titulo: "Pagos por Propietarios",
      descripcion:
        "Consultar pagos registrados por unidad, fecha y concepto.",
      href: "/reportes/pagos-propietarios",
      icono: WalletCards,
      fondo: "from-sky-600 to-sky-800",
      iconoColor: "text-sky-700",
    },
    {
      titulo: "Gastos por Categoría",
      descripcion:
        "Analizar gastos por proveedor, categoría, período y fondo.",
      href: "/reportes/gastos-categoria",
      icono: ReceiptText,
      fondo: "from-pink-600 to-rose-800",
      iconoColor: "text-pink-700",
    },
    {
      titulo: "Presupuesto Anual",
      descripcion:
        "Comparar presupuesto anual contra ingresos y gastos reales.",
      href: "/reportes/presupuesto-anual",
      icono: FileSpreadsheet,
      fondo: "from-indigo-600 to-indigo-900",
      iconoColor: "text-indigo-700",
    },
    {
      titulo: "Exportar a Excel",
      descripcion:
        "Generar archivos Excel con reportes financieros y operativos.",
      href: "/reportes/exportar",
      icono: Download,
      fondo: "from-slate-700 to-slate-950",
      iconoColor: "text-slate-700",
    },
  ];

  return (
    <main className="space-y-5">
      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Módulo
            </p>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
              Reportes
            </h1>

            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              Consulte reportes financieros, cuentas por cobrar, morosidad,
              pagos, gastos, presupuesto anual y exportaciones del condominio.
            </p>
          </div>

          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-600 to-slate-900 flex items-center justify-center shadow-lg">
            <BarChart3 className="h-9 w-9 text-white" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Opciones de Reportes
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Seleccione una opción para continuar trabajando.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;

            return (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="group rounded-2xl border bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden"
              >
                <div
                  className={`h-20 bg-gradient-to-br ${modulo.fondo} flex items-center justify-center relative`}
                >
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_white,_transparent_35%)]" />

                  <div className="h-14 w-14 rounded-2xl bg-white/95 flex items-center justify-center shadow-md relative z-10 group-hover:scale-105 transition">
                    <Icono className={`h-8 w-8 ${modulo.iconoColor}`} />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-black text-slate-900 text-base group-hover:text-green-700">
                    {modulo.titulo}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 min-h-[54px] leading-relaxed">
                    {modulo.descripcion}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-green-700">
                    <span>Abrir módulo</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm p-5">
        <h2 className="text-lg font-bold">Flujo recomendado Reportes</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-sm">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-green-300 font-bold">1. Estado Financiero</p>
            <p className="text-slate-300 mt-1 text-xs">
              Revisar ingresos, gastos y balance general.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-green-300 font-bold">2. Cuentas por Cobrar</p>
            <p className="text-slate-300 mt-1 text-xs">
              Consultar balances pendientes y morosidad.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-green-300 font-bold">3. Gastos</p>
            <p className="text-slate-300 mt-1 text-xs">
              Analizar gastos por categoría y proveedor.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-green-300 font-bold">4. Exportar</p>
            <p className="text-slate-300 mt-1 text-xs">
              Generar reportes en Excel para revisión externa.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}