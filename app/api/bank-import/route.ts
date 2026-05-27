import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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
