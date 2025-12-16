// lib/storage/wishlist.ts
"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { idbGet, idbSet, idbDel } from "./indexedDb";
import { getModeCached } from "../supabase/sessionCache";

export type WishlistItem = {
  id: string; // ✅ UUID for Supabase
  sourceKey?: string; // ✅ stable key (jobIdentity/detailUrl/hashId) for toggling stars
  company: string;
  role?: string;
  location?: string;
  priority?: "Dream" | "High" | "Medium" | "Low";
  logoUrl?: string;
  website?: string;
  notes?: string;
  startDate?: string | null;
  offerType?: string;
};

export type WishlistStorageMode = "guest" | "user";

const BUCKET = "wishlist";
const TABLE = "applications";

// ✅ IndexedDB-only guest key
const GUEST_IDB_KEY = "wishlist-v1";

// sidebar refresh event (same pattern as offers)
const COUNTS_EVENT = "job-tracker:refresh-counts";
function notifyCountsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COUNTS_EVENT));
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function safeParseList(raw: any): WishlistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x) =>
        isObject(x) &&
        typeof x.company === "string" &&
        typeof x.id === "string"
    )
    .map((x) => x as WishlistItem);
}

/**
 * ✅ Normalizes old local items that used non-UUID ids (e.g. jobIdentity strings)
 * - If id is not UUID: move it into sourceKey, generate uuid id.
 */
function normalizeWishlist(list: WishlistItem[]) {
  let changed = false;

  const next = list.map((w) => {
    const id = String(w.id ?? "").trim();
    const hasUuid = UUID_RE.test(id);

    if (hasUuid) return w;

    changed = true;
    return {
      ...w,
      sourceKey: (w.sourceKey ?? id).trim() || w.sourceKey,
      id: makeUuid(),
    };
  });

  return { next, changed };
}

export async function detectWishlistMode(): Promise<WishlistStorageMode> {
  return getModeCached();
}

/* ---------------- guest (IndexedDB ONLY) ---------------- */

async function loadGuestWishlist(): Promise<WishlistItem[]> {
  try {
    const idb = await idbGet<WishlistItem[]>(GUEST_IDB_KEY);
    const parsed = safeParseList(idb ?? []);
    const { next, changed } = normalizeWishlist(parsed);
    if (changed) await saveGuestWishlist(next);
    return next;
  } catch {
    // No fallback storage (localStorage removed by request)
    return [];
  }
}

async function saveGuestWishlist(list: WishlistItem[]) {
  try {
    await idbSet(GUEST_IDB_KEY, list);
  } catch {
    // No fallback storage (localStorage removed by request)
  }
}

async function clearGuestWishlist() {
  try {
    await idbDel(GUEST_IDB_KEY);
  } catch {
    // No fallback storage (localStorage removed by request)
  }
}

/* ---------------- user (Supabase) ---------------- */

async function loadUserWishlist(): Promise<WishlistItem[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, data")
    .eq("bucket", BUCKET)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load wishlist from Supabase:", error.message);
    return [];
  }

  const mapped = (data ?? []).map((row: any) => ({
    ...(row.data ?? {}),
    id: row.id,
  }));

  const parsed = safeParseList(mapped.map((m: any) => ({ ...m, id: String(m.id) })));
  return parsed;
}

async function upsertUserWishlistItem(item: WishlistItem) {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from(TABLE).upsert(
    {
      id: item.id,
      bucket: BUCKET,
      data: item,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Failed to upsert wishlist item in Supabase:", error.message);
  }
}

async function deleteUserWishlistItem(id: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("bucket", BUCKET);

  if (error) {
    console.error("Failed to delete wishlist item in Supabase:", error.message);
  }
}

/* ---------------- public API ---------------- */

export async function loadWishlist(): Promise<{
  mode: WishlistStorageMode;
  items: WishlistItem[];
}> {
  const mode = await detectWishlistMode();
  const items =
    mode === "user" ? await loadUserWishlist() : await loadGuestWishlist();
  return { mode, items };
}

export async function upsertWishlistItem(
  item: WishlistItem,
  mode: WishlistStorageMode
) {
  if (!UUID_RE.test(item.id)) {
    // hard guard
    item = { ...item, id: makeUuid() };
  }

  if (mode === "user") {
    await upsertUserWishlistItem(item);
  } else {
    const prev = await loadGuestWishlist();
    const idx = prev.findIndex((x) => x.id === item.id);
    const next =
      idx === -1
        ? [item, ...prev]
        : prev.map((x) => (x.id === item.id ? item : x));
    await saveGuestWishlist(next);
  }

  notifyCountsChanged();
}

export async function deleteWishlistItem(id: string, mode: WishlistStorageMode) {
  if (mode === "user") await deleteUserWishlistItem(id);
  else {
    const prev = await loadGuestWishlist();
    const next = prev.filter((x) => x.id !== id);
    await saveGuestWishlist(next);
  }

  notifyCountsChanged();
}

/**
 * Optional: call after login to move guest wishlist into user wishlist.
 * (Safe: converts any non-uuid guest ids into uuid + preserves sourceKey.)
 */
export async function migrateGuestWishlistToUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;

  const guest = await loadGuestWishlist();
  if (guest.length === 0) return;

  const payload = guest.map((w) => ({
    id: w.id,
    bucket: BUCKET,
    data: w,
  }));

  const { error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("Guest → user wishlist migration failed:", error.message);
    return;
  }

  await clearGuestWishlist();
  notifyCountsChanged();
}
