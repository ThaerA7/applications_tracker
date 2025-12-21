"use client";

import type React from "react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import MoveToRejectedDialog, {
  type RejectionDetails,
} from "@/components/dialogs/MoveToRejectedDialog";
import RejectedCard, { type Rejection } from "@/components/cards/RejectedCard";
import { Search, Plus, History } from "lucide-react";
import { animateCardExit } from "@/components/dialogs/cardExitAnimation";
import ActivityLogSidebar, { type ActivityItem } from "@/components/ui/ActivityLogSidebar";
import ThreeBounceSpinner from "@/components/ui/ThreeBounceSpinner";

import RejectedFilter, {
  DEFAULT_REJECTED_FILTERS,
  filterRejected,
  type RejectedFilters,
} from "@/components/filters/RejectedFilter";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadRejected,
  upsertRejected,
  deleteRejected,
  migrateGuestRejectedToUser,
  type RejectedStorageMode,
} from "@/lib/services/rejected";

// Persistent activity storage (guest + Supabase user).
import {
  loadActivity,
  appendActivity as appendActivityToStorage,
  migrateGuestActivityToUser,
  type ActivityStorageMode,
} from "@/lib/services/activity";

type ApplicationLike =
  React.ComponentProps<typeof MoveToRejectedDialog>["application"];

function makeUuidV4() {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  const buf = new Uint8Array(16);
  cryptoObj?.getRandomValues?.(buf);
  if (!cryptoObj?.getRandomValues) {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const hex = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function RejectedPage() {
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejected, setRejected] = useState<Rejection[]>([]);
  const [storageMode, setStorageMode] = useState<RejectedStorageMode>("guest");
  const [hydrated, setHydrated] = useState(false);

  const [dialogApplication, setDialogApplication] = useState<ApplicationLike>(null);
  const [editingRejection, setEditingRejection] = useState<Rejection | null>(null);

  // Delete confirmation dialog target
  const [deleteTarget, setDeleteTarget] = useState<Rejection | null>(null);

  // Activity log sidebar state (guest + user).
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityMode, setActivityMode] = useState<ActivityStorageMode>("guest");

  // Rejected filters state
  const [filters, setFilters] = useState<RejectedFilters>(DEFAULT_REJECTED_FILTERS);

  // Persist activity (guest + user).
  const persistActivity = async (entry: ActivityItem) => {
    const saved = await appendActivityToStorage("rejected", entry, activityMode);
    setActivityItems((prev) => [saved, ...prev].slice(0, 100));
  };

  // Load rejected + activity, and handle auth switching.
  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseClient();

    const loadAll = async () => {
      try {
        const [{ mode, items }, act] = await Promise.all([
          loadRejected(),
          loadActivity("rejected"),
        ]);

        if (!alive) return;

        setStorageMode(mode);
        setRejected(items as Rejection[]);

        setActivityMode(act.mode);
        setActivityItems(act.items as ActivityItem[]);
      } catch (err) {
        console.error("Failed to load rejected/activity:", err);
      } finally {
        if (alive) setHydrated(true);
      }
    };

    void loadAll();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!alive) return;

        if (event === "SIGNED_IN" && session?.user) {
          setTimeout(async () => {
            if (!alive) return;
            await migrateGuestRejectedToUser();
            await migrateGuestActivityToUser(); // Migrate activity, then reload.
            await loadAll();
          }, 0);
        } else if (event === "SIGNED_OUT") {
          setTimeout(async () => {
            if (!alive) return;
            await loadAll();
          }, 0);
        }
      },
    );

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
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

  const openDeleteDialog = (item: Rejection) => setDeleteTarget(item);

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const id = target.id;
    const elementId = `rejected-card-${id}`;

    animateCardExit(elementId, "delete", async () => {
      setRejected((prev) => prev.filter((i) => i.id !== id));

      // persist delete via storage layer
      deleteRejected(id, storageMode).catch((err) => {
        console.error("Failed to delete rejected application:", err);
      });

      // log delete activity (persisted to guest/user activity storage)
      await persistActivity({
        id: makeUuidV4(),
        appId: target.id,
        type: "deleted",
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

  const handleCancelDelete = () => setDeleteTarget(null);

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingRejection(null);
    setDialogApplication(null);
  };

  // Use dialog output to create or update cards
  const handleRejectionCreated = async (details: RejectionDetails) => {
    let target: Rejection;

    if (editingRejection) {
      // update existing
      target = { ...editingRejection, ...details };

      setRejected((prev) =>
        prev.map((item) => (item.id === editingRejection.id ? target : item))
      );

      upsertRejected(target, storageMode).catch((err) => {
        console.error("Failed to persist edited rejected application:", err);
      });
    } else {
      // create new
      const newId = makeUuidV4();
      target = { id: newId, ...details };

      setRejected((prev) => [...prev, target]);

      upsertRejected(target, storageMode).catch((err) => {
        console.error("Failed to persist newly created rejected application:", err);
      });
    }

    // log add / edit activity (persisted)
    await persistActivity({
      id: makeUuidV4(),
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

  const cardCount = filtered.length;

  return (
    <>
      {/* Delete confirmation overlay */}
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
              <span className="font-medium">{deleteTarget.company}</span> for the role{" "}
              <span className="font-medium">{deleteTarget.role}</span>.
            </p>
            <p className="mt-1 text-xs text-neutral-500">This action cannot be undone.</p>

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
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-pink-400/20 blur-3xl" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/icons/cancel.png"
              alt=""
              width={37}
              height={37}
              aria-hidden="true"
              className="shrink-0 -mt-1"
            />
            <h1 className="text-2xl font-semibold text-neutral-900">Rejected</h1>
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

        <p className="mt-1 text-neutral-700">Applications that didn’t work out.</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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
                "focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-300",
                "transition-shadow",
              ].join(" ")}
            />
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className={[
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800",
              "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
              "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-300",
            ].join(" ")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>

          <RejectedFilter
            items={rejected}
            filters={filters}
            onChange={setFilters}
            filteredCount={filtered.length}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!hydrated ? (
            <div className="col-span-full flex items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              <ThreeBounceSpinner label="Loading rejected applications" />
            </div>
          ) : (
            filtered.map((item) => (
              <RejectedCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={openDeleteDialog}
              />
            ))
          )}

          {hydrated && filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              <div className="mb-2 text-5xl">💔</div>

              {rejected.length === 0 ? (
                <>
                  <p className="text-sm text-neutral-700">
                    You don&apos;t have any rejected applications yet.
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Once you mark an application as rejected, it will show up here.
                  </p>
                </>
              ) : (
                <p className="text-sm text-neutral-700">
                  No rejected applications match your search or filters.
                </p>
              )}
            </div>
          )}

          <MoveToRejectedDialog
            open={dialogOpen}
            onClose={handleDialogClose}
            application={dialogApplication}
            onRejectionCreated={handleRejectionCreated}
            mode={editingRejection ? "edit" : "add"}
          />
        </div>
      </section>

      <ActivityLogSidebar
        variant="rejected"
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        items={activityItems}
      />
    </>
  );
}
