"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { idbGet, idbSet, idbDel } from "./indexedDb";
import type { WithdrawnRecord } from "@/app/withdrawn/WithdrawnCard";

export type WithdrawnApplication = WithdrawnRecord;
export type WithdrawnStorageMode = "guest" | "user";

const GUEST_LOCAL_KEY = "job-tracker:withdrawn";
const GUEST_IDB_KEY = "withdrawn";

const TABLE = "applications";
const BUCKET = "withdrawn";
const COUNTS_EVENT = "job-tracker:refresh-counts";

function notifyCountsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COUNTS_EVENT));
}

// ---------- safe parsing (defensive) ----------

function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function safeParseList(raw: any): WithdrawnApplication[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x) => isObject(x) && typeof x.id === "string"
  ) as WithdrawnApplication[];
}

// ---------- guest storage ----------

async function loadGuestWithdrawn(): Promise<WithdrawnApplication[]> {
  // Prefer IDB
  try {
    const idb = await idbGet<WithdrawnApplication[]>(GUEST_IDB_KEY);
    if (idb) return safeParseList(idb);
  } catch {}

  // Fallback localStorage
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_LOCAL_KEY);
    return safeParseList(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

async function saveGuestWithdrawn(list: WithdrawnApplication[]) {
  // Try IDB
  try {
    await idbSet(GUEST_IDB_KEY, list);
  } catch {}

  // Also mirror to localStorage (cheap backup)
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_LOCAL_KEY, JSON.stringify(list));
  } catch {}
}

async function clearGuestWithdrawn() {
  try {
    await idbDel(GUEST_IDB_KEY);
  } catch {}
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_LOCAL_KEY);
  } catch {}
}

// ---------- user storage (Supabase) ----------

async function loadUserWithdrawn(): Promise<WithdrawnApplication[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, data")
    .eq("bucket", BUCKET)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load withdrawn from Supabase:", error.message);
    return [];
  }

  const mapped = (data ?? []).map((row: any) => ({ ...(row.data ?? {}), id: row.id }),
  );

  return safeParseList(mapped);
}

async function upsertUserWithdrawn(app: WithdrawnApplication) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from(TABLE)
    .upsert(
      {
        id: app.id,
        bucket: BUCKET,
        data: app,
      },
      { onConflict: "id" }
    );

  if (error) {
    console.error("Failed to upsert withdrawn in Supabase:", error.message);
  }
}

async function deleteUserWithdrawn(id: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("bucket", BUCKET);

  if (error) {
    console.error("Failed to delete withdrawn in Supabase:", error.message);
  }
}

// ---------- mode detection ----------

export async function detectWithdrawnMode(): Promise<WithdrawnStorageMode> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user ? "user" : "guest";
}

// ---------- public API ----------

export async function loadWithdrawn(): Promise<{
  mode: WithdrawnStorageMode;
  items: WithdrawnApplication[];
}> {
  const mode = await detectWithdrawnMode();
  const items =
    mode === "user" ? await loadUserWithdrawn() : await loadGuestWithdrawn();
  return { mode, items };
}

export async function upsertWithdrawn(
  app: WithdrawnApplication,
  mode: WithdrawnStorageMode
) {
  if (mode === "user") {
    await upsertUserWithdrawn(app);
  } else {
    const prev = await loadGuestWithdrawn();
    const idx = prev.findIndex((x) => x.id === app.id);
    const next =
      idx === -1
        ? [app, ...prev]
        : prev.map((x) => (x.id === app.id ? app : x));

    await saveGuestWithdrawn(next);
  }

  notifyCountsChanged();
}

export async function deleteWithdrawn(
  id: string,
  mode: WithdrawnStorageMode
) {
  if (mode === "user") {
    await deleteUserWithdrawn(id);
  } else {
    const prev = await loadGuestWithdrawn();
    const next = prev.filter((x) => x.id !== id);
    await saveGuestWithdrawn(next);
  }

  notifyCountsChanged();
}

/**
 * When a user signs in, move guest Withdrawn data into Supabase.
 * This prevents data loss while keeping server as source of truth.
 */
export async function migrateGuestWithdrawnToUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;

  const guest = await loadGuestWithdrawn();
  if (guest.length === 0) return;

  const payload = guest.map((app) => ({
    id: app.id,
    bucket: BUCKET,
    data: app,
  }));

  const { error } = await supabase.from(TABLE).upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.error(
      "Guest → user withdrawn migration failed:",
      error.message
    );
    return;
  }

  await clearGuestWithdrawn();
  notifyCountsChanged();
}
