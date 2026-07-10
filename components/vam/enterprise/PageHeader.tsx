"use client";

import { LucideIcon } from "lucide-react";

export default function PageHeader({
  title,
  subtitle,
  badge,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border shadow-sm p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Icon className="h-6 w-6" />
            </div>
          )}

          <div>
            {badge && (
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                {badge}
              </p>
            )}

            <h1 className="text-2xl font-black text-slate-900">{title}</h1>

            {subtitle && (
              <p className="text-sm text-slate-500 mt-1 max-w-3xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {action && <div>{action}</div>}
      </div>
    </section>
  );
}