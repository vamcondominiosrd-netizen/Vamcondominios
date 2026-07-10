"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

export type VamSectionItem = {
  label: string;
  href: string;
  icono: LucideIcon;
};

type Props = {
  items: VamSectionItem[];
  activeColor?: string;
};

export default function VamSectionMenu({
  items,
  activeColor = "bg-slate-900",
}: Props) {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
        <div className="overflow-x-auto">
          <nav className="flex min-w-max gap-2">
            {items.map((item) => {
              const Icono = item.icono;
              const activo =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    activo
                      ? `${activeColor} text-white shadow-sm`
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
  );
}