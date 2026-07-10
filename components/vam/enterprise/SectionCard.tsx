"use client";

export default function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border shadow-sm p-5">
      {(title || subtitle || action) && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            {title && (
              <h2 className="text-lg font-black text-slate-900">{title}</h2>
            )}

            {subtitle && (
              <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>

          {action && <div>{action}</div>}
        </div>
      )}

      {children}
    </section>
  );
}