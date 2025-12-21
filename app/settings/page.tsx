"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database,
  Download,
  HardDrive,
  Lightbulb,
  LogOut,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { getSupabaseClient } from "@/lib/supabase/client";
import { getModeCached } from "@/lib/supabase/sessionCache";
import { loadApplied, upsertApplied } from "@/lib/services/applied";
import { loadInterviews, upsertInterview } from "@/lib/services/interviews";
import { loadNotes, upsertNote } from "@/lib/services/notes";
import { loadOffers, upsertOffer } from "@/lib/services/offers";
import { loadRejected, upsertRejected } from "@/lib/services/rejected";
import { loadWishlist, upsertWishlistItem } from "@/lib/services/wishlist";
import { loadWithdrawn, upsertWithdrawn } from "@/lib/services/withdrawn";
import { loadActivity, appendActivity } from "@/lib/services/activity";
import {
  requestNotificationPermission,
  areNotificationsEnabled,
} from "@/lib/services/notifications";
import ImportConfirmDialog from "@/components/dialogs/ImportConfirmDialog";
import DeleteAllDataConfirmDialog from "@/components/dialogs/DeleteAllDataConfirmDialog";
import DeleteAccountConfirmDialog from "@/components/dialogs/DeleteAccountConfirmDialog";
import { clearAllData, clearAllLocalData } from "@/lib/services/purge";

type Preferences = {
  reminders: boolean;
  digest: boolean;
  emailNotifications: boolean;
};

type DataCounts = {
  applied: number;
  interviews: number;
  notes: number;
  offers: number;
  rejected: number;
  wishlist: number;
  withdrawn: number;
};

type DataCountsBundle = {
  all: DataCounts;
  byMonth: Record<string, DataCounts>; // key: "YYYY-MM"
};

const PREFS_KEY = "job-tracker:settings-preferences";
const DEFAULT_PREFS: Preferences = {
  reminders: true,
  digest: false,
  emailNotifications: false,
};

const SIDEBAR_ALWAYS_COLLAPSED_KEY = "job-tracker:sidebar-always-collapsed";
const SIDEBAR_ALWAYS_COLLAPSED_EVENT = "job-tracker:set-sidebar-always-collapsed";

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
            value ? "translate-x-6" : "translate-x-1",
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
  const [sidebarAlwaysCollapsed, setSidebarAlwaysCollapsed] = useState(false);
  const [dataCounts, setDataCounts] = useState<DataCountsBundle | null>(null);
  const [countsBusy, setCountsBusy] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

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
        const parsed = JSON.parse(raw) as Partial<Preferences> | null;
        setPrefs({
          reminders:
            typeof parsed?.reminders === "boolean"
              ? parsed.reminders
              : DEFAULT_PREFS.reminders,
          digest:
            typeof parsed?.digest === "boolean" ? parsed.digest : DEFAULT_PREFS.digest,
          emailNotifications:
            typeof parsed?.emailNotifications === "boolean"
              ? parsed.emailNotifications
              : DEFAULT_PREFS.emailNotifications,
        });
      }
    } catch {
      setPrefs(DEFAULT_PREFS);
    } finally {
      setPrefsLoaded(true);
    }
  }, []);

  // Load sidebar "always collapsed" setting (shared with AppShell)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(SIDEBAR_ALWAYS_COLLAPSED_KEY);
      setSidebarAlwaysCollapsed(stored === "1" || stored === "true");
    } catch {
      setSidebarAlwaysCollapsed(false);
    }
  }, []);

  // Load a lightweight summary of stored list sizes
  useEffect(() => {
    let active = true;
    setCountsBusy(true);
    setDataCounts(null);

    void (async () => {
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

        if (!active) return;

        const getMonthKey = (dateStr: string | null | undefined): string | null => {
          if (!dateStr) return null;
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return null;
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        };

        const groupByMonth = <T,>(
          items: T[],
          getDate: (item: T) => string | null | undefined,
          byMonth: Record<string, DataCounts>,
          key: keyof DataCounts
        ) => {
          for (const item of items) {
            const monthKey = getMonthKey(getDate(item));
            if (monthKey) {
              if (!byMonth[monthKey]) {
                byMonth[monthKey] = { applied: 0, interviews: 0, notes: 0, offers: 0, rejected: 0, wishlist: 0, withdrawn: 0 };
              }
              byMonth[monthKey][key]++;
            }
          }
        };

        const all: DataCounts = {
          applied: appliedRes.items.length,
          interviews: interviewsRes.items.length,
          notes: notesRes.items.length,
          offers: offersRes.items.length,
          rejected: rejectedRes.items.length,
          wishlist: wishlistRes.items.length,
          withdrawn: withdrawnRes.items.length,
        };

        const byMonth: Record<string, DataCounts> = {};
        groupByMonth(appliedRes.items as any[], (a: any) => a?.appliedOn, byMonth, "applied");
        groupByMonth(interviewsRes.items as any[], (i: any) => i?.date, byMonth, "interviews");
        groupByMonth(notesRes.items as any[], (n: any) => n?.updatedAt, byMonth, "notes");
        groupByMonth(offersRes.items as any[], (o: any) => o?.offerReceivedDate ?? o?.decisionDate ?? o?.offerAcceptedDate ?? o?.offerDeclinedDate ?? o?.appliedOn, byMonth, "offers");
        groupByMonth(rejectedRes.items as any[], (r: any) => r?.decisionDate ?? r?.appliedDate, byMonth, "rejected");
        groupByMonth(wishlistRes.items as any[], (w: any) => w?.startDate ?? null, byMonth, "wishlist");
        groupByMonth(withdrawnRes.items as any[], (w: any) => w?.withdrawnDate ?? w?.interviewDate ?? w?.appliedOn, byMonth, "withdrawn");

        setDataCounts({ all, byMonth });
      } catch {
        if (active) setDataCounts(null);
      } finally {
        if (active) setCountsBusy(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [storageMode]);

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

  const setSidebarAlwaysCollapsedEverywhere = useCallback((next: boolean) => {
    setSidebarAlwaysCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_ALWAYS_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
    try {
      window.dispatchEvent(
        new CustomEvent(SIDEBAR_ALWAYS_COLLAPSED_EVENT, {
          detail: { alwaysCollapsed: next },
        })
      );
    } catch {
      // ignore
    }
  }, []);

  const resetPreferences = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
    try {
      window.localStorage.removeItem(PREFS_KEY);
    } catch {
      // ignore
    }
  }, []);

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

  const headerTip = signedIn
    ? "Tip: Export a JSON backup occasionally."
    : "Tip: Sign in to sync across devices.";

  const visibleCounts = dataCounts?.byMonth[selectedMonth] ?? null;
  const visibleItemsCount = visibleCounts
    ? visibleCounts.applied + visibleCounts.interviews + visibleCounts.offers + visibleCounts.rejected + visibleCounts.wishlist + visibleCounts.withdrawn
    : 0;
  const visibleNotesCount = visibleCounts?.notes ?? 0;

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const goToPrevMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const prev = new Date(year, month - 2);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
  };

  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const next = new Date(year, month);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    if (nextMonth <= currentMonth) {
      setSelectedMonth(nextMonth);
    }
  };

  const isCurrentMonth = () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return selectedMonth === currentMonth;
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
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

          <div className="hidden sm:flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3 py-1 text-xs font-semibold text-neutral-700 shadow-sm">
              <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden="true" />
              <span className="text-neutral-700">{headerTip}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-6 grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:items-stretch">
        <article className="flex flex-col relative overflow-hidden rounded-xl border border-sky-100/80 bg-white/95 p-5 pl-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 before:absolute before:inset-y-0 before:left-0 before:w-2 before:rounded-l-xl before:bg-gradient-to-b before:from-indigo-600 before:to-sky-600 before:content-[''] lg:col-start-1 lg:row-start-1">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-neutral-200/50 blur-3xl" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Account & sync
              </p>
              <div className="mt-1 flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white ring-1 ring-neutral-100 text-sm font-semibold text-neutral-900 shadow-sm">
                  {signedIn ? (
                    accountLabel[0]?.toUpperCase() || "U"
                  ) : (
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

          <div className="mt-4 flex-1 flex flex-col">
            <div className="flex-1 flex flex-col rounded-2xl border border-sky-100 bg-white/95 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm font-semibold text-neutral-900">
                  <Cloud className="h-5 w-5 text-sky-600" aria-hidden="true" />
                  <span>Your Data at a Glance</span>
                </div>
                <span className={[
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  signedIn
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
                ].join(" ")}>
                  <span className={[
                    "h-1.5 w-1.5 rounded-full",
                    signedIn ? "bg-emerald-500 animate-pulse" : "bg-amber-500",
                  ].join(" ")} />
                  {signedIn ? "Synced" : "Local only"}
                </span>
              </div>

              {dataCounts ? (
                <>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <div className="text-center rounded-lg bg-gradient-to-br from-indigo-50 to-sky-50 px-2 py-2.5 ring-1 ring-indigo-100/50">
                      <p className="text-lg font-bold text-indigo-600">{dataCounts.all.applied}</p>
                      <p className="text-[10px] font-medium text-indigo-600/70 uppercase tracking-wide">Applied</p>
                    </div>
                    <div className="text-center rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 px-2 py-2.5 ring-1 ring-violet-100/50">
                      <p className="text-lg font-bold text-violet-600">{dataCounts.all.wishlist}</p>
                      <p className="text-[10px] font-medium text-violet-600/70 uppercase tracking-wide">Wishlist</p>
                    </div>
                    <div className="text-center rounded-lg bg-gradient-to-br from-sky-50 to-cyan-50 px-2 py-2.5 ring-1 ring-sky-100/50">
                      <p className="text-lg font-bold text-sky-600">{dataCounts.all.interviews}</p>
                      <p className="text-[10px] font-medium text-sky-600/70 uppercase tracking-wide">Interviews</p>
                    </div>
                    <div className="text-center rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 px-2 py-2.5 ring-1 ring-emerald-100/50">
                      <p className="text-lg font-bold text-emerald-600">{dataCounts.all.offers}</p>
                      <p className="text-[10px] font-medium text-emerald-600/70 uppercase tracking-wide">Offers</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50/80 px-3 py-2 ring-1 ring-neutral-100">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-400" />
                        <span className="text-xs text-neutral-600">{dataCounts.all.rejected} rejected</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-neutral-400" />
                        <span className="text-xs text-neutral-600">{dataCounts.all.withdrawn} withdrawn</span>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-neutral-500">
                      {dataCounts.all.notes} notes
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-3 flex-1 flex items-center justify-center">
                  <p className="text-sm text-neutral-400">Loading your data...</p>
                </div>
              )}

              <div className="mt-auto pt-3 border-t border-sky-100 flex items-center justify-between">
                <p className="text-xs text-neutral-500">
                  {signedIn ? "End-to-end encrypted & synced" : "Stored in browser only"}
                </p>
                <p className="text-xs font-medium text-neutral-600">
                  {dataCounts
                    ? `${dataCounts.all.applied + dataCounts.all.wishlist + dataCounts.all.interviews + dataCounts.all.offers + dataCounts.all.rejected + dataCounts.all.withdrawn} total items`
                    : "–"}
                </p>
              </div>
            </div>
          </div>


        </article>

        <article className="relative overflow-hidden rounded-xl border border-sky-100/80 bg-white/95 p-5 pl-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 before:absolute before:inset-y-0 before:left-0 before:w-2 before:rounded-l-xl before:bg-gradient-to-b before:from-emerald-500 before:to-teal-400 before:content-[''] lg:col-start-1 lg:row-start-2">
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
            <span className="inline-flex items-center text-neutral-500">
              <HardDrive className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Local-only</span>
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            <ToggleRow
              title="Interview reminders"
              description="Browser notification 24 hours before upcoming interviews."
              value={prefs.reminders}
              onChange={async (next) => {
                if (next && !areNotificationsEnabled()) {
                  const permission = await requestNotificationPermission();
                  if (permission !== "granted") {
                    return; // Don't enable if permission denied
                  }
                }
                setPrefs((p) => ({ ...p, reminders: next }));
              }}
              badge="recommended"
            />
            <ToggleRow
              title="Email notifications"
              description="Send reminders and digests to your email address."
              value={prefs.emailNotifications}
              badge={signedIn ? undefined : "requires sign-in"}
              onChange={(next) => {
                if (!signedIn) {
                  openSignInGate();
                  return;
                }
                setPrefs((p) => ({ ...p, emailNotifications: next }));
              }}
            />
            <ToggleRow
              title="Weekly digest"
              description="Show a summary dialog on your first visit each Monday."
              value={prefs.digest}
              onChange={(next) => setPrefs((p) => ({ ...p, digest: next }))}
            />
            <ToggleRow
              title="Always keep sidebar collapsed"
              description="Prevent expanding the sidebar to keep more room for content."
              value={sidebarAlwaysCollapsed}
              onChange={setSidebarAlwaysCollapsedEverywhere}
            />

            <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200/80 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
              <div className="flex-1">
                <p className="text-sm font-semibold text-neutral-900">
                  Reset preferences
                </p>
                <p className="text-xs text-neutral-600">
                  Restore Settings toggles to their defaults.
                </p>
              </div>
              <button
                type="button"
                onClick={resetPreferences}
                className="inline-flex h-8 w-24 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-1 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300"
              >
                Reset
              </button>
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-xl border border-neutral-200/80 bg-white/80 p-5 pl-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 before:absolute before:inset-y-0 before:left-0 before:w-2 before:rounded-l-xl before:bg-gradient-to-b before:from-amber-500 before:to-orange-400 before:content-[''] lg:col-start-2 lg:row-start-2">
          <div className="pointer-events-none absolute -right-14 -bottom-10 h-32 w-32 rounded-full bg-neutral-200/50 blur-3xl" />

          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Data & backups
              </p>
              <p className="text-sm text-neutral-700">
                Back up, restore, or delete your lists.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-neutral-700">
                {storageMode === "user" ? "Cloud + Local" : "Local only"}
              </div>
              <Database className="h-5 w-5 text-neutral-400" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/70 p-3 shadow-sm">
              <ShieldCheck className="h-7 w-7 text-emerald-600" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-neutral-900">Privacy first</p>
                <p className="text-xs text-neutral-600">
                  We never sell your data. In Guest mode, your data stays on this
                  device and can be deleted anytime from Settings.
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
                    className="inline-flex h-8 w-24 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300"
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
                      "inline-flex h-8 w-24 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-1 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-50",
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
                    className="inline-flex h-8 w-24 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300"
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

        <article className="relative overflow-hidden rounded-xl border border-neutral-200/80 bg-white/80 p-5 pl-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 before:absolute before:inset-y-0 before:left-0 before:w-2 before:rounded-l-xl before:bg-gradient-to-b before:from-emerald-500 before:to-teal-400 before:content-[''] lg:col-start-2 lg:row-start-1 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Data summary
              </p>
              <p className="text-sm text-neutral-700">
                Activity by month ({storageMode === "user" ? "cloud + local" : "local"}).
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-neutral-400" aria-hidden="true" />
          </div>

          <div className="mt-2">
            <div className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-1 py-1 shadow-sm">
              <button
                type="button"
                onClick={goToPrevMonth}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-300"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-neutral-900">
                {formatMonthLabel(selectedMonth)}
              </span>
              <button
                type="button"
                onClick={goToNextMonth}
                disabled={isCurrentMonth()}
                className={[
                  "inline-flex h-7 w-7 items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-300",
                  isCurrentMonth()
                    ? "text-neutral-300 cursor-not-allowed"
                    : "text-neutral-600 hover:bg-neutral-100",
                ].join(" ")}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-neutral-200 bg-white/80 p-4 shadow-sm h-[168px] flex flex-col justify-center">
            {countsBusy && <p className="text-xs text-neutral-600 text-center">Loading…</p>}
            {!countsBusy && visibleCounts && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center justify-between gap-2"><span className="text-neutral-700">Applied</span><span className="font-semibold text-neutral-900">{visibleCounts.applied}</span></div>
                <div className="flex items-center justify-between gap-2"><span className="text-neutral-700">Wishlist</span><span className="font-semibold text-neutral-900">{visibleCounts.wishlist}</span></div>
                <div className="flex items-center justify-between gap-2"><span className="text-neutral-700">Interviews</span><span className="font-semibold text-neutral-900">{visibleCounts.interviews}</span></div>
                <div className="flex items-center justify-between gap-2"><span className="text-neutral-700">Offers</span><span className="font-semibold text-neutral-900">{visibleCounts.offers}</span></div>
                <div className="flex items-center justify-between gap-2"><span className="text-neutral-700">Rejected</span><span className="font-semibold text-neutral-900">{visibleCounts.rejected}</span></div>
                <div className="flex items-center justify-between gap-2"><span className="text-neutral-700">Withdrawn</span><span className="font-semibold text-neutral-900">{visibleCounts.withdrawn}</span></div>
                <div className="flex items-center justify-between gap-2"><span className="text-neutral-700">Notes</span><span className="font-semibold text-neutral-900">{visibleCounts.notes}</span></div>
              </div>
            )}
            {!countsBusy && !visibleCounts && (
              <p className="text-sm text-neutral-500 text-center">No activity this month</p>
            )}
          </div>

          <div className="mt-3 rounded-lg border border-neutral-200 bg-white/70 p-3 text-xs text-neutral-600 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-neutral-700">Items in {formatMonthLabel(selectedMonth).split(" ")[0]}</span>
              <span className="font-semibold text-neutral-900">
                {visibleItemsCount} item{visibleItemsCount !== 1 ? "s" : ""}{visibleNotesCount > 0 ? ` & ${visibleNotesCount} note${visibleNotesCount !== 1 ? "s" : ""}` : ""}
              </span>
            </div>
            <p className="mt-1">
              {dataCounts?.all
                ? (() => {
                  const totalItems = dataCounts.all.applied + dataCounts.all.interviews + dataCounts.all.offers + dataCounts.all.rejected + dataCounts.all.wishlist + dataCounts.all.withdrawn;
                  const totalNotes = dataCounts.all.notes;
                  return `${totalItems} item${totalItems !== 1 ? "s" : ""}${totalNotes > 0 ? ` & ${totalNotes} note${totalNotes !== 1 ? "s" : ""}` : ""} across all time.`;
                })()
                : "Loading total..."}
            </p>
          </div>
        </article>
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
