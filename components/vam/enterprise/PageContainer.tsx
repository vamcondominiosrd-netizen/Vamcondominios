"use client";

export default function PageContainer({
  children,
  maxWidth = "max-w-7xl",
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <main className={`mx-auto ${maxWidth} px-4 py-5 space-y-5`}>
      {children}
    </main>
  );
}