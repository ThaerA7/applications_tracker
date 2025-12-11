"use client";

import type React from "react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import MoveToRejectedDialog, {
  type RejectionDetails,
} from "@/components/dialogs/MoveToRejectedDialog";
import RejectedCard, { type Rejection } from "./RejectedCard";
import { Search, Plus, History } from "lucide-react";
import { animateCardExit } from "@/components/dialogs/cardExitAnimation";
import ActivityLogSidebar, {
  type ActivityItem,
} from "@/components/ActivityLogSidebar";

import RejectedFilter, {
  DEFAULT_REJECTED_FILTERS,
  filterRejected,
  type RejectedFilters,
} from "@/components/RejectedFilter";

const REJECTIONS_STORAGE_KEY = "job-tracker:rejected";
const REJECTIONS_ACTIVITY_STORAGE_KEY = "job-tracker:rejected-activity";

type ApplicationLike = React.ComponentProps<
  typeof MoveToRejectedDialog
>["application"];

export default function RejectedPage() {
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejected, setRejected] = useState<Rejection[]>([]);

  const [dialogApplication, setDialogApplication] =
    useState<ApplicationLike>(null);
  const [editingRejection, setEditingRejection] = useState<Rejection | null>(
    null
  );

  // Delete confirmation dialog target
  const [deleteTarget, setDeleteTarget] = useState<Rejection | null>(null);

  // Activity log sidebar & data
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

  // Rejected filters state
  const [filters, setFilters] = useState<RejectedFilters>(
    DEFAULT_REJECTED_FILTERS
  );

  // helper to append to activity log (and persist)
  const appendActivity = (entry: ActivityItem) => {
    setActivityItems((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            REJECTIONS_ACTIVITY_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch (err) {
          console.error(
            "Failed to persist rejected activity to localStorage",
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
      // rejected cards
      const raw = window.localStorage.getItem(REJECTIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRejected(parsed);
        }
      }

      // rejected activity log
      const rawActivity = window.localStorage.getItem(
        REJECTIONS_ACTIVITY_STORAGE_KEY
      );
      if (rawActivity) {
        const parsedActivity = JSON.parse(rawActivity);
        if (Array.isArray(parsedActivity)) {
          setActivityItems(parsedActivity);
        }
      }
    } catch (err) {
      console.error(
        "Failed to load rejected applications or activity from localStorage",
        err
      );
    }
  }, []);

  const handleAdd = () => {
    setEditingRejection(null);
    setDialogApplication(null);
    setDialogOpen(true);
  };

  // Edit existing rejection
  const handleEdit = (item: Rejection) => {
    const app: ApplicationLike = {
      id: item.id,
      company: item.company,
      role: item.role,
      location: item.location,
      appliedOn: item.appliedDate,
      employmentType: item.employmentType,
      contactPerson: item.contactName,
      contactEmail: item.contactEmail,
      contactPhone: item.contactPhone,
      offerUrl: item.url,
      logoUrl: item.logoUrl,
      notes: item.notes,
      decisionDate: item.decisionDate,
      rejectionType: item.rejectionType,
      phoneScreenDate: item.phoneScreenDate,
      firstInterviewDate: item.firstInterviewDate,
      secondInterviewDate: item.secondInterviewDate,
    };

    setEditingRejection(item);
    setDialogApplication(app);
    setDialogOpen(true);
  };

  const openDeleteDialog = (item: Rejection) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const id = target.id;
    const elementId = `rejected-card-${id}`;

    animateCardExit(elementId, "delete", () => {
      setRejected((prev) => {
        const next = prev.filter((i) => i.id !== id);

        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              REJECTIONS_STORAGE_KEY,
              JSON.stringify(next)
            );
          } catch (err) {
            console.error(
              "Failed to persist rejected applications after delete",
              err
            );
          }
        }

        return next;
      });

      // log delete activity
      const activityId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-delete`;

      appendActivity({
        id: activityId,
        appId: target.id,
        type: "deleted", // ActivityType
        timestamp: new Date().toISOString(),
        company: target.company,
        role: target.role,
        location: target.location,
        appliedOn: target.appliedDate,
        note: target.notes,
      });

      setDeleteTarget(null);
    });
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingRejection(null);
    setDialogApplication(null);
  };

  // Use dialog output to create or update cards
  const handleRejectionCreated = (details: RejectionDetails) => {
    let next: Rejection[];
    let target: Rejection;

    if (editingRejection) {
      // update existing
      target = {
        ...editingRejection,
        ...details,
      };
      next = rejected.map((item) =>
        item.id === editingRejection.id ? target : item
      );
    } else {
      // create new
      const newId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${rejected.length}`;

      target = {
        id: newId,
        ...details,
      };
      next = [...rejected, target];
    }

    setRejected(next);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          REJECTIONS_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch (err) {
        console.error(
          "Failed to persist rejected applications to localStorage",
          err
        );
      }
    }

    // log add / edit activity
    const activityId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-activity`;

    appendActivity({
      id: activityId,
      appId: target.id,
      type: editingRejection ? "edited" : "added",
      timestamp: new Date().toISOString(),
      company: target.company,
      role: target.role,
      location: target.location,
      appliedOn: target.appliedDate,
      note: target.notes,
    });

    setDialogOpen(false);
    setEditingRejection(null);
    setDialogApplication(null);
  };

  const filtered = useMemo(
    () => filterRejected(rejected, query, filters),
    [rejected, query, filters]
  );

  return (
    <>
      {/* Delete confirmation overlay (same style as Interviews page) */}
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
              Delete rejected application?
            </h2>
            <p className="mt-2 text-sm text-neutral-700">
              This will permanently remove the rejected application at{" "}
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
                className="inline-flex items-center justify-center rounded-lg border border-rose-500 bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-400"
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
          "bg-gradient-to-br from-rose-50 via-white to-pink-50",
          "p-8 shadow-md",
        ].join(" ")}
      >
        {/* soft rose/pink blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-pink-400/20 blur-3xl" />

        {/* header row with activity button (matching Interviews page layout) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Image
              src="/icons/cancel.png"
              alt=""
              width={37}
              height={37}
              aria-hidden="true"
              className="shrink-0 -mt-1"
            />
            <h1 className="text-2xl font-semibold text-neutral-900">
              Rejected
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setActivityOpen(true)}
            className={[
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800",
              "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
              "border border-neutral-200 shadow-sm hover:bg-white",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-300",
            ].join(" ")}
          >
            <History className="h-4 w-4 text-rose-600" aria-hidden="true" />
            <span>Activity log</span>
            {activityItems.length > 0 && (
              <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                {activityItems.length}
              </span>
            )}
          </button>
        </div>

        <p className="mt-1 text-neutral-700">
          Applications that didn’t work out.
        </p>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search rejected applications…"
              aria-label="Search rejected applications"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={[
                "h-11 w-full rounded-lg pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500",
                "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                "border border-neutral-200 shadow-sm",
                "hover:bg-white focus:bg-white",
                "ring-1 ring-transparent",
                "focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-300",
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
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300",
            ].join(" ")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>

          {/* New rejected filter */}
          <RejectedFilter
            items={rejected}
            filters={filters}
            onChange={setFilters}
            filteredCount={filtered.length}
          />
        </div>

        {/* Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <RejectedCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={openDeleteDialog}
            />
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              <div className="mb-2 text-5xl">💔</div>

              {rejected.length === 0 ? (
                <>
                  <p className="text-sm text-neutral-700">
                    You don&apos;t have any rejected applications yet.
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Once you mark an application as rejected, it will show up
                    here.
                  </p>
                </>
              ) : (
                <p className="text-sm text-neutral-700">
                  No rejected applications match your search or filters.
                </p>
              )}
            </div>
          )}

          {/* Dialog mount */}
          <MoveToRejectedDialog
            open={dialogOpen}
            onClose={handleDialogClose}
            application={dialogApplication}
            onRejectionCreated={handleRejectionCreated}
            mode={editingRejection ? "edit" : "add"}
          />
        </div>
      </section>

      {/* Activity log sidebar */}
      <ActivityLogSidebar
        variant="rejected"
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        items={activityItems}
      />
    </>
  );
}
