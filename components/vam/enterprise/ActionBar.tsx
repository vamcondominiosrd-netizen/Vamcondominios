"use client";

import { Search } from "lucide-react";

export default function ActionBar({
  search,
  onSearch,
  placeholder = "Buscar...",
  children,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      {onSearch && (
        <div className="flex items-center gap-2 bg-slate-100 border rounded-xl px-3 py-2 w-full md:max-w-md">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search || ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>
      )}

      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}