"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { idbGet, idbSet, idbDel } from "./indexedDb";
import type { NewApplicationForm } from "@/components/dialogs/AddApplicationDialog";
import { getModeCached } from "../supabase/sessionCache";
import {
  getActiveUserId,
  getFallbackUserId,
  readUserCache,
  updateUserCacheList,
  writeUserCache,
} from "./userCache";

export type AppliedApplication = {
  id: string;
  website?: string;
} & NewApplicationForm;

export type AppliedStorageMode = "guest" | "user";

const GUEST_IDB_KEY = "applied";

const TABLE = "applications";
const BUCKET = "applied";
const COUNTS_EVENT = "job-tracker:refresh-counts";

function notifyCountsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COUNTS_EVENT));
}

// ---------- safe parsing (defensive) ----------

function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function safeParseList(raw: any): AppliedApplication[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => isObject(x) && typeof x.id === "string") as AppliedApplication[];
}

// ---------- guest storage ----------

async function loadGuestApplied(): Promise<AppliedApplication[]> {
  try {
    const idb = await idbGet<AppliedApplication[]>(GUEST_IDB_KEY);
    return safeParseList(idb ?? []);
  } catch {
    return [];
  }
}

async function saveGuestApplied(list: AppliedApplication[]) {
  try {
    await idbSet(GUEST_IDB_KEY, list);
  } catch {}
}

async function clearGuestApplied() {
  try {
    await idbDel(GUEST_IDB_KEY);
  } catch {}
}

// ---------- user storage (Supabase) ----------

async function loadUserApplied(): Promise<AppliedApplication[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, data")
    .eq("bucket", BUCKET)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load applied from Supabase:", error.message);
    return [];
  }

  const mapped = (data ?? []).map((row: any) => ({ ...(row.data ?? {}), id: row.id }));

  return safeParseList(mapped);
}

async function upsertUserApplied(app: AppliedApplication) {
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
    console.error("Failed to upsert applied in Supabase:", error.message);
  }
}

async function deleteUserApplied(id: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("bucket", BUCKET);

  if (error) {
    console.error("Failed to delete applied in Supabase:", error.message);
  }
}

// ---------- mode detection ----------

export async function detectAppliedMode(): Promise<AppliedStorageMode> {
  return getModeCached();
}

// ---------- public API ----------

export async function loadApplied(): Promise<{
  mode: AppliedStorageMode;
  items: AppliedApplication[];
}> {
  const mode = await detectAppliedMode();
  if (mode === "user") {
    const items = await loadUserApplied();
    const userId = await getActiveUserId();
    if (userId) await writeUserCache(GUEST_IDB_KEY, userId, items);
    return { mode, items };
  }

  const items = await loadGuestApplied();
  if (items.length > 0) return { mode, items };

  const lastUserId = getFallbackUserId();
  if (lastUserId) {
    const cached = await readUserCache<AppliedApplication[]>(GUEST_IDB_KEY, lastUserId);
    const fallback = safeParseList(cached ?? []);
    if (fallback.length > 0) return { mode, items: fallback };
  }

  return { mode, items };
}

export async function upsertApplied(
  app: AppliedApplication,
  _mode: AppliedStorageMode
) {
  void _mode;
  const actualMode = await detectAppliedMode();

  if (actualMode === "user") {
    await upsertUserApplied(app);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<AppliedApplication>(
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
    const prev = await loadGuestApplied();
    const idx = prev.findIndex((x) => x.id === app.id);
    const next =
      idx === -1
        ? [app, ...prev]
        : prev.map((x) => (x.id === app.id ? app : x));

    await saveGuestApplied(next);
  }

  notifyCountsChanged();
}

export async function deleteApplied(
  id: string,
  _mode: AppliedStorageMode
) {
  void _mode;
  const actualMode = await detectAppliedMode();

  if (actualMode === "user") {
    await deleteUserApplied(id);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<AppliedApplication>(
        GUEST_IDB_KEY,
        userId,
        safeParseList,
        (prev) => prev.filter((x) => x.id !== id)
      );
    }
  } else {
    const prev = await loadGuestApplied();
    const next = prev.filter((x) => x.id !== id);
    await saveGuestApplied(next);
  }

  notifyCountsChanged();
}

/**
 * When a user signs in, move guest Applied data into Supabase.
 * This prevents data loss while keeping server as source of truth.
 */
export async function migrateGuestAppliedToUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;

  const userId = data.session.user.id;

  const guest = await loadGuestApplied();
  if (guest.length === 0) return;

  // Upsert all guest apps as user rows
  const payload = guest.map((app) => ({
    id: app.id,
    bucket: BUCKET,
    data: app,
  }));

  const { error } = await supabase.from(TABLE).upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.error("Guest → user applied migration failed:", error.message);
    return;
  }

  await writeUserCache(GUEST_IDB_KEY, userId, guest);

  await clearGuestApplied();
  notifyCountsChanged();
}
