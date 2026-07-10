"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  FileText,
  ListChecks,
  BarChart3,
  TrendingUp,
  Landmark,
  Wallet,
  PiggyBank,
  Repeat,
  LockKeyhole,
} from "lucide-react";

const submenu = [
  { label: "Dashboard", href: "/contabilidad/dashboard", icono: LayoutDashboard },
  { label: "Plan", href: "/contabilidad/plan-cuentas", icono: BookOpen },
  { label: "Configuración", href: "/contabilidad/configuracion", icono: Settings },
  { label: "Asientos", href: "/contabilidad/asientos", icono: FileText },
  { label: "Mayor", href: "/contabilidad/mayor-general", icono: ListChecks },
  { label: "Balance", href: "/contabilidad/balance-comprobacion", icono: BarChart3 },
  { label: "Resultados", href: "/contabilidad/estado-resultados", icono: TrendingUp },
  { label: "General", href: "/contabilidad/balance-general", icono: Landmark },
  { label: "Flujo", href: "/contabilidad/flujo-efectivo", icono: Wallet },
  { label: "Reserva", href: "/contabilidad/fondo-reserva", icono: PiggyBank },
  { label: "Conciliación", href: "/contabilidad/conciliacion-bancaria", icono: Repeat },
  { label: "Cierre", href: "/contabilidad/cierre-mensual", icono: LockKeyhole },
];

export default function ContabilidadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                VAM Condominios
              </p>
              <h1 className="text-xl font-black text-slate-800">
                Módulo Contable
              </h1>
              <p className="text-sm text-slate-500">
                Navegación interna contable y reportes financieros.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
              <span className="text-slate-500">Condominio activo: </span>
              <span className="font-bold text-slate-800">Actual</span>
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