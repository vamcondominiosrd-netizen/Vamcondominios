"use client";

import {
  CreditCard,
  FileSpreadsheet,
  Landmark,
  WalletCards,
} from "lucide-react";

import StatCard from "@/components/vam/enterprise/StatCard";

export default function PagosKPI() {
  return (
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
  );
}
