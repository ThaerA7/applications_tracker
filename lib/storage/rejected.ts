"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { idbGet, idbSet, idbDel } from "./indexedDb";
import type { Rejection } from "@/app/rejected/RejectedCard";
import { getModeCached } from "../supabase/sessionCache";
import {
  getActiveUserId,
  getFallbackUserId,
  readUserCache,
  updateUserCacheList,
  writeUserCache,
} from "./userCache";

export type RejectedApplication = Rejection;
export type RejectedStorageMode = "guest" | "user";

const GUEST_IDB_KEY = "rejected";

const TABLE = "applications";
const BUCKET = "rejected";
const COUNTS_EVENT = "job-tracker:refresh-counts";

function notifyCountsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COUNTS_EVENT));
}

// ---------- safe parsing (defensive) ----------

function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function safeParseList(raw: any): RejectedApplication[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x) => isObject(x) && typeof x.id === "string"
  ) as RejectedApplication[];
}

// ---------- guest storage ----------

async function loadGuestRejected(): Promise<RejectedApplication[]> {
  
  try {
    const idb = await idbGet<RejectedApplication[]>(GUEST_IDB_KEY);
    if (idb) return safeParseList(idb);
  } catch {}

 
    return [];

}

async function saveGuestRejected(list: RejectedApplication[]) {
  try {
    await idbSet(GUEST_IDB_KEY, list);
  } catch {}

}

async function clearGuestRejected() {
  try {
    await idbDel(GUEST_IDB_KEY);
  } catch {}
 
}

// ---------- user storage (Supabase) ----------

async function loadUserRejected(): Promise<RejectedApplication[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, data")
    .eq("bucket", BUCKET)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load rejected from Supabase:", error.message);
    return [];
  }

  const mapped = (data ?? []).map((row: any) => ({ ...(row.data ?? {}), id: row.id }));

  return safeParseList(mapped);
}

async function upsertUserRejected(app: RejectedApplication) {
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
    console.error("Failed to upsert rejected in Supabase:", error.message);
  }
}

async function deleteUserRejected(id: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("bucket", BUCKET);

  if (error) {
    console.error("Failed to delete rejected in Supabase:", error.message);
  }
}

// ---------- mode detection ----------

export async function detectRejectedMode(): Promise<RejectedStorageMode> {
  return getModeCached();
}

// ---------- public API ----------

export async function loadRejected(): Promise<{
  mode: RejectedStorageMode;
  items: RejectedApplication[];
}> {
  const mode = await detectRejectedMode();
  if (mode === "user") {
    const items = await loadUserRejected();
    const userId = await getActiveUserId();
    if (userId) await writeUserCache(GUEST_IDB_KEY, userId, items);
    return { mode, items };
  }

  const items = await loadGuestRejected();
  if (items.length > 0) return { mode, items };

  const lastUserId = getFallbackUserId();
  if (lastUserId) {
    const cached = await readUserCache<RejectedApplication[]>(GUEST_IDB_KEY, lastUserId);
    const fallback = safeParseList(cached ?? []);
    if (fallback.length > 0) return { mode, items: fallback };
  }

  return { mode, items };
}

export async function upsertRejected(
  app: RejectedApplication,
  _mode: RejectedStorageMode
) {
  void _mode;
  const actualMode = await detectRejectedMode();

  if (actualMode === "user") {
    await upsertUserRejected(app);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<RejectedApplication>(
        GUEST_IDB_KEY,
        userId,
        safeParseList,
        (prev) => {
          const idx = prev.findIndex((x) => x.id === app.id);
          return idx === -1 ? [app, ...prev] : prev.map((x) => (x.id === app.id ? app : x));
        }
      );
    }
  } else {
    const prev = await loadGuestRejected();
    const idx = prev.findIndex((x) => x.id === app.id);
    const next =
      idx === -1
        ? [app, ...prev]
        : prev.map((x) => (x.id === app.id ? app : x));

    await saveGuestRejected(next);
  }

  notifyCountsChanged();
}

export async function deleteRejected(
  id: string,
  _mode: RejectedStorageMode
) {
  void _mode;
  const actualMode = await detectRejectedMode();

  if (actualMode === "user") {
    await deleteUserRejected(id);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<RejectedApplication>(
        GUEST_IDB_KEY,
        userId,
        safeParseList,
        (prev) => prev.filter((x) => x.id !== id)
      );
    }
  } else {
    const prev = await loadGuestRejected();
    const next = prev.filter((x) => x.id !== id);
    await saveGuestRejected(next);
  }

  notifyCountsChanged();
}

/**
 * When a user signs in, move guest Rejected data into Supabase.
 * This prevents data loss while keeping server as source of truth.
 */
export async function migrateGuestRejectedToUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;

  const userId = data.session.user.id;

  const guest = await loadGuestRejected();
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
      "Guest → user rejected migration failed:",
      error.message
    );
    return;
  }

  await writeUserCache(GUEST_IDB_KEY, userId, guest);

  await clearGuestRejected();
  notifyCountsChanged();
}
