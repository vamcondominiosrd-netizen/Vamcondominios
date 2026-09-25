import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicAuthKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type LoginBody = {
  cedula?: string;
  password?: string;
};

type DirectivaRegistro = {
  id: number;
  condominio_id: number;
  nombre: string;
  cargo: string;
  cedula: string | null;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  auth_user_id: string | null;
};

function limpiarCedula(valor: unknown) {
  return String(valor || "").replace(/\D/g, "").slice(0, 11);
}

function formatearCedula(cedula: string) {
  if (cedula.length !== 11) return cedula;
  return `${cedula.slice(0, 3)}-${cedula.slice(3, 10)}-${cedula.slice(10)}`;
}

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function fechaHoyDO() {
  // Para validar vigencia usamos solo YYYY-MM-DD.
  // La comparación es de fechas del registro, no de horas.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function registroDirectivaVigente(registro: DirectivaRegistro, hoy: string) {
  if (normalizarTexto(registro.estado) !== "activo") return false;
  if (registro.fecha_inicio && registro.fecha_inicio > hoy) return false;
  if (registro.fecha_fin && registro.fecha_fin < hoy) return false;
  return true;
}

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !serviceRoleKey || !publicAuthKey) {
      return json(
        {
          ok: false,
          error:
            "La autenticación de Directiva no está configurada completamente en el servidor.",
        },
        500
      );
    }

    const body = (await request.json()) as LoginBody;
    const cedula = limpiarCedula(body.cedula);
    const password = String(body.password || "");

    if (cedula.length !== 11 || !password) {
      return json(
        { ok: false, error: "Cédula o contraseña incorrecta." },
        401
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const cedulaFormateada = formatearCedula(cedula);

    // directiva_condominio sigue siendo la fuente oficial del cargo.
    // Permitimos cédula guardada con o sin guiones.
    const { data: candidatos, error: directivaError } = await supabaseAdmin
      .from("directiva_condominio")
      .select(
        "id, condominio_id, nombre, cargo, cedula, estado, fecha_inicio, fecha_fin, auth_user_id"
      )
      .in("cedula", [cedula, cedulaFormateada]);

    if (directivaError) {
      console.error("login-directiva: error consultando directiva", directivaError);
      return json(
        { ok: false, error: "No fue posible validar el acceso de Directiva." },
        500
      );
    }

    const hoy = fechaHoyDO();
    const vigentes = ((candidatos || []) as DirectivaRegistro[]).filter(
      (registro) =>
        limpiarCedula(registro.cedula) === cedula &&
        registroDirectivaVigente(registro, hoy)
    );

    // No revelamos si la cédula existe o si simplemente no está activada.
    const vinculados = vigentes.filter((registro) => registro.auth_user_id);

    if (vinculados.length === 0) {
      return json(
        { ok: false, error: "Cédula o contraseña incorrecta." },
        401
      );
    }

    const authUserIds = Array.from(
      new Set(vinculados.map((registro) => String(registro.auth_user_id)))
    );

    if (authUserIds.length !== 1) {
      console.error(
        "login-directiva: cédula vinculada a múltiples auth_user_id",
        authUserIds
      );
      return json(
        {
          ok: false,
          error:
            "La cuenta de Directiva requiere revisión administrativa. Contacte a VAM.",
        },
        409
      );
    }

    const authUserId = authUserIds[0];

    const { data: authUsuarioData, error: authUsuarioError } =
      await supabaseAdmin.auth.admin.getUserById(authUserId);

    const authUsuario = authUsuarioData?.user || null;

    if (authUsuarioError || !authUsuario) {
      console.error(
        "login-directiva: auth_user_id no existe en auth.users",
        authUsuarioError
      );
      return json(
        { ok: false, error: "Cédula o contraseña incorrecta." },
        401
      );
    }

    // La cédula es el usuario visible. Email/teléfono se usan solo internamente
    // porque Supabase Auth Password necesita uno de esos identificadores.
    const supabaseAuth = createClient(supabaseUrl, publicAuthKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    let authResultado;

    if (authUsuario.email) {
      authResultado = await supabaseAuth.auth.signInWithPassword({
        email: authUsuario.email,
        password,
      });
    } else if (authUsuario.phone) {
      authResultado = await supabaseAuth.auth.signInWithPassword({
        phone: authUsuario.phone,
        password,
      });
    } else {
      console.error(
        "login-directiva: usuario Auth sin email ni teléfono",
        authUserId
      );
      return json(
        {
          ok: false,
          error:
            "La cuenta de Directiva requiere revisión administrativa. Contacte a VAM.",
        },
        409
      );
    }

    const { data: ingresoData, error: ingresoError } = authResultado;

    if (
      ingresoError ||
      !ingresoData.user ||
      !ingresoData.session ||
      ingresoData.user.id !== authUserId
    ) {
      return json(
        { ok: false, error: "Cédula o contraseña incorrecta." },
        401
      );
    }

    // Después de validar la contraseña, comprobamos que la infraestructura
    // que usa listar_condominios_directiva sigue activa.
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from("profiles")
      .select("id, active")
      .eq("id", authUserId)
      .maybeSingle();

    if (perfilError || !perfil || perfil.active !== true) {
      await supabaseAuth.auth.signOut();
      return json(
        {
          ok: false,
          error:
            "Su perfil de Directiva no está activo. Contacte a la administración.",
        },
        403
      );
    }

    const condominioIds = Array.from(
      new Set(
        vinculados
          .filter((registro) => String(registro.auth_user_id) === authUserId)
          .map((registro) => Number(registro.condominio_id))
          .filter((id) => Number.isInteger(id) && id > 0)
      )
    );

    const { data: accesos, error: accesosError } = await supabaseAdmin
      .from("usuarios_condominios")
      .select("id, condominio_id, rol_condominio, activo")
      .eq("user_id", authUserId)
      .eq("activo", true)
      .in("condominio_id", condominioIds);

    if (accesosError || !accesos || accesos.length === 0) {
      await supabaseAuth.auth.signOut();
      return json(
        {
          ok: false,
          error:
            "No tiene un acceso activo de Directiva. Contacte a la administración.",
        },
        403
      );
    }

    const principal = vinculados.find(
      (registro) => String(registro.auth_user_id) === authUserId
    );

    return json({
      ok: true,
      mensaje: "Acceso de Directiva validado correctamente.",
      access_token: ingresoData.session.access_token,
      refresh_token: ingresoData.session.refresh_token,
      expires_at: ingresoData.session.expires_at ?? null,
      expires_in: ingresoData.session.expires_in ?? null,
      user_id: authUserId,
      nombre: principal?.nombre || "Miembro de la Directiva",
      tipo_usuario: "DIRECTIVA",
    });
  } catch (error) {
    console.error("login-directiva: error inesperado", error);

    return json(
      {
        ok: false,
        error: "No fue posible iniciar la sesión de Directiva.",
      },
      500
    );
  }
}
