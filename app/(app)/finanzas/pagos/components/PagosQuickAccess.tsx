"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
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

import SectionCard from "@/components/vam/enterprise/SectionCard";

type Acceso = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: LucideIcon;
};

const pagos: Acceso[] = [
  {
    titulo: "Registrar Pago",
    descripcion: "Registrar pagos manuales de mantenimiento y aplicar cargos.",
    href: "/pagos-mantenimiento",
    icono: CreditCard,
  },
  {
    titulo: "Importar Banco",
    descripcion: "Subir archivo bancario para identificar pagos automáticamente.",
    href: "/finanzas/pagos/importar",
    icono: Landmark,
  },
  {
    titulo: "Pagos Identificados",
    descripcion: "Revisar pagos identificados desde importaciones bancarias.",
    href: "/pagos-identificados",
    icono: ReceiptText,
  },
  {
    titulo: "Cuadre Propietario",
    descripcion: "Validar diferencias, pagos y balances por propietario.",
    href: "/finanzas/pagos/cuadre-propietario",
    icono: FileSpreadsheet,
  },
  {
    titulo: "Estado de Cuenta",
    descripcion: "Consultar cargos, pagos, balances y créditos por apartamento.",
    href: "/consulta-estado",
    icono: ReceiptText,
  },
  {
    titulo: "Créditos",
    descripcion: "Administrar saldos a favor y pagos excedentes.",
    href: "/creditos-propietarios",
    icono: WalletCards,
  },
];

const solicitudes: Acceso[] = [
  {
    titulo: "Solicitudes de Pago",
    descripcion: "Crear y consultar solicitudes pendientes de aprobación.",
    href: "/solicitudes-pago",
    icono: ClipboardCheck,
  },
  {
    titulo: "Aprobación Tesorero",
    descripcion: "Revisar, aprobar, devolver o rechazar solicitudes.",
    href: "/solicitudes-pago/tesorero",
    icono: ClipboardCheck,
  },
  {
    titulo: "Aprobación Presidente",
    descripcion: "Autorizar solicitudes aprobadas por tesorería.",
    href: "/solicitudes-pago/presidente",
    icono: ClipboardCheck,
  },
  {
    titulo: "Resumen Solicitudes",
    descripcion: "Ver resumen gerencial del flujo de solicitudes de pago.",
    href: "/solicitudes-pago/resumen",
    icono: BarChart3,
  },
];

const otros: Acceso[] = [
  {
    titulo: "Gastos",
    descripcion: "Registrar y controlar gastos operativos del condominio.",
    href: "/gastos",
    icono: ReceiptText,
  },
  {
    titulo: "Gas",
    descripcion: "Recepción, precios, tanques y facturas de gas.",
    href: "/gas",
    icono: FlameKindling,
  },
];

export default function PagosQuickAccess() {
  return (
    <>
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
    </>
  );
}

function QuickAccessGrid({ items }: { items: Acceso[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icono || WalletCards;

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
