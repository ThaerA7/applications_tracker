"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  MapPin,
  Phone,
  Mail,
  User2,
  Link as LinkIcon,
  X,
  Briefcase,
  Building2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import type { InterviewType } from "@/components/dialogs/ScheduleInterviewDialog";
import { EMPLOYMENT_OPTIONS } from "@/lib/constants";

export type WithdrawnReason =
  | "accepted-other-offer"
  | "salary-not-right"
  | "role-not-fit"
  | "location-commute"
  | "process-too-slow"
  | "personal-reasons"
  | "other";

export type WithdrawnDetails = {
  company: string;
  role: string;
  appliedDate?: string;
  withdrawnDate: string;
  reason: WithdrawnReason;
  employmentType?: string;
  location?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  url?: string;
  logoUrl?: string;
  notes?: string;
  /** Free-text detail when 'other' is selected as the reason */
  otherReasonText?: string;
  /** Interview type at the stage you withdrew (if applicable) */
  interviewType?: InterviewType;
};

type MoveToWithdrawnDialogProps = {
  open: boolean;
  onClose: () => void;
  application?: {
    id: string;
    company: string;
    role?: string;
    location?: string;
    status?: string;
    appliedOn?: string;
    employmentType?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    offerUrl?: string;
    logoUrl?: string;
    notes?: string;

    // for editing existing withdrawn entries
    withdrawnDate?: string;
    reason?: WithdrawnReason;
    otherReasonText?: string;

    // optional interview info / stage
    interviewDate?: string;
    interviewType?: InterviewType;
  } | null;
  /**
   * Called when the user submits the withdrawn form.
   * You can persist this data and/or move the application to /withdrawn.
   */
  onWithdrawnCreated?: (details: WithdrawnDetails) => void;
  /**
   * Controls the copy & intent:
   * - "move": from Applications page ("Move to withdrawn")
   * - "add": manual add from /withdrawn ("Add withdrawn application")
   * - "edit": edit existing withdrawn record
   */
  mode?: "move" | "add" | "edit";
};

type FormState = {
  company: string;
  role: string;
  logoUrl: string;
  appliedDate: string;
  withdrawnDate: string;
  reason: WithdrawnReason;
  employmentType: string;
  location: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  url: string;
  notes: string;
  otherReasonText: string;
  stage: "before-interview" | "phone" | "video" | "in-person";
};

const REASON_OPTIONS: {
  value: WithdrawnReason;
  label: string;
  description: string;
}[] = [
    {
      value: "accepted-other-offer",
      label: "Accepted another offer",
      description: "You chose another company or offer instead.",
    },
    {
      value: "salary-not-right",
      label: "Salary / conditions not right",
      description: "Compensation, benefits, or contract terms were not a fit.",
    },
    {
      value: "role-not-fit",
      label: "Role not a good fit",
      description: "Responsibilities, seniority, or tech stack didn’t match.",
    },
    {
      value: "location-commute",
      label: "Location / commute issues",
      description: "On-site requirements, relocation, or commute problems.",
    },
    {
      value: "process-too-slow",
      label: "Process took too long",
      description: "Hiring process or communication was too slow.",
    },
    {
      value: "personal-reasons",
      label: "Personal reasons",
      description: "Health, family, timing, or other personal factors.",
    },
    {
      value: "other",
      label: "Other",
      description: "Any other reason not listed above.",
    },
  ];

function todayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function makeInitialForm(
  app: MoveToWithdrawnDialogProps["application"]
): FormState {
  const today = todayISO();

  const stage: FormState["stage"] =
    app?.interviewType === "phone" ||
      app?.interviewType === "video" ||
      app?.interviewType === "in-person"
      ? app.interviewType
      : "before-interview";

  return {
    company: app?.company ?? "",
    role: app?.role ?? "",
    logoUrl: app?.logoUrl ?? "",
    appliedDate: app?.appliedOn ?? today,
    withdrawnDate: app?.withdrawnDate ?? today,
    reason: app?.reason ?? "personal-reasons",
    employmentType: app?.employmentType ?? "",
    location: app?.location ?? "",
    contactName: app?.contactPerson ?? "",
    contactEmail: app?.contactEmail ?? "",
    contactPhone: app?.contactPhone ?? "",
    url: app?.offerUrl ?? "",
    notes: app?.notes ?? "",
    otherReasonText: app?.otherReasonText ?? "",
    stage,
  };
}

export default function MoveToWithdrawnDialog({
  open,
  onClose,
  application = null,
  onWithdrawnCreated,
  mode = "move",
}: MoveToWithdrawnDialogProps) {
  const [form, setForm] = useState<FormState>(() => makeInitialForm(null));
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const isAddMode = mode === "add";
  const isEditMode = mode === "edit";

  const title = isEditMode
    ? "Edit withdrawn application"
    : isAddMode
      ? "Add withdrawn application"
      : "Move to the withdrawn section";

  const description = isEditMode
    ? "Update the details of this withdrawn application."
    : isAddMode
      ? "Record an application you previously withdrew from."
      : "Capture when and why you decided to withdraw.";

  const submitLabel = isEditMode
    ? "Save changes"
    : isAddMode
      ? "Save withdrawn application"
      : "Save & move to withdrawn";

  useEffect(() => {
    if (!open) return;
    setForm(makeInitialForm(application));
    setLogoError(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  }, [open, application]);

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      setLogoError(null);
      setForm((f) => ({ ...f, logoUrl: "" }));
      return;
    }

    const maxSizeBytes = 1 * 1024 * 1024; // 1 MB
    if (file.size > maxSizeBytes) {
      setLogoError("Logo must be smaller than 1 MB.");
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    setLogoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((f) => ({ ...f, logoUrl: result }));
      } else {
        setLogoError("Failed to read the image file.");
        if (logoInputRef.current) logoInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setLogoError("Failed to read the image file.");
      if (logoInputRef.current) logoInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const handleChange =
    (field: keyof FormState) =>
      (
        e:
          | ChangeEvent<HTMLInputElement>
          | ChangeEvent<HTMLSelectElement>
          | ChangeEvent<HTMLTextAreaElement>
      ) => {
        const { value } = e.target;
        setForm((prev) => ({ ...prev, [field]: value }));
      };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const company = form.company.trim();
    const role = form.role.trim();
    const withdrawnDate = form.withdrawnDate.trim();

    if (!company || !role || !withdrawnDate) {
      return;
    }

    const appliedDate = form.appliedDate.trim();
    const employmentType = form.employmentType.trim();
    const location = form.location.trim();
    const contactName = form.contactName.trim();
    const contactEmail = form.contactEmail.trim();
    const contactPhone = form.contactPhone.trim();
    const url = form.url.trim();
    const notes = form.notes.trim();
    const otherReasonText = form.otherReasonText.trim();

    let interviewType: InterviewType | undefined;
    if (
      form.stage === "phone" ||
      form.stage === "video" ||
      form.stage === "in-person"
    ) {
      interviewType = form.stage;
    }

    const details: WithdrawnDetails = {
      company,
      role,
      withdrawnDate,
      reason: form.reason,
      logoUrl: form.logoUrl.trim() || undefined,
    };

    if (appliedDate) details.appliedDate = appliedDate;
    if (employmentType) details.employmentType = employmentType;
    if (location) details.location = location;
    if (contactName) details.contactName = contactName;
    if (contactEmail) details.contactEmail = contactEmail;
    if (contactPhone) details.contactPhone = contactPhone;
    if (url) details.url = url;
    if (notes) details.notes = notes;
    if (form.reason === "other" && otherReasonText) {
      details.otherReasonText = otherReasonText;
    }
    if (interviewType) details.interviewType = interviewType;

    onWithdrawnCreated?.(details);
    onClose();
  };

  const canSubmit =
    form.company.trim().length > 0 &&
    form.role.trim().length > 0 &&
    form.withdrawnDate.trim().length > 0;

  const dialog = (
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[12500] flex items-center justify-center px-4 py-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-to-withdrawn-title"
        className={[
          "relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200/80",
          "bg-gradient-to-br from-amber-50 via-white to-emerald-50 shadow-2xl",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-200/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <img
              src="/icons/withdrawn.png"
              alt="Withdrawn"
              className="h-9 w-9 md:h-10 md:w-10 object-contain"
            />
            <div>
              <h2
                id="move-to-withdrawn-title"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/80 text-neutral-500 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            aria-label="Close withdrawn dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Application summary (optional) */}
        {application && (
          <div className="px-5 pt-4">
            <div className="rounded-xl border border-neutral-200/80 bg-white/90 p-3 text-xs text-neutral-800 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500 overflow-hidden">
                    {application.logoUrl ? (
                      <img
                        src={application.logoUrl}
                        alt={`${application.company} logo`}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <Building2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900">
                      {application.role || "Role not set"}
                    </div>
                    <div className="text-neutral-600">
                      {application.company}
                    </div>
                  </div>
                </div>
              </div>

              {(application.location || application.appliedOn) && (
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
                      Applied {application.appliedOn}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4"
        >
          {/* Basic job info */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Company name<span className="text-amber-500">*</span>
              </span>
              <div className="relative">
                <Briefcase
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={form.company}
                  onChange={handleChange("company")}
                  placeholder="Acme GmbH"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  required
                />
              </div>
            </label>

            {/* Company logo upload + preview */}
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">Company logo (optional)</span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-xs font-medium text-neutral-800 shadow-sm hover:bg-white">
                    <ImageIcon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                    <span>Upload logo (PNG, JPG, SVG. Max size 1 MB)</span>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="sr-only"
                    />
                  </label>
                  {logoError && (
                    <p className="mt-1 text-[11px] text-rose-600">{logoError}</p>
                  )}
                </div>

                {form.logoUrl?.trim() && (
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white/70">
                    <img
                      src={form.logoUrl}
                      alt={`${form.company || "Company"} logo`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Role / position<span className="text-amber-500">*</span>
              </span>
              <input
                type="text"
                value={form.role}
                onChange={handleChange("role")}
                placeholder="Frontend Engineer"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                required
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">Applied date</span>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={form.appliedDate}
                  onChange={handleChange("appliedDate")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </div>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Withdrawn date<span className="text-amber-500">*</span>
              </span>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={form.withdrawnDate}
                  onChange={handleChange("withdrawnDate")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  required
                />
              </div>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Employment type
              </span>
              <div className="relative">
                <Briefcase
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <select
                  value={form.employmentType}
                  onChange={handleChange("employmentType")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
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

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">Location</span>
              <div className="relative">
                <MapPin
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={form.location}
                  onChange={handleChange("location")}
                  placeholder="Berlin HQ / Remote"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </div>
            </label>
          </div>

          {/* Withdrawn details */}
          <div className="space-y-3 rounded-xl border border-neutral-200/80 bg-white/85 p-4">
            <div className="text-sm font-medium text-neutral-900">
              Withdrawn details
            </div>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Main reason<span className="text-amber-500">*</span>
              </span>
              <div className="relative">
                <select
                  value={form.reason}
                  onChange={handleChange("reason")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  required
                >
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                This helps you understand why you walked away from the
                application.
              </p>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Stage when you withdrew
              </span>
              <div className="relative">
                <select
                  value={form.stage}
                  onChange={handleChange("stage")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                >
                  <option value="before-interview">Before interview</option>
                  <option value="phone">
                    During interview – phone screening
                  </option>
                  <option value="video">
                    During interview – video call
                  </option>
                  <option value="in-person">
                    During interview – in person
                  </option>
                </select>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                This controls how the stage is shown on the withdrawn card.
              </p>
            </label>

            {form.reason === "other" && (
              <label className="space-y-1 text-sm">
                <span className="font-medium text-neutral-800">
                  Describe (optional)
                </span>
                <input
                  type="text"
                  value={form.otherReasonText}
                  onChange={handleChange("otherReasonText")}
                  placeholder="E.g. interview timing, company culture, specific concerns…"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </label>
            )}

            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/70 p-3 text-xs text-neutral-700">
              <span className="font-medium text-neutral-800">Tip: </span>
              Use this later to spot patterns (for example, always withdrawing
              for salary reasons or location).
            </div>
          </div>

          {/* Contact & job posting */}
          <div className="space-y-3 rounded-xl border border-neutral-200/80 bg-white/85 p-4">
            <div className="text-sm font-medium text-neutral-900">
              Contact & job posting
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-neutral-800">
                  Contact name
                </span>
                <div className="relative">
                  <User2
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={handleChange("contactName")}
                    placeholder="Julia Meyer"
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  />
                </div>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-neutral-800">
                  Contact email
                </span>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={handleChange("contactEmail")}
                    placeholder="recruiting@example.com"
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  />
                </div>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-neutral-800">
                  Contact phone
                </span>
                <div className="relative">
                  <Phone
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={handleChange("contactPhone")}
                    placeholder="+49 30 123456"
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  />
                </div>
              </label>

              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium text-neutral-800">
                  Job posting URL
                </span>
                <div className="relative">
                  <LinkIcon
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    type="url"
                    value={form.url}
                    onChange={handleChange("url")}
                    placeholder="https://jobs.example.com/frontend-engineer"
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  />
                </div>
              </label>

              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium text-neutral-800">Notes</span>
                <div className="relative">
                  <FileText
                    className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400"
                    aria-hidden="true"
                  />
                  <textarea
                    value={form.notes}
                    onChange={handleChange("notes")}
                    rows={3}
                    placeholder="Anything you want to remember about what they offered, what felt off, or anything you want to remember."
                    className="w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 pt-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  />
                </div>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Great for later reflection and spotting patterns across your
                  applications.
                </p>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-end gap-3 border-t border-neutral-200/70 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg:white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={[
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow-sm",
                canSubmit
                  ? "bg-amber-600 text-white hover:bg-amber-500 focus-visible:ring-amber-300"
                  : "cursor-not-allowed bg-neutral-200 text-neutral-500",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              ].join(" ")}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
