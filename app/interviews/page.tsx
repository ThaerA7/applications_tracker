'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Filter,
  MapPin,
  ExternalLink,
  Loader2,
  CalendarDays,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ---------- types ----------
type JobRow = {
  title: string;
  employer: string;
  location: string;
  hashId?: string;
  detailUrl?: string;
  // extra fields to align with "Applied" cards
  logoUrl?: string;      // e.g. clearbit or from your API
  website?: string;      // employer site if you have it
  salary?: string;       // e.g. "€60k–€75k"
  employmentType?: string; // e.g. "Vollzeit", "Teilzeit"
  publishedAt?: string;  // ISO date (YYYY-MM-DD) for "Published" chip
};

// --- small utils ---
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}
function rankedSuggestions(source: string[], q: string, max = 8) {
  const nq = normalize(q.trim());
  if (!nq) return [];
  const scored = source
    .map((s) => {
      const ns = normalize(s);
      const idx = ns.indexOf(nq);
      if (idx === -1) return null;
      const starts = idx === 0 ? 0 : 1;
      const score = starts * 1000 + idx * 10 + ns.length;
      return { s, score };
    })
    .filter(Boolean) as { s: string; score: number }[];
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, max).map((x) => x.s);
}
function fmtDate(d?: string) {
  if (!d) return '';
  const date = new Date(d);
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

// vivid chips similar to Applied
function statusClasses(s: string | undefined) {
  const v = (s ?? '').toLowerCase();
  if (v.includes('vollzeit')) return 'bg-indigo-100 text-indigo-800 ring-1 ring-inset ring-indigo-300';
  if (v.includes('teilzeit')) return 'bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-300';
  if (v.includes('praktikum') || v.includes('trainee')) return 'bg-fuchsia-100 text-fuchsia-800 ring-1 ring-inset ring-fuchsia-300';
  if (v.includes('ausbildung')) return 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300';
  return 'bg-cyan-100 text-cyan-800 ring-1 ring-inset ring-cyan-300';
}

// --- generic, pretty autocomplete input with floating dropdown (portal) ---
function AutoCompleteInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  suggestionsSource,
  icon,
  name,
  submitOnPick = true,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  suggestionsSource: string[];
  icon: 'search' | 'location';
  name?: string;
  submitOnPick?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const items = useMemo(() => rankedSuggestions(suggestionsSource, value, 8), [suggestionsSource, value]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setActive(0);
    setOpen(items.length > 0 && value.trim().length >= 1);
  }, [items.length, value]);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  useLayoutEffect(() => {
    if (!open || !inputRef.current) return;
    const update = () => {
      const rect = inputRef.current!.getBoundingClientRect();
      const left = rect.left + window.scrollX;
      const belowTop = rect.bottom + window.scrollY;
      let top = belowTop;
      const approxHeight = Math.min(8 * 36 + 12, 320);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < approxHeight && spaceAbove > spaceBelow) {
        top = rect.top + window.scrollY - Math.min(approxHeight, spaceAbove) - 8;
      }
      setPos({ left, top, width: rect.width });
    };
    update();
    const events = ['scroll', 'resize'];
    events.forEach((ev) => window.addEventListener(ev, update, { passive: true } as any));
    const raf = requestAnimationFrame(update);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, update));
      cancelAnimationFrame(raf);
    };
  }, [open, value]);

  const Icon = icon === 'search' ? Search : MapPin;

  const dropdownEl = (
    <ul
      ref={dropdownRef}
      role="listbox"
      className="z-[9999] max-h-80 overflow-auto rounded-lg border border-neutral-200 bg-white/95 backdrop-blur shadow-lg"
      style={{ position: 'absolute', left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: pos?.width ?? undefined }}
    >
      {items.map((s, idx) => (
        <li
          key={s}
          role="option"
          aria-selected={idx === active}
          onMouseDown={(e) => {
            e.preventDefault();
            onChange(s);
            setOpen(false);
            if (submitOnPick) inputRef.current?.form?.requestSubmit();
          }}
          className={['cursor-pointer px-3 py-2 text-sm', idx === active ? 'bg-neutral-100' : 'hover:bg-neutral-50'].join(' ')}
        >
          {s}
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={rootRef} className="relative">
      <div
        className={[
          'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10',
          icon === 'search' ? 'text-amber-600' : 'text-orange-600',
        ].join(' ')}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </div>

      <input
        ref={inputRef}
        name={name}
        type="text"
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete="list"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => items.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (open) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, items.length - 1));
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
              return;
            }
            if (e.key === 'Enter' && items[active]) {
              e.preventDefault();
              onChange(items[active]);
              setOpen(false);
              (inputRef.current?.form as HTMLFormElement | undefined)?.requestSubmit();
              return;
            }
            if (e.key === 'Escape') {
              setOpen(false);
              return;
            }
          }
          if (e.key === 'Enter') (inputRef.current?.form as HTMLFormElement | undefined)?.requestSubmit();
        }}
        className={[
          'h-11 w-full rounded-lg pr-3 text-sm text-neutral-900 placeholder:text-neutral-500',
          'bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80',
          'border border-neutral-200 ring-1 ring-transparent',
          'focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300',
          'transition-shadow',
          'pl-10',
        ].join(' ')}
      />

      {open && items.length > 0 && mounted && pos && createPortal(dropdownEl, document.body)}
    </div>
  );
}

// --- tiny helper to debounce inside an effect
function useDebounced<T>(value: T, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function OffersPage() {
  const [q, setQ] = useState('');
  const [wo, setWo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<JobRow[]>([]);

  // NEW: local expanded/detail loaders
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [detailText, setDetailText] = useState<Record<string, string>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [detailError, setDetailError] = useState<Record<string, string | null>>({});

  // live suggestions
  const [kwSugs, setKwSugs] = useState<string[]>([]);
  const [locSugs, setLocSugs] = useState<string[]>([]);

  const dq = useDebounced(q, 220);
  const dwo = useDebounced(wo, 220);

  // Fetch keyword suggestions
  useEffect(() => {
    if (!dq.trim()) {
      setKwSugs([]);
      return;
    }
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch(`/api/suggest/keywords?q=${encodeURIComponent(dq)}`, { signal: ac.signal, cache: 'no-store' });
        const j = await r.json().catch(() => ({ suggestions: [] }));
        setKwSugs(Array.isArray(j?.suggestions) ? j.suggestions : []);
      } catch {
        if (!ac.signal.aborted) setKwSugs([]);
      }
    })();
    return () => ac.abort();
  }, [dq]);

  // Fetch location suggestions
  useEffect(() => {
    if (!dwo.trim()) {
      setLocSugs([]);
      return;
    }
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch(`/api/suggest/locations?q=${encodeURIComponent(dwo)}`, { signal: ac.signal, cache: 'no-store' });
        const j = await r.json().catch(() => ({ suggestions: [] }));
        setLocSugs(Array.isArray(j?.suggestions) ? j.suggestions : []);
      } catch {
        if (!ac.signal.aborted) setLocSugs([]);
      }
    })();
    return () => ac.abort();
  }, [dwo]);

  async function runSearch(form?: HTMLFormElement) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (wo.trim()) params.set('wo', wo.trim());
      params.set('size', '25');
      params.set('angebotsart', '1'); // ARBEIT

      const res = await fetch(`/api/jobs?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      // Reset per-search expand state
      setExpanded({});
      setDetailText({});
      setDetailLoading({});
      setDetailError({});

      setResults(json?.results ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
      form?.reset();
    }
  }

  // lazy-load details when first expanding
  async function loadDetails(job: JobRow, key: string) {
    if (detailText[key] || detailLoading[key]) return;
    setDetailLoading((s) => ({ ...s, [key]: true }));
    setDetailError((s) => ({ ...s, [key]: null }));
    try {
      const qs = new URLSearchParams();
      if (job.hashId) qs.set('hashId', job.hashId);
      if (job.detailUrl) qs.set('detailUrl', job.detailUrl);
      const r = await fetch(`/api/jobs/detail?${qs.toString()}`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      const text: string =
        j?.text ||
        j?.description ||
        'Keine weiteren Details gefunden. Besuche ggf. die Website unten.';
      setDetailText((s) => ({ ...s, [key]: String(text) }));
    } catch (e: any) {
      setDetailError((s) => ({ ...s, [key]: e?.message ?? 'Konnte Details nicht laden.' }));
    } finally {
      setDetailLoading((s) => ({ ...s, [key]: false }));
    }
  }

  const toggle = (key: string, job: JobRow) => {
    setExpanded((s) => {
      const next = { ...s, [key]: !s[key] };
      if (!s[key]) loadDetails(job, key); // opening -> load
      return next;
    });
  };

  return (
    <section
      className={[
        'relative rounded-2xl border border-neutral-200/70',
        'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50',
        'p-8 shadow-md overflow-hidden',
      ].join(' ')}
    >
      {/* warm color blobs */}
      <div className="pointer-events-none absolute -top-20 -right-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-28 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />

      <h1 className="text-2xl font-semibold text-neutral-900">Offers</h1>
      <p className="mt-1 text-neutral-700">Search offers from Bundesagentur für Arbeit.</p>

      {/* Toolbar */}
      <form
        className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr,minmax(0,0.6fr),auto]"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(e.currentTarget);
        }}
      >
        <AutoCompleteInput
          name="keywords"
          value={q}
          onChange={setQ}
          placeholder="Search titles/keywords (e.g. React, Ausbildung, Praktikum)…"
          ariaLabel="Search offers"
          suggestionsSource={kwSugs}
          icon="search"
        />
        <AutoCompleteInput
          name="location"
          value={wo}
          onChange={setWo}
          placeholder="Location (e.g. Berlin, Remote, München)…"
          ariaLabel="Location"
          suggestionsSource={locSugs}
          icon="location"
        />
        <button
          type="button"
          className={[
            'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800',
            'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
            'border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300',
          ].join(' ')}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filter
        </button>
      </form>

      {/* Results */}
      <div className="mt-5 grid grid-cols-1 gap-3" aria-live="polite">
        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-neutral-700">Loading…</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          results.map((job, i) => {
            const key = String(job.hashId ?? i);
            const isOpen = !!expanded[key];

            return (
              <article
                key={key}
                className={[
                  // match Applied layout: 3 cols (logo, main, toggle)
                  'relative group grid grid-cols-[64px,1fr,auto] items-center gap-4',
                  'rounded-xl border border-neutral-200/80',
                  'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70',
                  'p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                  // warm left accent aligned with Offers
                  'before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl',
                  'before:bg-gradient-to-b before:from-amber-500 before:via-orange-500 before:to-yellow-500',
                  'before:opacity-90',
                ].join(' ')}
              >
                {/* Square logo container */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ring-1 ring-white/60">
                  <img
                    src={job.logoUrl || ''}
                    alt={`${job.employer || 'Arbeitgeber'} logo`}
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
                    <h2 className="text-base font-semibold text-neutral-900">
                      {job.employer || 'Unbekannter Arbeitgeber'}
                    </h2>
                    <span className="text-sm text-neutral-600">• {job.title}</span>
                    {(job.employmentType || job.publishedAt) && (
                      <span
                        className={[
                          'ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          statusClasses(job.employmentType || ''),
                        ].join(' ')}
                      >
                        {job.employmentType || `Neu • ${fmtDate(job.publishedAt)}`}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700">
                    {!!job.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                        {job.location}
                      </span>
                    )}
                    {!!job.publishedAt && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                        Published {fmtDate(job.publishedAt)}
                      </span>
                    )}
                    {!!job.salary && (
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                        {job.salary}
                      </span>
                    )}
                    {(job.website || job.detailUrl) && (
                      <a
                        href={job.website || job.detailUrl!}
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

                {/* Expand toggle (replaces external View) */}
                <button
                  type="button"
                  onClick={() => toggle(key, job)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? 'Collapse details' : 'Expand details'}
                  className={[
                    'inline-flex items-center rounded-md px-2.5 py-1.5 text-sm',
                    'text-neutral-800',
                    'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
                    'border border-neutral-200 shadow-sm',
                    'hover:bg-white active:bg-neutral-50',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300',
                  ].join(' ')}
                >
                  {isOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                </button>

                {/* Expanded content row */}
                {isOpen && (
                  <div className="col-span-3 mt-3 rounded-lg border border-neutral-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-3 text-sm text-neutral-800">
                    {detailLoading[key] && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Details werden geladen…</span>
                      </div>
                    )}
                    {!detailLoading[key] && detailError[key] && (
                      <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-800">
                        {detailError[key]}
                      </div>
                    )}
                    {!detailLoading[key] && !detailError[key] && <p className="whitespace-pre-line">{detailText[key]}</p>}
                    {/* Fallback link shown inside expand */}
                    {(job.website || job.detailUrl) && (
                      <div className="mt-2">
                        <a
                          href={job.website || job.detailUrl!}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-700"
                        >
                          <ExternalLink className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                          Vollständige Ausschreibung öffnen
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}

        {!loading && !error && results.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
            <div className="mb-2 text-5xl">🔎</div>
            <p className="text-sm text-neutral-700">
              Type a query and press <span className="font-semibold">Enter</span> to search offers.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
