// app/applied/page.tsx
'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  MapPin,
  CalendarDays,
  Briefcase,
  ExternalLink,
  Phone,
  Mail,
  User,
  FileText,
  Pencil,
  Building2,
  Tag,
  Banknote,
  Trash2,
  MoveRight,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';
import { animateCardExit } from './cardExitAnimation';

import AddApplicationDialog, {
  NewApplicationForm,
} from './AddApplicationDialog';
import MoveApplicationDialog from './MoveApplicationDialog';

type Application = {
  id: string;
  website?: string;
} & NewApplicationForm;

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

// Reusable section label with gradient highlight line
function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <Icon className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="h-0.5 w-16 rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-amber-400" />
    </div>
  );
}

export default function AppliedPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);

  // Move dialog state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [appBeingMoved, setAppBeingMoved] = useState<Application | null>(null);

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

  const moveToRejected = () => {
    moveOutOfApplied();
  };

  const moveToWithdrawn = () => {
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
        {filtered.map((app) => {
          const isOpen = !!expanded[app.id];
          return (
            <article
              id={`application-card-${app.id}`}
              key={app.id}
              className={[
                'relative group grid grid-cols-[64px,1fr,auto] items-center gap-4',
                'rounded-xl border border-neutral-200/80',
                'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70',
                'p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                'before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl',
                'before:bg-gradient-to-b before:from-sky-500 before:via-fuchsia-500 before:to-amber-500',
                'before:opacity-90',
              ].join(' ')}
            >
              {/* Logo */}
              <div
                className={[
                  'relative h-14 w-14 shrink-0 overflow-hidden rounded-xl',
                  'border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-fuchsia-50',
                  'ring-1 ring-white/70 shadow-sm',
                ].join(' ')}
              >
                {app.logoUrl?.trim() ? (
                  <img
                    src={app.logoUrl}
                    alt={`${app.company} logo`}
                    className="absolute inset-0 h-full w-full object-contain p-1.5"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="100%" height="100%" rx="12" fill="%23e0f2fe"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%230375f5">Logo</text></svg>';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Briefcase
                      className="h-6 w-6 text-sky-500"
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>

              {/* Card header */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-neutral-900">
                    {app.company}
                  </h2>
                  <span className="text-sm text-neutral-600">
                    • {app.role}
                  </span>
                  <span
                    className={[
                      'ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      statusClasses(app.status),
                    ].join(' ')}
                  >
                    {app.status}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700">
                  {app.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin
                        className="h-4 w-4 text-neutral-400"
                        aria-hidden="true"
                      />
                      {app.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays
                      className="h-4 w-4 text-neutral-400"
                      aria-hidden="true"
                    />
                    Applied {fmtDate(app.appliedOn)}
                  </span>
                  {app.startDate && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays
                        className="h-4 w-4 text-neutral-400"
                        aria-hidden="true"
                      />
                      Start {fmtDate(app.startDate)}
                    </span>
                  )}
                  {app.salary && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase
                        className="h-4 w-4 text-neutral-400"
                        aria-hidden="true"
                      />
                      {app.salary}
                    </span>
                  )}
                  {app.website && (
                    <a
                      href={app.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-700"
                    >
                      <ExternalLink
                        className="h-4 w-4 text-neutral-400"
                        aria-hidden="true"
                      />
                      Website
                    </a>
                  )}
                </div>
              </div>

              {/* Edit + move + delete + expand buttons */}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingApp(app);
                    setDialogOpen(true);
                  }}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium',
                    'text-neutral-800',
                    'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
                    'border border-neutral-200 shadow-sm',
                    'hover:bg-white active:bg-neutral-50',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300',
                  ].join(' ')}
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => openMoveDialog(app)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium',
                    'text-sky-800',
                    'bg-sky-50/80 backdrop-blur supports-[backdrop-filter]:bg-sky-50/70',
                    'border border-sky-200 shadow-sm',
                    'hover:bg-sky-50 active:bg-sky-100',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300',
                  ].join(' ')}
                >
                  <MoveRight className="h-3 w-3" aria-hidden="true" />
                  Move
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(app.id)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium',
                    'text-rose-700',
                    'bg-rose-50/80 backdrop-blur supports-[backdrop-filter]:bg-rose-50/70',
                    'border border-rose-200 shadow-sm',
                    'hover:bg-rose-50 active:bg-rose-100',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-300',
                  ].join(' ')}
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  Delete
                </button>

                <button
                  type="button"
                  onClick={() => toggle(app.id)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? 'Collapse details' : 'Expand details'}
                  className={[
                    'inline-flex items-center rounded-md px-2.5 py-1.5 text-sm',
                    'text-neutral-800',
                    'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
                    'border border-neutral-200 shadow-sm',
                    'hover:bg-white active:bg-neutral-50',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-fuchsia-300',
                  ].join(' ')}
                >
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {isOpen && (
                <div className="col-span-3 mt-3 space-y-4 rounded-xl border border-neutral-200 bg-gradient-to-br from-sky-50/80 via-white to-amber-50/80 p-4 text-sm text-neutral-800">
                  {/* Top meta / timeline strip */}
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200/70 bg-white/80 px-3 py-2.5">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                      <CalendarDays
                        className="h-3.5 w-3.5 text-neutral-400"
                        aria-hidden="true"
                      />
                      <span className="text-neutral-500">Applied</span>
                      <span className="text-neutral-900">
                        {fmtDate(app.appliedOn)}
                      </span>
                    </div>

                    {app.startDate && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                        <CalendarDays
                          className="h-3.5 w-3.5 text-neutral-400"
                          aria-hidden="true"
                        />
                        <span className="text-neutral-500">Start</span>
                        <span className="text-neutral-900">
                          {fmtDate(app.startDate)}
                        </span>
                      </div>
                    )}

                    {app.employmentType && (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900 ring-1 ring-inset ring-sky-100">
                        <Briefcase
                          className="h-3.5 w-3.5 text-sky-400"
                          aria-hidden="true"
                        />
                        {app.employmentType}
                      </div>
                    )}

                    {app.location && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                        <MapPin
                          className="h-3.5 w-3.5 text-neutral-400"
                          aria-hidden="true"
                        />
                        {app.location}
                      </div>
                    )}

                    <div className="ml-auto inline-flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-500">
                        Status
                      </span>
                      <span
                        className={[
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          statusClasses(app.status),
                        ].join(' ')}
                      >
                        {app.status}
                      </span>
                    </div>
                  </div>

                  {/* Main content: left (details) + right (contact / actions) */}
                  <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    {/* LEFT PANEL: Application + Offer */}
                    <div className="space-y-3 rounded-lg border border-neutral-200/70 bg-white/80 p-4">
                      {/* Header */}
                      <div className="flex flex-wrap items.center justify-between gap-2">
                        <SectionLabel icon={FileText} label="Application" />

                        {app.source && (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200">
                            <Tag
                              className="h-3 w-3 text-neutral-400"
                              aria-hidden="true"
                            />
                            <span>Source: {app.source}</span>
                          </div>
                        )}
                      </div>

                      {/* 2-column grid: left vertical + right vertical */}
                      <div className="mt-3 grid gap-x-8 gap-y-1.5 text-xs text-neutral-800 sm:grid-cols-2">
                        {/* Row 1 */}
                        <div className="inline-flex items-center gap-1.5">
                          <Building2
                            className="h-3.5 w-3.5 text-neutral-400"
                            aria-hidden="true"
                          />
                          <span className="font-medium text-neutral-700">
                            Company:
                          </span>
                          <span className="text-neutral-900">
                            {app.company}
                          </span>
                        </div>

                        {app.role && (
                          <div className="inline-flex items-center gap-1.5">
                            <Briefcase
                              className="h-3.5 w-3.5 text-neutral-400"
                              aria-hidden="true"
                            />
                            <span className="font-medium text-neutral-700">
                              Role:
                            </span>
                            <span className="text-neutral-900">
                              {app.role}
                            </span>
                          </div>
                        )}

                        {/* Row 2 */}
                        {app.location && (
                          <div className="inline-flex items-center gap-1.5">
                            <MapPin
                              className="h-3.5 w-3.5 text-neutral-400"
                              aria-hidden="true"
                            />
                            <span className="font-medium text-neutral-700">
                              Location:
                            </span>
                            <span className="text-neutral-900">
                              {app.location}
                            </span>
                          </div>
                        )}

                        <div className="inline-flex items-center gap-1.5">
                          <CalendarDays
                            className="h-3.5 w-3.5 text-neutral-400"
                            aria-hidden="true"
                          />
                          <span className="font-medium text-neutral-700">
                            Applied:
                          </span>
                          <span className="text-neutral-900">
                            {fmtDate(app.appliedOn)}
                          </span>
                        </div>

                        {/* Row 3 */}
                        {app.startDate && (
                          <div className="inline-flex items-center gap-1.5">
                            <CalendarDays
                              className="h-3.5 w-3.5 text-neutral-400"
                              aria-hidden="true"
                            />
                            <span className="font-medium text-neutral-700">
                              Start date:
                            </span>
                            <span className="text-neutral-900">
                              {fmtDate(app.startDate)}
                            </span>
                          </div>
                        )}

                        {app.employmentType && (
                          <div className="inline-flex items-center gap-1.5">
                            <Briefcase
                              className="h-3.5 w-3.5 text-neutral-400"
                              aria-hidden="true"
                            />
                            <span className="font-medium text-neutral-700">
                              Employment:
                            </span>
                            <span className="text-neutral-900">
                              {app.employmentType}
                            </span>
                          </div>
                        )}

                        {/* Row 4 – full width */}
                        <div className="inline-flex items-center gap-1.5 sm:col-span-2">
                          <Tag
                            className="h-3.5 w-3.5 text-neutral-400"
                            aria-hidden="true"
                          />
                          <span className="font-medium text-neutral-700">
                            Status:
                          </span>
                          <span className="text-neutral-900">
                            {app.status}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="mt-3 border-t border-dashed border-neutral-200" />

                      {/* Offer section */}
                      <div className="space-y-2">
                        <SectionLabel
                          icon={Briefcase}
                          label="Offer details"
                        />

                        <div className="mt-1 grid gap-x-8 gap-y-1.5 text-xs text-neutral-800 sm:grid-cols-2">
                          {/* Row 1: Salary (left) + Job posting (right) */}
                          {app.salary && (
                            <div className="inline-flex items-center gap-1.5">
                              <Banknote
                                className="h-3.5 w-3.5 text-neutral-400"
                                aria-hidden="true"
                              />
                              <span className="font-medium text-neutral-700">
                                Salary / range:
                              </span>
                              <span className="text-neutral-900">
                                {app.salary}
                              </span>
                            </div>
                          )}

                          {app.offerUrl && (
                            <div className="inline-flex items-center gap-1.5">
                              <ExternalLink
                                className="h-3.5 w-3.5 text-neutral-400"
                                aria-hidden="true"
                              />
                              <span className="font-medium text-neutral-700">
                                Job posting:
                              </span>
                              <a
                                href={app.offerUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:decoration-sky-700"
                              >
                                Open posting
                              </a>
                            </div>
                          )}

                          {/* Row 2: Company site full width */}
                          {app.website && (
                            <div className="inline-flex items-center gap-1.5 sm:col-span-2">
                              <ExternalLink
                                className="h-3.5 w-3.5 text-neutral-400"
                                aria-hidden="true"
                              />
                              <span className="font-medium text-neutral-700">
                                Company site:
                              </span>
                              <a
                                href={app.website}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-neutral-800 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-700"
                              >
                                Open website
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT PANEL: Contact + quick actions */}
                    <div className="space-y-3 rounded-lg border border-neutral-200/70 bg-white/80 p-4">
                      <SectionLabel icon={User} label="Contact" />

                      <ul className="space-y-1.5 text-xs text-neutral-800">
                        {app.contactPerson && (
                          <li className="inline-flex items-center gap-1.5">
                            <User
                              className="h-3.5 w-3.5 text-neutral-400"
                              aria-hidden="true"
                            />
                            <span className="font-medium text-neutral-900">
                              {app.contactPerson}
                            </span>
                          </li>
                        )}
                        {app.contactEmail && (
                          <li>
                            <a
                              href={`mailto:${app.contactEmail}`}
                              className="inline-flex items-center gap-1.5 underline decoration-neutral-300 underline-offset-2 text-neutral-800 hover:decoration-neutral-700"
                            >
                              <Mail
                                className="h-3.5 w-3.5 text-neutral-400"
                                aria-hidden="true"
                              />
                              {app.contactEmail}
                            </a>
                          </li>
                        )}
                        {app.contactPhone && (
                          <li>
                            <a
                              href={`tel:${app.contactPhone}`}
                              className="inline-flex items-center gap-1.5 underline decoration-neutral-300 underline-offset-2 text-neutral-800 hover:decoration-neutral-700"
                            >
                              <Phone
                                className="h-3.5 w-3.5 text-neutral-400"
                                aria-hidden="true"
                              />
                              {app.contactPhone}
                            </a>
                          </li>
                        )}
                        {!app.contactPerson &&
                          !app.contactEmail &&
                          !app.contactPhone && (
                            <li className="text-neutral-500">
                              No contact details added yet.
                            </li>
                          )}
                      </ul>

                      {/* Quick actions */}
                      {(app.offerUrl || app.website || app.contactEmail) && (
                        <>
                          <div className="mt-3 border-t border-dashed border-neutral-200" />
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                              Quick actions
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {app.offerUrl && (
                                <a
                                  href={app.offerUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100"
                                >
                                  <ExternalLink
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  Job posting
                                </a>
                              )}
                              {app.website && (
                                <a
                                  href={app.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
                                >
                                  <ExternalLink
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  Company site
                                </a>
                              )}
                              {app.contactEmail && (
                                <a
                                  href={`mailto:${app.contactEmail}`}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                                >
                                  <Mail
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  Email contact
                                </a>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* NOTES */}
                  <div className="rounded-lg border border-dashed border-neutral-200 bg-white/80 px-4 py-3">
                    <SectionLabel icon={FileText} label="Notes" />

                    {app.notes ? (
                      <p className="mt-1 whitespace-pre-line text-sm text-neutral-800">
                        {app.notes}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-neutral-500">
                        No additional notes yet. Use this space to track
                        interview prep, follow-up dates, or anything important.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}

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
        application={appBeingMoved}
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
