"use client";

import Link from "next/link";
import {
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  ReceiptText,
  RefreshCw,
} from "lucide-react";

import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";

type Props = {
  onRefresh: () => void;
};

export default function PagoToolbar({ onRefresh }: Props) {
  return (
    <>
      <ModuleMenu
        title="Pagos"
        subtitle="Gestión de pagos, importaciones, cuadre y estados de cuenta."
        tone="green"
        items={[
          {
            href: "/finanzas",
            label: "Resumen",
            icon: BarChart3,
          },
          {
            href: "/pagos-mantenimiento",
            label: "Registrar Pago",
            icon: CreditCard,
          },
          {
            href: "/finanzas/pagos",
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
            icon: ReceiptText,
          },
        ]}
      />

      <ModuleToolbar
        title="Pagos de Mantenimiento"
        subtitle="Registro manual de pagos, aplicación automática a cargos y actualización de bancos."
        icon={CreditCard}
        actions={
          <ModuleActions
            onRefresh={onRefresh}
            extra={
              <Link
                href="/finanzas/pagos"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
              >
                <Landmark className="h-4 w-4" />
                Importar banco
              </Link>
            }
          />
        }
      />
    </>
  );
}