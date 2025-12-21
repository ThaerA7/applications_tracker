"use client";

import Image from "next/image";
import type { ComponentType } from "react";
import {
  Briefcase,
  MapPin,
  Calendar,
  Phone,
  Video,
  User2,
  FileText,
  Link as LinkIcon,
  Trash2,
  Pencil,
  Clock,
  Building2,
  AlertCircle,
  Undo2, // ⬅️ new icon for the stamp
} from "lucide-react";
import type { InterviewType } from "@/components/dialogs";
import type {
  WithdrawnDetails,
  WithdrawnReason,
} from "@/components/dialogs";

export type WithdrawnRecord = {
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

type WithdrawnCardProps = {
  item: WithdrawnRecord;
  onEdit: (item: WithdrawnRecord) => void;
  onDelete: (item: WithdrawnRecord) => void;
};

type InterviewMeta = {
  label: string;
  Icon: ComponentType<any>;
};

const INTERVIEW_TYPE_META: Record<InterviewType, InterviewMeta> = {
  phone: { label: "Phone screening", Icon: Phone },
  video: { label: "Video call", Icon: Video },
  "in-person": { label: "In person", Icon: MapPin },
};

const WITHDRAWN_REASON_LABEL: Record<WithdrawnReason, string> = {
  "accepted-other-offer": "Accepted another offer",
  "salary-not-right": "Salary / conditions not right",
  "role-not-fit": "Role not a good fit",
  "location-commute": "Location / commute issues",
  "process-too-slow": "Process took too long",
  "personal-reasons": "Personal reasons",
  other: "Other",
};

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-DE", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function WithdrawnCard({
  item,
  onEdit,
  onDelete,
}: WithdrawnCardProps) {
  const interviewMeta = item.interviewType
    ? INTERVIEW_TYPE_META[item.interviewType]
    : null;

  const applied = item.appliedOn ? formatDate(item.appliedOn) : null;
  const withdrawnOn = item.withdrawnDate
    ? formatDate(item.withdrawnDate)
    : null;
  const interviewDate = item.interviewDate
    ? formatDate(item.interviewDate)
    : null;
  const interviewTime = item.interviewDate
    ? formatTime(item.interviewDate)
    : null;

  const StageIcon = interviewMeta ? interviewMeta.Icon : Building2;

  return (
    <article
      id={`withdrawn-card-${item.id}`}
      className={[
        "relative group rounded-xl border border-neutral-200/80 shadow-sm transition-all",
        "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
        "hover:-translate-y-0.5 hover:shadow-md",
        "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl",
        "before:bg-gradient-to-b before:from-amber-500 before:via-orange-500 before:to-rose-500",
        "before:opacity-90",
        "flex h-full flex-col",
      ].join(" ")}
    >
      {/* Big withdrawn stamp overlay – centered, slanted, does NOT affect layout */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center z-0"
        aria-hidden="true"
      >
        <div
          className={[
            "select-none rounded-2xl border-[5px] px-6 py-3",
            "text-lg sm:text-xl font-extrabold uppercase tracking-[0.35em]",
            "shadow-[0_0_0_1px_rgba(255,255,255,0.7),_0_10px_26px_rgba(0,0,0,0.08)]",
            "backdrop-blur-sm",
            "opacity-10 mix-blend-multiply",
            "border-amber-500/80 text-amber-800 bg-amber-50/70",
            "rotate-[-8deg]",
          ].join(" ")}
        >
          <span className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" aria-hidden="true" />
            <span>Withdrawn</span>
          </span>
        </div>
      </div>

      {/* inner padding – same as other cards, top gap = 3 */}
      <div className="relative z-10 flex-1 px-5 pt-3 pb-6">
        {/* Header: logo + company/role + actions */}
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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </div>
          )}

          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-neutral-900">
              {item.company}
            </h2>
            <p className="flex items-center gap-1 truncate text-sm text-neutral-600">
              <Briefcase
                className="h-3.5 w-3.5 text-neutral-400"
                aria-hidden="true"
              />
              {item.role}
            </p>
          </div>

          {/* pill-style actions, 10% bigger buttons */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
              {/* Edit */}
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                aria-label="Edit withdrawn application"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-amber-50 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                aria-label="Delete withdrawn application"
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

        {/* Details */}
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
          {/* Applied date */}
          {applied && (
            <div className="flex items-center gap-2">
              <Calendar
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Applied on</dt>
                <dd className="font-medium text-neutral-900">{applied}</dd>
              </div>
            </div>
          )}

          {/* Withdrawn date */}
          {withdrawnOn && (
            <div className="flex items-center gap-2">
              <Calendar
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Withdrawn on</dt>
                <dd className="font-medium text-neutral-900">{withdrawnOn}</dd>
              </div>
            </div>
          )}

          {/* Withdrawn stage */}
          <div className="flex items-center gap-2">
            <StageIcon className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <div className="flex flex-col">
              <dt className="text-neutral-500">Stage</dt>
              <dd className="font-medium text-neutral-900">
                {interviewMeta
                  ? `Withdrawn during interview (${interviewMeta.label})`
                  : "Withdrawn before interview"}
              </dd>
            </div>
          </div>

          {/* Withdrawn reason */}
          {item.withdrawnReason && (
            <div className="flex items-center gap-2">
              <AlertCircle
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Reason</dt>
                <dd className="font-medium text-neutral-900">
                  {WITHDRAWN_REASON_LABEL[item.withdrawnReason]}
                </dd>
              </div>
            </div>
          )}

          {/* Interview date/time */}
          {interviewDate && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Interview date</dt>
                <dd className="font-medium text-neutral-900">
                  {interviewDate}
                  {interviewTime && ` · ${interviewTime} (Berlin)`}
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
              <div className="flex flex-col">
                <dt className="text-neutral-500">Location</dt>
                <dd className="font-medium text-neutral-900">
                  {item.location}
                </dd>
              </div>
            </div>
          )}

          {/* Employment type */}
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

          {/* Contact */}
          {(item.contactName || item.contactEmail || item.contactPhone) && (
            <div className="flex items-center gap-2">
              <User2 className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Contact</dt>
                <dd className="font-medium text-neutral-900">
                  {item.contactName}
                  {item.contactEmail && (
                    <>
                      {" "}
                      <span className="text-neutral-500">·</span>{" "}
                      <a
                        href={`mailto:${item.contactEmail}`}
                        className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                      >
                        {item.contactEmail}
                      </a>
                    </>
                  )}
                  {item.contactPhone && (
                    <>
                      {" "}
                      <span className="text-neutral-500">·</span>{" "}
                      <a
                        href={`tel:${item.contactPhone}`}
                        className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                      >
                        {item.contactPhone}
                      </a>
                    </>
                  )}
                </dd>
              </div>
            </div>
          )}
        </dl>

        {/* Notes */}
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

        {/* Footer link */}
        {item.url && (
          <div className="mt-4 flex justify-end">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-neutral-900 hover:underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-700"
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
              Job posting
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
