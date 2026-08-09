"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [validando, setValidando] = useState(true);

  useEffect(() => {
    let activo = true;

    async function verificarSesionInicial() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!activo) return;

      if (error) {
        console.error("Error verificando la sesión:", error.message);
      }

      if (!session) {
        router.replace("/login");
        return;
      }

      setValidando(false);
    }

    void verificarSesionInicial();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, session) => {
      if (!activo) return;

      if (evento === "SIGNED_OUT" || !session) {
        setValidando(true);
        router.replace("/login");
        return;
      }

      if (
        evento === "INITIAL_SESSION" ||
        evento === "SIGNED_IN" ||
        evento === "TOKEN_REFRESHED"
      ) {
        setValidando(false);
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (validando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
          Validando sesión...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}