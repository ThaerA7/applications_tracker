"use client";

import type { ComponentType } from "react";
import type { RejectionDetails } from "@/components/dialogs/MoveToRejectedDialog";
import {
  Briefcase,
  MapPin,
  CalendarDays,
  Phone,
  Video,
  Building2,
  Mail,
  Trash2,
  Pencil,
  FileText,
  Link as LinkIcon,
  XCircle,
} from "lucide-react";

type InterviewType = "phone" | "video" | "in-person";

const INTERVIEW_TYPE_META: Record<
  InterviewType,
  { label: string; Icon: ComponentType<any> }
> = {
  phone: { label: "Phone", Icon: Phone },
  video: { label: "Video call", Icon: Video },
  "in-person": { label: "In person", Icon: MapPin },
};

function getInterviewMeta(
  rejectionType: RejectionDetails["rejectionType"]
): { label: string; Icon: ComponentType<any> } | null {
  switch (rejectionType) {
    case "after-phone-screening":
      return INTERVIEW_TYPE_META.phone;
    case "after-first-interview":
      return INTERVIEW_TYPE_META.video;
    case "after-second-interview":
      return INTERVIEW_TYPE_META["in-person"];
    default:
      return null;
  }
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export type Rejection = RejectionDetails & {
  id: string;
};

type RejectedCardProps = {
  item: Rejection;
  onEdit: (item: Rejection) => void;
  onDelete: (item: Rejection) => void;
};

export default function RejectedCard({
  item,
  onEdit,
  onDelete,
}: RejectedCardProps) {
  const interviewMeta = getInterviewMeta(item.rejectionType);

  return (
    <article
      id={`rejected-card-${item.id}`}
      className={[
        "relative group rounded-xl border border-neutral-200/80 shadow-sm transition-all",
        "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
        "hover:-translate-y-0.5 hover:shadow-md",
        "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl",
        // keep rejected-specific gradient, but structure matches ApplicationCard
        "before:bg-gradient-to-b before:from-rose-500 before:via-pink-500 before:to-fuchsia-500",
        "before:opacity-90",
        "flex h-full flex-col",
      ].join(" ")}
    >
      {/* Big rejected stamp overlay – centered, does NOT affect layout */}
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
            "border-rose-500/80 text-rose-700 bg-rose-50/70",
            "rotate-[-8deg]",
          ].join(" ")}
        >
          <span className="flex items-center gap-2">
            <XCircle className="h-5 w-5" aria-hidden="true" />
            <span>Rejected</span>
          </span>
        </div>
      </div>

      {/* Inner padding container for main content (matches ApplicationCard spacing) */}
      <div className="relative z-10 flex-1 px-5 pt-3 pb-6">
        {/* Header with square logo + company/role + actions (same layout as ApplicationCard) */}
        <div className="relative flex items-start gap-3 pr-16 sm:pr-20">
          {/* Logo */}
          {item.logoUrl?.trim() ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ring-1 ring-white/60">
              <img
                src={item.logoUrl}
                alt={`${item.company} logo`}
                className="h-full w-full object-contain p-1.5"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="100%" height="100%" rx="12" fill="%25fee2e2"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="11" fill="%25be123c">Logo</text></svg>';
                }}
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500">
              <Building2 className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">{item.company}</span>
            </div>
          )}

          {/* Company / role */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="max-w-full truncate text-base font-semibold text-neutral-900">
                {item.company}
              </h2>
            </div>

            {item.role && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-600">
                <Briefcase
                  className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <span className="truncate" title={item.role}>
                  {item.role}
                </span>
              </p>
            )}
          </div>

          {/* Actions pill (same shape/style as ApplicationCard, but keep rejected focus color) */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
              {/* Edit */}
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                aria-label="Edit rejected application"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                aria-label="Delete rejected application"
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

        {/* Details – same 2-column grid structure as ApplicationCard */}
        <dl
          className="relative mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-neutral-200/70 before:content-['']"
        >
          {/* Applied date (if available) */}
          {item.appliedDate && (
            <div className="flex items-center gap-2">
              <CalendarDays
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Applied</dt>
                <dd className="font-medium text-neutral-900">
                  {formatDate(item.appliedDate)}
                </dd>
              </div>
            </div>
          )}

          {/* Decision date */}
          {item.decisionDate && (
            <div className="flex items-center gap-2">
              <CalendarDays
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Decision date</dt>
                <dd className="font-medium text-neutral-900">
                  {formatDate(item.decisionDate)}
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

          {/* Interview info */}
          <div className="flex items-center gap-2">
            {interviewMeta ? (
              <interviewMeta.Icon
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
            ) : (
              <Briefcase
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
            )}
            <div className="flex flex-col">
              <dt className="text-neutral-500">Interview</dt>
              <dd className="font-medium text-neutral-900">
                {interviewMeta
                  ? `With interview (${interviewMeta.label})`
                  : "No interview"}
              </dd>
            </div>
          </div>

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

          {/* Contact name */}
          {item.contactName && (
            <div className="flex items-center gap-2">
              <Building2
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Contact person</dt>
                <dd className="font-medium text-neutral-900">
                  {item.contactName}
                </dd>
              </div>
            </div>
          )}

          {/* Contact email */}
          {item.contactEmail && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Contact email</dt>
                <dd className="font-medium text-neutral-900">
                  <a
                    href={`mailto:${item.contactEmail}`}
                    className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                  >
                    {item.contactEmail}
                  </a>
                </dd>
              </div>
            </div>
          )}

          {/* Contact phone */}
          {item.contactPhone && (
            <div className="flex items-center gap-2">
              <Phone
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Contact phone</dt>
                <dd className="font-medium text-neutral-900">
                  <a
                    href={`tel:${item.contactPhone}`}
                    className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                  >
                    {item.contactPhone}
                  </a>
                </dd>
              </div>
            </div>
          )}
        </dl>

        {/* Notes – same style as ApplicationCard */}
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

        {/* Footer – Job posting link (same style as ApplicationCard footer) */}
        {item.url && (
          <div className="mt-4 flex justify-end">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-700"
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
