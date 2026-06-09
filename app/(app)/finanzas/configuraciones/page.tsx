"use client";

import Link from "next/link";
import {
  FileSpreadsheet,
  AlertTriangle,
  Landmark,
  Settings,
  BarChart3,
  ArrowRight,
  Calculator,
} from "lucide-react";

type Modulo = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  fondo: string;
  iconoColor: string;
};

export default function FinanzasConfiguracionesPage() {
  const modulos: Modulo[] = [
    {
      titulo: "Gestión de Cargos",
      descripcion:
        "Crear cargos individuales, cargos masivos y mantenimiento mensual.",
      href: "/cargos-individuales",
      icono: FileSpreadsheet,
      fondo: "from-blue-600 to-blue-800",
      iconoColor: "text-blue-700",
    },
    {
      titulo: "Morosidad",
      descripcion:
        "Revisar apartamentos con balances vencidos o pendientes de pago.",
      href: "/morosidad",
      icono: AlertTriangle,
      fondo: "from-red-600 to-red-800",
      iconoColor: "text-red-700",
    },
    {
      titulo: "Banco / Fondos",
      descripcion:
        "Administrar cuentas bancarias, fondos ordinarios y extraordinarios.",
      href: "/tesoreria",
      icono: Landmark,
      fondo: "from-indigo-600 to-indigo-900",
      iconoColor: "text-indigo-700",
    },
    {
      titulo: "Configuración Financiera",
      descripcion:
        "Definir parámetros financieros, cuentas y reglas del módulo.",
      href: "/configuracion-financiera",
      icono: Settings,
      fondo: "from-slate-700 to-slate-950",
      iconoColor: "text-slate-700",
    },
    {
      titulo: "Presupuesto y Cuota",
      descripcion:
        "Elabora el presupuesto proyectado, revisa gastos reales y calcula la cuota sugerida.",
      href: "/finanzas/configuraciones/presupuesto",
      icono: Calculator,
      fondo: "from-emerald-600 to-green-800",
      iconoColor: "text-emerald-700",
    },
    {
      titulo: "Reporte Financiero",
      descripcion:
        "Consultar ingresos, gastos, balances y estados financieros.",
      href: "/reportes",
      icono: BarChart3,
      fondo: "from-green-600 to-green-800",
      iconoColor: "text-green-700",
    },
  ];

  return (
    <main className="space-y-5">
      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Finanzas
            </p>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
              Configuraciones
            </h1>

            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              Configure cargos, morosidad, fondos bancarios, parámetros
              financieros, presupuesto y reportes del condominio activo.
            </p>
          </div>

          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-slate-900 flex items-center justify-center shadow-lg">
            <Settings className="h-9 w-9 text-white" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Opciones de Configuración
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
                  <h3 className="font-black text-slate-900 text-base group-hover:text-emerald-700">
                    {modulo.titulo}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 min-h-[54px] leading-relaxed">
                    {modulo.descripcion}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-emerald-700">
                    <span>Abrir módulo</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}