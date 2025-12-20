"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { idbGet, idbSet, idbDel } from "./indexedDb";
import { getModeCached } from "../supabase/sessionCache";
import {
  getActiveUserId,
  getFallbackUserId,
  readUserCache,
  updateUserCacheList,
  writeUserCache,
} from "./userCache";

export type ColorKey =
  | "gray"
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "pink"
  | "purple";

export type StoredNote = {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  updatedAt?: string; // ISO
  pinned?: boolean;
  color?: ColorKey;

  // keep it flexible (same style as other storage files)
  [key: string]: any;
};

export type Note = StoredNote;

export type NotesStorageMode = "guest" | "user";

// IndexedDB-only guest key.
const GUEST_IDB_KEY = "notes";

const TABLE = "applications";
const BUCKET = "notes";
const COUNTS_EVENT = "job-tracker:refresh-counts";

function notifyCountsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COUNTS_EVENT));
}

// ---------- helpers ----------

function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function safeParseList(raw: any): StoredNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x) => isObject(x) && typeof x.id === "string"
  ) as StoredNote[];
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function makeUuid(): string {
  // Prefer crypto if available
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {}

  // Fallback: UUID v4-ish generator (good enough for client IDs)
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Ensures we never try to upsert a non-UUID into applications.id (uuid).
 */
function ensureUuidId(note: StoredNote): StoredNote {
  if (typeof note.id === "string" && isUuid(note.id)) return note;
  return { ...note, id: makeUuid() };
}

// ---------- guest storage (IndexedDB ONLY) ----------

async function loadGuestNotes(): Promise<StoredNote[]> {
  try {
    const idb = await idbGet<StoredNote[]>(GUEST_IDB_KEY);
    return safeParseList(idb ?? []);
  } catch {
    // no fallback storage (localStorage removed)
    return [];
  }
}

async function saveGuestNotes(list: StoredNote[]) {
  try {
    await idbSet(GUEST_IDB_KEY, list);
  } catch {
    // no fallback storage (localStorage removed)
  }
}

async function clearGuestNotes() {
  try {
    await idbDel(GUEST_IDB_KEY);
  } catch {
    // no fallback storage (localStorage removed)
  }
}

// ---------- user storage (Supabase) ----------

async function loadUserNotes(): Promise<StoredNote[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, data, created_at, updated_at")
    .eq("bucket", BUCKET)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to load notes from Supabase:", error.message);
    return [];
  }

  const mapped = (data ?? []).map((row: any) => {
    const base = isObject(row?.data) ? row.data : {};
    const updatedAt =
      typeof base.updatedAt === "string"
        ? base.updatedAt
        : typeof row.updated_at === "string"
        ? row.updated_at
        : typeof row.created_at === "string"
        ? row.created_at
        : new Date().toISOString();

    // IMPORTANT: spread base first, then override id from row.id
    return {
      ...base,
      id: row.id,
      updatedAt,
    } as StoredNote;
  });

  return safeParseList(mapped);
}

/**
 * Returns the final note used for upsert.
 * (If the note had a non-uuid id, we replace it with a uuid to avoid Supabase errors.)
 */
async function upsertUserNote(note: StoredNote): Promise<StoredNote> {
  const supabase = getSupabaseClient();

  const fixed = ensureUuidId(note);

  const { error } = await supabase.from(TABLE).upsert(
    {
      id: fixed.id,
      bucket: BUCKET,
      data: fixed,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Failed to upsert note in Supabase:", error.message);
  }

  return fixed;
}

async function deleteUserNote(id: string) {
  const supabase = getSupabaseClient();

  // If it's not uuid, it won't exist in Supabase anyway
  if (!isUuid(id)) return;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("bucket", BUCKET);

  if (error) {
    console.error("Failed to delete note in Supabase:", error.message);
  }
}

// ---------- mode detection ----------

export async function detectNotesMode(): Promise<NotesStorageMode> {
  return getModeCached();
}

// ---------- public API ----------

export async function loadNotes(): Promise<{
  mode: NotesStorageMode;
  items: StoredNote[];
}> {
  const mode = await detectNotesMode();
  if (mode === "user") {
    const items = await loadUserNotes();
    const userId = await getActiveUserId();
    if (userId) await writeUserCache(GUEST_IDB_KEY, userId, items);
    return { mode, items };
  }

  const items = await loadGuestNotes();
  if (items.length > 0) return { mode, items };

  const lastUserId = getFallbackUserId();
  if (lastUserId) {
    const cached = await readUserCache<StoredNote[]>(GUEST_IDB_KEY, lastUserId);
    const fallback = safeParseList(cached ?? []);
    if (fallback.length > 0) return { mode, items: fallback };
  }

  return { mode, items };
}

/**
 * Upsert note and return the final note (id might be replaced with a uuid in user mode).
 */
export async function upsertNote(note: StoredNote, mode?: NotesStorageMode) {
  void mode;
  const actualMode = await detectNotesMode();
  let finalNote = note;

  if (actualMode === "user") {
    finalNote = await upsertUserNote(note);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<StoredNote>(
        GUEST_IDB_KEY,
        userId,
        safeParseList,
        (prev) => {
          const idx = prev.findIndex((x) => x.id === finalNote.id);
          return idx === -1
            ? [finalNote, ...prev]
            : prev.map((x) => (x.id === finalNote.id ? finalNote : x));
        }
      );
    }
  } else {
    const prev = await loadGuestNotes();
    const idx = prev.findIndex((x) => x.id === note.id);
    const next =
      idx === -1
        ? [note, ...prev]
        : prev.map((x) => (x.id === note.id ? note : x));
    await saveGuestNotes(next);
  }

  notifyCountsChanged();
  return finalNote;
}

export async function deleteNote(id: string, mode?: NotesStorageMode) {
  void mode;
  const actualMode = await detectNotesMode();

  if (actualMode === "user") {
    await deleteUserNote(id);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<StoredNote>(
        GUEST_IDB_KEY,
        userId,
        safeParseList,
        (prev) => prev.filter((x) => x.id !== id)
      );
    }
  } else {
    const prev = await loadGuestNotes();
    const next = prev.filter((x) => x.id !== id);
    await saveGuestNotes(next);
  }

  notifyCountsChanged();
}

/**
 * When a user signs in, move guest Notes data into Supabase.
 * We also convert any old non-UUID ids into UUIDs to prevent insert failures.
 */
export async function migrateGuestNotesToUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;

  const userId = data.session.user.id;

  const guest = await loadGuestNotes();
  if (guest.length === 0) return;

  const fixedGuest = guest.map((n) => ensureUuidId(n));

  const payload = fixedGuest.map((note) => ({
    id: note.id,
    bucket: BUCKET,
    data: note,
  }));

  const { error } = await supabase.from(TABLE).upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.error("Guest → user notes migration failed:", error.message);
    return;
  }

  await writeUserCache(GUEST_IDB_KEY, userId, fixedGuest);

  await clearGuestNotes();
  notifyCountsChanged();
}
