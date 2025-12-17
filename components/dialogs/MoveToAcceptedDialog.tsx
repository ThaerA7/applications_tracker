"use client";

import { useEffect, useState, type FC, type FormEvent } from "react";
import {
  CalendarDays,
  MapPin,
  X,
  Briefcase,
  FileText,
  Trophy,
  Link as LinkIcon,
  CheckCircle2,
} from "lucide-react";

export type AcceptedDetails = {
  company: string;
  role: string;
  location?: string;
  appliedOn?: string;
  employmentType?: string;

  /**
   * Legacy field kept for compatibility.
   * We will also set this to offerReceivedDate on submit.
   */
  decisionDate?: string;

  /** Date the offer was received. */
  offerReceivedDate?: string;

  /** Date the offer was accepted. */
  offerAcceptedDate?: string;

  startDate?: string;
  salary?: string;
  url?: string;
  logoUrl?: string;
  notes?: string;
};

type MoveToAcceptedDialogMode = "move" | "add" | "edit";

type MoveToAcceptedDialogProps = {
  open: boolean;
  onClose: () => void;
  application?:
    | {
        id: string;
        company: string;
        role?: string;
        location?: string;
        status?: string;
        appliedOn?: string;
        employmentType?: string;
        offerUrl?: string;
        logoUrl?: string;
        notes?: string;

        decisionDate?: string;
        offerReceivedDate?: string;
        offerAcceptedDate?: string;
      }
    | null;
  onAcceptedCreated: (details: AcceptedDetails) => void;
  mode?: MoveToAcceptedDialogMode;
};

const EMPLOYMENT_OPTIONS: string[] = [
  "Full-time",
  "Part-time",
  "Internship",
  "Working student",
  "Contract",
  "Temporary",
  "Mini-job",
  "Freelance",
  "Ausbildung",
];

const MoveToAcceptedDialog: FC<MoveToAcceptedDialogProps> = ({
  open,
  onClose,
  application = null,
  onAcceptedCreated,
  mode = "move",
}) => {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [appliedOn, setAppliedOn] = useState("");
  const [employmentType, setEmploymentType] = useState("");

  const [offerReceivedDate, setOfferReceivedDate] = useState("");
  const [offerAcceptedDate, setOfferAcceptedDate] = useState("");

  const [startDate, setStartDate] = useState("");
  const [salary, setSalary] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayIso = `${yyyy}-${mm}-${dd}`;

    if (application) {
      setCompany(application.company ?? "");
      setRole(application.role ?? "");
      setLocation(application.location ?? "");
      setAppliedOn(application.appliedOn ?? "");
      setEmploymentType(application.employmentType ?? "");
      setUrl(application.offerUrl ?? "");
      setNotes(application.notes ?? "");

      const received = application.offerReceivedDate ?? application.decisionDate ?? "";

      setOfferReceivedDate(received);
      setOfferAcceptedDate(application.offerAcceptedDate ?? "");
    } else {
      setCompany("");
      setRole("");
      setLocation("");
      setAppliedOn("");
      setEmploymentType("");
      setUrl("");
      setNotes("");

      setOfferReceivedDate(todayIso);
      setOfferAcceptedDate("");
    }

    setStartDate("");
    setSalary("");
  }, [open, application]);

  if (!open) return null;
  if (mode === "move" && !application) return null;

  const canSubmit = company.trim().length > 0 && role.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const receivedClean = offerReceivedDate.trim() || undefined;
    const acceptedClean = offerAcceptedDate.trim() || undefined;

    onAcceptedCreated({
      company: company.trim(),
      role: role.trim(),
      location: location.trim() || undefined,
      appliedOn: appliedOn.trim() || undefined,
      employmentType: employmentType.trim() || undefined,

      offerReceivedDate: receivedClean,
      decisionDate: receivedClean,
      offerAcceptedDate: acceptedClean,

      startDate: startDate.trim() || undefined,
      salary: salary.trim() || undefined,
      url: url.trim() || application?.offerUrl || undefined,
      logoUrl: application?.logoUrl,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const isAddMode = mode === "add";
  const isEditMode = mode === "edit";

  const title = isEditMode ? "Edit offer" : isAddMode ? "Add offer" : "Move offer";

  const description = isEditMode
    ? "Update the details of this offer."
    : isAddMode
    ? "Manually add an offer you received."
    : "Capture the final offer details and celebrate this win.";

  const submitLabel = isEditMode ? "Save changes" : isAddMode ? "Add offer" : "Move offer";

  return (
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[12000] flex items-center justify-center px-4 py-8">
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
        aria-labelledby="move-to-accepted-title"
        className={[
          "relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-emerald-200/80",
          "bg-gradient-to-br from-emerald-50 via-white to-lime-50 shadow-2xl backdrop-blur-sm",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* soft blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-lime-400/20 blur-3xl" />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between border-b border-emerald-100/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <img
              src="/icons/accepted.png"
              alt="Offer icon"
              className="h-9 w-9 md:h-10 md:w-10 object-contain"
            />
            <div>
              <h2
                id="move-to-accepted-title"
                className="text-sm font-semibold text-neutral-900"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-neutral-600">{description}</p>
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

        {/* Summary - only when we have an originating application */}
        {!isAddMode && application && (
          <div className="relative z-10 px-5 pt-4">
            <div className="rounded-xl border border-emerald-100/80 bg-white/90 p-3 text-xs text-neutral-800 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-neutral-900">
                    {application.role || "Role not set"}
                  </div>
                  <div className="text-neutral-600">{application.company}</div>
                </div>
                {application.status && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Offer</span>
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
                {application.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin
                      className="h-3.5 w-3.5 text-neutral-400"
                      aria-hidden="true"
                    />
                    {application.location}
                  </span>
                )}
                {application.appliedOn && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays
                      className="h-3.5 w-3.5 text-neutral-400"
                      aria-hidden="true"
                    />
                    Applied on {application.appliedOn}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="relative z-10 max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {/* Company & role (required) */}
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Company name<span className="text-emerald-500">*</span>
              </span>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme GmbH"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                required
              />
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Role / position<span className="text-emerald-500">*</span>
              </span>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Frontend Engineer"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                required
              />
            </label>

            {/* Location */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">Location</span>
              <div className="relative">
                <MapPin
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Berlin / Remote"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                />
              </div>
            </label>

            {/* Employment type */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">Employment type</span>
              <div className="relative">
                <Briefcase
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                >
                  <option value="">Select type…</option>
                  {EMPLOYMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            {/* Offer received date */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Offer received date
              </span>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={offerReceivedDate}
                  onChange={(e) => setOfferReceivedDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                />
              </div>
            </label>

            {/* Offer accepted date */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Offer accepted date
              </span>
              <div className="relative">
                <CheckCircle2
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={offerAcceptedDate}
                  onChange={(e) => setOfferAcceptedDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                />
              </div>
            </label>

            {/* Start date */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">Start date</span>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                />
              </div>
            </label>

            {/* Applied on */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">Applied on</span>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={appliedOn}
                  onChange={(e) => setAppliedOn(e.target.value)}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                />
              </div>
            </label>

            {/* Salary */}
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Salary / compensation
              </span>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. €65,000 / year, €3,000 gross / month…"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
              />
            </label>

            {/* Offer URL */}
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Offer / job URL
              </span>
              <div className="relative">
                <LinkIcon
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://company.example/job-offer-or-contract"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                />
              </div>
            </label>

            {/* Notes */}
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">Notes</span>
              <div className="relative">
                <FileText
                  className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400"
                  aria-hidden="true"
                />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything you want to remember about this offer (perks, probation, relocation, etc.)"
                  className="w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 pt-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                />
              </div>
            </label>
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-end gap-3 border-t border-emerald-100/80 pt-3">
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
              disabled={!canSubmit}
              className={[
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow-sm",
                canSubmit
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "cursor-not-allowed bg-emerald-500/60 text-white/70",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300",
              ].join(" ")}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MoveToAcceptedDialog;
