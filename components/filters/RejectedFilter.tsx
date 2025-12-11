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
import { Check, ChevronDown, Filter, X } from "lucide-react";
import type { RejectionDetails } from "@/components/dialogs/MoveToRejectedDialog";

// Shape we rely on – your Rejection type is compatible with this
type RejectionLike = {
  company: string;
  role: string;
  location?: string;
  employmentType?: string;
  rejectionType: RejectionDetails["rejectionType"];
  decisionDate: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  url?: string;
};

export type DateFilterPreset =
  | "any"
  | "last7"
  | "last30"
  | "last90"
  | "thisYear"
  | "custom";

export type RejectedFilters = {
  // decision date
  decisionPreset: DateFilterPreset;
  decisionFrom: string;
  decisionTo: string;

  // multi-selects
  locations: string[];
  employmentTypes: string[];
  rejectionKinds: string[];

  // toggles
  hasNotes: boolean;
  /** when true: only show rejectionType === "no-interview" */
  onlyNoInterview: boolean;
  hasJobLink: boolean;
};

export const DEFAULT_REJECTED_FILTERS: RejectedFilters = {
  decisionPreset: "any",
  decisionFrom: "",
  decisionTo: "",
  locations: [],
  employmentTypes: [],
  rejectionKinds: [],
  hasNotes: false,
  onlyNoInterview: false,
  hasJobLink: false,
};

export function getActiveFilterCount(filters: RejectedFilters): number {
  let c = 0;
  c += filters.locations.length;
  c += filters.employmentTypes.length;
  c += filters.rejectionKinds.length;

  if (filters.decisionPreset !== "any") c += 1;

  if (filters.hasNotes) c += 1;
  if (filters.onlyNoInterview) c += 1;
  if (filters.hasJobLink) c += 1;

  return c;
}

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

function presetRange(preset: DateFilterPreset) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (preset === "last7") {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 6);
    return { from, to: todayEnd };
  }
  if (preset === "last30") {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 29);
    return { from, to: todayEnd };
  }
  if (preset === "last90") {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 89);
    return { from, to: todayEnd };
  }
  if (preset === "thisYear") {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from: startOfDay(from), to: todayEnd };
  }

  return { from: null as Date | null, to: null as Date | null };
}

function toggleInArray(arr: string[], value: string) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function normalizeList(values: (string | undefined | null)[]) {
  const set = new Set<string>();
  values.forEach((v) => {
    const s = (v ?? "").trim();
    if (s) set.add(s);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

const PRESET_OPTIONS: { value: DateFilterPreset; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "thisYear", label: "This year" },
  { value: "custom", label: "Custom range" },
];

const REJECTION_LABELS: Record<string, string> = {
  "no-interview": "No interview",
  "after-phone-screening": "After phone screening",
  "after-first-interview": "After first interview",
  "after-second-interview": "After second interview",
};

function labelForRejectionType(value: string) {
  return REJECTION_LABELS[value] ?? value;
}

function summarizeSelection(
  values: string[],
  getLabel: (value: string) => string,
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

function MultiSelectDropdown({
  title,
  options,
  values,
  onToggle,
  onClear,
  emptyText = "—",
  placeholder = "Any",
  getLabel,
}: {
  title: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  emptyText?: string;
  placeholder?: string;
  getLabel?: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const labelFn = useCallback(
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

  const summary = summarizeSelection(values, labelFn, placeholder);

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
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:border-rose-300",
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
            open ? "rotate-180 text-rose-600" : "text-neutral-500",
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
                const label = labelFn(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onToggle(opt)}
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs",
                      active
                        ? "bg-rose-50 text-rose-900"
                        : "text-neutral-800 hover:bg-neutral-50",
                    ].join(" ")}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="truncate">{label}</span>
                    {active && (
                      <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white">
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

function DatePresetDropdown({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DateFilterPreset;
  onChange: (preset: DateFilterPreset) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DateFilterPreset)}
        className={[
          "h-9 w-full rounded-lg px-2.5 text-xs font-medium",
          "border border-neutral-200 bg-white text-neutral-900",
          "hover:bg-neutral-50",
          "focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300",
        ].join(" ")}
      >
        {PRESET_OPTIONS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ---------- Filtering logic (reused by page) ----------

export function filterRejected<T extends RejectionLike>(
  items: T[],
  query: string,
  filters: RejectedFilters
): T[] {
  let list = items;

  const q = query.toLowerCase().trim();
  if (q) {
    list = list.filter((item) =>
      [
        item.company,
        item.role,
        item.location,
        item.employmentType,
        item.rejectionType,
        item.notes,
        item.contactName,
        item.contactEmail,
        item.contactPhone,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }

  // Location filter
  if (filters.locations.length > 0) {
    const set = new Set(filters.locations);
    list = list.filter((item) => set.has((item.location ?? "").trim()));
  }

  // Employment type filter
  if (filters.employmentTypes.length > 0) {
    const set = new Set(filters.employmentTypes);
    list = list.filter((item) =>
      set.has((item.employmentType ?? "").trim())
    );
  }

  // Rejection kind filter
  if (filters.rejectionKinds.length > 0) {
    const set = new Set(filters.rejectionKinds);
    list = list.filter((item) => set.has(item.rejectionType));
  }

  // Toggles
  if (filters.hasNotes) {
    list = list.filter((item) => !!item.notes && item.notes.trim().length > 0);
  }

  // NEW: only show "no-interview" rejections if enabled
  if (filters.onlyNoInterview) {
    list = list.filter((item) => item.rejectionType === "no-interview");
  }

  if (filters.hasJobLink) {
    list = list.filter(
      (item) => !!item.url && item.url.trim().length > 0
    );
  }

  // Decision date filter
  if (filters.decisionPreset !== "any") {
    if (filters.decisionPreset === "custom") {
      const from = parseDateSafe(filters.decisionFrom);
      const to = parseDateSafe(filters.decisionTo);

      if (from || to) {
        const fromD = from ? startOfDay(from) : null;
        const toD = to ? endOfDay(to) : null;

        list = list.filter((item) => {
          const d = parseDateSafe(item.decisionDate);
          if (!d) return false;

          const t = d.getTime();
          if (fromD && t < fromD.getTime()) return false;
          if (toD && t > toD.getTime()) return false;
          return true;
        });
      }
    } else {
      const { from, to } = presetRange(filters.decisionPreset);
      if (from && to) {
        const fromT = from.getTime();
        const toT = to.getTime();

        list = list.filter((item) => {
          const d = parseDateSafe(item.decisionDate);
          if (!d) return false;
          const t = d.getTime();
          return t >= fromT && t <= toT;
        });
      }
    }
  }

  return list;
}

// ---------- UI component (Filter button + popover) ----------

type RejectedFilterProps = {
  items: RejectionLike[];
  filters: RejectedFilters;
  onChange: Dispatch<SetStateAction<RejectedFilters>>;
  filteredCount: number;
};

export default function RejectedFilter({
  items,
  filters,
  onChange,
  filteredCount,
}: RejectedFilterProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const totalCount = items.length;
  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters),
    [filters]
  );
  const hasAnyItems = totalCount > 0;

  const locationOptions = useMemo(
    () => normalizeList(items.map((i) => i.location)),
    [items]
  );
  const employmentOptions = useMemo(
    () => normalizeList(items.map((i) => i.employmentType)),
    [items]
  );
  const rejectionOptions = useMemo(
    () => normalizeList(items.map((i) => i.rejectionType)),
    [items]
  );

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

  const setFilters = onChange;

  const handleDecisionPresetChange = useCallback(
    (preset: DateFilterPreset) => {
      setFilters((f) => ({
        ...f,
        decisionPreset: preset,
      }));
    },
    [setFilters]
  );

  const handleToggleLocation = useCallback(
    (value: string) => {
      setFilters((f) => ({
        ...f,
        locations: toggleInArray(f.locations, value),
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

  const handleToggleRejectionKind = useCallback(
    (value: string) => {
      setFilters((f) => ({
        ...f,
        rejectionKinds: toggleInArray(f.rejectionKinds, value),
      }));
    },
    [setFilters]
  );

  const clearFilters = useCallback(
    () => setFilters(DEFAULT_REJECTED_FILTERS),
    [setFilters]
  );

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
            ? "border-rose-200 text-rose-900"
            : "border-neutral-200 text-neutral-800",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-300",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Filter
          className={[
            "h-4 w-4",
            activeFilterCount > 0 ? "text-rose-600" : "text-neutral-700",
          ].join(" ")}
          aria-hidden="true"
        />
        <span>Filter</span>

        {activeFilterCount > 0 && (
          <span className="ml-1 inline-flex items-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-900 ring-1 ring-inset ring-rose-200">
            {activeFilterCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Filter rejected applications"
          className={[
            "absolute right-0 mt-2 w-[min(92vw,560px)]",
            "rounded-2xl border border-neutral-200/80",
            "bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80",
            "shadow-2xl",
            "z-50",
          ].join(" ")}
        >
          {/* Header */}
          <div className="relative overflow-hidden rounded-t-2xl border-b border-neutral-200/70 px-5 py-4">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-400/15 blur-2xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-10 h-36 w-36 rounded-full bg-pink-400/15 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 ring-1 ring-inset ring-rose-100">
                    <Filter className="h-4 w-4 text-rose-600" />
                  </span>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Refine your rejected list
                  </h3>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  Date scopes, location, interview stage, employment, and quick
                  toggles.
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
          <div className="max-h-[70vh] overflow-auto px-5 py-3">
            {!hasAnyItems && (
              <div className="mt-4 rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-600">
                Add a few rejected applications first — filters will populate
                automatically.
              </div>
            )}

            {/* Decision date */}
            <div className="mt-0">
              <DatePresetDropdown
                label="Decision date"
                value={filters.decisionPreset}
                onChange={handleDecisionPresetChange}
              />

              {filters.decisionPreset === "custom" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-[10px] font-medium text-neutral-500">
                      From
                    </span>
                    <input
                      type="date"
                      value={filters.decisionFrom}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          decisionFrom: e.target.value,
                        }))
                      }
                      className={[
                        "h-9 w-full rounded-lg px-2.5 text-xs text-neutral-900",
                        "border border-neutral-200 bg-white",
                        "focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300",
                      ].join(" ")}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-medium text-neutral-500">
                      To
                    </span>
                    <input
                      type="date"
                      value={filters.decisionTo}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          decisionTo: e.target.value,
                        }))
                      }
                      className={[
                        "h-9 w-full rounded-lg px-2.5 text-xs text-neutral-900",
                        "border border-neutral-200 bg-white",
                        "focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300",
                      ].join(" ")}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Location / employment / rejection kind */}
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
                title="Employment TYPE"
                options={employmentOptions}
                values={filters.employmentTypes}
                onToggle={handleToggleEmployment}
                onClear={() =>
                  setFilters((f) => ({ ...f, employmentTypes: [] }))
                }
                placeholder="Any type"
              />

              <MultiSelectDropdown
                title="Rejection stage"
                options={rejectionOptions}
                values={filters.rejectionKinds}
                onToggle={handleToggleRejectionKind}
                onClear={() =>
                  setFilters((f) => ({ ...f, rejectionKinds: [] }))
                }
                placeholder="Any stage"
                getLabel={labelForRejectionType}
              />
            </div>

            {/* Toggles */}
            <div className="mt-6">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Helpful shortcuts
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {[
                  {
                    key: "hasNotes" as const,
                    label: "Has notes",
                    hint: "See items with context",
                  },
                  {
                    key: "onlyNoInterview" as const,
                    label: "No interview",
                    hint: "Rejected before interview",
                  },
                  {
                    key: "hasJobLink" as const,
                    label: "Has job link",
                    hint: "Open posting quickly",
                  },
                ].map((opt) => {
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
                          ? "border-rose-200 bg-rose-50/70 ring-1 ring-inset ring-rose-100"
                          : "border-neutral-200 bg-white hover:bg-neutral-50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={[
                            "text-xs font-semibold",
                            active ? "text-rose-900" : "text-neutral-900",
                          ].join(" ")}
                        >
                          {opt.label}
                        </span>
                        <span
                          className={[
                            "inline-flex h-5 w-9 items-center rounded-full p-0.5 transition",
                            active ? "bg-rose-600" : "bg-neutral-200",
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
                          active ? "text-rose-700" : "text-neutral-500",
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
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-neutral-200/70 px-5 py-3">
            <div className="text-[11px] text-neutral-500">
              Showing{" "}
              <span className="font-semibold text-neutral-800">
                {filteredCount}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-neutral-800">
                {totalCount}
              </span>
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
                  "border border-rose-500 bg-rose-600 text-white hover:bg-rose-500",
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
