"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  PhoneCall,
  XCircle,
  Undo2,
  Sparkles,
} from "lucide-react";

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
    return asDate.toLocaleDateString("en-DE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [monthState, setMonthState] = useState(() => {
    const base = new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const todayIso = useMemo(() => toIsoDate(new Date()), []);

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
      const date = normalizeDate(item.date);
      if (!date) return;
      addEvent({
        id: `interview-${item.id ?? date}`,
        date,
        kind: "interview",
        title: item.company || "Interview",
        subtitle: item.role,
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
        });
      }

      const interviewDate = normalizeDate(item.interviewDate);
      if (interviewDate) {
        addEvent({
          id: `interview-from-withdrawn-${item.id ?? interviewDate}`,
          date: interviewDate,
          kind: "interview",
          title: item.company || "Interview",
          subtitle: item.role,
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
      });
    });

    // Deduplicate by (kind, date, title, subtitle)
    const map = new Map<string, CalendarEvent>();
    for (const ev of collected) {
      const key = `${ev.kind}-${ev.date}-${ev.title}-${ev.subtitle ?? ""}`;
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

    // small, but sort per day for nicer display
    Object.values(grouped).forEach((list) =>
      list.sort((a, b) => a.kind.localeCompare(b.kind))
    );

    return grouped;
  }, [events]);

  const grid = useMemo(
    () => buildMonthGrid(monthState.year, monthState.month),
    [monthState]
  );

  const selectedEvents =
    selectedDate && eventsByDate[selectedDate]
      ? eventsByDate[selectedDate]
      : [];

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
    const now = new Date();
    const iso = toIsoDate(now);
    setMonthState({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDate(iso);
  };

  return (
    <section
      className={[
        "relative rounded-2xl border border-neutral-200/70",
        "bg-gradient-to-br from-indigo-50 via-white to-sky-50",
        "p-8 shadow-md overflow-hidden",
      ].join(" ")}
    >
      {/* soft blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900">
              <CalendarIcon
                className="h-6 w-6 text-indigo-500"
                aria-hidden="true"
              />
              Activity calendar
            </h1>
            <p className="mt-1 text-sm text-neutral-700">
              A big overview of when you applied, interviewed, got rejected or
              withdrew.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white/80 px-2 py-1.5 shadow-sm">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="px-1 text-sm font-medium text-neutral-900">
                {MONTH_NAMES[monthState.month]} {monthState.year}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleToday}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              Today
            </button>
          </div>
        </header>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/80 px-2.5 py-1 shadow-sm">
            <Briefcase
              className="h-3.5 w-3.5 text-sky-600"
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium text-neutral-900">
              {KIND_META.applied.label}
            </span>
          </div>

          <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/80 px-2.5 py-1 shadow-sm">
            <PhoneCall
              className="h-3.5 w-3.5 text-emerald-600"
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium text-neutral-900">
              {KIND_META.interview.label}
            </span>
          </div>

          <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/80 px-2.5 py-1 shadow-sm">
            <XCircle className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
            <span className="text-[11px] font-medium text-neutral-900">
              {KIND_META.rejected.label}
            </span>
          </div>

          <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/80 px-2.5 py-1 shadow-sm">
            <Undo2 className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            <span className="text-[11px] font-medium text-neutral-900">
              {KIND_META.withdrawn.label}
            </span>
          </div>

          <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/80 px-2.5 py-1 shadow-sm">
            <Sparkles
              className="h-3.5 w-3.5 text-fuchsia-600"
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium text-neutral-900">
              {KIND_META.offer.label}
            </span>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="mt-6 rounded-2xl border border-neutral-200/80 bg-white/80 p-4 shadow-sm backdrop-blur">
          {/* Weekday header */}
          <div className="grid grid-cols-7 text-center text-xs font-medium text-neutral-500">
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

              const classes = [
                "relative flex flex-col rounded-xl border p-1.5 min-h-[80px] text-left transition",
                day.inCurrentMonth
                  ? "bg-white/90 text-neutral-900"
                  : "bg-neutral-50/70 text-neutral-400",
                hasEvents
                  ? "border-emerald-200 shadow-sm"
                  : "border-neutral-100",
                isToday ? "ring-2 ring-emerald-400 ring-offset-1" : "",
                "hover:bg-neutral-50",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => setSelectedDate(day.iso)}
                  className={classes}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold">
                      {day.date.getDate()}
                    </span>
                    {hasEvents && (
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}
                  </div>

                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const meta = KIND_META[ev.kind];
                      return (
                        <div
                          key={ev.id}
                          className={[
                            "flex items-center gap-1 truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                            meta.badge,
                          ].join(" ")}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${meta.accentDot}`}
                          />
                          <span className="truncate">
                            {meta.label}
                            {ev.subtitle ? ` · ${ev.subtitle}` : ""}
                          </span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-neutral-500">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day details */}
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white/85 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                {selectedDate
                  ? `Activity on ${formatHumanDate(selectedDate)}`
                  : "Day activity"}
              </h2>
              <p className="mt-1 text-xs text-neutral-600">
                {selectedDate
                  ? selectedEvents.length > 0
                    ? "Everything that happened on this date."
                    : "No recorded activity on this date."
                  : "Click any day in the big calendar above to see what happened."}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2 text-sm">
            {selectedDate && selectedEvents.length > 0 && (
              <ul className="space-y-2">
                {selectedEvents.map((ev) => {
                  const meta = KIND_META[ev.kind];
                  return (
                    <li
                      key={ev.id}
                      className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50/80 px-3 py-2"
                    >
                      <span
                        className={`mt-1 h-2 w-2 rounded-full ${meta.accentDot}`}
                      />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-neutral-900">
                          {meta.label}
                        </div>
                        <div className="text-xs text-neutral-700">
                          {ev.title}
                          {ev.subtitle ? ` · ${ev.subtitle}` : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {selectedDate && selectedEvents.length === 0 && (
              <p className="text-xs text-neutral-600">
                Nothing recorded for this date yet.
              </p>
            )}

            {!selectedDate && (
              <p className="text-xs text-neutral-600">
                No day selected. Pick a date in the calendar to inspect all
                events on that day.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
