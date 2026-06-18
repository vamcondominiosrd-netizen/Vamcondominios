import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function crearSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Falta configurar SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL."
    );
  }

  if (!serviceRoleKey) {
    throw new Error("Falta configurar SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, password } = body;

    if (!user_id || !password) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe enviar user_id y password.",
        },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        {
          ok: false,
          error: "La clave debe tener al menos 6 caracteres.",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = crearSupabaseAdmin();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      String(user_id),
      {
        password: String(password),
      }
    );

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Clave actualizada correctamente.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Error cambiando clave.",
      },
      { status: 500 }
    );
  }
}