"use client";

// app/components/StatsCard.tsx

import { useEffect, useMemo, useState } from "react";
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
  ListChecks,
  Plus,
  TrendingUp,
} from "lucide-react";

import {
  AddNoteDialog,
  upsertNoteToStorage,
} from "@/components/overview/NotesCard";

// ✅ Dialogs
import AddApplicationDialog, {
  type NewApplicationForm,
} from "@/components/dialogs/AddApplicationDialog";
import ScheduleInterviewDialog from "@/components/dialogs/ScheduleInterviewDialog";
import MoveToRejectedDialog, {
  type RejectionDetails,
} from "@/components/dialogs/MoveToRejectedDialog";
import MoveToWithdrawnDialog, {
  type WithdrawnDetails,
} from "@/components/dialogs/MoveToWithdrawnDialog";
import MoveToAcceptedDialog, {
  type AcceptedDetails,
} from "@/components/dialogs/MoveToAcceptedDialog";

/**
 * Storage keys
 * We keep some fallback keys for resilience.
 */
const APPLICATIONS_KEYS = [
  "job-tracker:applied",
  "job-tracker:applications",
] as const;

const INTERVIEWS_STORAGE_KEY = "job-tracker:interviews";
const REJECTIONS_STORAGE_KEY = "job-tracker:rejected";
const WITHDRAWN_STORAGE_KEY = "job-tracker:withdrawn";
const OFFERS_RECEIVED_STORAGE_KEY = "job-tracker:offers-received";
const LEGACY_ACCEPTED_STORAGE_KEY = "job-tracker:accepted";

/**
 * Lightweight shapes for analytics
 */
type AnyRecord = Record<string, any>;

type OfferReceivedJobLike = {
  id: string;
  company: string;
  role: string;
  location?: string;
  appliedOn?: string;
  employmentType?: string;
  offerReceivedDate?: string;
  decisionDate?: string;
  offerAcceptedDate?: string;
  offerDeclinedDate?: string;
  taken?: boolean;
  startDate?: string;
  salary?: string;
  url?: string;
  logoUrl?: string;
  notes?: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const tooltipStyle = {
  backgroundColor: "rgba(255,255,255,0.96)",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
  fontSize: 12,
  padding: "8px 10px",
};

/**
 * Safe localStorage read
 */
function readList<T = AnyRecord>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T = AnyRecord>(key: string, list: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to write list", key, err);
  }
}

function pickApplicationsWriteKey() {
  if (typeof window === "undefined") return APPLICATIONS_KEYS[0];
  for (const k of APPLICATIONS_KEYS) {
    const arr = readList(k);
    if (arr.length > 0) return k;
  }
  return APPLICATIONS_KEYS[0];
}

/**
 * Parse date-like strings robustly.
 */
function toDate(input?: string | null): Date | null {
  if (!input) return null;

  const d = new Date(input);
  if (!Number.isNaN(d.getTime())) return d;

  const [datePart] = String(input).split("T");
  const [y, m, day] = datePart.split("-").map((n) => Number(n));
  if (!y || !m || !day) return null;
  const manual = new Date(y, m - 1, day);
  return Number.isNaN(manual.getTime()) ? null : manual;
}

/**
 * Monday-based week helpers
 */
function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const jsDay = d.getDay();
  const mondayIndex = (jsDay + 6) % 7;
  d.setDate(d.getDate() - mondayIndex);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isWithinRange(d: Date, start: Date, endExclusive: Date) {
  return d.getTime() >= start.getTime() && d.getTime() < endExclusive.getTime();
}

function getMondayWeekdayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

/**
 * Extract "applied" date across lists
 */
function getAppliedDateFromRecord(r: AnyRecord): string | undefined {
  return r.appliedOn || r.appliedDate || r.applied_date || undefined;
}

/**
 * Offers normalization
 */
function normalizeOffers(list: OfferReceivedJobLike[]) {
  return list.map((j) => {
    const offerReceivedDate = j.offerReceivedDate ?? j.decisionDate ?? undefined;

    const offerAcceptedDate =
      j.offerAcceptedDate && String(j.offerAcceptedDate).trim() !== ""
        ? j.offerAcceptedDate
        : undefined;

    const offerDeclinedDate =
      j.offerDeclinedDate && String(j.offerDeclinedDate).trim() !== ""
        ? j.offerDeclinedDate
        : undefined;

    const finalAccepted = offerAcceptedDate;
    const finalDeclined = finalAccepted ? undefined : offerDeclinedDate;

    const taken = finalAccepted ? true : Boolean(j.taken);

    return {
      ...j,
      offerReceivedDate,
      offerAcceptedDate: finalAccepted,
      offerDeclinedDate: finalDeclined,
      taken,
    };
  });
}

/**
 * Build weekly activity for current week
 */
function buildWeeklyActivity(params: {
  now: Date;
  applied: AnyRecord[];
  interviews: AnyRecord[];
  rejected: AnyRecord[];
  withdrawn: AnyRecord[];
  offers: OfferReceivedJobLike[];
}) {
  const { now, applied, interviews, rejected, withdrawn, offers } = params;

  const weekStart = startOfWeekMonday(now);
  const weekEnd = addDays(weekStart, 7);

  const rows = WEEKDAYS.map((day) => ({
    day,
    applications: 0,
    interviews: 0,
  }));

  const allForAppliedDate = [
    ...applied,
    ...interviews,
    ...rejected,
    ...withdrawn,
    ...offers,
  ];

  for (const r of allForAppliedDate) {
    const appliedStr = getAppliedDateFromRecord(r);
    const d = toDate(appliedStr);
    if (!d) continue;

    if (isWithinRange(d, weekStart, weekEnd)) {
      const idx = getMondayWeekdayIndex(d);
      rows[idx].applications += 1;
    }
  }

  for (const i of interviews) {
    const d = toDate(i.date);
    if (!d) continue;

    if (isWithinRange(d, weekStart, weekEnd)) {
      const idx = getMondayWeekdayIndex(d);
      rows[idx].interviews += 1;
    }
  }

  return rows;
}

/**
 * Build month buckets
 */
function getMonthWeekBucket(dayOfMonth: number) {
  if (dayOfMonth <= 7) return 0;
  if (dayOfMonth <= 14) return 1;
  if (dayOfMonth <= 21) return 2;
  return 3;
}

function buildConversionOverTime(params: {
  now: Date;
  applied: AnyRecord[];
  interviews: AnyRecord[];
  rejected: AnyRecord[];
  withdrawn: AnyRecord[];
  offers: OfferReceivedJobLike[];
}) {
  const { now, applied, interviews, rejected, withdrawn, offers } = params;

  const year = now.getFullYear();
  const month = now.getMonth();

  const buckets = [
    { label: "Week 1", applications: 0, interviews: 0, offers: 0 },
    { label: "Week 2", applications: 0, interviews: 0, offers: 0 },
    { label: "Week 3", applications: 0, interviews: 0, offers: 0 },
    { label: "Week 4", applications: 0, interviews: 0, offers: 0 },
  ];

  const allForAppliedDate = [
    ...applied,
    ...interviews,
    ...rejected,
    ...withdrawn,
    ...offers,
  ];

  for (const r of allForAppliedDate) {
    const appliedStr = getAppliedDateFromRecord(r);
    const d = toDate(appliedStr);
    if (!d) continue;

    if (d.getFullYear() === year && d.getMonth() === month) {
      const bucket = getMonthWeekBucket(d.getDate());
      buckets[bucket].applications += 1;
    }
  }

  for (const i of interviews) {
    const d = toDate(i.date);
    if (!d) continue;

    if (d.getFullYear() === year && d.getMonth() === month) {
      const bucket = getMonthWeekBucket(d.getDate());
      buckets[bucket].interviews += 1;
    }
  }

  for (const o of offers) {
    const d = toDate(o.offerReceivedDate) || toDate(o.decisionDate) || null;
    if (!d) continue;

    if (d.getFullYear() === year && d.getMonth() === month) {
      const bucket = getMonthWeekBucket(d.getDate());
      buckets[bucket].offers += 1;
    }
  }

  return buckets;
}

function countAppliedInRange(
  records: AnyRecord[],
  offers: OfferReceivedJobLike[],
  start: Date,
  endExclusive: Date
) {
  const all = [...records, ...offers];
  let count = 0;

  for (const r of all) {
    const appliedStr = getAppliedDateFromRecord(r);
    const d = toDate(appliedStr);
    if (!d) continue;
    if (isWithinRange(d, start, endExclusive)) count += 1;
  }

  return count;
}

/**
 * ID helper
 */
function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}`;
}

export default function StatsCard() {
  const [applied, setApplied] = useState<AnyRecord[]>([]);
  const [interviews, setInterviews] = useState<AnyRecord[]>([]);
  const [rejected, setRejected] = useState<AnyRecord[]>([]);
  const [withdrawn, setWithdrawn] = useState<AnyRecord[]>([]);
  const [offers, setOffers] = useState<OfferReceivedJobLike[]>([]);

  // ✅ Quick-add dialog state
  const [openAddApp, setOpenAddApp] = useState(false);
  const [openAddInterview, setOpenAddInterview] = useState(false);
  const [openAddRejected, setOpenAddRejected] = useState(false);
  const [openAddWithdrawn, setOpenAddWithdrawn] = useState(false);
  const [openAddOffer, setOpenAddOffer] = useState(false);
  const [openAddNote, setOpenAddNote] = useState(false);

  // Load all data on mount + react to storage changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const load = () => {
      const a1 = readList(APPLICATIONS_KEYS[0]);
      const a2 = readList(APPLICATIONS_KEYS[1]);
      const appliedList = a1.length ? a1 : a2;

      const interviewsList = readList(INTERVIEWS_STORAGE_KEY);
      const rejectedList = readList(REJECTIONS_STORAGE_KEY);
      const withdrawnList = readList(WITHDRAWN_STORAGE_KEY);

      const offersNew = readList<OfferReceivedJobLike>(
        OFFERS_RECEIVED_STORAGE_KEY
      );
      const offersLegacy = readList<OfferReceivedJobLike>(
        LEGACY_ACCEPTED_STORAGE_KEY
      );

      const normalizedOffers = normalizeOffers(
        offersNew.length > 0 ? offersNew : offersLegacy
      );

      setApplied(appliedList);
      setInterviews(interviewsList);
      setRejected(rejectedList);
      setWithdrawn(withdrawnList);
      setOffers(normalizedOffers);
    };

    load();

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;

      const watched = new Set<string>([
        ...APPLICATIONS_KEYS,
        INTERVIEWS_STORAGE_KEY,
        REJECTIONS_STORAGE_KEY,
        WITHDRAWN_STORAGE_KEY,
        OFFERS_RECEIVED_STORAGE_KEY,
        LEGACY_ACCEPTED_STORAGE_KEY,
      ]);

      if (watched.has(e.key)) load();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const now = useMemo(() => new Date(), []);

  const weeklyActivity = useMemo(
    () =>
      buildWeeklyActivity({
        now,
        applied,
        interviews,
        rejected,
        withdrawn,
        offers,
      }),
    [now, applied, interviews, rejected, withdrawn, offers]
  );

  const conversionOverTime = useMemo(
    () =>
      buildConversionOverTime({
        now,
        applied,
        interviews,
        rejected,
        withdrawn,
        offers,
      }),
    [now, applied, interviews, rejected, withdrawn, offers]
  );

  const kpi = useMemo(() => {
    const totalApplied = applied.length;
    const totalInterviews = interviews.length;
    const totalRejected = rejected.length;
    const totalWithdrawn = withdrawn.length;
    const totalOffers = offers.length;

    const totalApplications =
      totalApplied +
      totalInterviews +
      totalOffers +
      totalRejected +
      totalWithdrawn;

    const responded = totalInterviews + totalRejected + totalOffers;

    const responseRate =
      totalApplications > 0
        ? Math.round((responded / totalApplications) * 100)
        : 0;

    const interviewRate =
      totalApplications > 0
        ? Math.round((totalInterviews / totalApplications) * 100)
        : 0;

    const weekStart = startOfWeekMonday(now);
    const weekEnd = addDays(weekStart, 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    monthEnd.setHours(0, 0, 0, 0);

    const allRecordsForApplied = [
      ...applied,
      ...interviews,
      ...rejected,
      ...withdrawn,
    ];

    const weeklyApplications = countAppliedInRange(
      allRecordsForApplied,
      offers,
      weekStart,
      weekEnd
    );

    const monthlyApplications = countAppliedInRange(
      allRecordsForApplied,
      offers,
      monthStart,
      monthEnd
    );

    return {
      totalApplications,
      totalInterviews,
      totalOffers,
      totalRejected,
      totalWithdrawn,
      responseRate,
      interviewRate,
      weeklyApplications,
      monthlyApplications,
    };
  }, [now, applied, interviews, rejected, withdrawn, offers]);

  // ✅ Save handlers for quick-add dialogs

  const handleQuickSaveApplication = (data: NewApplicationForm) => {
    const key = pickApplicationsWriteKey();
    const existing = readList<AnyRecord>(key);

    const item = {
      id: makeId(),
      ...data,
      offerUrl: data.offerUrl,
    };

    writeList(key, [item, ...existing]);
    setApplied([item, ...existing]);
    setOpenAddApp(false);
  };

  const handleQuickSaveRejected = (details: RejectionDetails) => {
    const existing = readList<AnyRecord>(REJECTIONS_STORAGE_KEY);

    const item = {
      id: makeId(),
      ...details,
      appliedOn: details.appliedDate,
      offerUrl: details.url,
      contactPerson: details.contactName,
      contactEmail: details.contactEmail,
      contactPhone: details.contactPhone,
    };

    writeList(REJECTIONS_STORAGE_KEY, [item, ...existing]);
    setRejected([item, ...existing]);
  };

  const handleQuickSaveWithdrawn = (details: WithdrawnDetails) => {
    const existing = readList<AnyRecord>(WITHDRAWN_STORAGE_KEY);

    const item = {
      id: makeId(),
      ...details,
      appliedOn: details.appliedDate,
      offerUrl: details.url,
      contactPerson: details.contactName,
      contactEmail: details.contactEmail,
      contactPhone: details.contactPhone,
    };

    writeList(WITHDRAWN_STORAGE_KEY, [item, ...existing]);
    setWithdrawn([item, ...existing]);
  };

  const handleQuickSaveOffer = (details: AcceptedDetails) => {
    const existing = readList<OfferReceivedJobLike>(OFFERS_RECEIVED_STORAGE_KEY);

    const item: OfferReceivedJobLike = normalizeOffers([
      {
        id: makeId(),
        company: details.company,
        role: details.role,
        location: details.location,
        appliedOn: details.appliedOn,
        employmentType: details.employmentType,
        offerReceivedDate: details.offerReceivedDate ?? details.decisionDate,
        decisionDate: details.decisionDate,
        offerAcceptedDate: details.offerAcceptedDate,
        startDate: details.startDate,
        salary: details.salary,
        url: details.url,
        logoUrl: details.logoUrl,
        notes: details.notes,
        taken: details.offerAcceptedDate ? true : undefined,
      },
    ])[0];

    writeList(OFFERS_RECEIVED_STORAGE_KEY, [item, ...existing]);
    setOffers([item, ...existing]);
  };

  const quickActions = [
    { label: "Add application", onClick: () => setOpenAddApp(true) },
    { label: "Add interview", onClick: () => setOpenAddInterview(true) },
    { label: "Add rejected app", onClick: () => setOpenAddRejected(true) },
    { label: "Add withdrawn app", onClick: () => setOpenAddWithdrawn(true) },
    { label: "Add offer", onClick: () => setOpenAddOffer(true) },
    { label: "Add note", onClick: () => setOpenAddNote(true) },
  ] as const;

  return (
    <>
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

            {/* Quick actions – styled like Notes/Upcoming pills */}
            <div className="flex flex-wrap items-center gap-2">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.onClick}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border border-emerald-100",
                    "bg-white/80 px-2.5 py-1 text-[11px] font-medium text-emerald-700 shadow-sm",
                    "hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
                  ].join(" ")}
                  aria-label={a.label}
                  title={a.label}
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  <span>{a.label}</span>
                </button>
              ))}
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
                  {kpi.totalOffers} offer{kpi.totalOffers === 1 ? "" : "s"}
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

          <div className="grid grid-cols-1 divide-y divide-neutral-100 lg:grid-cols-2 lg:divide-y-0 lg:divide-x">
  {/* Weekly bar chart */}
  <div className="pb-4 lg:pb-0 lg:pr-4">
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
        <span>Live from your boards</span>
      </span>
    </div>

    {/* ✅ Same height as the other chart */}
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
          width={18}
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
  <div className="pt-4 lg:pt-0 lg:pl-4">
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

    {/* ✅ Match height to bar chart */}
    <div className="mt-3 h-32">
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
      </section>

      {/* ========================= */}
      {/* ✅ QUICK ADD DIALOGS */}
      {/* ========================= */}

      <AddApplicationDialog
        open={openAddApp}
        onClose={() => setOpenAddApp(false)}
        onSave={handleQuickSaveApplication}
        initialData={null}
      />

      <ScheduleInterviewDialog
        open={openAddInterview}
        onClose={() => setOpenAddInterview(false)}
        application={null}
        mode="add"
      />

      <MoveToRejectedDialog
        open={openAddRejected}
        onClose={() => setOpenAddRejected(false)}
        application={null}
        mode="add"
        onRejectionCreated={handleQuickSaveRejected}
      />

      <MoveToWithdrawnDialog
        open={openAddWithdrawn}
        onClose={() => setOpenAddWithdrawn(false)}
        application={null}
        mode="add"
        onWithdrawnCreated={handleQuickSaveWithdrawn}
      />

      <MoveToAcceptedDialog
        open={openAddOffer}
        onClose={() => setOpenAddOffer(false)}
        application={null}
        mode="add"
        onAcceptedCreated={handleQuickSaveOffer}
      />

      {/* ✅ Add note WITHOUT navigating to Notes page */}
      <AddNoteDialog
        open={openAddNote}
        onClose={() => setOpenAddNote(false)}
        initialNote={null}
        onSave={(payload) => {
          upsertNoteToStorage(payload);
        }}
      />
    </>
  );
}
