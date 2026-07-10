"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  CreditCard,
  Wrench,
  Menu,
} from "lucide-react";

export default function PropietariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const items = [
    {
      label: "Inicio",
      href: "/movil/propietarios/dashboard",
      icon: Home,
    },
    {
      label: "Cuenta",
      href: "/movil/propietarios/estado-cuenta",
      icon: FileText,
    },
    {
      label: "Pagos",
      href: "/movil/propietarios/pagos",
      icon: CreditCard,
    },
    {
      label: "Incidencias",
      href: "/movil/propietarios/incidencias",
      icon: Wrench,
    },
    {
      label: "Más",
      href: "/movil/propietarios/mas",
      icon: Menu,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <div className="max-w-md mx-auto">{children}</div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-5">
          {items.map((item) => {
            const Icon = item.icon;
            const activo = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-3 text-xs font-semibold ${
                  activo ? "text-blue-700" : "text-slate-500"
                }`}
              >
                <Icon size={22} />
                <span className="mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}