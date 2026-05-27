import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST { client_id, condominio_id, alias_text, unidad_id, unidad_codigo }
export async function POST(req: Request) {
  const b = await req.json();

  const client_id = Number(b.client_id);
  const condominio_id = Number(b.condominio_id);
  const unidad_id = Number(b.unidad_id);
  const unidad_codigo = String(b.unidad_codigo || "").trim();
  const alias_text = String(b.alias_text || "").trim();

  if (!client_id || !condominio_id || !unidad_id || !unidad_codigo || !alias_text) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("bank_aliases")
    .upsert(
      [{ client_id, condominio_id, unidad_id, unidad_codigo, alias_text }],
      { onConflict: "client_id,condominio_id,alias_text" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
