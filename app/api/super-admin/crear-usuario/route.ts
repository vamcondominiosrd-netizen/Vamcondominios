import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const {
      condominio_id,
      nombre,
      email,
      password,
      rol,
      estado = "Activo",
    } = body;

    if (!condominio_id || !nombre || !email || !password || !rol) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe completar condominio, nombre, correo, clave temporal y rol.",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userCreated, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nombre,
          rol,
          condominio_id,
        },
      });

    if (createUserError || !userCreated.user) {
      return NextResponse.json(
        {
          ok: false,
          error:
            createUserError?.message ||
            "No se pudo crear el usuario en Supabase Auth.",
        },
        { status: 400 }
      );
    }

    const userId = userCreated.user.id;

    const { error: insertError } = await supabaseAdmin
      .from("usuarios_admin")
      .insert([
        {
          user_id: userId,
          condominio_id: Number(condominio_id),
          nombre: String(nombre).trim(),
          rol: String(rol).trim(),
          estado,
        },
      ]);

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          ok: false,
          error:
            "El usuario fue creado en Auth, pero no se pudo asociar al condominio: " +
            insertError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      user_id: userId,
      email,
      nombre,
      rol,
      condominio_id,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error inesperado creando usuario.",
      },
      { status: 500 }
    );
  }
}