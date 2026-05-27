import { createClient } from "@supabase/supabase-js";

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}

function requireSupabaseClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase env vars faltantes (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }
  return client;
}

export const supabase = new Proxy(
  {} as ReturnType<typeof createClient>,
  {
    get(_target, prop) {
      const client = requireSupabaseClient() as any;
      return client[prop];
    },
  }
);
