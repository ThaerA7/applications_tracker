"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Filter, Check, X, ChevronDown } from "lucide-react";

// --------- Types & helpers (reusable across pages) ----------

export type InterviewDatePreset =
  | "any"
  | "next7"
  | "next30"
  | "next90"
  | "last7"
  | "last30"
  | "last90"
  | "thisYear"
  | "custom";

export type InterviewFilters = {
  // Date scopes
  upcomingPreset: InterviewDatePreset;
  upcomingFrom: string; // yyyy-mm-dd
  upcomingTo: string;   // yyyy-mm-dd

  pastPreset: InterviewDatePreset;
  pastFrom: string; // yyyy-mm-dd
  pastTo: string;   // yyyy-mm-dd

  // Lists
  locations: string[];
  interviewTypes: string[];
  employmentTypes: string[];

  // Toggles
  hasNotes: boolean;
  hasContact: boolean;
  hasJobLink: boolean;
};

export const DEFAULT_INTERVIEW_FILTERS: InterviewFilters = {
  upcomingPreset: "any",
  upcomingFrom: "",
  upcomingTo: "",

  pastPreset: "any",
  pastFrom: "",
  pastTo: "",

  locations: [],
  interviewTypes: [],
  employmentTypes: [],

  hasNotes: false,
  hasContact: false,
  hasJobLink: false,
};

export function getActiveFilterCount(filters: InterviewFilters): number {
  let c = 0;

  if (filters.upcomingPreset !== "any") c += 1;
  if (filters.pastPreset !== "any") c += 1;

  c += filters.locations.length;
  c += filters.interviewTypes.length;
  c += filters.employmentTypes.length;

  if (filters.hasNotes) c += 1;
  if (filters.hasContact) c += 1;
  if (filters.hasJobLink) c += 1;

  return c;
}

// Minimal shape the filter logic expects
export type FilterableInterviewContact =
  | {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    }
  | null
  | undefined;

export type FilterableInterview = {
  id: string;
  company?: string;
  role?: string;
  location?: string;
  stage: "upcoming" | "past" | "done";
  date: string; // ISO string
  type?: string;
  employmentType?: string;
  appliedOn?: string;
  notes?: string | null;
  url?: string | null;
  contact?: FilterableInterviewContact;
};

function parseDateSafe(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function presetRangeForStage(
  preset: InterviewDatePreset,
  stageForRange: "upcoming" | "past"
) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (stageForRange === "upcoming") {
    if (preset === "next7") {
      return { from: todayStart, to: addDays(todayEnd, 6) };
    }
    if (preset === "next30") {
      return { from: todayStart, to: addDays(todayEnd, 29) };
    }
    if (preset === "next90") {
      return { from: todayStart, to: addDays(todayEnd, 89) };
    }
    // "any", "custom" or past-oriented presets => no range, handled elsewhere
    return { from: null as Date | null, to: null as Date | null };
  }

  // stageForRange === "past"
  if (preset === "last7") {
    return { from: addDays(todayStart, -6), to: todayEnd };
  }
  if (preset === "last30") {
    return { from: addDays(todayStart, -29), to: todayEnd };
  }
  if (preset === "last90") {
    return { from: addDays(todayStart, -89), to: todayEnd };
  }
  if (preset === "thisYear") {
    const from = startOfDay(new Date(now.getFullYear(), 0, 1));
    return { from, to: todayEnd };
  }

  // "any", "custom" or upcoming-oriented presets => no range (handled elsewhere)
  return { from: null as Date | null, to: null as Date | null };
}

function normalizeList(values: (string | undefined | null)[]) {
  const set = new Set<string>();
  values.forEach((v) => {
    const s = (v ?? "").trim();
    if (s) set.add(s);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function summarizeSelection(
  values: string[],
  getLabel: (v: string) => string,
  emptyLabel = "Any"
) {
  if (values.length === 0) return emptyLabel;
  if (values.length === 1) return getLabel(values[0]);
  if (values.length === 2)
    return `${getLabel(values[0])}, ${getLabel(values[1])}`;
  return `${getLabel(values[0])}, ${getLabel(values[1])} +${
    values.length - 2
  }`;
}

function formatInterviewTypeLabel(value: string) {
  const v = value.toLowerCase();
  if (v === "phone") return "Phone screening";
  if (v === "video") return "Video call";
  if (v === "in-person" || v === "in person") return "In person";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Public helper to reuse the same filtering logic on the page
export function filterInterviews<T extends FilterableInterview>(
  items: T[],
  query: string,
  filters: InterviewFilters,
  stageFilter: "upcoming" | "past" | "done"
): T[] {
  // Stage view (upcoming / past / done)
  let list: T[] = items.filter((i) => i.stage === stageFilter);

  // Search query
  const q = query.toLowerCase().trim();
  if (q) {
    list = list.filter((i) =>
      [
        i.company,
        i.role,
        i.location,
        i.type,
        i.appliedOn,
        i.employmentType,
        i.notes,
        i.contact?.name,
        i.contact?.email,
        i.contact?.phone,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }

  // Location filter
  if (filters.locations.length > 0) {
    const set = new Set(filters.locations);
    list = list.filter((i) => set.has((i.location ?? "").trim()));
  }

  // Interview type filter
  if (filters.interviewTypes.length > 0) {
    const set = new Set(filters.interviewTypes);
    list = list.filter((i) => set.has((i.type ?? "").trim()));
  }

  // Employment type filter
  if (filters.employmentTypes.length > 0) {
    const set = new Set(filters.employmentTypes);
    list = list.filter((i) => set.has((i.employmentType ?? "").trim()));
  }

  // Boolean toggles
 if (filters.hasNotes) {
    list = list.filter((i) => !!(i.notes && i.notes.trim().length > 0));
  }
  if (filters.hasContact) {
    list = list.filter((i) => {
      const c = i.contact;
      if (!c) return false;
      return !!(
        (c.name && c.name.trim()) ||
        (c.email && c.email.trim()) ||
        (c.phone && c.phone.trim())
      );
    });
  }
  if (filters.hasJobLink) {
    list = list.filter((i) => !!(i.url && i.url.trim().length > 0));
  }

  // Date scopes – upcoming vs past/done
  const isUpcomingStage = stageFilter === "upcoming";
  const stageForRange: "upcoming" | "past" = isUpcomingStage ? "upcoming" : "past";

  const preset = isUpcomingStage
    ? filters.upcomingPreset
    : filters.pastPreset;

  if (preset === "custom") {
    const fromStr = isUpcomingStage ? filters.upcomingFrom : filters.pastFrom;
    const toStr = isUpcomingStage ? filters.upcomingTo : filters.pastTo;

    const from = parseDateSafe(fromStr);
    const to = parseDateSafe(toStr);

    if (from || to) {
      const fromD = from ? startOfDay(from) : null;
      const toD = to ? endOfDay(to) : null;

      list = list.filter((i) => {
        const t = Date.parse(i.date);
        if (Number.isNaN(t)) return false;

        if (fromD && t < fromD.getTime()) return false;
        if (toD && t > toD.getTime()) return false;

        return true;
      });
    }
  } else if (preset !== "any") {
    const { from, to } = presetRangeForStage(preset, stageForRange);
    if (from || to) {
      const fromT = from ? from.getTime() : null;
      const toT = to ? to.getTime() : null;

      list = list.filter((i) => {
        const t = Date.parse(i.date);
        if (Number.isNaN(t)) return false;
        if (fromT !== null && t < fromT) return false;
        if (toT !== null && t > toT) return false;
        return true;
      });
    }
  }

  return list;
}

// ---------- UI: Multi-select dropdown ----------

type MultiSelectDropdownProps = {
  title: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  emptyText?: string;
  placeholder?: string;
  getLabel?: (value: string) => string;
};

function MultiSelectDropdown({
  title,
  options,
  values,
  onToggle,
  onClear,
  emptyText = "—",
  placeholder = "Any",
  getLabel,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const labelFor = useCallback(
    (value: string) => (getLabel ? getLabel(value) : value),
    [getLabel]
  );

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      const root = rootRef.current;
      if (!target || !root) return;
      if (root.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const summary = summarizeSelection(values, labelFor, placeholder);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {title}
        </div>
        {values.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] font-medium text-neutral-500 hover:text-neutral-900"
          >
            Clear
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          "mt-2 inline-flex w-full items-center justify-between gap-2",
          "rounded-lg border border-neutral-200 bg-white px-3 py-2",
          "text-xs font-medium text-neutral-800",
          "hover:bg-neutral-50",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:border-emerald-300",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={values.length === 0 ? "text-neutral-500" : ""}>
          {summary}
        </span>
        <ChevronDown
          className={[
            "h-3.5 w-3.5 transition-transform",
            open ? "rotate-180 text-emerald-600" : "text-neutral-500",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={`${title} options`}
          className={[
            "absolute z-20 mt-2 w-full",
            "rounded-xl border border-neutral-200/80",
            "bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90",
            "shadow-xl",
            "max-h-56 overflow-auto",
          ].join(" ")}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-neutral-400">
              {emptyText}
            </div>
          ) : (
            <div className="p-1">
              {options.map((opt) => {
                const active = values.includes(opt);
                const label = labelFor(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onToggle(opt)}
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs",
                      active
                        ? "bg-emerald-50 text-emerald-900"
                        : "text-neutral-800 hover:bg-neutral-50",
                    ].join(" ")}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="truncate">{label}</span>
                    {active && (
                      <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- UI: Date preset dropdowns ----------

type DatePresetDropdownProps = {
  label: string;
  value: InterviewDatePreset;
  options: { value: InterviewDatePreset; label: string }[];
  onChange: (preset: InterviewDatePreset) => void;
};

function DatePresetDropdown({
  label,
  value,
  options,
  onChange,
}: DatePresetDropdownProps) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as InterviewDatePreset)}
        className={[
          "h-9 w-full rounded-lg px-2.5 text-xs font-medium",
          "border border-neutral-200 bg-white text-neutral-900",
          "hover:bg-neutral-50",
          "focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300",
        ].join(" ")}
      >
        {options.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const UPCOMING_PRESET_OPTIONS: { value: InterviewDatePreset; label: string }[] =
  [
    { value: "any", label: "Any time" },
    { value: "next7", label: "Next 7 days" },
    { value: "next30", label: "Next 30 days" },
    { value: "next90", label: "Next 90 days" },
    { value: "custom", label: "Custom range" },
  ];

const PAST_PRESET_OPTIONS: { value: InterviewDatePreset; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "thisYear", label: "This year" },
  { value: "custom", label: "Custom range" },
];

// ---------- Main component ----------

type InterviewsFilterProps = {
  items: FilterableInterview[];
  filters: InterviewFilters;
  onChange: Dispatch<SetStateAction<InterviewFilters>>;
  filteredCount: number;
  /** number of interviews in the current stage view */
  totalInStage: number;
};

export default function InterviewsFilter({
  items,
  filters,
  onChange,
  filteredCount,
  totalInStage,
}: InterviewsFilterProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters),
    [filters]
  );

  const locationOptions = useMemo(
    () => normalizeList(items.map((i) => i.location)),
    [items]
  );
  const interviewTypeOptions = useMemo(
    () => normalizeList(items.map((i) => i.type)),
    [items]
  );
  const employmentOptions = useMemo(
    () => normalizeList(items.map((i) => i.employmentType)),
    [items]
  );

  const hasAnyInterviews = items.length > 0;

  const setFilters = onChange;

  // close on ESC / outside click
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      const panel = panelRef.current;
      const btn = buttonRef.current;

      if (!target) return;
      if (panel?.contains(target)) return;
      if (btn?.contains(target)) return;

      setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const handleUpcomingPresetChange = useCallback(
    (preset: InterviewDatePreset) => {
      setFilters((f) => ({
        ...f,
        upcomingPreset: preset,
      }));
    },
    [setFilters]
  );

  const handlePastPresetChange = useCallback(
    (preset: InterviewDatePreset) => {
      setFilters((f) => ({
        ...f,
        pastPreset: preset,
      }));
    },
    [setFilters]
  );

  const toggleInArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const handleToggleLocation = useCallback(
    (value: string) => {
      setFilters((f) => ({
        ...f,
        locations: toggleInArray(f.locations, value),
      }));
    },
    [setFilters]
  );

  const handleToggleInterviewType = useCallback(
    (value: string) => {
      setFilters((f) => ({
        ...f,
        interviewTypes: toggleInArray(f.interviewTypes, value),
      }));
    },
    [setFilters]
  );

  const handleToggleEmployment = useCallback(
    (value: string) => {
      setFilters((f) => ({
        ...f,
        employmentTypes: toggleInArray(f.employmentTypes, value),
      }));
    },
    [setFilters]
  );

  const clearFilters = useCallback(
    () => setFilters((f) => ({ ...DEFAULT_INTERVIEW_FILTERS })),
    [setFilters]
  );

  type BooleanKey = "hasNotes" | "hasContact" | "hasJobLink";

  const booleanToggles: { key: BooleanKey; label: string; hint: string }[] = [
    {
      key: "hasNotes",
      label: "Has notes",
      hint: "Interviews with prep notes",
    },
    {
      key: "hasContact",
      label: "Has contact",
      hint: "Reach someone directly",
    },
    {
      key: "hasJobLink",
      label: "Has job link",
      hint: "Open posting fast",
    },
  ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium",
          "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
          "border shadow-sm hover:bg-white active:bg-neutral-50",
          activeFilterCount > 0
            ? "border-emerald-200 text-emerald-900"
            : "border-neutral-200 text-neutral-800",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Filter
          className={[
            "h-4 w-4",
            activeFilterCount > 0 ? "text-emerald-600" : "text-neutral-700",
          ].join(" ")}
          aria-hidden="true"
        />
        <span>Filter</span>

        {activeFilterCount > 0 && (
          <span className="ml-1 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900 ring-1 ring-inset ring-emerald-200">
            {activeFilterCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Filter interviews"
          className={[
            "absolute right-0 mt-2 w-[min(92vw,560px)]",
            "rounded-2xl border border-neutral-200/80",
            "bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80",
            "shadow-2xl z-50",
          ].join(" ")}
        >
          {/* Header */}
          <div className="relative overflow-hidden rounded-t-2xl border-b border-neutral-200/70 px-5 py-4">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/15 blur-2xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-10 h-36 w-36 rounded-full bg-teal-400/15 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-inset ring-emerald-100">
                    <Filter className="h-4 w-4 text-emerald-600" />
                  </span>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Refine your interviews
                  </h3>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  Only the filters that actually help you scan and act faster.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/80 text-neutral-600 hover:bg-white hover:text-neutral-900"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[70vh] overflow-auto px-5 py-4">
            {!hasAnyInterviews && (
              <div className="mb-4 rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-600">
                Add a few interviews first — filters will populate
                automatically.
              </div>
            )}

            {/* Date scopes – upcoming vs past/done */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Upcoming interviews date scope */}
              <div>
                <DatePresetDropdown
                  label="Upcoming interviews date"
                  value={filters.upcomingPreset}
                  options={UPCOMING_PRESET_OPTIONS}
                  onChange={handleUpcomingPresetChange}
                />

                {filters.upcomingPreset === "custom" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-medium text-neutral-500">
                        From
                      </span>
                      <input
                        type="date"
                        value={filters.upcomingFrom}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            upcomingFrom: e.target.value,
                          }))
                        }
                        className={[
                          "h-9 w-full rounded-lg px-2.5 text-xs text-neutral-900",
                          "border border-neutral-200 bg-white",
                          "focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300",
                        ].join(" ")}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-medium text-neutral-500">
                        To
                      </span>
                      <input
                        type="date"
                        value={filters.upcomingTo}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            upcomingTo: e.target.value,
                          }))
                        }
                        className={[
                          "h-9 w-full rounded-lg px-2.5 text-xs text-neutral-900",
                          "border border-neutral-200 bg-white",
                          "focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300",
                        ].join(" ")}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Past / done interviews date scope */}
              <div>
                <DatePresetDropdown
                  label="Past & done interviews date"
                  value={filters.pastPreset}
                  options={PAST_PRESET_OPTIONS}
                  onChange={handlePastPresetChange}
                />

                {filters.pastPreset === "custom" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-medium text-neutral-500">
                        From
                      </span>
                      <input
                        type="date"
                        value={filters.pastFrom}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            pastFrom: e.target.value,
                          }))
                        }
                        className={[
                          "h-9 w-full rounded-lg px-2.5 text-xs text-neutral-900",
                          "border border-neutral-200 bg-white",
                          "focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300",
                        ].join(" ")}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-medium text-neutral-500">
                        To
                      </span>
                      <input
                        type="date"
                        value={filters.pastTo}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            pastTo: e.target.value,
                          }))
                        }
                        className={[
                          "h-9 w-full rounded-lg px-2.5 text-xs text-neutral-900",
                          "border border-neutral-200 bg-white",
                          "focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300",
                        ].join(" ")}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Location + type + employment */}
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <MultiSelectDropdown
                title="Location / City"
                options={locationOptions}
                values={filters.locations}
                onToggle={handleToggleLocation}
                onClear={() => setFilters((f) => ({ ...f, locations: [] }))}
                placeholder="Any location"
              />

              <MultiSelectDropdown
                title="Interview type"
                options={interviewTypeOptions}
                values={filters.interviewTypes}
                onToggle={handleToggleInterviewType}
                onClear={() =>
                  setFilters((f) => ({ ...f, interviewTypes: [] }))
                }
                placeholder="Any type"
                getLabel={formatInterviewTypeLabel}
              />

              <MultiSelectDropdown
                title="Employment TYPE"
                options={employmentOptions}
                values={filters.employmentTypes}
                onToggle={handleToggleEmployment}
                onClear={() =>
                  setFilters((f) => ({ ...f, employmentTypes: [] }))
                }
                placeholder="Any type"
              />
            </div>

            {/* Helpful toggles */}
            <div className="mt-6">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Helpful shortcuts
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {booleanToggles.map((opt) => {
                  const active = filters[opt.key];
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          [opt.key]: !f[opt.key],
                        }))
                      }
                      className={[
                        "group rounded-xl border px-3 py-2 text-left transition-all",
                        active
                          ? "border-emerald-200 bg-emerald-50/70 ring-1 ring-inset ring-emerald-100"
                          : "border-neutral-200 bg-white hover:bg-neutral-50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={[
                            "text-xs font-semibold",
                            active
                              ? "text-emerald-900"
                              : "text-neutral-900",
                          ].join(" ")}
                        >
                          {opt.label}
                        </span>
                        <span
                          className={[
                            "inline-flex h-5 w-9 items-center rounded-full p-0.5 transition",
                            active ? "bg-emerald-600" : "bg-neutral-200",
                          ].join(" ")}
                          aria-hidden="true"
                        >
                          <span
                            className={[
                              "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                              active ? "translate-x-4" : "translate-x-0",
                            ].join(" ")}
                          />
                        </span>
                      </div>
                      <div
                        className={[
                          "mt-0.5 text-[10px]",
                          active
                            ? "text-emerald-700"
                            : "text-neutral-500",
                        ].join(" ")}
                      >
                        {opt.hint}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-neutral-200/70 px-5 py-3">
            <div className="text-[11px] text-neutral-500">
              Showing{" "}
              <span className="font-semibold text-neutral-800">
                {filteredCount}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-neutral-800">
                {totalInStage}
              </span>{" "}
              in this view
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearFilters}
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                  "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                ].join(" ")}
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                  "border border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500",
                ].join(" ")}
              >
                <Check className="h-3.5 w-3.5" />
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
