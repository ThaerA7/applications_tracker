// app/page.tsx
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  ListChecks,
  ListTodo,
  Plus,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

const weeklyActivity = [
  { day: "Mon", applications: 4, interviews: 1 },
  { day: "Tue", applications: 3, interviews: 0 },
  { day: "Wed", applications: 5, interviews: 1 },
  { day: "Thu", applications: 2, interviews: 0 },
  { day: "Fri", applications: 4, interviews: 2 },
  { day: "Sat", applications: 1, interviews: 0 },
  { day: "Sun", applications: 0, interviews: 0 },
];

const conversionOverTime = [
  { label: "Week 1", applications: 18, interviews: 4, offers: 1 },
  { label: "Week 2", applications: 21, interviews: 5, offers: 1 },
  { label: "Week 3", applications: 16, interviews: 3, offers: 0 },
  { label: "Week 4", applications: 19, interviews: 6, offers: 2 },
];

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

const upcomingInterviews = [
  {
    id: 1,
    company: "Acme Corp",
    role: "Frontend Engineer",
    when: "Tomorrow · 14:00",
    detail: "Video call · Berlin time",
  },
  {
    id: 2,
    company: "Globex",
    role: "Mobile Developer (Flutter)",
    when: "Fri · 10:30",
    detail: "Phone screen · Recruiter",
  },
  {
    id: 3,
    company: "Initech",
    role: "Full-Stack Developer",
    when: "Next Tue · 09:15",
    detail: "Onsite · Munich HQ",
  },
];

const recentActivity = [
  {
    id: 1,
    type: "applied",
    label: "You applied to Frontend Developer @ PixelFlow",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "interview",
    label: "Interview scheduled with NovaTech (Backend Engineer)",
    time: "1 day ago",
  },
  {
    id: 3,
    type: "rejected",
    label: "Application to DevOps Engineer @ CloudNine marked as Rejected",
    time: "3 days ago",
  },
  {
    id: 4,
    type: "withdrawn",
    label: "You withdrew your application for React Developer @ BrightLabs",
    time: "5 days ago",
  },
];

const notesPreview = [
  {
    id: 1,
    title: "System design questions to review",
    preview:
      "CAP theorem, database sharding, caching strategies, queues vs streams...",
    tag: "Preparation",
  },
  {
    id: 2,
    title: "Salary ranges to target",
    preview: "Berlin: 55k–65k · Munich: 60k–70k · Remote: 50k–65k...",
    tag: "Research",
  },
  {
    id: 3,
    title: "Follow-up templates",
    preview: "Hi [Name], just checking in regarding my application for...",
    tag: "Templates",
  },
];

const wishlistJobs = [
  {
    id: 1,
    company: "Stripe",
    role: "Frontend Engineer",
    location: "Remote (EU)",
    tag: "Dream company",
  },
  {
    id: 2,
    company: "Notion",
    role: "Product Engineer",
    location: "Dublin / Remote",
    tag: "Product focused",
  },
  {
    id: 3,
    company: "Figma",
    role: "UI Engineer",
    location: "Berlin",
    tag: "Design heavy",
  },
];

const timeMetrics = [
  {
    id: 1,
    label: "Avg days to first response",
    value: 8,
    target: 10,
    hint: "Good – under 10 days",
  },
  {
    id: 2,
    label: "Avg days interview → decision",
    value: 5,
    target: 7,
    hint: "Healthy pace",
  },
  {
    id: 3,
    label: "Longest ghosted application",
    value: 34,
    target: 21,
    hint: "Consider a follow-up",
  },
];

const streak = {
  days: 3,
  weeklyGoal: { target: 10, current: 6 },
  badge: "Nice! You scheduled 2 interviews this week 🎉",
};

const kpi = {
  totalApplications: 62,
  totalInterviews: 14,
  totalOffers: 3,
  totalRejected: 18,
  totalWithdrawn: 5,
  responseRate: 68,
  interviewRate: 23,
  weeklyApplications: 19,
  monthlyApplications: 42,
};

const tooltipStyle = {
  backgroundColor: "rgba(255,255,255,0.96)",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
  fontSize: 12,
  padding: "8px 10px",
};

export default function HomePage() {
  return (
    <section className="space-y-6">
      {/* ROW 1 – Overview + KPIs + Quick actions + Charts */}
      <section
        className={[
          "relative overflow-hidden rounded-2xl border border-neutral-200/70",
          "bg-gradient-to-br from-sky-50 via-white to-emerald-50",
          "p-6 sm:p-7 shadow-md",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />

        <div className="relative z-10 space-y-5">
          {/* Header row: title + quick actions aligned */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Job search overview</span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-neutral-900">
                Your applications at a glance
              </h1>
              <p className="mt-1 text-sm text-neutral-700">
                Track how your pipeline is moving this week and what needs your
                attention.
              </p>
            </div>

            {/* Quick actions in a compact horizontal group */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={[
                  "inline-flex items-center gap-2 rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-medium",
                  "bg-sky-50 text-sky-800 shadow-sm hover:bg-sky-100",
                ].join(" ")}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                <span>Add application</span>
              </button>
              <button
                type="button"
                className={[
                  "inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium",
                  "bg-emerald-50 text-emerald-800 shadow-sm hover:bg-emerald-100",
                ].join(" ")}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90">
                  <CalendarDays className="h-3.5 w-3.5" />
                </span>
                <span>Add interview</span>
              </button>
              <button
                type="button"
                className={[
                  "inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium",
                  "bg-white text-neutral-800 shadow-sm hover:bg-neutral-50",
                ].join(" ")}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-50">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <span>Add note</span>
              </button>
            </div>
          </div>

          {/* KPIs in a single row */}
          <div className="grid gap-3 md:grid-cols-3">
            {/* Total applications */}
            <div className="rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Total applications
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-neutral-900">
                    {kpi.totalApplications}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                  <ListChecks className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
                <span>
                  Response rate{" "}
                  <span className="font-semibold text-emerald-600">
                    {kpi.responseRate}%
                  </span>
                </span>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                  {kpi.weeklyApplications} this week
                </span>
              </div>
            </div>

            {/* Interviews */}
            <div className="rounded-xl border border-emerald-100 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Interviews
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-neutral-900">
                    {kpi.totalInterviews}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <CalendarDays className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
                <span>
                  Conversion{" "}
                  <span className="font-semibold text-emerald-600">
                    {kpi.interviewRate}%
                  </span>
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                  {kpi.totalOffers} offer
                  {kpi.totalOffers === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Decisions */}
            <div className="rounded-xl border border-rose-100 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Decisions
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-neutral-900">
                    {kpi.totalRejected + kpi.totalWithdrawn}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
                <span>
                  Rejected{" "}
                  <span className="font-semibold text-rose-600">
                    {kpi.totalRejected}
                  </span>
                </span>
                <span>
                  Withdrawn{" "}
                  <span className="font-semibold text-amber-600">
                    {kpi.totalWithdrawn}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Clean charts row – single full-width card */}
          <div className="rounded-2xl border border-neutral-200/70 bg-white/90 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
              {/* Weekly bar chart */}
              <div className="w-full lg:w-[52%] border-b border-neutral-100 pb-4 lg:border-b-0 lg:border-r lg:pr-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      This week
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-900">
                      Applications vs interviews
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                    <TrendingUp className="h-3 w-3" />
                    <span>+12% vs last week</span>
                  </span>
                </div>
                <div className="mt-3 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyActivity} barSize={14}>
                      <CartesianGrid vertical={false} stroke="#e5e7eb" />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        allowDecimals={false}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar
                        dataKey="applications"
                        radius={[6, 6, 0, 0]}
                        fill="#0ea5e9"
                      />
                      <Bar
                        dataKey="interviews"
                        radius={[6, 6, 0, 0]}
                        fill="#22c55e"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Conversion line chart */}
              <div className="w-full pt-4 lg:w-[48%] lg:pt-0 lg:pl-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      This month
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-900">
                      Pipeline over weeks
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                    {kpi.monthlyApplications} applications
                  </span>
                </div>
                <div className="mt-3 h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={conversionOverTime}>
                      <CartesianGrid vertical={false} stroke="#e5e7eb" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                      />
                      <YAxis hide />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="applications"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="interviews"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="offers"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROW 2 – Goals & progress (with gamification) + Time metrics & reminders */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)]">
        {/* Goals + gamification */}
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
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-white/80 px-3 py-1 text-xs font-medium text-amber-700 shadow-sm">
                  <Target className="h-3.5 w-3.5" />
                  <span>Goals & progress</span>
                </div>
                <p className="mt-2 text-sm text-neutral-700">
                  Keep your weekly goals visible and see how close you are.
                </p>
              </div>

              {/* Gamification summary */}
              <div className="rounded-xl border border-emerald-100 bg-white/85 px-3 py-2 text-xs shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Flame className="h-3.5 w-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-neutral-900">
                      Streak: {streak.days} day
                      {streak.days === 1 ? "" : "s"} in a row
                    </p>
                    <p className="text-[11px] text-neutral-600">
                      {streak.badge}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Goals list */}
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

            {/* Weekly goal progress – explicit badge message */}
            <div className="rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Weekly goal progress
                  </p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    Goal: {streak.weeklyGoal.target} apps · Progress:{" "}
                    {streak.weeklyGoal.current}/{streak.weeklyGoal.target}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Trophy className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500"
                  style={{
                    width: `${
                      (streak.weeklyGoal.current / streak.weeklyGoal.target) *
                      100
                    }%`,
                  }}
                />
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
        </section>

        {/* Time metrics + Reminder, stacked in one column */}
        <section className="flex flex-col gap-4">
          {/* Time-based metrics */}
          <div
            className={[
              "relative overflow-hidden rounded-2xl border border-neutral-200/70",
              "bg-gradient-to-br from-slate-50 via-white to-sky-50",
              "p-5 shadow-md",
            ].join(" ")}
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-indigo-400/15 blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Time-based metrics
                  </p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    How quickly companies respond
                  </p>
                </div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Clock className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {timeMetrics.map((metric) => {
                  const ratio = Math.min(metric.value / metric.target, 1.4);
                  const isGhosted = metric.id === 3;
                  return (
                    <div
                      key={metric.id}
                      className="rounded-xl border border-neutral-200 bg-white/90 p-3 text-xs shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-neutral-900">
                          {metric.label}
                        </p>
                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                            isGhosted
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700",
                          ].join(" ")}
                        >
                          <span className="font-semibold">
                            {metric.value} days
                          </span>
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={[
                            "h-full rounded-full",
                            isGhosted
                              ? "bg-gradient-to-r from-rose-500 via-amber-500 to-amber-400"
                              : "bg-gradient-to-r from-emerald-500 via-sky-500 to-sky-400",
                          ].join(" ")}
                          style={{ width: `${ratio * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-neutral-600">
                        {metric.hint}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reminder card – directly under time metrics */}
          <div
            className={[
              "relative overflow-hidden rounded-2xl border border-dashed border-neutral-300",
              "bg-gradient-to-br from-white via-slate-50 to-sky-50",
              "p-4 shadow-sm",
            ].join(" ")}
          >
            <div className="pointer-events-none absolute -top-14 -left-10 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                  <Bell className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    Set a follow-up reminder
                  </p>
                  <p className="text-xs text-neutral-600">
                    Keep ghosted applications from slipping through the cracks.
                  </p>
                </div>
              </div>

              <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  className="inline-flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-800 hover:bg-neutral-50"
                >
                  <span>Follow up in 3 days</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-800 hover:bg-neutral-50"
                >
                  <span>Weekly check-in</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-800 hover:bg-neutral-50"
                >
                  <span>Interview prep reminder</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sky-800 hover:bg-sky-100"
                >
                  <span>Custom reminder</span>
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ROW 3 – Upcoming & urgent + Recent activity */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
        {/* Upcoming & urgent interviews */}
        <section
          className={[
            "relative overflow-hidden rounded-2xl border border-emerald-100",
            "bg-gradient-to-br from-emerald-50 via-white to-teal-50",
            "p-5 shadow-md",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Upcoming & urgent
                </p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  Next interviews
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{upcomingInterviews.length} scheduled</span>
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {upcomingInterviews.map((item, index) => (
                <article
                  key={item.id}
                  className={[
                    "group flex items-start gap-3 rounded-xl border bg-white/95 p-3 text-xs shadow-sm backdrop-blur",
                    index === 0
                      ? "border-emerald-200 ring-1 ring-emerald-100"
                      : "border-neutral-200",
                  ].join(" ")}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-semibold text-neutral-900">
                          {item.company}
                        </p>
                        <span className="text-[11px] text-neutral-600">
                          · {item.role}
                        </span>
                      </div>
                      {index === 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <Sparkles className="h-3 w-3" />
                          <span>Next up</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      {item.when} · {item.detail}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-900"
            >
              <span>Open calendar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* Recent activity feed */}
        <section
          className={[
            "relative overflow-hidden rounded-2xl border border-neutral-200/70",
            "bg-gradient-to-br from-white via-slate-50 to-sky-50",
            "p-5 shadow-md",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Recent activity
                </p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  What changed recently
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
                <ListTodo className="h-3.5 w-3.5" />
                <span>Last 7 days</span>
              </span>
            </div>

            <ol className="mt-4 space-y-3 text-sm">
              {recentActivity.map((item, index) => {
                const isFirst = index === 0;
                const dotClasses =
                  item.type === "applied"
                    ? "bg-sky-500"
                    : item.type === "interview"
                    ? "bg-emerald-500"
                    : item.type === "rejected"
                    ? "bg-rose-500"
                    : "bg-amber-500";
                return (
                  <li
                    key={item.id}
                    className="relative flex gap-3 rounded-xl border border-neutral-200 bg-white/95 p-3 shadow-sm"
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={[
                          "mt-1 h-2.5 w-2.5 rounded-full ring-2 ring-white",
                          dotClasses,
                          isFirst ? "scale-110" : "",
                        ].join(" ")}
                      />
                      {index < recentActivity.length - 1 && (
                        <span className="mt-1 h-full w-px flex-1 bg-neutral-200" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[13px] font-medium text-neutral-900">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {item.time}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      </div>

      {/* ROW 4 – Notes + Wishlist */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)]">
        {/* Notes card */}
        <section
          className={[
            "relative overflow-hidden rounded-2xl border border-neutral-200/70",
            "bg-gradient-to-br from-white via-slate-50 to-amber-50",
            "p-5 shadow-md",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute -top-16 -left-20 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Notes
                </p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  Things to remember
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New note</span>
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {notesPreview.map((note) => (
                <article
                  key={note.id}
                  className="rounded-xl border border-neutral-200 bg-white/95 p-3 text-sm shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-neutral-900">
                      {note.title}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                      <Star className="h-3 w-3" />
                      <span>{note.tag}</span>
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-neutral-600">
                    {note.preview}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Wishlist teaser */}
        <section
          className={[
            "relative overflow-hidden rounded-2xl border border-sky-100",
            "bg-gradient-to-br from-sky-50 via-white to-slate-50",
            "p-4 shadow-md",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute -top-14 -right-14 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Wishlist
                </p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  Top dream roles
                </p>
              </div>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <Star className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {wishlistJobs.map((job) => (
                <article
                  key={job.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-neutral-200 bg-white/95 p-3 text-xs shadow-sm"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-neutral-900">
                      {job.role}
                    </p>
                    <p className="mt-0.5 text-[12px] text-neutral-600">
                      {job.company} · {job.location}
                    </p>
                  </div>
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                    <Sparkles className="h-3 w-3" />
                    <span>{job.tag}</span>
                  </span>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky-800 hover:text-sky-900"
            >
              <span>View all wishlist jobs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
