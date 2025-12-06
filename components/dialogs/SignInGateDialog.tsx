"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  UserRound,
  ShieldCheck,
  Sparkles,
  Cloud,
  CheckCircle2,
} from "lucide-react";

type SignInGateDialogProps = {
  defaultOpen?: boolean;
  onContinueAsGuest?: () => void;
  onGoogleSignIn?: () => void;
};

function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.657 32.657 29.304 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.167 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.173 35.091 26.715 36 24 36c-5.281 0-9.62-3.319-11.283-7.946l-6.52 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.084 5.565l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"
      />
    </svg>
  );
}

export default function SignInGateDialog({
  defaultOpen = true,
  onContinueAsGuest,
  onGoogleSignIn,
}: SignInGateDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // basic scroll lock
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const content = useMemo(() => {
    if (!open) return null;

    const handleBackdrop = () => setOpen(false);

    const handleGuest = () => {
      onContinueAsGuest?.();
      setOpen(false);
    };

    const handleGoogle = () => {
      onGoogleSignIn?.();
      // keep open until auth finishes if you want
      // setOpen(false);
    };

    return (
      <div className="fixed inset-0 z-[60]">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-md"
          onClick={handleBackdrop}
        />

        {/* Dialog */}
        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
          {/* Outer shell adds subtle gradient border */}
          <div
            className={[
              "relative w-full",
              "max-w-[800px]", // bigger width
              "rounded-[28px] p-[1px]",
              "bg-gradient-to-br from-indigo-200/70 via-sky-200/40 to-fuchsia-200/50",
              "shadow-[0_20px_80px_-20px_rgba(0,0,0,0.35)]",
            ].join(" ")}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="signin-gate-title"
              aria-describedby="signin-gate-desc"
              className={[
                "relative overflow-hidden rounded-[27px]",
                "bg-white",
                "ring-1 ring-black/5",
              ].join(" ")}
            >
              {/* Decorative background */}
              <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

              {/* Close button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={[
                  "absolute right-4 top-4 z-10",
                  "inline-flex h-10 w-10 items-center justify-center",
                  "rounded-xl border border-neutral-200",
                  "bg-white/90 text-neutral-600",
                  "hover:text-neutral-900 hover:bg-white",
                  "active:scale-95 transition",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                ].join(" ")}
                aria-label="Close"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Layout */}
              <div
                className={[
                  "grid",
                  "sm:grid-cols-[0.8fr_1.0fr]",
                  "min-h-[440px]",
                ].join(" ")}
              >
                {/* Left hero panel */}
                <div className="relative overflow-hidden px-6 py-8 sm:px-10 sm:py-12">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    New session, better tracking
                  </div>

                  <h2
                    id="signin-gate-title"
                    className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900"
                  >
                    Welcome to Application Tracker
                  </h2>

                  <p
                    id="signin-gate-desc"
                    className="mt-2 text-sm sm:text-base text-neutral-600 max-w-[32ch]"
                  >
                    Sign in to sync your progress across devices, or continue as a
                    guest with local-only data.
                  </p>

                  {/* Feature list (cleaner than 3 mini cards) */}
                  <div className="mt-6 space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          Private by default
                        </div>
                        <div className="text-xs text-neutral-500">
                          Your data stays protected with sensible defaults.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Cloud className="mt-0.5 h-5 w-5 text-indigo-600" />
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          Seamless sync
                        </div>
                        <div className="text-xs text-neutral-500">
                          Pick up exactly where you left off.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <UserRound className="mt-0.5 h-5 w-5 text-sky-600" />
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          Instant guest mode
                        </div>
                        <div className="text-xs text-neutral-500">
                          Start tracking in seconds, no setup friction.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subtle bottom accent */}
                  <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-indigo-600/5 blur-2xl" />
                </div>

                {/* Right action panel */}
                <div className="relative border-t border-neutral-100 sm:border-t-0 sm:border-l px-6 py-8 sm:px-10 sm:py-12">
                  <h3 className="mt-0 text-sm font-semibold tracking-tight text-neutral-900">
                    Choose how to continue:
                  </h3>
                  <div className="mt-2 space-y-3">
                    <button
                      type="button"
                      onClick={handleGoogle}
                      className={[
                        "w-full rounded-2xl px-4 py-3.5",
                        "bg-neutral-900 text-white",
                        "hover:bg-neutral-800",
                        "active:scale-[0.99] transition",
                        "shadow-sm",
                        "inline-flex items-center justify-center",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                      ].join(" ")}
                    >
                      <GoogleIcon className="mr-2 h-6 w-6" />
                      Continue with Google
                    </button>

                    <button
                      type="button"
                      onClick={handleGuest}
                      className={[
                        "w-full rounded-2xl px-4 py-3.5",
                        "border border-neutral-200",
                        "bg-white hover:bg-neutral-50",
                        "text-neutral-900",
                        "active:scale-[0.99] transition",
                        "inline-flex items-center justify-center",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                      ].join(" ")}
                    >
                      <UserRound className="mr-2 h-6 w-6" />
                      Continue as guest
                    </button>
                  </div>

                  <div className="my-2 flex items-center gap-3">
                    <span className="h-px flex-1 bg-neutral-200" />
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                      Why sign in?
                    </span>
                    <span className="h-px flex-1 bg-neutral-200" />
                  </div>

                  {/* More reasons, same original style */}
                  <div className="grid gap-2">
                    <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-neutral-800">
                        <Cloud className="h-4 w-4 text-indigo-600" />
                        Cross-device sync
                      </div>
                    </div>

                    <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-neutral-800">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        Secure authentication
                      </div>
                    </div>

                    <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-neutral-800">
                        <CheckCircle2 className="h-4 w-4 text-sky-600" />
                        Safer progress recovery
                      </div>
                    </div>

                    <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-neutral-800">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        One-tap setup
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 text-center text-[11px] text-neutral-500">
                    You can sign in anytime later from settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [open, onContinueAsGuest, onGoogleSignIn]);

  if (!mounted) return null;
  return createPortal(content, document.body);
}
