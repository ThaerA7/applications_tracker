"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Plus, History } from "lucide-react";
import Image from "next/image";
import WithdrawnCard, { type WithdrawnRecord } from "./WithdrawnCard";
import type { InterviewType } from "@/components/dialogs/ScheduleInterviewDialog";
import MoveToWithdrawnDialog, {
  type WithdrawnDetails,
} from "@/components/dialogs/MoveToWithdrawnDialog";
import { animateCardExit } from "@/components/dialogs/cardExitAnimation";
import ActivityLogSidebar, {
  type ActivityItem,
} from "@/components/ActivityLogSidebar";

const WITHDRAWN_STORAGE_KEY = "job-tracker:withdrawn";
const WITHDRAWN_ACTIVITY_STORAGE_KEY = "job-tracker:withdrawn-activity";

const INTERVIEW_TYPE_LABEL: Record<InterviewType, string> = {
  phone: "Phone screening",
  video: "Video call",
  "in-person": "In person",
};

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type ApplicationLike = React.ComponentProps<
  typeof MoveToWithdrawnDialog
>["application"];

export default function WithdrawnPage() {
  const [withdrawn, setWithdrawn] = useState<WithdrawnRecord[]>([]);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WithdrawnRecord | null>(
    null
  );

  // Add/edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogApplication, setDialogApplication] =
    useState<ApplicationLike>(null);
  const [editingWithdrawn, setEditingWithdrawn] =
    useState<WithdrawnRecord | null>(null);

  // Activity log sidebar & data
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

  // helper to append to activity log (and persist)
  const appendActivity = (entry: ActivityItem) => {
    setActivityItems((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            WITHDRAWN_ACTIVITY_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch (err) {
          console.error(
            "Failed to persist withdrawn activity to localStorage",
            err
          );
        }
      }
      return next;
    });
  };

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(WITHDRAWN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setWithdrawn(parsed);
        }
      }
    } catch (err) {
      console.error(
        "Failed to load withdrawn applications from localStorage",
        err
      );
    }

    try {
      const rawActivity = window.localStorage.getItem(
        WITHDRAWN_ACTIVITY_STORAGE_KEY
      );
      if (rawActivity) {
        const parsedActivity = JSON.parse(rawActivity);
        if (Array.isArray(parsedActivity)) {
          setActivityItems(parsedActivity);
        }
      }
    } catch (err) {
      console.error("Failed to load withdrawn activity from localStorage", err);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return withdrawn;

    return withdrawn.filter((item) =>
      [
        item.company,
        item.role,
        item.location,
        item.employmentType,
        item.contactName,
        item.contactEmail,
        item.notes,
        item.interviewType
          ? INTERVIEW_TYPE_LABEL[item.interviewType]
          : undefined,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [query, withdrawn]);

  // NEW: how many cards are currently visible (after search)
  const cardCount = filtered.length;

  const openDeleteDialog = (item: WithdrawnRecord) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const id = target.id;
    const elementId = `withdrawn-card-${id}`;

    animateCardExit(elementId, "delete", () => {
      setWithdrawn((prev) => {
        const next = prev.filter((i) => i.id !== id);

        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              WITHDRAWN_STORAGE_KEY,
              JSON.stringify(next)
            );
          } catch (err) {
            console.error(
              "Failed to persist withdrawn applications after delete",
              err
            );
          }
        }

        return next;
      });

      // log delete activity
      const activityId = makeId();
      appendActivity({
        id: activityId,
        appId: target.id,
        type: "deleted",
        timestamp: new Date().toISOString(),
        company: target.company,
        role: target.role,
        location: target.location,
        appliedOn: target.appliedOn,
        note: target.notes,
      });

      setDeleteTarget(null);
    });
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  // --- Add / Edit withdrawn via MoveToWithdrawnDialog ---

  const handleAdd = () => {
    setEditingWithdrawn(null);
    setDialogApplication(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: WithdrawnRecord) => {
    const app: ApplicationLike = {
      id: item.id,
      company: item.company,
      role: item.role,
      location: item.location,
      appliedOn: item.appliedOn,
      employmentType: item.employmentType,
      contactPerson: item.contactName,
      contactEmail: item.contactEmail,
      contactPhone: item.contactPhone,
      offerUrl: item.url,
      logoUrl: item.logoUrl,
      notes: item.notes,
      // used by dialog to prefill existing withdrawn data
      withdrawnDate: item.withdrawnDate,
      reason: item.withdrawnReason,
      // prefill stage info
      interviewDate: item.interviewDate,
      interviewType: item.interviewType,
    };

    setEditingWithdrawn(item);
    setDialogApplication(app);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingWithdrawn(null);
    setDialogApplication(null);
  };

  const handleSaveWithdrawn = (details: WithdrawnDetails) => {
    if (editingWithdrawn) {
      // Update existing withdrawn record
      const updated: WithdrawnRecord = {
        ...editingWithdrawn,
        company: details.company,
        role: details.role,
        location: details.location ?? editingWithdrawn.location,
        appliedOn: details.appliedDate ?? editingWithdrawn.appliedOn,
        withdrawnDate: details.withdrawnDate,
        withdrawnReason: details.reason,
        employmentType:
          details.employmentType ?? editingWithdrawn.employmentType,
        contactName: details.contactName ?? editingWithdrawn.contactName,
        contactEmail: details.contactEmail ?? editingWithdrawn.contactEmail,
        contactPhone: details.contactPhone ?? editingWithdrawn.contactPhone,
        url: details.url ?? editingWithdrawn.url,
        logoUrl: details.logoUrl ?? editingWithdrawn.logoUrl,
        notes: details.notes ?? editingWithdrawn.notes,
        interviewType:
          details.interviewType ?? editingWithdrawn.interviewType,
      };

      setWithdrawn((prev) => {
        const next = prev.map((item) =>
          item.id === updated.id ? updated : item
        );

        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              WITHDRAWN_STORAGE_KEY,
              JSON.stringify(next)
            );
          } catch (err) {
            console.error(
              "Failed to persist withdrawn applications after edit",
              err
            );
          }
        }

        return next;
      });

      // log edit activity
      const activityId = makeId();
      appendActivity({
        id: activityId,
        appId: updated.id,
        type: "edited",
        timestamp: new Date().toISOString(),
        company: updated.company,
        role: updated.role,
        location: updated.location,
        appliedOn: updated.appliedOn,
        note: updated.notes,
      });
    } else {
      // Create new withdrawn record
      const newItem: WithdrawnRecord = {
        id: makeId(),
        company: details.company,
        role: details.role,
        location: details.location,
        appliedOn: details.appliedDate,
        withdrawnDate: details.withdrawnDate,
        withdrawnReason: details.reason,
        employmentType: details.employmentType,
        contactName: details.contactName,
        contactEmail: details.contactEmail,
        contactPhone: details.contactPhone,
        url: details.url,
        logoUrl: details.logoUrl,
        notes: details.notes,
        interviewType: details.interviewType,
        // interviewDate left empty here (withdrawn before interview, unless you add it later)
      };

      setWithdrawn((prev) => {
        const next = [...prev, newItem];

        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              WITHDRAWN_STORAGE_KEY,
              JSON.stringify(next)
            );
          } catch (err) {
            console.error(
              "Failed to persist withdrawn applications after create",
              err
            );
          }
        }

        return next;
      });

      // log add activity
      const activityId = makeId();
      appendActivity({
        id: activityId,
        appId: newItem.id,
        type: "added",
        timestamp: new Date().toISOString(),
        company: newItem.company,
        role: newItem.role,
        location: newItem.location,
        appliedOn: newItem.appliedOn,
        note: newItem.notes,
      });
    }

    setDialogOpen(false);
    setEditingWithdrawn(null);
    setDialogApplication(null);
  };

  return (
    <>
      {/* Withdrawn activity sidebar */}
      <ActivityLogSidebar
        variant="withdrawn"
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        items={activityItems}
      />

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[13000] flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-neutral-900/40"
            aria-hidden="true"
            onClick={handleCancelDelete}
          />
          <div
            className={[
              "relative z-10 w-full max-w-sm rounded-2xl border border-neutral-200/80",
              "bg-white shadow-2xl p-5",
            ].join(" ")}
          >
            <h2 className="text-sm font-semibold text-neutral-900">
              Delete withdrawn application?
            </h2>
            <p className="mt-2 text-sm text-neutral-700">
              This will permanently remove the withdrawn application at{" "}
              <span className="font-medium">{deleteTarget.company}</span> for
              the role <span className="font-medium">{deleteTarget.role}</span>.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              This action cannot be undone.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center justify-center rounded-lg border border-amber-500 bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <section
        className={[
          "relative rounded-2xl border border-neutral-200/70",
          "bg-gradient-to-br from-amber-50 via-white to-rose-50",
          "p-8 shadow-md overflow-hidden",
        ].join(" ")}
      >
        {/* soft amber/rose blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-rose-400/20 blur-3xl" />

        {/* header row with activity button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/icons/withdrawn.png"
              alt=""
              width={37}
              height={37}
              aria-hidden="true"
              className="shrink-0 -mt-1"
            />
            <h1 className="text-2xl font-semibold text-neutral-900">
              Withdrawn
            </h1>
            {/* NEW: card count indicator */}
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white/80 px-2.5 py-0.5 text-xs font-medium text-neutral-800 shadow-sm">
              {cardCount} card{cardCount === 1 ? "" : "s"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActivityOpen(true)}
            className={[
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800",
              "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
              "border border-neutral-200 shadow-sm hover:bg-white",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300",
            ].join(" ")}
          >
            <History className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span>Activity log</span>
            {activityItems.length > 0 && (
              <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                {activityItems.length}
              </span>
            )}
          </button>
        </div>

        <p className="mt-1 text-neutral-700">
          Applications you chose to step away from.
        </p>

        {/* Toolbar: Search + Add + Filter */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search withdrawn applications…"
              aria-label="Search withdrawn applications"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={[
                "h-11 w-full rounded-lg pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500",
                "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                "border border-neutral-200 shadow-sm",
                "hover:bg-white focus:bg-white",
                "ring-1 ring-transparent",
                "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300",
                "transition-shadow",
              ].join(" ")}
            />
          </div>

          {/* Add */}
          <button
            type="button"
            onClick={handleAdd}
            className={[
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800",
              "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
              "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300",
            ].join(" ")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>

          {/* Filter (placeholder) */}
          <button
            type="button"
            className={[
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800",
              "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
              "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300",
            ].join(" ")}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filter
          </button>
        </div>

        {/* Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <WithdrawnCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={openDeleteDialog}
            />
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text:center backdrop-blur">
              <div className="mb-2 text-5xl">🚪</div>

              {withdrawn.length === 0 ? (
                <>
                  <p className="text-sm text-neutral-700">
                    You don&apos;t have any withdrawn applications yet.
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    When you move an application to withdrawn or add one
                    manually, it will show up here.
                  </p>
                </>
              ) : (
                <p className="text-sm text-neutral-700">
                  No withdrawn applications match your search.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Manual add/edit withdrawn dialog */}
      <MoveToWithdrawnDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        application={dialogApplication}
        mode={editingWithdrawn ? "edit" : "add"}
        onWithdrawnCreated={handleSaveWithdrawn}
      />
    </>
  );
}
