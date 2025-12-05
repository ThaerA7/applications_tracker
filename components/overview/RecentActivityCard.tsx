"use client";

// app/components/RecentActivityCard.tsx

import { useEffect, useMemo, useState } from "react";
import { Clock, ListTodo } from "lucide-react";
import type { ActivityItem } from "@/components/ActivityLogSidebar";

// Activity logs written by your pages.
// Note: AppliedPage currently does NOT persist its own activity log.
// This key is here to support it if/when you add persistence later.
const APPLIED_ACTIVITY_STORAGE_KEY = "job-tracker:applied-activity";
const INTERVIEWS_ACTIVITY_STORAGE_KEY = "job-tracker:interviews-activity";
const REJECTIONS_ACTIVITY_STORAGE_KEY = "job-tracker:rejected-activity";
const WITHDRAWN_ACTIVITY_STORAGE_KEY = "job-tracker:withdrawn-activity";

// Optional/forward-compatible offers activity key(s)
// (won't break if they don't exist)
const OFFERS_ACTIVITY_STORAGE_KEYS = [
  "job-tracker:offers-received-activity",
  "job-tracker:offers-activity",
];

const MS_MIN = 60_000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;
const LAST_DAYS = 7;
const MAX_FEEDS = 5;

type SourceBucket = "applied" | "interview" | "rejected" | "withdrawn" | "offer";
type InternalActivityItem = ActivityItem & { __source?: SourceBucket };

function safeReadArray(key: string): ActivityItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readWithSource(key: string, source: SourceBucket): InternalActivityItem[] {
  const list = safeReadArray(key);
  return list.map((i) => ({ ...i, __source: source }));
}

function toMs(ts?: string) {
  if (!ts) return 0;
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? 0 : ms;
}

function timeAgoLabel(timestampIso: string, nowMs: number) {
  const then = toMs(timestampIso);
  if (!then) return "";

  const diff = Math.max(0, nowMs - then);

  if (diff < MS_MIN) return "just now";
  if (diff < MS_HOUR) {
    const m = Math.round(diff / MS_MIN);
    return `${m} min ago`;
  }
  if (diff < MS_DAY) {
    const h = Math.round(diff / MS_HOUR);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }

  const d = Math.round(diff / MS_DAY);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function inferCategory(item: InternalActivityItem): SourceBucket {
  // Prefer explicit source when we know it
  if (item.__source) return item.__source;

  const from = (item.fromStatus ?? "").toLowerCase();
  const to = (item.toStatus ?? "").toLowerCase();
  const note = (item.note ?? "").toLowerCase();
  const type = (item.type ?? "").toLowerCase();

  if (to.includes("rejected") || type.includes("rejected")) return "rejected";
  if (to.includes("withdrawn") || type.includes("withdrawn")) return "withdrawn";
  if (to.includes("accepted") || note.includes("offer")) return "offer";

  if (
    to.includes("interview") ||
    from.includes("interview") ||
    note.includes("interview")
  ) {
    return "interview";
  }

  if (from.includes("applied") || to.includes("applied")) return "applied";
  return "applied";
}

function prefixForAdded(source: SourceBucket) {
  switch (source) {
    case "interview":
      return "Interview scheduled";
    case "rejected":
      return "Rejected application added";
    case "withdrawn":
      return "Withdrawn application added";
    case "offer":
      return "Offer added";
    default:
      return "Application added";
  }
}

function prefixForEdited(source: SourceBucket) {
  switch (source) {
    case "interview":
      return "Interview updated";
    case "rejected":
      return "Rejected application updated";
    case "withdrawn":
      return "Withdrawn application updated";
    case "offer":
      return "Offer updated";
    default:
      return "Application updated";
  }
}

function prefixForDeleted(source: SourceBucket) {
  switch (source) {
    case "interview":
      return "Interview removed";
    case "rejected":
      return "Rejected application removed";
    case "withdrawn":
      return "Withdrawn application removed";
    case "offer":
      return "Offer removed";
    default:
      return "Application removed";
  }
}

// Build a label that ALWAYS mentions role + company when available.
function buildLabel(item: InternalActivityItem) {
  const company = item.company?.trim() || "Unknown company";
  const role = item.role?.trim() || "Unknown role";
  const base = `${role} @ ${company}`;

  const from = item.fromStatus?.trim();
  const to = item.toStatus?.trim();
  const note = item.note?.trim();

  const source = inferCategory(item);

  const withNote = (prefix: string) =>
    note ? `${prefix}: ${base} — ${note}` : `${prefix}: ${base}`;

  switch (item.type) {
    case "added":
      return withNote(prefixForAdded(source));

    case "edited":
      // If a move-to-accepted was logged as edited somewhere
      if (to?.toLowerCase().includes("accepted")) {
        return withNote("Offer accepted");
      }
      return withNote(prefixForEdited(source));

    case "deleted":
      return withNote(prefixForDeleted(source));

    case "moved_to_interviews":
      return withNote("Moved to Interviews");

    case "moved_to_rejected":
      return withNote("Marked as Rejected");

    case "moved_to_withdrawn":
      return withNote("Moved to Withdrawn");

    default:
      if (from && to) {
        const prefix = `Status change (${from} → ${to})`;
        return note ? `${prefix}: ${base} — ${note}` : `${prefix}: ${base}`;
      }
      if (note) return `${note} — ${base}`;
      return base;
  }
}

export default function RecentActivityCard() {
  const [allItems, setAllItems] = useState<InternalActivityItem[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const read = () => {
      const applied = readWithSource(APPLIED_ACTIVITY_STORAGE_KEY, "applied");
      const interviews = readWithSource(
        INTERVIEWS_ACTIVITY_STORAGE_KEY,
        "interview"
      );
      const rejected = readWithSource(
        REJECTIONS_ACTIVITY_STORAGE_KEY,
        "rejected"
      );
      const withdrawn = readWithSource(
        WITHDRAWN_ACTIVITY_STORAGE_KEY,
        "withdrawn"
      );

      const offers = OFFERS_ACTIVITY_STORAGE_KEYS.flatMap((k) =>
        readWithSource(k, "offer")
      );

      const merged = [...applied, ...interviews, ...rejected, ...withdrawn, ...offers];

      // Deduplicate by id if the same entry appears twice
      const map = new Map<string, InternalActivityItem>();
      for (const it of merged) {
        if (it?.id) map.set(it.id, it);
      }

      const unique = Array.from(map.values());
      unique.sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp));
      setAllItems(unique);
    };

    read();

    // Keep "time ago" labels fresh + pick up new logs from other pages
    const id = window.setInterval(() => {
      setNow(Date.now());
      read();
    }, 60_000);

    return () => window.clearInterval(id);
  }, []);

  const recent = useMemo(() => {
    const cutoff = now - LAST_DAYS * MS_DAY;

    return allItems
      .filter((i) => {
        const ms = toMs(i.timestamp);
        return ms && ms >= cutoff;
      })
      .slice(0, MAX_FEEDS)
      .map((i) => ({
        id: i.id,
        category: inferCategory(i),
        label: buildLabel(i),
        time: timeAgoLabel(i.timestamp, now),
      }));
  }, [allItems, now]);

  const empty = recent.length === 0;

  return (
    <section
      className={[
        "relative overflow-hidden rounded-2xl border border-neutral-200/70",
        // was: from-white via-slate-50 to-sky-50
        "bg-gradient-to-br from-slate-50 via-white to-indigo-50",
        "p-5 shadow-md",
      ].join(" ")}
    >
      {/* was sky blob */}
      <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-indigo-400/15 blur-3xl" />


      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
              <ListTodo className="h-3.5 w-3.5" />
              <span>Recent activity</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-neutral-900">
              What changed recently
            </p>
            <p className="mt-1 text-[11px] text-neutral-600">
              Pulled from your pipeline activity logs.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
            <Clock className="h-3.5 w-3.5" />
            <span>Last {LAST_DAYS} days</span>
          </span>
        </div>

        <ol className="mt-4 space-y-3 text-sm">
          {empty && (
            <li className="rounded-xl border border-dashed border-neutral-200 bg-white/80 p-4 text-center">
              <p className="text-[12px] text-neutral-600">
                No recent activity yet.
              </p>
              <p className="mt-1 text-[11px] text-neutral-500">
                As you add, move, or update items, your timeline will appear here.
              </p>
            </li>
          )}

          {!empty &&
            recent.map((item, index) => {
              const isFirst = index === 0;

              const dotClasses =
                item.category === "applied"
                  ? "bg-sky-500"
                  : item.category === "interview"
                    ? "bg-emerald-500"
                    : item.category === "rejected"
                      ? "bg-rose-500"
                      : item.category === "withdrawn"
                        ? "bg-amber-500"
                        : "bg-lime-500"; // offer

              return (
                <li
                  key={item.id}
                  className="relative flex gap-3 rounded-xl border border-neutral-200 bg-white/95 p-3 shadow-sm"
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={[
                        "mt-1 h-2.5 w-2.5 rounded-full ring-2 ring-white",
                        dotClasses,
                        isFirst ? "scale-110" : "",
                      ].join(" ")}
                    />
                    {index < recent.length - 1 && (
                      <span className="mt-1 h-full w-px flex-1 bg-neutral-200" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[13px] font-medium text-neutral-900">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-neutral-500">{item.time}</p>
                  </div>
                </li>
              );
            })}
        </ol>
      </div>
    </section>
  );
}
