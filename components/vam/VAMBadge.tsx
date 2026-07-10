type VAMBadgeProps = {
  children: React.ReactNode;
  variant?: "success" | "danger" | "warning" | "info" | "neutral";
};

export default function VAMBadge({
  children,
  variant = "neutral",
}: VAMBadgeProps) {
  const variants = {
    success: "bg-green-100 text-green-700",
    danger: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-blue-100 text-blue-700",
    neutral: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${variants[variant]}`}
    >
      {children}
    </span>
  );
}