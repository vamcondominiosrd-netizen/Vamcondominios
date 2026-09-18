import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "gastos-documentos";
const TIPOS_RECIBO = [
  "RECIBO_SUPLIDOR", "RECIBO", "RECIBO_PAGO",
  "CONSTANCIA_PAGO", "FACTURA_PAGADA", "CERTIFICACION_PAGO",
];
const TIPOS = ["FACTURA", "CHEQUE", ...TIPOS_RECIBO];

type Enlaces = {
  factura_url: string | null;
  cheque_url: string | null;
  recibo_url: string | null;
};

type Gasto = { id: number; client_id: number | null };
type Documento = {
  id: number;
  gasto_id: number;
  client_id: number | null;
  tipo_documento: string;
  archivo_url: string;
  visible_propietarios: boolean;
};

function errorJson(mensaje: string, status: number) {
  return NextResponse.json(
    { ok: false, mensaje },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return errorJson("Configuración del servidor incompleta.", 500);

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";
    if (token.length < 32 || token.length > 4096) {
      return errorJson("Sesión del propietario inválida.", 401);
    }

    const entrada = await request.json();
    const condominioId = Number(entrada?.condominio_id);
    const unidadId = Number(entrada?.unidad_id);
    const periodo = String(entrada?.periodo || "");
    if (
      !Number.isSafeInteger(condominioId) || condominioId <= 0 ||
      !Number.isSafeInteger(unidadId) || unidadId <= 0 ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)
    ) {
      return errorJson("Parámetros inválidos.", 400);
    }

    // La clave de servicio solo se utiliza en el servidor, nunca en el cliente.
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Este RPC valida el hash del token, la revocación y el vencimiento.
    const { data: sesion, error: errorSesion } = await admin.rpc(
      "validar_sesion_propietario",
      { p_token: token },
    );
    if (errorSesion || sesion?.ok !== true || !Array.isArray(sesion.propiedades)) {
      return errorJson("Sesión del propietario vencida o inválida.", 401);
    }
    const autorizado = sesion.propiedades.some(
      (propiedad: { condominio_id?: unknown; unidad_id?: unknown }) =>
        Number(propiedad.condominio_id) === condominioId &&
        Number(propiedad.unidad_id) === unidadId,
    );
    if (!autorizado) return errorJson("No tiene acceso a esta propiedad.", 403);

    // El portal solo debe exponer gastos de periodos cerrados.
    const { data: cierre, error: errorCierre } = await admin
      .from("banco_cierres_mensuales")
      .select("estado")
      .eq("condominio_id", condominioId)
      .eq("periodo", periodo)
      .limit(1)
      .maybeSingle();
    if (errorCierre) return errorJson("No se pudo verificar el periodo.", 500);
    if (!["cerrado", "cerrada"].includes(String(cierre?.estado || "").trim().toLowerCase())) {
      return errorJson("El periodo no está cerrado.", 403);
    }

    const [anio, mes] = periodo.split("-").map(Number);
    const desde = `${periodo}-01`;
    const hasta = new Date(Date.UTC(anio, mes, 1)).toISOString().slice(0, 10);

    // El servidor determina los gastos autorizados; no acepta IDs arbitrarios.
    const { data: gastos, error: errorGastos } = await admin
      .from("gastos")
      .select("id,client_id")
      .eq("condominio_id", condominioId)
      .or(
        `and(fecha_pago.gte.${desde},fecha_pago.lt.${hasta}),` +
        `and(fecha_pago.is.null,fecha.gte.${desde},fecha.lt.${hasta})`,
      );
    if (errorGastos) return errorJson("No se pudieron verificar los gastos.", 500);
    if (!gastos?.length) {
      return NextResponse.json(
        { ok: true, documentos: {} },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const gastosAutorizados = new Map<number, Gasto>(
      (gastos as Gasto[]).map((g) => [Number(g.id), g]),
    );
    const { data: documentos, error: errorDocumentos } = await admin
      .from("gastos_documentos")
      .select("id,gasto_id,client_id,tipo_documento,archivo_url,visible_propietarios")
      .eq("condominio_id", condominioId)
      .eq("estado", "ACTIVO")
      .in("gasto_id", [...gastosAutorizados.keys()])
      .in("tipo_documento", TIPOS)
      .order("es_principal", { ascending: false })
      .order("created_at", { ascending: false });
    if (errorDocumentos) return errorJson("No se pudieron consultar los soportes.", 500);

    const resultado: Record<string, Enlaces> = {};
    for (const documento of (documentos || []) as Documento[]) {
      const gasto = gastosAutorizados.get(Number(documento.gasto_id));
      if (!gasto) continue;
      // Equivalencia nula de client_id: mismo criterio de integridad del RLS existente.
      if ((gasto.client_id ?? null) !== (documento.client_id ?? null)) continue;

      const esRecibo = TIPOS_RECIBO.includes(documento.tipo_documento);
      // Compatibilidad histórica: los recibos ACTIVOS anteriores tienen false.
      if (!esRecibo && documento.visible_propietarios !== true) continue;
      const campo: keyof Enlaces = esRecibo
        ? "recibo_url"
        : documento.tipo_documento === "FACTURA"
          ? "factura_url" : "cheque_url";
      const clave = String(documento.gasto_id);
      resultado[clave] ??= { factura_url: null, cheque_url: null, recibo_url: null };
      if (resultado[clave][campo]) continue;

      const ruta = String(documento.archivo_url || "").replace(/^\/+/, "");
      if (!ruta || /^https?:\/\//i.test(ruta) || ruta.split("/").includes("..")) continue;
      const { data: firmado, error: errorFirma } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(ruta, 600);
      if (errorFirma || !firmado?.signedUrl) {
        console.error("No se pudo firmar un soporte del gasto:", documento.id);
        continue;
      }
      resultado[clave][campo] = firmado.signedUrl;
    }

    return NextResponse.json(
      { ok: true, documentos: resultado },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return errorJson("No se pudo cargar los soportes.", 500);
  }
}
