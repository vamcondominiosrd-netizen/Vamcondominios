"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export default function PageDrawer({
  open,
  title,
  children,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">

      <div
        className="flex-1 bg-black/30"
        onClick={onClose}
      />

      <div className="w-full max-w-xl bg-white shadow-2xl overflow-auto">

        <div className="sticky top-0 flex items-center justify-between border-b bg-white p-5">

          <h2 className="text-xl font-bold">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        <div className="p-6">
          {children}
        </div>

      </div>

    </div>
  );
}