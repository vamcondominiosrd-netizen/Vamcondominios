"use client";

type Props = {
  status?: string | null;
};

export default function StatusBadge({ status }: Props) {
  const value = (status || "").toLowerCase();

  let style =
    "bg-slate-100 text-slate-700";

  if (
    value === "activo" ||
    value === "activa" ||
    value === "aprobado" ||
    value === "pagado"
  ) {
    style =
      "bg-green-100 text-green-700";
  }

  if (
    value === "inactivo" ||
    value === "inactiva" ||
    value === "rechazado"
  ) {
    style =
      "bg-red-100 text-red-700";
  }

  if (
    value === "pendiente"
  ) {
    style =
      "bg-yellow-100 text-yellow-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${style}`}
    >
      {status}
    </span>
  );
}