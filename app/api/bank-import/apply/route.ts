import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST { import_id }
export async function POST(req: Request) {
  const body = await req.json();
  const impId = Number(body.import_id);

  if (!impId) {
    return NextResponse.json({ error: "import_id requerido" }, { status: 400 });
  }

  // 1) Transacciones del import
  const { data: txs, error: txErr } = await supabaseAdmin
    .from("bank_transactions")
    .select("id, fecha, monto, referencia, descripcion, client_id, condominio_id")
    .eq("import_id", impId);

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });
  if (!txs || txs.length === 0) {
    return NextResponse.json({ error: "No hay transacciones para este import" }, { status: 400 });
  }

  const txIds = txs.map((t) => t.id);

  // 2) Matches (solo los OK)
  const { data: ms, error: mErr } = await supabaseAdmin
    .from("bank_matches")
    .select("transaction_id, unidad_id, estado")
    .in("transaction_id", txIds);

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const matchMap = new Map<number, any>();
  (ms || []).forEach((m) => matchMap.set(Number(m.transaction_id), m));

  // 3) Preparar pagos a insertar
  const pagosToInsert = [];
  for (const t of txs) {
    const m = matchMap.get(Number(t.id));
    if (!m || m.estado !== "OK" || !m.unidad_id) continue;

    pagosToInsert.push({
      client_id: t.client_id,
      condominio_id: t.condominio_id,
      unidad_id: m.unidad_id,
      fecha_pago: t.fecha,
      monto: t.monto,
      referencia: t.referencia,
      descripcion: t.descripcion, // ✅ requiere columna descripcion en pagos
      bank_transaction_id: t.id,  // recomendado si existe la columna (si no existe, bórrala)
    });
  }

  if (pagosToInsert.length === 0) {
    return NextResponse.json({ error: "No hay filas OK para aplicar" }, { status: 400 });
  }

  // 4) Insertar pagos
  const { error: pErr } = await supabaseAdmin.from("pagos").insert(pagosToInsert);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // 5) Marcar import como aplicado (si tienes columna status)
  await supabaseAdmin.from("bank_imports").update({ status: "APPLIED" }).eq("id", impId);

  return NextResponse.json({ ok: true, inserted: pagosToInsert.length });
}
