
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "gastos-documentos";

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

function respuestaRpc(data: unknown) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }

  return {};
}

function extraerRutaStorage(valor: string) {
  const texto = valor.trim();

  if (!texto) return "";

  if (!/^https?:\/\//i.test(texto)) {
    return texto.startsWith(`${BUCKET}/`)
      ? texto.slice(BUCKET.length + 1)
      : texto.replace(/^\/+/, "");
  }

  try {
    const url = new URL(texto);
    const marcadores = [
      `/storage/v1/object/public/${BUCKET}/`,
      `/storage/v1/object/sign/${BUCKET}/`,
      `/storage/v1/object/${BUCKET}/`,
    ];

    for (const marcador of marcadores) {
      const pos = url.pathname.indexOf(marcador);

      if (pos >= 0) {
        return decodeURIComponent(
          url.pathname.slice(pos + marcador.length)
        );
      }
    }
  } catch {
    return "";
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

    const gastoId = enteroPositivo(
      request.nextUrl.searchParams.get("gasto_id")
    );
    const condominioId = enteroPositivo(
      request.nextUrl.searchParams.get("condominio_id")
    );
    const unidadId = enteroPositivo(
      request.nextUrl.searchParams.get("unidad_id")
    );

    const tipo = String(
      request.nextUrl.searchParams.get("tipo") || ""
    )
      .trim()
      .toLowerCase();

    if (
      !gastoId ||
      !condominioId ||
      !unidadId ||
      !["factura", "cheque"].includes(tipo)
    ) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "CONTEXTO_INVALIDO",
          mensaje: "Los datos del documento están incompletos.",
        },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // La misma RPC que abre el detalle valida:
    // token + cuenta + propiedad + gasto + período cerrado.
    const { data: accesoData, error: accesoError } =
      await supabase.rpc("vam_propietario_detalle_gasto", {
        p_token: token,
        p_condominio_id: condominioId,
        p_unidad_id: unidadId,
        p_gasto_id: gastoId,
      });

    if (accesoError) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "ERROR_VALIDACION",
          mensaje: "No se pudo validar el acceso al documento.",
        },
        { status: 500 }
      );
    }

    const acceso = respuestaRpc(accesoData);

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
            "No tiene acceso a este documento.",
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

    // Service role únicamente en servidor.
    const { data: gasto, error: gastoError } = await supabase
      .from("gastos")
      .select("factura_url,cheque_url")
      .eq("id", gastoId)
      .eq("condominio_id", condominioId)
      .maybeSingle();

    if (gastoError || !gasto) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "DOCUMENTO_NO_DISPONIBLE",
          mensaje: "El documento no está disponible.",
        },
        { status: 404 }
      );
    }

    const almacenado = String(
      tipo === "factura"
        ? gasto.factura_url || ""
        : gasto.cheque_url || ""
    ).trim();

    if (!almacenado) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SIN_DOCUMENTO",
          mensaje:
            tipo === "factura"
              ? "Este gasto no tiene factura disponible."
              : "Este gasto no tiene cheque o comprobante disponible.",
        },
        { status: 404 }
      );
    }

    const ruta = extraerRutaStorage(almacenado);

    if (ruta) {
      const { data: signed, error: signedError } =
        await supabase.storage
          .from(BUCKET)
          .createSignedUrl(ruta, 600);

      if (!signedError && signed?.signedUrl) {
        return NextResponse.json(
          {
            ok: true,
            codigo: "OK",
            url: signed.signedUrl,
          },
          {
            status: 200,
            headers: { "Cache-Control": "no-store" },
          }
        );
      }
    }

    // Compatibilidad con documentos históricos que aún estén
    // registrados como una URL externa/pública.
    if (/^https?:\/\//i.test(almacenado)) {
      return NextResponse.json(
        {
          ok: true,
          codigo: "OK",
          url: almacenado,
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        codigo: "DOCUMENTO_NO_DISPONIBLE",
        mensaje: "No se pudo abrir el documento.",
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("GET soporte gasto propietario:", error);

    return NextResponse.json(
      {
        ok: false,
        codigo: "ERROR_INTERNO",
        mensaje: "Error interno consultando el documento.",
      },
      { status: 500 }
    );
  }
}
