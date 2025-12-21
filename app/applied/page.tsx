'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Search, Plus, History, X } from 'lucide-react';
import Image from 'next/image';
import { animateCardExit } from '@/components/dialogs/cardExitAnimation';

import AddApplicationDialog, {
  type NewApplicationForm,
} from '@/components/dialogs/AddApplicationDialog';
import MoveApplicationDialog from '@/components/dialogs/MoveApplicationDialog';
import type { RejectionDetails } from '@/components/dialogs/MoveToRejectedDialog';
import type { WithdrawnDetails } from '@/components/dialogs/MoveToWithdrawnDialog';
import type { Interview } from '@/components/dialogs/ScheduleInterviewDialog';
import ApplicationCard, { type Application } from '@/components/cards/ApplicationCard';
import ActivityLogSidebar from '@/components/ui/ActivityLogSidebar';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/supabase/client';
import {
  loadApplied,
  upsertApplied,
  deleteApplied,
  migrateGuestAppliedToUser,
  type AppliedStorageMode,
} from '@/lib/services/applied';
import {
  upsertInterview,
  detectInterviewsMode,
} from '@/lib/services/interviews';
import { upsertRejected, detectRejectedMode } from '@/lib/services/rejected';
import { upsertWithdrawn, detectWithdrawnMode } from '@/lib/services/withdrawn';

import ApplicationsFilter, {
  DEFAULT_APPLICATION_FILTERS,
  getActiveFilterCount,
  filterApplications,
  type ApplicationFilters,
} from '@/components/filters/ApplicationsFilter';

import ThreeBounceSpinner from '@/components/ui/ThreeBounceSpinner';

// Persistent activity storage.
import {
  loadActivity,
  appendActivity,
  migrateGuestActivityToUser,
  type ActivityItem,
  type ActivityType,
  type ActivityVariant,
  type ActivityStorageMode,
} from '@/lib/services/activity';

type StoredRejection = RejectionDetails & { id: string };

type StoredWithdrawn = {
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
  notes?: string;
  withdrawnDate?: string;
  withdrawnReason?: WithdrawnDetails['reason'];
};

function fmtDate(d: string) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function statusClasses(status: string) {
  const s = status.toLowerCase();
  if (s.includes('interview'))
    return 'bg-indigo-100 text-indigo-800 ring-1 ring-inset ring-indigo-300';
  if (s.includes('offer'))
    return 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300';
  if (s.includes('rejected') || s.includes('declined'))
    return 'bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-300';
  if (s.includes('submitted'))
    return 'bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-300';
  if (s.includes('withdrawn') || s.includes('stopped'))
    return 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300';
  return 'bg-cyan-100 text-cyan-800 ring-1 ring-inset ring-cyan-300';
}

// Helper to convert full Application -> dialog form data
function appToForm(app: Application): NewApplicationForm {
  const { ...rest } = app;
  return rest;
}

// UUID helper (works even without crypto.randomUUID).
function makeUuidV4() {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();

  const buf = new Uint8Array(16);
  cryptoObj?.getRandomValues?.(buf);

  // If crypto is missing (rare), fall back to a Math.random-based UUID v4 shape.
  if (!cryptoObj?.getRandomValues) {
    const s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return s;
  }

  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;

  const hex = [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`;
}

export default function AppliedPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [storageMode, setStorageMode] = useState<AppliedStorageMode>('guest');

  const [hydrated, setHydrated] = useState(false);

  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);

  // Move dialog state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [appBeingMoved, setAppBeingMoved] = useState<Application | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);

  // Activity sidebar / log state (Applied page)
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityMode, setActivityMode] = useState<ActivityStorageMode>('guest');

  // Shared filters state
  const [filters, setFilters] =
    useState<ApplicationFilters>(DEFAULT_APPLICATION_FILTERS);

  // ---------- load initial data + auth switching ----------
  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseClient();

    const loadApps = async () => {
      try {
        const { mode, items } = await loadApplied();
        if (!alive) return;
        setStorageMode(mode);
        setApplications(items);
      } catch (err) {
        console.error('Failed to load applied applications:', err);
      } finally {
        if (alive) setHydrated(true);
      }
    };

    const loadAppliedActivity = async () => {
      const { mode, items } = await loadActivity('applied');
      if (!alive) return;
      setActivityMode(mode);
      setActivityItems(items);
    };

    // Initial load
    void loadApps();
    void loadAppliedActivity();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!alive) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            if (!alive) return;

            // Migrate guest data (applications + activity), then reload.
            await migrateGuestAppliedToUser();
            await migrateGuestActivityToUser();

            await loadApps();
            await loadAppliedActivity();
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setTimeout(async () => {
            if (!alive) return;
            await loadApps();
            await loadAppliedActivity();
          }, 0);
        }
      },
    );

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  /**
   * Persistent activity logger:
   * - Writes to Supabase in user mode, otherwise guest storage.
   * - Updates local state for the current page's sidebar.
   */
  const logActivity = useCallback(
    async (
      variant: ActivityVariant,
      type: ActivityType,
      app: Application | null,
      extras?: Partial<ActivityItem>,
      overrideAppId?: string, // when the target page card uses a different id (e.g. rejected/withdrawn new record)
    ) => {
      if (!app) return;

      const entry: ActivityItem = {
        id: makeUuidV4(),
        appId: overrideAppId ?? app.id,
        type,
        timestamp: new Date().toISOString(),
        company: app.company,
        role: app.role,
        location: app.location,
        appliedOn: app.appliedOn,
        ...extras,
      };

      const saved = await appendActivity(variant, entry, activityMode);

      // only keep Applied page sidebar state in sync when logging for "applied"
      if (variant === 'applied') {
        setActivityItems((prev) => [saved, ...prev].slice(0, 100));
      }
    },
    [activityMode],
  );

  // ---------- filtered list ----------
  const filtered = useMemo(
    () => filterApplications(applications, query, filters),
    [applications, query, filters],
  );

  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters),
    [filters],
  );

  const cardCount = filtered.length;

  // ---------- create / update ----------
  const handleCreate = async (data: NewApplicationForm) => {
    const id = makeUuidV4();

    const newApp: Application = {
      id,
      ...data,
    };

    setApplications((prev) => [newApp, ...prev]);

    // persist (guest or user)
    await upsertApplied(newApp, storageMode);

    await logActivity('applied', 'added', newApp, {
      toStatus: newApp.status,
      note: 'Application created',
    });
  };

  const handleUpdate = async (data: NewApplicationForm) => {
    if (!editingApp) return;

    const updatedApp: Application = { ...editingApp, ...data };

    setApplications((prev) =>
      prev.map((app) => (app.id === editingApp.id ? updatedApp : app)),
    );

    await upsertApplied(updatedApp, storageMode);

    await logActivity('applied', 'edited', updatedApp, {
      fromStatus: editingApp.status,
      toStatus: data.status,
    });
  };

  const handleSave = async (data: NewApplicationForm) => {
    if (editingApp) {
      await handleUpdate(data);
    } else {
      await handleCreate(data);
    }
    setDialogOpen(false);
    setEditingApp(null);
  };

  // ---------- delete ----------
  const openDeleteDialog = (app: Application) => {
    setDeleteTarget(app);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const elementId = `application-card-${id}`;

    await logActivity('applied', 'deleted', deleteTarget, {
      fromStatus: deleteTarget.status,
      note: 'Application removed from Applied list',
    });

    animateCardExit(elementId, 'delete', async () => {
      setApplications((prev) => prev.filter((app) => app.id !== id));

      if (editingApp?.id === id) {
        setEditingApp(null);
        setDialogOpen(false);
      }

      // persist delete
      await deleteApplied(id, storageMode);

      setDeleteTarget(null);
    });
  };

  // ---------- move dialog helpers ----------
  const openMoveDialog = (app: Application) => {
    setAppBeingMoved(app);
    setMoveDialogOpen(true);
  };

  const closeMoveDialog = () => {
    setMoveDialogOpen(false);
    setAppBeingMoved(null);
  };

  // When moving an application OUT of "Applied"
  const moveOutOfApplied = () => {
    if (!appBeingMoved) return;

    const id = appBeingMoved.id;
    const elementId = `application-card-${id}`;

    animateCardExit(elementId, 'move', async () => {
      setApplications((prev) => prev.filter((app) => app.id !== id));

      // persist delete from Applied bucket
      await deleteApplied(id, storageMode);

      closeMoveDialog();
    });
  };

  const moveToInterviews = async (interview: Interview) => {
    if (!appBeingMoved) {
      moveOutOfApplied();
      return;
    }

    // Persist interview card.
    const interviewsMode = await detectInterviewsMode();
    await upsertInterview(interview as any, interviewsMode);

    // Log on Applied page.
    await logActivity('applied', 'moved_to_interviews', appBeingMoved, {
      fromStatus: 'Applied',
      toStatus: 'Interviews',
    });

    // Log on Interviews page.
    await logActivity('interviews', 'moved_to_interviews', appBeingMoved, {
      fromStatus: 'Applied',
      toStatus: 'Interviews',
    });

    moveOutOfApplied();
  };

  const moveToRejected = async (details: RejectionDetails) => {
    const id = makeUuidV4();

    const newRejection: StoredRejection = {
      id,
      ...details,
    };

    await upsertRejected(newRejection as any, await detectRejectedMode());

    if (appBeingMoved) {
      // Log on Applied page.
      await logActivity('applied', 'moved_to_rejected', appBeingMoved, {
        fromStatus: 'Applied',
        toStatus: 'Rejected',
        note: 'Marked as rejected',
      });

      // Also log on Rejected page (appId should match the rejected-card id).
      await logActivity(
        'rejected',
        'moved_to_rejected',
        appBeingMoved,
        {
          fromStatus: 'Applied',
          toStatus: 'Rejected',
          note: newRejection.notes,
          appliedOn: newRejection.appliedDate,
          company: newRejection.company,
          role: newRejection.role,
          location: newRejection.location,
        },
        newRejection.id,
      );
    }

    moveOutOfApplied();
  };

  const moveToWithdrawn = async (details: WithdrawnDetails) => {
    if (!appBeingMoved) {
      moveOutOfApplied();
      return;
    }

    const source = appBeingMoved;
    const id = makeUuidV4();

    const newWithdrawn: StoredWithdrawn = {
      id,
      company: details.company || source.company,
      role: details.role || source.role,
      location: details.location || source.location,
      appliedOn: details.appliedDate || source.appliedOn,
      employmentType: details.employmentType || source.employmentType,
      contactName: details.contactName || source.contactPerson,
      contactEmail: details.contactEmail || source.contactEmail,
      contactPhone: details.contactPhone || source.contactPhone,
      url: details.url || source.offerUrl,
      logoUrl: details.logoUrl || source.logoUrl,
      notes: details.notes || source.notes,
      withdrawnDate: details.withdrawnDate,
      withdrawnReason: details.reason,
    };

    await upsertWithdrawn(newWithdrawn as any, await detectWithdrawnMode());

    // Log on Applied page.
    await logActivity('applied', 'moved_to_withdrawn', source, {
      fromStatus: 'Applied',
      toStatus: 'Withdrawn',
      note: details.reason || 'Moved to withdrawn',
    });

    // Also log on Withdrawn page (appId should match withdrawn-card id).
    await logActivity(
      'withdrawn',
      'moved_to_withdrawn',
      source,
      {
        fromStatus: 'Applied',
        toStatus: 'Withdrawn',
        note: newWithdrawn.notes || newWithdrawn.withdrawnReason,
        appliedOn: newWithdrawn.appliedOn,
        company: newWithdrawn.company,
        role: newWithdrawn.role,
        location: newWithdrawn.location,
      },
      newWithdrawn.id,
    );

    moveOutOfApplied();
  };

  const hasAnyApplications = applications.length > 0;

  return (
    <>
      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[13000] flex items-center justify-center px-4 py-8">
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
              Delete application?
            </h2>
            <p className="mt-2 text-sm text-neutral-700">
              This will permanently remove your application to{' '}
              <span className="font-medium">{deleteTarget.company}</span> for
              the role <span className="font-medium">{deleteTarget.role}</span>.
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
                Delete application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity sidebar (Applied) */}
      <ActivityLogSidebar
        variant="applied"
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        items={activityItems}
      />

      <section
        className={[
          'relative rounded-2xl border border-neutral-200/70',
          'bg-gradient-to-br from-sky-50 via-fuchsia-50 to-amber-50',
          'p-8 shadow-md',
        ].join(' ')}
      >
        {/* Decorative background layer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -top-20 -right-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-28 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Image
                src="/icons/checklist.png"
                alt=""
                width={37}
                height={37}
                aria-hidden="true"
                className="shrink-0"
              />
              <h1 className="text-2xl font-semibold text-neutral-900">
                Applied
              </h1>
              <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white/80 px-2.5 py-0.5 text-xs font-medium text-neutral-800 shadow-sm">
                {cardCount} card{cardCount === 1 ? '' : 's'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActivityOpen(true)}
              className={[
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800',
                'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70',
                'border border-neutral-200 shadow-sm hover:bg-white',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300',
              ].join(' ')}
            >
              <History className="h-4 w-4 text-sky-600" aria-hidden="true" />
              <span>Activity log</span>
              {activityItems.length > 0 && (
                <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                  {activityItems.length}
                </span>
              )}
            </button>
          </div>

          <p className="mt-1 text-neutral-700">
            List of your submitted applications.
          </p>

          {/* Toolbar */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search company, role, location, status…"
                aria-label="Search applications"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={[
                  'h-11 w-full rounded-lg pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500',
                  'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
                  'border border-neutral-200 shadow-sm',
                  'hover:bg-white focus:bg-white',
                  'ring-1 ring-transparent',
                  'focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-300',
                  'transition-shadow',
                ].join(' ')}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingApp(null);
                setDialogOpen(true);
              }}
              className={[
                'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800',
                'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
                'border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300',
              ].join(' ')}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </button>

            <ApplicationsFilter
              applications={applications}
              filters={filters}
              onChange={setFilters}
              filteredCount={filtered.length}
              listLabel="applied"
            />
          </div>

          {/* Results grid */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {!hydrated ? (
              <div className="col-span-full flex items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
                <ThreeBounceSpinner label="Loading applications" />
              </div>
            ) : (
              <>
                {filtered.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    onEdit={(a) => {
                      setEditingApp(a);
                      setDialogOpen(true);
                    }}
                    onMove={openMoveDialog}
                    onDelete={openDeleteDialog}
                    fmtDate={fmtDate}
                  />
                ))}

                {filtered.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
                    <div className="mb-2 text-5xl">🔎</div>
                    <p className="text-sm text-neutral-700">
                      {!hasAnyApplications
                        ? 'No applications yet. Click “Add” to create your first one.'
                        : activeFilterCount > 0
                          ? 'No applications match your filters. Try resetting or broadening them.'
                          : 'No applications match your search.'}
                    </p>

                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilters(DEFAULT_APPLICATION_FILTERS)}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reset filters
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Move dialog */}
          <MoveApplicationDialog
            open={moveDialogOpen}
            application={
              appBeingMoved && {
                id: appBeingMoved.id,
                company: appBeingMoved.company,
                role: appBeingMoved.role,
                location: appBeingMoved.location,
                status: appBeingMoved.status,
                appliedOn: appBeingMoved.appliedOn,
                contactPerson: appBeingMoved.contactPerson,
                contactEmail: appBeingMoved.contactEmail,
                contactPhone: appBeingMoved.contactPhone,
                offerUrl: appBeingMoved.offerUrl,
                logoUrl: appBeingMoved.logoUrl,
                employmentType: appBeingMoved.employmentType,
                notes: appBeingMoved.notes,
              }
            }
            onClose={closeMoveDialog}
            onMoveToInterviews={moveToInterviews}
            onMoveToRejected={moveToRejected}
            onMoveToWithdrawn={moveToWithdrawn}
            fmtDate={fmtDate}
            statusClasses={statusClasses}
          />

          {/* Add / edit dialog */}
          <AddApplicationDialog
            open={dialogOpen}
            onClose={() => {
              setDialogOpen(false);
              setEditingApp(null);
            }}
            initialData={editingApp ? appToForm(editingApp) : undefined}
            onSave={handleSave}
          />
        </div>
      </section>
    </>
  );
}
