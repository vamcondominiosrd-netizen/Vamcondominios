"use client";

import { Inbox } from "lucide-react";

type Props = {
  title?: string;
  description?: string;
};

export default function EmptyState({
  title = "Sin información",
  description = "No existen registros para mostrar.",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <Inbox
        className="h-14 w-14 text-slate-300"
      />

      <h3 className="mt-4 text-lg font-bold text-slate-700">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}