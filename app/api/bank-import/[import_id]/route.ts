export const runtime = "edge";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

function getImportIdFromUrl(req: Request): number | null {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["api","bank-import","1"]
    const maybe = parts[parts.length - 1];
    const n = Number(maybe);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase env vars faltantes (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }
  const import_id = getImportIdFromUrl(req);

  if (!import_id) {
    return NextResponse.json({ error: "import_id inválido" }, { status: 400 });
  }

  const { data: txs, error: txErr } = await supabaseAdmin
    .from("bank_transactions")
    .select("id, fecha, monto, referencia, descripcion, condominio_id")
    .eq("import_id", import_id)
    .order("id", { ascending: true });

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });
  if (!txs || txs.length === 0) return NextResponse.json({ rows: [] });

  const txIds = txs.map((t) => t.id);

  const { data: ms, error: mErr } = await supabaseAdmin
    .from("bank_matches")
    .select("transaction_id, unidad_codigo, estado, confianza, nota")
    .in("transaction_id", txIds);

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const map = new Map<number, any>();
  (ms || []).forEach((m) => map.set(Number(m.transaction_id), m));

  const rows = txs.map((t) => {
    const m = map.get(Number(t.id));
    return {
      transaction_id: t.id,
      fecha: t.fecha,
      monto: t.monto,
      referencia: t.referencia,
      descripcion: t.descripcion,
      condominio_id: (t as any).condominio_id,
      unidad_codigo: m?.unidad_codigo ?? null,
      estado: m?.estado ?? "REVISAR",
      confianza: m?.confianza ?? "BAJA",
      nota: m?.nota ?? null,
    };
  });

  return NextResponse.json({ rows });
}
