"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, PhoneCall, Sparkles } from "lucide-react";
import CalendarDaySidebar, {
  type CalendarDayEvent,
} from "./CalendarDaySidebar";

type ActivityKind =
  | "applied"
  | "interview"
  | "rejected"
  | "withdrawn"
  | "offer";

type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: ActivityKind;
  title: string;
  subtitle?: string;
  /** Optional HH:MM (from original ISO) */
  time?: string;
  /** Optional full datetime ISO used for countdowns */
  dateTime?: string;
  /** NEW: used in CalendarDaySidebar under the title */
  location?: string;
  employmentType?: string;
};

const MONTH_NAMES = [
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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const KIND_META: Record<
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

type GridDay = {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
};

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeDate(value: unknown): string | null {
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

function extractTime(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const [, timePartRaw] = trimmed.split("T");
  if (!timePartRaw) return null;
  const [hh, mm] = timePartRaw.split(":");
  if (!hh || !mm) return null;
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

function buildMonthGrid(year: number, month: number): GridDay[] {
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

function formatHumanDate(iso: string): string {
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

function formatHumanDateTime(date: string, time?: string): string {
  const base = formatHumanDate(date);
  if (time) return `${base} · ${time}`;
  return base;
}

function getCountdownParts(ev: CalendarEvent, now: Date | null) {
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

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [monthState, setMonthState] = useState(() => {
    const base = new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  // Live countdown (seconds)
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1_000); // update every second
    return () => window.clearInterval(id);
  }, []);

  // Load all activity from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const collected: CalendarEvent[] = [];

    const parseArray = (key: string): any[] => {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const addEvent = (event: CalendarEvent | null | undefined) => {
      if (!event || !event.date) return;
      collected.push(event);
    };

    // --- Interviews ---
    const interviews = parseArray("job-tracker:interviews");
    interviews.forEach((item: any) => {
      const dateOnly = normalizeDate(item.date);
      if (!dateOnly) return;
      const time = extractTime(item.date);

      addEvent({
        id: `interview-${item.id ?? item.date ?? dateOnly}`,
        date: dateOnly,
        kind: "interview",
        title: item.company || "Interview",
        subtitle: item.role,
        time: time || undefined,
        dateTime: typeof item.date === "string" ? item.date : undefined,
        location: item.location,
        employmentType: item.employmentType,
      });
    });

    // --- Rejected ---
    const rejected = parseArray("job-tracker:rejected");
    rejected.forEach((item: any) => {
      const applied = normalizeDate(item.appliedDate);
      if (applied) {
        addEvent({
          id: `applied-from-rejected-${item.id ?? applied}`,
          date: applied,
          kind: "applied",
          title: item.company || "Applied",
          subtitle: item.role,
          location: item.location,
          employmentType: item.employmentType,
        });
      }

      const decision = normalizeDate(item.decisionDate);
      if (decision) {
        addEvent({
          id: `rejected-${item.id ?? decision}`,
          date: decision,
          kind: "rejected",
          title: item.company || "Rejected",
          subtitle: item.role,
          location: item.location,
          employmentType: item.employmentType,
        });
      }
    });

    // --- Withdrawn ---
    const withdrawn = parseArray("job-tracker:withdrawn");
    withdrawn.forEach((item: any) => {
      const applied =
        normalizeDate(item.appliedOn) || normalizeDate(item.appliedDate);
      if (applied) {
        addEvent({
          id: `applied-from-withdrawn-${item.id ?? applied}`,
          date: applied,
          kind: "applied",
          title: item.company || "Applied",
          subtitle: item.role,
          location: item.location,
          employmentType: item.employmentType,
        });
      }

      const interviewDateOnly = normalizeDate(item.interviewDate);
      if (interviewDateOnly) {
        const time = extractTime(item.interviewDate);
        addEvent({
          id: `interview-from-withdrawn-${
            item.id ?? item.interviewDate ?? interviewDateOnly
          }`,
          date: interviewDateOnly,
          kind: "interview",
          title: item.company || "Interview",
          subtitle: item.role,
          time: time || undefined,
          dateTime:
            typeof item.interviewDate === "string"
              ? item.interviewDate
              : undefined,
          location: item.location,
          employmentType: item.employmentType,
        });
      }

      const withdrawnDate = normalizeDate(item.withdrawnDate);
      if (withdrawnDate) {
        addEvent({
          id: `withdrawn-${item.id ?? withdrawnDate}`,
          date: withdrawnDate,
          kind: "withdrawn",
          title: item.company || "Withdrawn",
          subtitle: item.role,
          location: item.location,
          employmentType: item.employmentType,
        });
      }
    });

    // --- Applied-only lists (if you have them) ---
    ["job-tracker:applied", "job-tracker:applications"].forEach((key) => {
      const arr = parseArray(key);
      arr.forEach((item: any) => {
        const date =
          normalizeDate(item.appliedOn) ||
          normalizeDate(item.appliedDate) ||
          normalizeDate(item.date) ||
          normalizeDate(item.createdAt);
        if (!date) return;
        addEvent({
          id: `applied-${key}-${item.id ?? date}`,
          date,
          kind: "applied",
          title: item.company || "Applied",
          subtitle: item.role,
          location: item.location,
          employmentType: item.employmentType,
        });
      });
    });

    // --- Offers (optional) ---
    const offers = parseArray("job-tracker:offers");
    offers.forEach((item: any) => {
      const date =
        normalizeDate(item.offerDate) ||
        normalizeDate(item.acceptedDate) ||
        normalizeDate(item.createdAt);
      if (!date) return;
      addEvent({
        id: `offer-${item.id ?? date}`,
        date,
        kind: "offer",
        title: item.company || "Offer",
        subtitle: item.role,
        location: item.location,
        employmentType: item.employmentType,
      });
    });

    // Deduplicate by (kind, date, title, subtitle, time)
    const map = new Map<string, CalendarEvent>();
    for (const ev of collected) {
      const key = `${ev.kind}-${ev.date}-${ev.title}-${ev.subtitle ?? ""}-${
        ev.time ?? ""
      }`;
      if (!map.has(key)) {
        map.set(key, ev);
      }
    }

    const unique = Array.from(map.values());
    setEvents(unique);

    // Default selected date: today if it has activity, else none
    const todayHasEvents = unique.some((ev) => ev.date === todayIso);
    if (todayHasEvents) {
      setSelectedDate(todayIso);
    }
  }, [todayIso]);

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (!grouped[ev.date]) grouped[ev.date] = [];
      grouped[ev.date].push(ev);
    }

    Object.values(grouped).forEach((list) =>
      list.sort((a, b) => a.kind.localeCompare(b.kind))
    );

    return grouped;
  }, [events]);

  const grid = useMemo(
    () => buildMonthGrid(monthState.year, monthState.month),
    [monthState]
  );

  const selectedEvents: CalendarDayEvent[] =
    selectedDate && eventsByDate[selectedDate]
      ? (eventsByDate[selectedDate] as CalendarDayEvent[])
      : [];

  const selectedDateLabel = selectedDate ? formatHumanDate(selectedDate) : "";

  const handlePrevMonth = () => {
    setMonthState((prev) => {
      const month = prev.month - 1;
      if (month < 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month };
    });
  };

  const handleNextMonth = () => {
    setMonthState((prev) => {
      const month = prev.month + 1;
      if (month > 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month };
    });
  };

  const handleToday = () => {
    const nowDate = new Date();
    const iso = toIsoDate(nowDate);
    setMonthState({ year: nowDate.getFullYear(), month: nowDate.getMonth() });
    setSelectedDate(iso);
    setSidebarOpen(true);
  };

  const handleDayClick = (iso: string) => {
    setSelectedDate(iso);
    setSidebarOpen(true);
  };

  // Month-level stats
  const monthStats = useMemo(() => {
    const monthEvents = events.filter((ev) => {
      const [y, m] = ev.date.split("-");
      if (!y || !m) return false;
      return (
        Number(y) === monthState.year && Number(m) === monthState.month + 1
      );
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
  }, [events, monthState]);

  // Upcoming interviews (from now onwards, considering time if available)
  const upcomingInterviews = useMemo(() => {
    if (!now) return [];

    const nowMs = now.getTime();

    return events
      .filter((ev) => ev.kind === "interview")
      .filter((ev) => {
        const dateTimeStr =
          ev.dateTime ??
          (ev.time ? `${ev.date}T${ev.time}` : `${ev.date}T23:59:59`);
        const dt = new Date(dateTimeStr);
        if (Number.isNaN(dt.getTime())) return false;
        return dt.getTime() >= nowMs;
      })
      .sort((a, b) => {
        const aStr =
          a.dateTime ?? (a.time ? `${a.date}T${a.time}` : `${a.date}T23:59:59`);
        const bStr =
          b.dateTime ?? (b.time ? `${b.date}T${b.time}` : `${b.date}T23:59:59`);
        return aStr.localeCompare(bStr);
      })
      .slice(0, 5);
  }, [events, now]);

  const nextInterview = upcomingInterviews[0] ?? null;
  const laterInterviews = nextInterview ? upcomingInterviews.slice(1) : [];

  const pad = (n: number) => `${n}`.padStart(2, "0");

  return (
    <>
      <section
        className={[
          "relative rounded-2xl border border-neutral-200/70",
          "bg-gradient-to-br from-indigo-50 via-white to-sky-50",
          "p-6 sm:p-8 shadow-md overflow-hidden",
        ].join(" ")}
      >
        {/* soft blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative z-10">
          {/* Header */}
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Left: icon + title, subtitle below */}
            <div>
              <div className="flex items-center gap-1">
                <Image
                  src="/icons/calendar.png"
                  alt=""
                  width={37}
                  height={37}
                  aria-hidden="true"
                  className="shrink-0 -mt-1"
                />
                <h1 className="text-2xl font-semibold text-neutral-900">
                  Activity calendar
                </h1>
              </div>
              <p className="mt-1 text-sm text-neutral-700">
                See when you applied, interviewed, got responses, or withdrew —
                all in one clean view.
              </p>
            </div>
          </header>

          {/* Month stats */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-sm">
              <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                This month
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-semibold text-neutral-900">
                  {monthStats.total}
                </span>
                <span className="text-xs text-neutral-500">total events</span>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-sm flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Applications
                </div>
                <div className="mt-1 text-lg font-semibold text-neutral-900">
                  {monthStats.byKind.applied}
                </div>
              </div>
              <div className="flex -space-x-1">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-sm flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Outcomes
                </div>
                <div className="mt-1 text-lg font-semibold text-neutral-900">
                  {monthStats.outcomes}
                </div>
              </div>
              <div className="flex -space-x-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="h-2 w-2 rounded-full bg-fuchsia-500" />
              </div>
            </div>
          </div>

          {/* Main layout: calendar + upcoming */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
            {/* Left: calendar */}
            <div className="flex flex-col">
              <div className="rounded-2xl border border-neutral-200/80 bg-white/85 p-4 shadow-sm backdrop-blur">
                {/* Legend + month navigation in SAME ROW */}
                <div className="mb-4 flex items-center justify-between gap-3">
                  {/* 4 tags (chips) */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {/* Applied */}
                    <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 shadow-sm">
                      <Image
                        src="/icons/checklist.png"
                        alt="Applied icon"
                        width={16}
                        height={16}
                        className="h-3.5 w-3.5"
                      />
                      <span className="font-medium text-neutral-900">
                        {KIND_META.applied.label}
                      </span>
                    </div>

                    {/* Interview */}
                    <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 shadow-sm">
                      <Image
                        src="/icons/interview.png"
                        alt="Interview icon"
                        width={16}
                        height={16}
                        className="h-3.5 w-3.5"
                      />
                      <span className="font-medium text-neutral-900">
                        {KIND_META.interview.label}
                      </span>
                    </div>

                    {/* Rejected */}
                    <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 shadow-sm">
                      <Image
                        src="/icons/cancel.png"
                        alt="Rejected icon"
                        width={16}
                        height={16}
                        className="h-3.5 w-3.5"
                      />
                      <span className="font-medium text-neutral-900">
                        {KIND_META.rejected.label}
                      </span>
                    </div>

                    {/* Withdrawn */}
                    <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 shadow-sm">
                      <Image
                        src="/icons/withdrawn.png"
                        alt="Withdrawn icon"
                        width={16}
                        height={16}
                        className="h-3.5 w-3.5"
                      />
                      <span className="font-medium text-neutral-900">
                        {KIND_META.withdrawn.label}
                      </span>
                    </div>
                  </div>

                  {/* Compact month switcher + Today on the same row (top right of calendar) */}
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                    <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white/80 px-2 py-1 shadow-sm">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <div className="px-1 min-w-[72px] text-center font-medium text-neutral-900">
                        {MONTH_NAMES[monthState.month].slice(0, 3)}{" "}
                        {monthState.year}
                      </div>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                        aria-label="Next month"
                      >
                        <ChevronRight className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleToday}
                      className="hidden sm:inline-flex items-center rounded-md border border-neutral-200 bg-white/80 px-2 py-1 text-[10px] font-medium text-neutral-700 shadow-sm hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                    >
                      Today
                    </button>
                  </div>
                </div>

                {/* Weekday header */}
                <div className="grid grid-cols-7 text-center text-[11px] font-medium text-neutral-500">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="h-8 leading-8">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Days */}
                <div className="mt-1 grid grid-cols-7 gap-1 text-xs">
                  {grid.map((day) => {
                    const dayEvents = eventsByDate[day.iso] ?? [];
                    const hasEvents = dayEvents.length > 0;
                    const isToday = day.iso === todayIso;
                    const isSelected = day.iso === selectedDate;

                    const uniqueKinds = Array.from(
                      new Set<ActivityKind>(dayEvents.map((e) => e.kind))
                    ).slice(0, 4);

                    const baseClasses =
                      "relative flex flex-col rounded-xl border p-1.5 min-h-[72px] text-left transition";

                    const classes = [
                      baseClasses,
                      day.inCurrentMonth
                        ? "bg-white/95 text-neutral-900"
                        : "bg-neutral-50/80 text-neutral-400",
                      hasEvents ? "border-neutral-200" : "border-neutral-100",
                      isToday
                        ? "ring-1 ring-emerald-400 ring-offset-[1px]"
                        : "",
                      isSelected ? "border-indigo-400 shadow-sm" : "",
                      "hover:bg-neutral-50",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => handleDayClick(day.iso)}
                        className={classes}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold">
                            {day.date.getDate()}
                          </span>
                          {isToday && (
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                              Today
                            </span>
                          )}
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-2">
                          <div className="flex -space-x-1">
                            {uniqueKinds.map((kind) => (
                              <span
                                key={kind}
                                className={`h-1.5 w-1.5 rounded-full border border-white ${KIND_META[kind].accentDot}`}
                              />
                            ))}
                          </div>
                          {hasEvents && (
                            <span className="text-[10px] text-neutral-500">
                              {dayEvents.length}{" "}
                              {dayEvents.length === 1 ? "event" : "events"}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: upcoming interviews + hint */}
            <div className="flex flex-col gap-4">
              {/* Upcoming interviews - redesigned */}
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/90 via-white to-emerald-50/70 p-3 sm:p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                      <PhoneCall className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div>
                      <h2 className="text-xs sm:text-sm font-semibold text-emerald-900">
                        Upcoming interviews
                      </h2>
                      <p className="text-[11px] text-emerald-800/80">
                        {upcomingInterviews.length > 0
                          ? "Your next scheduled interviews, sorted by date."
                          : "No upcoming interviews found."}
                      </p>
                    </div>
                  </div>

                  {upcomingInterviews.length > 0 && (
                    <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-medium text-emerald-800 shadow-sm">
                      {upcomingInterviews.length}{" "}
                      {upcomingInterviews.length === 1
                        ? "interview"
                        : "interviews"}
                    </span>
                  )}
                </div>

                {/* No upcoming */}
                {upcomingInterviews.length === 0 && (
                  <div className="mt-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-[11px] text-emerald-800/90">
                    Add interview dates in your tracker and they&apos;ll show up
                    here with a live countdown and quick access to that
                    day&apos;s activity.
                  </div>
                )}

                {/* Next interview card */}
                {nextInterview && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(nextInterview.date);
                      setSidebarOpen(true);
                    }}
                    className="mt-4 flex w-full items-stretch gap-3 rounded-xl border border-emerald-200 bg-white/95 px-3 py-2.5 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                  >
                    {/* Date pill */}
                    <div className="flex flex-col items-center justify-center rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-900">
                      <span className="text-base font-semibold leading-none">
                        {new Date(nextInterview.date).getDate()}
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wide">
                        {MONTH_NAMES[
                          new Date(nextInterview.date).getMonth()
                        ].slice(0, 3)}
                      </span>
                    </div>

                    {/* Info + countdown */}
                    <div className="flex flex-1 items-center justify-between gap-3">
                      {/* Main upcoming interview text */}
                      <div className="flex flex-col justify-center space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-sm sm:text-[15px] font-semibold text-neutral-900">
                            {nextInterview.title}
                          </span>
                          {nextInterview.subtitle && (
                            <span className="text-[11px] sm:text-sm text-neutral-600">
                              · {nextInterview.subtitle}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] sm:text-sm text-emerald-700 font-medium">
                          {formatHumanDateTime(
                            nextInterview.date,
                            nextInterview.time
                          )}
                        </div>
                      </div>

                      {/* Countdown: "Days: XX" then "HHh MMm SSs" */}
                      {(() => {
                        const parts = getCountdownParts(nextInterview, now);
                        if (!parts) return null;
                        const { days, hours, minutes, seconds } = parts;

                        return (
                          <div className="ml-auto flex h-full min-w-[110px] flex-col items-center justify-center rounded-xl bg-emerald-50 px-3 py-2 text-center text-[11px] sm:text-[12px] font-semibold text-emerald-900">
                            <span className="leading-tight">
                              Days: {pad(days)}
                            </span>
                            <span className="mt-0.5 text-[10px] sm:text-[11px] font-medium leading-tight">
                              {pad(hours)}h {pad(minutes)}m {pad(seconds)}s
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </button>
                )}

                {/* Later interviews list */}
                {laterInterviews.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-emerald-900/80">
                      <span>Later interviews</span>
                      <span className="text-emerald-700/80">
                        {laterInterviews.length} more
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white/90">
                      <ul className="divide-y divide-emerald-50 text-[11px]">
                        {laterInterviews.map((ev) => {
                          const parts = getCountdownParts(ev, now);

                          const evDate = new Date(ev.date);
                          const dayNum = evDate.getDate();
                          const monthLabel = MONTH_NAMES[
                            evDate.getMonth()
                          ].slice(0, 3);

                          return (
                            <li
                              key={ev.id}
                              className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 transition hover:bg-emerald-50/70"
                              onClick={() => {
                                setSelectedDate(ev.date);
                                setSidebarOpen(true);
                              }}
                            >
                              {/* Date pill on the left */}
                              <div className="flex flex-col items-center justify-center rounded-md bg-emerald-50 px-2 py-1 text-emerald-900">
                                <span className="text-[13px] font-semibold leading-none">
                                  {dayNum}
                                </span>
                                <span className="text-[9px] font-medium uppercase tracking-wide">
                                  {monthLabel}
                                </span>
                              </div>

                              <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                                {/* Later interviews text */}
                                <div className="flex flex-col justify-center min-w-0">
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="truncate text-xs sm:text-sm font-semibold text-neutral-900">
                                      {ev.title}
                                    </span>
                                    {ev.subtitle && (
                                      <span className="truncate text-[10px] sm:text-[11px] text-neutral-600">
                                        · {ev.subtitle}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] sm:text-[11px] text-emerald-700 font-medium">
                                    {formatHumanDateTime(ev.date, ev.time)}
                                  </div>
                                </div>

                                {/* Right-side countdown */}
                                {parts && (
                                  <div className="flex h-full min-w-[95px] flex-col items-center justify-center rounded-lg bg-emerald-50 px-2 py-1.5 text-[9px] sm:text-[10px] font-semibold text-emerald-900 text-center">
                                    <span className="leading-tight">
                                      Days: {pad(parts.days)}
                                    </span>
                                    <span className="mt-0.5 text-[9px] sm:text-[10px] font-medium leading-tight">
                                      {pad(parts.hours)}h {pad(parts.minutes)}m{" "}
                                      {pad(parts.seconds)}s
                                    </span>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Small hint card */}
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/70 p-3 text-[11px] text-neutral-600">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="font-medium text-neutral-900">
                      Use this to spot patterns.
                    </p>
                    <p className="mt-0.5">
                      For example, see which weeks you apply the most, or how
                      long it usually takes to get interviews or responses.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Day activity sidebar */}
      <CalendarDaySidebar
        open={sidebarOpen && !!selectedDate}
        onClose={() => setSidebarOpen(false)}
        dateIso={selectedDate}
        dateLabel={selectedDateLabel}
        events={selectedEvents}
      />
    </>
  );
}
