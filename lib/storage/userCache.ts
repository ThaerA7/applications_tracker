"use client";

import { idbDel, idbGet, idbSet } from "./indexedDb";
import { getLastKnownUserId, getUserIdCached } from "../supabase/sessionCache";

export function userCacheKey(baseKey: string, userId: string) {
  return `${baseKey}:user:${userId}`;
}

export async function getActiveUserId(): Promise<string | null> {
  return getUserIdCached();
}

export function getFallbackUserId(): string | null {
  return getLastKnownUserId();
}

export async function readUserCache<T>(baseKey: string, userId: string): Promise<T | null> {
  try {
    const v = await idbGet<T>(userCacheKey(baseKey, userId));
    return v ?? null;
  } catch {
    return null;
  }
}

export async function writeUserCache<T>(baseKey: string, userId: string, value: T) {
  try {
    await idbSet(userCacheKey(baseKey, userId), value);
  } catch {
    // ignore
  }
}

export async function clearUserCache(baseKey: string, userId: string) {
  try {
    await idbDel(userCacheKey(baseKey, userId));
  } catch {
    // ignore
  }
}

export async function updateUserCacheList<T>(
  baseKey: string,
  userId: string,
  parse: (raw: any) => T[],
  update: (prev: T[]) => T[]
): Promise<T[]> {
  const prevRaw = await readUserCache<any>(baseKey, userId);
  const prev = parse(prevRaw ?? []);
  const next = update(prev);
  await writeUserCache(baseKey, userId, next);
  return next;
}
