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
  AlertCircle,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { EMPLOYMENT_OPTIONS } from "@/lib/constants";

export type RejectionType =
  | "no-interview"
  | "after-phone-screening"
  | "after-first-interview"
  | "after-second-interview";

export type RejectionDetails = {
  // Kept for compatibility (derived from rejectionType).
  reason: string;

  company: string;
  role: string;
  appliedDate?: string;
  decisionDate: string;
  rejectionType: RejectionType;
  phoneScreenDate?: string;
  firstInterviewDate?: string;
  secondInterviewDate?: string;
  employmentType?: string;
  location?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  url?: string;
  logoUrl?: string;
  notes?: string;
};

type MoveToRejectedDialogProps = {
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
    decisionDate?: string;
    rejectionType?: RejectionType;
    phoneScreenDate?: string;
    firstInterviewDate?: string;
    secondInterviewDate?: string;
  } | null;
  onRejectionCreated?: (details: RejectionDetails) => void;
  /**
   * Controls copy & intent:
   * - "move": from Applications page ("Move to rejected")
   * - "add": manual add from /rejected ("Add rejected application")
   * - "edit": edit existing rejected record
   */
  mode?: "move" | "add" | "edit";
};

type FormState = {
  company: string;
  role: string;
  logoUrl: string;
  appliedDate: string;
  decisionDate: string;
  rejectionType: RejectionType;
  phoneScreenDate: string;
  firstInterviewDate: string;
  secondInterviewDate: string;
  employmentType: string;
  location: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  url: string;
  notes: string;
};

const REJECTION_OPTIONS: {
  value: RejectionType;
  label: string;
  description: string;
}[] = [
  {
    value: "no-interview",
    label: "No interview",
    description: "Rejected after application without any interview.",
  },
  {
    value: "after-phone-screening",
    label: "After phone screening",
    description: "Rejected after an initial phone screening.",
  },
  {
    value: "after-first-interview",
    label: "After first interview",
    description: "Rejected after the first main interview round.",
  },
  {
    value: "after-second-interview",
    label: "After 2nd interview",
    description: "Rejected after the second interview round.",
  },
];

function todayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function labelForRejectionType(t: RejectionType) {
  return REJECTION_OPTIONS.find((o) => o.value === t)?.label ?? "Rejected";
}

function makeInitialForm(app: MoveToRejectedDialogProps["application"]): FormState {
  const today = todayISO();

  return {
    company: app?.company ?? "",
    role: app?.role ?? "",
    logoUrl: app?.logoUrl ?? "",
    appliedDate: app?.appliedOn ?? today,
    decisionDate: app?.decisionDate ?? today,
    rejectionType: app?.rejectionType ?? "no-interview",
    phoneScreenDate: app?.phoneScreenDate ?? "",
    firstInterviewDate: app?.firstInterviewDate ?? "",
    secondInterviewDate: app?.secondInterviewDate ?? "",
    employmentType: app?.employmentType ?? "",
    location: app?.location ?? "",
    contactName: app?.contactPerson ?? "",
    contactEmail: app?.contactEmail ?? "",
    contactPhone: app?.contactPhone ?? "",
    url: app?.offerUrl ?? "",
    notes: app?.notes ?? "",
  };
}

export default function MoveToRejectedDialog({
  open,
  onClose,
  application = null,
  onRejectionCreated,
  mode = "move",
}: MoveToRejectedDialogProps) {
  const [form, setForm] = useState<FormState>(() => makeInitialForm(null));
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const isAddMode = mode === "add";
  const isEditMode = mode === "edit";

  const title = isEditMode
    ? "Edit rejected application"
    : isAddMode
      ? "Add rejected application"
      : "Move to the rejected section";

  const description = isEditMode
    ? "Update the details of this rejected application."
    : isAddMode
      ? "Record an application that ended in rejection."
      : "Capture how and when this application was rejected.";

  const submitLabel = isEditMode
    ? "Save changes"
    : isAddMode
      ? "Save rejected application"
      : "Save & move to rejected";

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

  const handleChange =
    (field: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { value } = e.target;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const company = form.company.trim();
    const role = form.role.trim();
    const decisionDate = form.decisionDate.trim();

    if (!company || !role || !decisionDate) return;

    const appliedDate = form.appliedDate.trim();
    const phoneScreenDate = form.phoneScreenDate.trim();
    const firstInterviewDate = form.firstInterviewDate.trim();
    const secondInterviewDate = form.secondInterviewDate.trim();
    const employmentType = form.employmentType.trim();
    const location = form.location.trim();
    const contactName = form.contactName.trim();
    const contactEmail = form.contactEmail.trim();
    const contactPhone = form.contactPhone.trim();
    const url = form.url.trim();
    const notes = form.notes.trim();

    const details: RejectionDetails = {
      company,
      role,
      decisionDate,
      rejectionType: form.rejectionType,
      reason: labelForRejectionType(form.rejectionType), // Always populate `reason` for compatibility.
      logoUrl: form.logoUrl.trim() || undefined,
    };

    if (appliedDate) details.appliedDate = appliedDate;
    if (phoneScreenDate) details.phoneScreenDate = phoneScreenDate;
    if (firstInterviewDate) details.firstInterviewDate = firstInterviewDate;
    if (secondInterviewDate) details.secondInterviewDate = secondInterviewDate;
    if (employmentType) details.employmentType = employmentType;
    if (location) details.location = location;
    if (contactName) details.contactName = contactName;
    if (contactEmail) details.contactEmail = contactEmail;
    if (contactPhone) details.contactPhone = contactPhone;
    if (url) details.url = url;
    if (notes) details.notes = notes;

    onRejectionCreated?.(details);
    onClose();
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const canSubmit =
    form.company.trim().length > 0 &&
    form.role.trim().length > 0 &&
    form.decisionDate.trim().length > 0;

  const dialog = (
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[12500] flex items-center justify-center px-4 py-8">
      {/* Backdrop with rose tint */}
      <div
        className="absolute inset-0 bg-rose-950/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-to-rejected-title"
        className={[
          "relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200/80",
          "bg-gradient-to-br from-rose-50 via-white to-pink-50 shadow-md",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* soft rose/pink blobs like the page */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-pink-400/20 blur-3xl" />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between border-b border-neutral-200/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <img
              src="/icons/cancel.png"
              alt="Rejected"
              className="h-9 w-9 md:h-10 md:w-10 object-contain"
            />

            <div>
              <h2
                id="move-to-rejected-title"
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
              "border border-neutral-200",
              "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
              "text-neutral-500 shadow-sm hover:bg-white",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300",
            ].join(" ")}
            aria-label="Close rejected dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Application summary (optional) */}
        {application && (
          <div className="relative z-10 px-5 pt-4">
            <div className="rounded-xl border border-rose-100/80 bg-white/80 p-3 text-xs text-neutral-800 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-rose-100 bg-rose-50 text-rose-600">
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
                    <div className="text-neutral-600">{application.company}</div>
                  </div>
                </div>
              </div>

              {(application.location || application.appliedOn) && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
                  {application.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                      {application.location}
                    </span>
                  )}
                  {application.appliedOn && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
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
          className="relative z-10 max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4"
        >
          {/* Basic job info */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Company name<span className="text-rose-500">*</span>
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
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
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
                Role / position<span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                value={form.role}
                onChange={handleChange("role")}
                placeholder="Frontend Engineer"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
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
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                />
              </div>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Decision date<span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={form.decisionDate}
                  onChange={handleChange("decisionDate")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  required
                />
              </div>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">Employment type</span>
              <div className="relative">
                <Briefcase
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <select
                  value={form.employmentType}
                  onChange={handleChange("employmentType")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
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
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                />
              </div>
            </label>
          </div>

          {/* Rejection details & timeline */}
          <div className="space-y-3 rounded-xl border border-neutral-200/80 bg-white/80 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />
              <div className="text-sm font-medium text-neutral-900">Rejection details</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium text-neutral-800">
                  Type of rejection<span className="text-rose-500">*</span>
                </span>
                <select
                  value={form.rejectionType}
                  onChange={handleChange("rejectionType")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  required
                >
                  {REJECTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-neutral-500">
                  This helps you remember at which stage the process ended.
                </p>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-neutral-800">Phone screening date</span>
                <div className="relative">
                  <CalendarDays
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    type="date"
                    value={form.phoneScreenDate}
                    onChange={handleChange("phoneScreenDate")}
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-neutral-800">First interview date</span>
                <div className="relative">
                  <CalendarDays
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    type="date"
                    value={form.firstInterviewDate}
                    onChange={handleChange("firstInterviewDate")}
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-neutral-800">2nd interview date</span>
                <div className="relative">
                  <CalendarDays
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    type="date"
                    value={form.secondInterviewDate}
                    onChange={handleChange("secondInterviewDate")}
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Contact & job posting */}
          <div className="space-y-3 rounded-xl border border-neutral-200/80 bg-white/80 p-4">
            <div className="text-sm font-medium text-neutral-900">Contact & job posting</div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-neutral-800">Contact name</span>
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
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-neutral-800">Contact email</span>
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
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-neutral-800">Contact phone</span>
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
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
              </label>

              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium text-neutral-800">Job posting URL</span>
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
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
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
                    placeholder="Anything you want to remember about this rejection (feedback, feelings, lessons, etc.)"
                    className="w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 pt-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Optional, but useful later to spot patterns and improve.
                </p>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-end gap-3 border-t border-neutral-200/70 pt-3">
            <button
              type="button"
              onClick={onClose}
              className={[
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-neutral-800",
                "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-300",
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
                  ? "bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-300"
                  : "cursor-not-allowed bg-rose-500/60 text-white/70",
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
