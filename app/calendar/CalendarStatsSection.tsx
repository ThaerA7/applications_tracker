// CalendarStatsSection.tsx

"use client";

import { useMemo } from "react";
import {
  ActivityKind,
  CalendarEvent,
  avgPerWeek,
  getMonthStats,
  growthPercent,
  percentage,
} from "./calendarUtils";

type CalendarStatsSectionProps = {
  events: CalendarEvent[];
  monthState: { year: number; month: number }; // month 0-based
};

function computeSegmentWidths(a: number, b: number) {
  const total = a + b;
  if (!total) return { a: 0, b: 0 };
  return {
    a: (a / total) * 100,
    b: (b / total) * 100,
  };
}

type StackedBarProps = {
  leftValue: number;
  rightValue: number;
  leftColorClass: string;
  rightColorClass: string;
};

function StackedBar({
  leftValue,
  rightValue,
  leftColorClass,
  rightColorClass,
}: StackedBarProps) {
  const { a, b } = computeSegmentWidths(leftValue, rightValue);

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 flex">
      <div
        className={`h-full ${leftColorClass}`}
        style={{ width: `${a}%` }}
      />
      <div
        className={`h-full ${rightColorClass}`}
        style={{ width: `${b}%` }}
      />
    </div>
  );
}

export default function CalendarStatsSection({
  events,
  monthState,
}: CalendarStatsSectionProps) {
  // previous month (0-based month)
  const prevMonthState = useMemo(() => {
    const prevMonth = monthState.month - 1;
    if (prevMonth < 0) {
      return { year: monthState.year - 1, month: 11 };
    }
    return { year: monthState.year, month: prevMonth };
  }, [monthState]);

  const monthStats = useMemo(
    () => getMonthStats(events, monthState.year, monthState.month),
    [events, monthState]
  );

  const prevMonthStats = useMemo(
    () => getMonthStats(events, prevMonthState.year, prevMonthState.month),
    [events, prevMonthState]
  );

  // All-time stats
  const allTimeStats = useMemo(() => {
    const byKind: Record<ActivityKind, number> = {
      applied: 0,
      interview: 0,
      rejected: 0,
      withdrawn: 0,
      offer: 0,
    };

    events.forEach((ev) => {
      byKind[ev.kind] += 1;
    });

    const total = events.length;

    return {
      total,
      byKind,
    };
  }, [events]);

  const allTimeTotal = allTimeStats.total;
  const allTimeApps = allTimeStats.byKind.applied;
  const allTimeInterviewsAll = allTimeStats.byKind.interview;
  const allTimeRejectedAll = allTimeStats.byKind.rejected;
  const allTimeWithdrawnAll = allTimeStats.byKind.withdrawn;
  const allTimeOfferAll = allTimeStats.byKind.offer;

  const allTimePositiveAll = allTimeInterviewsAll + allTimeOfferAll;
  const allTimeNegativeAll = allTimeRejectedAll + allTimeWithdrawnAll;

  // Derived values for cards
  const currentTotal = monthStats.total;
  const prevTotal = prevMonthStats.total;

  const currentApps = monthStats.byKind.applied;
  const prevApps = prevMonthStats.byKind.applied;

  const currentInterviews = monthStats.byKind.interview;
  const currentRejected = monthStats.byKind.rejected;
  const currentWithdrawn = monthStats.byKind.withdrawn;
  const currentOffers = monthStats.byKind.offer;

  const prevInterviews = prevMonthStats.byKind.interview;
  const prevRejected = prevMonthStats.byKind.rejected;
  const prevWithdrawn = prevMonthStats.byKind.withdrawn;
  const prevOffers = prevMonthStats.byKind.offer;

  // Positive = interviews + offers, Negative = rejected + withdrawn
  const outcomePositive = currentInterviews + currentOffers;
  const outcomeNegative = currentRejected + currentWithdrawn;
  const outcomeTotal = outcomePositive + outcomeNegative;

  const outcomePositivePrev = prevInterviews + prevOffers;
  const outcomeNegativePrev = prevRejected + prevWithdrawn;
  const outcomeTotalPrev = outcomePositivePrev + outcomeNegativePrev;

  const positivePct = percentage(outcomePositive, outcomeTotal);
  const negativePct = percentage(outcomeNegative, outcomeTotal);
  const positivePrevPct = percentage(
    outcomePositivePrev,
    outcomeTotalPrev
  );
  const negativePrevPct = percentage(
    outcomeNegativePrev,
    outcomeTotalPrev
  );

  // averages per week
  const currentTotalPerWeek = avgPerWeek(
    currentTotal,
    monthState.year,
    monthState.month
  );
  const prevTotalPerWeek = avgPerWeek(
    prevTotal,
    prevMonthState.year,
    prevMonthState.month
  );

  const currentAppsPerWeek = avgPerWeek(
    currentApps,
    monthState.year,
    monthState.month
  );
  const prevAppsPerWeek = avgPerWeek(
    prevApps,
    prevMonthState.year,
    prevMonthState.month
  );

  // growth percentages
  const totalDeltaPct = growthPercent(currentTotal, prevTotal);
  const appsDeltaPct = growthPercent(currentApps, prevApps);

  const restOfAllTimeTotal = Math.max(allTimeTotal - currentTotal, 0);
  const restOfAllTimeApps = Math.max(allTimeApps - currentApps, 0);

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      {/* TOTAL EVENTS CARD */}
      <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Total events
            </div>
            <div className="mt-1 text-xs text-neutral-700 flex flex-wrap items-center gap-1">
              {totalDeltaPct === null ? (
                <span className="font-semibold text-neutral-900">
                  New this month
                </span>
              ) : (
                <>
                  <span className="font-semibold text-neutral-900">
                    {totalDeltaPct > 0
                      ? `+${totalDeltaPct}%`
                      : `${totalDeltaPct}%`}
                  </span>
                  <span className="text-neutral-500">
                    vs last month (count)
                  </span>
                </>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-neutral-500">
              Avg / week:{" "}
              <span className="font-medium text-neutral-800">
                {currentTotalPerWeek.toFixed(1)}
              </span>{" "}
              <span className="text-neutral-400">
                (prev {prevTotalPerWeek.toFixed(1)})
              </span>
            </div>
          </div>

          {/* All time pill */}
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              {allTimeTotal} events all time
            </span>
            <div className="flex items-center gap-1 text-[9px] text-neutral-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> This
                month
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" /> Last
                month
              </span>
            </div>
          </div>
        </div>

        {/* 3 stacked bars */}
        <div className="mt-3 space-y-2">
          {/* Bar 1: this vs last month */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
              <span>This vs last month</span>
              <span className="font-medium text-neutral-800">
                {currentTotal}{" "}
                <span className="text-neutral-400">/ {prevTotal}</span>
              </span>
            </div>
            <StackedBar
              leftValue={currentTotal}
              rightValue={prevTotal}
              leftColorClass="bg-indigo-500"
              rightColorClass="bg-neutral-300"
            />
          </div>

          {/* Bar 2: avg per week this vs last */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
              <span>Avg per week</span>
              <span className="font-medium text-neutral-800">
                {currentTotalPerWeek.toFixed(1)}{" "}
                <span className="text-neutral-400">
                  / {prevTotalPerWeek.toFixed(1)}
                </span>
              </span>
            </div>
            <StackedBar
              leftValue={currentTotalPerWeek}
              rightValue={prevTotalPerWeek}
              leftColorClass="bg-indigo-500/80"
              rightColorClass="bg-neutral-300"
            />
          </div>

          {/* Bar 3: this month vs rest of all time */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
              <span>This month vs earlier</span>
              <span className="font-medium text-neutral-800">
                {currentTotal}{" "}
                <span className="text-neutral-400">
                  / {restOfAllTimeTotal}
                </span>
              </span>
            </div>
            <StackedBar
              leftValue={currentTotal}
              rightValue={restOfAllTimeTotal}
              leftColorClass="bg-indigo-600"
              rightColorClass="bg-neutral-200"
            />
          </div>
        </div>
      </div>

      {/* APPLICATIONS CARD */}
      <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Applications sent
            </div>
            <div className="mt-1 text-xs text-neutral-700 flex flex-wrap items-center gap-1">
              {appsDeltaPct === null ? (
                <span className="font-semibold text-neutral-900">
                  New this month
                </span>
              ) : (
                <>
                  <span className="font-semibold text-neutral-900">
                    {appsDeltaPct > 0 ? `+${appsDeltaPct}%` : `${appsDeltaPct}%`}
                  </span>
                  <span className="text-neutral-500">
                    vs last month (count)
                  </span>
                </>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-neutral-500">
              Avg / week:{" "}
              <span className="font-medium text-neutral-800">
                {currentAppsPerWeek.toFixed(1)}
              </span>{" "}
              <span className="text-neutral-400">
                (prev {prevAppsPerWeek.toFixed(1)})
              </span>
            </div>
          </div>

          {/* All time pill */}
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
              {allTimeApps} applications all time
            </span>
            <div className="flex items-center gap-1 text-[9px] text-neutral-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> This
                month
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" /> Last
                month
              </span>
            </div>
          </div>
        </div>

        {/* 3 stacked bars */}
        <div className="mt-3 space-y-2">
          {/* Bar 1: this vs last month */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
              <span>This vs last month</span>
              <span className="font-medium text-neutral-800">
                {currentApps}{" "}
                <span className="text-neutral-400">/ {prevApps}</span>
              </span>
            </div>
            <StackedBar
              leftValue={currentApps}
              rightValue={prevApps}
              leftColorClass="bg-sky-500"
              rightColorClass="bg-neutral-300"
            />
          </div>

          {/* Bar 2: avg per week this vs last */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
              <span>Avg per week</span>
              <span className="font-medium text-neutral-800">
                {currentAppsPerWeek.toFixed(1)}{" "}
                <span className="text-neutral-400">
                  / {prevAppsPerWeek.toFixed(1)}
                </span>
              </span>
            </div>
            <StackedBar
              leftValue={currentAppsPerWeek}
              rightValue={prevAppsPerWeek}
              leftColorClass="bg-sky-500/80"
              rightColorClass="bg-neutral-300"
            />
          </div>

          {/* Bar 3: this month vs rest of all time */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
              <span>This month vs earlier</span>
              <span className="font-medium text-neutral-800">
                {currentApps}{" "}
                <span className="text-neutral-400">
                  / {restOfAllTimeApps}
                </span>
              </span>
            </div>
            <StackedBar
              leftValue={currentApps}
              rightValue={restOfAllTimeApps}
              leftColorClass="bg-sky-600"
              rightColorClass="bg-neutral-200"
            />
          </div>
        </div>
      </div>

      {/* OUTCOMES CARD */}
      <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Outcomes & interviews
            </div>

            {/* Positive/negative percentages for this month */}
            <div className="mt-1 text-xs text-neutral-700 space-y-0.5">
              <div>
                This month:{" "}
                <span className="font-semibold text-emerald-700">
                  {positivePct}% positive
                </span>{" "}
                ·{" "}
                <span className="font-semibold text-rose-600">
                  {negativePct}% negative
                </span>
              </div>
              <div className="text-[11px] text-neutral-500">
                Last month:{" "}
                <span className="font-medium text-emerald-700/90">
                  {positivePrevPct}%
                </span>{" "}
                pos ·{" "}
                <span className="font-medium text-rose-600/90">
                  {negativePrevPct}%
                </span>{" "}
                neg
              </div>
            </div>
          </div>

          {/* All time pill */}
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              {allTimePositiveAll} pos · {allTimeNegativeAll} neg all time
            </span>
            <div className="flex items-center gap-1 text-[9px] text-neutral-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{" "}
                Positive
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />{" "}
                Negative
              </span>
            </div>
          </div>
        </div>

        {/* 3 stacked bars for positive vs negative */}
        <div className="mt-3 space-y-2">
          {/* Bar 1: this month */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
              <span>This month</span>
              <span className="font-medium text-neutral-800">
                {outcomePositive} pos{" "}
                <span className="text-neutral-400">
                  / {outcomeNegative} neg
                </span>
              </span>
            </div>
            <StackedBar
              leftValue={outcomePositive}
              rightValue={outcomeNegative}
              leftColorClass="bg-emerald-500"
              rightColorClass="bg-rose-400"
            />
          </div>

          {/* Bar 2: last month */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
              <span>Last month</span>
              <span className="font-medium text-neutral-800">
                {outcomePositivePrev} pos{" "}
                <span className="text-neutral-400">
                  / {outcomeNegativePrev} neg
                </span>
              </span>
            </div>
            <StackedBar
              leftValue={outcomePositivePrev}
              rightValue={outcomeNegativePrev}
              leftColorClass="bg-emerald-500/80"
              rightColorClass="bg-rose-400/80"
            />
          </div>

          {/* Bar 3: all time */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
              <span>All time</span>
              <span className="font-medium text-neutral-800">
                {allTimePositiveAll} pos{" "}
                <span className="text-neutral-400">
                  / {allTimeNegativeAll} neg
                </span>
              </span>
            </div>
            <StackedBar
              leftValue={allTimePositiveAll}
              rightValue={allTimeNegativeAll}
              leftColorClass="bg-emerald-600"
              rightColorClass="bg-rose-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
