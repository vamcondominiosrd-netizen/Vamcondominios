import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ColaMensaje = {
  id: number;
  ejecucion_id: number | null;
  agente_id: number;
  plantilla_id: number | null;
  condominio_id: number;
  unidad_id: number;
  propietario_id: number;
  canal: string;
  destino: string;
  asunto: string | null;
  contenido: string;
  estado: string;
  intentos: number;
  maximo_intentos: number;
  clave_deduplicacion: string | null;
  cobros_agentes:
    | {
        modo_envio: "PRUEBA" | "PRODUCCION" | null;
        enviar_copia_admin: boolean | null;
        correo_copia_admin: string | null;
        tipo_copia_admin: "CC" | "CCO" | null;
      }
    | {
        modo_envio: "PRUEBA" | "PRODUCCION" | null;
        enviar_copia_admin: boolean | null;
        correo_copia_admin: string | null;
        tipo_copia_admin: "CC" | "CCO" | null;
      }[]
    | null;
};

function obtenerAgente(mensaje: ColaMensaje) {
  return Array.isArray(mensaje.cobros_agentes)
    ? mensaje.cobros_agentes[0] || null
    : mensaje.cobros_agentes;
}

function escaparHtml(valor: string) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function contenidoAHtml(contenido: string) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;font-size:15px">
      ${escaparHtml(contenido).replace(/\n/g, "<br />")}
    </div>
  `;
}

function respuestaError(mensaje: string, status = 400) {
  return NextResponse.json({ ok: false, error: mensaje }, { status });
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const correoRemitente = process.env.COBROS_EMAIL_FROM;
  const apiSecret = process.env.COBROS_PROCESSOR_SECRET;

  if (!supabaseUrl || !supabaseSecret) {
    return respuestaError(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.",
      500
    );
  }

  if (!resendApiKey || !correoRemitente) {
    return respuestaError(
      "Faltan RESEND_API_KEY y COBROS_EMAIL_FROM en las variables de entorno.",
      500
    );
  }

  if (apiSecret) {
    const recibido = request.headers.get("x-cobros-secret");
    if (recibido !== apiSecret) {
      return respuestaError("No autorizado.", 401);
    }
  }

  let body: { colaId?: number } = {};

  try {
    body = await request.json();
  } catch {
    return respuestaError("Debe enviar un JSON válido con colaId.");
  }

  const colaId = Number(body.colaId || 0);

  if (!colaId) {
    return respuestaError(
      "Para esta primera prueba debe indicar colaId. Ejemplo: { \"colaId\": 34 }"
    );
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: mensajeData, error: mensajeError } = await supabase
    .from("cobros_cola_mensajes")
    .select(
      `
      id,
      ejecucion_id,
      agente_id,
      plantilla_id,
      condominio_id,
      unidad_id,
      propietario_id,
      canal,
      destino,
      asunto,
      contenido,
      estado,
      intentos,
      maximo_intentos,
      clave_deduplicacion,
      cobros_agentes (
        modo_envio,
        enviar_copia_admin,
        correo_copia_admin,
        tipo_copia_admin
      )
    `
    )
    .eq("id", colaId)
    .maybeSingle();

  if (mensajeError) {
    return respuestaError(
      `No se pudo consultar la cola: ${mensajeError.message}`,
      500
    );
  }

  if (!mensajeData) {
    return respuestaError(`No existe el mensaje de cola ${colaId}.`, 404);
  }

  const mensaje = mensajeData as unknown as ColaMensaje;

  if (String(mensaje.canal).toUpperCase() !== "CORREO") {
    return respuestaError("El mensaje seleccionado no pertenece al canal CORREO.");
  }

  if (String(mensaje.estado).toUpperCase() !== "PENDIENTE") {
    return respuestaError(
      `El mensaje ${colaId} no está PENDIENTE. Estado actual: ${mensaje.estado}.`
    );
  }

  if (!mensaje.destino?.trim()) {
    return respuestaError("El mensaje no tiene correo de destino.");
  }

  const agente = obtenerAgente(mensaje);
  const modoEnvio = String(agente?.modo_envio || "PRUEBA").toUpperCase();
  const correoAdmin = agente?.correo_copia_admin?.trim() || "";
  const enviarCopia = Boolean(agente?.enviar_copia_admin);
  const tipoCopia = String(agente?.tipo_copia_admin || "CCO").toUpperCase();

  if (modoEnvio === "PRUEBA" && mensaje.destino.trim() !== correoAdmin) {
    return respuestaError(
      "Seguridad: el agente está en modo PRUEBA, pero el destino no coincide con el correo administrativo."
    );
  }

  const intentosNuevos = Number(mensaje.intentos || 0) + 1;

  const { data: bloqueado, error: bloqueoError } = await supabase
    .from("cobros_cola_mensajes")
    .update({
      estado: "ENVIANDO",
      intentos: intentosNuevos,
      ultimo_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mensaje.id)
    .eq("estado", "PENDIENTE")
    .select("id")
    .maybeSingle();

  if (bloqueoError) {
    return respuestaError(
      `No se pudo reservar el mensaje para envío: ${bloqueoError.message}`,
      500
    );
  }

  if (!bloqueado) {
    return respuestaError(
      "El mensaje ya fue tomado por otro proceso o cambió de estado.",
      409
    );
  }

  const payload: Record<string, unknown> = {
    from: correoRemitente,
    to: [mensaje.destino.trim()],
    subject: mensaje.asunto?.trim() || "Aviso de balance pendiente",
    html: contenidoAHtml(mensaje.contenido),
    text: mensaje.contenido,
    tags: [
      { name: "cola_id", value: String(mensaje.id) },
      { name: "agente_id", value: String(mensaje.agente_id) },
      { name: "condominio_id", value: String(mensaje.condominio_id) },
    ],
  };

  if (
    modoEnvio === "PRODUCCION" &&
    enviarCopia &&
    correoAdmin &&
    correoAdmin.toLowerCase() !== mensaje.destino.trim().toLowerCase()
  ) {
    if (tipoCopia === "CC") {
      payload.cc = [correoAdmin];
    } else {
      payload.bcc = [correoAdmin];
    }
  }

  const solicitudHistorial = {
    from: correoRemitente,
    to: mensaje.destino.trim(),
    cc: payload.cc || null,
    bcc: payload.bcc || null,
    subject: payload.subject,
    modo_envio: modoEnvio,
  };

  try {
    const respuestaResend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key":
          mensaje.clave_deduplicacion || `vam-cobros-cola-${mensaje.id}`,
      },
      body: JSON.stringify(payload),
    });

    const respuestaJson = await respuestaResend.json().catch(() => ({}));

    if (!respuestaResend.ok) {
      const detalle =
        (respuestaJson as any)?.message ||
        (respuestaJson as any)?.error ||
        `Resend respondió HTTP ${respuestaResend.status}.`;

      throw new Error(String(detalle));
    }

    const proveedorMensajeId = String((respuestaJson as any)?.id || "");
    const ahora = new Date().toISOString();

    const { error: historialError } = await supabase
      .from("cobros_envios")
      .insert({
        cola_mensaje_id: mensaje.id,
        agente_id: mensaje.agente_id,
        condominio_id: mensaje.condominio_id,
        unidad_id: mensaje.unidad_id,
        propietario_id: mensaje.propietario_id,
        canal: "CORREO",
        destino: mensaje.destino.trim(),
        proveedor: "RESEND",
        proveedor_mensaje_id: proveedorMensajeId || null,
        estado: "ENVIADO",
        solicitud: solicitudHistorial,
        respuesta: respuestaJson,
        codigo_error: null,
        mensaje_error: null,
        fecha_envio: ahora,
      });

    if (historialError) {
      throw new Error(
        `El correo salió, pero no se pudo registrar en cobros_envios: ${historialError.message}`
      );
    }

    const { error: actualizarError } = await supabase
      .from("cobros_cola_mensajes")
      .update({
        estado: "ENVIADO",
        enviado_at: ahora,
        ultimo_error: null,
        updated_at: ahora,
      })
      .eq("id", mensaje.id);

    if (actualizarError) {
      throw new Error(
        `El correo salió, pero no se pudo actualizar la cola: ${actualizarError.message}`
      );
    }

    return NextResponse.json({
      ok: true,
      cola_id: mensaje.id,
      destino: mensaje.destino.trim(),
      modo_envio: modoEnvio,
      proveedor: "RESEND",
      proveedor_mensaje_id: proveedorMensajeId,
      estado: "ENVIADO",
    });
  } catch (error: any) {
    const detalle = error?.message || "Error desconocido enviando el correo.";
    const agotado =
      intentosNuevos >= Number(mensaje.maximo_intentos || 3);

    await supabase.from("cobros_envios").insert({
      cola_mensaje_id: mensaje.id,
      agente_id: mensaje.agente_id,
      condominio_id: mensaje.condominio_id,
      unidad_id: mensaje.unidad_id,
      propietario_id: mensaje.propietario_id,
      canal: "CORREO",
      destino: mensaje.destino.trim(),
      proveedor: "RESEND",
      proveedor_mensaje_id: null,
      estado: "FALLIDO",
      solicitud: solicitudHistorial,
      respuesta: null,
      codigo_error: "ENVIO_CORREO",
      mensaje_error: detalle,
      fecha_envio: null,
    });

    await supabase
      .from("cobros_cola_mensajes")
      .update({
        estado: agotado ? "ERROR" : "PENDIENTE",
        ultimo_error: detalle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mensaje.id);

    return respuestaError(detalle, 500);
  }
}
