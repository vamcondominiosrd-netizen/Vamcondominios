import { supabase } from "@/app/lib/supabaseClient";

type LineaAsiento = {
  cuenta_id: number;
  debito?: number;
  credito?: number;
  comentario?: string | null;
};

type GenerarAsientoParams = {
  condominio_id: number;
  fecha: string;
  tipo_documento: string;
  referencia?: string | null;
  descripcion: string;
  origen: string;
  origen_id: number;
  usuario?: string | null;
  lineas: LineaAsiento[];
};

export async function generarAsientoAutomatico(params: GenerarAsientoParams) {
  const {
    condominio_id,
    fecha,
    tipo_documento,
    referencia,
    descripcion,
    origen,
    origen_id,
    usuario,
    lineas,
  } = params;

  const lineasValidas = lineas
    .map((linea) => ({
      cuenta_id: linea.cuenta_id,
      debito: Number(linea.debito || 0),
      credito: Number(linea.credito || 0),
      comentario: linea.comentario || null,
    }))
    .filter((linea) => linea.cuenta_id && (linea.debito > 0 || linea.credito > 0));

  if (lineasValidas.length < 2) {
    return {
      ok: false,
      error: "El asiento automático debe tener mínimo dos líneas válidas.",
      asiento_id: null,
    };
  }

  for (const linea of lineasValidas) {
    if (linea.debito > 0 && linea.credito > 0) {
      return {
        ok: false,
        error: "Una línea no puede tener débito y crédito al mismo tiempo.",
        asiento_id: null,
      };
    }
  }

  const totalDebito = lineasValidas.reduce(
    (acc, linea) => acc + Number(linea.debito || 0),
    0
  );

  const totalCredito = lineasValidas.reduce(
    (acc, linea) => acc + Number(linea.credito || 0),
    0
  );

  const diferencia = totalDebito - totalCredito;

  if (Math.abs(diferencia) >= 0.01) {
    return {
      ok: false,
      error: `El asiento automático no está cuadrado. Diferencia: ${diferencia.toFixed(2)}`,
      asiento_id: null,
    };
  }

  const { data: asientoExistente } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("condominio_id", condominio_id)
    .eq("origen", origen)
    .eq("origen_id", origen_id)
    .maybeSingle();

  if (asientoExistente) {
    return {
      ok: true,
      error: null,
      asiento_id: asientoExistente.id,
      duplicado: true,
    };
  }

  const { data: asiento, error: errorAsiento } = await supabase
    .from("contabilidad_asientos")
    .insert({
      condominio_id,
      fecha,
      tipo_documento,
      referencia: referencia || null,
      descripcion,
      estado: "Cuadrado",
      total_debito: totalDebito,
      total_credito: totalCredito,
      origen,
      origen_id,
      usuario: usuario || null,
    })
    .select("id")
    .single();

  if (errorAsiento || !asiento) {
    return {
      ok: false,
      error: errorAsiento?.message || "No se pudo crear la cabecera del asiento.",
      asiento_id: null,
    };
  }

  const detallePayload = lineasValidas.map((linea) => ({
    asiento_id: asiento.id,
    cuenta_id: linea.cuenta_id,
    debito: linea.debito,
    credito: linea.credito,
    comentario: linea.comentario,
  }));

  const { error: errorDetalle } = await supabase
    .from("contabilidad_asientos_detalle")
    .insert(detallePayload);

  if (errorDetalle) {
    await supabase
      .from("contabilidad_asientos")
      .delete()
      .eq("id", asiento.id);

    return {
      ok: false,
      error: errorDetalle.message,
      asiento_id: null,
    };
  }

  return {
    ok: true,
    error: null,
    asiento_id: asiento.id,
    duplicado: false,
  };
}