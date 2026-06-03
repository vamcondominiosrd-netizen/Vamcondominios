"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [validando, setValidando] = useState(true);

  useEffect(() => {
    const condominioId = localStorage.getItem("condominio_id");

    if (!condominioId) {
      router.push("/login");
      return;
    }

    setValidando(false);
  }, [router]);

  if (validando) {
    return <div className="p-6">Validando sesión...</div>;
  }

  return <>{children}</>;
}