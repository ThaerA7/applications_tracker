// lib/storage/interviews.ts
"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { idbGet, idbSet, idbDel } from "./indexedDb";
import { getModeCached } from "../supabase/sessionCache";

export type StoredInterview = {
  id: string;
  // everything else is flexible, we just need an id and JSON-serialisable data
  [key: string]: any;
};

export type InterviewsStorageMode = "guest" | "user";


const GUEST_IDB_KEY = "interviews";

const TABLE = "applications";
const BUCKET = "interviews";
const COUNTS_EVENT = "job-tracker:refresh-counts";

function notifyCountsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COUNTS_EVENT));
}

// ---------- safe parsing (defensive) ----------

function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function safeParseList(raw: any): StoredInterview[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => isObject(x) && typeof x.id === "string") as StoredInterview[];
}

// ---------- guest storage ----------

async function loadGuestInterviews(): Promise<StoredInterview[]> {
  try {
    const idb = await idbGet<StoredInterview[]>(GUEST_IDB_KEY);
    return safeParseList(idb ?? []);
  } catch {}

  
    return [];
  
}

async function saveGuestInterviews(list: StoredInterview[]) {
  try {
    await idbSet(GUEST_IDB_KEY, list);
  } catch {}
}

async function clearGuestInterviews() {
  try {
    await idbDel(GUEST_IDB_KEY);
  } catch {}
}

// ---------- user storage (Supabase) ----------

async function loadUserInterviews(): Promise<StoredInterview[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, data")
    .eq("bucket", BUCKET)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load interviews from Supabase:", error.message);
    return [];
  }

  const mapped = (data ?? []).map((row: any) => ({ ...(row.data ?? {}), id: row.id }));

  return safeParseList(mapped);
}

async function upsertUserInterview(interview: StoredInterview) {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from(TABLE).upsert(
    {
      id: interview.id,
      bucket: BUCKET,
      data: interview,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Failed to upsert interview in Supabase:", error.message);
  }
}

async function deleteUserInterview(id: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("bucket", BUCKET);

  if (error) {
    console.error("Failed to delete interview in Supabase:", error.message);
  }
}

// ---------- mode detection ----------

export async function detectInterviewsMode(): Promise<InterviewsStorageMode> {
  return getModeCached();
}

// ---------- public API ----------

export async function loadInterviews(): Promise<{
  mode: InterviewsStorageMode;
  items: StoredInterview[];
}> {
  const mode = await detectInterviewsMode();
  const items = mode === "user" ? await loadUserInterviews() : await loadGuestInterviews();
  return { mode, items };
}

export async function upsertInterview(
  interview: StoredInterview,
  mode: InterviewsStorageMode
) {
  if (mode === "user") {
    await upsertUserInterview(interview);
  } else {
    const prev = await loadGuestInterviews();
    const idx = prev.findIndex((x) => x.id === interview.id);
    const next =
      idx === -1
        ? [interview, ...prev]
        : prev.map((x) => (x.id === interview.id ? interview : x));

    await saveGuestInterviews(next);
  }

  notifyCountsChanged();
}

export async function deleteInterview(id: string, mode: InterviewsStorageMode) {
  if (mode === "user") {
    await deleteUserInterview(id);
  } else {
    const prev = await loadGuestInterviews();
    const next = prev.filter((x) => x.id !== id);
    await saveGuestInterviews(next);
  }

  notifyCountsChanged();
}

/**
 * When a user signs in, move guest Interviews data into Supabase.
 * This prevents data loss while keeping server as source of truth.
 */
export async function migrateGuestInterviewsToUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;

  const guest = await loadGuestInterviews();
  if (guest.length === 0) return;

  const payload = guest.map((interview) => ({
    id: interview.id,
    bucket: BUCKET,
    data: interview,
  }));

  const { error } = await supabase.from(TABLE).upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.error("Guest → user interviews migration failed:", error.message);
    return;
  }

  await clearGuestInterviews();
  notifyCountsChanged();
}
