"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "incidencias-propietarios";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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

function enteroPositivo(value: FormDataEntryValue | string | null) {
  const numero = Number(value);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

async function validarAcceso(
  supabase: ReturnType<typeof getAdminClient>,
  token: string,
  condominioId: number,
  unidadId: number,
  incidenciaId: number
) {
  const { data, error } = await supabase.rpc(
    "vam_propietario_validar_incidencia_evidencia",
    {
      p_token: token,
      p_condominio_id: condominioId,
      p_unidad_id: unidadId,
      p_incidencia_id: incidenciaId,
    }
  );

  if (error) {
    return {
      ok: false as const,
      status: 500,
      mensaje: "No se pudo validar el acceso a la incidencia.",
    };
  }

  const respuesta =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  if (respuesta.ok !== true) {
    return {
      ok: false as const,
      status: 403,
      mensaje:
        String(respuesta.mensaje || "") ||
        "No tiene acceso a esta incidencia.",
    };
  }

  return { ok: true as const };
}

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request);

    if (!token) {
      return NextResponse.json(
        { ok: false, mensaje: "Sesión no disponible." },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const incidenciaId = enteroPositivo(
      formData.get("incidencia_id")
    );
    const condominioId = enteroPositivo(
      formData.get("condominio_id")
    );
    const unidadId = enteroPositivo(
      formData.get("unidad_id")
    );
    const file = formData.get("file");

    if (
      !incidenciaId ||
      !condominioId ||
      !unidadId ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        { ok: false, mensaje: "Datos de evidencia incompletos." },
        { status: 400 }
      );
    }

    if (!MIME_EXT[file.type]) {
      return NextResponse.json(
        { ok: false, mensaje: "Formato de imagen no permitido." },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "La imagen debe tener un tamaño máximo de 8 MB.",
        },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const acceso = await validarAcceso(
      supabase,
      token,
      condominioId,
      unidadId,
      incidenciaId
    );

    if (!acceso.ok) {
      return NextResponse.json(
        { ok: false, mensaje: acceso.mensaje },
        { status: acceso.status }
      );
    }

    const extension = MIME_EXT[file.type];
    const ruta = `${condominioId}/${unidadId}/${incidenciaId}/${crypto.randomUUID()}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(ruta, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { ok: false, mensaje: "No se pudo guardar la evidencia." },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("incidencias")
      .update({ foto_url: ruta })
      .eq("id", incidenciaId)
      .eq("condominio_id", condominioId)
      .eq("unidad_id", unidadId);

    if (updateError) {
      await supabase.storage.from(BUCKET).remove([ruta]);

      return NextResponse.json(
        {
          ok: false,
          mensaje: "La incidencia fue creada, pero no se pudo vincular la evidencia.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("POST evidencia incidencia:", error);

    return NextResponse.json(
      { ok: false, mensaje: "Error interno procesando la evidencia." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = bearerToken(request);

    if (!token) {
      return NextResponse.json(
        { ok: false, mensaje: "Sesión no disponible." },
        { status: 401 }
      );
    }

    const incidenciaId = enteroPositivo(
      request.nextUrl.searchParams.get("incidencia_id")
    );
    const condominioId = enteroPositivo(
      request.nextUrl.searchParams.get("condominio_id")
    );
    const unidadId = enteroPositivo(
      request.nextUrl.searchParams.get("unidad_id")
    );

    if (!incidenciaId || !condominioId || !unidadId) {
      return NextResponse.json(
        { ok: false, mensaje: "Datos de incidencia incompletos." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const acceso = await validarAcceso(
      supabase,
      token,
      condominioId,
      unidadId,
      incidenciaId
    );

    if (!acceso.ok) {
      return NextResponse.json(
        { ok: false, mensaje: acceso.mensaje },
        { status: acceso.status }
      );
    }

    const { data: incidencia, error } = await supabase
      .from("incidencias")
      .select("foto_url")
      .eq("id", incidenciaId)
      .eq("condominio_id", condominioId)
      .eq("unidad_id", unidadId)
      .maybeSingle();

    if (error || !incidencia?.foto_url) {
      return NextResponse.json(
        { ok: false, mensaje: "La evidencia no está disponible." },
        { status: 404 }
      );
    }

    const foto = String(incidencia.foto_url).trim();

    // Compatibilidad con evidencias antiguas guardadas como URL pública.
    if (/^https?:\/\//i.test(foto)) {
      return NextResponse.json(
        { ok: true, url: foto },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const { data: signed, error: signedError } =
      await supabase.storage
        .from(BUCKET)
        .createSignedUrl(foto, 600);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { ok: false, mensaje: "No se pudo abrir la evidencia." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, url: signed.signedUrl },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("GET evidencia incidencia:", error);

    return NextResponse.json(
      { ok: false, mensaje: "Error interno consultando la evidencia." },
      { status: 500 }
    );
  }
}
