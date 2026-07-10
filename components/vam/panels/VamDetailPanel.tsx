"use client";

import { X } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function VamDetailPanel({
  title,
  subtitle,
  open,
  onClose,
  children,
}: Props) {
  if (!open) return null;

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between border-b p-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4">{children}</div>
    </aside>
  );
}