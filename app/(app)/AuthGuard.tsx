"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {

  const router = useRouter();

  const [validando, setValidando] =
    useState(true);

  useEffect(() => {

    async function verificarSesion() {

      try {

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {

          router.push("/login");

          return;
        }

        const condominioId =
          localStorage.getItem(
            "condominio_id"
          );

        if (!condominioId) {

          await supabase.auth.signOut();

          router.push("/login");

          return;
        }

        const { data, error } =
          await supabase
            .from("usuarios_admin")
            .select(`
              id,
              estado,
              condominio_id,
              rol,
              nombre
            `)
            .eq(
              "user_id",
              session.user.id
            )
            .eq(
              "condominio_id",
              Number(condominioId)
            )
            .eq(
              "estado",
              "Activo"
            )
            .maybeSingle();

        if (error || !data) {

          await supabase.auth.signOut();

          localStorage.clear();

          router.push("/login");

          return;
        }

        localStorage.setItem(
          "usuario_rol",
          data.rol || ""
        );

        localStorage.setItem(
          "usuario_nombre",
          data.nombre || ""
        );

        setValidando(false);

      } catch (err) {

        console.error(err);

        await supabase.auth.signOut();

        localStorage.clear();

        router.push("/login");
      }
    }

    verificarSesion();

  }, [router]);

  if (validando) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-slate-100">

        <div className="bg-white rounded-2xl shadow-lg px-8 py-6 text-center">

          <div className="animate-pulse text-slate-600 font-medium">

            Validando sesión...

          </div>

        </div>

      </div>

    );
  }

  return <>{children}</>;
}