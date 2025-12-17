"use client";

import type React from "react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X, Target, CalendarDays } from "lucide-react";

export type GoalSettingsMode = "single" | "overview";

export type SingleGoalValues = {
  target: number;
  periodDays: number;
};

export type OverviewGoalValues = {
  weeklyTarget: number;
  monthlyTarget: number;
};

type GoalSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  mode: GoalSettingsMode;
  title: string;
  description?: string;
  initialValues: SingleGoalValues | OverviewGoalValues;
  onSave: (values: SingleGoalValues | OverviewGoalValues) => void;
};

function num(n: any, fallback: number) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function clampInt(n: number, min = 1, max = 9999) {
  const v = Math.floor(n);
  return Math.min(Math.max(v, min), max);
}

export default function GoalSettingsDialog({
  open,
  onClose,
  mode,
  title,
  description,
  initialValues,
  onSave,
}: GoalSettingsDialogProps) {
  const initialSingle = useMemo<SingleGoalValues>(() => {
    const v = initialValues as Partial<SingleGoalValues>;
    return {
      target: clampInt(num(v.target, 1), 1, 999),
      periodDays: clampInt(num(v.periodDays, 30), 1, 365),
    };
  }, [initialValues]);

  const initialOverview = useMemo<OverviewGoalValues>(() => {
    const v = initialValues as Partial<OverviewGoalValues>;
    return {
      weeklyTarget: clampInt(num(v.weeklyTarget, 2), 1, 999),
      monthlyTarget: clampInt(num(v.monthlyTarget, 8), 1, 9999),
    };
  }, [initialValues]);

  const [target, setTarget] = useState(initialSingle.target);
  const [periodDays, setPeriodDays] = useState(initialSingle.periodDays);
  const [weeklyTarget, setWeeklyTarget] = useState(
    initialOverview.weeklyTarget
  );
  const [monthlyTarget, setMonthlyTarget] = useState(
    initialOverview.monthlyTarget
  );

  useEffect(() => {
    if (!open) return;

    if (mode === "single") {
      setTarget(initialSingle.target);
      setPeriodDays(initialSingle.periodDays);
    } else {
      setWeeklyTarget(initialOverview.weeklyTarget);
      setMonthlyTarget(initialOverview.monthlyTarget);
    }
  }, [open, mode, initialSingle, initialOverview]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const isSingle = mode === "single";

  const theme = isSingle
    ? {
        ring: "focus-visible:ring-sky-300",
        focus: "focus:ring-sky-400 focus:border-sky-300",
        panel:
          "bg-gradient-to-br from-sky-50 via-white to-amber-50 border-neutral-200/80",
        primary:
          "border-sky-500 bg-sky-600 hover:bg-sky-500 focus-visible:ring-sky-300",
      }
    : {
        ring: "focus-visible:ring-emerald-300",
        focus: "focus:ring-emerald-400 focus:border-emerald-300",
        panel:
          "bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-neutral-200/80",
        primary:
          "border-emerald-500 bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-emerald-300",
      };

  const canSubmit = isSingle
    ? clampInt(target || 0, 0, 999) > 0 &&
      clampInt(periodDays || 0, 0, 365) > 0
    : clampInt(weeklyTarget || 0, 0, 999) > 0 &&
      clampInt(monthlyTarget || 0, 0, 9999) > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (isSingle) {
      onSave({
        target: clampInt(target || 1, 1, 999),
        periodDays: clampInt(periodDays || 1, 1, 365),
      });
    } else {
      onSave({
        weeklyTarget: clampInt(weeklyTarget || 1, 1, 999),
        monthlyTarget: clampInt(monthlyTarget || 1, 1, 9999),
      });
    }
  };

  const dialog = (
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[14000] flex items-center justify-center px-4 py-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          "relative z-10 w-full max-w-md overflow-hidden rounded-2xl",
          "border shadow-2xl",
          theme.panel,
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* soft blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between gap-3 border-b border-neutral-200/70 px-5 py-4">
          <div className="flex items-center gap-2">
            {/* goal icon (no background) */}
            <img
              src="/icons/goal.png"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 object-contain"
            />

            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                {title}
              </h2>
              {description && (
                <p className="mt-0.5 text-xs text-neutral-600">
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={[
              "inline-flex h-8 w-8 items-center justify-center rounded-full",
              "border border-neutral-200",
              "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
              "text-neutral-500 shadow-sm hover:bg-white",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              theme.ring,
            ].join(" ")}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="relative z-10 space-y-4 px-5 py-5"
        >
          {isSingle ? (
            <>
              <div className="rounded-xl border border-neutral-200/80 bg-white/80 p-4 shadow-sm">
                <label className="block">
                  <span className="text-xs font-medium text-neutral-700">
                    Target
                  </span>
                  <div className="relative mt-1">
                    <Target className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={target}
                      onChange={(e) => setTarget(Number(e.target.value))}
                      className={[
                        "h-10 w-full rounded-lg pl-8 pr-3 text-sm text-neutral-900",
                        "border border-neutral-200 bg-white shadow-sm",
                        "focus:outline-none",
                        theme.focus,
                      ].join(" ")}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    How many you want to reach within the selected period.
                  </p>
                </label>
              </div>

              <div className="rounded-xl border border-neutral-200/80 bg-white/80 p-4 shadow-sm">
                <label className="block">
                  <span className="text-xs font-medium text-neutral-700">
                    Period (days)
                  </span>
                  <div className="relative mt-1">
                    <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={periodDays}
                      onChange={(e) => setPeriodDays(Number(e.target.value))}
                      className={[
                        "h-10 w-full rounded-lg pl-8 pr-3 text-sm text-neutral-900",
                        "border border-neutral-200 bg-white shadow-sm",
                        "focus:outline-none",
                        theme.focus,
                      ].join(" ")}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Rolling window counted backwards from today.
                  </p>
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-neutral-200/80 bg-white/80 p-4 shadow-sm">
                <label className="block">
                  <span className="text-xs font-medium text-neutral-700">
                    Weekly target
                  </span>
                  <div className="relative mt-1">
                    <Target className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={weeklyTarget}
                      onChange={(e) => setWeeklyTarget(Number(e.target.value))}
                      className={[
                        "h-10 w-full rounded-lg pl-8 pr-3 text-sm text-neutral-900",
                        "border border-neutral-200 bg-white shadow-sm",
                        "focus:outline-none",
                        theme.focus,
                      ].join(" ")}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Used for the 7-day overview bar.
                  </p>
                </label>
              </div>

              <div className="rounded-xl border border-neutral-200/80 bg-white/80 p-4 shadow-sm">
                <label className="block">
                  <span className="text-xs font-medium text-neutral-700">
                    Monthly target
                  </span>
                  <div className="relative mt-1">
                    <Target className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={monthlyTarget}
                      onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                      className={[
                        "h-10 w-full rounded-lg pl-8 pr-3 text-sm text-neutral-900",
                        "border border-neutral-200 bg-white shadow-sm",
                        "focus:outline-none",
                        theme.focus,
                      ].join(" ")}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Used for the 30-day overview bar.
                  </p>
                </label>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200/70 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={[
                "inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium text-white shadow-sm",
                canSubmit
                  ? theme.primary
                  : "cursor-not-allowed border-neutral-200 bg-neutral-300",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              ].join(" ")}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
