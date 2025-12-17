"use client";

import type { FC } from "react";
import { X } from "lucide-react";

type Summary = Partial<Record<string, number>> & { total?: number; fileName?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  summary: Summary | null;
};

const ImportConfirmDialog: FC<Props> = ({ open, onClose, onConfirm, summary }) => {
  if (!open || !summary) return null;

  return (
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[12050] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-neutral-900/40" aria-hidden="true" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className={[
          "relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-sky-100/80",
          "bg-gradient-to-br from-indigo-50 via-white to-sky-50 shadow-2xl backdrop-blur-sm",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative z-10 flex items-start justify-between border-b border-sky-100/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <img src="/icons/json.png" alt="Import" className="h-9 w-9 md:h-10 md:w-10 object-contain" />
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Import backup</h2>
              <p className="mt-0.5 text-xs text-neutral-600">Review the content below before confirming the import.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={[
              "inline-flex h-8 w-8 items-center justify-center rounded-full",
              "border border-neutral-200 bg-white/80 text-neutral-500 shadow-sm",
              "hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
            ].join(" ")}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="relative z-10 px-5 py-4">
          <div className="rounded-xl border border-sky-100/80 bg-white/90 p-3 text-sm text-neutral-800 shadow-sm">
            <div className="font-medium text-neutral-900">{summary.fileName ?? "backup.json"}</div>
            <div className="text-neutral-600 text-xs mt-1">Imported at: {new Date().toLocaleString()}</div>
            <div className="mt-3 grid gap-2 text-xs">
              {Object.entries(summary)
                .filter(([k]) => k !== "fileName")
                .map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <div className="text-neutral-700">{k}</div>
                    <div className="font-medium text-neutral-900">{v}</div>
                  </div>
                ))}
              <div className="flex items-center justify-between border-t border-sky-50 pt-2">
                <div className="text-neutral-700">Total</div>
                <div className="font-semibold text-neutral-900">{summary.total ?? 0}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-sky-100/80 pt-3">
            <button
              type="button"
              onClick={onClose}
              className={[
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-neutral-800",
                "bg-white/80 border border-neutral-200 shadow-sm hover:bg-white",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300",
              ].join(" ")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={[
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow-sm",
                "bg-sky-600 text-white hover:bg-sky-500",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300",
              ].join(" ")}
            >
              Confirm import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportConfirmDialog;
