// app/offers-received/page.tsx
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
  Calendar,
  CalendarDays,
  MapPin,
  ExternalLink,
  Briefcase,
  Trash2,
  Plus,
  Pencil,
  CheckCircle2,
  BadgeCheck,
} from "lucide-react";

import MoveToAcceptedDialog, {
  type AcceptedDetails,
} from "../../components/dialogs/MoveToAcceptedDialog";
import OfferAcceptanceTagDialog, {
  type OfferAcceptanceTagDetails,
} from "../../components/dialogs/OfferAcceptanceTagDialog";

type OfferReceivedJob = {
  id: string;
  company: string;
  role: string;
  location?: string;
  startDate?: string;
  salary?: string;
  url?: string;
  logoUrl?: string;
  notes?: string;

  // meta fields
  appliedOn?: string;
  employmentType?: string;

  /**
   * Legacy-ish field previously used as a "company decision date".
   * Kept for backwards compatibility.
   */
  decisionDate?: string;

  /**
   * ✅ NEW:
   * When you actually received the offer.
   * If missing, we fallback to decisionDate during normalization.
   */
  offerReceivedDate?: string;

  /**
   * ✅ NEW:
   * When you accepted the offer.
   * If present, this card will appear in the "Taken" toggle.
   */
  offerAcceptedDate?: string;

  /**
   * Legacy boolean.
   * Backwards compatible: missing => treated as not taken.
   */
  taken?: boolean;
};

// ✅ new key
const OFFERS_RECEIVED_STORAGE_KEY = "job-tracker:offers-received";
// ✅ legacy key (for migration)
const LEGACY_ACCEPTED_STORAGE_KEY = "job-tracker:accepted";

type OffersReceivedView = "received" | "taken";

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
    id: "taken",
    label: "Offer you accepted",
    shortLabel: "Taken",
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
];

const isTakenOffer = (i: OfferReceivedJob) =>
  Boolean(i.offerAcceptedDate) || Boolean(i.taken);

const normalizeOffers = (list: OfferReceivedJob[]) => {
  return list.map((j) => {
    const offerReceivedDate =
      j.offerReceivedDate ?? j.decisionDate ?? undefined;

    const offerAcceptedDate =
      j.offerAcceptedDate && j.offerAcceptedDate.trim() !== ""
        ? j.offerAcceptedDate
        : undefined;

    const taken = offerAcceptedDate ? true : Boolean(j.taken);

    return {
      ...j,
      offerReceivedDate,
      offerAcceptedDate,
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

        const nextAcceptedDate = details.accepted
          ? details.offerAcceptedDate || job.offerAcceptedDate
          : undefined;

        return {
          ...job,
          offerAcceptedDate: nextAcceptedDate,
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
    if (view === "taken") {
      return items.filter(isTakenOffer);
    }
    return items.filter((i) => !isTakenOffer(i));
  }, [items, view]);

  const hasItemsInCurrentView = filteredItems.length > 0;

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

      {/* Tag accepted dialog */}
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
              className="shrink-0"
            />
            <span>Offers Received</span>
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
            "grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 bg-white/80 p-1",
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
                  "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition",
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-neutral-700 hover:bg-neutral-50",
                ].join(" ")}
                aria-pressed={active}
                role="tab"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{option.label}</span>
                <span className="sm:hidden">{option.shortLabel}</span>
              </button>
            );
          })}

          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-pink-500 via-orange-400 to-amber-300"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-pink-500 via-orange-400 to-amber-300"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* cards grid */}
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
        {filteredItems.map((item) => {
          const taken = isTakenOffer(item);

          return (
            <article
              key={item.id}
              className={[
                "group relative flex h-full flex-col rounded-xl border border-emerald-100",
                "bg-white/80 shadow-sm transition-all",
                "hover:-translate-y-0.5 hover:shadow-md",
                "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl",
                "before:bg-gradient-to-b before:from-pink-500 before:via-orange-400 before:to-amber-300",
                "before:opacity-90",
              ].join(" ")}
            >
              <div className="flex-1 px-5 pt-4 pb-5">
                {/* header */}
                <div className="relative flex items-start gap-3 pr-20 sm:pr-24">
                  {item.logoUrl ? (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ring-1 ring-white/60">
                      <Image
                        src={item.logoUrl}
                        alt={`${item.company} logo`}
                        fill
                        sizes="40px"
                        className="object-contain p-1.5"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-emerald-50 text-emerald-600">
                      <Trophy className="h-5 w-5" aria-hidden="true" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2 className="max-w-full truncate text-sm font-semibold text-neutral-900">
                      {item.company}
                    </h2>
                    <p className="mt-0.5 text-sm text-neutral-700">
                      {item.role}
                    </p>

                    {taken && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        Accepted
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
                      <button
                        type="button"
                        onClick={() => openTagDialog(item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                        aria-label="Tag offer as accepted or not"
                        title="Tag accepted"
                      >
                        <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                        aria-label="Edit offer received"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                        aria-label="Delete offer received"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className="mt-3 h-px w-full bg-emerald-100/80"
                  role="separator"
                  aria-hidden="true"
                />

                {/* meta */}
                <dl className="mt-4 space-y-2 text-sm">
                  {item.appliedOn && (
                    <div className="flex items-center gap-2">
                      <CalendarDays
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                      <div>
                        <dt className="text-xs text-neutral-500">
                          Applied on
                        </dt>
                        <dd className="font-medium text-neutral-900">
                          {item.appliedOn}
                        </dd>
                      </div>
                    </div>
                  )}

                  {(item.offerReceivedDate || item.decisionDate) && (
                    <div className="flex items-center gap-2">
                      <Calendar
                        className="h-4 w-4 text-emerald-500"
                        aria-hidden="true"
                      />
                      <div>
                        <dt className="text-xs text-neutral-500">
                          Offer received on
                        </dt>
                        <dd className="font-medium text-neutral-900">
                          {item.offerReceivedDate ?? item.decisionDate}
                        </dd>
                      </div>
                    </div>
                  )}

                  {item.offerAcceptedDate && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className="h-4 w-4 text-emerald-600"
                        aria-hidden="true"
                      />
                      <div>
                        <dt className="text-xs text-neutral-500">
                          Offer accepted on
                        </dt>
                        <dd className="font-medium text-neutral-900">
                          {item.offerAcceptedDate}
                        </dd>
                      </div>
                    </div>
                  )}

                  {item.startDate && (
                    <div className="flex items-center gap-2">
                      <Calendar
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                      <div>
                        <dt className="text-xs text-neutral-500">
                          Start date
                        </dt>
                        <dd className="font-medium text-neutral-900">
                          {item.startDate}
                        </dd>
                      </div>
                    </div>
                  )}

                  {item.employmentType && (
                    <div className="flex items-center gap-2">
                      <Briefcase
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                      <div>
                        <dt className="text-xs text-neutral-500">
                          Employment type
                        </dt>
                        <dd className="font-medium text-neutral-900">
                          {item.employmentType}
                        </dd>
                      </div>
                    </div>
                  )}

                  {item.location && (
                    <div className="flex items-center gap-2">
                      <MapPin
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                      <div>
                        <dt className="text-xs text-neutral-500">
                          Location
                        </dt>
                        <dd className="font-medium text-neutral-900">
                          {item.location}
                        </dd>
                      </div>
                    </div>
                  )}

                  {item.salary && (
                    <div className="flex items-center gap-2">
                      <Trophy
                        className="h-4 w-4 text-amber-500"
                        aria-hidden="true"
                      />
                      <div>
                        <dt className="text-xs text-neutral-500">
                          Compensation (approx.)
                        </dt>
                        <dd className="font-medium text-neutral-900">
                          {item.salary}
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>

                {item.notes && (
                  <p className="mt-3 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 px-3 py-2 text-xs text-neutral-800">
                    {item.notes}
                  </p>
                )}
              </div>

              {/* footer */}
              <div className="border-t border-emerald-100 bg-emerald-50/60 px-5 py-2.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-emerald-900 flex items-center gap-1.5">
                  <PartyPopper className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Well done. You earned this. ✨</span>
                </p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:underline decoration-emerald-300 underline-offset-2"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    <span>View offer</span>
                  </a>
                )}
              </div>
            </article>
          );
        })}

        {!hasItemsInCurrentView && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-white/80 p-10 text-center backdrop-blur">
            <div className="mb-2 text-5xl">
              {view === "received" ? "🎉" : "✅"}
            </div>

            {view === "received" ? (
              <>
                <p className="text-sm text-neutral-800 font-medium">
                  No offers received yet.
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  When a company sends you a contract offer, add it here.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-800 font-medium">
                  You haven&apos;t marked an offer as taken yet.
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  This tab is for the one you decide to accept.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
