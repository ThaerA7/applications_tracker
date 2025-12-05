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

// ✅ new key
const OFFERS_RECEIVED_STORAGE_KEY = "job-tracker:offers-received";
// ✅ legacy key (for migration)
const LEGACY_ACCEPTED_STORAGE_KEY = "job-tracker:accepted";

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
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
          return;
        }
      }

      // 2) Migrate legacy key if present
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw);
        if (Array.isArray(parsedLegacy)) {
          const normalized = normalizeOffers(parsedLegacy);
          window.localStorage.setItem(
            OFFERS_RECEIVED_STORAGE_KEY,
            JSON.stringify(normalized)
          );
          setItems(normalized);
          return;
        }
      }

      // 3) Seed demo
      window.localStorage.setItem(
        OFFERS_RECEIVED_STORAGE_KEY,
        JSON.stringify(DEMO_OFFERS_RECEIVED)
      );
      setItems(DEMO_OFFERS_RECEIVED);
    } catch (err) {
      console.error(
        "Failed to load offers received from localStorage",
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

  const handleDelete = (id: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Remove this offer from your win board?"
      );
      if (!confirmed) return;
    }

    setItems((prev) => {
      const next = prev.filter((job) => job.id !== id);
      persist(next);
      return next;
    });
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

    setItems((prev) => {
      const next = prev.map((job) => {
        if (job.id !== taggingItem.id) return job;

        const status: OfferDecisionStatus = details.status;

        const nextAcceptedDate =
          status === "accepted"
            ? details.offerAcceptedDate || job.offerAcceptedDate
            : undefined;

        const nextDeclinedDate =
          status === "declined"
            ? details.offerDeclinedDate || job.offerDeclinedDate
            : undefined;

        return {
          ...job,
          offerAcceptedDate: nextAcceptedDate,
          offerDeclinedDate: nextDeclinedDate,
          taken: Boolean(nextAcceptedDate),
        };
      });

      persist(next);
      return next;
    });

    closeTagDialog();
  };

  const handleOfferCreated = (details: AcceptedDetails) => {
    setItems((prev) => {
      // Edit existing card
      if (editingItem) {
        const next = prev.map((job) => {
          if (job.id !== editingItem.id) return job;

          const nextOfferReceived =
            details.offerReceivedDate ??
            details.decisionDate ??
            job.offerReceivedDate ??
            job.decisionDate;

          const nextOfferAccepted =
            details.offerAcceptedDate ?? job.offerAcceptedDate;

          // If accepted date is set via edit dialog, clear declined.
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
              details.notes !== undefined &&
              details.notes !== ""
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
      }

      // Add new card
      const newOfferReceived =
        details.offerReceivedDate ?? details.decisionDate;

      const newOfferAccepted = details.offerAcceptedDate;

      const newItem: OfferReceivedJob = {
        id: `received-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
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

      const next = [newItem, ...prev];
      persist(next);
      return next;
    });
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
    <section
      className={[
        "relative rounded-2xl border border-neutral-200/70",
        "bg-gradient-to-br from-emerald-50 via-white to-lime-50",
        "p-8 shadow-md overflow-hidden",
      ].join(" ")}
    >
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
            "grid grid-cols-3 gap-0 rounded-xl border border-neutral-200 bg-white/80 p-2",
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
        onDelete={handleDelete}
      />
    </section>
  );
}
