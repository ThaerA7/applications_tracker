"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import {
  AlertTriangle,
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
import { loadApplied, upsertApplied } from "@/lib/storage/applied";
import { loadInterviews, upsertInterview } from "@/lib/storage/interviews";
import { loadNotes, upsertNote } from "@/lib/storage/notes";
import { loadOffers, upsertOffer } from "@/lib/storage/offers";
import { loadRejected, upsertRejected } from "@/lib/storage/rejected";
import { loadWishlist, upsertWishlistItem } from "@/lib/storage/wishlist";
import { loadWithdrawn, upsertWithdrawn } from "@/lib/storage/withdrawn";
import { loadActivity, appendActivity } from "@/lib/storage/activity";
import ImportConfirmDialog from "@/components/dialogs/ImportConfirmDialog";
import DeleteAllDataConfirmDialog from "@/components/dialogs/DeleteAllDataConfirmDialog";
import DeleteAccountConfirmDialog from "@/components/dialogs/DeleteAccountConfirmDialog";
import { clearAllData, clearAllLocalData } from "@/lib/storage/purge";

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

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importSummary, setImportSummary] = useState<Record<string, number> | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<
    | { type: "success" | "error"; message: string }
    | null
  >(null);

  const [deleteDataDialogOpen, setDeleteDataDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerResult, setDangerResult] = useState<
    | { type: "success" | "error"; message: string }
    | null
  >(null);

  const handleImportClick = useCallback(() => {
    setImportResult(null);
    importInputRef.current?.click();
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const [appliedRes, interviewsRes, notesRes, offersRes, rejectedRes, wishlistRes, withdrawnRes] = await Promise.all([
        loadApplied(),
        loadInterviews(),
        loadNotes(),
        loadOffers(),
        loadRejected(),
        loadWishlist(),
        loadWithdrawn(),
      ]);

      const activityVariants: Array<any> = ["applied", "interviews", "rejected", "withdrawn", "offers"];
      const activity: Record<string, any[]> = {};
      for (const v of activityVariants) {
        const r = await loadActivity(v as any);
        activity[v] = r.items;
      }

      const payload = {
        meta: { exportedAt: new Date().toISOString(), source: "job-tracker" },
        applied: appliedRes.items,
        interviews: interviewsRes.items,
        notes: notesRes.items,
        offers: offersRes.items,
        rejected: rejectedRes.items,
        wishlist: wishlistRes.items,
        withdrawn: withdrawnRes.items,
        activity,
      };

      const text = JSON.stringify(payload, null, 2);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `job-tracker-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Export failed: " + (err?.message ?? String(err)));
    }
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json || typeof json !== "object") {
        alert("Invalid backup file");
        return;
      }

      const summary: Record<string, number | string> = {};
      let total = 0;
      const keys = [
        "applied",
        "interviews",
        "notes",
        "offers",
        "rejected",
        "wishlist",
        "withdrawn",
      ];
      for (const k of keys) {
        if (Array.isArray(json[k])) {
          summary[k] = json[k].length;
          total += json[k].length;
        }
      }

      if (json.activity && typeof json.activity === "object") {
        let actTotal = 0;
        for (const v of Object.keys(json.activity)) {
          if (Array.isArray(json.activity[v])) {
            actTotal += json.activity[v].length;
          }
        }
        if (actTotal > 0) {
          summary.activity = actTotal;
          total += actTotal;
        }
      }

      summary.total = total;
      summary.fileName = file.name;

      setImportPreview(json);
      setImportSummary(summary as any);
      setImportDialogOpen(true);
    } catch (err: any) {
      alert("Import failed: " + (err?.message ?? String(err)));
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }, []);

  const performImport = useCallback(async (json: any | null) => {
    if (!json) return;

    function isEqual(a: any, b: any) {
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch {
        return false;
      }
    }

    function makeId() {
      try {
        return (globalThis.crypto as Crypto & { randomUUID?: () => string })?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      } catch {
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }
    }

    try {
      const tasks: Promise<any>[] = [];
      let added = 0;

      if (Array.isArray(json.applied)) {
        const { mode, items: existing } = await loadApplied();
        for (const it of json.applied) {
          if (existing.some((x) => isEqual(x, it))) continue;
          const collision = existing.some((x) => x.id === it.id);
          const toInsert = collision ? { ...it, id: makeId() } : it;
          tasks.push(upsertApplied(toInsert, mode));
          added++;
        }
      }

      if (Array.isArray(json.interviews)) {
        const { mode, items: existing } = await loadInterviews();
        for (const it of json.interviews) {
          if (existing.some((x) => isEqual(x, it))) continue;
          const collision = existing.some((x) => x.id === it.id);
          const toInsert = collision ? { ...it, id: makeId() } : it;
          tasks.push(upsertInterview(toInsert, mode));
          added++;
        }
      }

      if (Array.isArray(json.notes)) {
        const { mode, items: existing } = await loadNotes();
        for (const it of json.notes) {
          if (existing.some((x) => isEqual(x, it))) continue;
          const collision = existing.some((x) => x.id === it.id);
          const toInsert = collision ? { ...it, id: makeId() } : it;
          tasks.push(upsertNote(toInsert, mode));
          added++;
        }
      }

      if (Array.isArray(json.offers)) {
        const { mode, items: existing } = await loadOffers();
        for (const it of json.offers) {
          if (existing.some((x) => isEqual(x, it))) continue;
          const collision = existing.some((x) => x.id === it.id);
          const toInsert = collision ? { ...it, id: makeId() } : it;
          tasks.push(upsertOffer(toInsert, mode));
          added++;
        }
      }

      if (Array.isArray(json.rejected)) {
        const { mode, items: existing } = await loadRejected();
        for (const it of json.rejected) {
          if (existing.some((x) => isEqual(x, it))) continue;
          const collision = existing.some((x) => x.id === it.id);
          const toInsert = collision ? { ...it, id: makeId() } : it;
          tasks.push(upsertRejected(toInsert, mode));
          added++;
        }
      }

      if (Array.isArray(json.wishlist)) {
        const { mode, items: existing } = await loadWishlist();
        for (const it of json.wishlist) {
          if (existing.some((x) => isEqual(x, it))) continue;
          const collision = existing.some((x) => x.id === it.id);
          const toInsert = collision ? { ...it, id: makeId() } : it;
          tasks.push(upsertWishlistItem(toInsert, mode));
          added++;
        }
      }

      if (Array.isArray(json.withdrawn)) {
        const { mode, items: existing } = await loadWithdrawn();
        for (const it of json.withdrawn) {
          if (existing.some((x) => isEqual(x, it))) continue;
          const collision = existing.some((x) => x.id === it.id);
          const toInsert = collision ? { ...it, id: makeId() } : it;
          tasks.push(upsertWithdrawn(toInsert, mode));
          added++;
        }
      }

      if (json.activity && typeof json.activity === "object") {
        const variants = ["applied", "interviews", "rejected", "withdrawn", "offers"];
        for (const v of variants) {
          const arr = json.activity[v];
          if (!Array.isArray(arr)) continue;
          const { mode, items: existing } = await loadActivity(v as any);
          for (const it of arr) {
            if (existing.some((x) => isEqual(x, it))) continue;
            const collision = existing.some((x) => x.id === it.id);
            const toInsert = collision ? { ...it, id: makeId() } : it;
            tasks.push(appendActivity(v as any, toInsert, mode));
            added++;
          }
        }
      }

      await Promise.all(tasks);
      setImportResult({
        type: "success",
        message: `Import finished — added ${added} new items.`,
      });
    } catch (err: any) {
      setImportResult({
        type: "error",
        message: "Import failed: " + (err?.message ?? String(err)),
      });
    } finally {
      setImportPreview(null);
      setImportSummary(null);
      setImportDialogOpen(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
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

  const handleDeleteAllData = useCallback(async () => {
    if (dangerBusy) return;
    setDangerBusy(true);
    setDangerResult(null);

    try {
      await clearAllData(storageMode);
      setDangerResult({
        type: "success",
        message:
          storageMode === "user"
            ? "All your data was deleted from this device and from sync."
            : "All your local data was deleted from this browser.",
      });
      router.refresh();
    } catch (err: any) {
      setDangerResult({
        type: "error",
        message: err?.message ? `Delete failed: ${err.message}` : "Delete failed.",
      });
    } finally {
      setDeleteDataDialogOpen(false);
      setDangerBusy(false);
    }
  }, [dangerBusy, router, storageMode]);

  const handleDeleteAccount = useCallback(async () => {
    if (dangerBusy || !signedIn) return;
    setDangerBusy(true);
    setDangerResult(null);

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        const msg = payload?.error ? String(payload.error) : `Request failed (${res.status})`;
        throw new Error(msg);
      }

      // Remove local caches/preferences after account deletion
      await clearAllLocalData();

      // Best-effort sign out (session may already be invalid)
      try {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
      } catch {
        // ignore
      }

      setDangerResult({
        type: "success",
        message: "Account deleted successfully.",
      });

      router.refresh();
    } catch (err: any) {
      setDangerResult({
        type: "error",
        message: err?.message ? `Delete failed: ${err.message}` : "Delete failed.",
      });
    } finally {
      setDeleteAccountDialogOpen(false);
      setDangerBusy(false);
    }
  }, [dangerBusy, router, signedIn]);

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
        "relative rounded-2xl border border-sky-100/70",
        "bg-gradient-to-br from-indigo-50 via-white to-sky-50",
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
          <article className="relative overflow-hidden rounded-xl border border-sky-100/80 bg-white/95 p-5 pl-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 before:absolute before:inset-y-0 before:left-0 before:w-2 before:rounded-l-xl before:bg-gradient-to-b before:from-indigo-600 before:to-sky-600 before:content-['']">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-neutral-200/50 blur-3xl" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Account & sync
                </p>
                <div className="mt-1 flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-white ring-1 ring-neutral-100 text-sm font-semibold text-neutral-900 shadow-sm">
                    {signedIn ? accountLabel[0]?.toUpperCase() || "U" : (
                      <UserRound className="h-5 w-5 text-neutral-700" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-neutral-900">
                      {accountLabel}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {signedIn
                        ? session?.user?.email ?? "Signed in"
                        : "Data stored in your browser (IndexedDB)"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!signedIn && (
                  <button
                    type="button"
                    onClick={openSignInGate}
                    className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Sign in to sync
                  </button>
                )}
                {signedIn && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setDangerResult(null);
                        setDeleteAccountDialogOpen(true);
                      }}
                      disabled={authBusy || dangerBusy}
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition",
                        "border-rose-700 bg-rose-600 text-white hover:bg-rose-500",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-300",
                        authBusy || dangerBusy ? "opacity-70" : "",
                      ].join(" ")}
                    >
                      <AlertTriangle className="h-4 w-4 text-white" aria-hidden="true" />
                      Delete account
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={authBusy || dangerBusy}
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition",
                        "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300",
                        authBusy || dangerBusy ? "opacity-70" : "",
                      ].join(" ")}
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      {authBusy ? "Signing out…" : "Sign out"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="rounded-2xl border border-sky-100 bg-white/95 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm font-semibold text-neutral-900">
                    <Cloud className="h-5 w-5 text-sky-600" aria-hidden="true" />
                    <span>Sync & Privacy</span>
                  </div>
                  <div className="text-xs text-neutral-500">{storageMode === 'user' ? 'Synced' : 'Guest'}</div>
                </div>
                <p className="mt-2 text-sm text-neutral-600">
                  {storageMode === "user"
                    ? "Your data is saved to your account and kept locally for offline use and faster loads."
                    : "Your data is stored in this browser (IndexedDB). Sign in to sync across devices and enable backups."}
                </p>
              </div>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-xl border border-sky-100/80 bg-white/95 p-5 pl-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 before:absolute before:inset-y-0 before:left-0 before:w-2 before:rounded-l-xl before:bg-gradient-to-b before:from-emerald-500 before:to-teal-400 before:content-['']">
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
          <article className="relative overflow-hidden rounded-xl border border-neutral-200/80 bg-white/80 p-5 pl-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 before:absolute before:inset-y-0 before:left-0 before:w-2 before:rounded-l-xl before:bg-gradient-to-b before:from-amber-500 before:to-orange-400 before:content-['']">
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
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-neutral-700">
                  {storageMode === "user" ? "Cloud" : "Mode: Local only"}
                </div>
                <Database className="h-5 w-5 text-neutral-400" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              

              <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/70 p-3 shadow-sm">
                <ShieldCheck className="h-7 w-7 text-emerald-600" aria-hidden="true" />
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

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-neutral-300 bg-white/60 p-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Import copy</p>
                    <p className="text-xs text-neutral-600">Upload a JSON backup to restore lists into this browser.</p>
                    {importResult && (
                      <p
                        className={[
                          "mt-2 text-xs",
                          importResult.type === "success"
                            ? "text-emerald-700"
                            : "text-rose-600",
                        ].join(" ")}
                      >
                        {importResult.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={importInputRef}
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={handleImportFile}
                    />
                    <button
                      type="button"
                      onClick={handleImportClick}
                      className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300"
                    >
                      <Cloud className="h-4 w-4" aria-hidden="true" />
                      Import
                    </button>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-rose-200 bg-white/60 p-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Delete all data</p>
                    <p className="text-xs text-neutral-600">
                      Permanently remove all your lists and activity {storageMode === "user" ? "(local + sync)" : "from this browser"}.
                    </p>
                    {dangerResult && (
                      <p
                        className={[
                          "mt-2 text-xs",
                          dangerResult.type === "success"
                            ? "text-emerald-700"
                            : "text-rose-600",
                        ].join(" ")}
                      >
                        {dangerResult.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDangerResult(null);
                        setDeleteDataDialogOpen(true);
                      }}
                      disabled={dangerBusy}
                      className={[
                        "inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-50",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-300",
                        dangerBusy ? "opacity-70" : "",
                      ].join(" ")}
                    >
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-neutral-300 bg-white/60 p-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Export copy</p>
                    <p className="text-xs text-neutral-600">Download a JSON backup of your lists for safekeeping.</p>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300"
                      onClick={handleExport}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Export
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-xl border border-neutral-200/80 bg-white/80 p-5 pl-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 before:absolute before:inset-y-0 before:left-0 before:w-2 before:rounded-l-xl before:bg-gradient-to-b before:from-fuchsia-500 before:to-violet-400 before:content-['']">
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
      {importDialogOpen && (
        <ImportConfirmDialog
          open={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          onConfirm={() => performImport(importPreview)}
          summary={importSummary as any}
        />
      )}

      <DeleteAllDataConfirmDialog
        open={deleteDataDialogOpen}
        onClose={() => setDeleteDataDialogOpen(false)}
        onConfirm={handleDeleteAllData}
        busy={dangerBusy}
        modeLabel={storageMode === "user" ? "account" : "browser"}
      />

      <DeleteAccountConfirmDialog
        open={deleteAccountDialogOpen}
        onClose={() => setDeleteAccountDialogOpen(false)}
        onConfirm={handleDeleteAccount}
        busy={dangerBusy}
      />
    </section>
  );
}
