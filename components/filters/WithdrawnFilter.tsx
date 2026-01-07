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
import type { InterviewType } from "@/components/dialogs/ScheduleInterviewDialog";
import type { WithdrawnReason } from "@/components/dialogs/MoveToWithdrawnDialog";
import type { WithdrawnRecord } from "@/components/cards/WithdrawnCard";
import { parseDateSafe, startOfDay, endOfDay, presetRange, type DateFilterPreset } from "@/lib/utils/dateUtils";
import { normalizeList, toggleInArray } from "@/lib/utils/filterUtils";
import MultiSelectDropdown from "./shared/MultiSelectDropdown";

export type WithdrawnDatePreset = DateFilterPreset;

export type WithdrawnFilters = {
  withdrawnPreset: WithdrawnDatePreset;
  withdrawnFrom: string;
  withdrawnTo: string;
  locations: string[];
  employmentTypes: string[];
  reasons: WithdrawnReason[];
  interviewStages: ("before-interview" | InterviewType)[];
  hasNotes: boolean;
  hasContact: boolean;
  hasJobLink: boolean;
};

export const DEFAULT_WITHDRAWN_FILTERS: WithdrawnFilters = {
  withdrawnPreset: "any",
  withdrawnFrom: "",
  withdrawnTo: "",
  locations: [],
  employmentTypes: [],
  reasons: [],
  interviewStages: [],
  hasNotes: false,
  hasContact: false,
  hasJobLink: false,
};

function getActiveFilterCount(filters: WithdrawnFilters): number {
  let c = 0;
  if (filters.withdrawnPreset !== "any") c += 1;
  c += filters.locations.length;
  c += filters.employmentTypes.length;
  c += filters.reasons.length;
  c += filters.interviewStages.length;
  if (filters.hasNotes) c += 1;
  if (filters.hasContact) c += 1;
  if (filters.hasJobLink) c += 1;
  return c;
}

type FilterableWithdrawn = Pick<
  WithdrawnRecord,
  | "company"
  | "role"
  | "location"
  | "employmentType"
  | "withdrawnReason"
  | "withdrawnDate"
  | "notes"
  | "contactName"
  | "contactEmail"
  | "contactPhone"
  | "url"
  | "interviewType"
>;

const WITHDRAWN_REASON_LABEL: Record<WithdrawnReason, string> = {
  "accepted-other-offer": "Accepted another offer",
  "salary-not-right": "Salary / conditions not right",
  "role-not-fit": "Role not a good fit",
  "location-commute": "Location / commute issues",
  "process-too-slow": "Process took too long",
  "personal-reasons": "Personal reasons",
  other: "Other",
};

const INTERVIEW_STAGE_LABEL: Record<"before-interview" | InterviewType, string> = {
  "before-interview": "Before interview",
  phone: "Phone screening",
  video: "Video call",
  "in-person": "In person",
};

function DatePresetDropdown({
  value,
  onChange,
}: {
  value: WithdrawnDatePreset;
  onChange: (preset: WithdrawnDatePreset) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        Withdrawn date
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as WithdrawnDatePreset)}
        className={[
          "h-9 w-full rounded-lg px-2.5 text-xs font-medium",
          "border border-neutral-200 bg-white text-neutral-900",
          "hover:bg-neutral-50",
          "focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300",
        ].join(" ")}
      >
        <option value="any">Any time</option>
        <option value="last7">Last 7 days</option>
        <option value="last30">Last 30 days</option>
        <option value="last90">Last 90 days</option>
        <option value="thisYear">This year</option>
        <option value="custom">Custom range</option>
      </select>
    </label>
  );
}

export function filterWithdrawn<T extends FilterableWithdrawn>(
  items: T[],
  query: string,
  filters: WithdrawnFilters
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
        item.withdrawnReason,
        item.notes,
        item.contactName,
        item.contactEmail,
        item.contactPhone,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }

  if (filters.locations.length > 0) {
    const set = new Set(filters.locations);
    list = list.filter((item) => set.has((item.location ?? "").trim()));
  }

  if (filters.employmentTypes.length > 0) {
    const set = new Set(filters.employmentTypes);
    list = list.filter((item) => set.has((item.employmentType ?? "").trim()));
  }

  if (filters.reasons.length > 0) {
    const set = new Set(filters.reasons);
    list = list.filter((item) => item.withdrawnReason && set.has(item.withdrawnReason));
  }

  if (filters.interviewStages.length > 0) {
    const set = new Set(filters.interviewStages);
    list = list.filter((item) => {
      const stage: "before-interview" | InterviewType = item.interviewType ?? "before-interview";
      return set.has(stage);
    });
  }

  if (filters.hasNotes) {
    list = list.filter((item) => !!(item.notes && item.notes.trim().length > 0));
  }

  if (filters.hasContact) {
    list = list.filter((item) =>
      !!(
        (item.contactName && item.contactName.trim()) ||
        (item.contactEmail && item.contactEmail.trim()) ||
        (item.contactPhone && item.contactPhone.trim())
      )
    );
  }

  if (filters.hasJobLink) {
    list = list.filter((item) => !!(item.url && item.url.trim().length > 0));
  }

  if (filters.withdrawnPreset !== "any") {
    if (filters.withdrawnPreset === "custom") {
      const from = parseDateSafe(filters.withdrawnFrom);
      const to = parseDateSafe(filters.withdrawnTo);

      if (from || to) {
        const fromD = from ? startOfDay(from) : null;
        const toD = to ? endOfDay(to) : null;

        list = list.filter((item) => {
          const d = parseDateSafe(item.withdrawnDate);
          if (!d) return false;
          const t = d.getTime();
          if (fromD && t < fromD.getTime()) return false;
          if (toD && t > toD.getTime()) return false;
          return true;
        });
      }
    } else {
      const { from, to } = presetRange(filters.withdrawnPreset);
      if (from && to) {
        const fromT = from.getTime();
        const toT = to.getTime();
        list = list.filter((item) => {
          const d = parseDateSafe(item.withdrawnDate);
          if (!d) return false;
          const t = d.getTime();
          return t >= fromT && t <= toT;
        });
      }
    }
  }

  return list;
}

type WithdrawnFilterProps = {
  items: WithdrawnRecord[];
  filters: WithdrawnFilters;
  onChange: Dispatch<SetStateAction<WithdrawnFilters>>;
  filteredCount: number;
};

export default function WithdrawnFilter({
  items,
  filters,
  onChange,
  filteredCount,
}: WithdrawnFilterProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const totalCount = items.length;
  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);

  const locationOptions = useMemo(() => normalizeList(items.map((i) => i.location)), [items]);
  const employmentOptions = useMemo(() => normalizeList(items.map((i) => i.employmentType)), [items]);
  const reasonOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((i) => i.withdrawnReason)
            .filter(Boolean)
            .map((r) => r as WithdrawnReason)
        )
      ),
    [items]
  );
  const stageOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items.map((i) => (i.interviewType ? i.interviewType : "before-interview" as const))
        )
      ),
    [items]
  );

  const setFilters = onChange;

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

  const handleDatePresetChange = useCallback(
    (preset: WithdrawnDatePreset) => {
      setFilters((f) => ({
        ...f,
        withdrawnPreset: preset,
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

  const handleToggleReason = useCallback(
    (value: string) => {
      setFilters((f) => ({
        ...f,
        reasons: toggleInArray(f.reasons, value as WithdrawnReason),
      }));
    },
    [setFilters]
  );

  const handleToggleStage = useCallback(
    (value: string) => {
      setFilters((f) => ({
        ...f,
        interviewStages: toggleInArray(
          f.interviewStages,
          value as "before-interview" | InterviewType
        ),
      }));
    },
    [setFilters]
  );

  const clearFilters = useCallback(
    () => setFilters(DEFAULT_WITHDRAWN_FILTERS),
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
            ? "border-amber-200 text-amber-900"
            : "border-neutral-200 text-neutral-800",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Filter
          className={[
            "h-4 w-4",
            activeFilterCount > 0 ? "text-amber-600" : "text-neutral-700",
          ].join(" ")}
          aria-hidden="true"
        />
        <span>Filter</span>
        {activeFilterCount > 0 && totalCount > 0 && (
          <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-inset ring-amber-200">
            {activeFilterCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Filter withdrawn applications"
          className={[
            "absolute right-0 mt-2 w-[min(92vw,560px)]",
            "rounded-2xl border border-neutral-200/80",
            "bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80",
            "shadow-2xl",
            "z-50",
          ].join(" ")}
        >
          <div className="relative overflow-hidden rounded-t-2xl border-b border-neutral-200/70 px-5 py-4">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-10 h-36 w-36 rounded-full bg-orange-400/15 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 ring-1 ring-inset ring-amber-100">
                    <Filter className="h-4 w-4 text-amber-600" />
                  </span>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Refine your withdrawn list
                  </h3>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  Narrow down by date, location, reason, and more.
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

          <div className="max-h-[70vh] overflow-auto px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <DatePresetDropdown
                  value={filters.withdrawnPreset}
                  onChange={handleDatePresetChange}
                />
                {filters.withdrawnPreset === "custom" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-medium text-neutral-500">From</span>
                      <input
                        type="date"
                        value={filters.withdrawnFrom}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, withdrawnFrom: e.target.value }))
                        }
                        className={[
                          "h-9 w-full rounded-lg px-2.5 text-xs text-neutral-900",
                          "border border-neutral-200 bg-white",
                          "focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300",
                        ].join(" ")}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-medium text-neutral-500">To</span>
                      <input
                        type="date"
                        value={filters.withdrawnTo}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, withdrawnTo: e.target.value }))
                        }
                        className={[
                          "h-9 w-full rounded-lg px-2.5 text-xs text-neutral-900",
                          "border border-neutral-200 bg-white",
                          "focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300",
                        ].join(" ")}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
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
                onClear={() => setFilters((f) => ({ ...f, employmentTypes: [] }))}
                placeholder="Any type"
              />
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <MultiSelectDropdown
                title="Reason"
                options={reasonOptions}
                values={filters.reasons}
                onToggle={handleToggleReason}
                onClear={() => setFilters((f) => ({ ...f, reasons: [] }))}
                placeholder="Any reason"
                getLabel={(v) => WITHDRAWN_REASON_LABEL[v as WithdrawnReason] ?? v}
              />

              <MultiSelectDropdown
                title="Stage when withdrawn"
                options={stageOptions}
                values={filters.interviewStages}
                onToggle={handleToggleStage}
                onClear={() => setFilters((f) => ({ ...f, interviewStages: [] }))}
                placeholder="Any stage"
                getLabel={(v) => INTERVIEW_STAGE_LABEL[v as "before-interview" | InterviewType] ?? v}
              />
            </div>

            <div className="mt-6">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Helpful shortcuts
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {[
                  {
                    key: "hasNotes" as const,
                    label: "Has notes",
                    hint: "Only cards with notes",
                  },
                  {
                    key: "hasContact" as const,
                    label: "Has contact",
                    hint: "Name, email, or phone",
                  },
                  {
                    key: "hasJobLink" as const,
                    label: "Has job link",
                    hint: "View posting quickly",
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
                          ? "border-amber-200 bg-amber-50/80 ring-1 ring-inset ring-amber-100"
                          : "border-neutral-200 bg-white hover:bg-neutral-50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={[
                            "text-xs font-semibold",
                            active ? "text-amber-900" : "text-neutral-900",
                          ].join(" ")}
                        >
                          {opt.label}
                        </span>
                        <span
                          className={[
                            "inline-flex h-5 w-9 items-center rounded-full p-0.5 transition",
                            active ? "bg-amber-600" : "bg-neutral-200",
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
                          active ? "text-amber-700" : "text-neutral-500",
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

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-neutral-200/70 px-5 py-3">
            <div className="text-[11px] text-neutral-500">
              Showing <span className="font-semibold text-neutral-800">{filteredCount}</span> of
              <span className="ml-1 font-semibold text-neutral-800">{totalCount}</span>
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
                  "border border-amber-500 bg-amber-600 text-white hover:bg-amber-500",
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
