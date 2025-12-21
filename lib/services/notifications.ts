"use client";

import { loadInterviews } from "@/lib/services/interviews";
import { loadApplied } from "@/lib/services/applied";
import { loadOffers } from "@/lib/services/offers";
import { loadRejected } from "@/lib/services/rejected";
import { loadWithdrawn } from "@/lib/services/withdrawn";

// Storage keys
const NOTIFICATION_PERMISSION_KEY = "job-tracker:notification-permission";
const LAST_DIGEST_SHOWN_KEY = "job-tracker:last-digest-shown";
const NOTIFIED_INTERVIEWS_KEY = "job-tracker:notified-interviews";

// Events
export const WEEKLY_DIGEST_EVENT = "job-tracker:show-weekly-digest";

export type WeeklyDigestData = {
  weekStart: string;
  weekEnd: string;
  applied: number;
  interviews: number;
  offers: number;
  rejected: number;
  withdrawn: number;
  upcomingInterviews: Array<{
    id: string;
    company: string;
    role: string;
    date: string;
  }>;
};

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("Browser does not support notifications");
    return "denied";
  }

  const permission = await Notification.requestPermission();
  localStorage.setItem(NOTIFICATION_PERMISSION_KEY, permission);
  return permission;
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  if (!("Notification" in window)) return false;
  return Notification.permission === "granted";
}

/**
 * Get stored notification permission
 */
export function getStoredPermission(): NotificationPermission | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(
    NOTIFICATION_PERMISSION_KEY
  ) as NotificationPermission | null;
}

/**
 * Send a browser notification
 */
export function sendNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!areNotificationsEnabled()) return null;

  try {
    const notification = new Notification(title, {
      icon: "/icons/site_logo.png",
      badge: "/icons/site_logo.png",
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (error) {
    console.error("Failed to send notification:", error);
    return null;
  }
}

/**
 * Get interviews that have already been notified
 */
function getNotifiedInterviews(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_INTERVIEWS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

/**
 * Mark an interview as notified
 */
function markInterviewNotified(interviewId: string): void {
  const notified = getNotifiedInterviews();
  notified.add(interviewId);

  // Keep only last 100 entries to prevent bloat
  const arr = Array.from(notified).slice(-100);
  localStorage.setItem(NOTIFIED_INTERVIEWS_KEY, JSON.stringify(arr));
}

/**
 * Format countdown for notification
 */
function formatCountdown(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days} day${days !== 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return `in ${hours} hour${hours !== 1 ? "s" : ""}${
      minutes > 0 ? ` ${minutes}m` : ""
    }`;
  }
  return `in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

/**
 * Check for upcoming interviews and send reminders
 */
export async function checkInterviewReminders(): Promise<void> {
  if (!areNotificationsEnabled()) return;

  try {
    const { items } = await loadInterviews();
    const now = Date.now();
    const notified = getNotifiedInterviews();

    for (const interview of items) {
      if (!interview.date) continue;

      const interviewTime = new Date(interview.date).getTime();
      if (Number.isNaN(interviewTime)) continue;

      const diff = interviewTime - now;

      // Skip past interviews
      if (diff < 0) continue;

      // Reminder window: 24 hours before
      const HOUR = 60 * 60 * 1000;

      const reminderKey24h = `${interview.id}-24h`;

      // 24-hour reminder (between 24h and 23h before)
      if (
        diff <= 24 * HOUR &&
        diff > 23 * HOUR &&
        !notified.has(reminderKey24h)
      ) {
        sendNotification(`Interview tomorrow: ${interview.company}`, {
          body: `${interview.role || "Interview"} ${formatCountdown(diff)}`,
          tag: reminderKey24h,
        });
        markInterviewNotified(reminderKey24h);
      }
    }
  } catch (error) {
    console.error("Failed to check interview reminders:", error);
  }
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Check if we should show the weekly digest
 * Shows on first visit of the week (Monday or later if not visited on Monday)
 */
export function shouldShowWeeklyDigest(): boolean {
  const now = new Date();
  const thisWeekStart = getWeekStart(now);

  // Check if we've already shown the digest this week
  const lastShown = localStorage.getItem(LAST_DIGEST_SHOWN_KEY);
  if (lastShown) {
    const lastShownDate = new Date(lastShown);
    if (lastShownDate >= thisWeekStart) {
      return false; // Already shown this week
    }
  }

  return true;
}

/**
 * Mark the weekly digest as shown
 */
export function markDigestShown(): void {
  localStorage.setItem(LAST_DIGEST_SHOWN_KEY, new Date().toISOString());
}

/**
 * Calculate weekly digest data
 */
export async function calculateWeeklyDigest(): Promise<WeeklyDigestData> {
  const now = new Date();
  const thisWeekStart = getWeekStart(now);

  // Last week's range
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setMilliseconds(-1);
  const lastWeekStart = getWeekStart(lastWeekEnd);

  const isInLastWeek = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= lastWeekStart && d <= lastWeekEnd;
  };

  // Load all data
  const [appliedData, interviewsData, offersData, rejectedData, withdrawnData] =
    await Promise.all([
      loadApplied(),
      loadInterviews(),
      loadOffers(),
      loadRejected(),
      loadWithdrawn(),
    ]);

  // Count items from last week (by appliedOn or relevant date)
  const appliedCount = appliedData.items.filter((item: any) =>
    isInLastWeek(item.appliedOn)
  ).length;

  const interviewsCount = interviewsData.items.filter((item: any) =>
    isInLastWeek(item.date)
  ).length;

  const offersCount = offersData.items.filter((item: any) =>
    isInLastWeek(item.offerReceivedDate || item.decisionDate)
  ).length;

  const rejectedCount = rejectedData.items.filter((item: any) =>
    isInLastWeek(item.decisionDate)
  ).length;

  const withdrawnCount = withdrawnData.items.filter((item: any) =>
    isInLastWeek(item.withdrawnDate)
  ).length;

  // Get upcoming interviews for this week
  const upcomingInterviews = interviewsData.items
    .filter((item: any) => {
      if (!item.date) return false;
      const d = new Date(item.date);
      return d >= now;
    })
    .slice(0, 3)
    .map((item: any) => ({
      id: item.id,
      company: item.company || "Unknown",
      role: item.role || "Interview",
      date: item.date,
    }));

  return {
    weekStart: lastWeekStart.toISOString(),
    weekEnd: lastWeekEnd.toISOString(),
    applied: appliedCount,
    interviews: interviewsCount,
    offers: offersCount,
    rejected: rejectedCount,
    withdrawn: withdrawnCount,
    upcomingInterviews,
  };
}

/**
 * Send weekly digest notification
 */
export async function sendWeeklyDigestNotification(): Promise<void> {
  if (!areNotificationsEnabled()) return;

  try {
    const digest = await calculateWeeklyDigest();
    const total =
      digest.applied +
      digest.interviews +
      digest.offers +
      digest.rejected +
      digest.withdrawn;

    if (total > 0) {
      sendNotification("Weekly Job Search Digest", {
        body: `Last week: ${digest.applied} applied, ${digest.interviews} interviews, ${digest.offers} offers`,
        tag: "weekly-digest",
      });
    }
  } catch (error) {
    console.error("Failed to send weekly digest:", error);
  }
}

/**
 * Trigger the weekly digest dialog
 */
export function triggerWeeklyDigestDialog(): void {
  window.dispatchEvent(new CustomEvent(WEEKLY_DIGEST_EVENT));
}

/**
 * Initialize notification system
 * Call this on app load
 */
export function initializeNotifications(
  remindersEnabled: boolean,
  digestEnabled: boolean
): () => void {
  if (typeof window === "undefined") return () => {};

  let intervalId: NodeJS.Timeout | null = null;

  // Check reminders every minute if enabled
  if (remindersEnabled && areNotificationsEnabled()) {
    checkInterviewReminders(); // Initial check
    intervalId = setInterval(checkInterviewReminders, 60 * 1000);
  }

  // Check for weekly digest on Mondays
  if (digestEnabled && shouldShowWeeklyDigest()) {
    // Slight delay to let the app fully load
    setTimeout(() => {
      triggerWeeklyDigestDialog();
      if (areNotificationsEnabled()) {
        sendWeeklyDigestNotification();
      }
    }, 2000);
  }

  // Cleanup function
  return () => {
    if (intervalId) clearInterval(intervalId);
  };
}
