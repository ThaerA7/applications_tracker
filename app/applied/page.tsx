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
} from 'lucide-react';
import AddApplicationDialog, {
  NewApplicationForm,
} from './AddApplicationDialog';

type Application = {
  id: string;
  company: string;
  role: string;
  location: string;
  appliedOn: string; // ISO (YYYY-MM-DD) or any parseable date
  status: string;
  logoUrl?: string;
  website?: string;
  salary?: string;
  notes?: string;
};

const DATA: Application[] = [
  {
    id: '1',
    company: 'Acme Corp',
    role: 'Frontend Engineer',
    location: 'Remote • EU',
    appliedOn: '2025-10-29',
    status: 'Applied',
    logoUrl: 'https://logo.clearbit.com/acme.com',
    website: 'https://acme.com',
    salary: '€65k–€80k',
    notes: 'Emailed recruiter; follow up on Nov 12.',
  },
  {
    id: '2',
    company: 'Globex',
    role: 'Full-stack Developer',
    location: 'Berlin, DE',
    appliedOn: '2025-11-01',
    status: 'Interview • Phone screen',
    logoUrl: 'https://logo.clearbit.com/globex.com',
    website: 'https://globex.com',
    salary: '€70k–€85k',
    notes: 'Prepare system design basics; they use Next.js + tRPC.',
  },
  {
    id: '3',
    company: 'Initech',
    role: 'React Engineer',
    location: 'Munich, DE',
    appliedOn: '2025-10-22',
    status: 'Submitted',
    logoUrl: 'https://logo.clearbit.com/initech.com',
    website: 'https://initech.com',
  },
];

function fmtDate(d: string) {
  const date = new Date(d);
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// vivid status chips
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
  return 'bg-cyan-100 text-cyan-800 ring-1 ring-inset ring-cyan-300';
}

export default function AppliedPage() {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return DATA;
    return DATA.filter((a) =>
      [a.company, a.role, a.location, a.status]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [query]);

  const toggle = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }));

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
      <p className="mt-1 text-neutral-700">List of your submitted applications.</p>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
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
              'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70',
              'border border-neutral-200 ring-1 ring-transparent',
              'focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-300',
              'transition-shadow',
            ].join(' ')}
          />
        </div>

        {/* Add (bold gradient) */}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
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

        {/* Filter (glass) */}
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
              key={app.id}
              className={[
                'relative group grid grid-cols-[64px,1fr,auto] items-center gap-4',
                'rounded-xl border border-neutral-200/80',
                'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70',
                'p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                // vibrant left accent
                'before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl',
                'before:bg-gradient-to-b before:from-sky-500 before:via-fuchsia-500 before:to-amber-500',
                'before:opacity-90',
              ].join(' ')}
            >
              {/* Square logo container (height == width) */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ring-1 ring-white/60">
                <img
                  src={app.logoUrl || ''}
                  alt={`${app.company} logo`}
                  className="absolute inset-0 h-full w-full object-contain p-1.5"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="100%" height="100%" rx="12" fill="%23f3f4f6"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">Logo</text></svg>';
                  }}
                />
              </div>

              {/* Company + details */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-neutral-900">{app.company}</h2>
                  <span className="text-sm text-neutral-600">• {app.role}</span>
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
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                    {app.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                    Applied {fmtDate(app.appliedOn)}
                  </span>
                  {app.salary && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-neutral-400" aria-hidden="true" />
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
                      <ExternalLink className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                      Website
                    </a>
                  )}
                </div>
              </div>

              {/* Expand toggle */}
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

              {/* Expanded content row */}
              {isOpen && (
                <div className="col-span-3 mt-3 rounded-lg border border-neutral-200 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-3 text-sm text-neutral-800">
                  <p>{app.notes || 'No additional notes yet.'}</p>
                </div>
              )}
            </article>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
            <div className="mb-2 text-5xl">🔎</div>
            <p className="text-sm text-neutral-700">No applications match your search.</p>
          </div>
        )}
      </div>
    <AddApplicationDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(data: NewApplicationForm) => {
          // TODO: merge into your state; for now just inspect it:
          console.log('New application', data);
          // you can create an `Application` object here and push it into state
        }}
      />
    </section>
  );
}
