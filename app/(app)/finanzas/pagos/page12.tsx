"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  CreditCard,
  FileSpreadsheet,
  FlameKindling,
  Landmark,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import StatCard from "@/components/vam/enterprise/StatCard";

type Acceso = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  grupo: "Pagos" | "Solicitudes" | "Otros";
};

export default function FinanzasPagosPage() {
  const accesos: Acceso[] = [
    {
      titulo: "Registrar Pago",
      descripcion: "Registrar pagos manuales de mantenimiento y aplicar cargos.",
      href: "/pagos-mantenimiento",
      icono: CreditCard,
      grupo: "Pagos",
    },
    {
      titulo: "Importar Banco",
      descripcion: "Subir archivo bancario para identificar pagos automáticamente.",
      href: "/finanzas/pagos/importar",
      icono: Landmark,
      grupo: "Pagos",
    },
    {
      titulo: "Pagos Identificados",
      descripcion: "Revisar pagos identificados desde importaciones bancarias.",
      href: "/pagos-identificados",
      icono: ReceiptText,
      grupo: "Pagos",
    },
    {
      titulo: "Cuadre Propietario",
      descripcion: "Validar diferencias, pagos y balances por propietario.",
      href: "/finanzas/pagos/cuadre-propietario",
      icono: FileSpreadsheet,
      grupo: "Pagos",
    },
    {
      titulo: "Estado de Cuenta",
      descripcion: "Consultar cargos, pagos, balances y créditos por apartamento.",
      href: "/consulta-estado",
      icono: ReceiptText,
      grupo: "Pagos",
    },
    {
      titulo: "Créditos",
      descripcion: "Administrar saldos a favor y pagos excedentes.",
      href: "/creditos-propietarios",
      icono: WalletCards,
      grupo: "Pagos",
    },
    {
      titulo: "Solicitudes de Pago",
      descripcion: "Crear y consultar solicitudes pendientes de aprobación.",
      href: "/solicitudes-pago",
      icono: ClipboardCheck,
      grupo: "Solicitudes",
    },
    {
      titulo: "Aprobación Tesorero",
      descripcion: "Revisar, aprobar, devolver o rechazar solicitudes.",
      href: "/solicitudes-pago/tesorero",
      icono: ClipboardCheck,
      grupo: "Solicitudes",
    },
    {
      titulo: "Aprobación Presidente",
      descripcion: "Autorizar solicitudes aprobadas por tesorería.",
      href: "/solicitudes-pago/presidente",
      icono: ClipboardCheck,
      grupo: "Solicitudes",
    },
    {
      titulo: "Resumen Solicitudes",
      descripcion: "Ver resumen gerencial del flujo de solicitudes de pago.",
      href: "/solicitudes-pago/resumen",
      icono: BarChart3,
      grupo: "Solicitudes",
    },
    {
      titulo: "Gastos",
      descripcion: "Registrar y controlar gastos operativos del condominio.",
      href: "/gastos",
      icono: ReceiptText,
      grupo: "Otros",
    },
    {
      titulo: "Gas",
      descripcion: "Recepción, precios, tanques y facturas de gas.",
      href: "/gas",
      icono: FlameKindling,
      grupo: "Otros",
    },
  ];

  const pagos = accesos.filter((a) => a.grupo === "Pagos");
  const solicitudes = accesos.filter((a) => a.grupo === "Solicitudes");
  const otros = accesos.filter((a) => a.grupo === "Otros");

  return (
    <PageContainer>
      <ModuleMenu
        title="Pagos"
        subtitle="Gestión de pagos, importaciones, cuadre y estados de cuenta."
        tone="green"
        items={[
          {
            href: "/finanzas/pagos",
            label: "Centro de Pagos",
            icon: BarChart3,
          },
          {
            href: "/pagos-mantenimiento",
            label: "Registrar Pago",
            icon: CreditCard,
          },
          {
            href: "/finanzas/pagos/importar",
            label: "Importar Banco",
            icon: Landmark,
          },
          {
            href: "/pagos-identificados",
            label: "Identificados",
            icon: ReceiptText,
          },
          {
            href: "/finanzas/pagos/cuadre-propietario",
            label: "Cuadre",
            icon: FileSpreadsheet,
          },
          {
            href: "/consulta-estado",
            label: "Estado Cuenta",
            icon: ReceiptText,
          },
          {
            href: "/creditos-propietarios",
            label: "Créditos",
            icon: WalletCards,
          },
        ]}
      />

      <ModuleToolbar
        title="Centro de Pagos"
        subtitle="Administre pagos de mantenimiento, importaciones bancarias, créditos, cuadre y estados de cuenta."
        icon={WalletCards}
        actions={
          <ModuleActions
            extra={
              <>
                <Link
                  href="/pagos-mantenimiento"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  <CreditCard className="h-4 w-4" />
                  Nuevo pago
                </Link>

                <Link
                  href="/finanzas/pagos/importar"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Landmark className="h-4 w-4" />
                  Importar banco
                </Link>
              </>
            }
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Registrar"
          value="Pago"
          subtitle="Mantenimiento"
          icon={CreditCard}
          tone="green"
        />

        <StatCard
          title="Importar"
          value="Banco"
          subtitle="Excel bancario"
          icon={Landmark}
          tone="blue"
        />

        <StatCard
          title="Cuadre"
          value="Propietario"
          subtitle="Validación"
          icon={FileSpreadsheet}
          tone="amber"
        />

        <StatCard
          title="Créditos"
          value="Saldos"
          subtitle="A favor"
          icon={WalletCards}
          tone="slate"
        />
      </div>

      <SectionCard
        title="Pagos"
        subtitle="Procesos principales para registrar, importar, identificar y cuadrar pagos."
      >
        <QuickAccessGrid items={pagos} />
      </SectionCard>

      <SectionCard
        title="Solicitudes de Pago"
        subtitle="Opciones relacionadas con creación, aprobación y resumen de solicitudes."
      >
        <QuickAccessGrid items={solicitudes} />
      </SectionCard>

      <SectionCard
        title="Otros procesos financieros"
        subtitle="Procesos relacionados que forman parte del flujo financiero."
      >
        <QuickAccessGrid items={otros} />
      </SectionCard>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5" />
          <div>
            <h3 className="font-black">Flujo recomendado</h3>
            <p className="mt-1 text-sm">
              Para pagos bancarios, primero importe el archivo del banco, luego
              revise pagos identificados, realice el cuadre y finalmente valide
              el estado de cuenta o créditos generados.
            </p>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}

function QuickAccessGrid({ items }: { items: Acceso[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900 group-hover:text-emerald-700">
                  {item.titulo}
                </h3>

                <p className="mt-1 min-h-[40px] text-xs leading-relaxed text-slate-500">
                  {item.descripcion}
                </p>

                <p className="mt-3 text-xs font-bold text-emerald-700">
                  Abrir módulo →
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
