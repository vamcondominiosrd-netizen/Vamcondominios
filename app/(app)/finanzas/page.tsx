"use client";

import Link from "next/link";
import {
  WalletCards,
  FileSpreadsheet,
  ReceiptText,
  ClipboardCheck,
  Coins,
  Landmark,
  BarChart3,
  ArrowRight,
  AlertTriangle,
  Settings,
} from "lucide-react";

type ModuloFinanzas = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  fondo: string;
  iconoColor: string;
};

type SeccionFinanzas = {
  titulo: string;
  descripcion: string;
  modulos: ModuloFinanzas[];
};

export default function FinanzasPage() {
  const secciones: SeccionFinanzas[] = [
    {
      titulo: "Configuraciones",
      descripcion:
        "Módulos para configurar cargos, morosidad, fondos, parámetros financieros y reportes.",
      modulos: [
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
          titulo: "Cuadre de Pagos Propietarios",
          descripcion:
            "Revisar Los Pagos de Propietarios.",
          href: "finanzas/pagos/cuadre-propietario",
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
          titulo: "Reporte Financiero",
          descripcion:
            "Consultar ingresos, gastos, balances y estados financieros.",
          href: "/reportes",
          icono: BarChart3,
          fondo: "from-green-600 to-green-800",
          iconoColor: "text-green-700",
        },
      ],
    },
    {
      titulo: "Pagos",
      descripcion:
        "Registro, consulta, gastos y aprobación de pagos del condominio activo.",
      modulos: [
        {
          titulo: "Pagos de Mantenimiento",
          descripcion:
            "Registrar pagos y aplicarlos automáticamente a cargos pendientes.",
          href: "/pagos-mantenimiento",
          icono: WalletCards,
          fondo: "from-emerald-600 to-emerald-800",
          iconoColor: "text-emerald-700",
        },
        {
          titulo: "Gastos",
          descripcion:
            "Registrar y controlar gastos operativos del condominio activo.",
          href: "/gastos",
          icono: ReceiptText,
          fondo: "from-orange-500 to-orange-700",
          iconoColor: "text-orange-700",
        },
        {
          titulo: "Solicitudes de Pago",
          descripcion:
            "Crear solicitudes de pago y dar seguimiento al flujo de aprobación.",
          href: "/solicitudes-pago",
          icono: ClipboardCheck,
          fondo: "from-sky-600 to-sky-800",
          iconoColor: "text-sky-700",
        },
        {
          titulo: "Estado de Cuenta",
          descripcion:
            "Consultar cargos, pagos, balances y créditos por apartamento.",
          href: "/consulta-estado",
          icono: ReceiptText,
          fondo: "from-purple-600 to-purple-800",
          iconoColor: "text-purple-700",
        },
        {
          titulo: "Aprobación Tesorero",
          descripcion:
            "Revisar, aprobar, devolver o rechazar solicitudes pendientes.",
          href: "/solicitudes-pago/tesorero",
          icono: ClipboardCheck,
          fondo: "from-amber-500 to-yellow-700",
          iconoColor: "text-amber-700",
        },
        {
          titulo: "Aprobación Presidente",
          descripcion: "Autorizar solicitudes ya aprobadas por tesorería.",
          href: "/solicitudes-pago/presidente",
          icono: ClipboardCheck,
          fondo: "from-pink-600 to-rose-800",
          iconoColor: "text-pink-700",
        },
      ],
    },
    {
      titulo: "Caja Chica",
      descripcion:
        "Control de movimientos menores, fondos disponibles, balances y reportes.",
      modulos: [
        {
          titulo: "Movimientos",
          descripcion:
            "Registrar ingresos, salidas y comprobantes de caja chica.",
          href: "/caja-chica",
          icono: Coins,
          fondo: "from-teal-600 to-teal-800",
          iconoColor: "text-teal-700",
        },
        {
          titulo: "Fondos",
          descripcion:
            "Administrar fondos disponibles y responsables de caja chica.",
          href: "/caja-chica/fondos",
          icono: WalletCards,
          fondo: "from-blue-600 to-cyan-800",
          iconoColor: "text-blue-700",
        },
        {
          titulo: "Balance",
          descripcion:
            "Consultar balances disponibles por fondo de caja chica.",
          href: "/caja-chica/balance",
          icono: BarChart3,
          fondo: "from-purple-600 to-indigo-800",
          iconoColor: "text-purple-700",
        },
        {
          titulo: "Reportes Caja Chica",
          descripcion:
            "Generar reportes de movimientos, fondos y balances.",
          href: "/caja-chica/reporte",
          icono: FileSpreadsheet,
          fondo: "from-slate-700 to-slate-950",
          iconoColor: "text-slate-700",
        },
      ],
    },
  ];

  return (
    <main className="space-y-5">
      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Módulo
            </p>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
              Finanzas
            </h1>

            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              Administre configuraciones financieras, pagos, gastos,
              solicitudes, caja chica, fondos y reportes del condominio activo.
            </p>
          </div>

          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-slate-900 flex items-center justify-center shadow-lg">
            <WalletCards className="h-9 w-9 text-white" />
          </div>
        </div>
      </section>

      {secciones.map((seccion) => (
        <section
          key={seccion.titulo}
          className="bg-white rounded-2xl border shadow-sm p-5"
        >
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              {seccion.titulo}
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              {seccion.descripcion}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {seccion.modulos.map((modulo) => {
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
      ))}

      <section className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm p-5">
        <h2 className="text-lg font-bold">Flujo recomendado</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-sm">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-emerald-300 font-bold">1. Configuraciones</p>
            <p className="text-slate-300 mt-1 text-xs">
              Definir cargos, fondos, morosidad y parámetros financieros.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-emerald-300 font-bold">2. Pagos</p>
            <p className="text-slate-300 mt-1 text-xs">
              Registrar pagos, gastos y solicitudes del condominio.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-emerald-300 font-bold">3. Caja Chica</p>
            <p className="text-slate-300 mt-1 text-xs">
              Controlar movimientos menores, fondos y balances.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-emerald-300 font-bold">4. Reportes</p>
            <p className="text-slate-300 mt-1 text-xs">
              Analizar la situación financiera del condominio.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}