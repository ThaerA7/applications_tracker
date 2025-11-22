'use client';

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ComponentProps,
} from 'react';
import { Search, Plus, Filter } from 'lucide-react';

import ScheduleInterviewDialog, {
  type Interview,
  type InterviewType,
} from '../../components/ScheduleInterviewDialog';
import MoveApplicationDialog from '../../components/MoveApplicationDialog';
import type { RejectionDetails } from '../../components/MoveToRejectedDialog';
import InterviewCard from './InterviewCard';

const INTERVIEWS_STORAGE_KEY = 'job-tracker:interviews';
const REJECTIONS_STORAGE_KEY = 'job-tracker:rejected';
const WITHDRAWN_STORAGE_KEY = 'job-tracker:withdrawn';

type ApplicationLike =
  React.ComponentProps<typeof ScheduleInterviewDialog>['application'];

type MoveDialogApplication =
  ComponentProps<typeof MoveApplicationDialog>['application'];

type RejectionRecord = RejectionDetails & { id: string };

type WithdrawnRecord = {
  id: string;
  company: string;
  role: string;
  location?: string;
  appliedOn?: string;
  employmentType?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  url?: string;
  logoUrl?: string;
  interviewDate?: string;
  interviewType?: InterviewType;
  notes?: string;
};

const INTERVIEW_TYPE_META: Record<
  InterviewType,
  { label: string; Icon: ComponentType<any> }
> = {
  phone: { label: 'Phone screening', Icon: () => null },
  video: { label: 'Video call', Icon: () => null },
  'in-person': { label: 'In person', Icon: () => null },
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
    notes: 'Prepare system design questions and review React hooks.',
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
    notes: 'Phone screen with HR – ask about team structure.',
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
    notes: 'Onsite: bring printed CV, prepare examples for past projects.',
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

function makeId(existingLength: number): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${existingLength}`;
}

// --- Component ---

export default function InterviewsPage() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Interview[]>(DEMO_INTERVIEWS);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogApplication, setDialogApplication] =
    useState<ApplicationLike>(null);
  const [editingInterview, setEditingInterview] =
    useState<Interview | null>(null);

  // For countdown / countup, only on client to avoid hydration issues
  const [now, setNow] = useState<number | null>(null);

  // Delete confirmation dialog target
  const [deleteTarget, setDeleteTarget] = useState<Interview | null>(
    null,
  );

  // Move dialog state (reusing MoveApplicationDialog)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveDialogApplication, setMoveDialogApplication] =
    useState<MoveDialogApplication>(null);
  const [moveTargetInterview, setMoveTargetInterview] =
    useState<Interview | null>(null);

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
      notes: item.notes ?? '',
    };

    setEditingInterview(item);
    setDialogApplication(app);
    setDialogOpen(true);
  };

  const handleMove = (item: Interview) => {
    const app: MoveDialogApplication = {
      id: item.id,
      company: item.company,
      role: item.role,
      location: item.location,
      status: 'Interview',
      appliedOn: item.appliedOn ?? '',
      contactPerson: item.contact?.name,
      contactEmail: item.contact?.email,
      contactPhone: item.contact?.phone,
      offerUrl: item.url,
      logoUrl: item.logoUrl,
      employmentType: item.employmentType,
    };

    setMoveTargetInterview(item);
    setMoveDialogApplication(app);
    setMoveDialogOpen(true);
  };

  const handleMoveDialogClose = () => {
    setMoveDialogOpen(false);
    setMoveDialogApplication(null);
    setMoveTargetInterview(null);
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
          console.error(
            'Failed to persist interviews after create/edit',
            err,
          );
        }
      }

      return next;
    });

    setDialogOpen(false);
    setEditingInterview(null);
    setDialogApplication(null);
  };

  const handleMoveToRejectedFromInterviews = (
    details: RejectionDetails,
  ) => {
    const source = moveTargetInterview;

    // 1) Append to rejected storage
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(REJECTIONS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const prev: RejectionRecord[] = Array.isArray(parsed)
          ? parsed
          : [];

        const newItem: RejectionRecord = {
          id: makeId(prev.length),
          ...details,
        };

        const nextRejected = [...prev, newItem];
        window.localStorage.setItem(
          REJECTIONS_STORAGE_KEY,
          JSON.stringify(nextRejected),
        );
      } catch (err) {
        console.error(
          'Failed to persist rejected application from interview',
          err,
        );
      }
    }

    // 2) Remove from interviews
    if (source) {
      const sourceId = source.id;
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== sourceId);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(
              INTERVIEWS_STORAGE_KEY,
              JSON.stringify(next),
            );
          } catch (err) {
            console.error(
              'Failed to persist interviews after moving to rejected',
              err,
            );
          }
        }
        return next;
      });
    }

    // Close whole dialog
    handleMoveDialogClose();
  };

  const handleMoveToWithdrawnFromInterviews = () => {
    const source = moveTargetInterview;
    if (!source) {
      handleMoveDialogClose();
      return;
    }

    // 1) Append to withdrawn storage
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(WITHDRAWN_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const prev: WithdrawnRecord[] = Array.isArray(parsed)
          ? parsed
          : [];

        const newItem: WithdrawnRecord = {
          id: makeId(prev.length),
          company: source.company,
          role: source.role,
          location: source.location,
          appliedOn: source.appliedOn,
          employmentType: source.employmentType,
          contactName: source.contact?.name,
          contactEmail: source.contact?.email,
          contactPhone: source.contact?.phone,
          url: source.url,
          logoUrl: source.logoUrl,
          interviewDate: source.date,
          interviewType: source.type,
          notes: source.notes,
        };

        const nextWithdrawn = [...prev, newItem];
        window.localStorage.setItem(
          WITHDRAWN_STORAGE_KEY,
          JSON.stringify(nextWithdrawn),
        );
      } catch (err) {
        console.error(
          'Failed to persist withdrawn application from interview',
          err,
        );
      }
    }

    // 2) Remove from interviews
    const sourceId = source.id;
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== sourceId);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            INTERVIEWS_STORAGE_KEY,
            JSON.stringify(next),
          );
        } catch (err) {
          console.error(
            'Failed to persist interviews after moving to withdrawn',
            err,
          );
        }
      }
      return next;
    });

    handleMoveDialogClose();
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
        i.notes,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [query, items]);

  // Formatting + status styles for MoveApplicationDialog
  const fmtDate = (date: string) => date;
  const statusClasses = (status: string) => {
    if (status.toLowerCase().includes('interview')) {
      return 'bg-sky-50 text-sky-900 border border-sky-200';
    }
    return 'bg-neutral-50 text-neutral-700 border border-neutral-200';
  };

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

      {/* Move dialog (reusing MoveApplicationDialog with 2 buttons) */}
      <MoveApplicationDialog
        open={moveDialogOpen && !!moveDialogApplication}
        application={moveDialogApplication}
        onClose={handleMoveDialogClose}
        onMoveToInterviews={
          () => {
            // Not used when mode="from-interviews"
          }
        }
        onMoveToRejected={handleMoveToRejectedFromInterviews}
        onMoveToWithdrawn={handleMoveToWithdrawnFromInterviews}
        fmtDate={fmtDate}
        statusClasses={statusClasses}
        mode="from-interviews"
      />

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-y-0 right-0 left-64 z-[13000] flex items-center justify-center px-4 py-8">
          {/* Backdrop */}
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
              <span className="font-medium">
                {deleteTarget.company}
              </span>{' '}
              for the role{' '}
              <span className="font-medium">
                {deleteTarget.role}
              </span>
              .
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
            Fliter
          </button>
        </div>

        {/* Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const { date, time } = formatDateTime(item.date);
            const { label: typeLabel } = INTERVIEW_TYPE_META[item.type];
            const countdownLabel = getInterviewCountdownLabel(
              item.date,
              now,
            );
            const appliedLabel = getAppliedCountupLabel(
              item.appliedOn,
              now,
            );

            // Use real icons in the card (mapped there) – we only pass label here
            const typeIcon = (() => null) as ComponentType<any>;

            return (
              <InterviewCard
                key={item.id}
                item={item}
                typeIcon={typeIcon}
                typeLabel={typeLabel}
                date={date}
                time={time}
                countdownLabel={countdownLabel}
                appliedLabel={appliedLabel}
                onEdit={handleEdit}
                onMove={handleMove}
                onDelete={openDeleteDialog}
              />
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              <div className="mb-2 text-5xl">📅</div>

              {items.length === 0 ? (
                <>
                  <p className="text-sm text-neutral-700">
                    You don&apos;t have any interviews yet.
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Click <span className="font-medium">Add</span> to
                    schedule your first interview.
                  </p>
                </>
              ) : (
                <p className="text-sm text-neutral-700">
                  No interviews match your search.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
