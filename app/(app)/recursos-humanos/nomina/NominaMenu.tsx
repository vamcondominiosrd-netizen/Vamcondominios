"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet,
  Settings,
  ListChecks,
  ReceiptText,
  BarChart3,
} from "lucide-react";

const items = [
  {
    label: "Procesar Nómina",
    href: "/recursos-humanos/nomina",
    icon: Wallet,
    disabled: false,
  },
  {
    label: "Configuración",
    href: "/recursos-humanos/nomina/configuracion",
    icon: Settings,
    disabled: false,
  },
  {
    label: "Catálogo Descuentos",
    href: "/recursos-humanos/nomina/descuentos",
    icon: ListChecks,
    disabled: false,
  },
  {
    label: "Recibos",
    href: "/recursos-humanos/nomina/recibos",
    icon: ReceiptText,
    disabled: false,
  },
  {
    label: "Reportes",
    href: "/recursos-humanos/nomina/reportes",
    icon: BarChart3,
    disabled: false,
  },
];

export default function NominaMenu() {
  const pathname = usePathname();

  return (
    <div className="bg-white border shadow-sm rounded-3xl p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Gestión de Nómina
          </h2>

          <p className="text-sm text-slate-500">
            Procesamiento, configuración, descuentos, recibos y reportes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {items.map((item) => {
          const Icon = item.icon;

          const activo =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="border border-dashed border-slate-300 rounded-2xl px-4 py-3 bg-slate-50 text-slate-400 cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} />

                  <div>
                    <p className="font-black text-sm">{item.label}</p>
                    <p className="text-xs">Próximamente</p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`border rounded-2xl px-4 py-3 transition ${
                activo
                  ? "bg-blue-700 border-blue-700 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} />

                <div>
                  <p className="font-black text-sm">{item.label}</p>
                  <p
                    className={`text-xs ${
                      activo ? "text-blue-100" : "text-slate-500"
                    }`}
                  >
                    {activo ? "Pantalla actual" : "Abrir módulo"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}