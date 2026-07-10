"use client";

import Link from "next/link";
import { CreditCard, Landmark, WalletCards } from "lucide-react";

import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";

export default function PagosToolbar() {
  return (
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
  );
}