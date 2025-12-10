// app/offers/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import Image from "next/image";
import {
  PartyPopper,
  Trophy,
  CheckCircle2,
  XCircle,
  Plus,
  History,
} from "lucide-react";

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

import ActivityLogSidebar, {
  type ActivityItem,
} from "@/components/ActivityLogSidebar";

// ✅ new key
const OFFERS_RECEIVED_STORAGE_KEY = "job-tracker:offers-received";
// ✅ legacy key (for migration)
const LEGACY_ACCEPTED_STORAGE_KEY = "job-tracker:accepted";

// ✅ NEW: offers activity key
const OFFERS_RECEIVED_ACTIVITY_STORAGE_KEY =
  "job-tracker:offers-received-activity";

const VIEW_FILTERS: {
  id: OffersReceivedView;
  label: string;
  shortLabel: string;
  icon: ComponentType<any>;
}[] = [
  {
    id: "received",
    label: "Offers received",
    shortLabel: "Received",
    icon: Trophy,
  },
  {
    id: "declined",
    label: "Offers declined",
    shortLabel: "Declined",
    icon: XCircle,
  },
  {
    id: "accepted",
    label: "Offers accepted",
    shortLabel: "Accepted",
    icon: CheckCircle2,
  },
];

const DEMO_OFFERS_RECEIVED: OfferReceivedJob[] = [
  {
    id: "r1",
    company: "Acme Corp",
    role: "Frontend Engineer",
    location: "Berlin",
    appliedOn: "2025-10-10",
    employmentType: "Full-time",
    offerReceivedDate: "2025-11-01",
    offerAcceptedDate: "2025-11-03",
    startDate: "2026-01-12",
    salary: "€65,000 / year",
    url: "https://jobs.example/acme/frontend",
    logoUrl: "/logos/acme.svg",
    notes: "You did it! First big frontend role. 🎉",
    taken: true,
  },
  {
    id: "r2",
    company: "Globex",
    role: "Mobile Developer (Flutter)",
    location: "Remote",
    appliedOn: "2025-09-25",
    employmentType: "Ausbildung",
    offerReceivedDate: "2025-10-15",
    startDate: "2026-03-01",
    salary: "€60,000 / year",
    logoUrl: "/logos/globex.png",
    notes: "Remote-friendly team, strong learning potential.",
    taken: false,
  },
  {
    id: "r3",
    company: "Initech",
    role: "Junior Fullstack Developer",
    location: "Hamburg",
    appliedOn: "2025-09-02",
    employmentType: "Full-time",
    offerReceivedDate: "2025-10-02",
    offerDeclinedDate: "2025-10-05",
    salary: "€54,000 / year",
    logoUrl: "/logos/initech.svg",
    notes: "Good offer, but you chose a better-fit path.",
    taken: false,
  },
];

const normalizeOffers = (list: OfferReceivedJob[]) => {
  return list.map((j) => {
    const offerReceivedDate =
      j.offerReceivedDate ?? j.decisionDate ?? undefined;

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

export default function OffersReceivedPage() {
  const [items, setItems] =
    useState<OfferReceivedJob[]>(DEMO_OFFERS_RECEIVED);

  const [view, setView] =
    useState<OffersReceivedView>("received");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] =
    useState<OfferReceivedJob | null>(null);

  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [taggingItem, setTaggingItem] =
    useState<OfferReceivedJob | null>(null);

  // ✅ Activity log sidebar & data
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

  // ✅ NEW: Delete confirmation dialog target (like Interviews)
  const [deleteTarget, setDeleteTarget] = useState<OfferReceivedJob | null>(
    null
  );

  // ✅ helper to append to activity log (and persist)
  const appendActivity = (entry: ActivityItem) => {
    setActivityItems((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            OFFERS_RECEIVED_ACTIVITY_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch (err) {
          console.error(
            "Failed to persist offers activity to localStorage",
            err
          );
        }
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // ✅ offers received cards
      const newRaw = window.localStorage.getItem(
        OFFERS_RECEIVED_STORAGE_KEY
      );
      const legacyRaw = window.localStorage.getItem(
        LEGACY_ACCEPTED_STORAGE_KEY
      );

      // 1) Prefer new key if valid
      if (newRaw) {
        const parsed = JSON.parse(newRaw);
        if (Array.isArray(parsed)) {
          const normalized = normalizeOffers(parsed);
          setItems(normalized);
          window.localStorage.setItem(
            OFFERS_RECEIVED_STORAGE_KEY,
            JSON.stringify(normalized)
          );
        }
      } else if (legacyRaw) {
        // 2) Migrate legacy key if present
        const parsedLegacy = JSON.parse(legacyRaw);
        if (Array.isArray(parsedLegacy)) {
          const normalized = normalizeOffers(parsedLegacy);
          window.localStorage.setItem(
            OFFERS_RECEIVED_STORAGE_KEY,
            JSON.stringify(normalized)
          );
          setItems(normalized);
        }
      } else {
        // 3) Seed demo
        window.localStorage.setItem(
          OFFERS_RECEIVED_STORAGE_KEY,
          JSON.stringify(DEMO_OFFERS_RECEIVED)
        );
        setItems(DEMO_OFFERS_RECEIVED);
      }

      // ✅ offers activity log
      const rawActivity = window.localStorage.getItem(
        OFFERS_RECEIVED_ACTIVITY_STORAGE_KEY
      );
      if (rawActivity) {
        const parsedActivity = JSON.parse(rawActivity);
        if (Array.isArray(parsedActivity)) {
          setActivityItems(parsedActivity);
        }
      }
    } catch (err) {
      console.error(
        "Failed to load offers received or activity from localStorage",
        err
      );
      setItems(DEMO_OFFERS_RECEIVED);
    }
  }, []);

  const persist = (next: OfferReceivedJob[]) => {
    if (typeof window === "undefined") return;
    try {
      const normalized = normalizeOffers(next);
      window.localStorage.setItem(
        OFFERS_RECEIVED_STORAGE_KEY,
        JSON.stringify(normalized)
      );
    } catch (err) {
      console.error("Failed to persist offers received", err);
    }
  };

  // ✅ NEW delete flow (Interview-style)
  const openDeleteDialog = (id: string) => {
    const target = items.find((j) => j.id === id) ?? null;
    if (!target) return;
    setDeleteTarget(target);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    const activityId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-offer-delete`;

    const received = getOfferReceivedForActivity(deleteTarget);

    appendActivity({
      id: activityId,
      appId: deleteTarget.id,
      type: "deleted",
      timestamp: new Date().toISOString(),
      company: deleteTarget.company,
      role: deleteTarget.role,
      location: deleteTarget.location,

      // fallback compatibility
      appliedOn: received,

      // ✅ offer-specific dates
      offerReceivedDate: received,
      offerAcceptedDate: deleteTarget.offerAcceptedDate,
      offerDeclinedDate: deleteTarget.offerDeclinedDate,

      note: deleteTarget.notes,
    });

    setItems((prev) => {
      const next = prev.filter((job) => job.id !== deleteTarget.id);
      persist(next);
      return next;
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

  const handleTagSave = (details: OfferAcceptanceTagDetails) => {
    if (!taggingItem) return;

    const activityId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-offer-tag`;

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

    appendActivity({
      id: activityId,
      appId: taggingItem.id,
      type: "edited",
      timestamp: new Date().toISOString(),
      company: taggingItem.company,
      role: taggingItem.role,
      location: taggingItem.location,

      fromStatus: prevStatusLabel,
      toStatus: nextStatusLabel,

      // fallback compatibility
      appliedOn: received,

      // ✅ offer-specific dates for correct sidebar date
      offerReceivedDate: received,
      offerAcceptedDate: nextAcceptedDate,
      offerDeclinedDate: nextDeclinedDate,

      note: taggingItem.notes,
    });

    setItems((prev) => {
      const next = prev.map((job) => {
        if (job.id !== taggingItem.id) return job;

        const status: OfferDecisionStatus = details.status;

        const nextAccepted =
          status === "accepted"
            ? details.offerAcceptedDate || job.offerAcceptedDate
            : undefined;

        const nextDeclined =
          status === "declined"
            ? details.offerDeclinedDate || job.offerDeclinedDate
            : undefined;

        return {
          ...job,
          offerAcceptedDate: nextAccepted,
          offerDeclinedDate: nextDeclined,
          taken: Boolean(nextAccepted),
        };
      });

      persist(next);
      return next;
    });

    closeTagDialog();
  };

  const handleOfferCreated = (details: AcceptedDetails) => {
    const mkActivityId = (suffix: string) =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${suffix}`;

    // ✅ Edit flow
    if (editingItem) {
      const activityId = mkActivityId("offer-edit");

      const receivedForActivity =
        details.offerReceivedDate ??
        details.decisionDate ??
        editingItem.offerReceivedDate ??
        editingItem.decisionDate ??
        editingItem.appliedOn;

      const acceptedForActivity =
        details.offerAcceptedDate ?? editingItem.offerAcceptedDate;

      const declinedForActivity =
        acceptedForActivity ? undefined : editingItem.offerDeclinedDate;

      appendActivity({
        id: activityId,
        appId: editingItem.id,
        type: "edited",
        timestamp: new Date().toISOString(),
        company: details.company ?? editingItem.company,
        role: details.role ?? editingItem.role,
        location: details.location ?? editingItem.location,

        // fallback compatibility
        appliedOn: receivedForActivity,

        // ✅ offer-specific dates
        offerReceivedDate: receivedForActivity,
        offerAcceptedDate: acceptedForActivity,
        offerDeclinedDate: declinedForActivity,

        note:
          details.notes !== undefined && details.notes !== ""
            ? details.notes
            : editingItem.notes,
        // no toStatus => sidebar label will be OFFER UPDATED
      });

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

          const nextOfferDeclined =
            nextOfferAccepted ? undefined : job.offerDeclinedDate;

          return {
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
            employmentType:
              details.employmentType || job.employmentType,

            offerReceivedDate: nextOfferReceived,
            decisionDate: nextOfferReceived,
            offerAcceptedDate: nextOfferAccepted,
            offerDeclinedDate: nextOfferDeclined,
            taken: Boolean(nextOfferAccepted),
          };
        });

        persist(next);
        return next;
      });

      setIsDialogOpen(false);
      setEditingItem(null);
      return;
    }

    // ✅ Add flow
    const newId = `received-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const newOfferReceived =
      details.offerReceivedDate ?? details.decisionDate;

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

    const activityId = mkActivityId("offer-add");

    appendActivity({
      id: activityId,
      appId: newId,
      type: "added",
      timestamp: new Date().toISOString(),
      company: newItem.company,
      role: newItem.role,
      location: newItem.location,

      toStatus: "Received",

      // fallback compatibility
      appliedOn: newOfferReceived,

      // ✅ offer-specific dates
      offerReceivedDate: newOfferReceived,
      offerAcceptedDate: newOfferAccepted,
      offerDeclinedDate: undefined,

      note: newItem.notes,
    });

    setItems((prev) => {
      const next = [newItem, ...prev];
      persist(next);
      return next;
    });

    setIsDialogOpen(false);
  };

  const totalReceived = items.length;
  const firstJob = items[0];

  const filteredItems = useMemo(() => {
    if (view === "accepted") {
      return items.filter(isAcceptedOffer);
    }
    if (view === "declined") {
      return items.filter(isDeclinedOffer);
    }
    return items.filter(isPendingOffer);
  }, [items, view]);

  return (
    <>
      {/* Add / edit offer received dialog */}
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
                  editingItem.offerReceivedDate ??
                  editingItem.decisionDate,
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

      {/* ✅ Delete confirmation dialog (Offers) – matches Interviews */}
      {deleteTarget && (
        <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[13000] flex items-center justify-center px-4 py-8">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-neutral-900/40"
            aria-hidden="true"
            onClick={handleCancelDelete}
          />

          {/* Panel */}
          <div
            className={[
              "relative z-10 w-full max-w-sm rounded-2xl border border-neutral-200/80",
              "bg-white shadow-2xl p-5",
            ].join(" ")}
          >
            <h2 className="text-sm font-semibold text-neutral-900">
              Delete offer?
            </h2>
            <p className="mt-2 text-sm text-neutral-700">
              This will permanently remove the offer from{" "}
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
        {/* cheerful blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-lime-400/20 blur-3xl" />

        {/* header row */}
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div>
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
            <p className="mt-1 text-sm text-neutral-700">
              This is your win board – every card here is a{" "}
              <span className="font-semibold text-emerald-700">
                “Yes, here&apos;s your contract!”
              </span>
            </p>
          </div>

          {/* Right-side buttons */}
          <div className="flex items-center gap-2">
            {/* Activity button */}
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

            {/* Top-right Add button */}
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

        {/* celebration banner */}
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
                      The first contract offer you get will land here.
                      Until then, every application is training
                      for that moment.
                    </>
                  )}
                  {totalReceived === 1 && firstJob && (
                    <>
                      You already turned your effort into a real offer:{" "}
                      <span className="font-semibold">
                        {firstJob.role}
                      </span>{" "}
                      at{" "}
                      <span className="font-semibold">
                        {firstJob.company}
                      </span>
                      . This page is proof you can do it again.
                    </>
                  )}
                  {totalReceived > 1 && firstJob && (
                    <>
                      Look at this stack of wins. From{" "}
                      <span className="font-semibold">
                        {firstJob.company}
                      </span>{" "}
                      to every card below – each offer is a milestone.
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
                    {totalReceived === 0 &&
                      "Your celebration wall is waiting 🎈"}
                    {totalReceived === 1 &&
                      "1 offer received – huge step forward."}
                    {totalReceived > 1 &&
                      `${totalReceived} offers received – keep stacking wins.`}
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
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setView(option.id)}
                  className={[
                    "flex items-center justify-center gap-1 rounded-lg px-3 py-3 text-[15px] font-medium transition",
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
                </button>
              );
            })}

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

        {/* cards grid (extracted) */}
        <OffersReceivedCards
          items={filteredItems}
          view={view}
          onTagStatus={openTagDialog}
          onEdit={handleEdit}
          onDelete={openDeleteDialog}
        />
      </section>

      {/* ✅ Activity log sidebar */}
      <ActivityLogSidebar
        variant="offers"
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        items={activityItems}
      />
    </>
  );
}
