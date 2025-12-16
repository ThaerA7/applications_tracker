// lib/supabase/sessionCache.ts
"use client";

import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client";

let cachedSession: Session | null | undefined = undefined;
let inFlight: Promise<Session | null> | null = null;

export function setCachedSession(session: Session | null) {
  cachedSession = session;
}

export async function getSessionCached(): Promise<Session | null> {
  if (cachedSession !== undefined) return cachedSession;

  if (!inFlight) {
    const supabase = getSupabaseClient();

    const p = supabase
      .auth
      .getSession()
      .then(({ data }) => {
        cachedSession = data.session ?? null;
        return cachedSession;
      })
      .catch(() => {
        // If Supabase call fails, treat as no-session rather than leaving callers hanging
        cachedSession = null;
        return null;
      })
      .finally(() => {
        inFlight = null;
      });

    // Protect callers from a hung network request by racing with a short timeout.
    const timeout = new Promise<Session | null>((resolve) =>
      setTimeout(() => resolve(null), 5000)
    );

    inFlight = Promise.race([p, timeout]) as Promise<Session | null>;
  }

  return inFlight;
}

export async function getModeCached(): Promise<"guest" | "user"> {
  const s = await getSessionCached();
  return s?.user ? "user" : "guest";
}
