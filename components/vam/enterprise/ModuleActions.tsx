"use client";

import type { ReactNode } from "react";
import { Download, FileSpreadsheet, Plus, Printer, RefreshCw } from "lucide-react";

type Props = {
  onNew?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  newLabel?: string;
  extra?: ReactNode;
};

export default function ModuleActions({
  onNew,
  onRefresh,
  onExport,
  onPrint,
  newLabel = "Nuevo",
  extra,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {onNew && (
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          {newLabel}
        </button>
      )}

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      )}

      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Excel
        </button>
      )}

      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </button>
      )}

      {extra}
    </div>
  );
}