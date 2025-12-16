// app/components/overview/UpcomingCard.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PhoneCall, Plus } from "lucide-react";

import ScheduleInterviewDialog, {
  type Interview,
} from "../../components/dialogs/ScheduleInterviewDialog";
import {
  type CalendarEvent,
  MONTH_NAMES,
  normalizeDate,
  extractTime,
  formatHumanDateTime,
  getCountdownParts,
} from "../../app/calendar/calendarUtils";

// ✅ Storage (guest: IDB/local mirror, user: Supabase)
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadInterviews } from "@/lib/storage/interviews";

/**
 * Global refresh event emitted by storage modules
 */
const COUNTS_EVENT = "job-tracker:refresh-counts";

type StoredInterview = {
  id: string;
  company?: string;
  role?: string;
  location?: string;
  employmentType?: string;
  date?: string; // ISO
};

function pad(n: number) {
  return `${n}`.padStart(2, "0");
}

export default function UpcomingCard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [now, setNow] = useState<Date>(() => new Date());

  // Quick-add dialog state (from overview card)
  const [dialogOpen, setDialogOpen] = useState(false);

  // ✅ avoid setState after unmount + coalesce refresh storms
  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);

  // ✅ Load interview events from storage (guest IDB/local mirror, user Supabase)
  const refreshInterviewEvents = useCallback(async () => {
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }

    inFlightRef.current = true;

    try {
      const res = await loadInterviews();
      const interviews = ((res?.items as StoredInterview[]) ?? []).slice();

      const collected: CalendarEvent[] = [];

      for (const item of interviews) {
        const dateOnly = normalizeDate(item.date);
        if (!dateOnly) continue;

        const time = extractTime(item.date);

        collected.push({
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
      }

      // Deduplicate by (kind, date, title, subtitle, time)
      const map = new Map<string, CalendarEvent>();
      for (const ev of collected) {
        const key = `${ev.kind}-${ev.date}-${ev.title}-${ev.subtitle ?? ""}-${ev.time ?? ""}`;
        if (!map.has(key)) map.set(key, ev);
      }

      if (aliveRef.current) setEvents(Array.from(map.values()));
    } catch (err) {
      console.error("UpcomingCard: failed to load interviews:", err);
      if (aliveRef.current) setEvents([]);
    } finally {
      inFlightRef.current = false;

      if (queuedRef.current && aliveRef.current) {
        queuedRef.current = false;
        void refreshInterviewEvents();
      }
    }
  }, []);

  // Live ticking clock (for countdown)
  useEffect(() => {
    aliveRef.current = true;

    const id = window.setInterval(() => {
      if (!aliveRef.current) return;
      setNow(new Date());
    }, 1_000);

    return () => {
      aliveRef.current = false;
      window.clearInterval(id);
    };
  }, []);

  // Storage/auth listeners (refresh events)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const supabase = getSupabaseClient();

    const refresh = async () => {
      if (cancelled || !aliveRef.current) return;
      await refreshInterviewEvents();
    };

    (async () => {
      try {
        await supabase.auth.getSession(); // ✅ hydrate first
      } catch {
        // ignore
      }
      if (cancelled || !aliveRef.current) return;
      await refresh();
    })();

    window.addEventListener(COUNTS_EVENT, refresh);
    window.addEventListener("focus", refresh);

    const onVis = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVis);

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      cancelled = true;
      window.removeEventListener(COUNTS_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
      sub?.subscription?.unsubscribe();
    };
  }, [refreshInterviewEvents]);

  // Upcoming interviews (from now onwards)
  const upcomingInterviews = useMemo(() => {
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

  const handleOpenDialog = () => setDialogOpen(true);
  const handleCloseDialog = () => setDialogOpen(false);

  const handleInterviewCreated = (_interview: Interview) => {
    // After saving (handled inside the dialog), refresh so the new interview shows immediately.
    void refreshInterviewEvents();
  };

  return (
    <>
      {/* Quick-add interview dialog from overview card */}
      <ScheduleInterviewDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        application={null}
        onInterviewCreated={handleInterviewCreated}
        mode="add"
      />

      <section
        className={[
          "relative overflow-hidden rounded-2xl border border-emerald-100",
          "bg-gradient-to-br from-emerald-50 via-white to-sky-50",
          "p-5 shadow-md",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />

        <div className="relative z-10">
          {/* Header styled like Notes / other overview cards */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
                <PhoneCall className="h-3.5 w-3.5" />
                <span>Upcoming & urgent</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-neutral-900">
                Upcoming interviews
              </p>
              <p className="mt-1 text-[11px] text-neutral-600">
                {upcomingInterviews.length > 0
                  ? "Keep your next interviews visible so you always know what’s coming up."
                  : "Add interviews in your tracker and they’ll show up here with a live countdown."}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={handleOpenDialog}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border border-emerald-100",
                  "bg-white/80 px-2.5 py-1 text-[11px] font-medium text-emerald-700 shadow-sm",
                  "hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
                ].join(" ")}
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                <span>Add interview</span>
              </button>

              {upcomingInterviews.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                  <span>{upcomingInterviews.length} scheduled</span>
                </span>
              )}
            </div>
          </div>

          {/* No upcoming state */}
          {upcomingInterviews.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-[11px] text-emerald-800/90">
              Once you add interview dates, your next ones will appear here with
              a countdown so you can plan your prep.
            </div>
          )}

          {/* Next interview card */}
          {nextInterview && (() => {
            const d = new Date(nextInterview.date);
            const day = d.getDate();
            const month = MONTH_NAMES[d.getMonth()].slice(0, 3);

            return (
              <div className="mt-4 flex w-full items-stretch gap-3 rounded-xl border border-emerald-200 bg-white/95 px-3 py-2.5 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
                {/* Date pill */}
                <div className="flex flex-col items-center justify-center rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-900">
                  <span className="text-base font-semibold leading-none">
                    {day}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    {month}
                  </span>
                </div>

                {/* Info + countdown */}
                <div className="flex flex-1 items-center justify-between gap-3">
                  {/* Main upcoming interview text */}
                  <div className="flex flex-col justify-center space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-sm font-semibold text-neutral-900 sm:text-[15px]">
                        {nextInterview.title}
                      </span>
                      {nextInterview.subtitle && (
                        <span className="text-[11px] text-neutral-600 sm:text-sm">
                          · {nextInterview.subtitle}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-medium text-emerald-700 sm:text-sm">
                      {formatHumanDateTime(nextInterview.date, nextInterview.time)}
                    </div>
                  </div>

                  {/* Countdown */}
                  {(() => {
                    const parts = getCountdownParts(nextInterview, now);
                    if (!parts) return null;
                    const { days, hours, minutes, seconds } = parts;

                    return (
                      <div className="ml-auto flex h-full min-w-[110px] flex-col items-center justify-center rounded-xl bg-emerald-50 px-3 py-2 text-center text-[11px] font-semibold text-emerald-900 sm:text-[12px]">
                        <span className="leading-tight">Days: {pad(days)}</span>
                        <span className="mt-0.5 text-[10px] font-medium leading-tight sm:text-[11px]">
                          {pad(hours)}h {pad(minutes)}m {pad(seconds)}s
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

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
                    const monthLabel = MONTH_NAMES[evDate.getMonth()].slice(0, 3);

                    return (
                      <li
                        key={ev.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 transition hover:bg-emerald-50/70"
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

                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          {/* Later interviews text */}
                          <div className="flex min-w-0 flex-col justify-center">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="truncate text-xs font-semibold text-neutral-900 sm:text-sm">
                                {ev.title}
                              </span>
                              {ev.subtitle && (
                                <span className="truncate text-[10px] text-neutral-600 sm:text-[11px]">
                                  · {ev.subtitle}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-medium text-emerald-700 sm:text-[11px]">
                              {formatHumanDateTime(ev.date, ev.time)}
                            </div>
                          </div>

                          {/* Right-side countdown */}
                          {parts && (
                            <div className="flex h-full min-w-[95px] flex-col items-center justify-center rounded-lg bg-emerald-50 px-2 py-1.5 text-center text-[9px] font-semibold text-emerald-900 sm:text-[10px]">
                              <span className="leading-tight">
                                Days: {pad(parts.days)}
                              </span>
                              <span className="mt-0.5 text-[9px] font-medium leading-tight sm:text-[10px]">
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
      </section>
    </>
  );
}
