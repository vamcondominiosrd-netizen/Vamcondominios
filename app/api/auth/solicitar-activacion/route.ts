import { NextResponse } from "next/server";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicAuthKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const appUrlConfigurada = String(process.env.VAM_APP_URL || "")
  .trim()
  .replace(/\/+$/, "");

type Body = {
  email?: string;
};

function normalizarCorreo(valor: unknown) {
  return String(valor || "").trim().toLowerCase();
}

function correoValido(valor: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hoyRD() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function respuestaEnlaceEnviado() {
  return NextResponse.json(
    {
      ok: true,
      mensaje:
        "Se procesó correctamente la solicitud de acceso.",
      estado: "ENLACE_ENVIADO",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
      },
    }
  );
}

async function buscarUsuarioAuthPorEmail(
  supabaseAdmin: SupabaseClient,
  email: string
): Promise<User | null> {
  const porPagina = 200;

  for (let pagina = 1; pagina <= 50; pagina += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: pagina,
      perPage: porPagina,
    });

    if (error) {
      throw new Error(
        `No fue posible revisar los usuarios de Supabase: ${error.message}`
      );
    }

    const encontrado = (data.users || []).find(
      (usuario) => normalizarCorreo(usuario.email) === email
    );

    if (encontrado) return encontrado;
    if ((data.users || []).length < porPagina) break;
  }

  return null;
}

function obtenerAppUrl(request: Request) {
  if (appUrlConfigurada) return appUrlConfigurada;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Falta configurar VAM_APP_URL con el dominio oficial de producción."
    );
  }

  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !serviceRoleKey || !publicAuthKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La activación por correo no está configurada completamente en el servidor.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as Body;
    const email = normalizarCorreo(body.email);

    if (!correoValido(email)) {
      return NextResponse.json(
        { ok: false, error: "Indique un correo electrónico válido." },
        { status: 400 }
      );
    }

    const appUrl = obtenerAppUrl(request);
    const redirectTo = `${appUrl}/movil/activar-cuenta/confirmar`;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const supabasePublico = createClient(supabaseUrl, publicAuthKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const [propietariosResp, directivaResp] = await Promise.all([
      supabaseAdmin
        .from("propietarios_apartamentos")
        .select("id, nombre_propietario, correo, estado")
        .ilike("correo", email)
        .limit(25),
      supabaseAdmin
        .from("directiva_condominio")
        .select("id, nombre, correo, estado, fecha_inicio, fecha_fin")
        .ilike("correo", email)
        .limit(25),
    ]);

    if (propietariosResp.error || directivaResp.error) {
      console.error(
        "solicitar-activacion: error revisando relaciones VAM",
        propietariosResp.error || directivaResp.error
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No fue posible validar el correo en este momento. Intente nuevamente.",
        },
        { status: 500 }
      );
    }

    const propietarios = (propietariosResp.data || []).filter(
      (registro) =>
        normalizarCorreo(registro.correo) === email &&
        normalizarTexto(registro.estado || "activo") !== "inactivo"
    );

    const hoy = hoyRD();

    const directivas = (directivaResp.data || []).filter(
      (registro) =>
        normalizarCorreo(registro.correo) === email &&
        normalizarTexto(registro.estado) === "activo" &&
        (!registro.fecha_inicio || registro.fecha_inicio <= hoy) &&
        (!registro.fecha_fin || registro.fecha_fin >= hoy)
    );

    if (propietarios.length === 0 && directivas.length === 0) {
      return NextResponse.json(
        { ok: true, estado: "NO_REGISTRADO", mensaje: "No existe un acceso activo asociado a este correo." },
        { status: 200, headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } }
      );
    }

    const nombre =
      directivas[0]?.nombre ||
      propietarios[0]?.nombre_propietario ||
      "Usuario VAM";

    const authUser = await buscarUsuarioAuthPorEmail(
      supabaseAdmin,
      email
    );

    if (!authUser) {
      const { error } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: {
            full_name: nombre,
            vam_acceso: "UNIFICADO",
          },
        });

      if (error) {
        console.error(
          "solicitar-activacion: error enviando invitación",
          error
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "No fue posible enviar el correo de activación. Intente nuevamente más tarde.",
          },
          { status: 503 }
        );
      }

      return respuestaEnlaceEnviado();
    }

    const { error: recoveryError } =
      await supabasePublico.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

    if (recoveryError) {
      console.error(
        "solicitar-activacion: error enviando recuperación",
        recoveryError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No fue posible enviar el correo seguro. Intente nuevamente más tarde.",
        },
        { status: 503 }
      );
    }

    return respuestaEnlaceEnviado();
  } catch (error) {
    console.error("solicitar-activacion: error inesperado", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible procesar la activación en este momento.",
      },
      { status: 500 }
    );
  }
}
