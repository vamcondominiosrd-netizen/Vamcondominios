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
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type ModuloFinanzas = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  color: string;
  bg: string;
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
        {
          titulo: "Pagos de Mantenimiento",
          descripcion:
            "Registrar pagos y aplicarlos automáticamente a cargos pendientes.",
          href: "/pagos-mantenimiento",
          icono: WalletCards,
          color: "text-emerald-700",
          bg: "bg-emerald-50",
        },
        {
          titulo: "Gastos",
          descripcion:
            "Registrar y controlar gastos operativos del condominio activo.",
          href: "/gastos",
          icono: ReceiptText,
          color: "text-orange-700",
          bg: "bg-orange-50",
        },
        {
          titulo: "Solicitudes de Pago",
          descripcion:
            "Crear solicitudes de pago y dar seguimiento al flujo de aprobación.",
          href: "/solicitudes-pago",
          icono: ClipboardCheck,
          color: "text-sky-700",
          bg: "bg-sky-50",
        },
        {
          titulo: "Banco / Fondos",
          descripcion:
            "Administrar cuentas bancarias, fondos ordinarios y extraordinarios.",
          href: "/banco",
          icono: Landmark,
          color: "text-indigo-700",
          bg: "bg-indigo-50",
        },
        {
          titulo: "Control Bancario",
          descripcion:
            "Generar Estados Financieros.",
          href: "/finanzas/control-bancario",
          icono: Banknote,
          color: "text-amber-700",
          bg: "bg-amber-50",
        },
      ],
    },
    {
      titulo: "Control y seguimiento",
      descripcion:
        "Herramientas para verificar balances, estados de cuenta y aprobaciones.",
      modulos: [
        {
          titulo: "Cuadre de Pagos",
          descripcion:
            "Revisar pagos de propietarios y validar diferencias pendientes.",
          href: "/finanzas/pagos/cuadre-propietario",
          icono: AlertTriangle,
          color: "text-red-700",
          bg: "bg-red-50",
        },
        {
          titulo: "Saldos a Favor",
          descripcion:
            "Consulta y aplicación de créditos por pagos adelantados o excedentes.",
          href: "/creditos-propietarios",
          icono: WalletCards,
          color: "text-purple-700",
          bg: "bg-purple-50",
        },
        {
          titulo: "Estado de Cuenta",
          descripcion:
            "Consultar cargos, pagos, balances y créditos por apartamento.",
          href: "/consulta-estado",
          icono: ReceiptText,
          color: "text-slate-700",
          bg: "bg-slate-100",
        },
        {
          titulo: "Reporte Financiero",
          descripcion:
            "Consultar ingresos, gastos, balances y estados financieros.",
          href: "/reportes",
          icono: BarChart3,
          color: "text-green-700",
          bg: "bg-green-50",
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
          href: "/finanzas/caja-chica",
          icono: Coins,
          color: "text-teal-700",
          bg: "bg-teal-50",
        },
        {
          titulo: "Fondos",
          descripcion:
            "Administrar fondos disponibles y responsables de caja chica.",
          href: "/caja-chica/fondos",
          icono: WalletCards,
          color: "text-blue-700",
          bg: "bg-blue-50",
        },
        {
          titulo: "Balance",
          descripcion: "Consultar balances disponibles por fondo de caja chica.",
          href: "/caja-chica/balance",
          icono: BarChart3,
          color: "text-purple-700",
          bg: "bg-purple-50",
        },
        {
          titulo: "Reportes Caja Chica",
          descripcion:
            "Generar reportes de movimientos, fondos y balances.",
          href: "/caja-chica/reporte",
          icono: FileSpreadsheet,
          color: "text-slate-700",
          bg: "bg-slate-100",
        },
      ],
    },
    {
      titulo: "Configuraciones",
      descripcion: "Parámetros y configuraciones financieras del condominio.",
      modulos: [
        {
          titulo: "Gestión de Cargos",
          descripcion:
            "Crear cargos individuales, cargos masivos y mantenimiento mensual.",
          href: "/cargos-individuales",
          icono: FileSpreadsheet,
          color: "text-blue-700",
          bg: "bg-blue-50",
        },
        {
          titulo: "Configuración Financiera",
          descripcion: "Definir cuentas, reglas y parámetros financieros.",
          href: "/configuracion-financiera",
          icono: Settings,
          color: "text-slate-700",
          bg: "bg-slate-100",
        },
        {
          titulo: "Presupuesto",
          descripcion:
            "Planificar ingresos, gastos proyectados, cuota sugerida y reporte de asamblea.",
          href: "/finanzas/configuraciones/presupuesto",
          icono: Banknote,
          color: "text-amber-700",
          bg: "bg-amber-50",
        },
        {
          titulo: "Control Bancario",
          descripcion:
            "Generar Estados Financieros.",
          href: "/finanzas/control-bancario",
          icono: Banknote,
          color: "text-amber-700",
          bg: "bg-amber-50",
        },
      ],
    },
  ];

  return (
    <PageContainer>
      <ModuleMenu
        title="Finanzas"
        subtitle="Control financiero del condominio: pagos, gastos, solicitudes, caja chica, bancos, reportes y configuraciones."
        tone="blue"
        items={[
          {
            href: "/finanzas",
            label: "Inicio finanzas",
            icon: WalletCards,
          },
          {
            href: "/pagos-mantenimiento",
            label: "Pagos",
            icon: CreditCard,
          },
          {
            href: "/gastos",
            label: "Gastos",
            icon: ReceiptText,
          },
          {
            href: "/solicitudes-pago",
            label: "Solicitudes",
            icon: ClipboardCheck,
          },
          {
            href: "/banco",
            label: "Banco / Fondos",
            icon: Landmark,
          },
          {
            href: "/finanzas/caja-chica",
            label: "Caja chica",
            icon: Coins,
          },
          {
            href: "/reportes",
            label: "Reportes",
            icon: BarChart3,
          },
          {
            href: "/finanzas/configuraciones/presupuesto",
            label: "Presupuesto",
            icon: Banknote,
          },
        {
          href: "/finanzas/control-bancario",
          label: "Control Bancario",
          icon: Landmark,
         },
        ]}
      />

      <ModuleToolbar
        title="Dashboard Financiero"
        subtitle="Centro de control para pagos, gastos, solicitudes, bancos, caja chica, fondos y reportes."
        icon={WalletCards}
        actions={
          <Link
            href="/pagos-mantenimiento"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <CreditCard className="h-4 w-4" />
            Registrar pago
          </Link>
        }
      />

      {secciones.map((seccion) => (
        <SectionCard
          key={seccion.titulo}
          title={seccion.titulo}
          subtitle={seccion.descripcion}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {seccion.modulos.map((modulo) => {
              const Icono = modulo.icono;

              return (
                <Link
                  key={modulo.href}
                  href={modulo.href}
                  className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${modulo.bg}`}
                    >
                      <Icono className={`h-6 w-6 ${modulo.color}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700">
                        {modulo.titulo}
                      </h3>

                      <p className="mt-1 min-h-[52px] text-sm leading-relaxed text-slate-500">
                        {modulo.descripcion}
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-sm font-black text-emerald-700">
                        <span>Abrir módulo</span>
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      ))}

      <SectionCard
        title="Flujo recomendado"
        subtitle="Orden sugerido para mantener el control financiero del condominio."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FlujoPaso
            numero="1"
            titulo="Configuraciones"
            descripcion="Definir cargos, fondos, morosidad, cuentas y presupuesto."
          />

          <FlujoPaso
            numero="2"
            titulo="Operaciones"
            descripcion="Registrar pagos, gastos y solicitudes del condominio."
          />

          <FlujoPaso
            numero="3"
            titulo="Caja chica"
            descripcion="Controlar movimientos menores, fondos y balances."
          />

          <FlujoPaso
            numero="4"
            titulo="Reportes"
            descripcion="Analizar ingresos, gastos, presupuesto y estado financiero."
          />
        </div>
      </SectionCard>
    </PageContainer>
  );
}

function FlujoPaso({
  numero,
  titulo,
  descripcion,
}: {
  numero: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-sm font-black text-white">
        {numero}
      </div>

      <p className="font-black text-slate-900">{titulo}</p>

      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {descripcion}
      </p>
    </div>
  );
}