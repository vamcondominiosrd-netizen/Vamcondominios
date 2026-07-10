"use client";

import {
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";

export default function PagosMenu() {
  return (
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
  );
}
