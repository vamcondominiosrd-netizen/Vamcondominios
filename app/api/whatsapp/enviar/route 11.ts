import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EstadoProcesable = "PENDIENTE" | "REINTENTO" | "FALLIDO";

type ColaMensaje = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  propietario_id: number;
  plantilla_id: number | null;
  canal: string;
  destino: string;
  contenido: string;
  balance_vencido: number | string | null;
  cantidad_periodos: number | null;
  periodo_inicial: string | null;
  periodo_final: string | null;
  dias_vencido: number | null;
  programado_para: string | null;
  estado: EstadoProcesable | string;
  intentos: number | null;
  maximo_intentos: number | null;
};

type MetaTemplateConfig = {
  name: string;
  language?: string;
  variables?: string[];
};

function jsonError(status: number, mensaje: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, mensaje, ...extra }, { status });
}

function normalizarTelefonoWhatsApp(valor: string) {
  let digitos = String(valor || "").replace(/\D/g, "");

  // República Dominicana / NANP: si llega un número local de 10 dígitos,
  // agrega el código de país 1. Los números internacionales ya completos
  // se conservan sin el signo +, como requiere Meta en el campo "to".
  if (digitos.length === 10) digitos = `1${digitos}`;

  if (digitos.length < 11 || digitos.length > 15) {
    throw new Error("El número de WhatsApp no tiene un formato internacional válido.");
  }

  return digitos;
}

function dinero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function leerTemplateMap(): Record<string, MetaTemplateConfig> {
  const raw = process.env.WHATSAPP_TEMPLATE_MAP_JSON?.trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("El mapa debe ser un objeto JSON.");
    }
    return parsed as Record<string, MetaTemplateConfig>;
  } catch (error: any) {
    throw new Error(
      `WHATSAPP_TEMPLATE_MAP_JSON no es válido: ${error?.message || "JSON inválido"}`
    );
  }
}

function configuracionProveedor() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION?.trim();
  const modo = (process.env.WHATSAPP_SEND_MODE || "TEMPLATE")
    .trim()
    .toUpperCase();

  if (!accessToken || !phoneNumberId || !graphVersion) {
    throw new Error(
      "WhatsApp no está configurado. Faltan WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_GRAPH_VERSION en Vercel."
    );
  }

  if (!['TEMPLATE', 'TEXT'].includes(modo)) {
    throw new Error("WHATSAPP_SEND_MODE debe ser TEMPLATE o TEXT.");
  }

  return { accessToken, phoneNumberId, graphVersion, modo };
}

function resolverTemplate(plantillaId: number | null): MetaTemplateConfig {
  const mapa = leerTemplateMap();
  const porId = plantillaId != null ? mapa[String(plantillaId)] : undefined;
  const porDefecto = mapa.default;

  const name =
    porId?.name ||
    porDefecto?.name ||
    process.env.WHATSAPP_DEFAULT_TEMPLATE_NAME?.trim() ||
    "";

  const language =
    porId?.language ||
    porDefecto?.language ||
    process.env.WHATSAPP_DEFAULT_TEMPLATE_LANGUAGE?.trim() ||
    "es";

  const variables =
    porId?.variables ||
    porDefecto?.variables ||
    (process.env.WHATSAPP_TEMPLATE_VARIABLES || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  if (!name) {
    throw new Error(
      "No hay una plantilla de Meta configurada para este mensaje. Configure WHATSAPP_TEMPLATE_MAP_JSON o WHATSAPP_DEFAULT_TEMPLATE_NAME."
    );
  }

  return { name, language, variables };
}

async function usuarioAutorizado(
  admin: ReturnType<typeof createClient>,
  userId: string,
  condominioId: number
) {
  const { data: superAdmin } = await admin
    .from("super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .eq("activo", true)
    .maybeSingle();

  if (superAdmin) return true;

  const [{ data: profile }, { data: condominio }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, active, role, client_id")
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("condominios")
      .select("id, client_id, empresa_id")
      .eq("id", condominioId)
      .maybeSingle(),
  ]);

  if (!profile || profile.active !== true || !condominio) return false;

  const condoClient = Number(condominio.client_id || condominio.empresa_id || 0);
  if (
    String(profile.role || "").toUpperCase() === "ADMIN" &&
    Number(profile.client_id || 0) === condoClient
  ) {
    return true;
  }

  const { data: acceso } = await admin
    .from("usuarios_condominios")
    .select("id")
    .eq("user_id", userId)
    .eq("condominio_id", condominioId)
    .eq("activo", true)
    .maybeSingle();

  return Boolean(acceso);
}

async function contextoMensaje(
  admin: ReturnType<typeof createClient>,
  item: ColaMensaje
) {
  const [{ data: unidad }, { data: propietario }] = await Promise.all([
    admin
      .from("unidades")
      .select("codigo, propietario_nombre")
      .eq("id", item.unidad_id)
      .eq("condominio_id", item.condominio_id)
      .maybeSingle(),
    admin
      .from("propietarios_apartamentos")
      .select("nombre_propietario")
      .eq("id", item.propietario_id)
      .eq("condominio_id", item.condominio_id)
      .maybeSingle(),
  ]);

  return {
    propietario:
      propietario?.nombre_propietario ||
      unidad?.propietario_nombre ||
      "Propietario(a)",
    unidad: unidad?.codigo || String(item.unidad_id),
    balance: `RD$ ${dinero(item.balance_vencido)}`,
    periodo_inicial: item.periodo_inicial || "-",
    periodo_final: item.periodo_final || "-",
    dias_vencido: String(item.dias_vencido || 0),
    cantidad_periodos: String(item.cantidad_periodos || 0),
  };
}

function valorVariable(
  nombre: string,
  contexto: Awaited<ReturnType<typeof contextoMensaje>>
) {
  const clave = nombre.trim().toLowerCase();
  const valores: Record<string, string> = {
    propietario: contexto.propietario,
    unidad: contexto.unidad,
    balance: contexto.balance,
    periodo_inicial: contexto.periodo_inicial,
    periodo_final: contexto.periodo_final,
    dias_vencido: contexto.dias_vencido,
    cantidad_periodos: contexto.cantidad_periodos,
  };

  if (!(clave in valores)) {
    throw new Error(`Variable de plantilla no soportada: ${nombre}`);
  }

  return valores[clave];
}

async function enviarAMeta(
  admin: ReturnType<typeof createClient>,
  item: ColaMensaje
) {
  const config = configuracionProveedor();
  const to = normalizarTelefonoWhatsApp(item.destino);
  const url = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;

  let body: Record<string, unknown>;

  if (config.modo === "TEXT") {
    if (!item.contenido.trim()) {
      throw new Error("El mensaje no tiene contenido para enviar.");
    }

    body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: item.contenido,
      },
    };
  } else {
    const template = resolverTemplate(item.plantilla_id);
    const contexto = await contextoMensaje(admin, item);
    const parametros = (template.variables || []).map((variable) => ({
      type: "text",
      text: valorVariable(variable, contexto),
    }));

    body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language || "es" },
        ...(parametros.length
          ? {
              components: [
                {
                  type: "body",
                  parameters: parametros,
                },
              ],
            }
          : {}),
      },
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const metaMensaje =
      data?.error?.message ||
      data?.error?.error_user_msg ||
      `Meta respondió HTTP ${response.status}.`;
    throw new Error(metaMensaje);
  }

  return {
    meta_message_id: data?.messages?.[0]?.id || null,
    respuesta: data,
  };
}

async function procesarMensaje(
  admin: ReturnType<typeof createClient>,
  item: ColaMensaje
) {
  if (item.canal !== "WHATSAPP") {
    return { ok: false, omitido: true, mensaje: "El mensaje no pertenece al canal WHATSAPP." };
  }

  if (!["PENDIENTE", "REINTENTO", "FALLIDO"].includes(item.estado)) {
    return { ok: false, omitido: true, mensaje: `Estado no procesable: ${item.estado}.` };
  }

  // Valida la configuración antes de cambiar el estado de la cola.
  // Si faltan credenciales, el mensaje permanece pendiente/reintento/fallido.
  configuracionProveedor();
  if ((process.env.WHATSAPP_SEND_MODE || "TEMPLATE").toUpperCase() === "TEMPLATE") {
    resolverTemplate(item.plantilla_id);
  }

  const siguienteIntento = Number(item.intentos || 0) + 1;
  const now = new Date().toISOString();

  const { data: bloqueado, error: bloqueoError } = await admin
    .from("cobros_cola_mensajes")
    .update({
      estado: "PROCESANDO",
      ultimo_error: null,
      updated_at: now,
    })
    .eq("id", item.id)
    .eq("condominio_id", item.condominio_id)
    .in("estado", ["PENDIENTE", "REINTENTO", "FALLIDO"])
    .select("id")
    .maybeSingle();

  if (bloqueoError) throw new Error(bloqueoError.message);
  if (!bloqueado) {
    return { ok: false, omitido: true, mensaje: "El mensaje ya fue tomado por otro proceso." };
  }

  try {
    const resultadoMeta = await enviarAMeta(admin, item);

    const { error: enviadoError } = await admin
      .from("cobros_cola_mensajes")
      .update({
        estado: "ENVIADO",
        intentos: siguienteIntento,
        enviado_at: new Date().toISOString(),
        ultimo_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("condominio_id", item.condominio_id);

    if (enviadoError) throw new Error(enviadoError.message);

    return {
      ok: true,
      cola_id: item.id,
      meta_message_id: resultadoMeta.meta_message_id,
    };
  } catch (error: any) {
    const maximo = Number(item.maximo_intentos || 0);
    const agotado = maximo > 0 && siguienteIntento >= maximo;

    await admin
      .from("cobros_cola_mensajes")
      .update({
        estado: "FALLIDO",
        intentos: siguienteIntento,
        ultimo_error: `${agotado ? "Máximo de intentos alcanzado. " : ""}${
          error?.message || "Error enviando WhatsApp."
        }`.slice(0, 1500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("condominio_id", item.condominio_id);

    return {
      ok: false,
      cola_id: item.id,
      error: error?.message || "Error enviando WhatsApp.",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonError(
        500,
        "El servidor no tiene configuradas las credenciales administrativas de Supabase."
      );
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!token) {
      return jsonError(401, "Debe iniciar sesión para enviar mensajes.");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData.user;

    if (userError || !user) {
      return jsonError(401, "La sesión no es válida o expiró.");
    }

    const body = await request.json().catch(() => ({}));
    const colaId = Number(body?.cola_id || 0);
    const condominioId = Number(body?.condominio_id || 0);
    const procesarPendientes = body?.procesar_pendientes === true;
    const forzar = body?.forzar === true;

    if (!condominioId) {
      return jsonError(400, "Debe indicar el condominio.");
    }

    const permitido = await usuarioAutorizado(admin, user.id, condominioId);
    if (!permitido) {
      return jsonError(403, "No tiene autorización para enviar mensajes de este condominio.");
    }

    // Valida la configuración global antes de tomar registros de la cola.
    try {
      configuracionProveedor();
    } catch (error: any) {
      return jsonError(503, error?.message || "WhatsApp no está configurado.");
    }

    if (procesarPendientes) {
      const ahora = new Date().toISOString();
      const { data, error } = await admin
        .from("cobros_cola_mensajes")
        .select(
          "id,condominio_id,unidad_id,propietario_id,plantilla_id,canal,destino,contenido,balance_vencido,cantidad_periodos,periodo_inicial,periodo_final,dias_vencido,programado_para,estado,intentos,maximo_intentos"
        )
        .eq("condominio_id", condominioId)
        .eq("canal", "WHATSAPP")
        .in("estado", ["PENDIENTE", "REINTENTO"])
        .lte("programado_para", ahora)
        .order("programado_para", { ascending: true })
        .limit(50);

      if (error) return jsonError(500, error.message);

      const items = (data || []) as ColaMensaje[];
      if (items.length === 0) {
        return NextResponse.json({
          ok: true,
          enviados: 0,
          fallidos: 0,
          omitidos: 0,
          mensaje: "No hay mensajes de WhatsApp pendientes para procesar ahora.",
        });
      }

      let enviados = 0;
      let fallidos = 0;
      let omitidos = 0;

      for (const item of items) {
        const resultado = await procesarMensaje(admin, item);
        if (resultado.ok) enviados += 1;
        else if (resultado.omitido) omitidos += 1;
        else fallidos += 1;
      }

      return NextResponse.json({
        ok: true,
        enviados,
        fallidos,
        omitidos,
        mensaje: `Proceso completado. Enviados: ${enviados}. Fallidos: ${fallidos}. Omitidos: ${omitidos}.`,
      });
    }

    if (!colaId) {
      return jsonError(400, "Debe indicar el mensaje de la cola que desea enviar.");
    }

    const { data, error } = await admin
      .from("cobros_cola_mensajes")
      .select(
        "id,condominio_id,unidad_id,propietario_id,plantilla_id,canal,destino,contenido,balance_vencido,cantidad_periodos,periodo_inicial,periodo_final,dias_vencido,programado_para,estado,intentos,maximo_intentos"
      )
      .eq("id", colaId)
      .eq("condominio_id", condominioId)
      .maybeSingle();

    if (error) return jsonError(500, error.message);
    if (!data) return jsonError(404, "El mensaje de la cola no existe.");

    const item = data as ColaMensaje;

    if (
      !forzar &&
      item.programado_para &&
      new Date(item.programado_para).getTime() > Date.now()
    ) {
      return jsonError(409, "El mensaje todavía no ha llegado a su fecha/hora programada.");
    }

    const resultado = await procesarMensaje(admin, item);

    if (!resultado.ok) {
      return jsonError(
        resultado.omitido ? 409 : 502,
        resultado.mensaje || resultado.error || "No se pudo enviar el mensaje.",
        { resultado }
      );
    }

    return NextResponse.json({
      ok: true,
      cola_id: item.id,
      meta_message_id: resultado.meta_message_id || null,
      mensaje: "WhatsApp enviado correctamente.",
    });
  } catch (error: any) {
    return jsonError(500, error?.message || "Error interno procesando WhatsApp.");
  }
}
