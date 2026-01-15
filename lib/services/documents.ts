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

export type StoredDocument = {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  updatedAt?: string; // ISO
  pinned?: boolean;
  fileName?: string; // Original file name
  fileUrl?: string; // Supabase storage URL (for authenticated users)
  fileSize?: number; // File size in bytes
  fileType?: string; // MIME type
  fileData?: string; // Base64 encoded file data (for guest users in IndexedDB)

  // keep it flexible (same style as other storage files)
  [key: string]: any;
};

export type Document = StoredDocument;

export type DocumentsStorageMode = "guest" | "user";

// IndexedDB-only guest key.
const GUEST_IDB_KEY = "documents";

const TABLE = "applications";
const BUCKET = "documents";
const STORAGE_BUCKET = "user-documents"; // Supabase Storage bucket
const COUNTS_EVENT = "job-tracker:refresh-counts";

function notifyCountsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COUNTS_EVENT));
}

// ---------- helpers ----------

function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function safeParseList(raw: any): StoredDocument[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x) => isObject(x) && typeof x.id === "string"
  ) as StoredDocument[];
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
 * Convert a File to base64 string for IndexedDB storage
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 string back to blob for download
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64.split(",")[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

/**
 * Ensures we never try to upsert a non-UUID into applications.id (uuid).
 */
function ensureUuidId(document: StoredDocument): StoredDocument {
  if (typeof document.id === "string" && isUuid(document.id)) return document;
  return { ...document, id: makeUuid() };
}

// ---------- guest storage (IndexedDB ONLY) ----------

async function loadGuestDocuments(): Promise<StoredDocument[]> {
  try {
    const idb = await idbGet<StoredDocument[]>(GUEST_IDB_KEY);
    return safeParseList(idb ?? []);
  } catch {
    // no fallback storage (localStorage removed)
    return [];
  }
}

async function saveGuestDocuments(list: StoredDocument[]) {
  try {
    await idbSet(GUEST_IDB_KEY, list);
  } catch {
    // no fallback storage (localStorage removed)
  }
}

async function clearGuestDocuments() {
  try {
    await idbDel(GUEST_IDB_KEY);
  } catch {
    // no fallback storage (localStorage removed)
  }
}

// ---------- user storage (Supabase) ----------

async function loadUserDocuments(): Promise<StoredDocument[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, data, created_at, updated_at")
    .eq("bucket", BUCKET)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to load documents from Supabase:", error.message);
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
    } as StoredDocument;
  });

  return safeParseList(mapped);
}

/**
 * Returns the final document used for upsert.
 * (If the document had a non-uuid id, we replace it with a uuid to avoid Supabase errors.)
 */
async function upsertUserDocument(document: StoredDocument): Promise<StoredDocument> {
  const supabase = getSupabaseClient();

  const fixed = ensureUuidId(document);

  const { error } = await supabase.from(TABLE).upsert(
    {
      id: fixed.id,
      bucket: BUCKET,
      data: fixed,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Failed to upsert document in Supabase:", error.message);
  }

  return fixed;
}

async function deleteUserDocument(id: string) {
  const supabase = getSupabaseClient();

  // If it's not uuid, it won't exist in Supabase anyway
  if (!isUuid(id)) return;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("bucket", BUCKET);

  if (error) {
    console.error("Failed to delete document in Supabase:", error.message);
  }
}

// ---------- mode detection ----------

export async function detectDocumentsMode(): Promise<DocumentsStorageMode> {
  return getModeCached();
}

// ---------- public API ----------

export async function loadDocuments(): Promise<{
  mode: DocumentsStorageMode;
  items: StoredDocument[];
}> {
  const mode = await detectDocumentsMode();
  if (mode === "user") {
    const items = await loadUserDocuments();
    const userId = await getActiveUserId();
    if (userId) await writeUserCache(GUEST_IDB_KEY, userId, items);
    return { mode, items };
  }

  const items = await loadGuestDocuments();
  if (items.length > 0) return { mode, items };

  const lastUserId = getFallbackUserId();
  if (lastUserId) {
    const cached = await readUserCache<StoredDocument[]>(GUEST_IDB_KEY, lastUserId);
    const fallback = safeParseList(cached ?? []);
    if (fallback.length > 0) return { mode, items: fallback };
  }

  return { mode, items };
}

/**
 * Upsert document and return the final document (id might be replaced with a uuid in user mode).
 */
export async function upsertDocument(document: StoredDocument, mode?: DocumentsStorageMode) {
  void mode;
  const actualMode = await detectDocumentsMode();
  let finalDocument = document;

  if (actualMode === "user") {
    finalDocument = await upsertUserDocument(document);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<StoredDocument>(
        GUEST_IDB_KEY,
        userId,
        safeParseList,
        (prev) => {
          const idx = prev.findIndex((x) => x.id === finalDocument.id);
          return idx === -1
            ? [finalDocument, ...prev]
            : prev.map((x) => (x.id === finalDocument.id ? finalDocument : x));
        }
      );
    }
  } else {
    const prev = await loadGuestDocuments();
    const idx = prev.findIndex((x) => x.id === document.id);
    const next =
      idx === -1
        ? [document, ...prev]
        : prev.map((x) => (x.id === document.id ? document : x));
    await saveGuestDocuments(next);
  }

  notifyCountsChanged();
  return finalDocument;
}

export async function deleteDocument(id: string, mode?: DocumentsStorageMode) {
  void mode;
  const actualMode = await detectDocumentsMode();

  if (actualMode === "user") {
    await deleteUserDocument(id);
    const userId = await getActiveUserId();
    if (userId) {
      await updateUserCacheList<StoredDocument>(
        GUEST_IDB_KEY,
        userId,
        safeParseList,
        (prev) => prev.filter((x) => x.id !== id)
      );
    }
  } else {
    const prev = await loadGuestDocuments();
    const next = prev.filter((x) => x.id !== id);
    await saveGuestDocuments(next);
  }

  notifyCountsChanged();
}

/**
 * When a user signs in, move guest Documents data into Supabase.
 * We also convert any old non-UUID ids into UUIDs to prevent insert failures.
 */
export async function migrateGuestDocumentsToUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;

  const userId = data.session.user.id;

  const guest = await loadGuestDocuments();
  if (guest.length === 0) return;

  const fixedGuest = guest.map((d) => ensureUuidId(d));

  const payload = fixedGuest.map((document) => ({
    id: document.id,
    bucket: BUCKET,
    data: document,
  }));

  const { error } = await supabase.from(TABLE).upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.error("Guest → user documents migration failed:", error.message);
    return;
  }

  await writeUserCache(GUEST_IDB_KEY, userId, fixedGuest);

  await clearGuestDocuments();
  notifyCountsChanged();
}

/**
 * Upload a file to Supabase Storage (authenticated users) or convert to base64 (guest users)
 */
export async function uploadDocumentFile(
  file: File,
  documentId: string,
  mode?: DocumentsStorageMode
): Promise<{ url?: string; fileName: string; fileSize: number; fileType: string; fileData?: string } | null> {
  const actualMode = mode ?? await detectDocumentsMode();

  if (actualMode === "guest") {
    // For guest users, convert file to base64 for IndexedDB storage
    try {
      const fileData = await fileToBase64(file);
      return {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileData: fileData,
      };
    } catch (error) {
      console.error("Failed to convert file to base64:", error);
      return null;
    }
  }

  // For authenticated users, upload to Supabase Storage
  const supabase = getSupabaseClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("User must be authenticated to upload files to Supabase");
    return null;
  }

  // Create a unique file path: userId/documentId/filename
  const fileExt = file.name.split(".").pop();
  const fileName = file.name;
  const filePath = `${user.id}/${documentId}/${Date.now()}_${fileName}`;

  try {
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("File upload error:", error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      fileName: fileName,
      fileSize: file.size,
      fileType: file.type,
    };
  } catch (error) {
    console.error("Unexpected error during file upload:", error);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteDocumentFile(fileUrl: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    // Extract file path from URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const urlParts = fileUrl.split(`/${STORAGE_BUCKET}/`);
    if (urlParts.length < 2) {
      console.error("Invalid file URL format");
      return false;
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error("File deletion error:", error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unexpected error during file deletion:", error);
    return false;
  }
}

/**
 * Download a document file (works for both guest and authenticated users)
 */
export function downloadDocumentFile(
  doc: StoredDocument
): void {
  if (!doc.fileName) return;

  if (doc.fileData) {
    // Guest user: download from base64 data
    const blob = base64ToBlob(doc.fileData, doc.fileType || "application/octet-stream");
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = doc.fileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else if (doc.fileUrl) {
    // Authenticated user: download from Supabase URL
    const link = window.document.createElement("a");
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    link.target = "_blank";
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  }
}
