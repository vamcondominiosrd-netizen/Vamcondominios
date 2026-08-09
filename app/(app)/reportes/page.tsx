"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BarChart3,
  ClipboardCheck,
  Coins,
  CreditCard,
  Download,
  FileSpreadsheet,
  Landmark,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type ModuloReporte = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  color: string;
  bg: string;
};

type SeccionReporte = {
  titulo: string;
  descripcion: string;
  modulos: ModuloReporte[];
};

export default function ReportesPage() {
  const secciones: SeccionReporte[] = [
    {
      titulo: "Reportes financieros",
      descripcion:
        "Reportes principales para revisar la situación económica del condominio.",
      modulos: [
        {
          titulo: "Desglose de Pagos Mensual",
          descripcion:
            "Desglose de pago Mensual por cheques.",
          href: "/reportes/gastos-mensuales-cheques",
          icono: BarChart3,
          color: "text-blue-700",
          bg: "bg-blue-50",
        },
        {
          titulo: "Estado Financiero Propietarios",
          descripcion:
            "Consultar balances, ingresos, egresos y situación financiera.",
          href: "/reportes/estado-financiero/reporte-propietarios",
          icono: FileSpreadsheet,
          color: "text-emerald-700",
          bg: "bg-emerald-50",
        },
        {
          titulo: "Ingresos vs Gastos",
          descripcion:
            "Analizar ingresos y gastos por mes, período o categoría.",
          href: "/reportes/ingresos-gastos",
          icono: TrendingUp,
          color: "text-purple-700",
          bg: "bg-purple-50",
        },
            {
          titulo: "Estado de Cuentas Detallado",
          descripcion:
            "Estado de Cuentas por mes.",
          href: "/reportes/control-bancario",
          icono: TrendingUp,
          color: "text-purple-700",
          bg: "bg-purple-50",
        },
      ],
    },
    {
      titulo: "Cobros y propietarios",
      descripcion:
        "Control de cuentas por cobrar, morosidad y pagos por propietarios.",
      modulos: [
        {
          titulo: "Cuentas por Cobrar",
          descripcion:
            "Revisar balances pendientes por apartamento, período y propietario.",
          href: "/reportes/cuentas-por-cobrar",
          icono: WalletCards,
          color: "text-amber-700",
          bg: "bg-amber-50",
        },
        {
          titulo: "Morosidad",
          descripcion:
            "Reporte de propietarios con pagos pendientes o vencidos.",
          href: "/finanzas/morosidad",
          icono: AlertTriangle,
          color: "text-red-700",
          bg: "bg-red-50",
        },
        {
          titulo: "Pagos por Propietarios",
          descripcion:
            "Consultar pagos registrados por unidad, propietario, fecha y concepto.",
          href: "/reportes/pagos-propietarios",
          icono: WalletCards,
          color: "text-sky-700",
          bg: "bg-sky-50",
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
      ],
    },
    {
      titulo: "Gastos y presupuesto",
      descripcion:
        "Reportes para analizar gastos, categorías y presupuesto anual.",
      modulos: [
        {
          titulo: "Gastos por Categoría Mensual",
          descripcion:
            "Analizar gastos por proveedor, categoría, período y fondo.",
          href: "/reportes/gastos-mensuales",
          icono: ReceiptText,
          color: "text-pink-700",
          bg: "bg-pink-50",
        },
        {
          titulo: "Presupuesto Anual",
          descripcion:
            "Comparar presupuesto anual contra ingresos y gastos reales.",
          href: "/finanzas/configuraciones/presupuesto",
          icono: Banknote,
          color: "text-indigo-700",
          bg: "bg-indigo-50",
        },
        {
          titulo: "Comparativo Presupuesto",
          descripcion:
            "Comparar presupuesto proyectado contra ejecución real.",
          href: "/finanzas/configuraciones/presupuesto/comparativo",
          icono: BarChart3,
          color: "text-blue-700",
          bg: "bg-blue-50",
        },
        {
          titulo: "Reporte Asamblea",
          descripcion:
            "Generar reporte del presupuesto anual para presentación en asamblea.",
          href: "/finanzas/configuraciones/presupuesto/asamblea",
          icono: FileSpreadsheet,
          color: "text-orange-700",
          bg: "bg-orange-50",
        },
      ],
    },
    {
      titulo: "Exportaciones",
      descripcion:
        "Generación de archivos y reportes para revisión externa o asamblea.",
      modulos: [
        {
          titulo: "Exportar a Excel",
          descripcion:
            "Generar archivos Excel con reportes financieros y operativos.",
          href: "/reportes/exportar",
          icono: Download,
          color: "text-slate-700",
          bg: "bg-slate-100",
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
        ]}
      />

      <ModuleToolbar
        title="Reportes"
        subtitle="Centro de reportes financieros, cuentas por cobrar, morosidad, gastos, presupuesto y exportaciones."
        icon={BarChart3}
        actions={
          <Link
            href="/reportes/exportar"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
          >
            <Download className="h-4 w-4" />
            Exportar
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
                 key={`${seccion.titulo}-${modulo.titulo}-${modulo.href}`}
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
                      <h3 className="text-base font-black text-slate-900 group-hover:text-blue-700">
                        {modulo.titulo}
                      </h3>

                      <p className="mt-1 min-h-[52px] text-sm leading-relaxed text-slate-500">
                        {modulo.descripcion}
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-sm font-black text-blue-700">
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
        title="Flujo recomendado de reportes"
        subtitle="Orden sugerido para revisar la situación financiera del condominio."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FlujoPaso
            numero="1"
            titulo="Estado financiero"
            descripcion="Revisar ingresos, gastos y balance general."
          />

          <FlujoPaso
            numero="2"
            titulo="Cuentas por cobrar"
            descripcion="Consultar balances pendientes y morosidad."
          />

          <FlujoPaso
            numero="3"
            titulo="Gastos"
            descripcion="Analizar gastos por categoría, proveedor y período."
          />

          <FlujoPaso
            numero="4"
            titulo="Exportar"
            descripcion="Generar reportes en Excel para revisión externa."
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
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white">
        {numero}
      </div>

      <p className="font-black text-slate-900">{titulo}</p>

      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {descripcion}
      </p>
    </div>
  );
}