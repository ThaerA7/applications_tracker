'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Tag,
  Code2,
  Server,
  Stethoscope,
  Hammer,
  Wrench,
  GraduationCap,
  Palette,
  Truck,
  ChefHat,
  Building2,
  Briefcase,
  Ruler,
  CalendarDays,
} from 'lucide-react';

type JobRow = {
  title: string;
  employer: string;
  location: string;
  hashId?: string;
  detailUrl?: string;
  logoUrl?: string;
  distanceKm?: number;
  offerType?: string | number; // label or BA angebotsart / arbeitszeit
  startDate?: string | null;   // job start date (eintrittsdatum)
};

// ---------- utils ----------
function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
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

// choose icon
function pickJobIcon(title: string) {
  const t = title.toLowerCase();
  if (/(dev|software|frontend|backend|full[- ]?stack|react|angular|vue|typescript|engineer|programm)/.test(t)) return Code2;
  if (/(data|ml|ai|cloud|devops|kubernetes|docker|sysadmin|sre|platform|server)/.test(t)) return Server;
  if (/(nurse|pfleg|arzt|ärzt|medizin|therap|apothe|health|care)/.test(t)) return Stethoscope;
  if (/(mechanic|mechatron|installat|wartung|techniker|elektrik|elektron|service)/.test(t)) return Wrench;
  if (/(bau|construction|maurer|zimmerer|tiefbau|hochbau|handwerk)/.test(t)) return Hammer;
  if (/(driver|fahrer|logistik|liefer|kurier|transport|truck|flotte)/.test(t)) return Truck;
  if (/(koch|küche|chef|gastronomie|restaurant|küchenhilfe|kitchen|cook)/.test(t)) return ChefHat;
  if (/(design|ux|ui|grafik|creative|art|produktdesign)/.test(t)) return Palette;
  if (/(teacher|ausbilder|trainer|schule|bildung|dozent|professor|ausbildung)/.test(t)) return GraduationCap;
  if (/(factory|produktion|fertigung|betrieb|warehouse|lager|industrie)/.test(t)) return Building2;
  if (/(sales|vertrieb|account|customer|kunden|business|consult)/.test(t)) return Briefcase;
  return Briefcase;
}

// --------- BA mappings (fixed to official) ----------
/** UI → BA `angebotsart` */
function angebotToParam(v: string): string | null {
  switch (v) {
    case 'werkstudent':
    case 'minijob':
    case 'teilzeit':
    case 'vollzeit':
      return '1'; // Arbeit
    case 'freelance':
      return '2'; // Selbstständigkeit
    case 'ausbildung':
    case 'duales-studium':
      return '4'; // Ausbildung/Duales Studium
    case 'praktikum':
    case 'trainee':
      return '34'; // Praktikum/Trainee
    default:
      return null;
  }
}
/** UI → BA `arbeitszeit` (lowercase codes) */
function arbeitszeitParam(v: string): 'vz' | 'tz' | 'mj' | null {
  if (v === 'vollzeit') return 'vz';
  if (v === 'teilzeit') return 'tz';
  if (v === 'minijob') return 'mj';
  return null;
}

const OFFER_OPTIONS = [
  { value: '', label: 'Any offer' },
  { value: 'ausbildung', label: 'Ausbildung' },
  { value: 'duales-studium', label: 'Duales Studium' },
  { value: 'praktikum', label: 'Praktikum' },
  { value: 'trainee', label: 'Trainee' },
  { value: 'werkstudent', label: 'Werkstudent' },
  { value: 'minijob', label: 'Minijob' },
  { value: 'teilzeit', label: 'Teilzeit Job' },
  { value: 'vollzeit', label: 'Vollzeit Job' },
  { value: 'freelance', label: 'Selbstständigkeit' },
] as const;

const OFFER_LABEL = (v?: string) => {
  if (!v) return '';
  const found = OFFER_OPTIONS.find((o) => o.value === v);
  if (found) return found.label;
  return v.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

/** Label shown from REAL BA `offerType` (id or string) */
function labelFromApiOfferType(v?: string | number): string | null {
  if (v === undefined || v === null) return null;
  const key = String(v).trim().toLowerCase();
  const map: Record<string, string> = {
    '1': 'Arbeit',
    '2': 'Selbstständigkeit',
    '4': 'Ausbildung/Duales Studium',
    '34': 'Praktikum/Trainee',

    job: 'Arbeit',
    arbeit: 'Arbeit',
    ausbildung: 'Ausbildung',
    'duales-studium': 'Duales Studium',
    praktikum: 'Praktikum',
    trainee: 'Trainee',
    werkstudent: 'Werkstudent',

    minijob: 'Minijob',
    teilzeit: 'Teilzeit Job',
    vollzeit: 'Vollzeit Job',
    freelance: 'Selbstständigkeit',
    freiberuflich: 'Selbstständigkeit',

    // BA arbeitszeit codes
    vz: 'Vollzeit Job',
    tz: 'Teilzeit Job',
    mj: 'Minijob',
    ho: 'Homeoffice Job',
    snw: 'Schicht / Nacht / Wochenende',
  };
  return map[key] ?? key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Format start date (eintrittsdatum) nicely for UI
function formatStartDate(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // If BA already sends something like "ab sofort" / free text → show as is
  if (/ab\s*sofort/i.test(trimmed)) {
    return 'ab sofort';
  }

  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    // Not a parsable date (e.g. "nach Vereinbarung") → show the original text
    return trimmed;
  }

  // Normalize both dates to midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);

  // Heuristic: if the start date is today or in the past, treat it as "ab sofort"
  if (start <= today) {
    return 'ab sofort';
  }

  // Otherwise show a normal German date
  return start.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}


function extractTotal(json: any): number | null {
  const candidates = [
    json?.total, // from our own API
    json?.maxErgebnisse, // if we ever forward it
    json?.baPage?.maxErgebnisse,
    json?.baPage?.stellenangeboteGesamt,
    json?.baPage?.totalElements,
    json?.page?.totalElements,
    json?.totalElements,
    json?.count,
    json?.paging?.total,
    json?.hits?.total?.value ?? json?.hits?.total,
  ]
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n >= 0);

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

// ---------- FloatingMenu ----------
function FloatingMenu({
  anchorRef,
  open,
  onClose,
  width = 224,
  children,
  align = 'right',
}: {
  anchorRef: React.RefObject<HTMLElement>;
  open: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; visibility: 'hidden' | 'visible' }>({
    left: -9999,
    top: -9999,
    visibility: 'hidden',
  });

  const calc = () => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;
    const a = anchor.getBoundingClientRect();
    let left = align === 'right' ? a.right - width : a.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = a.bottom + 6;
    menu.style.position = 'fixed';
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.width = `${width}px`;
    const m = menu.getBoundingClientRect();
    if (m.bottom > window.innerHeight - 8) top = Math.max(8, a.top - m.height - 6);
    setPos({ left, top, visibility: 'visible' });
  };

  useLayoutEffect(() => {
    if (!open) return;
    calc();
    const onScroll = () => calc();
    const onResize = () => calc();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (!open) return;
      if (menuRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t as Node)) return;
      onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  if (!open) return null;

  const el = (
    <div
      ref={menuRef}
      role="menu"
      style={{ position: 'fixed', left: pos.left, top: pos.top, width, zIndex: 9999, visibility: pos.visibility }}
      className="overflow-auto max-h-[80vh] rounded-lg border border-neutral-200 bg-white/95 backdrop-blur shadow-lg"
    >
      {children}
    </div>
  );

  return createPortal(el, document.body);
}

// ---------- Autocomplete ----------
function AutoCompleteInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  suggestionsSource,
  icon,
  name,
  submitOnPick = true,
  rightAddon,
  rightPadClass = 'pr-3',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  suggestionsSource: string[];
  icon: 'search' | 'location';
  name?: string;
  submitOnPick?: boolean;
  rightAddon?: ReactNode;
  rightPadClass?: string;
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
      if (spaceBelow < approxHeight && spaceAbove > spaceBelow) top = rect.top + window.scrollY - Math.min(approxHeight, spaceAbove) - 8;
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
          'h-11 w-full rounded-lg text-sm text-neutral-900 placeholder:text-neutral-500',
          'bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80',
          'border border-neutral-200 ring-1 ring-transparent',
          'focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300',
          'transition-shadow',
          'pl-10',
          rightPadClass,
        ].join(' ')}
      />
      {rightAddon && (
        <div className="absolute right-1 top-1/2 z-20 -translate-y-1/2">
          <div className="flex items-center gap-1">{rightAddon}</div>
        </div>
      )}
      {open && items.length > 0 && mounted && pos && createPortal(dropdownEl, document.body)}
    </div>
  );
}

// ---------- debounced ----------
function useDebounced<T>(value: T, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const DISTANCES = ['5', '10', '15', '20', '25', '30', '35', '40', '45', '50'] as const;
const PAGE_SIZE = 20;

// identity + dedupe
function jobIdentity(j: JobRow): string {
  const base = j.hashId?.trim() || j.detailUrl?.trim();
  if (base) return base;
  return `${j.employer ?? ''}|${j.title ?? ''}|${j.location ?? ''}`.toLowerCase();
}
function dedupeJobs(list: JobRow[]): JobRow[] {
  const seen = new Set<string>();
  const out: JobRow[] = [];
  for (const j of list) {
    const id = jobIdentity(j);
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    out.push(j);
  }
  return out;
}

export default function OffersPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [wo, setWo] = useState('');
  const [distance, setDistance] = useState<string>(''); // km
  const [offerType, setOfferType] = useState<string>(''); // UI-only filter
  const [offerOpen, setOfferOpen] = useState(false);
  const [distanceOpen, setDistanceOpen] = useState(false);
  const offerBtnRef = useRef<HTMLButtonElement | null>(null);
  const distanceBtnRef = useRef<HTMLButtonElement | null>(null);

  const [loadingFirst, setLoadingFirst] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [allResults, setAllResults] = useState<JobRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);

  // live suggestions
  const [kwSugs, setKwSugs] = useState<string[]>([]);
  const [locSugs, setLocSugs] = useState<string[]>([]);
  const dq = useDebounced(q, 220);
  const dwo = useDebounced(wo, 220);

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

  // keep URL in sync
  function pushUrl(nextUiPage = 1) {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (wo.trim()) params.set('wo', wo.trim());
    if (distance && wo.trim()) params.set('umkreis', distance);
    if (offerType) params.set('typ', offerType);
    params.set('page', String(nextUiPage));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  async function fetchPage(pageNum: number) {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (wo.trim()) {
      params.set('wo', wo.trim());
      if (distance) params.set('umkreis', distance);
    }
    // BA default is Arbeit; send angebotsart even when none picked so totals match BA
    const angebot = angebotToParam(offerType) ?? '1';
    params.set('angebotsart', angebot);

    const az = arbeitszeitParam(offerType);
    if (az) params.set('arbeitszeit', az); // vz|tz|mj

    const oneBased = Math.max(1, pageNum);
    params.set('size', String(PAGE_SIZE));
    params.set('page', String(oneBased));

    const res = await fetch(`/api/jobs?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(`${json?.error || `HTTP ${res.status}`}\n${json?.forwardedUrl || ''}`);
    }

    const batch: JobRow[] = Array.isArray(json?.results) ? json.results : [];
    const parsedTotal = extractTotal(json);
    return { batch, total: parsedTotal };
  }

  async function runSearch(_form?: HTMLFormElement) {
    if (!q.trim() || !wo.trim()) return;
    setLoadingFirst(true);
    setAllResults([]);
    setTotalAvailable(null);
    setPage(1);
    pushUrl(1);
    try {
      const { batch: firstBatch, total } = await fetchPage(1);
      setAllResults(dedupeJobs(firstBatch));
      setTotalAvailable((typeof total === 'number' ? total : null) ?? (firstBatch.length < PAGE_SIZE ? firstBatch.length : null));
    } finally {
      setLoadingFirst(false);
    }
  }

  // pagination math
  const totalKnown = Number.isFinite(totalAvailable as number);
  const knownTotal = totalKnown ? (totalAvailable as number) : null;
  const effectiveTotal = knownTotal ?? allResults.length;
  const totalPages =
    (knownTotal != null ? Math.max(1, Math.ceil(knownTotal / PAGE_SIZE)) : Math.max(1, Math.ceil(Math.max(1, effectiveTotal) / PAGE_SIZE))) || 1;

  const canPrev = page > 1;
  const canNext = totalKnown ? page < totalPages : true;

  const startIndex = (page - 1) * PAGE_SIZE;
  const displayed = allResults.slice(startIndex, startIndex + PAGE_SIZE);

  const handlePrev = () => {
    if (!canPrev) return;
    const next = page - 1;
    setPage(next);
    pushUrl(next);
  };

  const handleNext = async () => {
    if (!canNext) return;
    const next = page + 1;
    setPageLoading(true);
    try {
      const need = next * PAGE_SIZE;
      if (allResults.length >= need) {
        setPage(next);
        pushUrl(next);
        return;
      }

      const prevLen = allResults.length;
      const { batch, total } = await fetchPage(next);
      if (Number.isFinite(Number(total)) && total !== null) setTotalAvailable(total as number);
      if (!batch || batch.length === 0) {
        setTotalAvailable((prev) => (Number.isFinite(prev as number) ? (prev as number) : prevLen));
        return;
      }

      const merged = dedupeJobs([...allResults, ...batch]);
      const newLen = merged.length;
      setAllResults(merged);
      if (newLen === prevLen && !totalKnown) {
        setTotalAvailable(prevLen);
        return;
      }
      if (batch.length < PAGE_SIZE && !totalKnown) {
        const computed = (next - 1) * PAGE_SIZE + batch.length;
        setTotalAvailable(computed);
      }

      setPage(next);
      pushUrl(next);
    } finally {
      setPageLoading(false);
    }
  };

  // auto-refresh on filter change
  useEffect(() => {
    const ready = q.trim() && wo.trim();
    if (!ready) return;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distance, offerType]);

  const submitDisabled = !q.trim() || !wo.trim();
  const btnInside = [
    'h-8 px-2 rounded-md border text-xs font-medium shadow-sm',
    'border-neutral-200 bg-white/90 hover:bg-white text-neutral-800',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-amber-300',
    'backdrop-blur',
  ].join(' ');

  return (
    <section
      className={[
        'relative rounded-2xl border border-neutral-200/70',
        'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50',
        'p-8 shadow-md overflow-hidden',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute -top-20 -right-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-28 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />

      <h1 className="text-2xl font-semibold text-neutral-900">Offers</h1>
      <p className="mt-1 text-neutral-700">Search offers from Bundesagentur für Arbeit.</p>

      <form
        className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr,1fr,auto]"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(e.currentTarget);
        }}
      >
        <div className="relative">
          <AutoCompleteInput
            name="keywords"
            value={q}
            onChange={setQ}
            placeholder="Job title / keywords (e.g. Verkäufer/in)"
            ariaLabel="Keywords"
            suggestionsSource={kwSugs}
            icon="search"
            rightPadClass="pr-28"
            rightAddon={
              <>
                <button
                  ref={offerBtnRef}
                  type="button"
                  onClick={() => setOfferOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={offerOpen}
                  className={btnInside}
                  title="Offer type"
                >
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    {offerType ? OFFER_LABEL(offerType) : 'Offer'}
                  </span>
                </button>
                <FloatingMenu
                  anchorRef={offerBtnRef as unknown as React.RefObject<HTMLElement>}
                  open={offerOpen}
                  onClose={() => setOfferOpen(false)}
                  width={224}
                  align="right"
                >
                  {OFFER_OPTIONS.map((o) => (
                    <button
                      key={o.value || 'any'}
                      type="button"
                      onClick={() => {
                        setOfferType(o.value);
                        setOfferOpen(false);
                      }}
                      className={[
                        'block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50',
                        o.value === offerType ? 'bg-amber-50 text-amber-800' : 'text-neutral-800',
                      ].join(' ')}
                      role="menuitem"
                    >
                      {o.label}
                    </button>
                  ))}
                </FloatingMenu>
              </>
            }
          />
        </div>

        <div className="relative">
          <AutoCompleteInput
            name="location"
            value={wo}
            onChange={setWo}
            placeholder="Ort / PLZ"
            ariaLabel="Ort / PLZ"
            suggestionsSource={locSugs}
            icon="location"
            rightPadClass="pr-28"
            rightAddon={
              <>
                <button
                  ref={distanceBtnRef}
                  type="button"
                  onClick={() => setDistanceOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={distanceOpen}
                  className={btnInside}
                  title="Distance"
                >
                  <span className="inline-flex items-center gap-1">
                    <Ruler className="h-3.5 w-3.5" />
                    {distance ? `${distance} km` : 'Distance'}
                  </span>
                </button>
                <FloatingMenu
                  anchorRef={distanceBtnRef as unknown as React.RefObject<HTMLElement>}
                  open={distanceOpen}
                  onClose={() => setDistanceOpen(false)}
                  width={176}
                  align="right"
                >
                  <button
                    type="button"
                    className={[
                      'block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50',
                      distance === '' ? 'bg-amber-50 text-amber-800' : 'text-neutral-800',
                    ].join(' ')}
                    onClick={() => {
                      setDistance('');
                      setDistanceOpen(false);
                    }}
                    role="menuitem"
                  >
                    Any distance
                  </button>
                  {DISTANCES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDistance(d);
                        setDistanceOpen(false);
                      }}
                      className={[
                        'block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50',
                        distance === d ? 'bg-amber-50 text-amber-800' : 'text-neutral-800',
                      ].join(' ')}
                      role="menuitem"
                    >
                      {d} km
                    </button>
                  ))}
                </FloatingMenu>
              </>
            }
          />
        </div>

        <div className="flex items-stretch">
          <button
            type="submit"
            disabled={submitDisabled}
            className={[
              'inline-flex items-center justify-center gap-1.5 rounded-lg border px-4 text-sm font-medium shadow-sm',
              submitDisabled
                ? 'cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400'
                : 'border-neutral-200 bg-amber-500/90 text-white hover:bg-amber-500',
              'h-11 w-full sm:w-auto',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300',
            ].join(' ')}
            aria-label="Search"
            title={submitDisabled ? 'Fill title and location' : 'Search'}
          >
            <Search className="h-4 w-4" /> Search
          </button>
        </div>
      </form>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-700">
        <div>
          {Number.isFinite(totalAvailable as number)
            ? `${(totalAvailable as number).toLocaleString()} offers found${
                q || wo ? ` for ${q || ''}${q && wo ? ' in ' : ''}${wo || ''}` : ''
              }`
            : allResults.length > 0
            ? `${allResults.length.toLocaleString()} offers loaded`
            : ''}
        </div>
        <div className="flex items-center gap-2">
          <span>
            Page <span className="font-semibold">{page}</span> / <span className="font-semibold">{totalPages}</span>
            {!Number.isFinite(totalAvailable as number) && allResults.length > 0 ? ' +' : ''}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3" aria-live="polite">
        {loadingFirst && (
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-neutral-700">Loading…</span>
          </div>
        )}

        {!loadingFirst && pageLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-neutral-700">Loading this page…</span>
          </div>
        )}

        {!loadingFirst &&
          !pageLoading &&
          displayed.map((job, i) => {
            const Icon = pickJobIcon(job.title);
            const idx = startIndex + i + 1;
            const key = jobIdentity(job) || `idx-${idx}`;
            const apiOfferLabel = labelFromApiOfferType(job.offerType);
            const startLabel = formatStartDate(job.startDate ?? null);


            return (
              <article
                key={key}
                className={[
                  'relative group grid grid-cols-[64px,1fr,auto] items-center gap-4',
                  'rounded-xl border border-neutral-200/80',
                  'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70',
                  'p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                  'before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl',
                  'before:bg-gradient-to-b before:from-amber-500 before:via-orange-500 before:to-yellow-500',
                  'before:opacity-90',
                ].join(' ')}
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ring-1 ring-white/60">
                  <div className="absolute left-1 top-1 rounded-md bg-neutral-900/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    {idx}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
                    <Icon className="h-7 w-7 text-amber-700" aria-hidden="true" />
                  </div>
                  {job.logoUrl && (
                    <img
                      src={job.logoUrl}
                      alt={`${job.employer || 'Company'} logo`}
                      className="absolute inset-0 h-full w-full object-contain p-1.5"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                      loading="lazy"
                    />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-neutral-900">
                      {job.employer || 'Unbekannter Arbeitgeber'}
                    </h2>
                    <span className="text-sm text-neutral-600">• {job.title}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700">
                    {!!job.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                        {job.location}
                      </span>
                    )}
                    {Number.isFinite(job.distanceKm) && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                        {Math.round(job.distanceKm as number)} km
                      </span>
                    )}
                    {apiOfferLabel && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
                        <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                        {apiOfferLabel}
                      </span>
                    )}
                    {startLabel && (
  <span className="inline-flex items-center gap-1.5">
    <CalendarDays className="h-4 w-4 text-neutral-400" aria-hidden="true" />
    {startLabel}
  </span>
)}
                  </div>
                </div>

                {job.detailUrl && (
                  <a
                    href={job.detailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white/70 px-2.5 py-1.5 text-sm text-neutral-800 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    View
                  </a>
                )}
              </article>
            );
          })}

        {!loadingFirst && !pageLoading && allResults.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
            <div className="mb-2 text-5xl">🔎</div>
            <p className="text-sm text-neutral-700">
              Enter a title and a location, then hit <span className="font-semibold">Search</span>.
            </p>
          </div>
        )}

        {!loadingFirst && (allResults.length > 0 || page > 1) && (
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={!canPrev}
              aria-label="Previous page"
              className={[
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm',
                canPrev
                  ? 'border-neutral-200 bg-white/80 text-neutral-800 hover:bg-white'
                  : 'cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300',
              ].join(' ')}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>

            <div className="text-sm text-neutral-700">
              Page <span className="font-semibold">{page}</span> / <span className="font-semibold">{totalPages}</span>
              {!Number.isFinite(totalAvailable as number) && allResults.length > 0 ? ' +' : ''}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              aria-label="Next page"
              className={[
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm',
                canNext
                  ? 'border-neutral-200 bg-white/80 text-neutral-800 hover:bg-white'
                  : 'cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300',
              ].join(' ')}
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
