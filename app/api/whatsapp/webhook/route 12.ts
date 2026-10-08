import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan credenciales administrativas de Supabase.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function verificarFirma(rawBody: string, firmaRecibida: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret) {
    throw new Error("WHATSAPP_APP_SECRET no está configurado en Vercel.");
  }

  if (!firmaRecibida?.startsWith("sha256=")) return false;

  const esperada =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(esperada);
  const b = Buffer.from(firmaRecibida);

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function timestampMetaAISO(valor: unknown) {
  const segundos = Number(valor || 0);
  if (!Number.isFinite(segundos) || segundos <= 0) {
    return new Date().toISOString();
  }
  return new Date(segundos * 1000).toISOString();
}

function estadoVAM(estadoMeta: string) {
  switch (estadoMeta.toLowerCase()) {
    case "sent":
      return "ENVIADO";
    case "delivered":
      return "ENTREGADO";
    case "read":
      return "LEIDO";
    case "failed":
      return "FALLIDO";
    default:
      return null;
  }
}

function rangoEstado(estado?: string | null) {
  switch (String(estado || "").toUpperCase()) {
    case "PENDIENTE":
    case "REINTENTO":
    case "PROCESANDO":
      return 0;
    case "ENVIADO":
      return 1;
    case "ENTREGADO":
      return 2;
    case "LEIDO":
      return 3;
    case "FALLIDO":
      return 4;
    default:
      return 0;
  }
}

function extraerError(status: any) {
  const error = Array.isArray(status?.errors) ? status.errors[0] : null;
  const detalle =
    error?.error_data?.details ||
    error?.details ||
    error?.message ||
    error?.title ||
    null;

  return {
    codigo: error?.code != null ? String(error.code) : null,
    titulo: error?.title ? String(error.title) : null,
    detalle: detalle ? String(detalle) : null,
  };
}

// Meta usa este GET para verificar el Callback URL.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

  if (!verifyToken) {
    return new NextResponse("Webhook verify token no configurado", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// Meta envía aquí los estados sent/delivered/read/failed.
export async function POST(request: NextRequest) {
  let rawBody = "";

  try {
    rawBody = await request.text();

    const firma = request.headers.get("x-hub-signature-256");
    if (!verificarFirma(rawBody, firma)) {
      return json({ ok: false, mensaje: "Firma de Meta no válida." }, 401);
    }

    const payload = JSON.parse(rawBody || "{}");

    /*
     * Meta puede entregar dos formas durante nuestras pruebas:
     *
     * 1) Webhook real de producción:
     *    { object, entry: [{ changes: [{ field: "messages", value: {...} }] }] }
     *
     * 2) Ejemplo enviado desde "Test" en el dashboard:
     *    { field: "messages", value: {...} }
     *
     * Normalizamos ambas formas para que el mismo procesador maneje pruebas
     * y eventos reales.
     */
    const changesNormalizados: Array<{
      entryId: string | null;
      field: string;
      value: any;
    }> = [];

    if (payload?.object === "whatsapp_business_account") {
      for (const entry of payload?.entry || []) {
        for (const change of entry?.changes || []) {
          changesNormalizados.push({
            entryId: entry?.id ? String(entry.id) : null,
            field: String(change?.field || ""),
            value: change?.value || {},
          });
        }
      }
    } else if (payload?.field && payload?.value) {
      // Forma simplificada usada por el probador de Webhooks de Meta.
      changesNormalizados.push({
        entryId: null,
        field: String(payload.field || ""),
        value: payload.value || {},
      });
    }

    // Meta espera una respuesta rápida 200 incluso si no hay eventos relevantes.
    if (changesNormalizados.length === 0) {
      return json({ ok: true, procesados: 0, ignorados: 1 });
    }

    const admin = getSupabaseAdmin();
    let procesados = 0;
    let sinRelacion = 0;
    let errores = 0;

    for (const change of changesNormalizados) {
      if (change.field !== "messages") continue;

      const value = change.value || {};
      const statuses = Array.isArray(value?.statuses) ? value.statuses : [];

      for (const status of statuses) {
          try {
            const metaMessageId = String(status?.id || "").trim();
            const estadoMeta = String(status?.status || "").trim().toLowerCase();
            const telefono = status?.recipient_id
              ? String(status.recipient_id)
              : null;
            const timestampISO = timestampMetaAISO(status?.timestamp);
            const errorInfo = extraerError(status);

            if (!metaMessageId || !estadoMeta) continue;

            const { data: cola, error: colaError } = await admin
              .from("cobros_cola_mensajes")
              .select("id,condominio_id,estado,meta_message_id")
              .eq("meta_message_id", metaMessageId)
              .maybeSingle();

            if (colaError) throw new Error(colaError.message);

            const { data: evento, error: eventoError } = await admin
              .from("whatsapp_webhook_eventos")
              .insert({
                condominio_id: cola?.condominio_id || null,
                cola_mensaje_id: cola?.id || null,
                meta_message_id: metaMessageId,
                telefono,
                tipo_evento: "STATUS",
                estado_meta: estadoMeta,
                timestamp_meta: timestampISO,
                error_codigo: errorInfo.codigo,
                error_titulo: errorInfo.titulo,
                error_detalle: errorInfo.detalle,
                payload: {
                  object: payload?.object || null,
                  entry_id: change.entryId,
                  metadata: value?.metadata || null,
                  status,
                },
                procesado: Boolean(cola),
              })
              .select("id")
              .single();

            if (eventoError) throw new Error(eventoError.message);

            if (!cola) {
              sinRelacion += 1;
              continue;
            }

            const nuevoEstado = estadoVAM(estadoMeta);
            const cambios: Record<string, unknown> = {
              meta_estado: estadoMeta,
              updated_at: new Date().toISOString(),
            };

            if (errorInfo.codigo) cambios.meta_error_codigo = errorInfo.codigo;
            if (errorInfo.detalle) cambios.meta_error_detalle = errorInfo.detalle;

            if (nuevoEstado === "FALLIDO") {
              cambios.estado = "FALLIDO";
              cambios.ultimo_error =
                errorInfo.detalle || errorInfo.titulo || "Meta reportó el mensaje como fallido.";
            } else if (
              nuevoEstado &&
              rangoEstado(nuevoEstado) >= rangoEstado(cola.estado)
            ) {
              cambios.estado = nuevoEstado;

              if (nuevoEstado === "ENVIADO") cambios.enviado_at = timestampISO;
              if (nuevoEstado === "ENTREGADO") cambios.entregado_at = timestampISO;
              if (nuevoEstado === "LEIDO") cambios.leido_at = timestampISO;
            }

            const { error: updateError } = await admin
              .from("cobros_cola_mensajes")
              .update(cambios)
              .eq("id", cola.id);

            if (updateError) throw new Error(updateError.message);

            if (evento?.id) {
              await admin
                .from("whatsapp_webhook_eventos")
                .update({ procesado: true })
                .eq("id", evento.id);
            }

            procesados += 1;
          } catch (error) {
            errores += 1;
            console.error("Error procesando status de WhatsApp:", error);
          }
      }
    }

    return json({ ok: true, procesados, sin_relacion: sinRelacion, errores });
  } catch (error: any) {
    console.error("Webhook WhatsApp error:", error);
    return json(
      {
        ok: false,
        mensaje: error?.message || "Error interno procesando webhook de WhatsApp.",
      },
      500
    );
  }
}
