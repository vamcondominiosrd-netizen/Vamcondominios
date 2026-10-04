"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPropietarioLegacyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/movil/acceso-unificado");
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100">
      <p className="text-sm font-semibold text-slate-500">
        Redirigiendo al acceso seguro de VAM...
      </p>
    </main>
  );
}