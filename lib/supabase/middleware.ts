// lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, key } = getPublicSupabaseEnv();

  // If env vars are missing, skip auth checks gracefully
  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Keep this pattern to avoid random logouts with SSR
  await supabase.auth.getClaims();

  // ✅ Make all pages accessible (UI gate only)
  return supabaseResponse;
}
