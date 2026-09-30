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

const ITEMS = [
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
] as const;

const MODULO_VERSION = "1.1";

function rutaActiva(pathname: string, href: string) {
  if (href === "/movil/propietarios/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PropietariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // El login no debe mostrar la navegación privada inferior.
  const ocultarNavegacion =
    pathname === "/movil/propietarios/login" ||
    pathname.startsWith("/movil/propietarios/login/");

  return (
    <div
      className={
        ocultarNavegacion
          ? "min-h-dvh bg-slate-100"
          : "min-h-dvh bg-slate-100 pb-[calc(6rem+env(safe-area-inset-bottom))]"
      }
      data-vam-layout={`propietarios-${MODULO_VERSION}`}
    >
      <div className="mx-auto w-full max-w-lg">
        {children}
      </div>

      {!ocultarNavegacion && (
        <nav
          aria-label="Navegación principal del propietario"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div className="mx-auto grid w-full max-w-lg grid-cols-5 pb-[env(safe-area-inset-bottom)]">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              const activo = rutaActiva(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold transition ${
                    activo
                      ? "text-blue-700"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon
                    size={22}
                    strokeWidth={activo ? 2.5 : 2}
                    aria-hidden="true"
                  />
                  <span className="truncate">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
