// lib/supabase/client.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

function getPublicSupabaseEnv() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_DATABASE_SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_DATABASE_SUPABASE_ANON_KEY;

  return { url, key };
}

export function getSupabaseClient(): SupabaseClient {
  const g = globalThis as any;

  if (g.__supabaseBrowserClient) return g.__supabaseBrowserClient;

  const { url, key } = getPublicSupabaseEnv();
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  g.__supabaseBrowserClient = createBrowserClient(url, key);
  return g.__supabaseBrowserClient;
}
