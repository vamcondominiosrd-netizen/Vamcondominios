export const runtime = "edge";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({
      server_supabase_url: url ?? null,
      has_service_role_key: hasService,
      bank_transactions_count_seen_by_server: null,
      error: "Supabase env vars faltantes (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    });
  }

  const { count, error } = await supabaseAdmin
    .from("bank_transactions")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    server_supabase_url: url,
    has_service_role_key: hasService,
    bank_transactions_count_seen_by_server: count ?? null,
    error: error?.message ?? null,
  });
}
