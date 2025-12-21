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
} from "@/components/dialogs/ScheduleInterviewDialog";
import MoveApplicationDialog from "@/components/dialogs/MoveApplicationDialog";
import type { RejectionDetails } from "@/components/dialogs/MoveToRejectedDialog";
import type { WithdrawnDetails } from "@/components/dialogs/MoveToWithdrawnDialog";
import type { AcceptedDetails } from "@/components/dialogs/MoveToAcceptedDialog";

import InterviewCard, { type InterviewWithStage } from "@/components/cards/InterviewCard";
import { animateCardExit } from "@/components/dialogs/cardExitAnimation";
import { upsertRejected, detectRejectedMode } from "@/lib/services/rejected";
import { upsertWithdrawn, detectWithdrawnMode } from "@/lib/services/withdrawn";
import { upsertOffer, detectOffersMode } from "@/lib/services/offers";

import ActivityLogSidebar from "@/components/ui/ActivityLogSidebar";
import ThreeBounceSpinner from "@/components/ui/ThreeBounceSpinner";

import InterviewsFilter, {
  DEFAULT_INTERVIEW_FILTERS,
  filterInterviews,
  type InterviewFilters,
} from "@/components/filters/InterviewsFilter";

import { getSupabaseClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";
import {
  loadInterviews,
  upsertInterview,
  deleteInterview,
  migrateGuestInterviewsToUser,
  type InterviewsStorageMode,
} from "@/lib/services/interviews";

// Persistent activity storage (guest + Supabase user).
import {
  loadActivity,
  appendActivity,
  migrateGuestActivityToUser,
  type ActivityItem,
  type ActivityType,
  type ActivityVariant,
  type ActivityStorageMode,
} from "@/lib/services/activity";
import { OfferReceivedJob } from "@/components/cards/OfferCard";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

type ApplicationLike = ComponentProps<typeof ScheduleInterviewDialog>["application"];
type MoveDialogApplication = ComponentProps<typeof MoveApplicationDialog>["application"];

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

type InterviewStage = "upcoming" | "past" | "done";

const STAGE_FILTERS: {
  id: InterviewStage;
  label: string;
  shortLabel: string;
  icon: ComponentType<any>;
}[] = [
    { id: "upcoming", label: "Upcoming interviews", shortLabel: "Upcoming", icon: Calendar },
    { id: "past", label: "Interviews with passed dates", shortLabel: "Passed", icon: History },
    { id: "done", label: "Done • waiting for answer", shortLabel: "Done", icon: CheckCircle2 },
  ];

const INTERVIEW_TYPE_META: Record<InterviewType, { label: string; Icon: ComponentType<any> }> = {
  phone: { label: "Phone screening", Icon: PhoneCall },
  video: { label: "Video call", Icon: Video },
  "in-person": { label: "In person", Icon: Users },
};

// --- deterministic display (no Intl) ---

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function getWeekday(year: number, month: number, day: number): string {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  const m = month;
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
    return { date: iso, time: timePartRaw ? timePartRaw.slice(0, 5) : "" };
  }

  const weekday = getWeekday(year, month, day);
  const monthName = MONTHS_SHORT[month - 1] ?? String(month).padStart(2, "0");
  const date = `${weekday}, ${String(day).padStart(2, "0")} ${monthName} ${year}`;
  const time = timePartRaw ? timePartRaw.slice(0, 5) : "";

  return { date, time };
}

// --- countdown helpers ---

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

function getInterviewCountdownLabel(interviewIso: string, nowMs: number | null): string | null {
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

function getAppliedCountupLabel(appliedDate: string | undefined, nowMs: number | null): string | null {
  if (!nowMs || !appliedDate) return null;
  const appliedDay = parseToUtcMidnight(appliedDate);
  if (appliedDay == null) return null;

  const today = getTodayUtcMidnight(nowMs);
  const diffDays = Math.round((today - appliedDay) / MS_PER_DAY);

  if (diffDays < 0) return null;
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function inferStageFromDate(iso: string | undefined | null): InterviewStage {
  if (!iso) return "upcoming";
  const timeMs = Date.parse(iso);
  if (Number.isNaN(timeMs)) return "upcoming";
  return timeMs < Date.now() ? "past" : "upcoming";
}

function ensureInterviewStage(interview: Interview | InterviewWithStage): InterviewWithStage {
  const withStage = interview as InterviewWithStage;

  // Keep "done" as a manual state.
  if (withStage.stage === "done") return withStage;

  // Always derive past/upcoming from date to prevent stale state.
  return {
    ...withStage,
    stage: inferStageFromDate((interview as Interview).date),
  };
}

// UUID helper (works even without crypto.randomUUID).
function makeUuidV4() {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();

  const buf = new Uint8Array(16);
  cryptoObj?.getRandomValues?.(buf);

  if (!cryptoObj?.getRandomValues) {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;

  const hex = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// --- Component ---

export default function InterviewsPage() {
  const pathname = usePathname();
  const isActiveRoute = pathname === "/interviews";

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<InterviewWithStage[]>([]);
  const [stageFilter, setStageFilter] = useState<InterviewStage>("upcoming");
  const [filters, setFilters] = useState<InterviewFilters>(DEFAULT_INTERVIEW_FILTERS);

  const [storageMode, setStorageMode] = useState<InterviewsStorageMode>("guest");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogApplication, setDialogApplication] = useState<ApplicationLike>(null);
  const [editingInterview, setEditingInterview] = useState<InterviewWithStage | null>(null);

  const [now, setNow] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<InterviewWithStage | null>(null);

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveDialogApplication, setMoveDialogApplication] = useState<MoveDialogApplication>(null);
  const [moveTargetInterview, setMoveTargetInterview] = useState<InterviewWithStage | null>(null);

  // Activity log state (persistent, guest + user).
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityMode, setActivityMode] = useState<ActivityStorageMode>("guest");

  const [hydrated, setHydrated] = useState(false);

  // keep "now" ticking
  useEffect(() => {
    if (typeof window === "undefined") return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Load interviews + activity, and handle auth changes
  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseClient();

    const loadAll = async () => {
      try {
        const [{ mode, items }, act] = await Promise.all([
          loadInterviews(),
          loadActivity("interviews"),
        ]);

        if (!alive) return;

        setStorageMode(mode);
        setItems(items.map((i) => ensureInterviewStage(i as Interview)));
        setActivityMode(act.mode);
        setActivityItems(act.items);
      } catch (err) {
        console.error("Failed to load interviews/activity:", err);
      } finally {
        if (alive) setHydrated(true);
      }
    };

    void loadAll();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!alive) return;

        if (event === "SIGNED_IN" && session?.user) {
          setTimeout(async () => {
            if (!alive) return;
            await migrateGuestInterviewsToUser();
            await migrateGuestActivityToUser(); // Migrate activity (all variants), then reload.
            await loadAll();
          }, 0);
        } else if (event === "SIGNED_OUT") {
          setTimeout(async () => {
            if (!alive) return;
            await loadAll();
          }, 0);
        }
      },
    );

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Persistent activity logger.
  const logActivity = async (
    variant: ActivityVariant,
    type: ActivityType,
    interviewOrSource: InterviewWithStage | null,
    extras?: Partial<ActivityItem>,
    overrideAppId?: string
  ) => {
    if (!interviewOrSource) return;

    const entry: ActivityItem = {
      id: makeUuidV4(),
      appId: overrideAppId ?? interviewOrSource.id,
      type,
      timestamp: new Date().toISOString(),
      company: interviewOrSource.company,
      role: interviewOrSource.role,
      location: interviewOrSource.location,
      appliedOn: interviewOrSource.appliedOn,
      ...extras,
    };

    const saved = await appendActivity(variant, entry, activityMode);

    // keep Interviews sidebar state in sync
    if (variant === "interviews") {
      setActivityItems((prev) => [saved, ...prev].slice(0, 100));
    }
  };

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

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    await logActivity("interviews", "deleted", deleteTarget, {
      fromStatus: "Interview",
      note: "Interview deleted",
    });

    const id = deleteTarget.id;
    const elementId = `interview-card-${id}`;

    animateCardExit(elementId, "delete", async () => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      await deleteInterview(id, storageMode);
      setDeleteTarget(null);
    });
  };

  const handleCancelDelete = () => setDeleteTarget(null);

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
      if (editingInterview) {
        return prev.map((item) => (item.id === editingInterview.id ? createdWithStage : item));
      }
      return [...prev, createdWithStage];
    });

    void upsertInterview(createdWithStage, storageMode);

    if (editingInterview) {
      void logActivity("interviews", "edited", createdWithStage, { note: "Interview updated" });
    } else {
      void logActivity("interviews", "added", createdWithStage, { note: "Interview scheduled" });
    }

    setDialogOpen(false);
    setEditingInterview(null);
    setDialogApplication(null);
  };

  const handleStageChange = (interviewId: string, newStage: InterviewStage) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === interviewId ? { ...item, stage: newStage } : item));

      const target = next.find((item) => item.id === interviewId) || null;
      if (target) {
        void logActivity("interviews", "edited", target, {
          note:
            newStage === "done"
              ? "Marked as done – waiting for answer"
              : newStage === "past"
                ? "Marked as interview with passed date"
                : "Marked as upcoming interview",
        });

        void upsertInterview(target, storageMode);
      }

      return next;
    });
  };

  const handleMoveToRejectedFromInterviews = async (details: RejectionDetails) => {
    const source = moveTargetInterview;
    let newItem: RejectionRecord | null = null;

    newItem = { id: makeUuidV4(), ...details };
    await upsertRejected(newItem as any, await detectRejectedMode());

    // 1b) Log into Rejected activity (persistent)
    if (newItem && source) {
      await logActivity(
        "rejected",
        "moved_to_rejected",
        source,
        {
          timestamp: new Date().toISOString(),
          company: newItem.company,
          role: newItem.role,
          location: newItem.location,
          appliedOn: newItem.appliedDate,
          fromStatus: "Interview",
          toStatus: "Rejected",
          note: newItem.notes,
        },
        newItem.id
      );
    }

    // 2) Log move in Interviews activity
    if (source) {
      await logActivity("interviews", "moved_to_rejected", source, {
        fromStatus: "Interview",
        toStatus: "Rejected",
        note: (details as any).reason || "Moved to rejected",
      });
    }

    // 3) Remove from interviews + delete storage
    if (source) {
      const sourceId = source.id;
      const elementId = `interview-card-${sourceId}`;

      animateCardExit(elementId, "move", async () => {
        setItems((prev) => prev.filter((i) => i.id !== sourceId));
        await deleteInterview(sourceId, storageMode);
        handleMoveDialogClose();
      });
    } else {
      handleMoveDialogClose();
    }
  };

  const handleMoveToWithdrawnFromInterviews = async (details: WithdrawnDetails) => {
    const source = moveTargetInterview;
    if (!source) {
      handleMoveDialogClose();
      return;
    }

    let newItem: WithdrawnRecord | null = null;

    newItem = {
      id: makeUuidV4(),
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
    await upsertWithdrawn(newItem as any, await detectWithdrawnMode());

    // 1b) Log into Withdrawn activity (persistent)
    if (newItem) {
      await logActivity(
        "withdrawn",
        "moved_to_withdrawn",
        source,
        {
          company: newItem.company,
          role: newItem.role,
          location: newItem.location,
          appliedOn: newItem.appliedOn,
          fromStatus: "Interview",
          toStatus: "Withdrawn",
          note: newItem.notes || newItem.withdrawnReason,
        },
        newItem.id
      );
    }

    // 2) Log move in Interviews activity
    await logActivity("interviews", "moved_to_withdrawn", source, {
      fromStatus: "Interview",
      toStatus: "Withdrawn",
      note: details.reason || "Moved to withdrawn",
    });

    // 3) Remove from interviews + delete storage
    const sourceId = source.id;
    const elementId = `interview-card-${sourceId}`;

    animateCardExit(elementId, "move", async () => {
      setItems((prev) => prev.filter((i) => i.id !== sourceId));
      await deleteInterview(sourceId, storageMode);
      handleMoveDialogClose();
    });
  };

  const handleMoveToAcceptedFromInterviews = async (details: AcceptedDetails) => {
    const source = moveTargetInterview;
    if (!source) {
      handleMoveDialogClose();
      return;
    }

    const newId = makeUuidV4();
    const offerReceived =
      details.offerReceivedDate ?? details.decisionDate ?? source.appliedOn;
    const offerAccepted = details.offerAcceptedDate ?? undefined;

    const newOffer: OfferReceivedJob = {
      id: newId,
      company: details.company || source.company,
      role: details.role || source.role,
      location: details.location || source.location,
      appliedOn: details.appliedOn || source.appliedOn,
      employmentType: details.employmentType || source.employmentType,
      url: details.url || source.url,
      logoUrl: details.logoUrl || source.logoUrl,
      notes: details.notes || source.notes,
      startDate: details.startDate,
      salary: details.salary,
      offerReceivedDate: offerReceived,
      decisionDate: offerReceived,
      offerAcceptedDate: offerAccepted,
      offerDeclinedDate: undefined,
      taken: Boolean(offerAccepted),
    };

    await upsertOffer(newOffer, await detectOffersMode());

    // Log into Offers activity (persistent) as "OFFER ACCEPTED".
    // (Offers sidebar reads `type=edited` + `toStatus=accepted`)
    await logActivity(
      "offers" as ActivityVariant,
      "edited",
      source,
      {
        company: newOffer.company,
        role: newOffer.role,
        location: newOffer.location,
        appliedOn: newOffer.appliedOn,
        toStatus: "accepted",
        fromStatus: "Interview",
        note: newOffer.notes,
        offerAcceptedDate: newOffer.offerAcceptedDate,
        offerReceivedDate: newOffer.offerReceivedDate,
      },
      newOffer.id,
    );

    // 2) Log move in Interviews activity
    await logActivity("interviews", "edited", source, {
      fromStatus: "Interview",
      toStatus: "Accepted",
      note: details.notes || "Moved to accepted",
    });

    // 3) Remove from interviews + delete storage
    const sourceId = source.id;
    const elementId = `interview-card-${sourceId}`;

    animateCardExit(elementId, "move", async () => {
      setItems((prev) => prev.filter((i) => i.id !== sourceId));
      await deleteInterview(sourceId, storageMode);
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

  const cardsPerStage = useMemo(() => {
    const stages: InterviewStage[] = ["upcoming", "past", "done"];
    const result = {} as Record<InterviewStage, number>;
    for (const stage of stages) {
      result[stage] = filterInterviews(items, query, filters, stage).length;
    }
    return result;
  }, [items, query, filters]);

  const cardCount = filtered.length;

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

      <ScheduleInterviewDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        application={dialogApplication}
        onInterviewCreated={handleInterviewCreated}
        mode={editingInterview ? "edit" : "add"}
      />

      <MoveApplicationDialog
        open={moveDialogOpen && !!moveDialogApplication}
        application={moveDialogApplication}
        onClose={handleMoveDialogClose}
        onMoveToInterviews={() => { }}
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
          <div
            className="absolute inset-0 bg-neutral-900/40"
            aria-hidden="true"
            onClick={handleCancelDelete}
          />
          <div
            className={[
              "relative z-10 w-full max-w-sm rounded-2xl border border-neutral-200/80",
              "bg-white shadow-2xl p-5",
            ].join(" ")}
          >
            <h2 className="text-sm font-semibold text-neutral-900">Delete interview?</h2>
            <p className="mt-2 text-sm text-neutral-700">
              This will permanently remove the interview with{" "}
              <span className="font-medium">{deleteTarget.company}</span> for the role{" "}
              <span className="font-medium">{deleteTarget.role}</span>.
            </p>
            <p className="mt-1 text-xs text-neutral-500">This action cannot be undone.</p>

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
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/icons/interview.png"
              alt=""
              width={37}
              height={37}
              aria-hidden="true"
              className="shrink-0 -mt-1"
            />
            <h1 className="text-2xl font-semibold text-neutral-900">Interviews</h1>
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white/80 px-2.5 py-0.5 text-xs font-medium text-neutral-800 shadow-sm">
              {cardCount} card{cardCount === 1 ? "" : "s"}
            </span>
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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

          <InterviewsFilter
            items={items}
            filters={filters}
            onChange={setFilters}
            filteredCount={filtered.length}
            totalInStage={totalInStage}
          />
        </div>

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
              const stageCount = cardsPerStage[option.id];

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStageFilter(option.id)}
                  className={[
                    "flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition",
                    active ? "bg-emerald-600 text-white shadow-sm" : "text-neutral-700 hover:bg-neutral-50",
                  ].join(" ")}
                  aria-pressed={active}
                  role="tab"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{option.label}</span>
                  <span className="sm:hidden">{option.shortLabel}</span>
                  <span
                    className={[
                      "ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                      active ? "bg-white/90 text-emerald-700" : "bg-neutral-200/80 text-neutral-800",
                    ].join(" ")}
                  >
                    {stageCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!hydrated ? (
            <div className="col-span-full flex items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              {isActiveRoute ? (
                <ThreeBounceSpinner label="Loading interviews" />
              ) : null}
            </div>
          ) : (
            <>
              {filtered.map((item) => {
                const { date, time } = formatDateTime(item.date);
                const { label: typeLabel, Icon: TypeIcon } = INTERVIEW_TYPE_META[item.type];
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
                    onStageChange={(newStage) => handleStageChange(item.id, newStage)}
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
                        Click <span className="font-medium">Add</span> to schedule your next interview.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-neutral-700">
                      No interviews match your search or filters in this view.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
