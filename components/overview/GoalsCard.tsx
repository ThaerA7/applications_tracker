// app/components/GoalsCard.tsx

import { Flame, Star, Target, Trophy } from "lucide-react";

const goals = [
  {
    id: 1,
    label: "Applications this week",
    current: 14,
    target: 20,
    accent: "from-sky-500 to-cyan-400",
  },
  {
    id: 2,
    label: "Follow-ups sent",
    current: 6,
    target: 10,
    accent: "from-amber-500 to-orange-400",
  },
  {
    id: 3,
    label: "Networking touches",
    current: 3,
    target: 5,
    accent: "from-emerald-500 to-teal-400",
  },
];

const streak = {
  days: 3,
  weeklyGoal: { target: 10, current: 6 },
  monthlyGoal: { target: 40, current: 24 },
  badge: "Nice! You scheduled 2 interviews this week 🎉",
};

export default function GoalsCard() {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-2xl border border-neutral-200/70",
        "bg-gradient-to-br from-amber-50 via-white to-sky-50",
        "p-6 sm:p-7 shadow-md",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative z-10 space-y-5">
        {/* Header + streak */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-white/80 px-3 py-1 text-xs font-medium text-amber-700 shadow-sm">
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
                  Streak: {streak.days} day{streak.days === 1 ? "" : "s"} in a
                  row
                </p>
                <p className="text-[11px] text-neutral-600">{streak.badge}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Goals cards + weekly/monthly bars */}
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {goals.map((goal) => {
              const ratio = Math.min(goal.current / goal.target, 1);
              const pct = Math.round((goal.current / goal.target) * 100);
              return (
                <div
                  key={goal.id}
                  className="rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-sm backdrop-blur"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    {goal.label}
                  </p>
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
          <div className="rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Goals overview
                </p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  Weekly: {streak.weeklyGoal.current}/{streak.weeklyGoal.target}{" "}
                  · Monthly: {streak.monthlyGoal.current}/
                  {streak.monthlyGoal.target}
                </p>
              </div>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <Trophy className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {/* Weekly bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Weekly</span>
                  <span className="font-medium text-neutral-700">
                    {streak.weeklyGoal.current}/{streak.weeklyGoal.target}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500"
                    style={{
                      width: `${Math.min(
                        (streak.weeklyGoal.current /
                          streak.weeklyGoal.target) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Monthly bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Monthly</span>
                  <span className="font-medium text-neutral-700">
                    {streak.monthlyGoal.current}/{streak.monthlyGoal.target}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 via-sky-500 to-emerald-500"
                    style={{
                      width: `${Math.min(
                        (streak.monthlyGoal.current /
                          streak.monthlyGoal.target) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <p className="text-neutral-600">
                Just{" "}
                <span className="font-semibold text-neutral-900">
                  {Math.max(
                    streak.weeklyGoal.target - streak.weeklyGoal.current,
                    0
                  )}
                </span>{" "}
                more to hit this week&apos;s goal.
              </p>
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <Star className="h-3 w-3" />
                <span>Nice! 2 interviews this week 🎉</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
