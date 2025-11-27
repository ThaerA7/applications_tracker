// calendarUtils.ts

export type ActivityKind =
  | "applied"
  | "interview"
  | "rejected"
  | "withdrawn"
  | "offer";

export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: ActivityKind;
  title: string;
  subtitle?: string;
  /** Optional HH:MM (from original ISO) */
  time?: string;
  /** Optional full datetime ISO used for countdowns */
  dateTime?: string;
  /** used in CalendarDaySidebar under the title */
  location?: string;
  employmentType?: string;
};

export type GridDay = {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
};

export type MonthStats = {
  total: number;
  byKind: Record<ActivityKind, number>;
  outcomes: number;
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const KIND_META: Record<
  ActivityKind,
  { label: string; badge: string; accentDot: string }
> = {
  applied: {
    label: "Applied",
    badge: "bg-sky-50 text-sky-800 ring-sky-200",
    accentDot: "bg-sky-500",
  },
  interview: {
    label: "Interview",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    accentDot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-rose-50 text-rose-800 ring-rose-200",
    accentDot: "bg-rose-500",
  },
  withdrawn: {
    label: "Withdrawn",
    badge: "bg-amber-50 text-amber-900 ring-amber-200",
    accentDot: "bg-amber-500",
  },
  offer: {
    label: "Offer",
    badge: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200",
    accentDot: "bg-fuchsia-500",
  },
};

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function normalizeDate(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [datePart] = trimmed.split("T");
  if (!datePart) return null;

  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return null;

  const year = y.padStart(4, "0");
  const month = m.padStart(2, "0");
  const day = d.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function extractTime(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const [, timePartRaw] = trimmed.split("T");
  if (!timePartRaw) return null;
  const [hh, mm] = timePartRaw.split(":");
  if (!hh || !mm) return null;
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

export function buildMonthGrid(year: number, month: number): GridDay[] {
  // month: 0–11, Monday-first grid
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // convert Sun=0 to Mon=0
  const daysBefore = startWeekday;
  const totalCells = 42; // 6 weeks * 7 days

  const grid: GridDay[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - daysBefore;
    const d = new Date(year, month, 1 + dayOffset);
    grid.push({
      date: d,
      iso: toIsoDate(d),
      inCurrentMonth: d.getMonth() === month,
    });
  }

  return grid;
}

export function formatHumanDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const asDate = new Date(Number(y), Number(m) - 1, Number(d));
  try {
    return asDate.toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatHumanDateTime(date: string, time?: string): string {
  const base = formatHumanDate(date);
  if (time) return `${base} · ${time}`;
  return base;
}

export function getCountdownParts(ev: CalendarEvent, now: Date | null) {
  if (!now) return null;

  const baseIso =
    ev.dateTime ?? (ev.time ? `${ev.date}T${ev.time}` : `${ev.date}T00:00:00`);

  const target = new Date(baseIso);
  if (Number.isNaN(target.getTime())) return null;

  const diffMs = target.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const abs = Math.abs(diffMs);

  const totalSeconds = Math.floor(abs / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isPast };
}

export function getMonthStats(
  events: CalendarEvent[],
  year: number,
  month: number
): MonthStats {
  const monthEvents = events.filter((ev) => {
    const [y, m] = ev.date.split("-");
    if (!y || !m) return false;
    return Number(y) === year && Number(m) === month + 1;
  });

  const countByKind: Record<ActivityKind, number> = {
    applied: 0,
    interview: 0,
    rejected: 0,
    withdrawn: 0,
    offer: 0,
  };

  monthEvents.forEach((ev) => {
    countByKind[ev.kind] += 1;
  });

  const outcomes =
    countByKind.rejected + countByKind.withdrawn + countByKind.offer;

  return {
    total: monthEvents.length,
    byKind: countByKind,
    outcomes,
  };
}

// generic percentage helper (used for outcomes)
export function percentage(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

// average events per week in a given month (year, month = 0-based)
export function avgPerWeek(total: number, year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = daysInMonth / 7;
  if (!weeks) return 0;
  return total / weeks;
}

// month-over-month growth percentage; null when previous is 0
export function growthPercent(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}
