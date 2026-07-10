"use client";

import Link from "next/link";
import {
  WalletCards,
  ReceiptText,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";

type Modulo = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  fondo: string;
  iconoColor: string;
};

export default function FinanzasPagosPage() {
  const modulos: Modulo[] = [
    {
      titulo: "Pagos de Mantenimiento",
      descripcion:
        "Registrar pagos y aplicarlos automáticamente a cargos pendientes.",
      href: "/pagos-mantenimiento",
      icono: WalletCards,
      fondo: "from-emerald-600 to-emerald-800",
      iconoColor: "text-emerald-700",
    },
    {
      titulo: "Gastos",
      descripcion:
        "Registrar y controlar gastos operativos del condominio activo.",
      href: "/gastos",
      icono: ReceiptText,
      fondo: "from-orange-500 to-orange-700",
      iconoColor: "text-orange-700",
    },
    {
      titulo: "Solicitudes de Pago",
      descripcion:
        "Crear solicitudes de pago y dar seguimiento al flujo de aprobación.",
      href: "/solicitudes-pago",
      icono: ClipboardCheck,
      fondo: "from-sky-600 to-sky-800",
      iconoColor: "text-sky-700",
    },
    {
      titulo: "Estado de Cuenta",
      descripcion:
        "Consultar cargos, pagos, balances y créditos por apartamento.",
      href: "/consulta-estado",
      icono: ReceiptText,
      fondo: "from-purple-600 to-purple-800",
      iconoColor: "text-purple-700",
    },
    {
      titulo: "Aprobación Tesorero",
      descripcion:
        "Revisar, aprobar, devolver o rechazar solicitudes pendientes.",
      href: "/solicitudes-pago/tesorero",
      icono: ClipboardCheck,
      fondo: "from-amber-500 to-yellow-700",
      iconoColor: "text-amber-700",
    },
    {
      titulo: "Aprobación Presidente",
      descripcion: "Autorizar solicitudes ya aprobadas por tesorería.",
      href: "/solicitudes-pago/presidente",
      icono: ClipboardCheck,
      fondo: "from-pink-600 to-rose-800",
      iconoColor: "text-pink-700",
    },
   {
      titulo: "Resumen Solicitudes de Pago",
      descripcion:
        "Crear solicitudes de pago y dar seguimiento al flujo de aprobación.",
      href: "/solicitudes-pago/resumen",
      icono: ClipboardCheck,
      fondo: "from-sky-600 to-sky-800",
      iconoColor: "text-sky-700",
    },
   {
      titulo: "Modulo del Recibo del Gas",
      descripcion:"Recepción, precios, tanques y facturas de gas.",
      href: "/gas",
      icono: ClipboardCheck,
      fondo: "from-sky-600 to-sky-800",
      iconoColor: "text-sky-700",
    },
  ];

  return (
    <main className="space-y-5">
      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Finanzas
            </p>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
              Pagos
            </h1>

            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              Registre pagos de mantenimiento, gastos, solicitudes de pago,
              aprobaciones y estados de cuenta.
            </p>
          </div>

          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-slate-900 flex items-center justify-center shadow-lg">
            <WalletCards className="h-9 w-9 text-white" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Opciones de Pagos
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Seleccione una opción para continuar trabajando.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;

            return (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="group rounded-2xl border bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden"
              >
                <div
                  className={`h-20 bg-gradient-to-br ${modulo.fondo} flex items-center justify-center relative`}
                >
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_white,_transparent_35%)]" />

                  <div className="h-14 w-14 rounded-2xl bg-white/95 flex items-center justify-center shadow-md relative z-10 group-hover:scale-105 transition">
                    <Icono className={`h-8 w-8 ${modulo.iconoColor}`} />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-black text-slate-900 text-base group-hover:text-emerald-700">
                    {modulo.titulo}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 min-h-[54px] leading-relaxed">
                    {modulo.descripcion}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-emerald-700">
                    <span>Abrir módulo</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}