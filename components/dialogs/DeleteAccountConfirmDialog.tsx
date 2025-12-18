"use client";

import type { FC } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

const DeleteAccountConfirmDialog: FC<Props> = ({
  open,
  onClose,
  onConfirm,
  busy = false,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[13050] flex items-center justify-center px-4 py-8">
      <div
        className="absolute inset-0 bg-neutral-900/50"
        aria-hidden="true"
        onClick={busy ? undefined : onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className={[
          "relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-rose-200/80",
          "bg-gradient-to-br from-rose-50 via-white to-amber-50 shadow-2xl backdrop-blur-sm",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-rose-400/20 blur-3xl" />

        <div className="relative z-10 flex items-start justify-between border-b border-rose-100/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <img
              src="/icons/delete_account.png"
              alt="Delete account"
              className="h-9 w-9 md:h-10 md:w-10 object-contain"
            />
            <div>
              <h2
                id="delete-account-title"
                className="text-sm font-semibold text-neutral-900"
              >
                Delete account
              </h2>
              <p className="mt-0.5 text-xs text-neutral-600">
                This permanently deletes your account and all synced data.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={busy ? undefined : onClose}
            className={[
              "inline-flex h-8 w-8 items-center justify-center rounded-full",
              "border border-neutral-200 bg-white/80 text-neutral-500 shadow-sm",
              "hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300",
              busy ? "opacity-60" : "",
            ].join(" ")}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="relative z-10 px-5 py-4">
          <div className="rounded-xl border border-rose-100/80 bg-white/90 p-3 text-sm text-neutral-800 shadow-sm">
            <p className="text-sm font-semibold text-neutral-900">This cannot be undone.</p>
            <p className="mt-1 text-xs text-neutral-600">
              Your account will be removed from Supabase. Your synced lists and activity will be deleted.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-rose-100/80 pt-3">
            <button
              type="button"
              onClick={busy ? undefined : onClose}
              className={[
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-neutral-800",
                "bg-white/80 border border-neutral-200 shadow-sm hover:bg-white",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300",
                busy ? "opacity-60" : "",
              ].join(" ")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={busy ? undefined : onConfirm}
              disabled={busy}
              className={[
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm",
                "bg-rose-600 text-white hover:bg-rose-500",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-300",
                busy ? "cursor-not-allowed opacity-80" : "",
              ].join(" ")}
            >
              {busy ? "Deleting…" : "Yes, delete my account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountConfirmDialog;
