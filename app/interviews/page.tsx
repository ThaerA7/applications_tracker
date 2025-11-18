// app/interviews/page.tsx
'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
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
  Link as LinkIcon,
  Building2,
} from 'lucide-react';

type InterviewType = 'phone' | 'video' | 'in-person';

type Interview = {
  id: string;
  company: string;
  role: string;
  location?: string;
  contact?: { name?: string; email?: string };
  date: string; // ISO string
  type: InterviewType;
  url?: string;
  logoUrl?: string;
};

const INTERVIEW_TYPE_META: Record<
  InterviewType,
  { label: string; Icon: React.ComponentType<any> }
> = {
  phone: { label: 'Phone', Icon: Phone },
  video: { label: 'Video call', Icon: Video },
  'in-person': { label: 'In person', Icon: MapPin },
};

// demo data
const interviews: Interview[] = [
  {
    id: '1',
    company: 'Acme Corp',
    role: 'Frontend Engineer',
    location: 'Berlin',
    contact: { name: 'Julia Meyer', email: 'j.meyer@acme.example' },
    date: '2025-11-12T14:00:00+01:00',
    type: 'video',
    url: 'https://jobs.example/acme/frontend',
    logoUrl: '/logos/acme.svg',
  },
  {
    id: '2',
    company: 'Globex',
    role: 'Mobile Developer (Flutter)',
    location: 'Remote',
    contact: { name: 'HR Team' },
    date: '2025-11-15T10:30:00+01:00',
    type: 'phone',
    logoUrl: '/logos/globex.png',
  },
  {
    id: '3',
    company: 'Initech',
    role: 'Full-Stack Developer',
    location: 'Munich HQ',
    contact: { name: 'Samir', email: 'samir@initech.example' },
    date: '2025-11-20T09:15:00+01:00',
    type: 'in-person',
    url: 'https://initech.example/careers/123',
    logoUrl: '/logos/initech.svg',
  },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-DE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-DE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Berlin',
  }).format(d);
  return { date, time };
}

export default function InterviewsPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return interviews;
    return interviews.filter((i) =>
      [
        i.company,
        i.role,
        i.location,
        INTERVIEW_TYPE_META[i.type].label,
        i.contact?.name,
        i.contact?.email,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [query]);

  return (
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

      <h1 className="text-2xl font-semibold text-neutral-900">Interviews</h1>
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
              // base
              'h-11 w-full rounded-lg pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500',

              // match Add / Filter glass look
              'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
              'border border-neutral-200 shadow-sm',

              // interactions
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
          const { date, time } = formatDateTime(item.date);
          const { Icon: TypeIcon, label: typeLabel } = INTERVIEW_TYPE_META[item.type];

          return (
            <article
              key={item.id}
              className={[
                'relative group rounded-xl border border-neutral-200/80 p-5 shadow-sm transition-all',
                'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70',
                'hover:-translate-y-0.5 hover:shadow-md',
                // emerald/teal accent strip
                'before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl',
                'before:bg-gradient-to-b before:from-emerald-500 before:via-teal-500 before:to-cyan-500',
                'before:opacity-90',
              ].join(' ')}
            >
              {/* Header with square logo + company/role */}
              <div className="flex items-start gap-3">
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
                    <h2 className="truncate text-base font-semibold text-neutral-900">
                      {item.company}
                    </h2>
                    {/* type chip */}
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <TypeIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      {typeLabel}
                    </span>
                  </div>
                  <p className="truncate text-sm text-neutral-600 flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
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
                  <Calendar className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                  <div className="flex flex-col">
                    <dt className="text-neutral-500">Date</dt>
                    <dd className="font-medium text-neutral-900">{date}</dd>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                  <div className="flex flex-col">
                    <dt className="text-neutral-500">Time</dt>
                    <dd className="font-medium text-neutral-900">{time} (Berlin)</dd>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TypeIcon className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                  <div className="flex flex-col">
                    <dt className="text-neutral-500">Type</dt>
                    <dd className="font-medium text-neutral-900">{typeLabel}</dd>
                  </div>
                </div>

                {item.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                    <div className="flex flex-col">
                      <dt className="text-neutral-500">Location</dt>
                      <dd className="font-medium text-neutral-900">{item.location}</dd>
                    </div>
                  </div>
                )}

                {item.contact?.name && (
                  <div className="flex items-center gap-2">
                    <User2 className="h-4 w-4 text-neutral-500" aria-hidden="true" />
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

                {item.url && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-neutral-500" aria-hidden="true" />
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
            <p className="text-sm text-neutral-700">No interviews match your search.</p>
          </div>
        )}
      </div>
    </section>
  );
}
