import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizarRolAdmin(rol: string) {
  const valor = String(rol || "").trim().toLowerCase();

  if (["admin", "administrador", "administrador general"].includes(valor)) {
    return {
      rolUsuariosAdmin: "administrador",
      rolUsuariosCondominios: "Administrador General",
    };
  }

  return {
    rolUsuariosAdmin: valor || "administrador",
    rolUsuariosCondominios: String(rol || "Administrador General").trim(),
  };
}

export async function POST(request: Request) {
  let userIdCreado: string | null = null;

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

    if (String(password).length < 6) {
      return NextResponse.json(
        { ok: false, error: "La clave temporal debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const condominioId = Number(condominio_id);

    const { data: condominio, error: condominioError } = await supabaseAdmin
      .from("condominios")
      .select("id, nombre, empresa_id, sucursal_id, activa, estado")
      .eq("id", condominioId)
      .maybeSingle();

    if (condominioError || !condominio) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se encontró el condominio seleccionado: " +
            (condominioError?.message || "verifique el ID."),
        },
        { status: 400 }
      );
    }

    if (!condominio.empresa_id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El condominio no tiene empresa_id. Complete la configuración del condominio antes de crear usuarios.",
        },
        { status: 400 }
      );
    }

    const { rolUsuariosAdmin, rolUsuariosCondominios } = normalizarRolAdmin(rol);

    const { data: userCreated, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email: String(email).trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          nombre: String(nombre).trim(),
          rol: rolUsuariosAdmin,
          condominio_id: condominioId,
          condominio_nombre: condominio.nombre,
          empresa_id: condominio.empresa_id,
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

    userIdCreado = userCreated.user.id;

    const { error: adminError } = await supabaseAdmin
      .from("usuarios_admin")
      .insert([
        {
          user_id: userIdCreado,
          condominio_id: condominioId,
          nombre: String(nombre).trim(),
          rol: rolUsuariosAdmin,
          estado: estado || "Activo",
        },
      ]);

    if (adminError) {
      await supabaseAdmin.auth.admin.deleteUser(userIdCreado);

      return NextResponse.json(
        {
          ok: false,
          error:
            "El usuario fue creado en Auth, pero no se pudo registrar en usuarios_admin: " +
            adminError.message,
        },
        { status: 400 }
      );
    }

    const { data: relacionExistente, error: buscarRelacionError } =
      await supabaseAdmin
        .from("usuarios_condominios")
        .select("id")
        .eq("user_id", userIdCreado)
        .eq("condominio_id", condominioId)
        .maybeSingle();

    if (buscarRelacionError) {
      await supabaseAdmin
        .from("usuarios_admin")
        .delete()
        .eq("user_id", userIdCreado)
        .eq("condominio_id", condominioId);
      await supabaseAdmin.auth.admin.deleteUser(userIdCreado);

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo validar la relación usuarios_condominios: " +
            buscarRelacionError.message,
        },
        { status: 400 }
      );
    }

    const relacionPayload = {
      user_id: userIdCreado,
      empresa_id: Number(condominio.empresa_id),
      condominio_id: condominioId,
      rol_condominio: rolUsuariosCondominios,
      activo: true,
    };

    const { error: relacionError } = relacionExistente
      ? await supabaseAdmin
          .from("usuarios_condominios")
          .update(relacionPayload)
          .eq("id", relacionExistente.id)
      : await supabaseAdmin.from("usuarios_condominios").insert([relacionPayload]);

    if (relacionError) {
      await supabaseAdmin
        .from("usuarios_admin")
        .delete()
        .eq("user_id", userIdCreado)
        .eq("condominio_id", condominioId);
      await supabaseAdmin.auth.admin.deleteUser(userIdCreado);

      return NextResponse.json(
        {
          ok: false,
          error:
            "El usuario fue creado, pero no se pudo registrar en usuarios_condominios: " +
            relacionError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      user_id: userIdCreado,
      email: String(email).trim().toLowerCase(),
      nombre: String(nombre).trim(),
      rol: rolUsuariosAdmin,
      rol_condominio: rolUsuariosCondominios,
      condominio_id: condominioId,
      condominio: condominio.nombre,
      empresa_id: condominio.empresa_id,
    });
  } catch (error: any) {
    if (userIdCreado && supabaseUrl && serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await supabaseAdmin.auth.admin.deleteUser(userIdCreado);
    }

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error inesperado creando usuario.",
      },
      { status: 500 }
    );
  }
}
