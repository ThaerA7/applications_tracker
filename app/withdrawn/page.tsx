"use client";

import type React from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Filter, Plus, History } from "lucide-react";
import Image from "next/image";
import WithdrawnCard, { type WithdrawnRecord } from "./WithdrawnCard";
import type { InterviewType } from "@/components/dialogs/ScheduleInterviewDialog";
import MoveToWithdrawnDialog, {
  type WithdrawnDetails,
} from "@/components/dialogs/MoveToWithdrawnDialog";
import { animateCardExit } from "@/components/dialogs/cardExitAnimation";
import ActivityLogSidebar, { type ActivityItem } from "@/components/ActivityLogSidebar";

import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadWithdrawn,
  upsertWithdrawn,
  deleteWithdrawn,
  type WithdrawnStorageMode,
} from "@/lib/storage/withdrawn";

// ✅ NEW: persistent activity storage (guest + Supabase user)
import {
  loadActivity,
  appendActivity as appendActivityToStorage,
  migrateGuestActivityToUser,
  type ActivityStorageMode,
} from "@/lib/storage/activity";

const INTERVIEW_TYPE_LABEL: Record<InterviewType, string> = {
  phone: "Phone screening",
  video: "Video call",
  "in-person": "In person",
};

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

type ApplicationLike = React.ComponentProps<typeof MoveToWithdrawnDialog>["application"];

export default function WithdrawnPage() {
  const [withdrawn, setWithdrawn] = useState<WithdrawnRecord[]>([]);
  const [storageMode, setStorageMode] = useState<WithdrawnStorageMode>("guest");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WithdrawnRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Add/edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogApplication, setDialogApplication] = useState<ApplicationLike>(null);
  const [editingWithdrawn, setEditingWithdrawn] = useState<WithdrawnRecord | null>(null);

  // ✅ Activity log sidebar & data (guest + user)
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityMode, setActivityMode] = useState<ActivityStorageMode>("guest");

  // ✅ Persist activity (guest + user)
  const persistActivity = (entry: ActivityItem) => {
    appendActivityToStorage("withdrawn", entry, activityMode)
      .then((saved) => {
        setActivityItems((prev) => [saved, ...prev].slice(0, 100));
      })
      .catch((err) => {
        console.error("Failed to persist withdrawn activity", err);
        // fallback: still show it in UI
        setActivityItems((prev) => [entry, ...prev].slice(0, 100));
      });
  };

  // ✅ Load withdrawn + withdrawn activity, and handle auth switching
  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseClient();

    const loadAll = async () => {
      try {
        const [{ mode, items }, act] = await Promise.all([
          loadWithdrawn(),
          loadActivity("withdrawn"),
        ]);

        if (!alive) return;

        setStorageMode(mode);
        setWithdrawn(items as WithdrawnRecord[]);

        setActivityMode(act.mode);
        setActivityItems(act.items as ActivityItem[]);
      } catch (err) {
        console.error("Failed to load withdrawn/activity:", err);
      } finally {
        if (alive) setHydrated(true);
      }
    };

    void loadAll();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;

      if (event === "SIGNED_IN" && session?.user) {
        setTimeout(async () => {
          if (!alive) return;
          await migrateGuestActivityToUser(); // ✅ migrates withdrawn activity too
          await loadAll();
        }, 0);
      } else if (event === "SIGNED_OUT") {
        setTimeout(async () => {
          if (!alive) return;
          await loadAll();
        }, 0);
      }
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
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
        item.interviewType ? INTERVIEW_TYPE_LABEL[item.interviewType] : undefined,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [query, withdrawn]);

  const cardCount = filtered.length;

  const openDeleteDialog = (item: WithdrawnRecord) => setDeleteTarget(item);

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const id = target.id;
    const elementId = `withdrawn-card-${id}`;

    animateCardExit(elementId, "delete", () => {
      setWithdrawn((prev) => prev.filter((i) => i.id !== id));

      deleteWithdrawn(id, storageMode).catch((err) => {
        console.error("Failed to delete withdrawn application:", err);
      });

      persistActivity({
        id: makeUuidV4(),
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

  const handleCancelDelete = () => setDeleteTarget(null);

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
      withdrawnDate: item.withdrawnDate,
      reason: item.withdrawnReason,
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

  const handleSaveWithdrawn = useCallback(
    (details: WithdrawnDetails) => {
      if (editingWithdrawn) {
        const updated: WithdrawnRecord = {
          ...editingWithdrawn,
          company: details.company,
          role: details.role,
          location: details.location ?? editingWithdrawn.location,
          appliedOn: details.appliedDate ?? editingWithdrawn.appliedOn,
          withdrawnDate: details.withdrawnDate,
          withdrawnReason: details.reason,
          employmentType: details.employmentType ?? editingWithdrawn.employmentType,
          contactName: details.contactName ?? editingWithdrawn.contactName,
          contactEmail: details.contactEmail ?? editingWithdrawn.contactEmail,
          contactPhone: details.contactPhone ?? editingWithdrawn.contactPhone,
          url: details.url ?? editingWithdrawn.url,
          logoUrl: details.logoUrl ?? editingWithdrawn.logoUrl,
          notes: details.notes ?? editingWithdrawn.notes,
          interviewType: details.interviewType ?? editingWithdrawn.interviewType,
        };

        setWithdrawn((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));

        upsertWithdrawn(updated, storageMode).catch((err) => {
          console.error("Failed to persist edited withdrawn application:", err);
        });

        persistActivity({
          id: makeUuidV4(),
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
        const newItem: WithdrawnRecord = {
          id: makeUuidV4(),
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
        };

        setWithdrawn((prev) => [...prev, newItem]);

        upsertWithdrawn(newItem, storageMode).catch((err) => {
          console.error("Failed to persist newly created withdrawn application:", err);
        });

        persistActivity({
          id: makeUuidV4(),
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
    },
    [editingWithdrawn, storageMode, activityMode] // activityMode is used indirectly via persistActivity
  );

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
            <h2 className="text-sm font-semibold text-neutral-900">Delete withdrawn application?</h2>
            <p className="mt-2 text-sm text-neutral-700">
              This will permanently remove the withdrawn application at{" "}
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
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-rose-400/20 blur-3xl" />

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
            <h1 className="text-2xl font-semibold text-neutral-900">Withdrawn</h1>
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

        <p className="mt-1 text-neutral-700">Applications you chose to step away from.</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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

          {/* (still placeholder) */}
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <WithdrawnCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={openDeleteDialog}
            />
          ))}

          {hydrated && filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              <div className="mb-2 text-5xl">🚪</div>

              {withdrawn.length === 0 ? (
                <>
                  <p className="text-sm text-neutral-700">
                    You don&apos;t have any withdrawn applications yet.
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    When you move an application to withdrawn or add one manually, it will show up here.
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
