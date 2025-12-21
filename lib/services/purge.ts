"use client";

import { idbDel } from "@/lib/services/indexedDb";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getLastKnownUserId } from "@/lib/supabase/sessionCache";
import { userCacheKey } from "@/lib/services/userCache";

const COUNTS_EVENT = "job-tracker:refresh-counts";
const NOTES_EVENT = "job-tracker:refresh-notes";
const ACTIVITY_EVENT = "job-tracker:refresh-activity";

const APPLICATION_BUCKETS = [
  "applied",
  "interviews",
  "notes",
  "offers",
  "rejected",
  "wishlist",
  "withdrawn",
] as const;

const ACTIVITY_VARIANTS = [
  "applied",
  "interviews",
  "rejected",
  "withdrawn",
  "offers",
] as const;

const IDB_KEYS = [
  // lists
  "applied",
  "interviews",
  "notes",
  "offers-received",
  "rejected",
  "withdrawn",
  "wishlist-v1",

  // activity (per-variant)
  ...ACTIVITY_VARIANTS.map((v) => `activity:${v}`),
] as const;

const LOCAL_STORAGE_KEYS = [
  // settings
  "job-tracker:settings-preferences",

  // last signed-in user id
  "job-tracker:last-user-id",

  // legacy interview storage
  "job-tracker:interviews",
  "job-tracker:interviews-activity",
] as const;

function notifyRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COUNTS_EVENT));
  window.dispatchEvent(new Event(NOTES_EVENT));
  window.dispatchEvent(new Event(ACTIVITY_EVENT));
}

export async function clearAllLocalData() {
  // IndexedDB
  await Promise.all(
    IDB_KEYS.map(async (k) => {
      try {
        await idbDel(k);
      } catch {
        // ignore
      }
    })
  );

  // Also clear per-user caches for the last known user.
  const lastUserId = getLastKnownUserId();
  if (lastUserId) {
    await Promise.all(
      IDB_KEYS.map(async (k) => {
        try {
          await idbDel(userCacheKey(k, lastUserId));
        } catch {
          // ignore
        }
      })
    );
  }

  // localStorage
  if (typeof window !== "undefined") {
    for (const k of LOCAL_STORAGE_KEYS) {
      try {
        window.localStorage.removeItem(k);
      } catch {
        // ignore
      }
    }
  }

  notifyRefresh();
}

export async function clearAllUserDataInSupabase() {
  const supabase = getSupabaseClient();

  // Delete list buckets (RLS should scope to the signed-in user)
  const { error: appsError } = await supabase
    .from("applications")
    .delete()
    .in("bucket", [...APPLICATION_BUCKETS]);

  if (appsError) {
    throw new Error(appsError.message);
  }

  // Delete activity logs
  const { error: activityError } = await supabase
    .from("activity_logs")
    .delete()
    .in("variant", [...ACTIVITY_VARIANTS]);

  if (activityError) {
    throw new Error(activityError.message);
  }

  notifyRefresh();
}

export async function clearAllData(mode: "guest" | "user") {
  // Always clear local caches
  await clearAllLocalData();

  if (mode === "user") {
    await clearAllUserDataInSupabase();
  }
}
