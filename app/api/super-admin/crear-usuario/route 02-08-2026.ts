import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizarRol(rol: string) {
  const valor = String(rol || "").trim().toLowerCase();

  if (["admin", "administrador", "administrador general"].includes(valor)) {
    return {
      rolUsuariosAdmin: "administrador",
      rolUsuariosCondominios: "Administrador General",
      rolEmpresa: "Administrador General",
    };
  }

  return {
    rolUsuariosAdmin: valor || "administrador",
    rolUsuariosCondominios: String(rol || "Administrador General").trim(),
    rolEmpresa: String(rol || "Administrador General").trim(),
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
    const emailNormalizado = String(email).trim().toLowerCase();
    const nombreNormalizado = String(nombre).trim();

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
            "El condominio seleccionado no tiene empresa_id. Corrija el condominio antes de crear usuarios.",
        },
        { status: 400 }
      );
    }

    const empresaId = Number(condominio.empresa_id);
    const { rolUsuariosAdmin, rolUsuariosCondominios, rolEmpresa } = normalizarRol(rol);

    const { data: userCreated, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email: emailNormalizado,
        password,
        email_confirm: true,
        user_metadata: {
          nombre: nombreNormalizado,
          rol: rolUsuariosAdmin,
          condominio_id: condominioId,
          condominio_nombre: condominio.nombre,
          empresa_id: empresaId,
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

    // 1) Relación con empresa: el login actual valida primero esta tabla.
    const { error: empresaInsertError } = await supabaseAdmin
      .from("usuarios_empresas")
      .insert([
        {
          user_id: userIdCreado,
          empresa_id: empresaId,
          nombre_usuario: nombreNormalizado,
          correo: emailNormalizado,
          rol_global: rolEmpresa,
          activo: true,
        },
      ]);

    if (empresaInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(userIdCreado);
      return NextResponse.json(
        {
          ok: false,
          error:
            "El usuario fue creado en Auth, pero no se pudo registrar en usuarios_empresas: " +
            empresaInsertError.message,
        },
        { status: 400 }
      );
    }

    // 2) Relación administrativa por condominio.
    const { error: adminError } = await supabaseAdmin
      .from("usuarios_admin")
      .insert([
        {
          user_id: userIdCreado,
          condominio_id: condominioId,
          nombre: nombreNormalizado,
          rol: rolUsuariosAdmin,
          estado: estado || "Activo",
        },
      ]);

    if (adminError) {
      await supabaseAdmin.from("usuarios_empresas").delete().eq("user_id", userIdCreado);
      await supabaseAdmin.auth.admin.deleteUser(userIdCreado);
      return NextResponse.json(
        {
          ok: false,
          error:
            "El usuario fue creado, pero no se pudo registrar en usuarios_admin: " +
            adminError.message,
        },
        { status: 400 }
      );
    }

    // 3) Relación para que aparezca en el selector de condominios.
    const { error: relacionError } = await supabaseAdmin
      .from("usuarios_condominios")
      .insert([
        {
          user_id: userIdCreado,
          empresa_id: empresaId,
          condominio_id: condominioId,
          rol_condominio: rolUsuariosCondominios,
          activo: true,
        },
      ]);

    if (relacionError) {
      await supabaseAdmin
        .from("usuarios_admin")
        .delete()
        .eq("user_id", userIdCreado)
        .eq("condominio_id", condominioId);
      await supabaseAdmin.from("usuarios_empresas").delete().eq("user_id", userIdCreado);
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
      email: emailNormalizado,
      nombre: nombreNormalizado,
      rol: rolUsuariosAdmin,
      rol_condominio: rolUsuariosCondominios,
      rol_empresa: rolEmpresa,
      condominio_id: condominioId,
      condominio: condominio.nombre,
      empresa_id: empresaId,
    });
  } catch (error: any) {
    if (userIdCreado && supabaseUrl && serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await supabaseAdmin.from("usuarios_condominios").delete().eq("user_id", userIdCreado);
      await supabaseAdmin.from("usuarios_admin").delete().eq("user_id", userIdCreado);
      await supabaseAdmin.from("usuarios_empresas").delete().eq("user_id", userIdCreado);
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
