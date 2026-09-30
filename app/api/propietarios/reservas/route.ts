
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NUEVO = "comprobantes-reservas-propietarios";
const BUCKETS_LECTURA = [
  "comprobantes-reservas-propietarios",
  "comprobantes-reservas",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
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

function texto(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function respuestaRpc(data: unknown) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }

  return {};
}

async function validarSesionPropiedad(
  supabase: ReturnType<typeof getAdminClient>,
  token: string,
  condominioId: number,
  unidadId: number
) {
  const { data, error } = await supabase.rpc(
    "vam_propietario_reservas_contexto",
    {
      p_token: token,
      p_condominio_id: condominioId,
      p_unidad_id: unidadId,
    }
  );

  if (error) {
    return {
      ok: false as const,
      status: 500,
      codigo: "ERROR_VALIDACION",
      mensaje: "No se pudo validar la sesión del propietario.",
    };
  }

  const resultado = respuestaRpc(data);

  if (resultado.ok !== true) {
    const codigo = String(resultado.codigo || "SIN_ACCESO");

    return {
      ok: false as const,
      status: [
        "SESION_INVALIDA",
        "SESION_VENCIDA",
        "CUENTA_INACTIVA",
        "CAMBIO_CLAVE_PENDIENTE",
        "SIN_ACCESO",
      ].includes(codigo)
        ? 401
        : 403,
      codigo,
      mensaje:
        String(resultado.mensaje || "") ||
        "No tiene acceso a esta propiedad.",
    };
  }

  return { ok: true as const };
}

export async function POST(request: NextRequest) {
  let rutaSubida = "";

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

    const formData = await request.formData();

    const condominioId = enteroPositivo(
      formData.get("condominio_id")
    );
    const unidadId = enteroPositivo(
      formData.get("unidad_id")
    );
    const areaSocialId = enteroPositivo(
      formData.get("area_social_id")
    );

    const fechaReserva = texto(formData.get("fecha_reserva"));
    const horaInicio = texto(formData.get("hora_inicio"));
    const horaFin = texto(formData.get("hora_fin"));
    const motivo = texto(formData.get("motivo"));
    const cantidadPersonas = Number(
      texto(formData.get("cantidad_personas")) || "0"
    );
    const montoPagado = Number(
      texto(formData.get("monto_pagado")) || "0"
    );

    const file = formData.get("file");

    if (
      !condominioId ||
      !unidadId ||
      !areaSocialId ||
      !fechaReserva ||
      !horaInicio ||
      !horaFin ||
      !motivo ||
      !Number.isFinite(cantidadPersonas) ||
      cantidadPersonas < 0 ||
      !Number.isFinite(montoPagado) ||
      montoPagado < 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "DATOS_INVALIDOS",
          mensaje: "Los datos de la reserva están incompletos o no son válidos.",
        },
        { status: 400 }
      );
    }

    if (file !== null && !(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "COMPROBANTE_INVALIDO",
          mensaje: "El comprobante no es válido.",
        },
        { status: 400 }
      );
    }

    if (file instanceof File) {
      if (!MIME_EXT[file.type]) {
        return NextResponse.json(
          {
            ok: false,
            codigo: "COMPROBANTE_INVALIDO",
            mensaje: "El comprobante debe ser PDF, JPG, PNG o WEBP.",
          },
          { status: 400 }
        );
      }

      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            ok: false,
            codigo: "COMPROBANTE_INVALIDO",
            mensaje: "El comprobante no puede superar 10 MB.",
          },
          { status: 400 }
        );
      }
    }

    const supabase = getAdminClient();

    // Validar sesión/propiedad antes de aceptar un archivo.
    const acceso = await validarSesionPropiedad(
      supabase,
      token,
      condominioId,
      unidadId
    );

    if (!acceso.ok) {
      return NextResponse.json(
        {
          ok: false,
          codigo: acceso.codigo,
          mensaje: acceso.mensaje,
        },
        { status: acceso.status }
      );
    }

    if (file instanceof File) {
      const extension = MIME_EXT[file.type];

      rutaSubida =
        `${condominioId}/${unidadId}/` +
        `${fechaReserva.slice(0, 7)}/` +
        `${crypto.randomUUID()}.${extension}`;

      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NUEVO)
        .upload(rutaSubida, buffer, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          {
            ok: false,
            codigo: "ERROR_COMPROBANTE",
            mensaje: "No se pudo guardar el comprobante de la reserva.",
          },
          { status: 500 }
        );
      }
    }

    const { data: reservaData, error: reservaError } =
      await supabase.rpc("vam_propietario_crear_reserva", {
        p_token: token,
        p_condominio_id: condominioId,
        p_unidad_id: unidadId,
        p_area_social_id: areaSocialId,
        p_fecha_reserva: fechaReserva,
        p_hora_inicio: horaInicio,
        p_hora_fin: horaFin,
        p_motivo: motivo,
        p_cantidad_personas: Math.trunc(cantidadPersonas),
        p_monto_pagado: montoPagado,
        p_comprobante_path: rutaSubida || null,
      });

    if (reservaError) {
      if (rutaSubida) {
        await supabase.storage.from(BUCKET_NUEVO).remove([rutaSubida]);
      }

      return NextResponse.json(
        {
          ok: false,
          codigo: "ERROR_REGISTRO",
          mensaje: "No se pudo registrar la reserva.",
        },
        { status: 500 }
      );
    }

    const reserva = respuestaRpc(reservaData);

    if (reserva.ok !== true) {
      if (rutaSubida) {
        await supabase.storage.from(BUCKET_NUEVO).remove([rutaSubida]);
      }

      return NextResponse.json(
        {
          ok: false,
          codigo: String(reserva.codigo || "RESERVA_RECHAZADA"),
          mensaje:
            String(reserva.mensaje || "") ||
            "No se pudo registrar la reserva.",
        },
        { status: 400 }
      );
    }

    // El comprobante queda ligado a la reserva y no debe eliminarse
    // si posteriormente la solicitud es rechazada o anulada.
    return NextResponse.json(
      {
        ok: true,
        codigo: "OK",
        mensaje:
          String(reserva.mensaje || "") ||
          "Reserva enviada correctamente. Quedará pendiente de aprobación.",
        reserva_id: reserva.reserva_id,
        estado: reserva.estado,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("POST reserva propietario:", error);

    return NextResponse.json(
      {
        ok: false,
        codigo: "ERROR_INTERNO",
        mensaje: "Error interno procesando la reserva.",
      },
      { status: 500 }
    );
  }
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

    const reservaId = enteroPositivo(
      request.nextUrl.searchParams.get("reserva_id")
    );
    const condominioId = enteroPositivo(
      request.nextUrl.searchParams.get("condominio_id")
    );
    const unidadId = enteroPositivo(
      request.nextUrl.searchParams.get("unidad_id")
    );

    if (!reservaId || !condominioId || !unidadId) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "CONTEXTO_INVALIDO",
          mensaje: "Datos de reserva incompletos.",
        },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data: accesoData, error: accesoError } =
      await supabase.rpc("vam_propietario_validar_reserva", {
        p_token: token,
        p_condominio_id: condominioId,
        p_unidad_id: unidadId,
        p_reserva_id: reservaId,
      });

    if (accesoError) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "ERROR_VALIDACION",
          mensaje: "No se pudo validar el acceso a la reserva.",
        },
        { status: 500 }
      );
    }

    const acceso = respuestaRpc(accesoData);

    if (acceso.ok !== true) {
      const codigo = String(acceso.codigo || "SIN_ACCESO");

      return NextResponse.json(
        {
          ok: false,
          codigo,
          mensaje:
            String(acceso.mensaje || "") ||
            "No tiene acceso a esta reserva.",
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

    const { data: reserva, error: reservaError } = await supabase
      .from("reservas_areas_sociales")
      .select("comprobante_url")
      .eq("id", reservaId)
      .maybeSingle();

    if (reservaError || !reserva?.comprobante_url) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "SIN_COMPROBANTE",
          mensaje: "El comprobante no está disponible.",
        },
        { status: 404 }
      );
    }

    const comprobante = String(reserva.comprobante_url).trim();

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

    for (const bucket of BUCKETS_LECTURA) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(comprobante, 600);

      if (!error && data?.signedUrl) {
        return NextResponse.json(
          {
            ok: true,
            codigo: "OK",
            url: data.signedUrl,
          },
          {
            status: 200,
            headers: { "Cache-Control": "no-store" },
          }
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        codigo: "COMPROBANTE_NO_DISPONIBLE",
        mensaje: "No se pudo abrir el comprobante.",
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("GET comprobante reserva propietario:", error);

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
