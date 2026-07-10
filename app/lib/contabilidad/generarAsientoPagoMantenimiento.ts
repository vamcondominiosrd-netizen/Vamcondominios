import { supabase } from "@/app/lib/supabaseClient";
import { generarAsientoAutomatico } from "./generarAsientoAutomatico";

type Params = {
  condominio_id: number;
  pago_id: number;
  fecha: string;
  monto: number;
  referencia?: string | null;
  descripcion?: string | null;
  usuario?: string | null;
};

export async function generarAsientoPagoMantenimiento(params: Params) {
  const {
    condominio_id,
    pago_id,
    fecha,
    monto,
    referencia,
    descripcion,
    usuario,
  } = params;

  if (!condominio_id || !pago_id || !monto || monto <= 0) {
    return {
      ok: false,
      error: "Datos incompletos para generar el asiento del pago.",
      asiento_id: null,
    };
  }

  const { data: config, error } = await supabase
    .from("contabilidad_configuracion")
    .select("cuenta_banco_operativo_id, cuenta_ingreso_mantenimiento_id")
    .eq("condominio_id", condominio_id)
    .maybeSingle();

  if (error || !config) {
    return {
      ok: false,
      error:
        error?.message || "No existe configuración contable para este condominio.",
      asiento_id: null,
    };
  }

  if (
    !config.cuenta_banco_operativo_id ||
    !config.cuenta_ingreso_mantenimiento_id
  ) {
    return {
      ok: false,
      error:
        "Faltan cuentas contables configuradas para pagos de mantenimiento.",
      asiento_id: null,
    };
  }

  return await generarAsientoAutomatico({
    condominio_id,
    fecha,
    tipo_documento: "PAGO_MANTENIMIENTO",
    referencia: referencia || `PAGO-${pago_id}`,
    descripcion:
      descripcion || `Pago de mantenimiento registrado automáticamente #${pago_id}`,
    origen: "PAGO_MANTENIMIENTO",
    origen_id: pago_id,
    usuario: usuario || null,
    lineas: [
      {
        cuenta_id: config.cuenta_banco_operativo_id,
        debito: monto,
        comentario: "Entrada de dinero por pago de mantenimiento",
      },
      {
        cuenta_id: config.cuenta_ingreso_mantenimiento_id,
        credito: monto,
        comentario: "Ingreso por cuota de mantenimiento",
      },
    ],
  });
}