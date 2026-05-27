export const runtime = "edge";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

// POST { transaction_id, unidad_id, unidad_codigo }
export async function POST(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase env vars faltantes (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }
  const body = await req.json();

  const transaction_id = Number(body.transaction_id);
  const unidad_id = Number(body.unidad_id);
  const unidad_codigo = String(body.unidad_codigo || "").trim();

  if (!transaction_id || !unidad_id || !unidad_codigo) {
    return NextResponse.json(
      { error: "transaction_id, unidad_id y unidad_codigo son requeridos" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("bank_matches")
    .update({
      unidad_id: unidad_id,
      unidad_codigo: unidad_codigo,
      estado: "OK",
      confianza: "ALTA",
      nota: "MANUAL",
    })
    .eq("transaction_id", transaction_id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
