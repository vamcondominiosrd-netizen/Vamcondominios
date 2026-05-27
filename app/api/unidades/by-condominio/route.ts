import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/unidades/by-condominio?condominio_id=1
export async function GET(req: Request) {
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
