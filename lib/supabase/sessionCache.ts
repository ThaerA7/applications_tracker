"use client";

import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client";

let cachedSession: Session | null | undefined = undefined;
let inFlight: Promise<Session | null> | null = null;

const LAST_USER_ID_KEY = "job-tracker:last-user-id";
let lastKnownUserId: string | null = null;

export function setCachedSession(session: Session | null) {
  cachedSession = session;

  const userId = session?.user?.id ?? null;
  if (userId) {
    lastKnownUserId = userId;
    try {
      window.localStorage?.setItem(LAST_USER_ID_KEY, userId);
    } catch {
      // ignore
    }
  }
}

export function getLastKnownUserId(): string | null {
  if (lastKnownUserId) return lastKnownUserId;
  try {
    const v = window.localStorage?.getItem(LAST_USER_ID_KEY);
    if (v && typeof v === "string") {
      lastKnownUserId = v;
      return v;
    }
  } catch {
    // ignore
  }
  return null;
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

export async function getUserIdCached(): Promise<string | null> {
  const s = await getSessionCached();
  return s?.user?.id ?? null;
}
