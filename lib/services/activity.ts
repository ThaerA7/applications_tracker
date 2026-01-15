"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { idbGet, idbSet, idbDel } from "./indexedDb";
import { getModeCached } from "../supabase/sessionCache";
import { makeUuidV4, isObject } from "@/lib/utils/serviceUtils";
import {
  clearUserCache,
  getActiveUserId,
  getFallbackUserId,
  readUserCache,
  updateUserCacheList,
  writeUserCache,
} from "./userCache";

export type ActivityVariant =
  | "applied"
  | "interviews"
  | "rejected"
  | "withdrawn"
  | "offers";

export type ActivityType =
  | "added"
  | "edited"
  | "deleted"
  | "moved_to_applied"
  | "moved_to_interviews"
  | "moved_to_rejected"
  | "moved_to_withdrawn";

export type ActivityItem = {
  id: string; // uuid
  appId: string;
  type: ActivityType;
  timestamp: string; // ISO string
  company: string;
  role?: string;
  location?: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;

  appliedOn?: string;

  offerReceivedDate?: string;
  offerAcceptedDate?: string;
  offerDeclinedDate?: string;
};

export type ActivityStorageMode = "guest" | "user";

const TABLE = "activity_logs";
const COUNTS_EVENT = "job-tracker:refresh-counts";
const MAX_ITEMS = 200;

function notifyCountsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COUNTS_EVENT));
}

// -------- uuid helpers (prevents "invalid uuid" errors) --------
function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function normalizeItem(item: ActivityItem): ActivityItem {
  const id = isUuid(item.id) ? item.id : makeUuidV4();
  const timestamp = item.timestamp || new Date().toISOString();
  return { ...item, id, timestamp };
}

// -------- safe parsing --------
function safeParseList(raw: any): ActivityItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x) =>
        isObject(x) && typeof x.id === "string" && typeof x.appId === "string"
    )
    .map((x) => x as ActivityItem);
}

// -------- guest storage (IndexedDB only; per-variant) --------
function guestIdbKey(variant: ActivityVariant) {
  return `activity:${variant}`;
}

async function loadGuest(variant: ActivityVariant): Promise<ActivityItem[]> {
  try {
    const idb = await idbGet<ActivityItem[]>(guestIdbKey(variant));
    return safeParseList(idb ?? []);
  } catch {
    return [];
  }
}

async function saveGuest(variant: ActivityVariant, list: ActivityItem[]) {
  const trimmed = list.slice(0, MAX_ITEMS);
  try {
    await idbSet(guestIdbKey(variant), trimmed);
  } catch {}
}

async function clearGuest(variant: ActivityVariant) {
  try {
    await idbDel(guestIdbKey(variant));
  } catch {}
}

// -------- user storage (Supabase) --------
async function loadUser(variant: ActivityVariant): Promise<ActivityItem[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, data, created_at")
    .eq("variant", variant)
    .order("created_at", { ascending: false })
    .limit(MAX_ITEMS);

  if (error) {
    console.error("Failed to load activity logs from Supabase:", error.message);
    return [];
  }

  const mapped = (data ?? []).map((row: any) => ({
    ...(row.data ?? {}),
    id: row.id,
  }));
  return safeParseList(mapped);
}

async function insertUser(variant: ActivityVariant, item: ActivityItem) {
  const supabase = getSupabaseClient();

  const clean = normalizeItem(item);

  const { error } = await supabase.from(TABLE).insert({
    id: clean.id,
    variant,
    data: clean,
  });

  if (error) {
    console.error("Failed to insert activity log in Supabase:", error.message);
  }
}

async function deleteUser(variant: ActivityVariant, id: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("variant", variant);

  if (error) {
    console.error("Failed to delete activity log in Supabase:", error.message);
  }
}

async function clearUser(variant: ActivityVariant) {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from(TABLE).delete().eq("variant", variant);
  if (error) {
    console.error("Failed to clear activity logs in Supabase:", error.message);
  }
}

// -------- mode detection --------
export async function detectActivityMode(): Promise<ActivityStorageMode> {
  return getModeCached();
}

// -------- public API --------
export async function loadActivity(variant: ActivityVariant): Promise<{
  mode: ActivityStorageMode;
  items: ActivityItem[];
}> {
  const mode = await detectActivityMode();
  const baseKey = guestIdbKey(variant);

  if (mode === "user") {
    const items = await loadUser(variant);
    const userId = await getActiveUserId();
    if (userId) await writeUserCache(baseKey, userId, items);
    return { mode, items };
  }

  const items = await loadGuest(variant);
  if (items.length > 0) return { mode, items };

  const lastUserId = getFallbackUserId();
  if (lastUserId) {
    const cached = await readUserCache<ActivityItem[]>(baseKey, lastUserId);
    const fallback = safeParseList(cached ?? []);
    if (fallback.length > 0) return { mode, items: fallback };
  }

  return { mode, items };
}

export async function appendActivity(
  variant: ActivityVariant,
  item: ActivityItem,
  _mode: ActivityStorageMode
) {
  void _mode;
  const clean = normalizeItem(item);

  const actualMode = await detectActivityMode();

  if (actualMode === "user") {
    await insertUser(variant, clean);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<ActivityItem>(
        guestIdbKey(variant),
        userId,
        safeParseList,
        (prev) =>
          [clean, ...prev.filter((x) => x.id !== clean.id)].slice(0, MAX_ITEMS)
      );
    }
  } else {
    const prev = await loadGuest(variant);
    const next = [clean, ...prev].slice(0, MAX_ITEMS);
    await saveGuest(variant, next);
  }

  notifyCountsChanged();
  return clean;
}

export async function deleteActivity(
  variant: ActivityVariant,
  id: string,
  _mode: ActivityStorageMode
) {
  void _mode;
  const actualMode = await detectActivityMode();

  if (actualMode === "user") {
    await deleteUser(variant, id);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<ActivityItem>(
        guestIdbKey(variant),
        userId,
        safeParseList,
        (prev) => prev.filter((x) => x.id !== id)
      );
    }
  } else {
    const prev = await loadGuest(variant);
    await saveGuest(
      variant,
      prev.filter((x) => x.id !== id)
    );
  }

  notifyCountsChanged();
}

export async function clearActivity(
  variant: ActivityVariant,
  _mode: ActivityStorageMode
) {
  void _mode;
  const actualMode = await detectActivityMode();

  if (actualMode === "user") {
    await clearUser(variant);
    const userId = await getActiveUserId();
    if (userId) await clearUserCache(guestIdbKey(variant), userId);
  } else await clearGuest(variant);

  notifyCountsChanged();
}

/**
 * Move guest activity (IndexedDB) into Supabase after login.
 * Uses UPSERT to avoid duplicates (id is the conflict key).
 */
export async function migrateGuestActivityToUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;

  const userId = data.session.user.id;

  const variants: ActivityVariant[] = [
    "applied",
    "interviews",
    "rejected",
    "withdrawn",
    "offers",
  ];

  for (const v of variants) {
    const guest = await loadGuest(v);
    if (guest.length === 0) continue;

    const payload = guest.map((it) => {
      const clean = normalizeItem(it);
      return { id: clean.id, variant: v, data: clean };
    });

    const fixedGuest = payload.map((p) => p.data);

    const { error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: "id" });
    if (error) {
      console.error("Guest → user activity migration failed:", error.message);
      continue;
    }

    await writeUserCache(guestIdbKey(v), userId, fixedGuest);

    await clearGuest(v);
  }

  notifyCountsChanged();
}
