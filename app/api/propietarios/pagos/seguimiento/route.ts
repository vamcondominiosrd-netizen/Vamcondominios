import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "comprobantes-pagos-propietarios";

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
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
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

function enteroPositivo(valor: string | null) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function normalizarEstado(row: Record<string, any>) {
  const estado = String(row.estado || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (row.pago_id || row.aplicado_at || estado.includes("aplicado")) {
    return "APLICADO";
  }

  if (estado.includes("rechaz")) return "RECHAZADO";

  if (
    row.recibido_at ||
    estado.includes("recibido") ||
    estado.includes("validado") ||
    estado.includes("validacion") && !estado.includes("pendiente")
  ) {
    return "RECIBIDO";
  }

  return "ENVIADO";
}

function normalizarRespuesta(data: unknown) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }

  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data[0] &&
    typeof data[0] === "object"
  ) {
    return data[0] as Record<string, unknown>;
  }

  return {} as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    const token = bearerToken(request);
    const { searchParams } = new URL(request.url);
    const condominioId = enteroPositivo(searchParams.get("condominio_id"));
    const unidadId = enteroPositivo(searchParams.get("unidad_id"));

    if (!token || !condominioId || !unidadId) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "DATOS_INVALIDOS",
          mensaje: "No fue posible identificar la propiedad o la sesión.",
        },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();

    // Reutilizamos la misma validación segura empleada al registrar pagos.
    const { data: accesoData, error: accesoError } = await supabase.rpc(
      "vam_propietario_validar_pago_movil",
      {
        p_token: token,
        p_condominio_id: condominioId,
        p_unidad_id: unidadId,
      },
    );

    if (accesoError) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "ERROR_VALIDACION",
          mensaje: "No se pudo validar la sesión del propietario.",
        },
        { status: 500 },
      );
    }

    const acceso = normalizarRespuesta(accesoData);

    if (acceso.ok !== true) {
      const codigo = String(acceso.codigo || "SIN_ACCESO");

      return NextResponse.json(
        {
          ok: false,
          codigo,
          mensaje:
            String(acceso.mensaje || "") ||
            "No tiene acceso a los pagos de esta propiedad.",
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
        },
      );
    }

    const { data, error } = await supabase
      .from("pagos_movil")
      .select("*")
      .eq("condominio_id", condominioId)
      .eq("unidad_id", unidadId)
      .order("id", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "ERROR_LECTURA",
          mensaje: "No fue posible consultar los pagos enviados.",
        },
        { status: 500 },
      );
    }

    const pagos = await Promise.all(
      ((data || []) as Record<string, any>[]).map(async (row) => {
        let comprobanteUrl: string | null = null;

        const ruta = String(row.comprobante_path || "").trim();
        const urlGuardada = String(row.comprobante_url || "").trim();

        if (ruta) {
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(ruta, 60 * 15);

          comprobanteUrl = signed?.signedUrl || null;
        } else if (/^https?:\/\//i.test(urlGuardada)) {
          comprobanteUrl = urlGuardada;
        }

        return {
          id: Number(row.id),
          monto: Number(row.monto || 0),
          concepto: row.concepto || "Pago",
          fecha_pago: row.fecha_pago || null,
          metodo_pago: row.metodo_pago || null,
          banco: row.banco || null,
          referencia: row.referencia || null,
          estado: normalizarEstado(row),
          estado_original: row.estado || null,
          enviado_at:
            row.created_at || row.enviado_at || row.fecha_registro || null,
          recibido_at: row.recibido_at || null,
          revisado_at: row.revisado_at || null,
          aplicado_at: row.aplicado_at || null,
          observacion_revision: row.observacion_revision || null,
          pago_id: row.pago_id ? Number(row.pago_id) : null,
          comprobante_url: comprobanteUrl,
        };
      }),
    );

    return NextResponse.json(
      { ok: true, pagos },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Seguimiento pagos propietario:", error);

    return NextResponse.json(
      {
        ok: false,
        codigo: "ERROR_INTERNO",
        mensaje: "Error interno consultando el seguimiento de pagos.",
      },
      { status: 500 },
    );
  }
}
