/**
 * Shared service utilities to reduce duplication across service files
 */

/**
 * Generate a UUID v4 string
 */
export function makeUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Alias for makeUuid for compatibility
 */
export const makeUuidV4 = makeUuid;

/**
 * Safe type guard to check if a value is a non-null object
 */
export function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Dispatch custom event to notify that counts have changed
 */
export function notifyCountsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("counts-changed"));
  }
}

/**
 * Create a safe JSON parser for arrays with validation
 */
export function safeParseList<T>(
  raw: unknown,
  validator?: (item: unknown) => item is T
): T[] {
  if (!Array.isArray(raw)) return [];
  if (validator) {
    return raw.filter(validator);
  }
  return raw as T[];
}
