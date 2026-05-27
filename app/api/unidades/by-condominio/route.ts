export const runtime = "edge";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

// GET /api/unidades/by-condominio?condominio_id=1
export async function GET(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase env vars faltantes (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }
  const { searchParams } = new URL(req.url);
  const condominio_id = Number(searchParams.get("condominio_id"));

  if (!condominio_id) {
    return NextResponse.json(
      { error: "condominio_id inválido" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("unidades")
    .select("id, codigo")
    .eq("condominio_id", condominio_id)
    .order("codigo", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ unidades: data || [] });
}
