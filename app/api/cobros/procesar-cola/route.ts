import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AgenteEnvio = {
  modo_envio: "PRUEBA" | "PRODUCCION" | null;
  enviar_copia_admin: boolean | null;
  correo_copia_admin: string | null;
  tipo_copia_admin: "CC" | "CCO" | null;
};

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
  cobros_agentes: AgenteEnvio | AgenteEnvio[] | null;
};

type ResultadoMensaje = {
  cola_id: number;
  ok: boolean;
  estado: string;
  destino?: string;
  proveedor_mensaje_id?: string;
  error?: string;
};

function obtenerAgente(mensaje: ColaMensaje): AgenteEnvio | null {
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

async function cargarMensaje(
  supabase: SupabaseClient,
  colaId: number
): Promise<ColaMensaje | null> {
  const { data, error } = await supabase
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

  if (error) {
    throw new Error(`No se pudo consultar la cola: ${error.message}`);
  }

  return (data as unknown as ColaMensaje) || null;
}

async function procesarMensaje(params: {
  supabase: SupabaseClient;
  mensaje: ColaMensaje;
  resendApiKey: string;
  correoRemitente: string;
}): Promise<ResultadoMensaje> {
  const { supabase, mensaje, resendApiKey, correoRemitente } = params;

  if (String(mensaje.canal).toUpperCase() !== "CORREO") {
    return {
      cola_id: mensaje.id,
      ok: false,
      estado: mensaje.estado,
      error: "El mensaje no pertenece al canal CORREO.",
    };
  }

  const estadoActual = String(mensaje.estado).toUpperCase();

  if (!["PENDIENTE", "REINTENTO"].includes(estadoActual)) {
    return {
      cola_id: mensaje.id,
      ok: false,
      estado: estadoActual,
      error: `El mensaje no está disponible para envío. Estado: ${estadoActual}.`,
    };
  }

  if (!mensaje.destino?.trim()) {
    return {
      cola_id: mensaje.id,
      ok: false,
      estado: estadoActual,
      error: "El mensaje no tiene correo de destino.",
    };
  }

  const agente = obtenerAgente(mensaje);
  const modoEnvio = String(agente?.modo_envio || "PRUEBA").toUpperCase();
  const correoAdmin = agente?.correo_copia_admin?.trim() || "";
  const enviarCopia = Boolean(agente?.enviar_copia_admin);
  const tipoCopia = String(agente?.tipo_copia_admin || "CCO").toUpperCase();

  if (
    modoEnvio === "PRUEBA" &&
    mensaje.destino.trim().toLowerCase() !== correoAdmin.toLowerCase()
  ) {
    return {
      cola_id: mensaje.id,
      ok: false,
      estado: estadoActual,
      error:
        "Seguridad: el agente está en modo PRUEBA y el destino no coincide con el correo administrativo.",
    };
  }

  const intentosNuevos = Number(mensaje.intentos || 0) + 1;

  const { data: bloqueado, error: bloqueoError } = await supabase
    .from("cobros_cola_mensajes")
    .update({
      estado: "PROCESANDO",
      intentos: intentosNuevos,
      ultimo_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mensaje.id)
    .eq("estado", estadoActual)
    .select("id")
    .maybeSingle();

  if (bloqueoError) {
    return {
      cola_id: mensaje.id,
      ok: false,
      estado: estadoActual,
      error: `No se pudo reservar el mensaje: ${bloqueoError.message}`,
    };
  }

  if (!bloqueado) {
    return {
      cola_id: mensaje.id,
      ok: false,
      estado: estadoActual,
      error: "El mensaje fue tomado por otro proceso o cambió de estado.",
    };
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
        `El correo salió, pero no se pudo registrar el historial: ${historialError.message}`
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

    return {
      cola_id: mensaje.id,
      ok: true,
      estado: "ENVIADO",
      destino: mensaje.destino.trim(),
      proveedor_mensaje_id: proveedorMensajeId,
    };
  } catch (error: any) {
    const detalle = error?.message || "Error desconocido enviando el correo.";
    const agotado =
      intentosNuevos >= Number(mensaje.maximo_intentos || 3);
    const estadoError = agotado ? "FALLIDO" : "REINTENTO";

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
        estado: estadoError,
        ultimo_error: detalle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mensaje.id);

    return {
      cola_id: mensaje.id,
      ok: false,
      estado: estadoError,
      destino: mensaje.destino.trim(),
      error: detalle,
    };
  }
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
      "Faltan RESEND_API_KEY y COBROS_EMAIL_FROM.",
      500
    );
  }

  if (apiSecret) {
    const recibido = request.headers.get("x-cobros-secret");
    if (recibido !== apiSecret) {
      return respuestaError("No autorizado.", 401);
    }
  }

  let body: {
    colaId?: number;
    limite?: number;
    condominioId?: number;
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const colaId = Number(body.colaId || 0);
  const limiteSolicitado = Number(body.limite || 10);
  const limite = Math.min(Math.max(limiteSolicitado, 1), 25);
  const condominioId = Number(body.condominioId || 0);

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    let mensajes: ColaMensaje[] = [];

    if (colaId) {
      const mensaje = await cargarMensaje(supabase, colaId);

      if (!mensaje) {
        return respuestaError(`No existe el mensaje de cola ${colaId}.`, 404);
      }

      mensajes = [mensaje];
    } else {
      let consulta = supabase
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
        .eq("canal", "CORREO")
        .in("estado", ["PENDIENTE", "REINTENTO"])
        .lte("programado_para", new Date().toISOString())
        .order("programado_para", { ascending: true })
        .order("id", { ascending: true })
        .limit(limite);

      if (condominioId) {
        consulta = consulta.eq("condominio_id", condominioId);
      }

      const { data, error } = await consulta;

      if (error) {
        return respuestaError(
          `No se pudo consultar la cola pendiente: ${error.message}`,
          500
        );
      }

      mensajes = (data || []) as unknown as ColaMensaje[];
    }

    if (mensajes.length === 0) {
      return NextResponse.json({
        ok: true,
        procesados: 0,
        enviados: 0,
        fallidos: 0,
        mensaje: "No hay correos pendientes para procesar.",
        resultados: [],
      });
    }

    const resultados: ResultadoMensaje[] = [];

    for (const mensaje of mensajes) {
      const resultado = await procesarMensaje({
        supabase,
        mensaje,
        resendApiKey,
        correoRemitente,
      });

      resultados.push(resultado);
    }

    const enviados = resultados.filter((item) => item.ok).length;
    const fallidos = resultados.length - enviados;

    return NextResponse.json({
      ok: fallidos === 0,
      modo: colaId ? "INDIVIDUAL" : "LOTE",
      procesados: resultados.length,
      enviados,
      fallidos,
      resultados,
    });
  } catch (error: any) {
    return respuestaError(
      error?.message || "Error procesando la cola de cobros.",
      500
    );
  }
}
