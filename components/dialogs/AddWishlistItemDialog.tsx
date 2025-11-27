"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Briefcase,
  CalendarDays,
  MapPin,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";

export type NewWishlistItemForm = {
  company: string;
  role: string;
  location: string;
  startDate: string; // YYYY-MM-DD
  employmentType: string;
  offerUrl: string;
  logoUrl?: string;
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

function makeInitialForm(): NewWishlistItemForm {
  return {
    company: "",
    role: "",
    location: "",
    startDate: "",
    employmentType: "",
    offerUrl: "",
    logoUrl: "",
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewWishlistItemForm) => void;
};

export default function AddWishlistItemDialog({
  open,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<NewWishlistItemForm>(() =>
    makeInitialForm()
  );
  const [logoError, setLogoError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Reset form + focus when opened
  useEffect(() => {
    if (!open) return;
    setForm(makeInitialForm());
    setLogoError(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    const t = firstFieldRef.current;
    if (t) {
      setTimeout(() => t.focus(), 10);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleChange =
    (field: keyof NewWishlistItemForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value } = e.target;
      setForm((f) => ({ ...f, [field]: value }));
    };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      setLogoError(null);
      setForm((f) => ({ ...f, logoUrl: "" }));
      return;
    }

    const maxSizeBytes = 3 * 1024 * 1024; // 3 MB
    if (file.size > maxSizeBytes) {
      setLogoError("Logo must be smaller than 3 MB.");
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
      return;
    }

    setLogoError(null);
    const objectUrl = URL.createObjectURL(file);
    setForm((f) => ({ ...f, logoUrl: objectUrl }));
  };

  const canSubmit =
    form.company.trim().length > 0 && form.role.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave(form);
    onClose();
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const dialog = (
  <div
    className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[10000] flex items-center justify-center px-4 py-8"
  >
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
      aria-labelledby="add-wishlist-item-title"
      className={[
        "relative z-10 max-h-full w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200/80",
        "bg-gradient-to-br from-amber-50 via-white to-yellow-50 shadow-xl",
      ].join(" ")}
      onClick={(e) => e.stopPropagation()}
    >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200/70 px-5 py-3">
          <div className="flex items-center gap-2">
            <img
              src="/icons/addtowl.png"
              alt="Add wishlist item"
              className="h-9 w-9 md:h-11 md:w-11 object-contain"
            />
            <div>
              <h2
                id="add-wishlist-item-title"
                className="text-base font-semibold text-neutral-900"
              >
                Add wishlist offer
              </h2>
              <p className="mt-0.5 text-xs text-neutral-600">
                Save a job offer manually to your wishlist.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/80 text-neutral-500 shadow-sm hover:bg-white"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-h-[75vh] overflow-y-auto px-5 py-4 space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {/* Company name */}
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Company name
                <span className="text-rose-500">*</span>
              </span>
              <input
                ref={firstFieldRef}
                type="text"
                value={form.company}
                onChange={handleChange("company")}
                placeholder="Acme GmbH"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                required
              />
            </label>

            {/* Logo upload + preview */}
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Company logo (optional)
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-xs font-medium text-neutral-800 shadow-sm hover:bg-white">
                    <ImageIcon
                      className="h-4 w-4 text-neutral-400"
                      aria-hidden="true"
                    />
                    <span>Upload logo (PNG, JPG, SVG. Max size 3 MB)</span>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="sr-only"
                    />
                  </label>

                  {logoError && (
                    <p className="mt-1 text-[11px] text-rose-600">
                      {logoError}
                    </p>
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

            {/* Role */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Role / position
                <span className="text-rose-500">*</span>
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
                  value={form.location}
                  onChange={handleChange("location")}
                  placeholder="Berlin, DE / Remote"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </div>
            </label>

            {/* Date */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">Start date</span>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={form.startDate}
                  onChange={handleChange("startDate")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </div>
            </label>

            {/* Employment type */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Type of employment
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

            {/* Offer link */}
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">Offer link</span>
              <div className="relative">
                <ExternalLink
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="url"
                  value={form.offerUrl}
                  onChange={handleChange("offerUrl")}
                  placeholder="https://jobs.example.com/frontend-engineer"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </div>
            </label>
          </div>

          {/* Footer actions */}
          <div className="mt-2 flex items-center justify-end gap-3 border-t border-neutral-200/70 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={[
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                canSubmit
                  ? "bg-amber-500 text-white hover:bg-amber-400 focus-visible:ring-amber-300"
                  : "cursor-not-allowed bg-neutral-200 text-neutral-500",
              ].join(" ")}
            >
              Save to wishlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
