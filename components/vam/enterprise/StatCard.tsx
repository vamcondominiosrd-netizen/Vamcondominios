"use client";

import { LucideIcon } from "lucide-react";

const tones = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-700",
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "blue",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: keyof typeof tones;
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase">
            {title}
          </p>

          <h2 className="text-2xl font-black text-slate-900 mt-1">
            {value}
          </h2>

          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}