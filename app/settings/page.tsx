"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import {
  Bell,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  LogOut,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";

import { getSupabaseClient } from "@/lib/supabase/client";
import { getModeCached } from "@/lib/supabase/sessionCache";

type Preferences = {
  reminders: boolean;
  digest: boolean;
  compactCards: boolean;
  tips: boolean;
};

const PREFS_KEY = "job-tracker:settings-preferences";
const DEFAULT_PREFS: Preferences = {
  reminders: true,
  digest: false,
  compactCards: false,
  tips: true,
};

function ToggleRow({
  title,
  description,
  value,
  onChange,
  badge,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200/80 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-neutral-900">{title}</p>
          {badge && (
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-600">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={[
          "relative inline-flex h-6 w-11 items-center rounded-full transition",
          value ? "bg-neutral-900" : "bg-neutral-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition",
            value ? "translate-x-5" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [storageMode, setStorageMode] = useState<"guest" | "user">("guest");
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Load auth + storage mode
  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      const mode = data.session?.user ? "user" : await getModeCached();
      setStorageMode(mode);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession ?? null);
        setStorageMode(nextSession?.user ? "user" : "guest");
      },
    );

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPrefs({ ...DEFAULT_PREFS, ...(parsed as Preferences) });
      }
    } catch {
      setPrefs(DEFAULT_PREFS);
    } finally {
      setPrefsLoaded(true);
    }
  }, []);

  // Persist preferences
  useEffect(() => {
    if (!prefsLoaded || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage errors
    }
  }, [prefs, prefsLoaded]);

  const signedIn = !!session?.user;

  const accountLabel = useMemo(() => {
    if (!session?.user) return "Guest";
    const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
    const name =
      (meta.full_name as string) ||
      (meta.name as string) ||
      (meta.given_name as string) ||
      (meta.first_name as string);
    if (name) return name;
    if (session.user.email) return session.user.email.split("@")[0] ?? "User";
    return "User";
  }, [session]);

  const openSignInGate = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("job-tracker:open-signin-gate"));
  }, []);

  const handleLogout = useCallback(async () => {
    if (authBusy || !signedIn) return;
    setAuthBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out failed:", error.message);
      }
      router.refresh();
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setAuthBusy(false);
    }
  }, [authBusy, router, signedIn]);

  const badge = signedIn
    ? {
        text: "Synced",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-[0_1px_2px_rgba(16,185,129,0.18)]",
      }
    : {
        text: "Guest mode only",
        className:
          "border-amber-200 bg-amber-50 text-amber-800 shadow-[0_1px_2px_rgba(251,191,36,0.18)]",
      };

  return (
    <section
      className={[
        "relative rounded-2xl border border-neutral-200/70",
        "bg-gradient-to-br from-slate-50 via-white to-neutral-100",
        "p-8 shadow-md overflow-hidden",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-neutral-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-slate-400/15 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <Image
            src="/icons/settings.png"
            alt=""
            width={37}
            height={37}
            aria-hidden="true"
            className="shrink-0"
          />
          <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
          <span
            className={[
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              badge.className,
            ].join(" ")}
          >
            {badge.text}
          </span>
        </div>
        <p className="text-neutral-700 mt-2">
          Personalize the tracker, manage sync, and tune notifications.
        </p>
      </div>

      <div className="relative mt-6 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <article className="relative overflow-hidden rounded-xl border border-neutral-200/80 bg-white/80 p-5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-neutral-200/50 blur-3xl" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Account & sync
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-full border border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-800">
                    {signedIn ? accountLabel[0]?.toUpperCase() || "U" : (
                      <UserRound className="h-4 w-4" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {accountLabel}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {signedIn
                        ? session?.user?.email ?? "Signed in"
                        : "Data stored locally on this device"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!signedIn && (
                  <button
                    type="button"
                    onClick={openSignInGate}
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Sign in to sync
                  </button>
                )}
                {signedIn && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={authBusy}
                    className={[
                      "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition",
                      "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-300",
                      authBusy ? "opacity-70" : "",
                    ].join(" ")}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {authBusy ? "Signing out…" : "Sign out"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-neutral-200 bg-white/70 p-3 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <Cloud className="h-4 w-4 text-sky-600" aria-hidden="true" />
                  Sync mode
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  {storageMode === "user"
                    ? "Saving to your account with a local cache."
                    : "Local-only until you sign in."}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white/70 p-3 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <ShieldCheck
                    className="h-4 w-4 text-emerald-600"
                    aria-hidden="true"
                  />
                  Privacy
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  No emails are sent without your opt-in. Guest data stays on
                  this device.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white/70 p-3 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <Smartphone
                    className="h-4 w-4 text-indigo-600"
                    aria-hidden="true"
                  />
                  Devices
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  Switch devices anytime; your lists follow when signed in.
                </p>
              </div>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-xl border border-neutral-200/80 bg-white/80 p-5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70">
            <div className="pointer-events-none absolute -left-16 -top-12 h-32 w-32 rounded-full bg-slate-200/50 blur-3xl" />
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Preferences
                </p>
                <p className="text-sm text-neutral-700">
                  Saved locally and applied instantly.
                </p>
              </div>
              <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
                Local-only
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              <ToggleRow
                title="Interview reminders"
                description="Highlight interviews and nudge you a day before."
                value={prefs.reminders}
                onChange={(next) => setPrefs((p) => ({ ...p, reminders: next }))}
                badge="recommended"
              />
              <ToggleRow
                title="Weekly digest"
                description="Show a Monday summary of new activity and pending tasks."
                value={prefs.digest}
                onChange={(next) => setPrefs((p) => ({ ...p, digest: next }))}
              />
              <ToggleRow
                title="Compact cards"
                description="Tighten spacing for dense lists on desktop."
                value={prefs.compactCards}
                onChange={(next) =>
                  setPrefs((p) => ({ ...p, compactCards: next }))
                }
              />
              <ToggleRow
                title="Tips & guidance"
                description="Keep lightweight tips visible across pages."
                value={prefs.tips}
                onChange={(next) => setPrefs((p) => ({ ...p, tips: next }))}
              />
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <article className="relative overflow-hidden rounded-xl border border-neutral-200/80 bg-white/80 p-5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70">
            <div className="pointer-events-none absolute -right-14 -bottom-10 h-32 w-32 rounded-full bg-neutral-200/50 blur-3xl" />

            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Data & backups
                </p>
                <p className="text-sm text-neutral-700">
                  Export or review where your lists live.
                </p>
              </div>
              <Database className="h-5 w-5 text-neutral-400" aria-hidden="true" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white/70 p-3 shadow-sm">
                <div className="rounded-full bg-neutral-900 text-white p-1.5">
                  <Cloud className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-900">
                    Current mode: {storageMode === "user" ? "Cloud + local" : "Local only"}
                  </p>
                  <p className="text-xs text-neutral-600">
                    {storageMode === "user"
                      ? "Data is synced to your account with an offline cache for speed."
                      : "Stay on this device until you choose to sign in."}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white/70 p-3 shadow-sm">
                <div className="rounded-full bg-white text-neutral-800 p-1.5 ring-1 ring-neutral-200">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-900">
                    Privacy first
                  </p>
                  <p className="text-xs text-neutral-600">
                    We never sell your data. You can clear guest data anytime by
                    signing in and migrating.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-neutral-300 bg-white/60 p-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    Export copy
                  </p>
                  <p className="text-xs text-neutral-600">
                    Download a JSON backup of your lists for safekeeping.
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300"
                  onClick={() => {
                    // placeholder action to reinforce UX without wiring a backend call
                    alert("Export coming soon. For now, data stays local or in your account.");
                  }}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export
                </button>
              </div>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-xl border border-neutral-200/80 bg-white/80 p-5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Notification preview
                </p>
                <p className="text-sm text-neutral-700">
                  See what reminders will look like.
                </p>
              </div>
              <Bell className="h-5 w-5 text-neutral-400" aria-hidden="true" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-neutral-200 bg-white/80 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className="h-5 w-5 text-emerald-600"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold text-neutral-900">
                    Interview tomorrow at 10:00
                  </p>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  We will remind you 24h before and on the day, respecting your
                  preferences above.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white/80 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                  <p className="text-sm font-semibold text-neutral-900">
                    Weekly digest
                  </p>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  Monday overview of new applications, interviews, and notes.
                  Toggle anytime.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
