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
  title?: string;
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

  const activeClass =
    tone === "blue"
      ? "border-blue-700 bg-blue-50 text-blue-800"
      : tone === "cyan"
      ? "border-cyan-700 bg-cyan-50 text-cyan-800"
      : tone === "purple"
      ? "border-purple-700 bg-purple-50 text-purple-800"
      : tone === "orange"
      ? "border-orange-700 bg-orange-50 text-orange-800"
      : tone === "slate"
      ? "border-slate-800 bg-slate-100 text-slate-900"
      : "border-emerald-700 bg-emerald-50 text-emerald-800";

  return (
    <section className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <p className="text-sm font-black text-slate-900">{title}</p>}
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const Icon = item.icon;
          const activo =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex min-w-max items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                activo
                  ? activeClass
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
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