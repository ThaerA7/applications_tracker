// AddApplicationDialog.tsx
'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  MapPin,
  CalendarDays,
  Briefcase,
  ExternalLink,
  Phone,
  Mail,
  User,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

export type NewApplicationForm = {
  company: string;
  role: string;
  location: string;
  appliedOn: string;    // YYYY-MM-DD
  startDate: string;    // YYYY-MM-DD
  employmentType: string;
  offerUrl: string;
  salary: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  source: string;       // where you found the job (LinkedIn, company site…)
  status: string;       // Applied, Interview, Offer, Rejected…
  notes: string;
  logoUrl?: string;     // optional company logo URL / object URL from upload
  website?: string;     // company website
};

// Same-style options as in ScheduleInterviewDialog
const EMPLOYMENT_OPTIONS: string[] = [
  'Full-time',
  'Part-time',
  'Internship',
  'Working student',
  'Contract',
  'Temporary',
  'Mini-job',
  'Freelance',
];

function makeInitialForm(): NewApplicationForm {
  const today = new Date().toISOString().slice(0, 10);
  return {
    company: '',
    role: '',
    location: '',
    appliedOn: today,
    startDate: '',
    employmentType: '',
    offerUrl: '',
    salary: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    source: '',
    status: 'Applied',
    notes: '',
    logoUrl: '',
    website: '',
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewApplicationForm) => void;
  initialData?: NewApplicationForm | null;
};

export default function AddApplicationDialog({
  open,
  onClose,
  onSave,
  initialData,
}: Props) {
  const [form, setForm] = useState<NewApplicationForm>(() => makeInitialForm());
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Reset form + focus when opened (supports edit + create)
  useEffect(() => {
    if (!open) return;
    setForm(initialData ?? makeInitialForm());
    setLogoError(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
    const t = firstFieldRef.current;
    if (t) {
      setTimeout(() => t.focus(), 10);
    }
  }, [open, initialData]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleChange =
    (field: keyof NewApplicationForm) =>
    (
      e: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const { value } = e.target;
      setForm((f) => ({ ...f, [field]: value }));
    };

  const handleLogoChange = (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      setLogoError(null);
      setForm((f) => ({ ...f, logoUrl: '' }));
      return;
    }

    const maxSizeBytes = 3 * 1024 * 1024; // 3 MB
    if (file.size > maxSizeBytes) {
      setLogoError('Logo must be smaller than 3 MB.');
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
      return;
    }

    setLogoError(null);
    const objectUrl = URL.createObjectURL(file);
    setForm((f) => ({ ...f, logoUrl: objectUrl }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const canSubmit =
      form.company.trim().length > 0 &&
      form.role.trim().length > 0;
    if (!canSubmit) return;
    onSave(form);
    onClose();
  };

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const canSubmit =
    form.company.trim().length > 0 &&
    form.role.trim().length > 0;

  const isEdit = !!initialData;

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

      {/* Dialog panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-application-title"
        className={[
          'relative z-10 max-h-full w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-200/80',
          'bg-gradient-to-br from-sky-50 via-white to-amber-50 shadow-xl',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200/70 px-5 py-3">
          <div className="flex items-center gap-2">
            <img
              src={isEdit ? '/icons/edit.png' : '/icons/add.png'}
              alt={isEdit ? 'Edit application' : 'Add application'}
              className="h-9 w-9 md:h-12 md:w-12 object-contain"
            />
            <div>
              <h2
                id="add-application-title"
                className="text-base font-semibold text-neutral-900"
              >
                {isEdit ? 'Edit application' : 'Add application'}
              </h2>
              <p className="mt-0.1 text-xs text-neutral-600">
                {isEdit
                  ? 'Update the details of this application.'
                  : 'Track where you applied and the details of the offer.'}
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
          {/* Main info */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Company name<span className="text-rose-500">*</span>
              </span>
              <input
                ref={firstFieldRef}
                type="text"
                value={form.company}
                onChange={handleChange('company')}
                placeholder="Acme GmbH"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
                required
              />
            </label>

            {/* Company logo upload + preview */}
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
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-white/70 flex items-center justify-center">
                    <img
                      src={form.logoUrl}
                      alt={`${form.company || 'Company'} logo`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Role / position<span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                value={form.role}
                onChange={handleChange('role')}
                placeholder="Frontend Engineer"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
                required
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Location
              </span>
              <div className="relative">
                <MapPin
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={form.location}
                  onChange={handleChange('location')}
                  placeholder="Berlin, DE / Remote"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
                />
              </div>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Date applied
              </span>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={form.appliedOn}
                  onChange={handleChange('appliedOn')}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
                />
              </div>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Start date
              </span>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={form.startDate}
                  onChange={handleChange('startDate')}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
                />
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
                  onChange={handleChange('employmentType')}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
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

            {/* ✅ Status field removed from dialog */}
          </div>

          {/* Offer + contacts */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Offer link
              </span>
              <div className="relative">
                <ExternalLink
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="url"
                  value={form.offerUrl}
                  onChange={handleChange('offerUrl')}
                  placeholder="https://jobs.example.com/frontend-engineer"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
                />
              </div>
            </label>

            {/* Company website */}
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Company website
              </span>
              <div className="relative">
                <ExternalLink
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="url"
                  value={form.website ?? ''}
                  onChange={handleChange('website')}
                  placeholder="https://company.example.com"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
                />
              </div>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Salary / range
              </span>
              <input
                type="text"
                value={form.salary}
                onChange={handleChange('salary')}
                placeholder="€60k–€75k / €x per hour"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Where did you find it?
              </span>
              <input
                type="text"
                value={form.source}
                onChange={handleChange('source')}
                placeholder="LinkedIn, Arbeitagentur, company site…"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Contact person
              </span>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={form.contactPerson}
                  onChange={handleChange('contactPerson')}
                  placeholder="Jane Doe"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
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
                  onChange={handleChange('contactEmail')}
                  placeholder="recruiting@example.com"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
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
                  onChange={handleChange('contactPhone')}
                  placeholder="+49 30 123456"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
                />
              </div>
            </label>
          </div>

          {/* Notes */}
          <label className="mt-6 block space-y-1 text-sm">
            <span className="font-medium text-neutral-800">
              Notes
            </span>
            <div className="relative">
              <FileText
                className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400"
                aria-hidden="true"
              />
              <textarea
                value={form.notes}
                onChange={handleChange('notes')}
                rows={3}
                placeholder="Interview prep, who you talked to, follow-up dates…"
                className="w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 pt-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
              />
            </div>
          </label>

          {/* Footer actions */}
          <div className="mt-2 flex items-center justify-end gap-3 pt-2 border-t border-neutral-200/70">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={[
                'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow-sm',
                canSubmit
                  ? 'bg-sky-600 text-white hover:bg-sky-500 focus-visible:ring-sky-300'
                  : 'cursor-not-allowed bg-neutral-200 text-neutral-500',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              ].join(' ')}
            >
              {isEdit ? 'Save changes' : 'Save application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
