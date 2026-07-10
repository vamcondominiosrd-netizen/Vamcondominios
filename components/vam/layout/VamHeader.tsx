"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  badge?: string;
};

export default function VamHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Volver",
  badge,
}: Props) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">{title}</h1>

          {subtitle && (
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>

        {badge && (
          <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}