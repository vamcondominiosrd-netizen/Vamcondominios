"use client";

import { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: "blue" | "green" | "red" | "amber" | "purple" | "slate";
};

const tones = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  red: "bg-red-50 text-red-700 border-red-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function VamStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "blue",
}: Props) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold opacity-80">{title}</p>
          <h2 className="mt-1 text-2xl font-black">{value}</h2>

          {subtitle && (
            <p className="mt-1 text-xs font-medium opacity-75">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className="rounded-xl bg-white/70 p-2">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}