"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Star, Target, Trophy, Settings2 } from "lucide-react";

import GoalSettingsDialog, {
  type GoalSettingsMode,
  type SingleGoalValues,
  type OverviewGoalValues,
} from "@/components/dialogs/GoalSettingsDialog";

// Storage helpers (guest: IndexedDB mirror, user: Supabase via storage modules).
import { loadInterviews } from "@/lib/services/interviews";
import { loadOffers } from "@/lib/services/offers";
import { idbGet, idbSet } from "@/lib/services/indexedDb";

/**
 * Global refresh event emitted by storage modules
 */
const COUNTS_EVENT = "job-tracker:refresh-counts";

// --- settings for this card ---
type SingleGoalKey = "interviews" | "offers";

type GoalsSettings = {
  interviews: { target: number; periodDays: number };
  offers: { target: number; periodDays: number };
  overview: { weeklyTarget: number; monthlyTarget: number };
};

const DEFAULT_SETTINGS: GoalsSettings = {
  interviews: { target: 3, periodDays: 30 },
  offers: { target: 1, periodDays: 30 },
  overview: { weeklyTarget: 2, monthlyTarget: 8 },
};

// --- date helpers (UTC midnight window) ---
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseToUtcMidnight(dateLike?: string | null): number | null {
  if (!dateLike) return null;
  const [datePart] = String(dateLike).split("T");
  if (!datePart) return null;
  const [yStr, mStr, dStr] = datePart.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}

function getTodayUtcMidnight(nowMs: number): number {
  const now = new Date(nowMs);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function isWithinLastDays(
  dateLike: string | undefined,
  nowMs: number,
  days: number
) {
  const dayMs = parseToUtcMidnight(dateLike);
  if (dayMs == null) return false;
  const today = getTodayUtcMidnight(nowMs);
  const start = today - (Math.max(days, 1) - 1) * MS_PER_DAY; // inclusive window
  return dayMs >= start && dayMs <= today;
}

// --- local settings helpers ---
const GOALS_SETTINGS_IDB_KEY = "goals-settings-v1";

async function loadSettings(): Promise<GoalsSettings> {
  try {
    const raw = await idbGet<any>(GOALS_SETTINGS_IDB_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    return {
      interviews: {
        target:
          Number(raw?.interviews?.target) || DEFAULT_SETTINGS.interviews.target,
        periodDays:
          Number(raw?.interviews?.periodDays) ||
          DEFAULT_SETTINGS.interviews.periodDays,
      },
      offers: {
        target: Number(raw?.offers?.target) || DEFAULT_SETTINGS.offers.target,
        periodDays:
          Number(raw?.offers?.periodDays) || DEFAULT_SETTINGS.offers.periodDays,
      },
      overview: {
        weeklyTarget:
          Number(raw?.overview?.weeklyTarget) ||
          DEFAULT_SETTINGS.overview.weeklyTarget,
        monthlyTarget:
          Number(raw?.overview?.monthlyTarget) ||
          DEFAULT_SETTINGS.overview.monthlyTarget,
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(next: GoalsSettings) {
  void idbSet(GOALS_SETTINGS_IDB_KEY, next);
}

// --- minimal shapes for counting ---
type InterviewLike = { date?: string };
type OfferLike = { offerReceivedDate?: string; decisionDate?: string };

export default function GoalsCard() {
  const [settings, setSettings] = useState<GoalsSettings>(DEFAULT_SETTINGS);

  // storage-backed lists
  const [interviews, setInterviews] = useState<InterviewLike[]>([]);
  const [offers, setOffers] = useState<OfferLike[]>([]);

  // counts
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [interviewsCount, setInterviewsCount] = useState(0);
  const [offersCount, setOffersCount] = useState(0);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);

  // settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMode, setSettingsMode] = useState<GoalSettingsMode>("single");
  const [settingsKey, setSettingsKey] =
    useState<SingleGoalKey | "overview" | null>(null);

  // init clock + load settings
  useEffect(() => {
    if (typeof window === "undefined") return;

    setNowMs(Date.now());

    (async () => {
      const loaded = await loadSettings();
      setSettings(loaded);
    })();

    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // load storage data (NO per-component supabase session/listeners)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let alive = true;
    let inFlight = false;

    const loadAll = async () => {
      if (inFlight) return;
      inFlight = true;

      try {
        const [i, o] = await Promise.all([loadInterviews(), loadOffers()]);
        if (!alive) return;

        setInterviews((i.items as any[]) ?? []);
        setOffers((o.items as any[]) ?? []);
      } catch (err) {
        console.error("GoalsCard: failed to load data:", err);
      } finally {
        inFlight = false;
      }
    };

    const refresh = () => void loadAll();

    void loadAll();

    window.addEventListener(COUNTS_EVENT, refresh);
    window.addEventListener("focus", refresh);

    const onVis = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      window.removeEventListener(COUNTS_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // recompute counts when time, settings, or storage lists change
  useEffect(() => {
    if (!nowMs) return;

    const iCount = interviews.filter((i) =>
      isWithinLastDays(i.date, nowMs, settings.interviews.periodDays)
    ).length;

    const oCount = offers.filter((o) =>
      isWithinLastDays(
        o.offerReceivedDate ?? o.decisionDate,
        nowMs,
        settings.offers.periodDays
      )
    ).length;

    const wCount = interviews.filter((i) => isWithinLastDays(i.date, nowMs, 7))
      .length;
    const mCount = interviews.filter((i) =>
      isWithinLastDays(i.date, nowMs, 30)
    ).length;

    setInterviewsCount(iCount);
    setOffersCount(oCount);
    setWeeklyCount(wCount);
    setMonthlyCount(mCount);
  }, [
    nowMs,
    settings.interviews.periodDays,
    settings.offers.periodDays,
    interviews,
    offers,
  ]);

  // top cards definition (2 cards only)
  const topGoals = useMemo(() => {
    return [
      {
        key: "interviews" as const,
        label: "Interviews",
        current: interviewsCount,
        target: settings.interviews.target,
        periodDays: settings.interviews.periodDays,
        accent: "from-indigo-500 to-sky-400",
        hint: "Counted by interview date",
      },
      {
        key: "offers" as const,
        label: "Offers received",
        current: offersCount,
        target: settings.offers.target,
        periodDays: settings.offers.periodDays,
        accent: "from-emerald-500 to-teal-400",
        hint: "Counted by offer received date",
      },
    ];
  }, [interviewsCount, offersCount, settings]);

  const openSingleSettings = (key: SingleGoalKey) => {
    setSettingsKey(key);
    setSettingsMode("single");
    setSettingsOpen(true);
  };

  const openOverviewSettings = () => {
    setSettingsKey("overview");
    setSettingsMode("overview");
    setSettingsOpen(true);
  };

  const handleSaveSingle = (values: SingleGoalValues) => {
    if (!settingsKey || settingsKey === "overview") return;

    const next: GoalsSettings = {
      ...settings,
      [settingsKey]: {
        target: Math.max(1, Math.floor(values.target || 1)),
        periodDays: Math.max(1, Math.floor(values.periodDays || 1)),
      },
    };

    setSettings(next);
    persistSettings(next);
  };

  const handleSaveOverview = (values: OverviewGoalValues) => {
    const next: GoalsSettings = {
      ...settings,
      overview: {
        weeklyTarget: Math.max(1, Math.floor(values.weeklyTarget || 1)),
        monthlyTarget: Math.max(1, Math.floor(values.monthlyTarget || 1)),
      },
    };

    setSettings(next);
    persistSettings(next);
  };

  // derived ratios
  const weeklyRatio = Math.min(
    weeklyCount / Math.max(settings.overview.weeklyTarget, 1),
    1
  );
  const monthlyRatio = Math.min(
    monthlyCount / Math.max(settings.overview.monthlyTarget, 1),
    1
  );

  const streakBadge = `Nice! You scheduled ${weeklyCount} interview${weeklyCount === 1 ? "" : "s"
    } this week 🎉`;

  return (
    <>
      <GoalSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={settingsMode}
        title={
          settingsMode === "overview"
            ? "Set weekly & monthly goals"
            : settingsKey === "offers"
              ? "Set offers goal"
              : "Set interviews goal"
        }
        description={
          settingsMode === "overview"
            ? "These goals power the overview bars below."
            : "Choose a rolling time window (in days) and a target."
        }
        initialValues={
          settingsMode === "overview"
            ? {
              weeklyTarget: settings.overview.weeklyTarget,
              monthlyTarget: settings.overview.monthlyTarget,
            }
            : settingsKey === "offers"
              ? {
                target: settings.offers.target,
                periodDays: settings.offers.periodDays,
              }
              : {
                target: settings.interviews.target,
                periodDays: settings.interviews.periodDays,
              }
        }
        onSave={(vals) => {
          if (settingsMode === "overview") {
            handleSaveOverview(vals as OverviewGoalValues);
          } else {
            handleSaveSingle(vals as SingleGoalValues);
          }
          setSettingsOpen(false);
        }}
      />

      <section
        className={[
          "relative overflow-hidden rounded-2xl border border-neutral-200/70",
          "bg-gradient-to-br from-indigo-50 via-white to-emerald-50",
          "p-6 sm:p-7 shadow-md",
        ].join(" ")}
      >
        {/* blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />

        <div className="relative z-10 space-y-5">
          {/* Header + streak */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm">
                <Target className="h-3.5 w-3.5" />
                <span>Goals & progress</span>
              </div>
              <p className="mt-2 text-sm text-neutral-700">
                Keep your weekly and monthly goals visible and see how you&apos;re
                moving towards them.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-white/85 px-3 py-2 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Flame className="h-3.5 w-3.5" />
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-neutral-900">
                    Weekly momentum
                  </p>
                  <p className="text-[11px] text-neutral-600">{streakBadge}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top goals cards (Interviews + Offers) */}
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {topGoals.map((goal) => {
                const ratio = Math.min(
                  goal.current / Math.max(goal.target, 1),
                  1
                );
                const pct = Math.round(
                  (goal.current / Math.max(goal.target, 1)) * 100
                );

                return (
                  <div
                    key={goal.key}
                    className="relative rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-sm backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                          {goal.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-neutral-500">
                          Last {goal.periodDays} day
                          {goal.periodDays === 1 ? "" : "s"} • {goal.hint}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openSingleSettings(goal.key)}
                        className={[
                          "inline-flex items-center gap-1 rounded-lg border border-neutral-200",
                          "bg-white px-2 py-1 text-[11px] font-medium text-neutral-700",
                          "shadow-sm hover:bg-neutral-50",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300",
                        ].join(" ")}
                        aria-label={`Set ${goal.label} goal`}
                        title={`Set ${goal.label} goal`}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        <span>Set</span>
                      </button>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold text-neutral-900">
                        {goal.current}/{goal.target}
                      </span>
                      <span className="text-xs text-neutral-500">{pct}%</span>
                    </div>

                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full bg-gradient-to-r ${goal.accent}`}
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weekly + Monthly goal bars */}
            <div className="relative rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Goals overview
                  </p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    Weekly: {weeklyCount}/{settings.overview.weeklyTarget} ·
                    Monthly: {monthlyCount}/{settings.overview.monthlyTarget}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openOverviewSettings}
                    className={[
                      "inline-flex items-center gap-1 rounded-lg border border-neutral-200",
                      "bg-white px-2 py-1 text-[11px] font-medium text-neutral-700",
                      "shadow-sm hover:bg-neutral-50",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300",
                    ].join(" ")}
                    aria-label="Set weekly and monthly goals"
                    title="Set weekly and monthly goals"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    <span>Set</span>
                  </button>

                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Trophy className="h-4 w-4" />
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {/* Weekly bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Weekly</span>
                    <span className="font-medium text-neutral-700">
                      {weeklyCount}/{settings.overview.weeklyTarget}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500"
                      style={{ width: `${weeklyRatio * 100}%` }}
                    />
                  </div>
                </div>

                {/* Monthly bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Monthly</span>
                    <span className="font-medium text-neutral-700">
                      {monthlyCount}/{settings.overview.monthlyTarget}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 via-sky-500 to-emerald-500"
                      style={{ width: `${monthlyRatio * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <p className="text-neutral-600">
                  Just{" "}
                  <span className="font-semibold text-neutral-900">
                    {Math.max(settings.overview.weeklyTarget - weeklyCount, 0)}
                  </span>{" "}
                  more to hit this week&apos;s goal.
                </p>
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <Star className="h-3 w-3" />
                  <span>{streakBadge}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
