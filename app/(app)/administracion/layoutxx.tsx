"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  UserCog,
  CalendarDays,
  WalletCards,
  FileText,
  Phone,
  Car,
} from "lucide-react";

const submenu = [
  { label: "Dashboard", href: "/dashboard", icono: LayoutDashboard },
  { label: "Condominios", href: "/condominios", icono: Building2 },
  { label: "Unidades", href: "/unidades", icono: Home },
  { label: "Propietarios", href: "/propietarios", icono: Users },
  { label: "Directiva", href: "/usuarios", icono: UserCog },
  { label: "Áreas", href: "/areas-sociales", icono: CalendarDays },
  { label: "Reservas", href: "/reservas-areas", icono: CalendarDays },
  { label: "Cuotas", href: "/configuracion-cargos", icono: WalletCards },
  { label: "Documentos", href: "/administracion/documentos", icono: FileText },
  { label: "Directorio", href: "/administracion/directorio", icono: Phone },
  { label: "Vehículos", href: "/administracion/vehiculos", icono: Car },
];

export default function AdministracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-[104px] z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                VAM Enterprise
              </p>

              <h1 className="text-xl font-black text-slate-800">
                Centro Residencial
              </h1>

              <p className="text-sm text-slate-500">
                Gestión de condominios, unidades, propietarios, documentos,
                reservas y datos operativos.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
              <span className="text-slate-500">Centro activo: </span>
              <span className="font-bold text-slate-800">Residencial</span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <nav className="flex min-w-max gap-2">
              {submenu.map((item) => {
                const Icono = item.icono;
                const activo =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      activo
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    <Icono className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}