"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type RequireAuthProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
};

export default function RequireAuth({
  children,
  allowedRoles,
  redirectTo = "/login",
}: RequireAuthProps) {
  const router = useRouter();
  const [validando, setValidando] = useState(true);

  useEffect(() => {
    validarAcceso();
  }, []);

  function limpiarLocalStorage() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_admin_id");
    localStorage.removeItem("super_admin_id");
  }

  async function validarAcceso() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      limpiarLocalStorage();
      router.replace(redirectTo);
      return;
    }

    const rol = localStorage.getItem("usuario_rol") || "";

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(rol)) {
      router.replace(redirectTo);
      return;
    }

    setValidando(false);
  }

  if (validando) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border shadow p-6 text-sm font-bold text-slate-700">
          Validando acceso...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}