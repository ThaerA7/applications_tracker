"use client";

import { X } from "lucide-react";

export type RejectedActivityType =
  | "added"
  | "edited"
  | "deleted"
  | "moved_to_rejected";

export type RejectedActivityItem = {
  id: string;
  appId: string;
  type: RejectedActivityType;
  timestamp: string; // action date & time (ISO)
  company: string;
  role?: string;
  location?: string;
  appliedOn?: string; // date the app was applied
  note?: string;
};

function getActivityLabel(type: RejectedActivityType): string {
  switch (type) {
    case "added":
      return "Rejection added";
    case "edited":
      return "Rejection updated";
    case "deleted":
      return "Rejection deleted";
    case "moved_to_rejected":
      return "Moved to rejected";
    default:
      return "Activity";
  }
}

// map activity type -> PNG icon in /public/icons
function getActivityIconSrc(type: RejectedActivityType): string {
  switch (type) {
    case "added":
      return "/icons/add.png";
    case "edited":
      return "/icons/edit.png";
    case "deleted":
      return "/icons/delete.png";
    case "moved_to_rejected":
      return "/icons/cancel.png";
    default:
      return "/icons/history.png";
  }
}

function ActivityTypeIcon({ type }: { type: RejectedActivityType }) {
  const src = getActivityIconSrc(type);
  const label = getActivityLabel(type);
  return <img src={src} alt={label} className="h-7 w-7 object-contain" />;
}

function fmtActivityTime(d: string) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function fmtAppliedDate(d?: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

type RejectedActivityLogSidebarProps = {
  open: boolean;
  onClose: () => void;
  items: RejectedActivityItem[];
};

export default function RejectedActivityLogSidebar({
  open,
  onClose,
  items,
}: RejectedActivityLogSidebarProps) {
  return (
    <div
      className={[
        "fixed inset-y-0 left-0 right-0 md:left-[var(--sidebar-width)] z-[12500] flex justify-end",
        open ? "" : "pointer-events-none",
      ].join(" ")}
    >
      {/* Backdrop */}
      <div
        className={[
          "absolute inset-0 bg-neutral-900/40",
          "transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        aria-hidden={!open}
        className={[
          "relative z-10 flex h-full w-full max-w-md flex-col",
          "border-l border-neutral-200/80",
          "bg-gradient-to-b from-white via-rose-50/70 to-pink-50/70",
          "shadow-2xl backdrop-blur-sm",
          "transform transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-neutral-200/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <img
              src="/icons/history.png"
              alt="Rejected activity"
              className="h-9 w-9 object-contain"
            />
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Rejected activity
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-600">
                Created, updated, moved and deleted rejected applications.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/80 text-neutral-500 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            aria-label="Close rejected activity sidebar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-neutral-300/80 bg-white/80 p-5 text-center text-xs text-neutral-600 shadow-sm">
              <div className="mb-2 text-2xl">🕊️</div>
              <p>
                No rejected activity yet. Creating, editing, moving or deleting
                rejected applications will show up here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {items.map((item) => {
                const label = getActivityLabel(item.type);

                return (
                  <li
                    key={item.id}
                    className={[
                      "group relative overflow-hidden rounded-xl border border-neutral-200/80",
                      "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
                      "p-3 text-xs text-neutral-800 shadow-sm",
                      "transition-all duration-200 ease-out",
                      "hover:-translate-y-0.5 hover:shadow-md hover:border-neutral-300",
                    ].join(" ")}
                  >
                    {/* Thicker gradient bar at top */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rose-400 via-pink-400 to-fuchsia-400" />

                    <div className="relative space-y-2 pt-1">
                      {/* Icon + text block */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center">
                          <ActivityTypeIcon type={item.type} />
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          {/* Role + company on same line */}
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 truncate">
                            <span className="truncate text-sm font-semibold text-neutral-900">
                              {item.role || "Role not set"}
                            </span>
                            <span className="text-xs font-semibold text-neutral-700">
                              @ {item.company}
                            </span>
                          </div>

                          {/* Action text */}
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                            {label}
                          </div>
                        </div>
                      </div>

                      {/* Dates row: Applied on / Action at */}
                      <div className="grid gap-2 text-[11px] text-neutral-600 sm:grid-cols-2">
                        <div className="rounded-lg border border-neutral-200/80 bg-neutral-50/80 px-2.5 py-1.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                            Applied on
                          </div>
                          <div className="mt-0.5 text-xs text-neutral-900">
                            {fmtAppliedDate(item.appliedOn)}
                          </div>
                        </div>

                        <div className="rounded-lg border border-rose-100/80 bg-rose-50/70 px-2.5 py-1.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                            Action at
                          </div>
                          <div className="mt-0.5 text-xs text-neutral-900">
                            {fmtActivityTime(item.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
