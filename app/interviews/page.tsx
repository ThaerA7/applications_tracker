// app/interviews/page.tsx
'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Search,
  Plus,
  Filter,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Video,
  User2,
  Mail,
  Link as LinkIcon,
  Building2,
  Trash2,
  Pencil,
  ArrowRight,
} from 'lucide-react';

import ScheduleInterviewDialog, {
  type Interview,
  type InterviewType,
} from '../../components/ScheduleInterviewDialog';

const INTERVIEWS_STORAGE_KEY = 'job-tracker:interviews';

type ApplicationLike =
  React.ComponentProps<typeof ScheduleInterviewDialog>['application'];

const INTERVIEW_TYPE_META: Record<
  InterviewType,
  { label: string; Icon: ComponentType<any> }
> = {
  phone: { label: 'Phone screening', Icon: Phone },
  video: { label: 'Video call', Icon: Video },
  'in-person': { label: 'In person', Icon: MapPin },
};

// Initial demo data (used only if localStorage is empty)
const DEMO_INTERVIEWS: Interview[] = [
  {
    id: '1',
    company: 'Acme Corp',
    role: 'Frontend Engineer',
    location: 'Berlin',
    contact: { name: 'Julia Meyer', email: 'j.meyer@acme.example' },
    date: '2025-11-12T14:00',
    type: 'video',
    url: 'https://jobs.example/acme/frontend',
    logoUrl: '/logos/acme.svg',
    employmentType: 'Full-time',
  },
  {
    id: '2',
    company: 'Globex',
    role: 'Mobile Developer (Flutter)',
    location: 'Remote',
    contact: { name: 'HR Team' },
    date: '2025-11-15T10:30',
    type: 'phone',
    logoUrl: '/logos/globex.png',
    employmentType: 'Full-time',
  },
  {
    id: '3',
    company: 'Initech',
    role: 'Full-Stack Developer',
    location: 'Munich HQ',
    contact: { name: 'Samir', email: 'samir@initech.example' },
    date: '2025-11-20T09:15',
    type: 'in-person',
    url: 'https://initech.example/careers/123',
    logoUrl: '/logos/initech.svg',
    employmentType: 'Full-time',
  },
];

// --- Pure, deterministic date formatting for display (no Date/Intl) ---

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function getWeekday(year: number, month: number, day: number): string {
  // Tomohiko Sakamoto's algorithm
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  let m = month;
  if (m < 3) y -= 1;
  const w =
    (y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) +
      t[m - 1] +
      day) %
    7;
  return WEEKDAYS[(w + 7) % 7];
}

function formatDateTime(iso: string) {
  if (!iso) return { date: '', time: '' };

  const [datePart, timePartRaw] = iso.split('T');
  if (!datePart) return { date: '', time: '' };

  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!year || !month || !day) {
    return {
      date: iso,
      time: timePartRaw ? timePartRaw.slice(0, 5) : '',
    };
  }

  const weekday = getWeekday(year, month, day);
  const monthName =
    MONTHS_SHORT[month - 1] ?? String(month).padStart(2, '0');
  const date = `${weekday}, ${String(day).padStart(2, '0')} ${monthName} ${year}`;
  const time = timePartRaw ? timePartRaw.slice(0, 5) : '';

  return { date, time };
}

// --- Helpers for countdown / countup (client-only via `now`) ---

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseToUtcMidnight(dateLike: string): number | null {
  if (!dateLike) return null;
  const [datePart] = dateLike.split('T');
  if (!datePart) return null;
  const [yStr, mStr, dStr] = datePart.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}

function getTodayUtcMidnight(nowMs: number): number {
  const now = new Date(nowMs);
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
}

function getInterviewCountdownLabel(
  interviewIso: string,
  nowMs: number | null,
): string | null {
  if (!nowMs) return null;
  const interviewDay = parseToUtcMidnight(interviewIso);
  if (interviewDay == null) return null;

  const today = getTodayUtcMidnight(nowMs);
  const diffDays = Math.round((interviewDay - today) / MS_PER_DAY);

  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays === 1) return 'in 1 day';
  if (diffDays === 0) return 'today';
  if (diffDays === -1) return '1 day ago';
  return `${Math.abs(diffDays)} days ago`;
}

function getAppliedCountupLabel(
  appliedDate: string | undefined,
  nowMs: number | null,
): string | null {
  if (!nowMs || !appliedDate) return null;
  const appliedDay = parseToUtcMidnight(appliedDate);
  if (appliedDay == null) return null;

  const today = getTodayUtcMidnight(nowMs);
  const diffDays = Math.round((today - appliedDay) / MS_PER_DAY);

  if (diffDays < 0) return null; // future applied date, ignore
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

// --- Component ---

export default function InterviewsPage() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Interview[]>(DEMO_INTERVIEWS);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogApplication, setDialogApplication] =
    useState<ApplicationLike>(null);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(
    null,
  );

  // For countdown / countup, only on client to avoid hydration issues
  const [now, setNow] = useState<number | null>(null);

  // Delete confirmation dialog target
  const [deleteTarget, setDeleteTarget] = useState<Interview | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setNow(Date.now());
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000); // update every minute
    return () => window.clearInterval(id);
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(INTERVIEWS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
          return;
        }
      }

      // If nothing in storage, seed with demo data
      window.localStorage.setItem(
        INTERVIEWS_STORAGE_KEY,
        JSON.stringify(DEMO_INTERVIEWS),
      );
      setItems(DEMO_INTERVIEWS);
    } catch (err) {
      console.error('Failed to load interviews from localStorage', err);
      setItems(DEMO_INTERVIEWS);
    }
  }, []);

  const handleAdd = () => {
    setEditingInterview(null);
    setDialogApplication(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Interview) => {
    const app: ApplicationLike = {
      id: item.id,
      company: item.company,
      role: item.role,
      location: item.location,
      contactPerson: item.contact?.name,
      contactEmail: item.contact?.email,
      contactPhone: item.contact?.phone,
      offerUrl: item.url,
      logoUrl: item.logoUrl,
      appliedOn: item.appliedOn,
      employmentType: item.employmentType,
    };

    setEditingInterview(item);
    setDialogApplication(app);
    setDialogOpen(true);
  };

  const handleMove = (item: Interview) => {
    // Placeholder: hook into your "move to another stage" logic here
    console.log('Move interview', item.id, item.company, item.role);
  };

  const openDeleteDialog = (item: Interview) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;

    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            INTERVIEWS_STORAGE_KEY,
            JSON.stringify(next),
          );
        } catch (err) {
          console.error('Failed to persist interviews after delete', err);
        }
      }
      return next;
    });

    setDeleteTarget(null);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingInterview(null);
    setDialogApplication(null);
  };

  const handleInterviewCreated = (created: Interview) => {
    setItems((prev) => {
      let next: Interview[];
      if (editingInterview) {
        // Replace existing interview by id
        next = prev.map((item) =>
          item.id === editingInterview.id ? created : item,
        );
      } else {
        // Add new interview
        next = [...prev, created];
      }

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            INTERVIEWS_STORAGE_KEY,
            JSON.stringify(next),
          );
        } catch (err) {
          console.error('Failed to persist interviews after create/edit', err);
        }
      }

      return next;
    });

    setDialogOpen(false);
    setEditingInterview(null);
    setDialogApplication(null);
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter((i) =>
      [
        i.company,
        i.role,
        i.location,
        INTERVIEW_TYPE_META[i.type].label,
        i.contact?.name,
        i.contact?.email,
        i.contact?.phone,
        i.appliedOn,
        i.employmentType,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [query, items]);

  return (
    <>
      {/* Dialog shared for Add + Edit */}
      <ScheduleInterviewDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        application={dialogApplication}
        onInterviewCreated={handleInterviewCreated}
        mode={editingInterview ? 'edit' : 'add'}
      />

      {deleteTarget && (
        <div className="fixed inset-y-0 right-0 left-64 z-[13000] flex items-center justify-center px-4 py-8">
          {/* Backdrop (within the same content area as ScheduleInterviewDialog) */}
          <div
            className="absolute inset-0 bg-neutral-900/40"
            aria-hidden="true"
            onClick={handleCancelDelete}
          />

          {/* Panel */}
          <div
            className={[
              'relative z-10 w-full max-w-sm rounded-2xl border border-neutral-200/80',
              'bg-white shadow-2xl p-5',
            ].join(' ')}
          >
            <h2 className="text-sm font-semibold text-neutral-900">
              Delete interview?
            </h2>
            <p className="mt-2 text-sm text-neutral-700">
              This will permanently remove the interview with{' '}
              <span className="font-medium">{deleteTarget.company}</span> for
              the role{' '}
              <span className="font-medium">{deleteTarget.role}</span>.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              This action cannot be undone.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center justify-center rounded-lg border border-rose-500 bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-400"
              >
                Delete interview
              </button>
            </div>
          </div>
        </div>
      )}

      <section
        className={[
          'relative rounded-2xl border border-neutral-200/70',
          'bg-gradient-to-br from-emerald-50 via-white to-teal-50',
          'p-8 shadow-md overflow-hidden',
        ].join(' ')}
      >
        {/* soft emerald/teal blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl" />

        <h1 className="text-2xl font-semibold text-neutral-900">
          Interviews
        </h1>
        <p className="mt-1 text-neutral-700">
          Track upcoming and past interviews, outcomes, and notes.
        </p>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search interviews…"
              aria-label="Search interviews"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={[
                'h-11 w-full rounded-lg pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500',
                'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
                'border border-neutral-200 shadow-sm',
                'hover:bg-white focus:bg-white',
                'ring-1 ring-transparent',
                'focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-300',
                'transition-shadow',
              ].join(' ')}
            />
          </div>

          {/* Add */}
          <button
            type="button"
            onClick={handleAdd}
            className={[
              'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800',
              'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
              'border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300',
            ].join(' ')}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>

          {/* Filter (placeholder) */}
          <button
            type="button"
            className={[
              'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800',
              'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
              'border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300',
            ].join(' ')}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filter
          </button>
        </div>

        {/* Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const { date, time } = formatDateTime(item.date);
            const { Icon: TypeIcon, label: typeLabel } =
              INTERVIEW_TYPE_META[item.type];

            const countdownLabel = getInterviewCountdownLabel(
              item.date,
              now,
            );
            const appliedLabel = getAppliedCountupLabel(
              item.appliedOn,
              now,
            );

            return (
              <article
                key={item.id}
                className={[
                  'relative group rounded-xl border border-neutral-200/80 p-5 shadow-sm transition-all',
                  'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70',
                  'hover:-translate-y-0.5 hover:shadow-md',
                  'before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl',
                  'before:bg-gradient-to-b before:from-emerald-500 before:via-teal-500 before:to-cyan-500',
                  'before:opacity-90',
                ].join(' ')}
              >
                {/* Top-right actions: Edit + Move on top, Delete centered below */}
                <div className="absolute right-3 top-3 z-10 flex flex-col items-center gap-1">
                  {/* Top row: Edit + Move */}
                  <div className="flex flex-row gap-2">
                    {/* Edit (blue) */}
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 shadow-sm hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      aria-label="Edit interview"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    {/* Move (green) */}
                    <button
                      type="button"
                      onClick={() => handleMove(item)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                      aria-label="Move interview"
                    >
                      <ArrowRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  {/* Bottom: Delete centered under them */}
                  <button
                    type="button"
                    onClick={() => openDeleteDialog(item)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 shadow-sm hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    aria-label="Delete interview"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                {/* Header with square logo + company/role */}
                <div className="flex items-start gap-3 pr-20 sm:pr-24">
                  {item.logoUrl ? (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ring-1 ring-white/60">
                      <Image
                        src={item.logoUrl}
                        alt={`${item.company} logo`}
                        fill
                        sizes="48px"
                        className="object-contain p-1.5"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500">
                      <Building2 className="h-6 w-6" aria-hidden="true" />
                      <span className="sr-only">{item.company}</span>
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="max-w-full truncate text-base font-semibold text-neutral-900">
                        {item.company}
                      </h2>
                    </div>
                    <p className="flex items-center gap-1 text-sm text-neutral-600">
                      <Briefcase
                        className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400"
                        aria-hidden="true"
                      />
                      <span className="truncate" title={item.role}>
                        {item.role}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div
                  className="mt-3 h-px w-full bg-neutral-200/80"
                  role="separator"
                  aria-hidden="true"
                />

                {/* Details – show only fields with data for optional ones */}
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  {/* Date + countdown */}
                  <div className="flex items-center gap-2">
                    <Calendar
                      className="h-4 w-4 text-neutral-500"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col">
                      <dt className="text-neutral-500">Date</dt>
                      <dd className="font-medium text-neutral-900 flex flex-wrap items-baseline gap-2">
                        <span>{date || '-'}</span>
                        {countdownLabel && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            {countdownLabel}
                          </span>
                        )}
                      </dd>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-2">
                    <Clock
                      className="h-4 w-4 text-neutral-500"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col">
                      <dt className="text-neutral-500">Time</dt>
                      <dd className="font-medium text-neutral-900">
                        {time ? `${time} (Berlin)` : '-'}
                      </dd>
                    </div>
                  </div>

                  {/* Type */}
                  <div className="flex items-center gap-2">
                    <TypeIcon
                      className="h-4 w-4 text-neutral-500"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col">
                      <dt className="text-neutral-500">Type</dt>
                      <dd className="font-medium text-neutral-900">
                        {typeLabel || '-'}
                      </dd>
                    </div>
                  </div>

                  {/* Employment type (optional) */}
                  {item.employmentType && (
                    <div className="flex items-center gap-2">
                      <Briefcase
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col">
                        <dt className="text-neutral-500">Employment</dt>
                        <dd className="font-medium text-neutral-900">
                          {item.employmentType}
                        </dd>
                      </div>
                    </div>
                  )}

                  {/* Applied date + countup (only if we have appliedOn) */}
                  {item.appliedOn && (
                    <div className="flex items-center gap-2">
                      <Calendar
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col">
                        <dt className="text-neutral-500">Applied</dt>
                        <dd className="font-medium text-neutral-900 flex flex-wrap items-baseline gap-2">
                          <span>{item.appliedOn}</span>
                          {appliedLabel && (
                            <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200">
                              {appliedLabel}
                            </span>
                          )}
                        </dd>
                      </div>
                    </div>
                  )}

                  {/* Location (optional) */}
                  {item.location && (
                    <div className="flex items-center gap-2">
                      <MapPin
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col">
                        <dt className="text-neutral-500">Location</dt>
                        <dd className="font-medium text-neutral-900">
                          {item.location}
                        </dd>
                      </div>
                    </div>
                  )}

                  {/* Contact name (optional) */}
                  {item.contact?.name && (
                    <div className="flex items-center gap-2">
                      <User2
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col">
                        <dt className="text-neutral-500">Contact name</dt>
                        <dd className="font-medium text-neutral-900">
                          {item.contact.name}
                        </dd>
                      </div>
                    </div>
                  )}

                  {/* Contact email (optional) */}
                  {item.contact?.email && (
                    <div className="flex items-center gap-2">
                      <Mail
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col">
                        <dt className="text-neutral-500">Contact email</dt>
                        <dd className="font-medium text-neutral-900">
                          <a
                            href={`mailto:${item.contact.email}`}
                            className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                          >
                            {item.contact.email}
                          </a>
                        </dd>
                      </div>
                    </div>
                  )}

                  {/* Contact phone (optional) */}
                  {item.contact?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col">
                        <dt className="text-neutral-500">Contact phone</dt>
                        <dd className="font-medium text-neutral-900">
                          <a
                            href={`tel:${item.contact.phone}`}
                            className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                          >
                            {item.contact.phone}
                          </a>
                        </dd>
                      </div>
                    </div>
                  )}

                  {/* Job posting URL (optional) */}
                  {item.url && (
                    <div className="flex items-center gap-2">
                      <LinkIcon
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col">
                        <dt className="text-neutral-500">Job posting</dt>
                        <dd className="font-medium text-neutral-900">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                          >
                            <span>View the offer details</span>
                            <span aria-hidden="true">↗</span>
                          </a>
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              <div className="mb-2 text-5xl">📅</div>
              <p className="text-sm text-neutral-700">
                No interviews match your search.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
