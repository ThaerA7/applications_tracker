// app/components/RecentActivityCard.tsx

import { Clock, ListTodo } from "lucide-react";

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
    label:
      "You withdrew your application for React Developer @ BrightLabs",
    time: "5 days ago",
  },
];

export default function RecentActivityCard() {
  return (
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
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
              <ListTodo className="h-3.5 w-3.5" />
              <span>Recent activity</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-neutral-900">
              What changed recently
            </p>
            <p className="mt-1 text-[11px] text-neutral-600">
              Keep recent changes visible so you can quickly see how your
              pipeline is moving.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
            <Clock className="h-3.5 w-3.5" />
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
  );
}
