// app/interviews/InterviewCard.tsx
"use client";

import Image from "next/image";
import { type ComponentType } from "react";
import {
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  Phone,
  User2,
  Mail,
  Link as LinkIcon,
  Building2,
  Trash2,
  Pencil,
  ArrowRight,
  FileText,
  Sparkles,
  History,
  CheckCircle2,
} from "lucide-react";
import type { Interview } from "../../components/dialogs/ScheduleInterviewDialog";

type InterviewStage = "upcoming" | "past" | "done";

export type InterviewWithStage = Interview & {
  stage: InterviewStage;
};

type InterviewCardProps = {
  item: InterviewWithStage;
  typeIcon: ComponentType<any>;
  typeLabel: string;
  date: string;
  time: string;
  countdownLabel: string | null;
  appliedLabel: string | null;
  onEdit: (item: InterviewWithStage) => void;
  onMove: (item: InterviewWithStage) => void;
  onDelete: (item: InterviewWithStage) => void;
  onStageChange: (stage: InterviewStage) => void;
};

export default function InterviewCard({
  item,
  typeIcon: TypeIcon,
  typeLabel,
  date,
  time,
  countdownLabel,
  appliedLabel,
  onEdit,
  onMove,
  onDelete,
  onStageChange,
}: InterviewCardProps) {
  const stage = item.stage;

  return (
    <article
      id={`interview-card-${item.id}`}
      className={[
        "relative group rounded-xl border border-neutral-200/80 shadow-sm transition-all",
        "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
        "hover:-translate-y-0.5 hover:shadow-md",
        "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl",
        "before:bg-gradient-to-b before:from-emerald-500 before:via-teal-500 before:to-cyan-500",
        "before:opacity-90",
        "flex h-full flex-col", // make card stretch + allow footer to stick to bottom
      ].join(" ")}
    >
      {/* Inner padding container for main content */}
      <div className="relative flex-1 px-5 pt-3 pb-6">
        {/* Header with square logo + company/role + actions */}
        <div className="relative flex items-start gap-3 pr-16 sm:pr-20">
          {item.logoUrl ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ring-1 ring-white/60">
              <Image
                src={item.logoUrl}
                alt={`${item.company} logo`}
                fill
                sizes="48px"
                className="object-contain p-1.5"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500">
              <Building2 className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">{item.company}</span>
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="max-w-full truncate text-base font-semibold text-neutral-900">
                {item.company}
              </h2>
            </div>
            <p className="flex items-center gap-1 text-sm text-neutral-600">
              <Briefcase
                className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400"
                aria-hidden="true"
              />
              <span className="truncate" title={item.role}>
                {item.role}
              </span>
            </p>
          </div>

          {/* Actions – horizontal, icon-only, centered between top and divider */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
              {/* Edit */}
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                aria-label="Edit interview"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Move */}
              <button
                type="button"
                onClick={() => onMove(item)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                aria-label="Move interview"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                aria-label="Delete interview"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>


        {/* Divider */}
        <div
          className="mt-3 h-px w-full bg-neutral-200/80"
          role="separator"
          aria-hidden="true"
        />

        {/* Details – show only fields with data for optional ones */}
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
          {/* Date + countdown */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <div className="flex flex-col">
              <dt className="text-neutral-500">Date</dt>
              <dd className="font-medium text-neutral-900 flex flex-wrap items-baseline gap-2">
                <span>{date || "-"}</span>
                {countdownLabel && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    {countdownLabel}
                  </span>
                )}
              </dd>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <div className="flex flex-col">
              <dt className="text-neutral-500">Time</dt>
              <dd className="font-medium text-neutral-900">
                {time ? `${time} (Berlin)` : "-"}
              </dd>
            </div>
          </div>

          {/* Type */}
          <div className="flex items-center gap-2">
            <TypeIcon className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <div className="flex flex-col">
              <dt className="text-neutral-500">Type</dt>
              <dd className="font-medium text-neutral-900">
                {typeLabel || "-"}
              </dd>
            </div>
          </div>

          {/* Employment type (optional) */}
          {item.employmentType && (
            <div className="flex items-center gap-2">
              <Briefcase
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Employment</dt>
                <dd className="font-medium text-neutral-900">
                  {item.employmentType}
                </dd>
              </div>
            </div>
          )}

          {/* Applied date + countup (only if we have appliedOn) */}
          {item.appliedOn && (
            <div className="flex items-center gap-2">
              <Calendar
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Applied</dt>
                <dd className="font-medium text-neutral-900 flex flex-wrap items-baseline gap-2">
                  <span>{item.appliedOn}</span>
                  {appliedLabel && (
                    <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200">
                      {appliedLabel}
                    </span>
                  )}
                </dd>
              </div>
            </div>
          )}

          {/* Location (optional) */}
          {item.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Location</dt>
                <dd className="font-medium text-neutral-900">
                  {item.location}
                </dd>
              </div>
            </div>
          )}

          {/* Contact name (optional) */}
          {item.contact?.name && (
            <div className="flex items-center gap-2">
              <User2 className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Contact name</dt>
                <dd className="font-medium text-neutral-900">
                  {item.contact.name}
                </dd>
              </div>
            </div>
          )}

          {/* Contact email (optional) */}
          {item.contact?.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Contact email</dt>
                <dd className="font-medium text-neutral-900">
                  <a
                    href={`mailto:${item.contact.email}`}
                    className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                  >
                    {item.contact.email}
                  </a>
                </dd>
              </div>
            </div>
          )}

          {/* Contact phone (optional) */}
          {item.contact?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Contact phone</dt>
                <dd className="font-medium text-neutral-900">
                  <a
                    href={`tel:${item.contact.phone}`}
                    className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                  >
                    {item.contact.phone}
                  </a>
                </dd>
              </div>
            </div>
          )}
        </dl>

        {/* Notes (if any) */}
        {item.notes && (
          <div className="mt-4 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 px-3 py-2">
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              <FileText className="h-3 w-3" aria-hidden="true" />
              <span>Notes</span>
            </div>
            <p className="mt-1 text-xs text-neutral-800 whitespace-pre-line">
              {item.notes}
            </p>
          </div>
        )}

        {/* Footer – Job posting link */}
        {item.url && (
          <div className="mt-4 flex justify-end">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items.center gap-1 text-sm font-medium text-neutral-900 hover:underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-700"
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
              Job posting
            </a>
          </div>
        )}
      </div>

      {/* Follow-up status toggle – full-width footer, edges aligned with card bottom edges */}
      <div
        className={[
          "mt-auto border-t border-neutral-200 bg-neutral-50/95 px-5 py-2.5",
          "-mb-px rounded-b-xl", // hug bottom radius of the card
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            <Sparkles className="h-3 w-3 text-emerald-500" aria-hidden="true" />
            <span>Interview status</span>
          </div>
          <span className="text-[11px] text-neutral-500">
            {stage === "upcoming"
              ? "Upcoming interview"
              : stage === "past"
                ? "Interview date has passed"
                : "Done – waiting for an answer"}
          </span>
        </div>

        <div
          className="mt-2 grid grid-cols-3 gap-1.5"
          role="tablist"
          aria-label="Change interview status"
        >
          {(
            [
              ["upcoming", "Upcoming"] as const,
              ["past", "Passed date"] as const,
              ["done", "Done & waiting"] as const,
            ] satisfies [InterviewStage, string][]
          ).map(([key, label]) => {
            const active = stage === key;
            const Icon =
              key === "upcoming"
                ? Calendar
                : key === "past"
                  ? History
                  : CheckCircle2;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onStageChange(key)}
                className={[
                  "flex items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-medium transition",
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-neutral-700 hover:bg-neutral-50",
                ].join(" ")}
                aria-pressed={active}
                role="tab"
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                <span className="text-[10px]">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
