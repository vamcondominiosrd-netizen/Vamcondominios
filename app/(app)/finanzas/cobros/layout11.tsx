"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CircleDollarSign,
  FileText,
  History,
  ListChecks,
  ShieldOff,
  Users,
} from "lucide-react";

type MenuCobrosItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const menuCobros: MenuCobrosItem[] = [
  {
    href: "/finanzas/cobros",
    label: "Resumen",
    icon: CircleDollarSign,
  },
  {
    href: "/finanzas/cobros/cuentas",
    label: "Cuentas por cobrar",
    icon: Users,
  },
  {
    href: "/finanzas/cobros/agentes",
    label: "Agentes",
    icon: Bot,
  },
  {
    href: "/finanzas/cobros/plantillas",
    label: "Plantillas",
    icon: FileText,
  },
  {
    href: "/finanzas/cobros/exclusiones",
    label: "Exclusiones",
    icon: ShieldOff,
  },
  {
    href: "/finanzas/cobros/cola",
    label: "Cola de mensajes",
    icon: ListChecks,
  },
  {
    href: "/finanzas/cobros/historial",
    label: "Historial",
    icon: History,
  },
];

export default function CobrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function estaActivo(href: string) {
    if (href === "/finanzas/cobros") {
      return pathname === "/finanzas/cobros";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-full">
      <div className="sticky top-[100px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-2">
          <nav className="flex min-w-max gap-2 overflow-x-auto">
            {menuCobros.map((item) => {
              const Icon = item.icon;
              const activo = estaActivo(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold transition ${
                    activo
                      ? "bg-blue-700 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}
