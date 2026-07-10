"use client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function DataTable({
  children,
}: Props) {
  return (
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        {children}
      </table>
    </div>
  );
}