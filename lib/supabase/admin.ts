import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

function getPublicSupabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_DATABASE_SUPABASE_URL;

  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL (required to create admin client)."
    );
  }

  return url;
}

function getServiceRoleKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE;

  if (!key) {
    throw new Error(
      "Missing Supabase service role key. Set SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return key;
}

export function getSupabaseAdminClient(): SupabaseClient {
  const url = getPublicSupabaseUrl();
  const key = getServiceRoleKey();

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
