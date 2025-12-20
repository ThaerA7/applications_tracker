"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { idbGet, idbSet, idbDel } from "./indexedDb";
import type { WithdrawnRecord } from "@/app/withdrawn/WithdrawnCard";
import { getModeCached } from "../supabase/sessionCache";
import {
  getActiveUserId,
  getFallbackUserId,
  readUserCache,
  updateUserCacheList,
  writeUserCache,
} from "./userCache";

export type WithdrawnApplication = WithdrawnRecord;
export type WithdrawnStorageMode = "guest" | "user";

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
  return raw.filter((x) => isObject(x) && typeof x.id === "string") as WithdrawnApplication[];
}

// ---------- guest storage (IndexedDB ONLY) ----------

async function loadGuestWithdrawn(): Promise<WithdrawnApplication[]> {
  try {
    const idb = await idbGet<WithdrawnApplication[]>(GUEST_IDB_KEY);
    return safeParseList(idb ?? []);
  } catch {
    return [];
  }
}

async function saveGuestWithdrawn(list: WithdrawnApplication[]) {
  try {
    await idbSet(GUEST_IDB_KEY, list);
  } catch {}
}

async function clearGuestWithdrawn() {
  try {
    await idbDel(GUEST_IDB_KEY);
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

  const mapped = (data ?? []).map((row: any) => ({
    ...(row.data ?? {}),
    id: row.id,
  }));

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

  const { error } = await supabase.from(TABLE).delete().eq("id", id).eq("bucket", BUCKET);

  if (error) {
    console.error("Failed to delete withdrawn in Supabase:", error.message);
  }
}

// ---------- mode detection ----------

export async function detectWithdrawnMode(): Promise<WithdrawnStorageMode> {
  return getModeCached();
}

// ---------- public API ----------

export async function loadWithdrawn(): Promise<{
  mode: WithdrawnStorageMode;
  items: WithdrawnApplication[];
}> {
  const mode = await detectWithdrawnMode();
  if (mode === "user") {
    const items = await loadUserWithdrawn();
    const userId = await getActiveUserId();
    if (userId) await writeUserCache(GUEST_IDB_KEY, userId, items);
    return { mode, items };
  }

  const items = await loadGuestWithdrawn();
  if (items.length > 0) return { mode, items };

  const lastUserId = getFallbackUserId();
  if (lastUserId) {
    const cached = await readUserCache<WithdrawnApplication[]>(GUEST_IDB_KEY, lastUserId);
    const fallback = safeParseList(cached ?? []);
    if (fallback.length > 0) return { mode, items: fallback };
  }

  return { mode, items };
}

export async function upsertWithdrawn(app: WithdrawnApplication, _mode: WithdrawnStorageMode) {
  void _mode;
  const actualMode = await detectWithdrawnMode();

  if (actualMode === "user") {
    await upsertUserWithdrawn(app);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<WithdrawnApplication>(
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
    const prev = await loadGuestWithdrawn();
    const idx = prev.findIndex((x) => x.id === app.id);
    const next = idx === -1 ? [app, ...prev] : prev.map((x) => (x.id === app.id ? app : x));
    await saveGuestWithdrawn(next);
  }

  notifyCountsChanged();
}

export async function deleteWithdrawn(id: string, _mode: WithdrawnStorageMode) {
  void _mode;
  const actualMode = await detectWithdrawnMode();

  if (actualMode === "user") {
    await deleteUserWithdrawn(id);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<WithdrawnApplication>(
        GUEST_IDB_KEY,
        userId,
        safeParseList,
        (prev) => prev.filter((x) => x.id !== id)
      );
    }
  } else {
    const prev = await loadGuestWithdrawn();
    const next = prev.filter((x) => x.id !== id);
    await saveGuestWithdrawn(next);
  }

  notifyCountsChanged();
}

/**
 * When a user signs in, move guest Withdrawn data into Supabase.
 * Guest source is IndexedDB ONLY.
 */
export async function migrateGuestWithdrawnToUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;

  const userId = data.session.user.id;

  const guest = await loadGuestWithdrawn();
  if (guest.length === 0) return;

  const payload = guest.map((app) => ({
    id: app.id,
    bucket: BUCKET,
    data: app,
  }));

  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("Guest → user withdrawn migration failed:", error.message);
    return;
  }

  await writeUserCache(GUEST_IDB_KEY, userId, guest);

  await clearGuestWithdrawn();
  notifyCountsChanged();
}
