"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

type ModuleMenuItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
};

type Props = {
  title: string;
  subtitle?: string;
  items: ModuleMenuItem[];
  tone?: "blue" | "green" | "cyan" | "purple" | "orange" | "slate";
};

export default function ModuleMenu({
  title,
  subtitle,
  items,
  tone = "green",
}: Props) {
  const pathname = usePathname();

  function colorActivo() {
    if (tone === "blue") return "bg-blue-700 text-white";
    if (tone === "cyan") return "bg-cyan-700 text-white";
    if (tone === "purple") return "bg-purple-700 text-white";
    if (tone === "orange") return "bg-orange-700 text-white";
    if (tone === "slate") return "bg-slate-800 text-white";
    return "bg-emerald-700 text-white";
  }

  return (
    <section className="rounded-2xl border bg-white p-3 shadow-sm">
      <div className="mb-3 px-2">
        <p className="text-sm font-black text-slate-900">{title}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <nav className="flex gap-2 overflow-x-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const activo =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex min-w-max items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
                activo
                  ? colorActivo()
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}