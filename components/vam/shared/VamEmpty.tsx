"use client";

type Props = {
  title?: string;
  description?: string;
};

export default function VamEmpty({
  title = "No hay información",
  description = "Todavía no existen registros para mostrar.",
}: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <h3 className="text-base font-bold text-slate-700">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}