import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_PROPIETARIOS = "comprobantes-pagos-propietarios";
const BUCKET_ADMIN = "comprobantes-pagos";

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
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

function enteroPositivo(valor: string | null) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function limpiarRuta(valor: string, bucket: string) {
  const texto = String(valor || "").trim();

  if (!texto) return "";

  if (!/^https?:\/\//i.test(texto)) {
    return texto
      .replace(/^\/+/, "")
      .replace(new RegExp(`^${bucket}/`), "");
  }

  try {
    const url = new URL(texto);

    const marcadores = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/${bucket}/`,
    ];

    for (const marcador of marcadores) {
      const posicion = url.pathname.indexOf(marcador);

      if (posicion >= 0) {
        return decodeURIComponent(
          url.pathname.slice(posicion + marcador.length),
        );
      }
    }
  } catch {
    return "";
  }

  return "";
}

async function firmarSiExiste(
  supabase: ReturnType<typeof getAdminClient>,
  bucket: string,
  almacenado: string,
) {
  const ruta = limpiarRuta(almacenado, bucket);

  if (!ruta) return "";

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(ruta, 600);

  if (error || !data?.signedUrl) return "";

  return data.signedUrl;
}

export async function GET(request: NextRequest) {
  try {
    const token = bearerToken(request);

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SESION_INVALIDA",
          mensaje: "No se recibió una sesión administrativa válida.",
        },
        { status: 401 },
      );
    }

    const pagoId = enteroPositivo(
      request.nextUrl.searchParams.get("pago_id"),
    );

    if (!pagoId) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "PAGO_INVALIDO",
          mensaje: "El ID del pago no es válido.",
        },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SESION_INVALIDA",
          mensaje: "La sesión administrativa no es válida o expiró.",
        },
        { status: 401 },
      );
    }

    const { data: pago, error: pagoError } = await supabase
      .from("pagos")
      .select("id,condominio_id,comprobante_url")
      .eq("id", pagoId)
      .maybeSingle();

    if (pagoError || !pago) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "PAGO_NO_ENCONTRADO",
          mensaje: "No se encontró el pago solicitado.",
        },
        { status: 404 },
      );
    }

    const condominioId = Number(pago.condominio_id || 0);

    if (!condominioId) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SIN_CONDOMINIO",
          mensaje: "El pago no tiene condominio asociado.",
        },
        { status: 403 },
      );
    }

    /*
     * Seguridad:
     * validar que el usuario autenticado tenga acceso activo al condominio.
     * El comprobante nunca se entrega usando únicamente pago_id.
     */
    const { data: acceso, error: accesoError } = await supabase
      .from("usuarios_condominios")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("condominio_id", condominioId)
      .eq("activo", true)
      .limit(1)
      .maybeSingle();

    if (accesoError || !acceso) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SIN_ACCESO",
          mensaje: "No tiene acceso activo al condominio de este pago.",
        },
        { status: 403 },
      );
    }

    const almacenado = String(pago.comprobante_url || "").trim();

    if (!almacenado) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SIN_COMPROBANTE",
          mensaje: "Este pago no tiene recibo bancario asociado.",
        },
        { status: 404 },
      );
    }

    /*
     * 1) Primero intenta el bucket privado usado por Propietarios.
     * 2) Luego el bucket histórico/admin.
     * 3) Si el registro histórico contiene una URL http(s) que no pertenece
     *    a esos buckets, se mantiene como compatibilidad.
     */
    let url = await firmarSiExiste(
      supabase,
      BUCKET_PROPIETARIOS,
      almacenado,
    );

    if (!url) {
      url = await firmarSiExiste(
        supabase,
        BUCKET_ADMIN,
        almacenado,
      );
    }

    if (!url && /^https?:\/\//i.test(almacenado)) {
      url = almacenado;
    }

    if (!url) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "ARCHIVO_NO_DISPONIBLE",
          mensaje:
            "El pago tiene referencia de comprobante, pero no fue posible localizar el archivo bancario.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        codigo: "OK",
        url,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error: any) {
    console.error(
      "[API Pago Mantenimiento Comprobante]",
      error?.message || error,
    );

    return NextResponse.json(
      {
        ok: false,
        codigo: "ERROR_INTERNO",
        mensaje: "Error interno abriendo el recibo bancario.",
      },
      { status: 500 },
    );
  }
}
