"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { Search, Plus, History, X } from "lucide-react";
import Image from "next/image";
import { animateCardExit } from "../../components/dialogs/cardExitAnimation";

import AddApplicationDialog, {
  type NewApplicationForm,
} from "../../components/dialogs/AddApplicationDialog";
import MoveApplicationDialog from "../../components/dialogs/MoveApplicationDialog";
import type { RejectionDetails } from "../../components/dialogs/MoveToRejectedDialog";
import type { WithdrawnDetails } from "../../components/dialogs/MoveToWithdrawnDialog";
import type { Interview } from "../../components/dialogs/ScheduleInterviewDialog";
import ApplicationCard, { type Application } from "./ApplicationCard";
import ActivityLogSidebar, {
  type ActivityItem,
  type ActivityType,
} from "@/components/ActivityLogSidebar";

import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadApplied,
  upsertApplied,
  deleteApplied,
  migrateGuestAppliedToUser,
  type AppliedStorageMode,
} from "@/lib/storage/applied";

import ApplicationsFilter, {
  DEFAULT_APPLICATION_FILTERS,
  getActiveFilterCount,
  filterApplications,
  type ApplicationFilters,
} from "@/components/ApplicationsFilter";

type StoredRejection = RejectionDetails & { id: string };

type StoredWithdrawn = {
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
  notes?: string;
  withdrawnDate?: string;
  withdrawnReason?: WithdrawnDetails["reason"];
};

const REJECTIONS_STORAGE_KEY = "job-tracker:rejected";
const WITHDRAWN_STORAGE_KEY = "job-tracker:withdrawn";

// target activity logs (read by RejectedPage and WithdrawnPage)
const REJECTIONS_ACTIVITY_STORAGE_KEY = "job-tracker:rejected-activity";
const WITHDRAWN_ACTIVITY_STORAGE_KEY = "job-tracker:withdrawn-activity";

function fmtDate(d: string) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function statusClasses(status: string) {
  const s = status.toLowerCase();
  if (s.includes("interview"))
    return "bg-indigo-100 text-indigo-800 ring-1 ring-inset ring-indigo-300";
  if (s.includes("offer"))
    return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300";
  if (s.includes("rejected") || s.includes("declined"))
    return "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-300";
  if (s.includes("submitted"))
    return "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-300";
  if (s.includes("withdrawn") || s.includes("stopped"))
    return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300";
  return "bg-cyan-100 text-cyan-800 ring-1 ring-inset ring-cyan-300";
}

// Helper to convert full Application -> dialog form data
function appToForm(app: Application): NewApplicationForm {
  const { id, website, ...rest } = app;
  return rest;
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
    console.error("Failed to persist rejected activity log", err);
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
    console.error("Failed to persist withdrawn activity log", err);
  }
}

export default function AppliedPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [storageMode, setStorageMode] = useState<AppliedStorageMode>("guest");

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);

  // Move dialog state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [appBeingMoved, setAppBeingMoved] = useState<Application | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);

  // Activity sidebar / log state (for Applied page)
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

  // Shared filters state (can be reused on other pages)
  const [filters, setFilters] =
    useState<ApplicationFilters>(DEFAULT_APPLICATION_FILTERS);

  // ---------- load initial data + auth switching ----------
  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseClient();

    const init = async () => {
      const { mode, items } = await loadApplied();
      if (!alive) return;
      setStorageMode(mode);
      setApplications(items);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!alive) return;

        if (event === "SIGNED_IN" && session?.user) {
          await migrateGuestAppliedToUser();
          const { mode, items } = await loadApplied();
          if (!alive) return;
          setStorageMode(mode);
          setApplications(items);
          return;
        }

        if (event === "SIGNED_OUT") {
          const { mode, items } = await loadApplied();
          if (!alive) return;
          setStorageMode(mode);
          setApplications(items);
        }
      }
    );

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const logActivity = useCallback(
    (
      type: ActivityType,
      app: Application | null,
      extras?: Partial<ActivityItem>
    ) => {
      if (!app) return;

      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);

      const timestamp = new Date().toISOString();

      const base: ActivityItem = {
        id,
        appId: app.id,
        type,
        timestamp,
        company: app.company,
        role: app.role,
        location: app.location,
        appliedOn: app.appliedOn,
        ...extras,
      };

      setActivityItems((prev) => [base, ...prev].slice(0, 100));
    },
    []
  );

  // ---------- filtered list using shared helper ----------
  const filtered = useMemo(
    () => filterApplications(applications, query, filters),
    [applications, query, filters]
  );

  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters),
    [filters]
  );

  const toggle = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }));

  // ---------- create / update ----------
  const handleCreate = async (data: NewApplicationForm) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const newApp: Application = {
      id,
      ...data,
    };

    setApplications((prev) => [newApp, ...prev]);

    // persist (guest or user)
    await upsertApplied(newApp, storageMode);

    logActivity("added", newApp, {
      toStatus: newApp.status,
      note: "Application created",
    });
  };

  const handleUpdate = async (data: NewApplicationForm) => {
    if (!editingApp) return;

    const updatedApp: Application = { ...editingApp, ...data };

    setApplications((prev) =>
      prev.map((app) => (app.id === editingApp.id ? updatedApp : app))
    );

    await upsertApplied(updatedApp, storageMode);

    logActivity("edited", updatedApp, {
      fromStatus: editingApp.status,
      toStatus: data.status,
    });
  };

  const handleSave = async (data: NewApplicationForm) => {
    if (editingApp) {
      await handleUpdate(data);
    } else {
      await handleCreate(data);
    }
    setDialogOpen(false);
    setEditingApp(null);
  };

  // ---------- delete ----------
  const openDeleteDialog = (app: Application) => {
    setDeleteTarget(app);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const elementId = `application-card-${id}`;

    logActivity("deleted", deleteTarget, {
      fromStatus: deleteTarget.status,
      note: "Application removed from Applied list",
    });

    animateCardExit(elementId, "delete", async () => {
      setApplications((prev) => prev.filter((app) => app.id !== id));

      setExpanded((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      if (editingApp?.id === id) {
        setEditingApp(null);
        setDialogOpen(false);
      }

      // persist delete
      await deleteApplied(id, storageMode);

      setDeleteTarget(null);
    });
  };

  // ---------- move dialog helpers ----------
  const openMoveDialog = (app: Application) => {
    setAppBeingMoved(app);
    setMoveDialogOpen(true);
  };

  const closeMoveDialog = () => {
    setMoveDialogOpen(false);
    setAppBeingMoved(null);
  };

  // When moving an application OUT of "Applied",
  // we play the move animation, then remove it from this list.
  const moveOutOfApplied = () => {
    if (!appBeingMoved) return;

    const id = appBeingMoved.id;
    const elementId = `application-card-${id}`;

    animateCardExit(elementId, "move", async () => {
      setApplications((prev) => prev.filter((app) => app.id !== id));

      setExpanded((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      // persist delete from Applied bucket
      await deleteApplied(id, storageMode);

      closeMoveDialog();
    });
  };

  const moveToInterviews = (_interview: Interview) => {
    if (!appBeingMoved) {
      moveOutOfApplied();
      return;
    }

    logActivity("moved_to_interviews", appBeingMoved, {
      fromStatus: "Applied",
      toStatus: "Interviews",
    });

    moveOutOfApplied();
  };

  const moveToRejected = (details: RejectionDetails) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const newRejection: StoredRejection = {
      id,
      ...details,
    };

    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(REJECTIONS_STORAGE_KEY);
        let existing: StoredRejection[] = [];
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            existing = parsed;
          }
        }
        const next = [...existing, newRejection];
        window.localStorage.setItem(
          REJECTIONS_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch (err) {
        console.error("Failed to persist rejected application", err);
      }
    }

    if (appBeingMoved) {
      logActivity("moved_to_rejected", appBeingMoved, {
        fromStatus: "Applied",
        toStatus: "Rejected",
        note: "Marked as rejected",
      });
    }

    appendRejectedActivity({
      id: makeActivityId(),
      appId: newRejection.id,
      type: "moved_to_rejected",
      timestamp: new Date().toISOString(),
      company: newRejection.company,
      role: newRejection.role,
      location: newRejection.location,
      appliedOn: newRejection.appliedDate,
      fromStatus: "Applied",
      toStatus: "Rejected",
      note: newRejection.notes,
    });

    moveOutOfApplied();
  };

  const moveToWithdrawn = (details: WithdrawnDetails) => {
    if (!appBeingMoved) {
      moveOutOfApplied();
      return;
    }

    const source = appBeingMoved;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const newWithdrawn: StoredWithdrawn = {
      id,
      company: details.company || source.company,
      role: details.role || source.role,
      location: details.location || source.location,
      appliedOn: details.appliedDate || source.appliedOn,
      employmentType: details.employmentType || source.employmentType,
      contactName: details.contactName || source.contactPerson,
      contactEmail: details.contactEmail || source.contactEmail,
      contactPhone: details.contactPhone || source.contactPhone,
      url: details.url || source.offerUrl,
      logoUrl: details.logoUrl || source.logoUrl,
      notes: details.notes || source.notes,
      withdrawnDate: details.withdrawnDate,
      withdrawnReason: details.reason,
    };

    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(WITHDRAWN_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const existing: StoredWithdrawn[] = Array.isArray(parsed) ? parsed : [];
        const next = [...existing, newWithdrawn];
        window.localStorage.setItem(
          WITHDRAWN_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch (err) {
        console.error("Failed to persist withdrawn application", err);
      }
    }

    logActivity("moved_to_withdrawn", source, {
      fromStatus: "Applied",
      toStatus: "Withdrawn",
      note: details.reason || "Moved to withdrawn",
    });

    appendWithdrawnActivity({
      id: makeActivityId(),
      appId: newWithdrawn.id,
      type: "moved_to_withdrawn",
      timestamp: new Date().toISOString(),
      company: newWithdrawn.company,
      role: newWithdrawn.role,
      location: newWithdrawn.location,
      appliedOn: newWithdrawn.appliedOn,
      fromStatus: "Applied",
      toStatus: "Withdrawn",
      note: newWithdrawn.notes || newWithdrawn.withdrawnReason,
    });

    moveOutOfApplied();
  };

  const hasAnyApplications = applications.length > 0;

  return (
    <>
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
            <h2 className="text-sm font-semibold text-neutral-900">
              Delete application?
            </h2>
            <p className="mt-2 text-sm text-neutral-700">
              This will permanently remove your application to{" "}
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
                Delete application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity sidebar (Applied) */}
      <ActivityLogSidebar
        variant="applied"
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        items={activityItems}
      />

      <section
        className={[
          "relative rounded-2xl border border-neutral-200/70",
          "bg-gradient-to-br from-sky-50 via-fuchsia-50 to-amber-50",
          "p-8 shadow-md",
        ].join(" ")}
      >
        {/* Decorative background layer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -top-20 -right-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-28 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Image
                src="/icons/checklist.png"
                alt=""
                width={37}
                height={37}
                aria-hidden="true"
                className="shrink-0"
              />
              <h1 className="text-2xl font-semibold text-neutral-900">
                Applied
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setActivityOpen(true)}
              className={[
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800",
                "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
                "border border-neutral-200 shadow-sm hover:bg-white",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300",
              ].join(" ")}
            >
              <History className="h-4 w-4 text-sky-600" aria-hidden="true" />
              <span>Activity log</span>
              {activityItems.length > 0 && (
                <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                  {activityItems.length}
                </span>
              )}
            </button>
          </div>

          <p className="mt-1 text-neutral-700">
            List of your submitted applications.
          </p>

          {/* Toolbar */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search company, role, location, status…"
                aria-label="Search applications"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={[
                  "h-11 w-full rounded-lg pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500",
                  "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                  "border border-neutral-200 shadow-sm",
                  "hover:bg-white focus:bg-white",
                  "ring-1 ring-transparent",
                  "focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-300",
                  "transition-shadow",
                ].join(" ")}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingApp(null);
                setDialogOpen(true);
              }}
              className={[
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800",
                "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300",
              ].join(" ")}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </button>

            {/* Reusable filter */}
            <ApplicationsFilter
              applications={applications}
              filters={filters}
              onChange={setFilters}
              filteredCount={filtered.length}
              listLabel="applied"
            />
          </div>

          {/* Results grid */}
          <div className="mt-5 grid grid-cols-1 gap-3">
            {filtered.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                isExpanded={!!expanded[app.id]}
                onToggle={() => toggle(app.id)}
                onEdit={(a) => {
                  setEditingApp(a);
                  setDialogOpen(true);
                }}
                onMove={openMoveDialog}
                onDelete={openDeleteDialog}
                fmtDate={fmtDate}
                statusClasses={statusClasses}
              />
            ))}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
                <div className="mb-2 text-5xl">🔎</div>
                <p className="text-sm text-neutral-700">
                  {!hasAnyApplications
                    ? "No applications yet. Click “Add” to create your first one."
                    : activeFilterCount > 0
                    ? "No applications match your filters. Try resetting or broadening them."
                    : "No applications match your search."}
                </p>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_APPLICATION_FILTERS)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Move dialog */}
          <MoveApplicationDialog
            open={moveDialogOpen}
            application={
              appBeingMoved && {
                id: appBeingMoved.id,
                company: appBeingMoved.company,
                role: appBeingMoved.role,
                location: appBeingMoved.location,
                status: appBeingMoved.status,
                appliedOn: appBeingMoved.appliedOn,
                contactPerson: appBeingMoved.contactPerson,
                contactEmail: appBeingMoved.contactEmail,
                contactPhone: appBeingMoved.contactPhone,
                offerUrl: appBeingMoved.offerUrl,
                logoUrl: appBeingMoved.logoUrl,
                employmentType: appBeingMoved.employmentType,
                notes: appBeingMoved.notes,
              }
            }
            onClose={closeMoveDialog}
            onMoveToInterviews={moveToInterviews}
            onMoveToRejected={moveToRejected}
            onMoveToWithdrawn={moveToWithdrawn}
            fmtDate={fmtDate}
            statusClasses={statusClasses}
          />

          {/* Add / edit dialog */}
          <AddApplicationDialog
            open={dialogOpen}
            onClose={() => {
              setDialogOpen(false);
              setEditingApp(null);
            }}
            initialData={editingApp ? appToForm(editingApp) : undefined}
            onSave={handleSave}
          />
        </div>
      </section>
    </>
  );
}
