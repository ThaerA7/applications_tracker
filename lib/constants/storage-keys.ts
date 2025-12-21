/**
 * Centralized storage keys for localStorage and IndexedDB
 * Using consistent naming convention: job-tracker:{feature}:{item}
 */
export const STORAGE_KEYS = {
  // Core data stores
  APPLIED: "job-tracker:applied",
  INTERVIEWS: "job-tracker:interviews",
  OFFERS: "job-tracker:offers",
  REJECTED: "job-tracker:rejected",
  WITHDRAWN: "job-tracker:withdrawn",
  WISHLIST: "job-tracker:wishlist",
  NOTES: "job-tracker:notes",

  // Activity logs
  ACTIVITY_APPLIED: "job-tracker:applied-activity",
  ACTIVITY_INTERVIEWS: "job-tracker:interviews-activity",
  ACTIVITY_OFFERS: "job-tracker:offers-activity",
  ACTIVITY_REJECTED: "job-tracker:rejected-activity",
  ACTIVITY_WITHDRAWN: "job-tracker:withdrawn-activity",

  // UI state
  SIDEBAR_COLLAPSED: "job-tracker:sidebar-collapsed",
  SIDEBAR_ALWAYS_COLLAPSED: "job-tracker:sidebar-always-collapsed",
  SIGNIN_GATE_SHOWN: "job-tracker:signin-gate-shown",

  // Goals
  GOALS: "job-tracker:goals",

  // User cache
  USER_CACHE: "job-tracker:user-cache",
} as const;

export const EVENTS = {
  REFRESH_COUNTS: "job-tracker:refresh-counts",
  SET_SIDEBAR_ALWAYS_COLLAPSED: "job-tracker:set-sidebar-always-collapsed",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
