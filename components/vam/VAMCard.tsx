import { ReactNode } from "react";

type VAMCardProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
};

export default function VAMCard({
  children,
  title,
  description,
  className = "",
}: VAMCardProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-base font-bold text-slate-900">
              {title}
            </h2>
          )}

          {description && (
            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>
      )}

      {children}
    </section>
  );
}