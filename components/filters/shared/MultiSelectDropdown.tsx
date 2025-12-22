"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { summarizeSelection } from "@/lib/utils/filterUtils";

export type MultiSelectDropdownProps = {
  /** Title displayed above the dropdown */
  title: string;
  /** Available options to select from */
  options: string[];
  /** Currently selected values */
  values: string[];
  /** Callback when an option is toggled */
  onToggle: (value: string) => void;
  /** Callback to clear all selections */
  onClear: () => void;
  /** Text shown when options array is empty */
  emptyText?: string;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Optional function to get display label for a value */
  getLabel?: (value: string) => string;
};

export default function MultiSelectDropdown({
  title,
  options,
  values,
  onToggle,
  onClear,
  emptyText = "—",
  placeholder = "Any",
  getLabel = (v) => v,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

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

  const summary = summarizeSelection(values, getLabel, placeholder);

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
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:border-sky-300",
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
            open ? "rotate-180 text-sky-600" : "text-neutral-500",
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
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onToggle(opt)}
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs",
                      active
                        ? "bg-sky-50 text-sky-900"
                        : "text-neutral-800 hover:bg-neutral-50",
                    ].join(" ")}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="truncate">{getLabel(opt)}</span>
                    {active && (
                      <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-white">
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
