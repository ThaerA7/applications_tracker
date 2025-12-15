// app/offers/page.tsx
"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Image from "next/image";
import {
  PartyPopper,
  Trophy,
  CheckCircle2,
  XCircle,
  Plus,
  History,
} from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import MoveToAcceptedDialog, {
  type AcceptedDetails,
} from "../../components/dialogs/MoveToAcceptedDialog";
import OfferAcceptanceTagDialog, {
  type OfferAcceptanceTagDetails,
  type OfferDecisionStatus,
} from "../../components/dialogs/OfferAcceptanceTagDialog";

import OffersReceivedCards, {
  type OfferReceivedJob,
  type OffersReceivedView,
  isAcceptedOffer,
  isDeclinedOffer,
  isPendingOffer,
} from "./OffersReceivedCards";

import ActivityLogSidebar from "@/components/ActivityLogSidebar";

import { getSupabaseClient } from "@/lib/supabase/client";

import {
  loadOffers,
  upsertOffer,
  deleteOffer,
  migrateGuestOffersToUser,
  type OffersStorageMode,
} from "@/lib/storage/offers";

// ✅ NEW: persistent activity storage (guest + Supabase user)
import {
  loadActivity,
  appendActivity as appendActivityToStorage,
  migrateGuestActivityToUser,
  type ActivityItem,
  type ActivityVariant,
  type ActivityStorageMode,
} from "@/lib/storage/activity";

const VIEW_FILTERS: {
  id: OffersReceivedView;
  label: string;
  shortLabel: string;
  icon: ComponentType<any>;
}[] = [
  { id: "received", label: "Offers received", shortLabel: "Received", icon: Trophy },
  { id: "declined", label: "Offers declined", shortLabel: "Declined", icon: XCircle },
  {
    id: "accepted",
    label: "Offers accepted",
    short: "Accepted",
    icon: CheckCircle2,
  } as any,
].map((v) => ("short" in v ? { ...v, shortLabel: (v as any).short } : v)) as {
  id: OffersReceivedView;
  label: string;
  shortLabel: string;
  icon: ComponentType<any>;
}[];

const normalizeOffers = (list: OfferReceivedJob[]) => {
  return list.map((j) => {
    const offerReceivedDate = j.offerReceivedDate ?? j.decisionDate ?? undefined;

    const offerAcceptedDate =
      j.offerAcceptedDate && j.offerAcceptedDate.trim() !== ""
        ? j.offerAcceptedDate
        : undefined;

    const offerDeclinedDate =
      j.offerDeclinedDate && j.offerDeclinedDate.trim() !== ""
        ? j.offerDeclinedDate
        : undefined;

    // If both exist (weird edge), prefer accepted.
    const finalAccepted = offerAcceptedDate;
    const finalDeclined = finalAccepted ? undefined : offerDeclinedDate;

    const taken = finalAccepted ? true : Boolean(j.taken);

    return {
      ...j,
      offerReceivedDate,
      offerAcceptedDate: finalAccepted,
      offerDeclinedDate: finalDeclined,
      taken,
    };
  });
};

const getOfferReceivedForActivity = (job?: Partial<OfferReceivedJob> | null) => {
  if (!job) return undefined;
  return job.offerReceivedDate ?? job.decisionDate ?? job.appliedOn ?? undefined;
};

const VIEW_STATUS_LABEL: Record<OfferDecisionStatus, string> = {
  received: "Received",
  accepted: "Accepted",
  declined: "Declined",
};

// ✅ helper to generate a real UUID (safe for Supabase UUID columns)
function makeUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function OffersReceivedPage() {
  const [items, setItems] = useState<OfferReceivedJob[]>([]);
  const [storageMode, setStorageMode] = useState<OffersStorageMode>("guest");
  const [hydrated, setHydrated] = useState(false);

  const [view, setView] = useState<OffersReceivedView>("received");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OfferReceivedJob | null>(null);

  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [taggingItem, setTaggingItem] = useState<OfferReceivedJob | null>(null);

  // ✅ Activity log sidebar & persistent storage mode
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityMode, setActivityMode] = useState<ActivityStorageMode>("guest");

  // Delete confirmation dialog target
  const [deleteTarget, setDeleteTarget] = useState<OfferReceivedJob | null>(null);

  // ✅ persist activity (guest + user)
  const persistActivity = async (entry: ActivityItem) => {
    const saved = await appendActivityToStorage("offers", entry, activityMode);
    setActivityItems((prev) => [saved, ...prev].slice(0, 100));
  };

  // Load offers + offers activity (and handle auth switching)
  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseClient();

    const loadAll = async () => {
      try {
        const [{ mode, items }, act] = await Promise.all([
          loadOffers(),
          loadActivity("offers"),
        ]);

        if (!alive) return;

        setStorageMode(mode);
        setActivityMode(act.mode);
        setActivityItems(act.items);

        // 👇 No more demo seeding – just use real stored items
        setItems(normalizeOffers(items));
      } catch (err) {
        console.error("Failed to load offers/activity:", err);
        if (!alive) return;
        // If something explodes, just show nothing instead of demo
        setItems([]);
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
          await migrateGuestOffersToUser();
          await migrateGuestActivityToUser(); // ✅ migrate all variants (including offers)
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

  // Delete flow
  const openDeleteDialog = (id: string) => {
    const target = items.find((j) => j.id === id) ?? null;
    if (!target) return;
    setDeleteTarget(target);
  };

  const handleCancelDelete = () => setDeleteTarget(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const received = getOfferReceivedForActivity(deleteTarget);

    await persistActivity({
      id: makeUuid(),
      appId: deleteTarget.id,
      type: "deleted",
      timestamp: new Date().toISOString(),
      company: deleteTarget.company,
      role: deleteTarget.role,
      location: deleteTarget.location,

      appliedOn: received, // compatibility fallback

      offerReceivedDate: received,
      offerAcceptedDate: deleteTarget.offerAcceptedDate,
      offerDeclinedDate: deleteTarget.offerDeclinedDate,

      note: deleteTarget.notes,
    });

    setItems((prev) => prev.filter((job) => job.id !== deleteTarget.id));

    void deleteOffer(deleteTarget.id, storageMode).catch((err) => {
      console.error("Failed to delete offer:", err);
    });

    setDeleteTarget(null);
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (job: OfferReceivedJob) => {
    setEditingItem(job);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const openTagDialog = (job: OfferReceivedJob) => {
    setTaggingItem(job);
    setIsTagDialogOpen(true);
  };

  const closeTagDialog = () => {
    setIsTagDialogOpen(false);
    setTaggingItem(null);
  };

  const handleTagSave = async (details: OfferAcceptanceTagDetails) => {
    if (!taggingItem) return;

    const prevStatusLabel = isAcceptedOffer(taggingItem)
      ? "Accepted"
      : isDeclinedOffer(taggingItem)
        ? "Declined"
        : "Received";

    const nextStatusLabel = VIEW_STATUS_LABEL[details.status];
    const received = getOfferReceivedForActivity(taggingItem);

    const nextAcceptedDate =
      details.status === "accepted"
        ? details.offerAcceptedDate || taggingItem.offerAcceptedDate
        : undefined;

    const nextDeclinedDate =
      details.status === "declined"
        ? details.offerDeclinedDate || taggingItem.offerDeclinedDate
        : undefined;

    await persistActivity({
      id: makeUuid(),
      appId: taggingItem.id,
      type: "edited",
      timestamp: new Date().toISOString(),
      company: taggingItem.company,
      role: taggingItem.role,
      location: taggingItem.location,

      fromStatus: prevStatusLabel,
      toStatus: nextStatusLabel,

      appliedOn: received,
      offerReceivedDate: received,
      offerAcceptedDate: nextAcceptedDate,
      offerDeclinedDate: nextDeclinedDate,

      note: taggingItem.notes,
    });

    let updated: OfferReceivedJob | null = null;

    setItems((prev) => {
      const next = prev.map((job) => {
        if (job.id !== taggingItem.id) return job;

        const status: OfferDecisionStatus = details.status;

        const nextOfferAccepted =
          status === "accepted"
            ? details.offerAcceptedDate || job.offerAcceptedDate
            : undefined;

        const nextOfferDeclined =
          status === "declined"
            ? details.offerDeclinedDate || job.offerDeclinedDate
            : undefined;

        const updatedJob: OfferReceivedJob = {
          ...job,
          offerAcceptedDate: nextOfferAccepted,
          offerDeclinedDate: nextOfferDeclined,
          taken: Boolean(nextOfferAccepted),
        };

        updated = updatedJob;
        return updatedJob;
      });

      return next;
    });

    if (updated) {
      void upsertOffer(updated, storageMode).catch((err) => {
        console.error("Failed to persist tagged offer:", err);
      });
    }

    closeTagDialog();
  };

  const handleOfferCreated = async (details: AcceptedDetails) => {
    // Edit flow
    if (editingItem) {
      const receivedForActivity =
        details.offerReceivedDate ??
        details.decisionDate ??
        editingItem.offerReceivedDate ??
        editingItem.decisionDate ??
        editingItem.appliedOn;

      const acceptedForActivity =
        details.offerAcceptedDate ?? editingItem.offerAcceptedDate;

      const declinedForActivity = acceptedForActivity
        ? undefined
        : editingItem.offerDeclinedDate;

      await persistActivity({
        id: makeUuid(),
        appId: editingItem.id,
        type: "edited",
        timestamp: new Date().toISOString(),
        company: details.company ?? editingItem.company,
        role: details.role ?? editingItem.role,
        location: details.location ?? editingItem.location,
        appliedOn: receivedForActivity,
        offerReceivedDate: receivedForActivity,
        offerAcceptedDate: acceptedForActivity,
        offerDeclinedDate: declinedForActivity,
        note:
          details.notes !== undefined && details.notes !== ""
            ? details.notes
            : editingItem.notes,
      });

      let updated: OfferReceivedJob | null = null;

      setItems((prev) => {
        const next = prev.map((job) => {
          if (job.id !== editingItem.id) return job;

          const nextOfferReceived =
            details.offerReceivedDate ??
            details.decisionDate ??
            job.offerReceivedDate ??
            job.decisionDate;

          const nextOfferAccepted =
            details.offerAcceptedDate ?? job.offerAcceptedDate;

          const nextOfferDeclined = nextOfferAccepted
            ? undefined
            : job.offerDeclinedDate;

          const updatedJob: OfferReceivedJob = {
            ...job,
            company: details.company,
            role: details.role,
            location: details.location,
            startDate: details.startDate || job.startDate,
            salary: details.salary || job.salary,
            url: details.url || job.url,
            logoUrl: details.logoUrl || job.logoUrl,
            notes:
              details.notes !== undefined && details.notes !== ""
                ? details.notes
                : job.notes,
            appliedOn: details.appliedOn || job.appliedOn,
            employmentType: details.employmentType || job.employmentType,

            offerReceivedDate: nextOfferReceived,
            decisionDate: nextOfferReceived,
            offerAcceptedDate: nextOfferAccepted,
            offerDeclinedDate: nextOfferDeclined,
            taken: Boolean(nextOfferAccepted),
          };

          updated = updatedJob;
          return updatedJob;
        });

        return next;
      });

      if (updated) {
        void upsertOffer(updated, storageMode).catch((err) => {
          console.error("Failed to persist edited offer:", err);
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      return;
    }

    // Add flow (UUID id)
    const newId = makeUuid();

    const newOfferReceived = details.offerReceivedDate ?? details.decisionDate;
    const newOfferAccepted = details.offerAcceptedDate;

    const newItem: OfferReceivedJob = {
      id: newId,
      company: details.company,
      role: details.role,
      location: details.location,
      startDate: details.startDate,
      salary: details.salary,
      url: details.url,
      logoUrl: details.logoUrl,
      notes: details.notes,
      appliedOn: details.appliedOn,
      employmentType: details.employmentType,

      offerReceivedDate: newOfferReceived,
      decisionDate: newOfferReceived,
      offerAcceptedDate: newOfferAccepted,
      offerDeclinedDate: undefined,
      taken: Boolean(newOfferAccepted),
    };

    await persistActivity({
      id: makeUuid(),
      appId: newId,
      type: "added",
      timestamp: new Date().toISOString(),
      company: newItem.company,
      role: newItem.role,
      location: newItem.location,
      toStatus: "Received",
      appliedOn: newOfferReceived,
      offerReceivedDate: newOfferReceived,
      offerAcceptedDate: newOfferAccepted,
      offerDeclinedDate: undefined,
      note: newItem.notes,
    });

    setItems((prev) => [newItem, ...prev]);
    void upsertOffer(newItem, storageMode).catch((err) => {
      console.error("Failed to persist new offer:", err);
    });

    setIsDialogOpen(false);
  };

  const totalReceived = items.length;
  const firstJob = items[0];

  const filteredItems = useMemo(() => {
    if (view === "accepted") return items.filter(isAcceptedOffer);
    if (view === "declined") return items.filter(isDeclinedOffer);
    return items.filter(isPendingOffer);
  }, [items, view]);

  const cardCount = filteredItems.length;

  const countsPerView = useMemo(
    () =>
      ({
        received: items.filter(isPendingOffer).length,
        declined: items.filter(isDeclinedOffer).length,
        accepted: items.filter(isAcceptedOffer).length,
      } as Record<OffersReceivedView, number>),
    [items]
  );

  return (
    <>
      {/* Add / edit offer dialog */}
      <MoveToAcceptedDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        application={
          editingItem
            ? {
                id: editingItem.id,
                company: editingItem.company,
                role: editingItem.role,
                location: editingItem.location,
                status: "Offer",
                appliedOn: editingItem.appliedOn,
                employmentType: editingItem.employmentType,
                offerUrl: editingItem.url,
                logoUrl: editingItem.logoUrl,
                notes: editingItem.notes,
                decisionDate: editingItem.decisionDate,
                offerReceivedDate:
                  editingItem.offerReceivedDate ?? editingItem.decisionDate,
                offerAcceptedDate: editingItem.offerAcceptedDate,
              }
            : null
        }
        onAcceptedCreated={handleOfferCreated}
        mode={editingItem ? "edit" : "add"}
      />

      {/* Tag decision dialog */}
      <OfferAcceptanceTagDialog
        open={isTagDialogOpen}
        onClose={closeTagDialog}
        offer={taggingItem}
        onSave={handleTagSave}
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
            <h2 className="text-sm font-semibold text-neutral-900">Delete offer?</h2>
            <p className="mt-2 text-sm text-neutral-700">
              This will permanently remove the offer from{" "}
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
                Delete offer
              </button>
            </div>
          </div>
        </div>
      )}

      <section
        className={[
          "relative rounded-2xl border border-neutral-200/70",
          "bg-gradient-to-br from-emerald-50 via-white to-lime-50",
          "p-8 shadow-md overflow-hidden",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-lime-400/20 blur-3xl" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-neutral-900 flex items-center gap-1">
                <Image
                  src="/icons/accepted.png"
                  alt="Offers received icon"
                  width={37}
                  height={37}
                  className="shrink-0 -mt-1"
                />
                <span>Offers</span>
              </h1>

              <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white/80 px-2.5 py-0.5 text-xs font-medium text-neutral-800 shadow-sm">
                {cardCount} card{cardCount === 1 ? "" : "s"}
              </span>
            </div>

            <p className="mt-1 text-sm text-neutral-700">
              This is your win board – every card here is a{" "}
              <span className="font-semibold text-emerald-700">
                “Yes, here&apos;s your contract!”
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActivityOpen(true)}
              className={[
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800",
                "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
                "border border-neutral-200 shadow-sm hover:bg-white",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300",
              ].join(" ")}
            >
              <History className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span>Activity log</span>
              {activityItems.length > 0 && (
                <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                  {activityItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={openAddDialog}
              className={[
                "inline-flex items-center gap-1.5 rounded-lg border border-emerald-200",
                "bg-white/80 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm",
                "hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
              ].join(" ")}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add offer received</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* banner */}
        <div className="mt-6 relative z-10">
          <div
            className={[
              "relative overflow-hidden rounded-xl border border-emerald-100",
              "bg-white/80 px-5 py-4 shadow-sm",
            ].join(" ")}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-200/40 blur-2xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-10 h-24 w-24 rounded-full bg-lime-200/40 blur-2xl" />

            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  <PartyPopper className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {totalReceived === 0
                      ? "Future offer celebration"
                      : "Offer celebration zone"}
                  </span>
                </p>

                <p className="mt-1 text-sm text-neutral-800">
                  {totalReceived === 0 && (
                    <>
                      The first contract offer you get will land here. Until then,
                      every application is training for that moment.
                    </>
                  )}
                  {totalReceived === 1 && firstJob && (
                    <>
                      You already turned your effort into a real offer:{" "}
                      <span className="font-semibold">{firstJob.role}</span> at{" "}
                      <span className="font-semibold">{firstJob.company}</span>.
                      This page is proof you can do it again.
                    </>
                  )}
                  {totalReceived > 1 && firstJob && (
                    <>
                      Look at this stack of wins. From{" "}
                      <span className="font-semibold">{firstJob.company}</span> to
                      every card below – each offer is a milestone.
                    </>
                  )}
                </p>

                {firstJob && totalReceived > 0 && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Tip: screenshot this page when you doubt yourself.
                  </p>
                )}
              </div>

              <div className="flex flex-col items-start sm:items-end gap-2">
                <div
                  className={[
                    "inline-flex items-center gap-2 rounded-full border border-emerald-100",
                    "bg-emerald-50/90 px-3 py-1.5 text-[11px] font-medium text-emerald-800",
                    "shadow-sm",
                  ].join(" ")}
                >
                  <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span>
                    {totalReceived === 0 && "Your celebration wall is waiting 🎈"}
                    {totalReceived === 1 && "1 offer received – huge step forward."}
                    {totalReceived > 1 && `${totalReceived} offers received – keep stacking wins.`}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-500 max-w-xs text-left sm:text-right">
                  Not luck –{" "}
                  <span className="font-semibold">
                    consistency, learning, and courage to apply.
                  </span>
                </p>
              </div>
            </div>

            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-pink-500 via-orange-400 to-amber-300"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-pink-500 via-orange-400 to-amber-300"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* View toggle */}
        <div className="mt-3 w-full relative z-10">
          <div
            className={[
              "relative overflow-hidden",
              "grid grid-cols-3 gap-0 rounded-xl border border-neutral-200 bg-white/80 p-0",
              "shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70",
            ].join(" ")}
            role="tablist"
            aria-label="View offers received"
          >
            {VIEW_FILTERS.map((option) => {
              const active = view === option.id;
              const Icon = option.icon;
              const viewCount = countsPerView[option.id];

              const activeBadgeClasses =
                option.id === "declined"
                  ? "bg-white/90 text-rose-700"
                  : "bg-white/90 text-emerald-700";

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setView(option.id)}
                  className={[
                    "flex items-center justify-center gap-1.5 rounded-lg px-3 py-3 text-[15px] font-medium transition",
                    active
                      ? option.id === "declined"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-emerald-600 text-white shadow-sm"
                      : "text-neutral-700 hover:bg-neutral-50",
                  ].join(" ")}
                  aria-pressed={active}
                  role="tab"
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{option.label}</span>
                  <span className="sm:hidden">{option.shortLabel}</span>
                  <span
                    className={[
                      "ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                      active ? activeBadgeClasses : "bg-neutral-200/80 text-neutral-800",
                    ].join(" ")}
                  >
                    {viewCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* cards */}
        <OffersReceivedCards
          items={hydrated ? filteredItems : []}
          view={view}
          onTagStatus={openTagDialog}
          onEdit={handleEdit}
          onDelete={openDeleteDialog}
        />
      </section>

      {/* Activity log sidebar */}
      <ActivityLogSidebar
        variant={"offers" as ActivityVariant}
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        items={activityItems}
      />
    </>
  );
}
