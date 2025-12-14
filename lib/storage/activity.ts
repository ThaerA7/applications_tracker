// lib/storage/activity.ts
"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { idbGet, idbSet, idbDel } from "./indexedDb";

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
const COUNTS_EVENT = "job-tracker:refresh-counts"; // optional, but keeps UI consistent
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

function makeUuidV4() {
  // RFC4122 v4 using crypto.getRandomValues
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();

  const buf = new Uint8Array(16);
  cryptoObj.getRandomValues(buf);

  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;

  const hex = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20)}`;
}

function normalizeItem(item: ActivityItem): ActivityItem {
  const id = isUuid(item.id) ? item.id : makeUuidV4();
  const timestamp = item.timestamp || new Date().toISOString();
  return { ...item, id, timestamp };
}

// -------- safe parsing --------
function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function safeParseList(raw: any): ActivityItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => isObject(x) && typeof x.id === "string" && typeof x.appId === "string")
    .map((x) => x as ActivityItem);
}

// -------- guest storage (per-variant) --------
function guestLocalKey(variant: ActivityVariant) {
  return `job-tracker:activity:${variant}`;
}
function guestIdbKey(variant: ActivityVariant) {
  return `activity:${variant}`;
}

async function loadGuest(variant: ActivityVariant): Promise<ActivityItem[]> {
  // Prefer IDB
  try {
    const idb = await idbGet<ActivityItem[]>(guestIdbKey(variant));
    if (idb) return safeParseList(idb);
  } catch {}

  // Fallback localStorage
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(guestLocalKey(variant));
    return safeParseList(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

async function saveGuest(variant: ActivityVariant, list: ActivityItem[]) {
  const trimmed = list.slice(0, MAX_ITEMS);

  try {
    await idbSet(guestIdbKey(variant), trimmed);
  } catch {}

  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(guestLocalKey(variant), JSON.stringify(trimmed));
  } catch {}
}

async function clearGuest(variant: ActivityVariant) {
  try {
    await idbDel(guestIdbKey(variant));
  } catch {}
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(guestLocalKey(variant));
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

  const mapped = (data ?? []).map((row: any) => ({ ...(row.data ?? {}), id: row.id }));

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
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user ? "user" : "guest";
}

// -------- public API --------
export async function loadActivity(variant: ActivityVariant): Promise<{
  mode: ActivityStorageMode;
  items: ActivityItem[];
}> {
  const mode = await detectActivityMode();
  const items = mode === "user" ? await loadUser(variant) : await loadGuest(variant);
  return { mode, items };
}

export async function appendActivity(
  variant: ActivityVariant,
  item: ActivityItem,
  mode: ActivityStorageMode
) {
  const clean = normalizeItem(item);

  if (mode === "user") {
    await insertUser(variant, clean);
  } else {
    const prev = await loadGuest(variant);
    const next = [clean, ...prev].slice(0, MAX_ITEMS);
    await saveGuest(variant, next);
  }

  notifyCountsChanged();
  return clean; // so the UI can push the exact normalized version
}

export async function deleteActivity(
  variant: ActivityVariant,
  id: string,
  mode: ActivityStorageMode
) {
  if (mode === "user") {
    await deleteUser(variant, id);
  } else {
    const prev = await loadGuest(variant);
    await saveGuest(variant, prev.filter((x) => x.id !== id));
  }

  notifyCountsChanged();
}

export async function clearActivity(variant: ActivityVariant, mode: ActivityStorageMode) {
  if (mode === "user") await clearUser(variant);
  else await clearGuest(variant);

  notifyCountsChanged();
}

/**
 * Optional: call this after login (like your other migrations)
 */
export async function migrateGuestActivityToUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;

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

    // insert newest first (already newest-first in guest)
    const payload = guest.map((it) => {
      const clean = normalizeItem(it);
      return { id: clean.id, variant: v, data: clean };
    });

    const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "id" });
    if (error) {
      console.error("Guest → user activity migration failed:", error.message);
      continue;
    }

    await clearGuest(v);
  }

  notifyCountsChanged();
}
