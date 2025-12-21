"use client";

import { X } from "lucide-react";

export type ActivityVariant =
  | "applied"
  | "interviews"
  | "rejected"
  | "withdrawn"
  | "offers";

export type ActivityType =
  | "added"
  | "edited"
  | "deleted"
  | "moved_to_interviews"
  | "moved_to_rejected"
  | "moved_to_withdrawn";

export type ActivityItem = {
  id: string;
  appId: string;
  type: ActivityType;
  timestamp: string; // ISO string
  company: string;
  role?: string;
  location?: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;

  /**
   * Generic date field used across variants.
   * Historically "applied on".
   * For offers old records may still rely on this.
   */
  appliedOn?: string;

  /**
   * Offer-specific dates.
   * Stored on offers activity so the sidebar can show the correct
   * accepted/declined/received date.
   */
  offerReceivedDate?: string;
  offerAcceptedDate?: string;
  offerDeclinedDate?: string;
};

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

function getActivityIconSrc(type: ActivityType): string {
  switch (type) {
    case "added":
      return "/icons/add.png";
    case "edited":
      return "/icons/edit.png";
    case "deleted":
      return "/icons/delete.png";
    case "moved_to_rejected":
      return "/icons/cancel.png";
    case "moved_to_withdrawn":
      return "/icons/withdrawn.png";
    case "moved_to_interviews":
      return "/icons/add.png";
    default:
      return "/icons/history.png";
  }
}

/** Item-aware labels. */
function getActivityLabel(
  variant: ActivityVariant,
  item: ActivityItem
): string {
  const type = item.type;

  switch (variant) {
    case "applied":
      switch (type) {
        case "added":
          return "Application added";
        case "edited":
          return "Application updated";
        case "deleted":
          return "Application deleted";
        case "moved_to_interviews":
          return "Moved to interviews";
        case "moved_to_rejected":
          return "Moved to rejected";
        case "moved_to_withdrawn":
          return "Moved to withdrawn";
        default:
          return "Activity";
      }

    case "interviews":
      switch (type) {
        case "added":
          return "Interview created";
        case "edited":
          return "Interview updated";
        case "deleted":
          return "Interview deleted";
        case "moved_to_interviews":
          return "Interview scheduled";
        case "moved_to_rejected":
          return "Moved to rejected";
        case "moved_to_withdrawn":
          return "Moved to withdrawn";
        default:
          return "Activity";
      }

    case "rejected":
      switch (type) {
        case "added":
          return "Rejection added";
        case "edited":
          return "Rejection updated";
        case "deleted":
          return "Rejection deleted";
        case "moved_to_rejected":
          return "Moved to rejected";
        case "moved_to_interviews":
          return "Moved to interviews";
        case "moved_to_withdrawn":
          return "Moved to withdrawn";
        default:
          return "Activity";
      }

    case "withdrawn":
      switch (type) {
        case "added":
          return "Withdrawn added";
        case "edited":
          return "Withdrawn updated";
        case "deleted":
          return "Withdrawn deleted";
        case "moved_to_withdrawn":
          return "Moved to withdrawn";
        case "moved_to_rejected":
          return "Moved to rejected";
        case "moved_to_interviews":
          return "Moved to interviews";
        default:
          return "Activity";
      }

    case "offers": {
      if (type === "added") return "OFFER RECEIVED";
      if (type === "deleted") return "OFFER DELETED";

      if (type === "edited") {
        const st = (item.toStatus || "").toLowerCase();

        if (st === "accepted") return "OFFER ACCEPTED";
        if (st === "declined") return "OFFER DECLINED";
        if (st === "received") return "OFFER RECEIVED";

        return "OFFER UPDATED";
      }

      return "OFFER UPDATED";
    }

    default:
      return "Activity";
  }
}

/** For offers: choose the primary date and label for each activity item. */
function getOffersPrimaryDate(item: ActivityItem): {
  label: string;
  value?: string;
} {
  const to = (item.toStatus || "").toLowerCase();

  if (to === "accepted") {
    return {
      label: "Offer accepted on",
      value: item.offerAcceptedDate ?? item.appliedOn,
    };
  }

  if (to === "declined") {
    return {
      label: "Offer declined on",
      value: item.offerDeclinedDate ?? item.appliedOn,
    };
  }

  if (to === "received") {
    return {
      label: "Offer received on",
      value: item.offerReceivedDate ?? item.appliedOn,
    };
  }

  // Fallbacks based on type
  if (item.type === "added") {
    return {
      label: "Offer received on",
      value: item.offerReceivedDate ?? item.appliedOn,
    };
  }

  return {
    label: "Offer received on",
    value: item.offerReceivedDate ?? item.appliedOn,
  };
}

type VariantConfig = {
  backdrop: string;
  panelGradient: string;
  topBarGradient: string;
  appliedBoxClass: string;
  actionBoxClass: string;
  actionLabelClass: string;
  hoverBorderClass: string;
  emptyBorderClass: string;
  headerTitle: string;
  headerSubtitle: string;
  headerIconAlt: string;
  closeButtonFocusRingClass: string;
};

const VARIANT_CONFIG: Record<ActivityVariant, VariantConfig> = {
  applied: {
    backdrop: "bg-neutral-900/40",
    panelGradient: "bg-gradient-to-b from-white via-sky-50/70 to-amber-50/70",
    topBarGradient:
      "bg-gradient-to-r from-sky-400 via-fuchsia-400 to-amber-400",
    appliedBoxClass:
      "rounded-lg border border-neutral-200/80 bg-neutral-50/80 px-2.5 py-1.5",
    actionBoxClass:
      "rounded-lg border border-sky-100/80 bg-sky-50/60 px-2.5 py-1.5",
    actionLabelClass:
      "text-[10px] font-semibold uppercase tracking-wide text-neutral-500",
    hoverBorderClass: "hover:border-neutral-300",
    emptyBorderClass: "border-neutral-300/80",
    headerTitle: "Activity on this page",
    headerSubtitle: "Created, moved, deleted and updated applications.",
    headerIconAlt: "History",
    closeButtonFocusRingClass:
      "focus-visible:ring-2 focus-visible:ring-sky-300",
  },

  interviews: {
    backdrop: "bg-emerald-950/40",
    panelGradient:
      "bg-gradient-to-b from-white via-emerald-50/70 to-teal-50/70",
    topBarGradient:
      "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400",
    appliedBoxClass:
      "rounded-lg border border-neutral-200/80 bg-emerald-50/60 px-2.5 py-1.5",
    actionBoxClass:
      "rounded-lg border border-emerald-100/80 bg-emerald-50/60 px-2.5 py-1.5",
    actionLabelClass:
      "text-[10px] font-semibold uppercase tracking-wide text-emerald-700",
    hoverBorderClass: "hover:border-emerald-200",
    emptyBorderClass: "border-emerald-100/80",
    headerTitle: "Interview activity",
    headerSubtitle: "Created, updated, moved and deleted interviews.",
    headerIconAlt: "Interview activity",
    closeButtonFocusRingClass:
      "focus-visible:ring-2 focus-visible:ring-emerald-300",
  },

  rejected: {
    backdrop: "bg-neutral-900/40",
    panelGradient: "bg-gradient-to-b from-white via-rose-50/70 to-pink-50/70",
    topBarGradient:
      "bg-gradient-to-r from-rose-400 via-pink-400 to-fuchsia-400",
    appliedBoxClass:
      "rounded-lg border border-neutral-200/80 bg-neutral-50/80 px-2.5 py-1.5",
    actionBoxClass:
      "rounded-lg border border-rose-100/80 bg-rose-50/70 px-2.5 py-1.5",
    actionLabelClass:
      "text-[10px] font-semibold uppercase tracking-wide text-neutral-500",
    hoverBorderClass: "hover:border-neutral-300",
    emptyBorderClass: "border-neutral-300/80",
    headerTitle: "Rejected activity",
    headerSubtitle:
      "Created, updated, moved and deleted rejected applications.",
    headerIconAlt: "Rejected activity",
    closeButtonFocusRingClass:
      "focus-visible:ring-2 focus-visible:ring-rose-300",
  },

  withdrawn: {
    backdrop: "bg-neutral-900/40",
    panelGradient: "bg-gradient-to-b from-white via-amber-50/70 to-rose-50/70",
    topBarGradient:
      "bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400",
    appliedBoxClass:
      "rounded-lg border border-neutral-200/80 bg-neutral-50/80 px-2.5 py-1.5",
    actionBoxClass:
      "rounded-lg border border-amber-100/80 bg-amber-50/70 px-2.5 py-1.5",
    actionLabelClass:
      "text-[10px] font-semibold uppercase tracking-wide text-amber-700",
    hoverBorderClass: "hover:border-amber-200",
    emptyBorderClass: "border-neutral-300/80",
    headerTitle: "Withdrawn activity",
    headerSubtitle: "Created, updated and deleted withdrawn applications.",
    headerIconAlt: "Withdrawn activity",
    closeButtonFocusRingClass:
      "focus-visible:ring-2 focus-visible:ring-amber-300",
  },

  offers: {
    backdrop: "bg-emerald-950/40",
    panelGradient:
      "bg-gradient-to-b from-white via-emerald-50/70 to-lime-50/70",
    topBarGradient:
      "bg-gradient-to-r from-pink-500 via-orange-400 to-amber-300",
    appliedBoxClass:
      "rounded-lg border border-neutral-200/80 bg-emerald-50/60 px-2.5 py-1.5",
    actionBoxClass:
      "rounded-lg border border-emerald-100/80 bg-emerald-50/60 px-2.5 py-1.5",
    actionLabelClass:
      "text-[10px] font-semibold uppercase tracking-wide text-emerald-700",
    hoverBorderClass: "hover:border-emerald-200",
    emptyBorderClass: "border-emerald-100/80",
    headerTitle: "Offers activity",
    headerSubtitle: "Created, updated, tagged and deleted offer cards.",
    headerIconAlt: "Offers activity",
    closeButtonFocusRingClass:
      "focus-visible:ring-2 focus-visible:ring-emerald-300",
  },
};

type ActivityLogSidebarProps = {
  variant: ActivityVariant;
  open: boolean;
  onClose: () => void;
  items: ActivityItem[];
};

export default function ActivityLogSidebar({
  variant,
  open,
  onClose,
  items,
}: ActivityLogSidebarProps) {
  const config = VARIANT_CONFIG[variant];

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
          "absolute inset-0",
          config.backdrop,
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
          config.panelGradient,
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
              alt={config.headerIconAlt}
              className="h-9 w-9 object-contain"
            />
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                {config.headerTitle}
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-600">
                {config.headerSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={[
              "inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/80 text-neutral-500 shadow-sm hover:bg-white focus:outline-none",
              config.closeButtonFocusRingClass,
            ].join(" ")}
            aria-label="Close activity sidebar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div
              className={[
                "mt-8 rounded-xl border bg-white/80 p-5 text-center text-xs text-neutral-600 shadow-sm",
                config.emptyBorderClass,
              ].join(" ")}
            >
              <div className="mb-2 text-2xl">🕊️</div>
              <p>
                {variant === "applied" &&
                  "No activity yet. Actions like adding, editing, moving or deleting applications will appear here."}
                {variant === "interviews" &&
                  "No interview activity yet. Creating, editing, moving or deleting interviews will show up here."}
                {variant === "rejected" &&
                  "No rejected activity yet. Creating, editing, moving or deleting rejected applications will show up here."}
                {variant === "withdrawn" &&
                  "No withdrawn activity yet. Creating, editing or deleting withdrawn applications will show up here."}
                {variant === "offers" &&
                  "No offers activity yet. Adding, editing, tagging or deleting offers will show up here."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {items.map((item) => {
                const baseLabel = getActivityLabel(variant, item);
                const iconSrc = getActivityIconSrc(item.type);

                const isMoveType =
                  item.type === "moved_to_interviews" ||
                  item.type === "moved_to_rejected" ||
                  item.type === "moved_to_withdrawn";

                const displayLabel =
                  isMoveType && item.fromStatus
                    ? `${baseLabel} from ${item.fromStatus}`
                    : baseLabel;

                const primaryDate =
                  variant === "offers"
                    ? getOffersPrimaryDate(item)
                    : { label: "Applied on", value: item.appliedOn };

                return (
                  <li
                    key={item.id}
                    className={[
                      "group relative overflow-hidden rounded-xl border border-neutral-200/80",
                      "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
                      "p-3 text-xs text-neutral-800 shadow-sm",
                      "transition-all duration-200 ease-out",
                      "hover:-translate-y-0.5 hover:shadow-md",
                      config.hoverBorderClass,
                    ].join(" ")}
                  >
                    {/* Gradient bar at top */}
                    <div
                      className={[
                        "pointer-events-none absolute inset-x-0 top-0 h-1.5",
                        config.topBarGradient,
                      ].join(" ")}
                    />

                    <div className="relative space-y-2 pt-1">
                      {/* Icon + text block */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center">
                          <img
                            src={iconSrc}
                            alt={displayLabel}
                            className="h-7 w-7 object-contain"
                          />
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          {/* Role + company */}
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 truncate">
                            <span className="truncate text-sm font-semibold text-neutral-900">
                              {item.role ||
                                (variant === "interviews"
                                  ? "Interview"
                                  : variant === "offers"
                                  ? "Offer"
                                  : "Application")}
                            </span>
                            <span className="text-xs font-semibold text-neutral-700">
                              @ {item.company}
                            </span>
                          </div>

                          {/* Single combined label */}
                          <div className={config.actionLabelClass}>
                            {displayLabel}
                          </div>
                        </div>
                      </div>

                      {/* Dates row */}
                      <div className="grid gap-2 text-[11px] text-neutral-600 sm:grid-cols-2">
                        <div className={config.appliedBoxClass}>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                            {primaryDate.label}
                          </div>
                          <div className="mt-0.5 text-xs text-neutral-900">
                            {fmtAppliedDate(primaryDate.value)}
                          </div>
                        </div>

                        <div className={config.actionBoxClass}>
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
