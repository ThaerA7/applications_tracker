"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { idbGet, idbSet, idbDel } from "./indexedDb";
import type { OfferReceivedJob } from "@/components/cards/OfferCard";
import { getModeCached } from "../supabase/sessionCache";
import {
  getActiveUserId,
  getFallbackUserId,
  readUserCache,
  updateUserCacheList,
  writeUserCache,
} from "./userCache";

export type OffersStorageMode = "guest" | "user";

const GUEST_IDB_KEY = "offers-received";

const TABLE = "applications";
const BUCKET = "offers";
const COUNTS_EVENT = "job-tracker:refresh-counts";

function notifyCountsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COUNTS_EVENT));
}

// ---------- safe parsing (defensive) ----------

function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function safeParseList(raw: any): OfferReceivedJob[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x) => isObject(x) && typeof x.id === "string"
  ) as OfferReceivedJob[];
}

// UUID helpers (for migration safety)

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureUuid(id: string): string {
  if (UUID_RE.test(id)) return id;
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

// ---------- guest storage (IndexedDB ONLY) ----------

async function loadGuestOffers(): Promise<OfferReceivedJob[]> {
  try {
    const idb = await idbGet<OfferReceivedJob[]>(GUEST_IDB_KEY);
    return safeParseList(idb ?? []);
  } catch {
    // no fallback storage
    return [];
  }
}

async function saveGuestOffers(list: OfferReceivedJob[]) {
  try {
    await idbSet(GUEST_IDB_KEY, list);
  } catch {
    // no fallback storage
  }
}

async function clearGuestOffers() {
  try {
    await idbDel(GUEST_IDB_KEY);
  } catch {
    // no fallback storage
  }
}

// ---------- user storage (Supabase) ----------

async function loadUserOffers(): Promise<OfferReceivedJob[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, data")
    .eq("bucket", BUCKET)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load offers from Supabase:", error.message);
    return [];
  }

  const mapped = (data ?? []).map((row: any) => ({
    ...(row.data ?? {}),
    id: row.id,
  }));

  return safeParseList(mapped);
}

async function upsertUserOffer(offer: OfferReceivedJob) {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from(TABLE).upsert(
    {
      id: offer.id,
      bucket: BUCKET,
      data: offer,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Failed to upsert offer in Supabase:", error.message);
  }
}

async function deleteUserOffer(id: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("bucket", BUCKET);

  if (error) {
    console.error("Failed to delete offer in Supabase:", error.message);
  }
}

// ---------- mode detection ----------

export async function detectOffersMode(): Promise<OffersStorageMode> {
  return getModeCached();
}

// ---------- public API ----------

export async function loadOffers(): Promise<{
  mode: OffersStorageMode;
  items: OfferReceivedJob[];
}> {
  const mode = await detectOffersMode();
  if (mode === "user") {
    const items = await loadUserOffers();
    const userId = await getActiveUserId();
    if (userId) await writeUserCache(GUEST_IDB_KEY, userId, items);
    return { mode, items };
  }

  const items = await loadGuestOffers();
  if (items.length > 0) return { mode, items };

  const lastUserId = getFallbackUserId();
  if (lastUserId) {
    const cached = await readUserCache<OfferReceivedJob[]>(
      GUEST_IDB_KEY,
      lastUserId
    );
    const fallback = safeParseList(cached ?? []);
    if (fallback.length > 0) return { mode, items: fallback };
  }

  return { mode, items };
}

export async function upsertOffer(
  offer: OfferReceivedJob,
  _mode: OffersStorageMode
) {
  void _mode;
  const actualMode = await detectOffersMode();

  if (actualMode === "user") {
    await upsertUserOffer(offer);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<OfferReceivedJob>(
        GUEST_IDB_KEY,
        userId,
        safeParseList,
        (prev) => {
          const idx = prev.findIndex((x) => x.id === offer.id);
          return idx === -1
            ? [offer, ...prev]
            : prev.map((x) => (x.id === offer.id ? offer : x));
        }
      );
    }
  } else {
    const prev = await loadGuestOffers();
    const idx = prev.findIndex((x) => x.id === offer.id);
    const next =
      idx === -1
        ? [offer, ...prev]
        : prev.map((x) => (x.id === offer.id ? offer : x));

    await saveGuestOffers(next);
  }

  notifyCountsChanged();
}

export async function deleteOffer(id: string, _mode: OffersStorageMode) {
  void _mode;
  const actualMode = await detectOffersMode();

  if (actualMode === "user") {
    await deleteUserOffer(id);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<OfferReceivedJob>(
        GUEST_IDB_KEY,
        userId,
        safeParseList,
        (prev) => prev.filter((x) => x.id !== id)
      );
    }
  } else {
    const prev = await loadGuestOffers();
    const next = prev.filter((x) => x.id !== id);
    await saveGuestOffers(next);
  }

  notifyCountsChanged();
}

/**
 * When a user signs in, move guest Offers data into Supabase.
 * This prevents data loss while keeping server as source of truth.
 */
export async function migrateGuestOffersToUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;

  const userId = data.session.user.id;

  const guest = await loadGuestOffers();
  if (guest.length === 0) return;

  const payload = guest.map((offer) => {
    const id = ensureUuid(offer.id);
    return {
      id,
      bucket: BUCKET,
      data: { ...offer, id },
    };
  });

  const fixedGuest = payload.map((p) => p.data);

  const { error } = await supabase.from(TABLE).upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.error("Guest → user offers migration failed:", error.message);
    return;
  }

  await writeUserCache(GUEST_IDB_KEY, userId, fixedGuest);

  await clearGuestOffers();
  notifyCountsChanged();
}
