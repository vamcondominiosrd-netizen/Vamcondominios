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
  const lineasValidas = params.lineas
    .map((linea) => ({
      cuenta_id: linea.cuenta_id,
      debito: Number(linea.debito || 0),
      credito: Number(linea.credito || 0),
      comentario: linea.comentario || null,
    }))
    .filter(
      (linea) => linea.cuenta_id && (linea.debito > 0 || linea.credito > 0)
    );

  if (lineasValidas.length < 2) {
    return {
      ok: false,
      error: "El asiento automático debe tener mínimo dos líneas válidas.",
      asiento_id: null,
    };
  }

  const totalDebito = lineasValidas.reduce(
    (acc, linea) => acc + linea.debito,
    0
  );

  const totalCredito = lineasValidas.reduce(
    (acc, linea) => acc + linea.credito,
    0
  );

  if (Math.abs(totalDebito - totalCredito) >= 0.01) {
    return {
      ok: false,
      error: "El asiento automático no está cuadrado.",
      asiento_id: null,
    };
  }

  const { data: existente } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("condominio_id", params.condominio_id)
    .eq("origen", params.origen)
    .eq("origen_id", params.origen_id)
    .maybeSingle();

  if (existente) {
    return {
      ok: true,
      error: null,
      asiento_id: existente.id,
      duplicado: true,
    };
  }

  const { data: asiento, error: errorAsiento } = await supabase
    .from("contabilidad_asientos")
    .insert({
      condominio_id: params.condominio_id,
      fecha: params.fecha,
      tipo_documento: params.tipo_documento,
      referencia: params.referencia || null,
      descripcion: params.descripcion,
      estado: "Cuadrado",
      total_debito: totalDebito,
      total_credito: totalCredito,
      origen: params.origen,
      origen_id: params.origen_id,
      usuario: params.usuario || null,
    })
    .select("id")
    .single();

  if (errorAsiento || !asiento) {
    return {
      ok: false,
      error: errorAsiento?.message || "No se pudo crear el asiento.",
      asiento_id: null,
    };
  }

  const detalle = lineasValidas.map((linea) => ({
    asiento_id: asiento.id,
    cuenta_id: linea.cuenta_id,
    debito: linea.debito,
    credito: linea.credito,
    comentario: linea.comentario,
  }));

  const { error: errorDetalle } = await supabase
    .from("contabilidad_asientos_detalle")
    .insert(detalle);

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