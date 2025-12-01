// app/components/UpcomingCard.tsx

import { ArrowRight, CalendarDays, CheckCircle2, Sparkles } from "lucide-react";

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

export default function UpcomingCard() {
  return (
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
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Upcoming & urgent</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-neutral-900">
              Next interviews
            </p>
            <p className="mt-1 text-[11px] text-neutral-600">
              Keep your upcoming interviews visible so you always know what&apos;s
              next and what to prepare for.
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
  );
}
