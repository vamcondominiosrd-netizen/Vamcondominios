import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "comprobantes-pagos-propietarios";

function getConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase para abrir comprobantes.",
    );
  }

  return { url, anonKey, serviceRoleKey };
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

function limpiarRuta(valor: string) {
  return String(valor || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/^comprobantes-pagos-propietarios\//, "");
}

export async function GET(request: NextRequest) {
  try {
    const token = bearerToken(request);

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SESION_INVALIDA",
          mensaje: "Sesión administrativa no disponible.",
        },
        { status: 401 },
      );
    }

    const pagoMovilId = Number(
      request.nextUrl.searchParams.get("pago_movil_id") || 0,
    );

    if (!Number.isInteger(pagoMovilId) || pagoMovilId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "ID_INVALIDO",
          mensaje: "El comprobante solicitado no es válido.",
        },
        { status: 400 },
      );
    }

    const { url, anonKey, serviceRoleKey } = getConfig();

    // Cliente con la sesión del usuario: la consulta queda limitada por RLS.
    const usuarioClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: usuarioData, error: usuarioError } =
      await usuarioClient.auth.getUser(token);

    if (usuarioError || !usuarioData.user) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SESION_INVALIDA",
          mensaje: "La sesión administrativa ha vencido.",
        },
        { status: 401 },
      );
    }

    const { data: pago, error: pagoError } = await usuarioClient
      .from("pagos_movil")
      .select("id,condominio_id,unidad_id,comprobante_url")
      .eq("id", pagoMovilId)
      .maybeSingle();

    if (pagoError) {
      console.error(
        "[Comprobantes Propietarios] Error consultando pago móvil:",
        pagoError,
      );

      return NextResponse.json(
        {
          ok: false,
          codigo: "ERROR_CONSULTA",
          mensaje: "No se pudo validar el comprobante solicitado.",
        },
        { status: 500 },
      );
    }

    if (!pago) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SIN_ACCESO",
          mensaje: "El comprobante no existe o no está disponible para este usuario.",
        },
        { status: 404 },
      );
    }

    const almacenado = String(pago.comprobante_url || "").trim();

    if (!almacenado) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SIN_ARCHIVO",
          mensaje: "Este envío no tiene un comprobante asociado.",
        },
        { status: 404 },
      );
    }

    // Compatibilidad con registros históricos que ya contienen URL completa.
    if (/^https?:\/\//i.test(almacenado)) {
      try {
        const destino = new URL(almacenado);
        const supabaseHost = new URL(url).host;

        if (destino.host !== supabaseHost) {
          return NextResponse.json(
            {
              ok: false,
              codigo: "URL_NO_PERMITIDA",
              mensaje: "La ubicación del comprobante no es válida.",
            },
            { status: 400 },
          );
        }

        return NextResponse.json(
          { ok: true, url: almacenado },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch {
        return NextResponse.json(
          {
            ok: false,
            codigo: "URL_INVALIDA",
            mensaje: "La ubicación del comprobante no es válida.",
          },
          { status: 400 },
        );
      }
    }

    const ruta = limpiarRuta(almacenado);

    if (!ruta || ruta.split("/").includes("..")) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "RUTA_INVALIDA",
          mensaje: "La ruta del comprobante no es válida.",
        },
        { status: 400 },
      );
    }

    // Service Role solo se usa después de que RLS confirmó que el usuario
    // puede ver el registro pagos_movil solicitado.
    const admin = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: firmado, error: firmaError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(ruta, 600);

    if (firmaError || !firmado?.signedUrl) {
      console.error(
        "[Comprobantes Propietarios] Error firmando comprobante:",
        firmaError,
      );

      return NextResponse.json(
        {
          ok: false,
          codigo: "ERROR_ARCHIVO",
          mensaje: "No fue posible generar el acceso temporal al comprobante.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        url: firmado.signedUrl,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    console.error(
      "[Comprobantes Propietarios] Error inesperado:",
      error?.message || error,
    );

    return NextResponse.json(
      {
        ok: false,
        codigo: "ERROR_INTERNO",
        mensaje: "No fue posible abrir el comprobante en este momento.",
      },
      { status: 500 },
    );
  }
}
