// app/page.tsx
"use client";

import JobSearchOverviewCard from "../components/overview/StatsCard";
import GoalsCard from "../components/overview/GoalsCard";
import NotesOverviewCard from "../components/overview/NotesCard";
import UpcomingCard from "../components/overview/UpcomingCard";
import RecentActivityCard from "../components/overview/RecentActivityCard";

export default function HomePage() {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl border border-neutral-200/80",
        // was: from-slate-50 via-white to-slate-100
        "bg-gradient-to-br from-slate-50 via-white to-indigo-50",
        "p-4 sm:p-6 shadow-lg",
      ].join(" ")}
    >
      {/* background blobs for the HUGE card */}
      {/* was sky + emerald */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

      <div className="relative space-y-6">
        <JobSearchOverviewCard />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)]">
          <GoalsCard />
          <NotesOverviewCard />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
          <UpcomingCard />
          <RecentActivityCard />
        </div>
      </div>
    </section>
  );
}
