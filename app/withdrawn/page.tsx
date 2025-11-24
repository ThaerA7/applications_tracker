// app/withdrawn/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Plus } from "lucide-react";

import WithdrawnCard, { type WithdrawnRecord } from "./WithdrawnCard";
import type { InterviewType } from "@/components/ScheduleInterviewDialog";
import MoveToWithdrawnDialog, {
  type WithdrawnDetails,
} from "@/components/MoveToWithdrawnDialog";
import { animateCardExit } from "@/components/cardExitAnimation";

const WITHDRAWN_STORAGE_KEY = "job-tracker:withdrawn";

const INTERVIEW_TYPE_LABEL: Record<InterviewType, string> = {
  phone: "Phone screening",
  video: "Video call",
  "in-person": "In person",
};

export default function WithdrawnPage() {
  const [withdrawn, setWithdrawn] = useState<WithdrawnRecord[]>([]);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WithdrawnRecord | null>(
    null
  );

  // Add dialog state
  const [dialogOpen, setDialogOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(WITHDRAWN_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setWithdrawn(parsed);
      }
    } catch (err) {
      console.error(
        "Failed to load withdrawn applications from localStorage",
        err
      );
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return withdrawn;

    return withdrawn.filter((item) =>
      [
        item.company,
        item.role,
        item.location,
        item.employmentType,
        item.contactName,
        item.contactEmail,
        item.notes,
        item.interviewType
          ? INTERVIEW_TYPE_LABEL[item.interviewType]
          : undefined,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [query, withdrawn]);

  const openDeleteDialog = (item: WithdrawnRecord) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const elementId = `withdrawn-card-${id}`;

    animateCardExit(elementId, "delete", () => {
      setWithdrawn((prev) => {
        const next = prev.filter((i) => i.id !== id);

        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              WITHDRAWN_STORAGE_KEY,
              JSON.stringify(next)
            );
          } catch (err) {
            console.error(
              "Failed to persist withdrawn applications after delete",
              err
            );
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

  // --- Add withdrawn manually via MoveToWithdrawnDialog ---

  const handleAdd = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleSaveWithdrawn = (details: WithdrawnDetails) => {
    setWithdrawn((prev) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${prev.length}`;

      const newItem: WithdrawnRecord = {
        id,
        company: details.company,
        role: details.role,
        location: details.location,
        appliedOn: details.appliedDate,
        withdrawnDate: details.withdrawnDate,
        withdrawnReason: details.reason,
        employmentType: details.employmentType,
        contactName: details.contactName,
        contactEmail: details.contactEmail,
        contactPhone: details.contactPhone,
        url: details.url,
        logoUrl: details.logoUrl,
        notes: details.notes,
        // interviewDate / interviewType left empty here (withdrawn before interview)
      };

      const next = [...prev, newItem];

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            WITHDRAWN_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch (err) {
          console.error(
            "Failed to persist withdrawn applications after create",
            err
          );
        }
      }

      return next;
    });

    setDialogOpen(false);
  };

  return (
    <>
      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-y-0 right-0 left-64 z-[13000] flex items-center justify-center px-4 py-8">
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
              Delete withdrawn application?
            </h2>
            <p className="mt-2 text-sm text-neutral-700">
              This will permanently remove the withdrawn application at{" "}
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
                className="inline-flex items-center justify-center rounded-lg border border-amber-500 bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <section
        className={[
          "relative rounded-2xl border border-neutral-200/70",
          "bg-gradient-to-br from-amber-50 via-white to-rose-50",
          "p-8 shadow-md overflow-hidden",
        ].join(" ")}
      >
        {/* soft amber/rose blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-rose-400/20 blur-3xl" />

        <h1 className="text-2xl font-semibold text-neutral-900">Withdrawn</h1>
        <p className="mt-1 text-neutral-700">
          Applications you chose to step away from.
        </p>

        {/* Toolbar: Search + Add + Filter */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search withdrawn applications…"
              aria-label="Search withdrawn applications"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={[
                "h-11 w-full rounded-lg pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500",
                "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                "border border-neutral-200 shadow-sm",
                "hover:bg-white focus:bg-white",
                "ring-1 ring-transparent",
                "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300",
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
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300",
            ].join(" ")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>

          {/* Filter (placeholder) */}
          <button
            type="button"
            className={[
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800",
              "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
              "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300",
            ].join(" ")}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filter
          </button>
        </div>

        {/* Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <WithdrawnCard
              key={item.id}
              item={item}
              onDelete={openDeleteDialog}
            />
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              <div className="mb-2 text-5xl">🚪</div>

              {withdrawn.length === 0 ? (
                <>
                  <p className="text-sm text-neutral-700">
                    You don&apos;t have any withdrawn applications yet.
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    When you move an application to withdrawn or add one
                    manually, it will show up here.
                  </p>
                </>
              ) : (
                <p className="text-sm text-neutral-700">
                  No withdrawn applications match your search.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Manual add-to-withdrawn dialog (uses same component as move) */}
      <MoveToWithdrawnDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        application={null}
        mode="add"
        onWithdrawnCreated={handleSaveWithdrawn}
      />
    </>
  );
}
