"use client";

import { useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import {
  X,
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

export type CalendarDayEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: ActivityKind;
  title: string;
  subtitle?: string;
  time?: string;
  dateTime?: string;
};

type KindIconMeta = {
  Icon: ComponentType<any>;
  iconBg: string;
  iconColor: string;
};

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

const KIND_ICON_META: Record<ActivityKind, KindIconMeta> = {
  applied: {
    Icon: Briefcase,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
  },
  interview: {
    Icon: PhoneCall,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  rejected: {
    Icon: XCircle,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  withdrawn: {
    Icon: Undo2,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  offer: {
    Icon: Sparkles,
    iconBg: "bg-fuchsia-50",
    iconColor: "text-fuchsia-600",
  },
};

type CalendarDaySidebarProps = {
  open: boolean;
  onClose: () => void;
  dateIso: string | null;
  dateLabel: string;
  events: CalendarDayEvent[];
};

export default function CalendarDaySidebar({
  open,
  onClose,
  dateIso,
  dateLabel,
  events,
}: CalendarDaySidebarProps) {
  const [mounted, setMounted] = useState(false);
  const hasEvents = events && events.length > 0;

  // wait until we’re on the client before using document.body
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={[
        // 🔥 full-screen overlay, ABOVE TOPBAR & EVERYTHING
        "fixed inset-0 z-[13000] flex justify-end",
        "pointer-events-auto",
      ].join(" ")}
    >
      {/* Backdrop over the whole viewport */}
      <div
        className="absolute inset-0 bg-neutral-900/40 transition-opacity duration-300 opacity-100"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right-side panel */}
      <aside
        aria-hidden={false}
        className={[
          "relative z-10 flex h-full w-full max-w-md flex-col",
          "border-l border-neutral-200/80",
          "bg-gradient-to-b from-white via-indigo-50/70 to-sky-50/70",
          "shadow-2xl backdrop-blur-sm",
          "transform transition-transform duration-300 ease-out translate-x-0",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-neutral-200/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                {dateIso ? "Day activity" : "No day selected"}
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-600">
                {dateIso
                  ? hasEvents
                    ? dateLabel
                    : `${dateLabel || "Selected date"} · No recorded events.`
                  : "Click a day in the calendar to inspect all events on that date."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={[
              "inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/80 text-neutral-500 shadow-sm hover:bg-white",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300",
            ].join(" ")}
            aria-label="Close day activity sidebar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!dateIso ? (
            <div className="mt-8 rounded-xl border border-neutral-300/80 bg-white/80 p-5 text-center text-xs text-neutral-600 shadow-sm">
              <div className="mb-2 text-2xl">📅</div>
              <p>
                No day selected yet. Click any day in the calendar to see a log
                of everything that happened on that date.
              </p>
            </div>
          ) : !hasEvents ? (
            <div className="mt-8 rounded-xl border border-neutral-300/80 bg-white/80 p-5 text-center text-xs text-neutral-600 shadow-sm">
              <div className="mb-2 text-2xl">🕊️</div>
              <p>
                Nothing recorded for this date yet. Add applications,
                interviews, or outcomes and they&apos;ll show up here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {events.map((ev) => {
                const meta = KIND_META[ev.kind];
                const iconMeta = KIND_ICON_META[ev.kind];
                const Icon = iconMeta.Icon;

                return (
                  <li
                    key={ev.id}
                    className={[
                      "group relative overflow-hidden rounded-xl border border-neutral-200/80",
                      "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
                      "p-3 text-xs text-neutral-800 shadow-sm",
                      "transition-all duration-200 ease-out",
                      "hover:-translate-y-0.5 hover:shadow-md hover:border-neutral-300",
                    ].join(" ")}
                  >
                    {/* Gradient bar at top (same vibe as ActivityLogSidebar) */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400" />

                    <div className="relative space-y-2 pt-1">
                      {/* Icon + text block */}
                      <div className="flex items-center gap-2">
                        <div
                          className={[
                            "flex h-7 w-7 items-center justify-center rounded-full",
                            iconMeta.iconBg,
                          ].join(" ")}
                        >
                          <Icon
                            className={`h-3.5 w-3.5 ${iconMeta.iconColor}`}
                          />
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 truncate">
                            <span className="truncate text-sm font-semibold text-neutral-900">
                              {ev.title}
                            </span>
                            {ev.subtitle && (
                              <span className="text-xs font-semibold text-neutral-700">
                                · {ev.subtitle}
                              </span>
                            )}
                          </div>

                          <div className="inline-flex items-center gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                              {meta.label}
                            </span>
                            <span
                              className={[
                                "inline-flex items-center truncate rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                                meta.badge,
                              ].join(" ")}
                            >
                              {dateLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info row */}
                      <div className="grid gap-2 text-[11px] text-neutral-600 sm:grid-cols-2">
                        <div className="rounded-lg border border-neutral-200/80 bg-neutral-50/80 px-2.5 py-1.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                            Date
                          </div>
                          <div className="mt-0.5 text-xs text-neutral-900">
                            {dateLabel}
                          </div>
                        </div>

                        <div className="rounded-lg border border-sky-100/80 bg-sky-50/60 px-2.5 py-1.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                            {ev.kind === "interview" && ev.time
                              ? "Interview time"
                              : "Type"}
                          </div>
                          <div className="mt-0.5 text-xs text-neutral-900">
                            {ev.kind === "interview" && ev.time
                              ? ev.time
                              : meta.label}
                          </div>
                        </div>
                      </div>

                      {ev.kind === "interview" && !ev.time && (
                        <p className="text-[10px] text-neutral-500">
                          No time stored for this interview.
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
