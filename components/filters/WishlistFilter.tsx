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
import type { WishlistItem } from "@/lib/services/wishlist";
import { parseDateSafe, startOfDay, endOfDay, presetRange } from "@/lib/utils/dateUtils";
import { toggleInArray, normalizeList } from "@/lib/utils/filterUtils";
import MultiSelectDropdown from "./shared/MultiSelectDropdown";

export type WishlistDatePreset = "any" | "last30" | "last90" | "thisYear" | "custom";

type WishlistPriorityFilter = "Default" | "Low" | "Medium" | "High";

export type WishlistFilters = {
  startPreset: WishlistDatePreset;
  startFrom: string;
  startTo: string;
  locations: string[];
  offerTypes: string[];
  priorities: WishlistPriorityFilter[];
};

export const DEFAULT_WISHLIST_FILTERS: WishlistFilters = {
  startPreset: "any",
  startFrom: "",
  startTo: "",
  locations: [],
  offerTypes: [],
  priorities: [],
};

const PRIORITY_OPTIONS: WishlistPriorityFilter[] = [
  "Default",
  "Low",
  "Medium",
  "High",
];

function getActiveFilterCount(filters: WishlistFilters): number {
  let c = 0;
  if (filters.startPreset !== "any") c += 1;
  c += filters.locations.length;
  c += filters.offerTypes.length;
  c += filters.priorities.length;
  return c;
}

function normalizePriority(priority?: WishlistItem["priority"]): WishlistPriorityFilter {
  if (priority === "Dream" || priority === "High") return "High";
  if (priority === "Medium") return "Medium";
  if (priority === "Low") return "Low";
  return "Default";
}

type WishlistFilterProps = {
  items: WishlistItem[];
  filters: WishlistFilters;
  onChange: Dispatch<SetStateAction<WishlistFilters>>;
  filteredCount: number;
};

function DatePresetDropdown({
  value,
  onChange,
}: {
  value: WishlistDatePreset;
  onChange: (preset: WishlistDatePreset) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        Start date
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as WishlistDatePreset)}
        className={[
          "h-9 w-full rounded-lg px-2.5 text-xs font-medium",
          "border border-neutral-200 bg-white text-neutral-900",
          "hover:bg-neutral-50",
          "focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300",
        ].join(" ")}
      >
        <option value="any">Any time</option>
        <option value="last30">Last 30 days</option>
        <option value="last90">Last 90 days</option>
        <option value="thisYear">This year</option>
        <option value="custom">Custom range</option>
      </select>
    </label>
  );
}

export function filterWishlistItems(
  items: WishlistItem[],
  query: string,
  filters: WishlistFilters
): WishlistItem[] {
  let list = items;

  const q = query.toLowerCase().trim();
  if (q) {
    list = list.filter((w) =>
      [w.company, w.role, w.location, w.offerType, w.priority]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }

  // Location filter
  if (filters.locations.length > 0) {
    const set = new Set(filters.locations);
    list = list.filter((w) => set.has((w.location ?? "").trim()));
  }

  // Offer type filter
  if (filters.offerTypes.length > 0) {
    const set = new Set(filters.offerTypes);
    list = list.filter((w) => set.has((w.offerType ?? "").trim()));
  }

  // Priority filter
  if (filters.priorities.length > 0) {
    const set = new Set(filters.priorities);
    list = list.filter((w) => set.has(normalizePriority(w.priority)));
  }

  // Start date filter
  if (filters.startPreset !== "any") {
    if (filters.startPreset === "custom") {
      const from = parseDateSafe(filters.startFrom);
      const to = parseDateSafe(filters.startTo);

      if (from || to) {
        const fromD = from ? startOfDay(from) : null;
        const toD = to ? endOfDay(to) : null;

        list = list.filter((w) => {
          const d = parseDateSafe(w.startDate ?? undefined);
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

        list = list.filter((w) => {
          const d = parseDateSafe(w.startDate ?? undefined);
          if (!d) return false;
          const t = d.getTime();
          return t >= fromT && t <= toT;
        });
      }
    }
  }

  return list;
}

export default function WishlistFilter({
  items,
  filters,
  onChange,
  filteredCount,
}: WishlistFilterProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const totalCount = items.length;
  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters),
    [filters]
  );

  const locationOptions = useMemo(
    () => normalizeList(items.map((i) => i.location)),
    [items]
  );
  const typeOptions = useMemo(
    () => normalizeList(items.map((i) => i.offerType)),
    [items]
  );

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

      const el = target as HTMLElement | null;
      if (el?.closest("[data-multiselect-dropdown]")) return;

      setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const handleToggleLocation = useCallback(
    (value: string) => {
      setFilters((f) => ({
        ...f,
        locations: toggleInArray(f.locations, value),
      }));
    },
    [setFilters]
  );

  const handleToggleType = useCallback(
    (value: string) => {
      setFilters((f) => ({
        ...f,
        offerTypes: toggleInArray(f.offerTypes, value),
      }));
    },
    [setFilters]
  );

  const handleTogglePriority = useCallback(
    (value: string) => {
      setFilters((f) => ({
        ...f,
        priorities: toggleInArray(f.priorities, value as WishlistPriorityFilter),
      }));
    },
    [setFilters]
  );

  const handleStartPresetChange = useCallback(
    (preset: WishlistDatePreset) => {
      setFilters((f) => ({
        ...f,
        startPreset: preset,
      }));
    },
    [setFilters]
  );

  const clearFilters = useCallback(
    () => setFilters(DEFAULT_WISHLIST_FILTERS),
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
            ? "border-yellow-200 text-yellow-900"
            : "border-neutral-200 text-neutral-800",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Filter
          className={[
            "h-4 w-4",
            activeFilterCount > 0 ? "text-yellow-600" : "text-neutral-700",
          ].join(" ")}
          aria-hidden="true"
        />
        <span>Filter</span>
        {activeFilterCount > 0 && (
          <span className="ml-1 inline-flex items-center rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-900 ring-1 ring-inset ring-yellow-200">
            {activeFilterCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Filter wishlist"
          className={[
            "absolute right-0 mt-2 w-[min(92vw,520px)]",
            "rounded-2xl border border-yellow-100/80",
            "bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80",
            "shadow-2xl z-50",
          ].join(" ")}
        >
          {/* Header */}
          <div className="relative overflow-hidden rounded-t-2xl border-b border-neutral-200/70 px-5 py-4">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-300/20 blur-2xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-10 h-36 w-36 rounded-full bg-amber-300/20 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-50 ring-1 ring-inset ring-yellow-100">
                    <Filter className="h-4 w-4 text-yellow-600" />
                  </span>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Refine your wishlist
                  </h3>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  Filter by start date, location, employment type, and priority.
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
            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <DatePresetDropdown
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
                          "focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300",
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
                          "focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300",
                        ].join(" ")}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Location + type */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <MultiSelectDropdown
                title="Location / city"
                options={locationOptions}
                values={filters.locations}
                onToggle={handleToggleLocation}
                onClear={() => setFilters((f) => ({ ...f, locations: [] }))}
                placeholder="Any location"
              />
              <MultiSelectDropdown
                title="Type of employment"
                options={typeOptions}
                values={filters.offerTypes}
                onToggle={handleToggleType}
                onClear={() => setFilters((f) => ({ ...f, offerTypes: [] }))}
                placeholder="Any type"
              />
              <div className="md:col-span-2">
                <MultiSelectDropdown
                  title="Priority"
                  options={PRIORITY_OPTIONS}
                  values={filters.priorities}
                  onToggle={handleTogglePriority}
                  onClear={() => setFilters((f) => ({ ...f, priorities: [] }))}
                  placeholder="Any priority"
                />
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
                  "border border-yellow-500 bg-yellow-500 text-white hover:bg-yellow-400",
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
