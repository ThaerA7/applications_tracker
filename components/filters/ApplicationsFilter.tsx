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
import { Check, Filter, X } from "lucide-react";
import type { AppliedApplication } from "@/lib/types/applied";
import { parseDateSafe, startOfDay, endOfDay, presetRange, type DateFilterPreset } from "@/lib/utils/dateUtils";
import { toggleInArray, normalizeList } from "@/lib/utils/filterUtils";
import MultiSelectDropdown from "./shared/MultiSelectDropdown";

// --------- Types & helpers ----------

// Re-export for consumers
export type ApplicationFilterPreset = DateFilterPreset;

export type ApplicationFilters = {
  locations: string[];
  employmentTypes: string[];
  sources: string[];

  appliedPreset: ApplicationFilterPreset;
  appliedFrom: string; // yyyy-mm-dd
  appliedTo: string; // yyyy-mm-dd

  startPreset: ApplicationFilterPreset;
  startFrom: string; // yyyy-mm-dd
  startTo: string; // yyyy-mm-dd

  hasNotes: boolean;
  hasContact: boolean;
  hasOfferUrl: boolean;
};

export const DEFAULT_APPLICATION_FILTERS: ApplicationFilters = {
  locations: [],
  employmentTypes: [],
  sources: [],

  appliedPreset: "any",
  appliedFrom: "",
  appliedTo: "",

  startPreset: "any",
  startFrom: "",
  startTo: "",

  hasNotes: false,
  hasContact: false,
  hasOfferUrl: false,
};

export function getActiveFilterCount(filters: ApplicationFilters): number {
  let c = 0;
  c += filters.locations.length;
  c += filters.employmentTypes.length;
  c += filters.sources.length;

  if (filters.appliedPreset !== "any") c += 1;
  if (filters.startPreset !== "any") c += 1;

  if (filters.hasNotes) c += 1;
  if (filters.hasContact) c += 1;
  if (filters.hasOfferUrl) c += 1;
  return c;
}

const PRESET_OPTIONS: { value: ApplicationFilterPreset; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "thisYear", label: "This year" },
  { value: "custom", label: "Custom range" },
];

// Public helper to reuse the same filtering logic on any page
export function filterApplications(
  applications: AppliedApplication[],
  query: string,
  filters: ApplicationFilters
): AppliedApplication[] {
  let list = applications;

  // Search query
  const q = query.toLowerCase().trim();
  if (q) {
    list = list.filter((a) =>
      [a.company, a.role, a.location, a.status]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }

  // Location filter
  if (filters.locations.length > 0) {
    const set = new Set(filters.locations);
    list = list.filter((a) => set.has((a.location ?? "").trim()));
  }

  // Employment type filter
  if (filters.employmentTypes.length > 0) {
    const set = new Set(filters.employmentTypes);
    list = list.filter((a) => set.has((a.employmentType ?? "").trim()));
  }

  // Source filter
  if (filters.sources.length > 0) {
    const set = new Set(filters.sources);
    list = list.filter((a) => set.has((a.source ?? "").trim()));
  }

  // Boolean "quality-of-life" filters
  if (filters.hasNotes) {
    list = list.filter((a) => !!a.notes && a.notes.trim().length > 0);
  }
  if (filters.hasContact) {
    list = list.filter(
      (a) =>
        !!(a.contactPerson && a.contactPerson.trim()) ||
        !!(a.contactEmail && a.contactEmail.trim()) ||
        !!(a.contactPhone && a.contactPhone.trim())
    );
  }
  if (filters.hasOfferUrl) {
    list = list.filter((a) => !!a.offerUrl && a.offerUrl.trim().length > 0);
  }

  // Applied date filter
  if (filters.appliedPreset !== "any") {
    if (filters.appliedPreset === "custom") {
      const from = parseDateSafe(filters.appliedFrom);
      const to = parseDateSafe(filters.appliedTo);

      if (from || to) {
        const fromD = from ? startOfDay(from) : null;
        const toD = to ? endOfDay(to) : null;

        list = list.filter((a) => {
          const d = parseDateSafe(a.appliedOn);
          if (!d) return false;

          const t = d.getTime();
          if (fromD && t < fromD.getTime()) return false;
          if (toD && t > toD.getTime()) return false;
          return true;
        });
      }
    } else {
      const { from, to } = presetRange(filters.appliedPreset);
      if (from && to) {
        const fromT = from.getTime();
        const toT = to.getTime();

        list = list.filter((a) => {
          const d = parseDateSafe(a.appliedOn);
          if (!d) return false;
          const t = d.getTime();
          return t >= fromT && t <= toT;
        });
      }
    }
  }

  // Start date filter
  if (filters.startPreset !== "any") {
    if (filters.startPreset === "custom") {
      const from = parseDateSafe(filters.startFrom);
      const to = parseDateSafe(filters.startTo);

      if (from || to) {
        const fromD = from ? startOfDay(from) : null;
        const toD = to ? endOfDay(to) : null;

        list = list.filter((a) => {
          const d = parseDateSafe(a.startDate);
          if (!d) return false;

          const t = d.getTime();
          if (fromD && t < fromD.getTime()) return false;
          if (toD && t > toD.getTime()) return false;
          return true;
        });
      }
    } else {
      const { from, to } = presetRange(filters.startPreset);
      if (from && to) {
        const fromT = from.getTime();
        const toT = to.getTime();

        list = list.filter((a) => {
          const d = parseDateSafe(a.startDate);
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

type ApplicationsFilterProps = {
  applications: AppliedApplication[];
  filters: ApplicationFilters;
  onChange: Dispatch<SetStateAction<ApplicationFilters>>;
  filteredCount: number;
  /** e.g. "applied", "rejected", "withdrawn" */
  listLabel?: string;
};

function DatePresetDropdown({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ApplicationFilterPreset;
  onChange: (preset: ApplicationFilterPreset) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ApplicationFilterPreset)}
        className={[
          "h-9 w-full rounded-lg px-2.5 text-xs font-medium",
          "border border-neutral-200 bg-white text-neutral-900",
          "hover:bg-neutral-50",
          "focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300",
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

export default function ApplicationsFilter({
  applications,
  filters,
  onChange,
  filteredCount,
  listLabel = "applied",
}: ApplicationsFilterProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const totalCount = applications.length;
  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters),
    [filters]
  );
  const hasAnyApplications = totalCount > 0;

  const locationOptions = useMemo(
    () => normalizeList(applications.map((a) => a.location)),
    [applications]
  );
  const employmentOptions = useMemo(
    () => normalizeList(applications.map((a) => a.employmentType)),
    [applications]
  );
  const sourceOptions = useMemo(
    () => normalizeList(applications.map((a) => a.source)),
    [applications]
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

  const handleToggleSource = useCallback(
    (value: string) => {
      setFilters((f) => ({
        ...f,
        sources: toggleInArray(f.sources, value),
      }));
    },
    [setFilters]
  );

  const handleAppliedPresetChange = useCallback(
    (preset: ApplicationFilterPreset) => {
      setFilters((f) => ({
        ...f,
        appliedPreset: preset,
      }));
    },
    [setFilters]
  );

  const handleStartPresetChange = useCallback(
    (preset: ApplicationFilterPreset) => {
      setFilters((f) => ({
        ...f,
        startPreset: preset,
      }));
    },
    [setFilters]
  );

  const clearFilters = useCallback(
    () => setFilters(DEFAULT_APPLICATION_FILTERS),
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
            ? "border-sky-200 text-sky-900"
            : "border-neutral-200 text-neutral-800",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Filter
          className={[
            "h-4 w-4",
            activeFilterCount > 0 ? "text-sky-600" : "text-neutral-700",
          ].join(" ")}
          aria-hidden="true"
        />
        <span>Filter</span>

        {activeFilterCount > 0 && (
          <span className="ml-1 inline-flex items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-900 ring-1 ring-inset ring-sky-200">
            {activeFilterCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Filter applications"
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
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-400/15 blur-2xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-10 h-36 w-36 rounded-full bg-fuchsia-400/15 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 ring-1 ring-inset ring-sky-100">
                    <Filter className="h-4 w-4 text-sky-600" />
                  </span>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Refine your {listLabel} list
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
          <div className="max-h-[70vh] overflow-auto px-5 py-3">
            {!hasAnyApplications && (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-600">
                Add a few applications first — filters will populate
                automatically.
              </div>
            )}

            {/* Dates (Applied + Start on same row) */}
            <div className="mt-0">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Applied date column */}
                <div>
                  <DatePresetDropdown
                    label="Applied date"
                    value={filters.appliedPreset}
                    onChange={handleAppliedPresetChange}
                  />

                  {filters.appliedPreset === "custom" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[10px] font-medium text-neutral-500">
                          From
                        </span>
                        <input
                          type="date"
                          value={filters.appliedFrom}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              appliedFrom: e.target.value,
                            }))
                          }
                          className={[
                            "h-9 w-full rounded-lg px-2.5 text-xs text-neutral-900",
                            "border border-neutral-200 bg-white",
                            "focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300",
                          ].join(" ")}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-medium text-neutral-500">
                          To
                        </span>
                        <input
                          type="date"
                          value={filters.appliedTo}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              appliedTo: e.target.value,
                            }))
                          }
                          className={[
                            "h-9 w-full rounded-lg px-2.5 text-xs text-neutral-900",
                            "border border-neutral-200 bg-white",
                            "focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300",
                          ].join(" ")}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Start date column */}
                <div>
                  <DatePresetDropdown
                    label="Start date"
                    value={filters.startPreset}
                    onChange={handleStartPresetChange}
                  />

                  {filters.startPreset === "custom" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[10px] font-medium text-neutral-500">
                          From
                        </span>
                        <input
                          type="date"
                          value={filters.startFrom}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              startFrom: e.target.value,
                            }))
                          }
                          className={[
                            "h-9 w-full rounded-lg px-2.5 text-xs text-neutral-900",
                            "border border-neutral-200 bg-white",
                            "focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300",
                          ].join(" ")}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-medium text-neutral-500">
                          To
                        </span>
                        <input
                          type="date"
                          value={filters.startTo}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              startTo: e.target.value,
                            }))
                          }
                          className={[
                            "h-9 w-full rounded-lg px-2.5 text-xs text-neutral-900",
                            "border border-neutral-200 bg-white",
                            "focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300",
                          ].join(" ")}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Location + employment + source (dropdowns) */}
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
                title="Employment"
                options={employmentOptions}
                values={filters.employmentTypes}
                onToggle={handleToggleEmployment}
                onClear={() =>
                  setFilters((f) => ({ ...f, employmentTypes: [] }))
                }
                placeholder="Any type"
              />

              <MultiSelectDropdown
                title="Source"
                options={sourceOptions}
                values={filters.sources}
                onToggle={handleToggleSource}
                onClear={() => setFilters((f) => ({ ...f, sources: [] }))}
                placeholder="Any source"
              />
            </div>

            {/* Helpful toggles */}
            <div className="mt-6">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Helpful shortcuts
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {[
                  {
                    key: "hasNotes" as const,
                    label: "Has notes",
                    hint: "Find apps with context",
                  },
                  {
                    key: "hasContact" as const,
                    label: "Has contact",
                    hint: "Ready to follow up",
                  },
                  {
                    key: "hasOfferUrl" as const,
                    label: "Has job link",
                    hint: "Open posting fast",
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
                          ? "border-emerald-200 bg-emerald-50/70 ring-1 ring-inset ring-emerald-100"
                          : "border-neutral-200 bg-white hover:bg-neutral-50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={[
                            "text-xs font-semibold",
                            active ? "text-emerald-900" : "text-neutral-900",
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
                          active ? "text-emerald-700" : "text-neutral-500",
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
                  "border border-sky-500 bg-sky-600 text-white hover:bg-sky-500",
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