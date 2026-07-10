"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

type SubmenuItem = {
  href: string;
  label: string;
  icono: LucideIcon;
};

type CentroTrabajoLayoutProps = {
  titulo: string;
  descripcion?: string;
  icono: LucideIcon;
  color?: "blue" | "green" | "orange" | "purple" | "indigo" | "slate";
  etiqueta?: string;
  submenu: SubmenuItem[];
  children: React.ReactNode;
};

const estilos = {
  blue: {
    texto: "text-blue-700",
    activo: "bg-blue-600 text-white",
    icono: "bg-blue-600 text-white",
    hover: "hover:bg-blue-50 hover:text-blue-700",
  },
  green: {
    texto: "text-emerald-700",
    activo: "bg-emerald-600 text-white",
    icono: "bg-emerald-600 text-white",
    hover: "hover:bg-emerald-50 hover:text-emerald-700",
  },
  orange: {
    texto: "text-orange-700",
    activo: "bg-orange-600 text-white",
    icono: "bg-orange-600 text-white",
    hover: "hover:bg-orange-50 hover:text-orange-700",
  },
  purple: {
    texto: "text-purple-700",
    activo: "bg-purple-600 text-white",
    icono: "bg-purple-600 text-white",
    hover: "hover:bg-purple-50 hover:text-purple-700",
  },
  indigo: {
    texto: "text-indigo-700",
    activo: "bg-indigo-600 text-white",
    icono: "bg-indigo-600 text-white",
    hover: "hover:bg-indigo-50 hover:text-indigo-700",
  },
  slate: {
    texto: "text-slate-700",
    activo: "bg-slate-900 text-white",
    icono: "bg-slate-900 text-white",
    hover: "hover:bg-slate-100 hover:text-slate-900",
  },
};

export default function CentroTrabajoLayout({
  titulo,
  descripcion,
  icono: Icono,
  color = "blue",
  etiqueta = "VAM Enterprise",
  submenu,
  children,
}: CentroTrabajoLayoutProps) {
  const pathname = usePathname();
  const estilo = estilos[color];

  return (
    <div className="min-h-[calc(100vh-104px)] bg-slate-50">
      <div className="sticky top-[104px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-2xl ${estilo.icono} flex items-center justify-center shadow-sm`}
              >
                <Icono className="h-6 w-6" />
              </div>

              <div>
                <p
                  className={`text-[11px] font-black uppercase tracking-wide ${estilo.texto}`}
                >
                  {etiqueta}
                </p>

                <h1 className="text-xl font-black text-slate-900 leading-tight">
                  {titulo}
                </h1>

                {descripcion && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {descripcion}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <nav className="flex min-w-max gap-2">
              {submenu.map((item) => {
                const SubIcono = item.icono;
                const activo =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
                      activo
                        ? estilo.activo
                        : `bg-slate-100 text-slate-700 ${estilo.hover}`
                    }`}
                  >
                    <SubIcono className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}