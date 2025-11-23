// app/applied/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { Search, Plus, Filter } from 'lucide-react';

import { animateCardExit } from '../../components/cardExitAnimation';

import AddApplicationDialog, {
  type NewApplicationForm,
} from '../../components/AddApplicationDialog';
import MoveApplicationDialog from '../../components/MoveApplicationDialog';
import type { RejectionDetails } from '../../components/MoveToRejectedDialog';
import type { WithdrawnDetails } from '../../components/MoveToWithdrawnDialog';
import ApplicationCard, {
  type Application,
} from './ApplicationCard';

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

const REJECTIONS_STORAGE_KEY = 'job-tracker:rejected';
const WITHDRAWN_STORAGE_KEY = 'job-tracker:withdrawn';

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
  const { id, website, ...rest } = app;
  return rest;
}

export default function AppliedPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);

  // Move dialog state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [appBeingMoved, setAppBeingMoved] = useState<Application | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return applications;
    return applications.filter((a) =>
      [a.company, a.role, a.location, a.status]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [applications, query]);

  const toggle = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const handleCreate = (data: NewApplicationForm) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const newApp: Application = {
      id,
      ...data,
    };

    setApplications((prev) => [newApp, ...prev]);
  };

  const handleUpdate = (data: NewApplicationForm) => {
    if (!editingApp) return;
    setApplications((prev) =>
      prev.map((app) =>
        app.id === editingApp.id
          ? { ...app, ...data } // keep id & website from old
          : app,
      ),
    );
  };

  const handleSave = (data: NewApplicationForm) => {
    if (editingApp) {
      handleUpdate(data);
    } else {
      handleCreate(data);
    }
    setDialogOpen(false);
    setEditingApp(null);
  };

  const handleDelete = (id: string) => {
    const elementId = `application-card-${id}`;

    animateCardExit(elementId, 'delete', () => {
      // actually remove from state AFTER animation
      setApplications((prev) => prev.filter((app) => app.id !== id));

      setExpanded((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      if (editingApp?.id === id) {
        setEditingApp(null);
        setDialogOpen(false);
      }
    });
  };

  // --- Move dialog helpers ---

  const openMoveDialog = (app: Application) => {
    setAppBeingMoved(app);
    setMoveDialogOpen(true);
  };

  const closeMoveDialog = () => {
    setMoveDialogOpen(false);
    setAppBeingMoved(null);
  };

  // When moving an application OUT of "Applied",
  // we play the move animation, then remove it from this list.
  const moveOutOfApplied = () => {
    if (!appBeingMoved) return;

    const id = appBeingMoved.id;
    const elementId = `application-card-${id}`;

    animateCardExit(elementId, 'move', () => {
      setApplications((prev) => prev.filter((app) => app.id !== id));

      setExpanded((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      // After this, if it was the last application,
      // applications.length === 0 and filtered.length === 0,
      // so the "No applications yet..." empty-state shows.
      closeMoveDialog();
    });
  };

  const moveToInterviews = () => {
    // you can also trigger any global/state updates here if needed
    moveOutOfApplied();
  };

  const moveToRejected = (details: RejectionDetails) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const newRejection: StoredRejection = {
      id,
      ...details,
    };

    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(REJECTIONS_STORAGE_KEY);
        let existing: StoredRejection[] = [];
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            existing = parsed;
          }
        }
        const next = [...existing, newRejection];
        window.localStorage.setItem(
          REJECTIONS_STORAGE_KEY,
          JSON.stringify(next),
        );
      } catch (err) {
        console.error('Failed to persist rejected application', err);
      }
    }

    moveOutOfApplied();
  };

  const moveToWithdrawn = (details: WithdrawnDetails) => {
    if (!appBeingMoved) {
      moveOutOfApplied();
      return;
    }

    const source = appBeingMoved;

    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const newWithdrawn: StoredWithdrawn = {
      id,
      company: details.company || source.company,
      role: details.role || source.role,
      location: details.location || source.location,
      appliedOn: details.appliedDate || source.appliedOn,
      employmentType:
        details.employmentType || source.employmentType,
      contactName: details.contactName || source.contactPerson,
      contactEmail: details.contactEmail || source.contactEmail,
      contactPhone: details.contactPhone || source.contactPhone,
      url: details.url || source.offerUrl,
      logoUrl: details.logoUrl || source.logoUrl,
      notes: details.notes || source.notes,
      withdrawnDate: details.withdrawnDate,
      withdrawnReason: details.reason,
    };

    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(WITHDRAWN_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const existing: StoredWithdrawn[] = Array.isArray(parsed)
          ? parsed
          : [];
        const next = [...existing, newWithdrawn];
        window.localStorage.setItem(
          WITHDRAWN_STORAGE_KEY,
          JSON.stringify(next),
        );
      } catch (err) {
        console.error('Failed to persist withdrawn application', err);
      }
    }

    moveOutOfApplied();
  };

  return (
    <section
      className={[
        'relative rounded-2xl border border-neutral-200/70',
        'bg-gradient-to-br from-sky-50 via-fuchsia-50 to-amber-50',
        'p-8 shadow-md overflow-hidden',
      ].join(' ')}
    >
      {/* soft color blobs */}
      <div className="pointer-events-none absolute -top-20 -right-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-28 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl" />

      <h1 className="text-2xl font-semibold text-neutral-900">Applied</h1>
      <p className="mt-1 text-neutral-700">
        List of your submitted applications.
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

        {/* Add */}
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

        {/* Filter (placeholder) */}
        <button
          type="button"
          className={[
            'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800',
            'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
            'border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300',
          ].join(' ')}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filter
        </button>
      </div>

      {/* Results grid */}
      <div className="mt-5 grid grid-cols-1 gap-3">
        {filtered.map((app) => (
          <ApplicationCard
            key={app.id}
            app={app}
            isExpanded={!!expanded[app.id]}
            onToggle={() => toggle(app.id)}
            onEdit={(a) => {
              setEditingApp(a);
              setDialogOpen(true);
            }}
            onMove={openMoveDialog}
            onDelete={handleDelete}
            fmtDate={fmtDate}
            statusClasses={statusClasses}
          />
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
            <div className="mb-2 text-5xl">🔎</div>
            <p className="text-sm text-neutral-700">
              {applications.length === 0
                ? 'No applications yet. Click “Add” to create your first one.'
                : 'No applications match your search.'}
            </p>
          </div>
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
    </section>
  );
}
