"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
};

export default function ModuleToolbar({
  title,
  subtitle,
  icon: Icon,
  actions,
}: Props) {
  return (
    <section className="rounded-2xl border bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Icon className="h-5 w-5" />
            </div>
          )}

          <div>
            <h1 className="text-xl font-black text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  );
}