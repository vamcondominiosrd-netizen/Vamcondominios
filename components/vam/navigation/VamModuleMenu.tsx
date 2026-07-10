"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

export type VamMenuItem = {
  label: string;
  href: string;
  icono: LucideIcon;
};

type Props = {
  items: VamMenuItem[];
  activeColor?: string;
};

export default function VamModuleMenu({
  items,
  activeColor = "bg-blue-600",
}: Props) {
  const pathname = usePathname();

  return (
    <div className="mt-3 overflow-x-auto">
      <nav className="flex min-w-max gap-2">
        {items.map((item) => {
          const Icono = item.icono;
          const activo =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                activo
                  ? `${activeColor} text-white shadow-sm`
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
  );
}