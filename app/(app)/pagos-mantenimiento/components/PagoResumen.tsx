"use client";

import {
  DollarSign,
  Receipt,
  TrendingUp,
  WalletCards,
} from "lucide-react";

type Props = {
  totalPagado: number;
  cantidadPagos: number;
  promedioPago: number;
  ultimoPago?: string;
};

function dinero(valor: number) {
  return valor.toLocaleString("es-DO", {
    minimumFractionDigits: 2,
  });
}

export default function PagoResumen({
  totalPagado,
  cantidadPagos,
  promedioPago,
  ultimoPago,
}: Props) {
  const cards = [
    {
      titulo: "Total Recaudado",
      valor: `RD$ ${dinero(totalPagado)}`,
      icon: DollarSign,
      color: "emerald",
    },
    {
      titulo: "Pagos Registrados",
      valor: cantidadPagos.toString(),
      icon: Receipt,
      color: "blue",
    },
    {
      titulo: "Promedio",
      valor: `RD$ ${dinero(promedioPago)}`,
      icon: TrendingUp,
      color: "amber",
    },
    {
      titulo: "Último Pago",
      valor: ultimoPago || "-",
      icon: WalletCards,
      color: "purple",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.titulo}
            className="rounded-2xl border bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {card.titulo}
                </p>

                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {card.valor}
                </h3>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl
                ${
                  card.color === "emerald"
                    ? "bg-emerald-100"
                    : card.color === "blue"
                    ? "bg-blue-100"
                    : card.color === "amber"
                    ? "bg-amber-100"
                    : "bg-purple-100"
                }`}
              >
                <Icon
                  className={`h-6 w-6
                  ${
                    card.color === "emerald"
                      ? "text-emerald-700"
                      : card.color === "blue"
                      ? "text-blue-700"
                      : card.color === "amber"
                      ? "text-amber-700"
                      : "text-purple-700"
                  }`}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}