// app/wishlist/page.tsx
'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  Star,
} from 'lucide-react';

type WishlistItem = {
  id: string;
  company: string;
  role?: string;
  location?: string;
  priority?: 'Dream' | 'High' | 'Medium' | 'Low';
  logoUrl?: string;
  website?: string;
  notes?: string;
};

const DATA: WishlistItem[] = [
  {
    id: 'w1',
    company: 'Stripe',
    role: 'Frontend Engineer',
    location: 'Remote • EU',
    priority: 'Dream',
    logoUrl: 'https://logo.clearbit.com/stripe.com',
    website: 'https://stripe.com',
    notes: 'Strong design culture; prepare for UI architecture/system-design-lite.',
  },
  {
    id: 'w2',
    company: 'Zalando',
    role: 'React Engineer',
    location: 'Berlin, DE',
    priority: 'High',
    logoUrl: 'https://logo.clearbit.com/zalando.com',
    website: 'https://www.zalando.de',
    notes: 'Check teams using Next.js; internal tools + storefront.',
  },
  {
    id: 'w3',
    company: 'N26',
    role: 'Frontend (Core Web)',
    location: 'Hybrid • Berlin, DE',
    priority: 'Medium',
    logoUrl: 'https://logo.clearbit.com/n26.com',
    website: 'https://n26.com',
    notes: 'TypeScript heavy; look at performance/observability experience.',
  },
];

function priorityClasses(priority?: WishlistItem['priority']) {
  switch (priority) {
    case 'Dream':
      return 'bg-violet-100 text-violet-800 ring-1 ring-inset ring-violet-300';
    case 'High':
      return 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300';
    case 'Medium':
      return 'bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-300';
    case 'Low':
      return 'bg-slate-100 text-slate-800 ring-1 ring-inset ring-slate-300';
    default:
      return 'bg-neutral-100 text-neutral-800 ring-1 ring-inset ring-neutral-300';
  }
}

export default function WishlistPage() {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return DATA;
    return DATA.filter((w) =>
      [w.company, w.role, w.location, w.priority]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [query]);

  const toggle = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }));

  return (
    <section
      className={[
        'relative rounded-2xl border border-neutral-200/70',
        'bg-gradient-to-br from-violet-50 via-white to-amber-50',
        'p-8 shadow-md overflow-hidden',
      ].join(' ')}
    >
      {/* soft accent blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />

      <h1 className="text-2xl font-semibold text-neutral-900">Wishlist</h1>
      <p className="mt-1 text-neutral-700">Companies/roles you want to target next.</p>

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
            placeholder="Search wishlist…"
            aria-label="Search wishlist"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={[
              // base
              'h-11 w-full rounded-lg pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500',

              // match Add / Filter glass look
              'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
              'border border-neutral-200 shadow-sm',

              // interactions
              'hover:bg-white focus:bg-white',
              'ring-1 ring-transparent',
              'focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-300',

              'transition-shadow',
            ].join(' ')}
          />
        </div>

        {/* Add (match Filter glass style) */}
        <button
          type="button"
          className={[
            'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800',
            'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
            'border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-300',
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
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-300',
          ].join(' ')}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filter
        </button>
      </div>


      {/* Results grid */}
      <div className="mt-5 grid grid-cols-1 gap-3">
        {filtered.map((item) => {
          const isOpen = !!expanded[item.id];
          return (
            <article
              key={item.id}
              className={[
                'relative group grid grid-cols-[64px,1fr,auto] items-center gap-4',
                'rounded-xl border border-neutral-200/80',
                'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70',
                'p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                // vibrant left accent to echo the Star theme
                'before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl',
                'before:bg-gradient-to-b before:from-violet-500 before:via-fuchsia-500 before:to-amber-500',
                'before:opacity-90',
              ].join(' ')}
            >
              {/* Square logo (height == width) */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ring-1 ring-white/60">
                <img
                  src={item.logoUrl || ''}
                  alt={`${item.company} logo`}
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
                  <h2 className="text-base font-semibold text-neutral-900">{item.company}</h2>
                  {item.role && (
                    <span className="text-sm text-neutral-600">• {item.role}</span>
                  )}
                  {item.priority && (
                    <span
                      className={[
                        'ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        priorityClasses(item.priority),
                      ].join(' ')}
                    >
                      <Star className="mr-1 h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                      {item.priority}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700">
                  {item.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                      {item.location}
                    </span>
                  )}
                  {item.website && (
                    <a
                      href={item.website}
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
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Collapse details' : 'Expand details'}
                className={[
                  'inline-flex items-center rounded-md px-2.5 py-1.5 text-sm',
                  'text-neutral-800',
                  'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
                  'border border-neutral-200 shadow-sm',
                  'hover:bg-white active:bg-neutral-50',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-300',
                ].join(' ')}
              >
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="col-span-3 mt-3 rounded-lg border border-neutral-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-3 text-sm text-neutral-800">
                  <p>{item.notes || 'No additional notes yet.'}</p>
                </div>
              )}
            </article>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
            <div className="mb-2 text-5xl">🌟</div>
            <p className="text-sm text-neutral-700">No wishlist items match your search.</p>
          </div>
        )}
      </div>
    </section>
  );
}
