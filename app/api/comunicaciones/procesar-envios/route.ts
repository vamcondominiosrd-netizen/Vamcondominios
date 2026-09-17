import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const runtime = "nodejs";

type Envio = {
  id: number;
  comunicacion_id: number;
  condominio_id: number;
  unidad_id: number | null;
  periodo: string | null;
  canal: "EMAIL" | "WHATSAPP";
  destino: string;
  payload: {
    titulo?: string;
    mensaje?: string;
    propietario?: string;
    unidad?: string;
    periodo?: string;
    periodo_texto?: string;
    monto?: number;
    fecha_vencimiento?: string | null;
  } | null;
};

function escaparHtml(valor: string) {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textoAHtml(valor: string) {
  return escaparHtml(valor).replace(/\n/g, "<br />");
}

function moneda(valor?: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function fechaWhatsApp(valor?: string | null) {
  if (!valor) return "Por confirmar";
  const fecha = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleDateString("es-DO");
}

function normalizarTelefonoWhatsApp(valor: string) {
  let digitos = valor.replace(/\D/g, "");

  // Números dominicanos almacenados como 809/829/849 + 7 dígitos.
  if (
    digitos.length === 10 &&
    (digitos.startsWith("809") ||
      digitos.startsWith("829") ||
      digitos.startsWith("849"))
  ) {
    digitos = `1${digitos}`;
  }

  return digitos;
}

async function marcar(
  service: ReturnType<typeof createClient>,
  id: number,
  cambios: Record<string, unknown>,
) {
  await service
    .from("comunicaciones_envios")
    .update({
      ...cambios,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Falta configuración de Supabase en las variables de entorno del servidor.",
        },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!token) {
      return NextResponse.json(
        { ok: false, mensaje: "Sesión administrativa no disponible." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const condominioId = Number(body?.condominio_id || 0);
    const periodo = String(body?.periodo || "");
    const unidadId =
      body?.unidad_id === null || body?.unidad_id === undefined
        ? null
        : Number(body.unidad_id);

    if (!condominioId || !/^\d{4}-\d{2}$/.test(periodo)) {
      return NextResponse.json(
        { ok: false, mensaje: "Parámetros inválidos." },
        { status: 400 },
      );
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: autorizado, error: errorPermiso } =
      await authClient.rpc("vam_puede_gestionar_comunicaciones", {
        p_condominio_id: condominioId,
      });

    if (errorPermiso || autorizado !== true) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "No tiene permisos para procesar estas comunicaciones.",
        },
        { status: 403 },
      );
    }

    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    let query = service
      .from("comunicaciones_envios")
      .select(
        "id,comunicacion_id,condominio_id,unidad_id,periodo,canal,destino,payload",
      )
      .eq("condominio_id", condominioId)
      .eq("periodo", periodo)
      .eq("estado", "PENDIENTE")
      .in("canal", ["EMAIL", "WHATSAPP"])
      .order("id", { ascending: true })
      .limit(200);

    if (unidadId) {
      query = query.eq("unidad_id", unidadId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: `No se pudieron consultar los envíos pendientes: ${error.message}`,
        },
        { status: 500 },
      );
    }

    const envios = (data || []) as Envio[];

    if (envios.length === 0) {
      return NextResponse.json({
        ok: true,
        procesados: 0,
        enviados: 0,
        fallidos: 0,
        pendientes_configuracion: 0,
        mensaje: "No hay envíos externos pendientes.",
      });
    }

    let enviados = 0;
    let fallidos = 0;
    let pendientesConfiguracion = 0;

    // ----------------------------------------------------------
    // EMAIL - RESEND
    // ----------------------------------------------------------
    const emails = envios.filter((envio) => envio.canal === "EMAIL");

    if (emails.length > 0) {
      const resendKey = process.env.RESEND_API_KEY;
      const from = process.env.VAM_EMAIL_FROM;

      if (!resendKey || !from) {
        pendientesConfiguracion += emails.length;
      } else {
        for (const envio of emails) {
          await marcar(service, envio.id, {
            estado: "ENVIANDO",
            intentos: 1,
          });
        }

        const lote = emails.map((envio) => ({
          from,
          to: [envio.destino],
          subject:
            envio.payload?.titulo ||
            "Recordatorio de cuota de mantenimiento",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#172033;line-height:1.6">
              <div style="background:#0f2f63;color:white;padding:22px;border-radius:16px 16px 0 0">
                <div style="font-size:12px;opacity:.85">VAM Administración de Condominios</div>
                <h2 style="margin:6px 0 0;font-size:21px">Recordatorio de cuota</h2>
              </div>
              <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 16px 16px">
                <div style="font-size:15px">
                  ${textoAHtml(
                    envio.payload?.mensaje ||
                      "Tiene una nueva comunicación disponible en VAM.",
                  )}
                </div>
                <div style="margin-top:24px;padding:14px;background:#f8fafc;border-radius:12px;font-size:12px;color:#64748b">
                  Esta comunicación también está disponible en su portal VAM.
                </div>
              </div>
            </div>
          `,
        }));

        const ids = emails.map((envio) => envio.id).join(",");
        const idempotencyKey = `vam-${createHash("sha256")
          .update(`${condominioId}|${periodo}|${ids}`)
          .digest("hex")
          .slice(0, 48)}`;

        try {
          const respuesta = await fetch(
            "https://api.resend.com/emails/batch",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
                "User-Agent": "VAM-Condominios/1.0",
                "Idempotency-Key": idempotencyKey,
              },
              body: JSON.stringify(lote),
            },
          );

          const resultado = await respuesta.json().catch(() => ({}));

          if (!respuesta.ok) {
            const detalle =
              resultado?.message ||
              resultado?.error?.message ||
              `HTTP ${respuesta.status}`;

            for (const envio of emails) {
              await marcar(service, envio.id, {
                estado: "FALLIDO",
                error_envio: String(detalle).slice(0, 1500),
              });
              fallidos += 1;
            }
          } else {
            const resultados = Array.isArray(resultado?.data)
              ? resultado.data
              : [];

            for (let i = 0; i < emails.length; i += 1) {
              const envio = emails[i];
              const providerId = resultados[i]?.id || null;

              await marcar(service, envio.id, {
                estado: "ENVIADO",
                provider_message_id: providerId,
                error_envio: null,
                enviado_at: new Date().toISOString(),
              });

              enviados += 1;
            }
          }
        } catch (errorEmail) {
          const detalle =
            errorEmail instanceof Error
              ? errorEmail.message
              : "Error desconocido de Resend.";

          for (const envio of emails) {
            await marcar(service, envio.id, {
              estado: "FALLIDO",
              error_envio: detalle.slice(0, 1500),
            });
            fallidos += 1;
          }
        }
      }
    }

    // ----------------------------------------------------------
    // WHATSAPP - META CLOUD API
    // ----------------------------------------------------------
    const whatsapps = envios.filter(
      (envio) => envio.canal === "WHATSAPP",
    );

    if (whatsapps.length > 0) {
      const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
      const graphVersion = process.env.META_GRAPH_VERSION;
      const templateName = process.env.VAM_WHATSAPP_TEMPLATE_NAME;
      const languageCode =
        process.env.VAM_WHATSAPP_TEMPLATE_LANGUAGE || "es_DO";

      if (
        !accessToken ||
        !phoneNumberId ||
        !graphVersion ||
        !templateName
      ) {
        pendientesConfiguracion += whatsapps.length;
      } else {
        for (const envio of whatsapps) {
          const telefono = normalizarTelefonoWhatsApp(envio.destino);

          if (!telefono) {
            await marcar(service, envio.id, {
              estado: "FALLIDO",
              intentos: 1,
              error_envio: "Número de WhatsApp inválido.",
            });
            fallidos += 1;
            continue;
          }

          await marcar(service, envio.id, {
            estado: "ENVIANDO",
            intentos: 1,
          });

          const parametros = [
            envio.payload?.propietario || "Propietario(a)",
            envio.payload?.unidad || "",
            envio.payload?.periodo_texto ||
              envio.payload?.periodo ||
              periodo,
            moneda(envio.payload?.monto),
            fechaWhatsApp(envio.payload?.fecha_vencimiento),
          ];

          try {
            const respuesta = await fetch(
              `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: telefono,
                  type: "template",
                  template: {
                    name: templateName,
                    language: {
                      code: languageCode,
                    },
                    components: [
                      {
                        type: "body",
                        parameters: parametros.map((texto) => ({
                          type: "text",
                          text: String(texto),
                        })),
                      },
                    ],
                  },
                }),
              },
            );

            const resultado = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok) {
              const detalle =
                resultado?.error?.message ||
                `HTTP ${respuesta.status}`;

              await marcar(service, envio.id, {
                estado: "FALLIDO",
                error_envio: String(detalle).slice(0, 1500),
              });
              fallidos += 1;
              continue;
            }

            const providerId =
              resultado?.messages?.[0]?.id || null;

            await marcar(service, envio.id, {
              estado: "ENVIADO",
              provider_message_id: providerId,
              error_envio: null,
              enviado_at: new Date().toISOString(),
            });

            enviados += 1;
          } catch (errorWhatsApp) {
            const detalle =
              errorWhatsApp instanceof Error
                ? errorWhatsApp.message
                : "Error desconocido de WhatsApp.";

            await marcar(service, envio.id, {
              estado: "FALLIDO",
              error_envio: detalle.slice(0, 1500),
            });

            fallidos += 1;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      procesados: envios.length,
      enviados,
      fallidos,
      pendientes_configuracion: pendientesConfiguracion,
      mensaje:
        pendientesConfiguracion > 0
          ? "Las comunicaciones fueron creadas. Algunos canales externos quedan pendientes de configurar."
          : "Procesamiento de canales externos completado.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          error instanceof Error
            ? error.message
            : "Error inesperado procesando los canales externos.",
      },
      { status: 500 },
    );
  }
}
