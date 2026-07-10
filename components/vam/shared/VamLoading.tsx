"use client";

type Props = {
  text?: string;
};

export default function VamLoading({
  text = "Cargando información...",
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
      {text}
    </div>
  );
}