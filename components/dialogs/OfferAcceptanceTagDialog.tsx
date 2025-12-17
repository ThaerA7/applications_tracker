"use client";

import { useEffect, useMemo, useState, type FC, type FormEvent } from "react";
import {
  X,
  CheckCircle2,
  Circle,
  CalendarDays,
  XCircle,
} from "lucide-react";

type OfferReceivedJobLite = {
  id: string;
  company: string;
  role: string;
  offerAcceptedDate?: string;
  offerDeclinedDate?: string;
};

export type OfferDecisionStatus = "received" | "accepted" | "declined";

export type OfferAcceptanceTagDetails = {
  status: OfferDecisionStatus;
  offerAcceptedDate?: string;
  offerDeclinedDate?: string;
};

type OfferAcceptanceTagDialogProps = {
  open: boolean;
  onClose: () => void;
  offer: OfferReceivedJobLite | null;
  onSave: (details: OfferAcceptanceTagDetails) => void;
};

const OfferAcceptanceTagDialog: FC<OfferAcceptanceTagDialogProps> = ({
  open,
  onClose,
  offer,
  onSave,
}) => {
  const [status, setStatus] = useState<OfferDecisionStatus>("received");
  const [offerAcceptedDate, setOfferAcceptedDate] = useState("");
  const [offerDeclinedDate, setOfferDeclinedDate] = useState("");

  const todayIso = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  useEffect(() => {
    if (!open) return;

    const initialStatus: OfferDecisionStatus = offer?.offerAcceptedDate
      ? "accepted"
      : offer?.offerDeclinedDate
      ? "declined"
      : "received";

    setStatus(initialStatus);
    setOfferAcceptedDate(offer?.offerAcceptedDate ?? "");
    setOfferDeclinedDate(offer?.offerDeclinedDate ?? "");
  }, [open, offer]);

  if (!open || !offer) return null;

  const handleStatusChange = (next: OfferDecisionStatus) => {
    setStatus(next);

    if (next === "accepted") {
      if (!offerAcceptedDate) setOfferAcceptedDate(todayIso);
      setOfferDeclinedDate("");
    }

    if (next === "declined") {
      if (!offerDeclinedDate) setOfferDeclinedDate(todayIso);
      setOfferAcceptedDate("");
    }

    if (next === "received") {
      setOfferAcceptedDate("");
      setOfferDeclinedDate("");
    }
  };

  const activeDate =
    status === "accepted"
      ? offerAcceptedDate
      : status === "declined"
      ? offerDeclinedDate
      : "";

  const handleDateChange = (value: string) => {
    if (status === "accepted") setOfferAcceptedDate(value);
    if (status === "declined") setOfferDeclinedDate(value);
  };

  const dateLabel =
    status === "accepted"
      ? "Offer accepted date"
      : status === "declined"
      ? "Offer declined date"
      : "Decision date";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    onSave({
      status,
      offerAcceptedDate:
        status === "accepted" ? offerAcceptedDate.trim() || todayIso : undefined,
      offerDeclinedDate:
        status === "declined" ? offerDeclinedDate.trim() || todayIso : undefined,
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[12050] flex items-center justify-center px-4 py-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-acceptance-tag-title"
        className={[
          "relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-200/80",
          "bg-gradient-to-br from-emerald-50 via-white to-lime-50 shadow-2xl backdrop-blur-sm",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* soft blobs */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-lime-400/20 blur-3xl" />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between border-b border-emerald-100/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <img
              src="/icons/check.png"
              alt="Offer status"
              className="h-9 w-9 md:h-10 md:w-10 object-contain"
            />
            <div>
              <h2
                id="offer-acceptance-tag-title"
                className="text-sm font-semibold text-neutral-900"
              >
                Tag offer status
              </h2>
              <p className="mt-0.5 text-xs text-neutral-600">
                Mark this offer as received, accepted, or declined and set the
                relevant date.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={[
              "inline-flex h-8 w-8 items-center justify-center rounded-full",
              "border border-neutral-200 bg-white/80 text-neutral-500 shadow-sm",
              "hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
            ].join(" ")}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="relative z-10 px-5 py-4">
          {/* Summary */}
          <div className="rounded-xl border border-emerald-100/80 bg-white/90 p-3 text-xs text-neutral-800 shadow-sm">
            <div className="font-medium text-neutral-900">{offer.role}</div>
            <div className="text-neutral-600">{offer.company}</div>
          </div>

          {/* 3-way toggle */}
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => handleStatusChange("received")}
              className={[
                "flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm shadow-sm transition",
                status === "received"
                  ? "border-emerald-200 bg-emerald-50/70"
                  : "border-neutral-200 bg-white/80 hover:bg-white",
              ].join(" ")}
              aria-pressed={status === "received"}
            >
              <Circle className="h-4 w-4 text-neutral-500" />
              <span className="font-medium text-neutral-900">Received</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange("accepted")}
              className={[
                "flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm shadow-sm transition",
                status === "accepted"
                  ? "border-emerald-200 bg-emerald-50/70"
                  : "border-neutral-200 bg-white/80 hover:bg-white",
              ].join(" ")}
              aria-pressed={status === "accepted"}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-neutral-900">Accepted</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange("declined")}
              className={[
                "flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm shadow-sm transition",
                status === "declined"
                  ? "border-rose-200 bg-rose-50/70"
                  : "border-neutral-200 bg-white/80 hover:bg-white",
              ].join(" ")}
              aria-pressed={status === "declined"}
            >
              <XCircle className="h-4 w-4 text-rose-600" />
              <span className="font-medium text-neutral-900">Declined</span>
            </button>
          </div>

          {/* Date */}
          
          <label className="mt-3 block space-y-1 text-sm">

            <span className="font-medium text-neutral-800">{dateLabel}</span>
            <div className="relative">
              <CalendarDays
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                type="date"
                value={activeDate}
                onChange={(e) => handleDateChange(e.target.value)}
                disabled={status === "received"}
                className={[
                  "h-9 w-full rounded-lg border px-3 pl-8 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2",
                  status !== "received"
                    ? "border-neutral-200 bg-white/80 text-neutral-900 focus:ring-emerald-300 focus:border-emerald-300"
                    : "border-neutral-200 bg-neutral-50 text-neutral-400 cursor-not-allowed",
                ].join(" ")}
              />
            </div>
          </label>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-end gap-3 border-t border-emerald-100/80 pt-3">
            <button
              type="button"
              onClick={onClose}
              className={[
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-neutral-800",
                "bg-white/80 border border-neutral-200 shadow-sm hover:bg-white",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300",
              ].join(" ")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={[
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow-sm",
                "bg-emerald-600 text-white hover:bg-emerald-500",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300",
              ].join(" ")}
            >
              Save status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfferAcceptanceTagDialog;
