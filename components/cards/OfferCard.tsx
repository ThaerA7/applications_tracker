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
  Pencil,
  BadgeCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export type OfferReceivedJob = {
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
   * When you received the offer.
   * If missing, we fall back to `decisionDate` during normalization.
   */
  offerReceivedDate?: string;

  /** When you accepted the offer. */
  offerAcceptedDate?: string;

  /** When you declined the offer. */
  offerDeclinedDate?: string;

  /**
   * Legacy boolean.
   * Backwards compatible: missing => treated as not taken.
   */
  taken?: boolean;
};

export type OffersReceivedView = "received" | "declined" | "accepted";

export const isAcceptedOffer = (i: OfferReceivedJob) =>
  Boolean(i.offerAcceptedDate) || Boolean(i.taken);

export const isDeclinedOffer = (i: OfferReceivedJob) =>
  Boolean(i.offerDeclinedDate);

export const isPendingOffer = (i: OfferReceivedJob) =>
  !isAcceptedOffer(i) && !isDeclinedOffer(i);

type OffersReceivedCardsProps = {
  items: OfferReceivedJob[];
  view: OffersReceivedView;
  onTagStatus: (job: OfferReceivedJob) => void;
  onEdit: (job: OfferReceivedJob) => void;
  onDelete: (id: string) => void;
};

export default function OffersReceivedCards({
  items,
  view,
  onTagStatus,
  onEdit,
  onDelete,
}: OffersReceivedCardsProps) {
  const hasItemsInCurrentView = items.length > 0;

  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
      {items.map((item) => {
        const accepted = isAcceptedOffer(item);
        const declined = isDeclinedOffer(item);

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
            {/* BODY */}
            <div className="relative flex-1 px-5 pt-4 pb-5">
              {/* BIG STATUS STAMP (overlay, does NOT affect layout) */}
              {(accepted || declined) && (
                <div
                  className="pointer-events-none absolute right-5 top-[62%] -translate-y-1/2 rotate-[-12deg] z-0"
                  aria-hidden="true"
                >
                  <div
                    className={[
                      "select-none",
                      "rounded-lg border-[5px] px-3.5 py-2.5",
                      "text-[24px] sm:text-[28px] font-extrabold uppercase tracking-[0.28em]",
                      "shadow-[0_0_0_2px_rgba(255,255,255,0.6),_0_10px_24px_rgba(0,0,0,0.06)]",
                      "backdrop-blur-sm",
                      // watermark feel so it won't visually "compete" with fields
                      "opacity-20",
                      "mix-blend-multiply",
                      accepted
                        ? "border-emerald-500/70 text-emerald-700 bg-emerald-50/60"
                        : "border-rose-500/70 text-rose-700 bg-rose-50/60",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2">
                      {accepted ? (
                        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-7 w-7" aria-hidden="true" />
                      )}
                      <span>{accepted ? "Accepted" : "Declined"}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* header */}
              <div className="relative z-10 flex items-start gap-3 pr-20 sm:pr-24">
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
                </div>

                {/* Actions */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                  <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
                    <button
                      type="button"
                      onClick={() => onTagStatus(item)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                      aria-label="Tag offer status"
                      title="Tag status"
                    >
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                      aria-label="Edit offer received"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                      aria-label="Delete offer received"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="relative z-10 mt-3 h-px w-full bg-emerald-100/80"
                role="separator"
                aria-hidden="true"
              />

              {/* meta */}
              <dl className="relative z-10 mt-4 space-y-2 text-sm">
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

                {item.offerDeclinedDate && !item.offerAcceptedDate && (
                  <div className="flex items-center gap-2">
                    <XCircle
                      className="h-4 w-4 text-rose-600"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-xs text-neutral-500">
                        Offer declined on
                      </dt>
                      <dd className="font-medium text-neutral-900">
                        {item.offerDeclinedDate}
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
                <p className="relative z-10 mt-3 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 px-3 py-2 text-xs text-neutral-800">
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
            {view === "received" && "🎉"}
            {view === "accepted" && "✍️"}
            {view === "declined" && "❌"}
          </div>

          {view === "received" && (
            <>
              <p className="text-sm text-neutral-800 font-medium">
                No pending offers right now.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                When a company sends you a contract offer, add it here.
              </p>
            </>
          )}

          {view === "accepted" && (
            <>
              <p className="text-sm text-neutral-800 font-medium">
                You haven&apos;t marked an offer as accepted yet.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                This tab is for the offer you decide to take.
              </p>
            </>
          )}

          {view === "declined" && (
            <>
              <p className="text-sm text-neutral-800 font-medium">
                No declined offers yet.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                If you turn down an offer, tag it as declined so you can
                track your choices.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
