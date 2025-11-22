'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import MoveToRejectedDialog, {
  type RejectionDetails,
} from '@/components/MoveToRejectedDialog';
import RejectedCard, {
  type Rejection,
} from './RejectedCard';
import { Search, Plus, Filter } from 'lucide-react';

const REJECTIONS_STORAGE_KEY = 'job-tracker:rejected';

type ApplicationLike =
  React.ComponentProps<typeof MoveToRejectedDialog>['application'];

export default function RejectedPage() {
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejected, setRejected] = useState<Rejection[]>([]);

  const [dialogApplication, setDialogApplication] =
    useState<ApplicationLike>(null);
  const [editingRejection, setEditingRejection] =
    useState<Rejection | null>(null);

  // Delete confirmation dialog target
  const [deleteTarget, setDeleteTarget] = useState<Rejection | null>(
    null,
  );

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(REJECTIONS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRejected(parsed);
      }
    } catch (err) {
      console.error(
        'Failed to load rejected applications from localStorage',
        err,
      );
    }
  }, []);

  const handleAdd = () => {
    setEditingRejection(null);
    setDialogApplication(null);
    setDialogOpen(true);
  };

  // Edit existing rejection
  const handleEdit = (item: Rejection) => {
    const app: ApplicationLike = {
      id: item.id,
      company: item.company,
      role: item.role,
      location: item.location,
      appliedOn: item.appliedDate,
      employmentType: item.employmentType,
      contactPerson: item.contactName,
      contactEmail: item.contactEmail,
      contactPhone: item.contactPhone,
      offerUrl: item.url,
      logoUrl: item.logoUrl,
    } as ApplicationLike;

    setEditingRejection(item);
    setDialogApplication(app);
    setDialogOpen(true);
  };

  const openDeleteDialog = (item: Rejection) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;

    setRejected((prev) => {
      const next = prev.filter((i) => i.id !== id);

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            REJECTIONS_STORAGE_KEY,
            JSON.stringify(next),
          );
        } catch (err) {
          console.error(
            'Failed to persist rejected applications after delete',
            err,
          );
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
    setEditingRejection(null);
    setDialogApplication(null);
  };

  // Use dialog output to create or update cards
  const handleRejectionCreated = (details: RejectionDetails) => {
    setRejected((prev) => {
      let next: Rejection[];

      if (editingRejection) {
        next = prev.map((item) =>
          item.id === editingRejection.id
            ? { ...item, ...details }
            : item,
        );
      } else {
        const newItem: Rejection = {
          id:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${prev.length}`,
          ...details,
        };
        next = [...prev, newItem];
      }

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            REJECTIONS_STORAGE_KEY,
            JSON.stringify(next),
          );
        } catch (err) {
          console.error(
            'Failed to persist rejected applications to localStorage',
            err,
          );
        }
      }

      return next;
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
        item.contactName,
        item.contactEmail,
        item.rejectionType === 'no-interview'
          ? 'no interview'
          : 'interview',
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
              <span className="font-medium">
                {deleteTarget.company}
              </span>{' '}
              for the role{' '}
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

        <h1 className="text-2xl font-semibold text-neutral-900">
          Rejected
        </h1>
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

          {/* Filter (glass sibling) – still a placeholder */}
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
          {filtered.map((item) => (
            <RejectedCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={openDeleteDialog}
            />
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              <div className="mb-2 text-5xl">💔</div>

              {rejected.length === 0 ? (
                <>
                  <p className="text-sm text-neutral-700">
                    You don&apos;t have any rejected applications yet.
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Once you mark an application as rejected, it will show
                    up here.
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
            application={dialogApplication}
            onRejectionCreated={handleRejectionCreated}
          />
        </div>
      </section>
    </>
  );
}
