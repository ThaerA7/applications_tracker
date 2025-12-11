// app/interviews/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ComponentProps,
} from "react";
import {
  Search,
  Plus,
  PhoneCall,
  Video,
  Users,
  History,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import ScheduleInterviewDialog, {
  type Interview,
  type InterviewType,
} from "../../components/dialogs/ScheduleInterviewDialog";
import MoveApplicationDialog from "../../components/dialogs/MoveApplicationDialog";
import type { RejectionDetails } from "../../components/dialogs/MoveToRejectedDialog";
import type { WithdrawnDetails } from "../../components/dialogs/MoveToWithdrawnDialog";
import type { AcceptedDetails } from "../../components/dialogs/MoveToAcceptedDialog";
import InterviewCard, {
  type InterviewWithStage,
} from "./InterviewCard";
import { animateCardExit } from "../../components/dialogs/cardExitAnimation";

import ActivityLogSidebar, {
  type ActivityItem,
  type ActivityType,
} from "@/components/ActivityLogSidebar";

import InterviewsFilter, {
  DEFAULT_INTERVIEW_FILTERS,
  filterInterviews,
  type InterviewFilters,
} from "@/components/InterviewsFilter";

const INTERVIEWS_STORAGE_KEY = "job-tracker:interviews";
const REJECTIONS_STORAGE_KEY = "job-tracker:rejected";
const WITHDRAWN_STORAGE_KEY = "job-tracker:withdrawn";
const INTERVIEWS_ACTIVITY_STORAGE_KEY = "job-tracker:interviews-activity";
const REJECTIONS_ACTIVITY_STORAGE_KEY = "job-tracker:rejected-activity";
const WITHDRAWN_ACTIVITY_STORAGE_KEY = "job-tracker:withdrawn-activity";
const ACCEPTED_STORAGE_KEY = "job-tracker:accepted";

type ApplicationLike = ComponentProps<
  typeof ScheduleInterviewDialog
>["application"];

type MoveDialogApplication = ComponentProps<
  typeof MoveApplicationDialog
>["application"];

type RejectionRecord = RejectionDetails & { id: string };

type WithdrawnRecord = {
  id: string;
  company: string;
  role: string;
  location?: string;
  appliedOn?: string;
  employmentType?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  url?: string;
  logoUrl?: string;
  interviewDate?: string;
  interviewType?: InterviewType;
  notes?: string;
  withdrawnDate?: string;
  withdrawnReason?: WithdrawnDetails["reason"];
};

type AcceptedRecord = {
  id: string;
  company: string;
  role: string;
  location?: string;
  appliedOn?: string;
  employmentType?: string;
  decisionDate?: string;
  startDate?: string;
  salary?: string;
  url?: string;
  logoUrl?: string;
  notes?: string;
};

type InterviewStage = "upcoming" | "past" | "done";

const STAGE_FILTERS: {
  id: InterviewStage;
  label: string;
  shortLabel: string;
  icon: ComponentType<any>;
}[] = [
  {
    id: "upcoming",
    label: "Upcoming interviews",
    shortLabel: "Upcoming",
    icon: Calendar,
  },
  {
    id: "past",
    label: "Interviews with passed dates",
    shortLabel: "Passed",
    icon: History,
  },
  {
    id: "done",
    label: "Done • waiting for answer",
    shortLabel: "Done",
    icon: CheckCircle2,
  },
];

const INTERVIEW_TYPE_META: Record<
  InterviewType,
  { label: string; Icon: ComponentType<any> }
> = {
  phone: { label: "Phone screening", Icon: PhoneCall },
  video: { label: "Video call", Icon: Video },
  "in-person": { label: "In person", Icon: Users },
};

// Initial demo data (used only if localStorage is empty)
const DEMO_INTERVIEWS: InterviewWithStage[] = [
  {
    id: "1",
    company: "Acme Corp",
    role: "Frontend Engineer",
    location: "Berlin",
    contact: { name: "Julia Meyer", email: "j.meyer@acme.example" },
    date: "2025-11-12T14:00",
    type: "video",
    url: "https://jobs.example/acme/frontend",
    logoUrl: "/logos/acme.svg",
    employmentType: "Full-time",
    notes: "Prepare system design questions and review React hooks.",
    stage: "upcoming",
  },
  {
    id: "2",
    company: "Globex",
    role: "Mobile Developer (Flutter)",
    location: "Remote",
    contact: { name: "HR Team" },
    date: "2025-11-15T10:30",
    type: "phone",
    logoUrl: "/logos/globex.png",
    employmentType: "Full-time",
    notes: "Phone screen with HR – ask about team structure.",
    stage: "upcoming",
  },
  {
    id: "3",
    company: "Initech",
    role: "Full-Stack Developer",
    location: "Munich HQ",
    contact: { name: "Samir", email: "samir@initech.example" },
    date: "2025-11-20T09:15",
    type: "in-person",
    url: "https://initech.example/careers/123",
    logoUrl: "/logos/initech.svg",
    employmentType: "Full-time",
    notes: "Onsite: bring printed CV, prepare examples for past projects.",
    stage: "upcoming",
  },
];

// --- Pure, deterministic date formatting for display (no Date/Intl) ---

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function getWeekday(year: number, month: number, day: number): string {
  // Tomohiko Sakamoto's algorithm
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  let m = month;
  if (m < 3) y -= 1;
  const w =
    (y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) +
      t[m - 1] +
      day) %
    7;
  return WEEKDAYS[(w + 7) % 7];
}

function formatDateTime(iso: string) {
  if (!iso) return { date: "", time: "" };

  const [datePart, timePartRaw] = iso.split("T");
  if (!datePart) return { date: "", time: "" };

  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!year || !month || !day) {
    return {
      date: iso,
      time: timePartRaw ? timePartRaw.slice(0, 5) : "",
    };
  }

  const weekday = getWeekday(year, month, day);
  const monthName = MONTHS_SHORT[month - 1] ?? String(month).padStart(2, "0");
  const date = `${weekday}, ${String(day).padStart(
    2,
    "0"
  )} ${monthName} ${year}`;
  const time = timePartRaw ? timePartRaw.slice(0, 5) : "";

  return { date, time };
}

// --- Helpers for countdown / countup (client-only via `now`) ---

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseToUtcMidnight(dateLike: string): number | null {
  if (!dateLike) return null;
  const [datePart] = dateLike.split("T");
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

function getInterviewCountdownLabel(
  interviewIso: string,
  nowMs: number | null
): string | null {
  if (!nowMs) return null;
  const interviewDay = parseToUtcMidnight(interviewIso);
  if (interviewDay == null) return null;

  const today = getTodayUtcMidnight(nowMs);
  const diffDays = Math.round((interviewDay - today) / MS_PER_DAY);

  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays === 1) return "in 1 day";
  if (diffDays === 0) return "today";
  if (diffDays === -1) return "1 day ago";
  return `${Math.abs(diffDays)} days ago`;
}

function getAppliedCountupLabel(
  appliedDate: string | undefined,
  nowMs: number | null
): string | null {
  if (!nowMs || !appliedDate) return null;
  const appliedDay = parseToUtcMidnight(appliedDate);
  if (appliedDay == null) return null;

  const today = getTodayUtcMidnight(nowMs);
  const diffDays = Math.round((today - appliedDay) / MS_PER_DAY);

  if (diffDays < 0) return null; // future applied date, ignore
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function makeId(existingLength: number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${existingLength}`;
}

const makeActivityId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function appendRejectedActivity(entry: ActivityItem) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(REJECTIONS_ACTIVITY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const prev: ActivityItem[] = Array.isArray(parsed) ? parsed : [];
    const next = [entry, ...prev].slice(0, 100);
    window.localStorage.setItem(
      REJECTIONS_ACTIVITY_STORAGE_KEY,
      JSON.stringify(next)
    );
  } catch (err) {
    console.error("Failed to persist rejected activity from interviews", err);
  }
}

function appendWithdrawnActivity(entry: ActivityItem) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(WITHDRAWN_ACTIVITY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const prev: ActivityItem[] = Array.isArray(parsed) ? parsed : [];
    const next = [entry, ...prev].slice(0, 100);
    window.localStorage.setItem(
      WITHDRAWN_ACTIVITY_STORAGE_KEY,
      JSON.stringify(next)
    );
  } catch (err) {
    console.error("Failed to persist withdrawn activity from interviews", err);
  }
}

function inferStageFromDate(iso: string | undefined | null): InterviewStage {
  if (!iso) return "upcoming";
  const timeMs = Date.parse(iso);
  if (Number.isNaN(timeMs)) return "upcoming";
  return timeMs < Date.now() ? "past" : "upcoming";
}

function ensureInterviewStage(
  interview: Interview | InterviewWithStage
): InterviewWithStage {
  const withAnyStage = interview as InterviewWithStage;
  if (withAnyStage.stage) {
    return withAnyStage;
  }
  return {
    ...interview,
    stage: inferStageFromDate((interview as Interview).date),
  };
}

// --- Component ---

export default function InterviewsPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<InterviewWithStage[]>(DEMO_INTERVIEWS);
  const [stageFilter, setStageFilter] = useState<InterviewStage>("upcoming");
  const [filters, setFilters] = useState<InterviewFilters>(
    DEFAULT_INTERVIEW_FILTERS
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogApplication, setDialogApplication] =
    useState<ApplicationLike>(null);
  const [editingInterview, setEditingInterview] =
    useState<InterviewWithStage | null>(null);

  // For countdown / countup, only on client to avoid hydration issues
  const [now, setNow] = useState<number | null>(null);

  // Delete confirmation dialog target
  const [deleteTarget, setDeleteTarget] = useState<InterviewWithStage | null>(
    null
  );

  // Move dialog state (reusing MoveApplicationDialog)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveDialogApplication, setMoveDialogApplication] =
    useState<MoveDialogApplication>(null);
  const [moveTargetInterview, setMoveTargetInterview] =
    useState<InterviewWithStage | null>(null);

  // Activity log state for interviews
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

  // Helper to log interview activity (also persists to localStorage)
  const logActivity = (
    type: ActivityType,
    interview: InterviewWithStage | null,
    extras?: Partial<ActivityItem>
  ) => {
    if (!interview) return;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const timestamp = new Date().toISOString();

    const base: ActivityItem = {
      id,
      appId: interview.id,
      type,
      timestamp,
      company: interview.company,
      role: interview.role,
      location: interview.location,
      appliedOn: interview.appliedOn,
      ...extras,
    };

    setActivityItems((prev) => {
      const next = [base, ...prev].slice(0, 100);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            INTERVIEWS_ACTIVITY_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch (err) {
          console.error("Failed to persist interview activity log", err);
        }
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setNow(Date.now());
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000); // update every minute
    return () => window.clearInterval(id);
  }, []);

  // Load interviews + activity log from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(INTERVIEWS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const withStages: InterviewWithStage[] = parsed.map((item: any) =>
            ensureInterviewStage(item as Interview)
          );
          setItems(withStages);
        } else {
          setItems(DEMO_INTERVIEWS);
        }
      } else {
        window.localStorage.setItem(
          INTERVIEWS_STORAGE_KEY,
          JSON.stringify(DEMO_INTERVIEWS)
        );
        setItems(DEMO_INTERVIEWS);
      }
    } catch (err) {
      console.error("Failed to load interviews from localStorage", err);
      setItems(DEMO_INTERVIEWS);
    }

    try {
      const rawActivity = window.localStorage.getItem(
        INTERVIEWS_ACTIVITY_STORAGE_KEY
      );
      if (rawActivity) {
        const parsed = JSON.parse(rawActivity);
        if (Array.isArray(parsed)) {
          setActivityItems(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to load interview activity log", err);
    }
  }, []);

  const handleAdd = () => {
    setEditingInterview(null);
    setDialogApplication(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: InterviewWithStage) => {
    const app: ApplicationLike = {
      id: item.id,
      company: item.company,
      role: item.role,
      location: item.location,
      contactPerson: item.contact?.name,
      contactEmail: item.contact?.email,
      contactPhone: item.contact?.phone,
      offerUrl: item.url,
      logoUrl: item.logoUrl,
      appliedOn: item.appliedOn,
      employmentType: item.employmentType,
      notes: item.notes ?? "",
      interviewDateTimeIso: item.date,
      interviewType: item.type,
    };

    setEditingInterview(item);
    setDialogApplication(app);
    setDialogOpen(true);
  };

  const handleMove = (item: InterviewWithStage) => {
    const app: MoveDialogApplication = {
      id: item.id,
      company: item.company,
      role: item.role,
      location: item.location,
      status: "Interview",
      appliedOn: item.appliedOn ?? "",
      contactPerson: item.contact?.name,
      contactEmail: item.contact?.email,
      contactPhone: item.contact?.phone,
      offerUrl: item.url,
      logoUrl: item.logoUrl,
      employmentType: item.employmentType,
      notes: item.notes,
    };

    setMoveTargetInterview(item);
    setMoveDialogApplication(app);
    setMoveDialogOpen(true);
  };

  const handleMoveDialogClose = () => {
    setMoveDialogOpen(false);
    setMoveDialogApplication(null);
    setMoveTargetInterview(null);
  };

  const openDeleteDialog = (item: InterviewWithStage) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    // log before removing
    logActivity("deleted", deleteTarget, {
      fromStatus: "Interview",
      note: "Interview deleted",
    });

    const id = deleteTarget.id;
    const elementId = `interview-card-${id}`;

    animateCardExit(elementId, "delete", () => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              INTERVIEWS_STORAGE_KEY,
              JSON.stringify(next)
            );
          } catch (err) {
            console.error("Failed to persist interviews after delete", err);
          }
        }
        return next;
      });

      setDeleteTarget(null);
    });
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingInterview(null);
    setDialogApplication(null);
  };

  const handleInterviewCreated = (created: Interview) => {
    const createdWithStage: InterviewWithStage = editingInterview
      ? { ...created, stage: editingInterview.stage }
      : ensureInterviewStage(created);

    setItems((prev) => {
      let next: InterviewWithStage[];
      if (editingInterview) {
        // Replace existing interview by id
        next = prev.map((item) =>
          item.id === editingInterview.id ? createdWithStage : item
        );
      } else {
        // Add new interview
        next = [...prev, createdWithStage];
      }

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            INTERVIEWS_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch (err) {
          console.error("Failed to persist interviews after create/edit", err);
        }
      }

      return next;
    });

    // activity
    if (editingInterview) {
      logActivity("edited", createdWithStage, {
        note: "Interview updated",
      });
    } else {
      logActivity("added", createdWithStage, {
        note: "Interview scheduled",
      });
    }

    setDialogOpen(false);
    setEditingInterview(null);
    setDialogApplication(null);
  };

  const handleStageChange = (interviewId: string, newStage: InterviewStage) => {
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === interviewId ? { ...item, stage: newStage } : item
      );

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            INTERVIEWS_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch (err) {
          console.error("Failed to persist interviews after stage change", err);
        }
      }

      const target = next.find((item) => item.id === interviewId) || null;
      if (target) {
        logActivity("edited", target, {
          note:
            newStage === "done"
              ? "Marked as done – waiting for answer"
              : newStage === "past"
              ? "Marked as interview with passed date"
              : "Marked as upcoming interview",
        });
      }

      return next;
    });
  };

  const handleMoveToRejectedFromInterviews = (details: RejectionDetails) => {
    const source = moveTargetInterview;
    let newItem: RejectionRecord | null = null;

    // 1) Append to rejected storage
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(REJECTIONS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const prev: RejectionRecord[] = Array.isArray(parsed) ? parsed : [];

        newItem = {
          id: makeId(prev.length),
          ...details,
        };

        const nextRejected = [...prev, newItem];
        window.localStorage.setItem(
          REJECTIONS_STORAGE_KEY,
          JSON.stringify(nextRejected)
        );
      } catch (err) {
        console.error(
          "Failed to persist rejected application from interview",
          err
        );
      }
    }

    // 1b) Also log into Rejected activity log
    if (newItem) {
      appendRejectedActivity({
        id: makeActivityId(),
        appId: newItem.id,
        type: "moved_to_rejected",
        timestamp: new Date().toISOString(),
        company: newItem.company,
        role: newItem.role,
        location: newItem.location,
        appliedOn: newItem.appliedDate,
        fromStatus: "Interview",
        toStatus: "Rejected",
        note: newItem.notes,
      });
    }

    // 2) log move in Interviews activity
    if (source) {
      logActivity("moved_to_rejected", source, {
        fromStatus: "Interview",
        toStatus: "Rejected",
        note: (details as any).reason || "Moved to rejected",
      });
    }

    // 3) Remove from interviews with animation
    if (source) {
      const sourceId = source.id;
      const elementId = `interview-card-${sourceId}`;

      animateCardExit(elementId, "move", () => {
        setItems((prev) => {
          const next = prev.filter((i) => i.id !== sourceId);
          if (typeof window !== "undefined") {
            try {
              window.localStorage.setItem(
                INTERVIEWS_STORAGE_KEY,
                JSON.stringify(next)
              );
            } catch (err) {
              console.error(
                "Failed to persist interviews after moving to rejected",
                err
              );
            }
          }
          return next;
        });

        handleMoveDialogClose();
      });
    } else {
      handleMoveDialogClose();
    }
  };

  const handleMoveToWithdrawnFromInterviews = (details: WithdrawnDetails) => {
    const source = moveTargetInterview;
    if (!source) {
      handleMoveDialogClose();
      return;
    }

    let newItem: WithdrawnRecord | null = null;

    // 1) Append to withdrawn storage
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(WITHDRAWN_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const prev: WithdrawnRecord[] = Array.isArray(parsed) ? parsed : [];

        newItem = {
          id: makeId(prev.length),
          company: details.company || source.company,
          role: details.role || source.role,
          location: details.location || source.location,
          appliedOn: details.appliedDate || source.appliedOn,
          employmentType: details.employmentType || source.employmentType,
          contactName: details.contactName || source.contact?.name,
          contactEmail: details.contactEmail || source.contact?.email,
          contactPhone: details.contactPhone || source.contact?.phone,
          url: details.url || source.url,
          logoUrl: details.logoUrl || source.logoUrl,
          interviewDate: source.date,
          interviewType: source.type,
          notes: details.notes || source.notes,
          withdrawnDate: details.withdrawnDate,
          withdrawnReason: details.reason,
        };

        const nextWithdrawn = [...prev, newItem];
        window.localStorage.setItem(
          WITHDRAWN_STORAGE_KEY,
          JSON.stringify(nextWithdrawn)
        );
      } catch (err) {
        console.error(
          "Failed to persist withdrawn application from interview",
          err
        );
      }
    }

    // 1b) Also log into Withdrawn activity log
    if (newItem) {
      appendWithdrawnActivity({
        id: makeActivityId(),
        appId: newItem.id,
        type: "moved_to_withdrawn",
        timestamp: new Date().toISOString(),
        company: newItem.company,
        role: newItem.role,
        location: newItem.location,
        appliedOn: newItem.appliedOn,
        fromStatus: "Interview",
        toStatus: "Withdrawn",
        note: newItem.notes || newItem.withdrawnReason,
      });
    }

    // 2) log move in Interviews activity
    logActivity("moved_to_withdrawn", source, {
      fromStatus: "Interview",
      toStatus: "Withdrawn",
      note: details.reason || "Moved to withdrawn",
    });

    // 3) Remove from interviews with animation
    const sourceId = source.id;
    const elementId = `interview-card-${sourceId}`;

    animateCardExit(elementId, "move", () => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== sourceId);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              INTERVIEWS_STORAGE_KEY,
              JSON.stringify(next)
            );
          } catch (err) {
            console.error(
              "Failed to persist interviews after moving to withdrawn",
              err
            );
          }
        }
        return next;
      });

      handleMoveDialogClose();
    });
  };

  const handleMoveToAcceptedFromInterviews = (details: AcceptedDetails) => {
    const source = moveTargetInterview;
    if (!source) {
      handleMoveDialogClose();
      return;
    }

    let newItem: AcceptedRecord | null = null;

    // 1) Append to accepted storage
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(ACCEPTED_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const prev: AcceptedRecord[] = Array.isArray(parsed) ? parsed : [];

        newItem = {
          id: makeId(prev.length),
          company: details.company || source.company,
          role: details.role || source.role,
          location: details.location || source.location,
          appliedOn: details.appliedOn || source.appliedOn,
          employmentType: details.employmentType || source.employmentType,
          decisionDate: details.decisionDate,
          startDate: details.startDate,
          salary: details.salary,
          url: details.url || source.url,
          logoUrl: details.logoUrl || source.logoUrl,
          notes: details.notes || source.notes,
        };

        const nextAccepted = [...prev, newItem];
        window.localStorage.setItem(
          ACCEPTED_STORAGE_KEY,
          JSON.stringify(nextAccepted)
        );
      } catch (err) {
        console.error(
          "Failed to persist accepted application from interview",
          err
        );
      }
    }

    // 2) log move in Interviews activity (using existing type)
    logActivity("edited", source, {
      fromStatus: "Interview",
      toStatus: "Accepted",
      note: details.notes || "Moved to accepted",
    });

    // 3) Remove from interviews with animation
    const sourceId = source.id;
    const elementId = `interview-card-${sourceId}`;

    animateCardExit(elementId, "move", () => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== sourceId);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              INTERVIEWS_STORAGE_KEY,
              JSON.stringify(next)
            );
          } catch (err) {
            console.error(
              "Failed to persist interviews after moving to accepted",
              err
            );
          }
        }
        return next;
      });

      handleMoveDialogClose();
    });
  };

  const filtered = useMemo(
    () => filterInterviews(items, query, filters, stageFilter),
    [items, query, filters, stageFilter]
  );

  const totalInStage = useMemo(
    () => items.filter((i) => i.stage === stageFilter).length,
    [items, stageFilter]
  );

  // Formatting + status styles for MoveApplicationDialog
  const fmtDate = (date: string) => date;
  const statusClasses = (status: string) => {
    if (status.toLowerCase().includes("interview")) {
      return "bg-sky-50 text-sky-900 border border-sky-200";
    }
    return "bg-neutral-50 text-neutral-700 border border-neutral-200";
  };

  const hasItemsInCurrentStage = items.some((i) => i.stage === stageFilter);

  return (
    <>
      {/* Interview activity sidebar */}
      <ActivityLogSidebar
        variant="interviews"
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        items={activityItems}
      />

      {/* Dialog shared for Add + Edit */}
      <ScheduleInterviewDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        application={dialogApplication}
        onInterviewCreated={handleInterviewCreated}
        mode={editingInterview ? "edit" : "add"}
      />

      {/* Move dialog (reusing MoveApplicationDialog with 2 buttons + accepted) */}
      <MoveApplicationDialog
        open={moveDialogOpen && !!moveDialogApplication}
        application={moveDialogApplication}
        onClose={handleMoveDialogClose}
        onMoveToInterviews={() => {
          // Not used when mode="from-interviews"
        }}
        onMoveToRejected={handleMoveToRejectedFromInterviews}
        onMoveToWithdrawn={handleMoveToWithdrawnFromInterviews}
        onMoveToAccepted={handleMoveToAcceptedFromInterviews}
        fmtDate={fmtDate}
        statusClasses={statusClasses}
        mode="from-interviews"
      />

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[13000] flex items-center justify-center px-4 py-8">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-neutral-900/40"
            aria-hidden="true"
            onClick={handleCancelDelete}
          />

          {/* Panel */}
          <div
            className={[
              "relative z-10 w-full max-w-sm rounded-2xl border border-neutral-200/80",
              "bg-white shadow-2xl p-5",
            ].join(" ")}
          >
            <h2 className="text-sm font-semibold text-neutral-900">
              Delete interview?
            </h2>
            <p className="mt-2 text-sm text-neutral-700">
              This will permanently remove the interview with{" "}
              <span className="font-medium">{deleteTarget.company}</span> for
              the role <span className="font-medium">{deleteTarget.role}</span>.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              This action cannot be undone.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center justify-center rounded-lg border border-rose-500 bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-400"
              >
                Delete interview
              </button>
            </div>
          </div>
        </div>
      )}

      <section
        className={[
          "relative rounded-2xl border border-neutral-200/70",
          "bg-gradient-to-br from-emerald-50 via-white to-teal-50",
          "p-8 shadow-md",
        ].join(" ")}
      >
        {/* soft emerald/teal blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl" />

        {/* header row with activity button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Image
              src="/icons/interview.png"
              alt=""
              width={37}
              height={37}
              aria-hidden="true"
              className="shrink-0 -mt-1"
            />
            <h1 className="text-2xl font-semibold text-neutral-900">
              Interviews
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setActivityOpen(true)}
            className={[
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800",
              "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
              "border border-neutral-200 shadow-sm hover:bg-white",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300",
            ].join(" ")}
          >
            <History className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span>Activity log</span>
            {activityItems.length > 0 && (
              <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                {activityItems.length}
              </span>
            )}
          </button>
        </div>

        <p className="mt-1 text-neutral-700">
          Track upcoming and past interviews, outcomes, and notes.
        </p>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search interviews…"
              aria-label="Search interviews"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={[
                "h-11 w-full rounded-lg pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500",
                "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                "border border-neutral-200 shadow-sm",
                "hover:bg-white focus:bg-white",
                "ring-1 ring-transparent",
                "focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-300",
                "transition-shadow",
              ].join(" ")}
            />
          </div>

          {/* Add */}
          <button
            type="button"
            onClick={handleAdd}
            className={[
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800",
              "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
              "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300",
            ].join(" ")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>

          {/* New Interviews filter */}
          <InterviewsFilter
            items={items}
            filters={filters}
            onChange={setFilters}
            filteredCount={filtered.length}
            totalInStage={totalInStage}
          />
        </div>

        {/* Stage view toggle – full width, same container width as cards */}
        <div className="mt-3 w-full">
          <div
            className={[
              "grid grid-cols-3 gap-2 rounded-2xl border border-neutral-200 bg-white/80 p-1",
              "shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70",
            ].join(" ")}
            role="tablist"
            aria-label="Filter interviews by status"
          >
            {STAGE_FILTERS.map((option) => {
              const active = stageFilter === option.id;
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStageFilter(option.id)}
                  className={[
                    "flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition",
                    active
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-neutral-700 hover:bg-neutral-50",
                  ].join(" ")}
                  aria-pressed={active}
                  role="tab"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {option.label}
                  </span>
                  <span className="sm:hidden">
                    {option.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const { date, time } = formatDateTime(item.date);
            const { label: typeLabel, Icon: TypeIcon } =
              INTERVIEW_TYPE_META[item.type];
            const countdownLabel = getInterviewCountdownLabel(item.date, now);
            const appliedLabel = getAppliedCountupLabel(item.appliedOn, now);

            return (
              <InterviewCard
                key={item.id}
                item={item}
                typeIcon={TypeIcon}
                typeLabel={typeLabel}
                date={date}
                time={time}
                countdownLabel={countdownLabel}
                appliedLabel={appliedLabel}
                onEdit={handleEdit}
                onMove={handleMove}
                onDelete={openDeleteDialog}
                onStageChange={(newStage) =>
                  handleStageChange(item.id, newStage)
                }
              />
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              <div className="mb-2 text-5xl">📅</div>

              {!hasItemsInCurrentStage ? (
                <>
                  <p className="text-sm text-neutral-700">
                    You don&apos;t have any{" "}
                    {stageFilter === "upcoming"
                      ? "upcoming interviews"
                      : stageFilter === "past"
                      ? "interviews with passed dates"
                      : "interviews marked as done and waiting for an answer"}
                    .
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Click <span className="font-medium">Add</span> to schedule
                    your next interview.
                  </p>
                </>
              ) : (
                <p className="text-sm text-neutral-700">
                  No interviews match your search or filters in this view.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
