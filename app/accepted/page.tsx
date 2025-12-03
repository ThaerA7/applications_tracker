// app/accepted/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  PartyPopper,
  Trophy,
  Calendar,
  CalendarDays,
  MapPin,
  ExternalLink,
  Briefcase,
  Trash2,
} from "lucide-react";

type AcceptedJob = {
  id: string;
  company: string;
  role: string;
  location?: string;
  startDate?: string; // e.g. "01 Dec 2025"
  salary?: string;
  url?: string;
  logoUrl?: string;
  notes?: string;

  // new meta fields
  appliedOn?: string; // when you applied (YYYY-MM-DD or free-form)
  decisionDate?: string; // when company responded / offer decision
  employmentType?: string; // e.g. "Ausbildung", "Full-time"
};

const ACCEPTED_STORAGE_KEY = "job-tracker:accepted";

const DEMO_ACCEPTED_JOBS: AcceptedJob[] = [
  {
    id: "a1",
    company: "Acme Corp",
    role: "Frontend Engineer",
    location: "Berlin",
    appliedOn: "2025-10-10",
    decisionDate: "2025-11-01",
    employmentType: "Full-time",
    startDate: "12 Jan 2026",
    salary: "€65,000 / year",
    url: "https://jobs.example/acme/frontend",
    logoUrl: "/logos/acme.svg",
    notes: "You did it! First big frontend role. 🎉",
  },
  {
    id: "a2",
    company: "Globex",
    role: "Mobile Developer (Flutter)",
    location: "Remote",
    appliedOn: "2025-09-25",
    decisionDate: "2025-10-15",
    employmentType: "Ausbildung",
    startDate: "01 Mar 2026",
    salary: "€60,000 / year",
    logoUrl: "/logos/globex.png",
    notes: "Remote-friendly team, strong learning potential.",
  },
];

export default function AcceptedPage() {
  const [items, setItems] = useState<AcceptedJob[]>(DEMO_ACCEPTED_JOBS);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(ACCEPTED_STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        } else {
          window.localStorage.setItem(
            ACCEPTED_STORAGE_KEY,
            JSON.stringify(DEMO_ACCEPTED_JOBS)
          );
          setItems(DEMO_ACCEPTED_JOBS);
        }
      } else {
        window.localStorage.setItem(
          ACCEPTED_STORAGE_KEY,
          JSON.stringify(DEMO_ACCEPTED_JOBS)
        );
        setItems(DEMO_ACCEPTED_JOBS);
      }
    } catch (err) {
      console.error("Failed to load accepted jobs from localStorage", err);
      setItems(DEMO_ACCEPTED_JOBS);
    }
  }, []);

  const totalAccepted = items.length;
  const firstJob = items[0];

  const handleDelete = (id: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Remove this accepted offer from your win board?"
      );
      if (!confirmed) return;
    }

    setItems((prev) => {
      const next = prev.filter((job) => job.id !== id);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            ACCEPTED_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch (err) {
          console.error(
            "Failed to persist accepted jobs after delete",
            err
          );
        }
      }
      return next;
    });
  };

  return (
    <section
      className={[
        "relative rounded-2xl border border-neutral-200/70",
        "bg-gradient-to-br from-emerald-50 via-white to-lime-50",
        "p-8 shadow-md overflow-hidden",
      ].join(" ")}
    >
      {/* cheerful blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-lime-400/20 blur-3xl" />

      {/* header row */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 flex items-center gap-1">
            {/* ✅ icon directly next to the word "Accepted" */}
            <Image
              src="/icons/accepted.png"
              alt="Accepted icon"
              width={37}
              height={37}
              className="shrink-0"
            />
            <span>Accepted 🎉</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-700">
            This is your win board – every card here is a{" "}
            <span className="font-semibold text-emerald-700">
              “Yes, you&apos;re hired!”
            </span>
          </p>
        </div>

        {/* top-right pill removed as requested */}
      </div>

      {/* Cheerful celebration banner rectangle */}
      <div className="mt-6 relative z-10">
        <div
          className={[
            "relative overflow-hidden rounded-xl border border-emerald-100",
            "bg-white/80 px-5 py-4 shadow-sm",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-200/40 blur-2xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-10 h-24 w-24 rounded-full bg-lime-200/40 blur-2xl" />

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <PartyPopper className="h-4 w-4" aria-hidden="true" />
                <span>
                  {totalAccepted === 0
                    ? "Future offer celebration"
                    : "Offer celebration zone"}
                </span>
              </p>

              <p className="mt-1 text-sm text-neutral-800">
                {totalAccepted === 0 && (
                  <>
                    The first “Yes” you get will land here. Until then, every
                    application is training for that moment.
                  </>
                )}
                {totalAccepted === 1 && firstJob && (
                  <>
                    You already turned your effort into a real offer:{" "}
                    <span className="font-semibold">{firstJob.role}</span> at{" "}
                    <span className="font-semibold">{firstJob.company}</span>.
                    This page is the proof you can do it again.
                  </>
                )}
                {totalAccepted > 1 && firstJob && (
                  <>
                    Look at this stack of wins. From{" "}
                    <span className="font-semibold">{firstJob.company}</span> to
                    every card below – each offer is a milestone in your story.
                  </>
                )}
              </p>

              {firstJob && totalAccepted > 0 && (
                <p className="mt-1 text-xs text-neutral-500">
                  Tip: screenshot this page when you doubt yourself – it&apos;s
                  your personal highlight reel.
                </p>
              )}
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              {/* Trophy + dynamic text chip INSIDE the rectangle, replacing the old star chip */}
              <div
                className={[
                  "inline-flex items-center gap-2 rounded-full border border-emerald-100",
                  "bg-emerald-50/90 px-3 py-1.5 text-[11px] font-medium text-emerald-800",
                  "shadow-sm",
                ].join(" ")}
              >
                <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
                <span>
                  {totalAccepted === 0 &&
                    "Your celebration wall is waiting 🎈"}
                  {totalAccepted === 1 &&
                    "1 offer secured – huge step forward."}
                  {totalAccepted > 1 &&
                    `${totalAccepted} offers secured – keep stacking wins.`}
                </span>
              </div>

              <p className="text-[11px] text-neutral-500 max-w-xs text-left sm:text-right">
                Not luck –{" "}
                <span className="font-semibold">
                  consistency, learning, and courage to apply.
                </span>
              </p>
            </div>
          </div>

          {/* bottom border line similar to the left ribbon of the cards */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-emerald-500 via-lime-500 to-amber-400"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* cards grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
        {items.map((item) => (
          <article
            key={item.id}
            className={[
              "group relative flex h-full flex-col rounded-xl border border-emerald-100",
              "bg-white/80 shadow-sm transition-all",
              "hover:-translate-y-0.5 hover:shadow-md",
              // cheerful left ribbon
              "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl",
              "before:bg-gradient-to-b before:from-emerald-500 before:via-lime-500 before:to-amber-400",
              "before:opacity-90",
            ].join(" ")}
          >
            {/* delete button in top-right corner of the card */}
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className={[
                  "inline-flex h-8 w-8 items-center justify-center rounded-full",
                  "border border-emerald-100 bg-white/90 text-neutral-500",
                  "hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
                  "shadow-sm",
                ].join(" ")}
                aria-label="Delete accepted offer"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 px-5 pt-4 pb-5">
              {/* header: logo + company/role */}
              <div className="flex items-start gap-3 pr-8">
                {item.logoUrl ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ring-1 ring-white/60">
                    <Image
                      src={item.logoUrl}
                      alt={`${item.company} logo`}
                      fill
                      sizes="40px"
                      className="object-contain p-1.5"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-emerald-50 text-emerald-600">
                    <Trophy className="h-5 w-5" aria-hidden="true" />
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="max-w-full truncate text-sm font-semibold text-neutral-900">
                    {item.company}
                  </h2>
                  <p className="mt-0.5 text-sm text-neutral-700">
                    {item.role}
                  </p>
                </div>
              </div>

              {/* divider under company + role */}
              <div
                className="mt-3 h-px w-full bg-emerald-100/80"
                role="separator"
                aria-hidden="true"
              />

              {/* meta fields */}
              <dl className="mt-4 space-y-2 text-sm">
                {/* Applied on */}
                {item.appliedOn && (
                  <div className="flex items-center gap-2">
                    <CalendarDays
                      className="h-4 w-4 text-neutral-500"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-xs text-neutral-500">Applied on</dt>
                      <dd className="font-medium text-neutral-900">
                        {item.appliedOn}
                      </dd>
                    </div>
                  </div>
                )}

                {/* Decision date = when company responded */}
                {item.decisionDate && (
                  <div className="flex items-center gap-2">
                    <Calendar
                      className="h-4 w-4 text-emerald-500"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-xs text-neutral-500">
                        Decision date (company)
                      </dt>
                      <dd className="font-medium text-neutral-900">
                        {item.decisionDate}
                      </dd>
                    </div>
                  </div>
                )}

                {/* Start date */}
                {item.startDate && (
                  <div className="flex items-center gap-2">
                    <Calendar
                      className="h-4 w-4 text-neutral-500"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-xs text-neutral-500">Start date</dt>
                      <dd className="font-medium text-neutral-900">
                        {item.startDate}
                      </dd>
                    </div>
                  </div>
                )}

                {/* Employment type: Ausbildung, Full-time, etc. */}
                {item.employmentType && (
                  <div className="flex items-center gap-2">
                    <Briefcase
                      className="h-4 w-4 text-neutral-500"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-xs text-neutral-500">
                        Employment type
                      </dt>
                      <dd className="font-medium text-neutral-900">
                        {item.employmentType}
                      </dd>
                    </div>
                  </div>
                )}

                {/* Location */}
                {item.location && (
                  <div className="flex items-center gap-2">
                    <MapPin
                      className="h-4 w-4 text-neutral-500"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-xs text-neutral-500">Location</dt>
                      <dd className="font-medium text-neutral-900">
                        {item.location}
                      </dd>
                    </div>
                  </div>
                )}

                {/* Salary */}
                {item.salary && (
                  <div className="flex items-center gap-2">
                    <Trophy
                      className="h-4 w-4 text-amber-500"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-xs text-neutral-500">
                        Compensation (approx.)
                      </dt>
                      <dd className="font-medium text-neutral-900">
                        {item.salary}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>

              {item.notes && (
                <p className="mt-3 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 px-3 py-2 text-xs text-neutral-800">
                  {item.notes}
                </p>
              )}
            </div>

            {/* footer: link + encouragement */}
            <div className="border-t border-emerald-100 bg-emerald-50/60 px-5 py-2.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-emerald-900 flex items-center gap-1.5">
                <PartyPopper className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Well done. You earned this. ✨</span>
              </p>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:underline decoration-emerald-300 underline-offset-2"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  <span>View offer</span>
                </a>
              )}
            </div>
          </article>
        ))}

        {items.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-white/80 p-10 text-center backdrop-blur">
            <div className="mb-2 text-5xl">🎉</div>
            <p className="text-sm text-neutral-800 font-medium">
              No accepted offers yet – but you&apos;re on your way.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              When a company says{" "}
              <span className="font-semibold">&quot;Yes&quot;</span>, move that
              offer here and celebrate your progress.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
