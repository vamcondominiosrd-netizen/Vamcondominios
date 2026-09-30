
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "comprobantes-pagos-propietarios";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
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

function enteroPositivo(value: FormDataEntryValue | null) {
  const numero = Number(value);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function texto(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
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

    const concepto = texto(formData.get("concepto"));
    const monto = Number(texto(formData.get("monto")));
    const fechaPago = texto(formData.get("fecha_pago"));
    const metodoPago = texto(formData.get("metodo_pago"));
    const banco = texto(formData.get("banco"));
    const referencia = texto(formData.get("referencia"));
    const file = formData.get("file");

    if (
      !condominioId ||
      !unidadId ||
      !concepto ||
      !Number.isFinite(monto) ||
      monto <= 0 ||
      !fechaPago ||
      !metodoPago ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "DATOS_INVALIDOS",
          mensaje: "Los datos del pago están incompletos.",
        },
        { status: 400 }
      );
    }

    if (!MIME_EXT[file.type]) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "COMPROBANTE_INVALIDO",
          mensaje: "El comprobante debe ser JPG, PNG, WEBP o PDF.",
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

    const supabase = getAdminClient();

    // Validar sesión y propiedad ANTES de aceptar el archivo.
    const { data: accesoData, error: accesoError } =
      await supabase.rpc("vam_propietario_validar_pago_movil", {
        p_token: token,
        p_condominio_id: condominioId,
        p_unidad_id: unidadId,
      });

    if (accesoError) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "ERROR_VALIDACION",
          mensaje: "No se pudo validar la sesión del propietario.",
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
            "No tiene acceso para registrar pagos en esta propiedad.",
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

    const extension = MIME_EXT[file.type];

    rutaSubida =
      `${condominioId}/${unidadId}/` +
      `${new Date().getFullYear()}/` +
      `${crypto.randomUUID()}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
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
          mensaje: "No se pudo guardar el comprobante del pago.",
        },
        { status: 500 }
      );
    }

    // La RPC valida nuevamente la sesión y deriva propietario/unidad.
    const { data: pagoData, error: pagoError } =
      await supabase.rpc("vam_propietario_crear_pago_movil", {
        p_token: token,
        p_condominio_id: condominioId,
        p_unidad_id: unidadId,
        p_concepto: concepto,
        p_monto: monto,
        p_fecha_pago: fechaPago,
        p_metodo_pago: metodoPago,
        p_banco: banco,
        p_referencia: referencia,
        p_comprobante_path: rutaSubida,
      });

    if (pagoError) {
      // No hay pago creado; retirar archivo huérfano.
      await supabase.storage.from(BUCKET).remove([rutaSubida]);

      return NextResponse.json(
        {
          ok: false,
          codigo: "ERROR_REGISTRO",
          mensaje: "No se pudo registrar el pago.",
        },
        { status: 500 }
      );
    }

    const pago =
      pagoData &&
      typeof pagoData === "object" &&
      !Array.isArray(pagoData)
        ? (pagoData as Record<string, unknown>)
        : {};

    if (pago.ok !== true) {
      // La RPC rechazó el registro; no conservar un archivo sin pago.
      await supabase.storage.from(BUCKET).remove([rutaSubida]);

      return NextResponse.json(
        {
          ok: false,
          codigo: String(pago.codigo || "PAGO_RECHAZADO"),
          mensaje:
            String(pago.mensaje || "") ||
            "No se pudo registrar el pago.",
        },
        { status: 400 }
      );
    }

    // A partir de aquí NO se elimina el comprobante.
    // Debe conservarse aunque posteriormente el pago sea rechazado/anulado.
    return NextResponse.json(
      {
        ok: true,
        codigo: "OK",
        mensaje:
          String(pago.mensaje || "") ||
          "Pago enviado correctamente. Quedará pendiente de validación.",
        pago_id: pago.pago_id,
        estado: pago.estado,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Registrar pago propietario:", error);

    return NextResponse.json(
      {
        ok: false,
        codigo: "ERROR_INTERNO",
        mensaje: "Error interno procesando el pago.",
      },
      { status: 500 }
    );
  }
}
