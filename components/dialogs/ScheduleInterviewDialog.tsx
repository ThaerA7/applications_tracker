"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  User2,
  Mail,
  Link as LinkIcon,
  X,
  Briefcase,
  Building2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

const INTERVIEWS_STORAGE_KEY = "job-tracker:interviews";

const INTERVIEWS_ACTIVITY_STORAGE_KEY = "job-tracker:interviews-activity";

type InterviewActivityItem = {
  id: string;
  appId: string;
  type: "added" | "edited";
  timestamp: string;
  company: string;
  role?: string;
  location?: string;
  appliedOn?: string;
  note?: string;
};

function appendInterviewActivity(item: InterviewActivityItem) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(INTERVIEWS_ACTIVITY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const prev: InterviewActivityItem[] = Array.isArray(parsed) ? parsed : [];
    const next = [item, ...prev].slice(0, 100);
    window.localStorage.setItem(
      INTERVIEWS_ACTIVITY_STORAGE_KEY,
      JSON.stringify(next)
    );
  } catch (err) {
    console.error("Failed to persist interview activity", err);
  }
}

export type InterviewType = "phone" | "video" | "in-person";

export type Interview = {
  id: string;
  company: string;
  role: string;
  location?: string;
  contact?: { name?: string; email?: string; phone?: string };
  date: string; // ISO-ish string, e.g. 2025-11-12T14:00
  type: InterviewType;
  url?: string;
  logoUrl?: string;
  appliedOn?: string; // YYYY-MM-DD from original application
  employmentType?: string;
  notes?: string;
};

type ScheduleInterviewDialogProps = {
  open: boolean;
  onClose: () => void;
  application: {
    id: string;
    company: string;
    role?: string;
    location?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    offerUrl?: string;
    logoUrl?: string;
    appliedOn?: string;
    employmentType?: string;
    notes?: string;
    interviewDateTimeIso?: string; // e.g. "2025-11-12T14:00"
    interviewType?: InterviewType;
  } | null;
  onInterviewCreated?: (interview: Interview) => void;
  mode?: "schedule" | "add" | "edit";
};

type FormState = {
  company: string;
  role: string;
  logoUrl: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: InterviewType;
  location: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  url: string;
  appliedDate: string; // YYYY-MM-DD
  employmentType: string;
  notes: string;
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
];

function makeInitialForm(
  app: ScheduleInterviewDialogProps["application"]
): FormState {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  const today = `${yyyy}-${mm}-${dd}`;
  const defaultTime = `${hh}:${min}`;

  // Prefer the existing interview date/time when editing.
  let date = today;
  let time = defaultTime;
  let type: InterviewType = "phone";

  if (app?.interviewDateTimeIso) {
    const [datePart, timePart] = app.interviewDateTimeIso.split("T");
    if (datePart) {
      date = datePart; // "YYYY-MM-DD"
    }
    if (timePart) {
      time = timePart.slice(0, 5); // "HH:mm"
    }
  }

  if (app?.interviewType) {
    type = app.interviewType;
  }

  return {
    company: app?.company ?? "",
    role: app?.role ?? "",
    logoUrl: app?.logoUrl ?? "",
    date,
    time,
    type,
    location: app?.location ?? "",
    contactName: app?.contactPerson ?? "",
    contactEmail: app?.contactEmail ?? "",
    contactPhone: app?.contactPhone ?? "",
    url: app?.offerUrl ?? "",
    appliedDate: app?.appliedOn ?? today,
    employmentType: app?.employmentType ?? "",
    notes: app?.notes ?? "",
  };
}

export default function ScheduleInterviewDialog({
  open,
  onClose,
  application,
  onInterviewCreated,
  mode = "schedule",
}: ScheduleInterviewDialogProps) {
  const [form, setForm] = useState<FormState>(() => makeInitialForm(null));
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const effectiveMode = mode ?? "schedule";

  const title =
    effectiveMode === "edit"
      ? "Edit interview"
      : effectiveMode === "add"
        ? "Add interview"
        : "Schedule interview";

  const description =
    effectiveMode === "edit"
      ? "Update the interview details and save your changes."
      : effectiveMode === "add"
        ? "Fill in the details to add a new interview."
        : "Confirm the details before moving this application to the interviews section.";

  const submitLabel =
    effectiveMode === "edit"
      ? "Save changes"
      : effectiveMode === "add"
        ? "Add interview"
        : "Save & move to interviews";

  // Reset form whenever dialog opens or application changes
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
      (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
      ) => {
        const { value } = e.target;
        setForm((prev) => ({ ...prev, [field]: value }));
      };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const company = form.company.trim();
    const role = form.role.trim();
    const date = form.date.trim();
    const time = form.time.trim();

    if (!company || !role || !date || !time) return;

    const iso = `${date}T${time}`;

    const contactName = form.contactName.trim();
    const contactEmail = form.contactEmail.trim();
    const contactPhone = form.contactPhone.trim();
    const appliedDate = form.appliedDate.trim() || undefined;
    const employmentType = form.employmentType.trim();
    const notes = form.notes.trim();

    const id =
      effectiveMode === "edit" && application?.id
        ? application.id
        : typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`;

    const interview: Interview = {
      id,
      company,
      role,
      location: form.location.trim() || undefined,
      contact:
        contactName || contactEmail || contactPhone
          ? {
            name: contactName || undefined,
            email: contactEmail || undefined,
            phone: contactPhone || undefined,
          }
          : undefined,
      date: iso,
      type: form.type,
      url: form.url.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      appliedOn: appliedDate,
      employmentType: employmentType || undefined,
      notes: notes || undefined,
    };

    // Persist to localStorage so /interviews page can read it
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(INTERVIEWS_STORAGE_KEY);
        let existing: Interview[] = [];
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            existing = parsed;
          }
        }
        // For edit, replace existing; for add, append
        const existingIndex = existing.findIndex((i) => i.id === interview.id);
        let next: Interview[];
        if (existingIndex >= 0) {
          next = [...existing];
          next[existingIndex] = interview;
        } else {
          next = [...existing, interview];
        }
        window.localStorage.setItem(
          INTERVIEWS_STORAGE_KEY,
          JSON.stringify(next)
        );
      }
    } catch (err) {
      console.error("Failed to persist interview to localStorage", err);
    }

    // If coming from the Applications page, also log activity
    if (effectiveMode === "schedule") {
      const activityId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`;

      appendInterviewActivity({
        id: activityId,
        appId: interview.id,
        type: "added",
        timestamp: new Date().toISOString(),
        company: interview.company,
        role: interview.role,
        location: interview.location,
        appliedOn: interview.appliedOn,
        note: "Interview scheduled from application",
      });
    }

    onInterviewCreated?.(interview);
    onClose();
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const canSubmit =
    form.company.trim().length > 0 &&
    form.role.trim().length > 0 &&
    form.date.trim().length > 0 &&
    form.time.trim().length > 0;

  const dialog = (
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[12500] flex items-center justify-center px-4 py-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-emerald-950/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-interview-title"
        className={[
          "relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200/80",
          "bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-md",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* soft emerald/teal blobs like on the page */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl" />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between border-b border-neutral-200/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <img
              src="/icons/calendar.png"
              alt="Schedule interview"
              className="h-9 w-9 md:h-10 md:w-10 object-contain"
            />
            <div>
              <h2
                id="schedule-interview-title"
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
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
            ].join(" ")}
            aria-label="Close schedule interview dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Application summary (optional) */}
        {application && (
          <div className="relative z-10 px-5 pt-4">
            <div className="rounded-xl border border-emerald-100/80 bg-white/80 p-3 text-xs text-neutral-800 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
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

              {(application.appliedOn || application.contactPhone) && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
                  {application.appliedOn && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays
                        className="h-3.5 w-3.5 text-neutral-400"
                        aria-hidden="true"
                      />
                      <span>Applied on {application.appliedOn}</span>
                    </span>
                  )}
                  {application.contactPhone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone
                        className="h-3.5 w-3.5 text-neutral-400"
                        aria-hidden="true"
                      />
                      <span>{application.contactPhone}</span>
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
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
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
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                required
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Date<span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={form.date}
                  onChange={handleChange("date")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                  required
                />
              </div>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Time<span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <Clock
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="time"
                  value={form.time}
                  onChange={handleChange("time")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                  required
                />
              </div>
            </label>

            {/* Applied on (optional, but prefilled) */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">Applied on</span>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={form.appliedDate}
                  onChange={handleChange("appliedDate")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                />
              </div>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Type<span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <select
                  value={form.type}
                  onChange={handleChange("type")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                  required
                >
                  <option value="phone">Phone screening</option>
                  <option value="video">Video call</option>
                  <option value="in-person">In person</option>
                </select>
              </div>
            </label>

            {/* Employment type */}
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
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                />
              </div>
            </label>

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
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
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
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
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
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
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
                  value={form.notes}
                  onChange={handleChange("notes")}
                  rows={3}
                  placeholder="Anything you want to remember for this interview (agenda, prep tasks, who will be there, etc.)"
                  className="w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 pt-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                />
              </div>
            </label>
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-end gap-3 pt-3 border-t border-neutral-200/70">
            <button
              type="button"
              onClick={onClose}
              className={[
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-neutral-800",
                "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
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
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-300"
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

  return createPortal(dialog, document.body);
}
