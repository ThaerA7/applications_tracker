// app/rejected/page.tsx
'use client';

import Image from 'next/image';
import type React from 'react';
import { useMemo, useState, type ComponentType } from 'react';
import MoveToRejectedDialog, {
  type RejectionDetails,
} from '@/components/MoveToRejectedDialog';
import {
  Search,
  Plus,
  Filter,
  Briefcase,
  MapPin,
  Calendar,
  Phone,
  Video,
  User2,
  Ban,
  Link as LinkIcon,
  Trash2,
  Pencil,
  ArrowRight,
} from 'lucide-react';

type InterviewType = 'phone' | 'video' | 'in-person';

type Rejection = {
  id: string;
  company: string;
  role: string;
  location?: string;
  contact?: { name?: string; email?: string };
  decisionDate: string; // string date/datetime
  hadInterview: boolean;
  interviewType?: InterviewType; // only when hadInterview = true
  url?: string;
  logoUrl?: string;
};

// Whatever type MoveToRejectedDialog expects for `application`
type ApplicationLike =
  React.ComponentProps<typeof MoveToRejectedDialog>['application'];

const INTERVIEW_TYPE_META: Record<
  InterviewType,
  { label: string; Icon: ComponentType<any> }
> = {
  phone: { label: 'Phone', Icon: Phone },
  video: { label: 'Video call', Icon: Video },
  'in-person': { label: 'In person', Icon: MapPin },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-DE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(d);
}

export default function RejectedPage() {
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejected, setRejected] = useState<Rejection[]>([]);

  const [dialogApplication, setDialogApplication] =
    useState<ApplicationLike>(null);
  const [editingRejection, setEditingRejection] =
    useState<Rejection | null>(null);

  // Delete confirmation dialog target
  const [deleteTarget, setDeleteTarget] = useState<Rejection | null>(null);

  const handleAdd = () => {
    setEditingRejection(null);
    setDialogApplication(null);
    setDialogOpen(true);
  };

  // Edit existing rejection (same idea as Interviews page)
  const handleEdit = (item: Rejection) => {
    const app: ApplicationLike = {
      // Map what we have from Rejection into the expected application shape.
      // These keys mirror the ScheduleInterviewDialog mapping you used.
      company: item.company,
      role: item.role,
      location: item.location,
      contactPerson: item.contact?.name,
      contactEmail: item.contact?.email,
      offerUrl: item.url,
      logoUrl: item.logoUrl,
    } as ApplicationLike;

    setEditingRejection(item);
    setDialogApplication(app);
    setDialogOpen(true);
  };

  // Placeholder – hook into your "move out of Rejected" logic
  const handleMove = (item: Rejection) => {
    console.log('Move rejected application', item.id, item.company, item.role);
  };

  const openDeleteDialog = (item: Rejection) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;

    setRejected((prev) => prev.filter((i) => i.id !== id));
    setDeleteTarget(null);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingRejection(null);
    setDialogApplication(null);
  };

  // Use dialog output to create or update cards
  const handleRejectionCreated = (details: RejectionDetails) => {
    setRejected((prev) => {
      if (editingRejection) {
        // Update existing rejection
        return prev.map((item) =>
          item.id === editingRejection.id
            ? { ...item, ...(details as any) }
            : item,
        );
      }

      // Create new rejection
      return [
        ...prev,
        {
          ...(details as any),
          id:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${prev.length}`,
        },
      ];
    });

    setDialogOpen(false);
    setEditingRejection(null);
    setDialogApplication(null);
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return rejected;

    return rejected.filter((item) =>
      [
        item.company,
        item.role,
        item.location,
        item.contact?.name,
        item.contact?.email,
        item.hadInterview
          ? INTERVIEW_TYPE_META[item.interviewType!]?.label
          : 'no interview',
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [query, rejected]);

  const hasSearchOrFilters = query.trim().length > 0;

  return (
    <>
      {/* Delete confirmation overlay (same style as Interviews page) */}
      {deleteTarget && (
        <div className="fixed inset-y-0 right-0 left-64 z-[13000] flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-neutral-900/40"
            aria-hidden="true"
            onClick={handleCancelDelete}
          />
          <div
            className={[
              'relative z-10 w-full max-w-sm rounded-2xl border border-neutral-200/80',
              'bg-white shadow-2xl p-5',
            ].join(' ')}
          >
            <h2 className="text-sm font-semibold text-neutral-900">
              Delete rejected application?
            </h2>
            <p className="mt-2 text-sm text-neutral-700">
              This will permanently remove the rejected application at{' '}
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
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <section
        className={[
          'relative rounded-2xl border border-neutral-200/70',
          'bg-gradient-to-br from-rose-50 via-white to-pink-50',
          'p-8 shadow-md overflow-hidden',
        ].join(' ')}
      >
        {/* soft rose/pink blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-pink-400/20 blur-3xl" />

        <h1 className="text-2xl font-semibold text-neutral-900">Rejected</h1>
        <p className="mt-1 text-neutral-700">
          Applications that didn’t work out.
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
              placeholder="Search rejected applications…"
              aria-label="Search rejected applications"
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

          {/* Add (glass, matches Filter) */}
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

          {/* Filter (glass sibling) */}
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
            const date = formatDate(item.decisionDate);
            const WithType =
              item.hadInterview && item.interviewType
                ? INTERVIEW_TYPE_META[item.interviewType]
                : null;

            return (
              <article
                key={item.id}
                className={[
                  'relative group rounded-xl border border-neutral-200/80 p-5 shadow-sm transition-all',
                  'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70',
                  'hover:-translate-y-0.5 hover:shadow-md',
                  'before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl',
                  'before:bg-gradient-to-b before:from-rose-500 before:via-pink-500 before:to-fuchsia-500',
                  'before:opacity-90',
                ].join(' ')}
              >
                {/* Top-right actions: Edit + Move on top, Delete below */}
                <div className="absolute right-3 top-3 z-10 flex flex-col items-center gap-1">
                  <div className="flex flex-row gap-2">
                    {/* Edit (blue) */}
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 shadow-sm hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      aria-label="Edit rejected application"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    {/* Move (green) */}
                    <button
                      type="button"
                      onClick={() => handleMove(item)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                      aria-label="Move rejected application"
                    >
                      <ArrowRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  {/* Delete (rose) */}
                  <button
                    type="button"
                    onClick={() => openDeleteDialog(item)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 shadow-sm hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    aria-label="Delete rejected application"
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
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-700">
                      {item.company.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-neutral-900">
                      {item.company}
                    </h2>
                    <p className="flex items-center gap-1 truncate text-sm text-neutral-600">
                      <Briefcase
                        className="h-3.5 w-3.5 text-neutral-400"
                        aria-hidden="true"
                      />
                      {item.role}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div
                  className="mt-3 h-px w-full bg-neutral-200/80"
                  role="separator"
                  aria-hidden="true"
                />

                {/* Details */}
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar
                      className="h-4 w-4 text-neutral-500"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col">
                      <dt className="text-neutral-500">Decision date</dt>
                      <dd className="font-medium text-neutral-900">{date}</dd>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.hadInterview && WithType?.Icon ? (
                      <WithType.Icon
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <Ban
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex flex-col">
                      <dt className="text-neutral-500">Interview</dt>
                      <dd className="font-medium text-neutral-900">
                        {item.hadInterview
                          ? `With interview (${WithType?.label ?? 'N/A'})`
                          : 'No interview'}
                      </dd>
                    </div>
                  </div>

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

                  {item.contact?.name && (
                    <div className="flex items-center gap-2">
                      <User2
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col">
                        <dt className="text-neutral-500">Contact</dt>
                        <dd className="font-medium text-neutral-900">
                          {item.contact.name}
                          {item.contact.email ? (
                            <>
                              {' '}
                              <span className="text-neutral-500">·</span>{' '}
                              <a
                                href={`mailto:${item.contact.email}`}
                                className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                              >
                                {item.contact.email}
                              </a>
                            </>
                          ) : null}
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>

                {/* Footer actions */}
                {item.url && (
                  <div className="mt-4 flex items-center justify-end">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-neutral-900 hover:underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-700"
                    >
                      <LinkIcon className="h-4 w-4" aria-hidden="true" />
                      Job posting
                    </a>
                  </div>
                )}
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              <div className="mb-2 text-5xl">💔</div>

              {rejected.length === 0 ? (
                <>
                  <p className="text-sm text-neutral-700">
                    You don&apos;t have any rejected applications yet.
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Once you mark an application as rejected, it will show up
                    here.
                  </p>
                </>
              ) : (
                <p className="text-sm text-neutral-700">
                  No rejected applications match your search.
                </p>
              )}
            </div>
          )}

          {/* Dialog mount */}
          <MoveToRejectedDialog
            open={dialogOpen}
            onClose={handleDialogClose}
            application={dialogApplication} // prefill for edit / null for add
            onRejectionCreated={handleRejectionCreated}
          />
        </div>
      </section>
    </>
  );
}
