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

export default function AppliedPage() {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
    <section className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Applied</h1>
      <p className="mt-2 text-neutral-600">List of your submitted applications.</p>

      {/* Toolbar */}
      <div className="mt-6 flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search applications..."
            aria-label="Search applications"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/5"
          />
        </div>

        {/* Add button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-black bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 active:bg-black"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>

        {/* Filter button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filter
        </button>
      </div>

      {/* Results grid */}
      <div className="mt-4 grid grid-cols-1 gap-3">
        {filtered.map((app) => {
          const isOpen = !!expanded[app.id];
          return (
            <article
              key={app.id}
              className="grid grid-cols-[48px,1fr,auto] items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4"
            >
              {/* Logo (left) */}
              <img
                src={app.logoUrl || ''}
                alt={`${app.company} logo`}
                className="h-12 w-12 rounded-md border border-neutral-200 bg-white object-contain p-1"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%239ca3af">Logo</text></svg>';
                }}
              />

              {/* Company + deets (middle) */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-neutral-900">{app.company}</h2>
                  <span className="text-sm text-neutral-600">• {app.role}</span>
                  <span className="ml-2 inline-flex items-center rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700">
                    {app.status}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {app.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    Applied {fmtDate(app.appliedOn)}
                  </span>
                  {app.salary && (
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="h-4 w-4" aria-hidden="true" />
                      {app.salary}
                    </span>
                  )}
                  {app.website && (
                    <a
                      href={app.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline decoration-neutral-300 hover:decoration-neutral-700"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Website
                    </a>
                  )}
                </div>
              </div>

              {/* Expand toggle (right) */}
              <button
                type="button"
                onClick={() => toggle(app.id)}
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Collapse details' : 'Expand details'}
                className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"
              >
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              {/* Expanded content row */}
              {isOpen && (
                <div className="col-span-3 mt-3 border-t border-neutral-200 pt-3 text-sm text-neutral-700">
                  <p>{app.notes || 'No additional notes yet.'}</p>
                </div>
              )}
            </article>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-neutral-500">No applications match your search.</p>
        )}
      </div>
    </section>
  );
}
