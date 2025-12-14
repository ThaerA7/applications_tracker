// lib/storage/notes.ts
"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { idbGet, idbSet, idbDel } from "./indexedDb";

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

const GUEST_LOCAL_KEY = "job-tracker:notes";
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
  return raw.filter((x) => isObject(x) && typeof x.id === "string") as StoredNote[];
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function makeUuid(): string | null {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {}
  return null;
}

/**
 * Ensures we never try to upsert a non-UUID into applications.id (uuid).
 * If we can't generate a uuid (very old browser), we keep the original id
 * and Supabase will reject it — but modern browsers will be fine.
 */
function ensureUuidId(note: StoredNote): StoredNote {
  if (typeof note.id === "string" && isUuid(note.id)) return note;

  const uuid = makeUuid();
  if (!uuid) return note;

  return { ...note, id: uuid };
}

// ---------- guest storage ----------

async function loadGuestNotes(): Promise<StoredNote[]> {
  // Prefer IDB
  try {
    const idb = await idbGet<StoredNote[]>(GUEST_IDB_KEY);
    if (idb) return safeParseList(idb);
  } catch {}

  // Fallback localStorage
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_LOCAL_KEY);
    return safeParseList(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

async function saveGuestNotes(list: StoredNote[]) {
  // Try IDB
  try {
    await idbSet(GUEST_IDB_KEY, list);
  } catch {}

  // Mirror to localStorage as cheap backup
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_LOCAL_KEY, JSON.stringify(list));
  } catch {}
}

async function clearGuestNotes() {
  try {
    await idbDel(GUEST_IDB_KEY);
  } catch {}
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_LOCAL_KEY);
  } catch {}
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

  // If still not uuid, upsert will fail (old browser) -> log and return
  if (!isUuid(fixed.id)) {
    console.error(
      `Notes upsert blocked: applications.id is uuid but note.id is not a uuid (${fixed.id}).`
    );
    return fixed;
  }

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
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user ? "user" : "guest";
}

// ---------- public API ----------

export async function loadNotes(): Promise<{
  mode: NotesStorageMode;
  items: StoredNote[];
}> {
  const mode = await detectNotesMode();
  const items = mode === "user" ? await loadUserNotes() : await loadGuestNotes();
  return { mode, items };
}

/**
 * Upsert note and return the final note (id might be replaced with a uuid in user mode).
 */
export async function upsertNote(note: StoredNote, mode?: NotesStorageMode) {
  const actualMode = mode ?? (await detectNotesMode());
  let finalNote = note;

  if (actualMode === "user") {
    finalNote = await upsertUserNote(note);
  } else {
    const prev = await loadGuestNotes();
    const idx = prev.findIndex((x) => x.id === note.id);
    const next =
      idx === -1 ? [note, ...prev] : prev.map((x) => (x.id === note.id ? note : x));
    await saveGuestNotes(next);
  }

  notifyCountsChanged();
  return finalNote;
}

export async function deleteNote(id: string, mode?: NotesStorageMode) {
  const actualMode = mode ?? (await detectNotesMode());

  if (actualMode === "user") {
    await deleteUserNote(id);
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

  const guest = await loadGuestNotes();
  if (guest.length === 0) return;

  const fixedGuest = guest.map((n) => ensureUuidId(n)).filter((n) => isUuid(n.id));

  if (fixedGuest.length === 0) {
    // nothing we can safely insert into a uuid table
    await clearGuestNotes();
    notifyCountsChanged();
    return;
  }

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

  await clearGuestNotes();
  notifyCountsChanged();
}
