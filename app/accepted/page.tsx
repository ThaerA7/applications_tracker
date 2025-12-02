// app/accepted/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  PartyPopper,
  Trophy,
  Calendar,
  MapPin,
  Star,
  ExternalLink,
} from "lucide-react";

type AcceptedJob = {
  id: string;
  company: string;
  role: string;
  location?: string;
  startDate?: string; // free-form for now, e.g. "01 Dec 2025"
  salary?: string;
  url?: string;
  logoUrl?: string;
  notes?: string;
};

const ACCEPTED_STORAGE_KEY = "job-tracker:accepted";

const DEMO_ACCEPTED_JOBS: AcceptedJob[] = [
  {
    id: "a1",
    company: "Acme Corp",
    role: "Frontend Engineer",
    location: "Berlin",
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

      {/* small positive summary pill stays the same */}
      <div
        className={[
          "inline-flex items-center gap-2 rounded-full border border-emerald-200",
          "bg-white/80 px-3 py-1.5 text-xs font-medium text-emerald-800",
          "shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70",
        ].join(" ")}
      >
        <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
        <span>
          {totalAccepted === 0
            ? "Your next win is loading…"
            : totalAccepted === 1
            ? "1 role secured – amazing!"
            : `${totalAccepted} roles secured – incredible!`}
        </span>
      </div>
    </div>

      {/* stats row */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3 relative z-10">
        <div className="rounded-xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Accepted roles
            </span>
            <Star className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-neutral-900">
              {totalAccepted}
            </span>
            <span className="text-xs text-neutral-500">
              {totalAccepted === 0
                ? "Your celebration wall is waiting 🎈"
                : "Every card is proof you can do it 💪"}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Biggest win
          </span>
          <p className="mt-2 text-sm text-neutral-800">
            {firstJob ? (
              <>
                <span className="font-semibold">{firstJob.role}</span> at{" "}
                <span className="font-semibold">{firstJob.company}</span>.
                You turned interviews into a real job offer. 🌟
              </>
            ) : (
              <>Your future success story will appear here.</>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Mindset note
          </span>
          <p className="mt-2 text-sm text-neutral-800">
            This page isn&apos;t luck. It&apos;s{" "}
            <span className="font-semibold">consistent effort</span>, learning,
            and courage to apply.
          </p>
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
            ].join(" ")}
          >
            <div className="flex-1 px-5 pt-4 pb-5">
              {/* header: logo + company/role */}
              <div className="flex items-start gap-3">
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

              <dl className="mt-4 space-y-2 text-sm">
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
              When a company says <span className="font-semibold">&quot;Yes&quot;</span>, move
              that offer here and celebrate your progress.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
