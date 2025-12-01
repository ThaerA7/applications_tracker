// app/components/JobSearchOverviewCard.tsx

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
  CalendarDays,
  Clock,
  FileText,
  ListChecks,
  Plus,
  TrendingUp,
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

export default function JobSearchOverviewCard() {
  return (
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

          {/* Quick actions */}
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

        {/* KPIs */}
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

        {/* Charts row */}
        <div className="rounded-2xl border border-neutral-200/70 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
            {/* Weekly bar chart */}
            <div className="w-full border-b border-neutral-100 pb-4 lg:w-[52%] lg:border-b-0 lg:border-r lg:pr-4">
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
            <div className="w-full pt-4 lg:w-[48%] lg:pl-4 lg:pt-0">
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
  );
}
