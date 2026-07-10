"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BarChart3,
  Building2,
  ClipboardCheck,
  Coins,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  ReceiptText,
  Settings,
  WalletCards,
} from "lucide-react";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";

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
      titulo: "Operaciones principales",
      descripcion: "Accesos rápidos a los procesos financieros más utilizados.",
      modulos: [
        { titulo: "Pagos de Mantenimiento", descripcion: "Registrar pagos y aplicarlos automáticamente a cargos pendientes.", href: "/pagos-mantenimiento", icono: WalletCards, fondo: "from-emerald-600 to-emerald-800", iconoColor: "text-emerald-700" },
        { titulo: "Gastos", descripcion: "Registrar y controlar gastos operativos del condominio activo.", href: "/gastos", icono: ReceiptText, fondo: "from-orange-500 to-orange-700", iconoColor: "text-orange-700" },
        { titulo: "Solicitudes de Pago", descripcion: "Crear solicitudes de pago y dar seguimiento al flujo de aprobación.", href: "/solicitudes-pago", icono: ClipboardCheck, fondo: "from-sky-600 to-sky-800", iconoColor: "text-sky-700" },
        { titulo: "Banco / Fondos", descripcion: "Administrar cuentas bancarias, fondos ordinarios y extraordinarios.", href: "/banco", icono: Landmark, fondo: "from-indigo-600 to-indigo-900", iconoColor: "text-indigo-700" },
      ],
    },
    {
      titulo: "Control y seguimiento",
      descripcion: "Herramientas para verificar balances, estados de cuenta y aprobaciones.",
      modulos: [
        { titulo: "Cuadre de Pagos", descripcion: "Revisar pagos de propietarios y validar diferencias pendientes.", href: "/finanzas/pagos/cuadre-propietario", icono: AlertTriangle, fondo: "from-red-600 to-red-800", iconoColor: "text-red-700" },
        { titulo: "Saldos a Favor", descripcion: "Consulta y aplicación de créditos por pagos adelantados o excedentes.", href: "/creditos-propietarios", icono: ReceiptText, fondo: "from-purple-600 to-purple-800", iconoColor: "text-purple-700" },
        { titulo: "Estado de Cuenta", descripcion: "Consultar cargos, pagos, balances y créditos por apartamento.", href: "/consulta-estado", icono: ReceiptText, fondo: "from-slate-700 to-slate-950", iconoColor: "text-slate-700" },
        { titulo: "Reporte Financiero", descripcion: "Consultar ingresos, gastos, balances y estados financieros.", href: "/reportes", icono: BarChart3, fondo: "from-green-600 to-green-800", iconoColor: "text-green-700" },
      ],
    },
    {
      titulo: "Caja Chica",
      descripcion: "Control de movimientos menores, fondos disponibles, balances y reportes.",
      modulos: [
        { titulo: "Movimientos", descripcion: "Registrar ingresos, salidas y comprobantes de caja chica.", href: "/finanzas/caja-chica", icono: Coins, fondo: "from-teal-600 to-teal-800", iconoColor: "text-teal-700" },
        { titulo: "Fondos", descripcion: "Administrar fondos disponibles y responsables de caja chica.", href: "/caja-chica/fondos", icono: WalletCards, fondo: "from-blue-600 to-cyan-800", iconoColor: "text-blue-700" },
        { titulo: "Balance", descripcion: "Consultar balances disponibles por fondo de caja chica.", href: "/caja-chica/balance", icono: BarChart3, fondo: "from-purple-600 to-indigo-800", iconoColor: "text-purple-700" },
        { titulo: "Reportes Caja Chica", descripcion: "Generar reportes de movimientos, fondos y balances.", href: "/caja-chica/reporte", icono: FileSpreadsheet, fondo: "from-slate-700 to-slate-950", iconoColor: "text-slate-700" },
      ],
    },
    {
      titulo: "Configuraciones",
      descripcion: "Parámetros y configuraciones financieras del condominio.",
      modulos: [
        { titulo: "Gestión de Cargos", descripcion: "Crear cargos individuales, cargos masivos y mantenimiento mensual.", href: "/cargos-individuales", icono: FileSpreadsheet, fondo: "from-blue-600 to-blue-800", iconoColor: "text-blue-700" },
        { titulo: "Configuración Financiera", descripcion: "Definir cuentas, reglas y parámetros financieros.", href: "/configuracion-financiera", icono: Settings, fondo: "from-slate-700 to-slate-950", iconoColor: "text-slate-700" },
        { titulo: "Presupuesto", descripcion: "Planificar ingresos y gastos proyectados del condominio.", href: "/finanzas/configuraciones/presupuesto", icono: Banknote, fondo: "from-amber-500 to-yellow-700", iconoColor: "text-amber-700" },
      ],
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard Financiero"
        subtitle="Centro de control para pagos, gastos, solicitudes, bancos, caja chica, fondos y reportes."
        badge="Centro Financiero"
        icon={WalletCards}
        action={
          <Link
            href="/pagos-mantenimiento"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <CreditCard className="h-4 w-4" />
            Registrar pago
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Pagos" value="Mantenimiento" subtitle="Registro y aplicación" icon={WalletCards} tone="green" />
        <StatCard title="Gastos" value="Control" subtitle="Operaciones y facturas" icon={ReceiptText} tone="amber" />
        <StatCard title="Solicitudes" value="Aprobación" subtitle="Tesorero y presidente" icon={ClipboardCheck} tone="blue" />
        <StatCard title="Bancos" value="Fondos" subtitle="Balances y cuentas" icon={Building2} tone="slate" />
      </div>

      {secciones.map((seccion) => (
        <SectionCard key={seccion.titulo} title={seccion.titulo} subtitle={seccion.descripcion}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {seccion.modulos.map((modulo) => {
              const Icono = modulo.icono;
              return (
                <Link key={modulo.href} href={modulo.href} className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className={`relative flex h-16 items-center justify-center bg-gradient-to-br ${modulo.fondo}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_white,_transparent_35%)] opacity-20" />
                    <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 shadow-md transition group-hover:scale-105">
                      <Icono className={`h-6 w-6 ${modulo.iconoColor}`} />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700">{modulo.titulo}</h3>
                    <p className="mt-2 min-h-[48px] text-xs leading-relaxed text-slate-500">{modulo.descripcion}</p>
                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-emerald-700">
                      <span>Abrir módulo</span>
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      ))}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white shadow-sm">
        <h2 className="text-lg font-bold">Flujo recomendado</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl bg-slate-800 p-4"><p className="font-bold text-emerald-300">1. Configuraciones</p><p className="mt-1 text-xs text-slate-300">Definir cargos, fondos, morosidad y parámetros financieros.</p></div>
          <div className="rounded-xl bg-slate-800 p-4"><p className="font-bold text-emerald-300">2. Pagos</p><p className="mt-1 text-xs text-slate-300">Registrar pagos, gastos y solicitudes del condominio.</p></div>
          <div className="rounded-xl bg-slate-800 p-4"><p className="font-bold text-emerald-300">3. Caja Chica</p><p className="mt-1 text-xs text-slate-300">Controlar movimientos menores, fondos y balances.</p></div>
          <div className="rounded-xl bg-slate-800 p-4"><p className="font-bold text-emerald-300">4. Reportes</p><p className="mt-1 text-xs text-slate-300">Analizar la situación financiera del condominio.</p></div>
        </div>
      </section>
    </PageContainer>
  );
}
