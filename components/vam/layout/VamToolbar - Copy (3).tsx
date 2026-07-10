"use client";

import {
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Settings,
} from "lucide-react";

type Props = {
  showNew?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showExcel?: boolean;
  showPdf?: boolean;
  showPrint?: boolean;
  showRefresh?: boolean;
  showSettings?: boolean;

  onNew?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onExcel?: () => void;
  onPdf?: () => void;
  onPrint?: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
};

function ToolbarButton({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: any;
  label: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] ${color}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function VamToolbar(props: Props) {
  return (
    <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      {props.showNew && (
        <ToolbarButton
          icon={Plus}
          label="Nuevo"
          color="bg-blue-600 hover:bg-blue-700"
          onClick={props.onNew}
        />
      )}

      {props.showEdit && (
        <ToolbarButton
          icon={Pencil}
          label="Editar"
          color="bg-amber-500 hover:bg-amber-600"
          onClick={props.onEdit}
        />
      )}

      {props.showDelete && (
        <ToolbarButton
          icon={Trash2}
          label="Eliminar"
          color="bg-red-600 hover:bg-red-700"
          onClick={props.onDelete}
        />
      )}

      {props.showExcel && (
        <ToolbarButton
          icon={FileSpreadsheet}
          label="Excel"
          color="bg-green-600 hover:bg-green-700"
          onClick={props.onExcel}
        />
      )}

      {props.showPdf && (
        <ToolbarButton
          icon={FileText}
          label="PDF"
          color="bg-red-500 hover:bg-red-600"
          onClick={props.onPdf}
        />
      )}

      {props.showPrint && (
        <ToolbarButton
          icon={Printer}
          label="Imprimir"
          color="bg-slate-700 hover:bg-slate-800"
          onClick={props.onPrint}
        />
      )}

      {props.showRefresh && (
        <ToolbarButton
          icon={RefreshCw}
          label="Actualizar"
          color="bg-cyan-600 hover:bg-cyan-700"
          onClick={props.onRefresh}
        />
      )}

      {props.showSettings && (
        <ToolbarButton
          icon={Settings}
          label="Configuración"
          color="bg-indigo-600 hover:bg-indigo-700"
          onClick={props.onSettings}
        />
      )}

    </div>
  );
}