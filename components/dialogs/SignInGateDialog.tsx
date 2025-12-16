"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  UserRound,
  ShieldCheck,
  Sparkles,
  Cloud,
  CheckCircle2,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

type SignInGateDialogProps = {
  defaultOpen?: boolean;
  onContinueAsGuest?: () => void;
  onGoogleSignIn?: () => void;
};

const GUEST_ACCEPTED_KEY = "job-tracker:guest-accepted";

function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
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

function ThreeBounceLoader({ className = "" }: { className?: string }) {
  return (
    <span
      className={["inline-flex items-center gap-[6px]", className].join(" ")}
      role="status"
      aria-live="polite"
      aria-label="Signing in"
    >
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-2.5 w-2.5 rounded-full bg-white animate-bounce"
          style={{ animationDelay: `${dot * 120}ms` }}
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">Signing in</span>
    </span>
  );
}

export default function SignInGateDialog({
  defaultOpen = true,
  onContinueAsGuest,
  onGoogleSignIn,
}: SignInGateDialogProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  // Decide whether to open:
  // - don't open if user already has a session
  // - don't open if they already accepted guest mode
  useEffect(() => {
    if (typeof window === "undefined") return;

    const run = async () => {
      const guestAccepted =
        window.localStorage.getItem(GUEST_ACCEPTED_KEY) === "1";

      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const hasSession = !!data.session;

      setOpen(defaultOpen && !guestAccepted && !hasSession);
    };

    run();
  }, [defaultOpen]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("job-tracker:open-signin-gate", handler);
    return () =>
      window.removeEventListener("job-tracker:open-signin-gate", handler);
  }, []);

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

  const handleGuest = useCallback(() => {
    try {
      window.localStorage.setItem(GUEST_ACCEPTED_KEY, "1");
    } catch {}

    onContinueAsGuest?.();
    setOpen(false);
    router.push("/"); // ✅ always go to Overview
  }, [onContinueAsGuest, router]);

  const handleGoogle = useCallback(async () => {
    if (googleLoading) return;

    setGoogleLoading(true);

    try {
      if (onGoogleSignIn) {
        await onGoogleSignIn();
        setGoogleLoading(false);
        return;
      }

      const supabase = getSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/`; // ✅ force Overview

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        console.error("Google sign-in failed:", error.message);
        setGoogleLoading(false);
      }
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setGoogleLoading(false);
    }
  }, [onGoogleSignIn, googleLoading]);

  const content = useMemo(() => {
    if (!open) return null;

    const handleBackdrop = () => setOpen(false);

    return (
      <div className="fixed inset-0 z-[60]">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-md"
          onClick={handleBackdrop}
        />

        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
          <div
            className={[
              "relative w-full",
              "max-w-[800px]",
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
              <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

              <div
                className={[
                  "grid",
                  "sm:grid-cols-[0.8fr_1.0fr]",
                  "min-h-[440px]",
                ].join(" ")}
              >
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

                  <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-indigo-600/5 blur-2xl" />
                </div>

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
                        "relative inline-flex items-center justify-center gap-3",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                        "disabled:opacity-100 disabled:bg-neutral-900 disabled:text-white disabled:cursor-not-allowed disabled:active:scale-100",
                      ].join(" ")}
                      disabled={googleLoading}
                      data-loading={googleLoading}
                      aria-busy={googleLoading}
                    >
                      <span
                        className={[
                          "flex items-center gap-3",
                          googleLoading ? "opacity-0" : "",
                        ].join(" ")}
                      >
                        <GoogleIcon className="h-6 w-6 flex-shrink-0" />
                        <span className="text-base font-medium">
                          Continue with Google
                        </span>
                      </span>

                      {googleLoading && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <ThreeBounceLoader />
                        </span>
                      )}

                      <span className="sr-only">
                        {googleLoading ? "Signing in with Google" : "Continue with Google"}
                      </span>
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
  }, [open, handleGoogle, handleGuest, googleLoading]);

  if (!mounted) return null;
  return createPortal(content, document.body);
}
