"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  FileText,
  ListChecks,
  BarChart3,
  TrendingUp,
  Landmark,
  Wallet,
  ReceiptText,
  ClipboardList,
  Calculator,
  FileSpreadsheet,
  PiggyBank,
  Repeat,
  LockKeyhole,
} from "lucide-react";

const modulos = [
  {
    titulo: "Dashboard Contable",
    descripcion: "Resumen financiero general del condominio.",
    href: "/contabilidad/dashboard",
    icono: LayoutDashboard,
  },
  {
    titulo: "Plan de Cuentas",
    descripcion: "Catálogo contable por condominio.",
    href: "/contabilidad/plan-cuentas",
    icono: BookOpen,
  },
  {
    titulo: "Configuración Contable",
    descripcion: "Cuentas automáticas por proceso.",
    href: "/contabilidad/configuracion",
    icono: Settings,
  },
  {
    titulo: "Asientos Contables",
    descripcion: "Registro manual y automático.",
    href: "/contabilidad/asientos",
    icono: FileText,
  },
  {
    titulo: "Mayor General",
    descripcion: "Movimientos detallados por cuenta.",
    href: "/contabilidad/mayor-general",
    icono: ListChecks,
  },
  {
    titulo: "Balance de Comprobación",
    descripcion: "Débitos, créditos y saldos.",
    href: "/contabilidad/balance-comprobacion",
    icono: BarChart3,
  },
  {
    titulo: "Estado de Resultados",
    descripcion: "Ingresos, gastos y resultado.",
    href: "/contabilidad/estado-resultados",
    icono: TrendingUp,
  },
  {
    titulo: "Balance General",
    descripcion: "Activos, pasivos y patrimonio.",
    href: "/contabilidad/balance-general",
    icono: Landmark,
  },
  {
    titulo: "Flujo de Efectivo",
    descripcion: "Entradas y salidas de dinero.",
    href: "/contabilidad/flujo-efectivo",
    icono: Wallet,
  },
  {
    titulo: "Cuentas por Cobrar",
    descripcion: "Cargos, cuotas pendientes y balances.",
    href: "/contabilidad/cuentas-cobrar",
    icono: ReceiptText,
  },
  {
    titulo: "Cuentas por Pagar",
    descripcion: "Facturas, gastos y obligaciones.",
    href: "/contabilidad/cuentas-pagar",
    icono: ClipboardList,
  },
  {
    titulo: "Presupuesto Anual",
    descripcion: "Presupuesto por cuenta y período.",
    href: "/contabilidad/presupuesto",
    icono: Calculator,
  },
  {
    titulo: "Presupuesto vs Ejecutado",
    descripcion: "Comparativo para asambleas.",
    href: "/contabilidad/presupuesto-ejecutado",
    icono: FileSpreadsheet,
  },
  {
    titulo: "Fondo de Reserva",
    descripcion: "Control operativo y reserva.",
    href: "/contabilidad/fondo-reserva",
    icono: PiggyBank,
  },
  {
    titulo: "Conciliación Bancaria",
    descripcion: "Cruce banco vs contabilidad.",
    href: "/contabilidad/conciliacion-bancaria",
    icono: Repeat,
  },
  {
    titulo: "Cierre Mensual",
    descripcion: "Bloqueo y cierre de períodos.",
    href: "/contabilidad/cierre-mensual",
    icono: LockKeyhole,
  },
];

export default function ContabilidadPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Módulo Contable
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administración contable SaaS multi-condominio de VAM.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Flujo recomendado
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Configura el plan de cuentas, define las cuentas automáticas,
            registra asientos y valida los estados financieros.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;

            return (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                  <Icono className="h-6 w-6" />
                </div>

                <h3 className="text-base font-semibold text-slate-800 group-hover:text-blue-700">
                  {modulo.titulo}
                </h3>

                <p className="mt-2 text-sm leading-5 text-slate-500">
                  {modulo.descripcion}
                </p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}