/**
 * Shared date utility functions for filters
 */

export type DateFilterPreset =
  | "any"
  | "last7"
  | "last30"
  | "last90"
  | "thisYear"
  | "custom";

export type InterviewDatePreset =
  | DateFilterPreset
  | "next7"
  | "next30"
  | "next90";

/**
 * Safely parse a date string, returns null if invalid
 */
export function parseDateSafe(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Get start of day (00:00:00.000)
 */
export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Get end of day (23:59:59.999)
 */
export function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/**
 * Add days to a date
 */
export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export type DateRange = {
  from: Date | null;
  to: Date | null;
};

/**
 * Get date range for a preset (past-oriented: last7, last30, etc.)
 */
export function presetRange(preset: DateFilterPreset): DateRange {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (preset) {
    case "last7": {
      const from = new Date(todayStart);
      from.setDate(from.getDate() - 6);
      return { from, to: todayEnd };
    }
    case "last30": {
      const from = new Date(todayStart);
      from.setDate(from.getDate() - 29);
      return { from, to: todayEnd };
    }
    case "last90": {
      const from = new Date(todayStart);
      from.setDate(from.getDate() - 89);
      return { from, to: todayEnd };
    }
    case "thisYear": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: startOfDay(from), to: todayEnd };
    }
    default:
      return { from: null, to: null };
  }
}

/**
 * Get date range for interview presets (supports both past and future)
 */
export function presetRangeForStage(
  preset: InterviewDatePreset,
  stageForRange: "upcoming" | "past"
): DateRange {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (stageForRange === "upcoming") {
    switch (preset) {
      case "next7":
        return { from: todayStart, to: addDays(todayEnd, 6) };
      case "next30":
        return { from: todayStart, to: addDays(todayEnd, 29) };
      case "next90":
        return { from: todayStart, to: addDays(todayEnd, 89) };
      default:
        return { from: null, to: null };
    }
  }

  // stageForRange === "past"
  switch (preset) {
    case "last7":
      return { from: addDays(todayStart, -6), to: todayEnd };
    case "last30":
      return { from: addDays(todayStart, -29), to: todayEnd };
    case "last90":
      return { from: addDays(todayStart, -89), to: todayEnd };
    case "thisYear": {
      const from = startOfDay(new Date(now.getFullYear(), 0, 1));
      return { from, to: todayEnd };
    }
    default:
      return { from: null, to: null };
  }
}
