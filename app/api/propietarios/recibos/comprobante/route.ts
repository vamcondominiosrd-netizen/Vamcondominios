
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKETS_PRIVADOS = [
  "comprobantes-pagos-propietarios",
  "comprobantes-pagos",
];

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

function enteroPositivo(value: string | null) {
  const numero = Number(value);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

async function firmarRuta(
  supabase: ReturnType<typeof getAdminClient>,
  ruta: string
) {
  for (const bucket of BUCKETS_PRIVADOS) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(ruta, 600);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  return "";
}

export async function GET(request: NextRequest) {
  try {
    const token = bearerToken(request);

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SESION_INVALIDA",
          mensaje: "Sesión no disponible.",
        },
        { status: 401 }
      );
    }

    const pagoId = enteroPositivo(
      request.nextUrl.searchParams.get("pago_id")
    );
    const condominioId = enteroPositivo(
      request.nextUrl.searchParams.get("condominio_id")
    );
    const unidadId = enteroPositivo(
      request.nextUrl.searchParams.get("unidad_id")
    );

    if (!pagoId || !condominioId || !unidadId) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "CONTEXTO_INVALIDO",
          mensaje: "Datos del recibo incompletos.",
        },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data: accesoData, error: accesoError } =
      await supabase.rpc("vam_propietario_validar_recibo_pago", {
        p_token: token,
        p_condominio_id: condominioId,
        p_unidad_id: unidadId,
        p_pago_id: pagoId,
      });

    if (accesoError) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "ERROR_VALIDACION",
          mensaje: "No se pudo validar el acceso al recibo.",
        },
        { status: 500 }
      );
    }

    const acceso =
      accesoData &&
      typeof accesoData === "object" &&
      !Array.isArray(accesoData)
        ? (accesoData as Record<string, unknown>)
        : {};

    if (acceso.ok !== true) {
      const codigo = String(
        acceso.codigo || "SIN_ACCESO"
      );

      return NextResponse.json(
        {
          ok: false,
          codigo,
          mensaje:
            String(acceso.mensaje || "") ||
            "No tiene acceso a este recibo.",
        },
        {
          status: [
            "SESION_INVALIDA",
            "SESION_VENCIDA",
            "CUENTA_INACTIVA",
            "CAMBIO_CLAVE_PENDIENTE",
            "SIN_ACCESO",
          ].includes(codigo)
            ? 401
            : 403,
        }
      );
    }

    const { data: pago, error: pagoError } = await supabase
      .from("pagos")
      .select("comprobante_url")
      .eq("id", pagoId)
      .eq("condominio_id", condominioId)
      .eq("unidad_id", unidadId)
      .maybeSingle();

    if (pagoError || !pago?.comprobante_url) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SIN_COMPROBANTE",
          mensaje: "El comprobante no está disponible.",
        },
        { status: 404 }
      );
    }

    const comprobante = String(pago.comprobante_url).trim();

    if (!comprobante) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SIN_COMPROBANTE",
          mensaje: "El comprobante no está disponible.",
        },
        { status: 404 }
      );
    }

    // Compatibilidad con comprobantes históricos almacenados como URL.
    if (/^https?:\/\//i.test(comprobante)) {
      return NextResponse.json(
        {
          ok: true,
          codigo: "OK",
          url: comprobante,
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const signedUrl = await firmarRuta(
      supabase,
      comprobante
    );

    if (!signedUrl) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "COMPROBANTE_NO_DISPONIBLE",
          mensaje: "No se pudo abrir el comprobante.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        codigo: "OK",
        url: signedUrl,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("GET comprobante recibo propietario:", error);

    return NextResponse.json(
      {
        ok: false,
        codigo: "ERROR_INTERNO",
        mensaje: "Error interno consultando el comprobante.",
      },
      { status: 500 }
    );
  }
}
