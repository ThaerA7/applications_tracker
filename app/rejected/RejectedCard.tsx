"use client";

import Image from "next/image";
import type { ComponentType } from "react";
import type { RejectionDetails } from "@/components/dialogs/MoveToRejectedDialog";
import {
  Briefcase,
  MapPin,
  Calendar,
  Phone,
  Video,
  User2,
  Ban,
  Link as LinkIcon,
  Trash2,
  Pencil,
  FileText,
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

function formatDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-DE", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "Europe/Berlin",
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
  const date = formatDate(item.decisionDate);
  const WithType = getInterviewMeta(item.rejectionType);

  return (
    <article
      id={`rejected-card-${item.id}`}
      className={[
        "relative group rounded-xl border border-neutral-200/80 p-5 shadow-sm transition-all",
        "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
        "hover:-translate-y-0.5 hover:shadow-md",
        "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl",
        "before:bg-gradient-to-b before:from-rose-500 before:via-pink-500 before:to-fuchsia-500",
        "before:opacity-90",
      ].join(" ")}
    >
      {/* Top-right actions: Edit + Delete stacked vertically */}
      <div className="absolute right-3 top-3 z-10 flex flex-col items-center gap-1">
        {/* Edit (blue) */}
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 shadow-sm hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          aria-label="Edit rejected application"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Delete (rose) */}
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 shadow-sm hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          aria-label="Delete rejected application"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Header with square logo + company/role */}
      <div className="flex items-start gap-3 pr-20 sm:pr-24">
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
          // 🔁 Fallback: show an icon if there is no logo
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
      </div>

      {/* Divider */}
      <div
        className="mt-3 h-px w-full bg-neutral-200/80"
        role="separator"
        aria-hidden="true"
      />

      {/* Details */}
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          <div className="flex flex-col">
            <dt className="text-neutral-500">Decision date</dt>
            <dd className="font-medium text-neutral-900">{date}</dd>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {WithType ? (
            <WithType.Icon
              className="h-4 w-4 text-neutral-500"
              aria-hidden="true"
            />
          ) : (
            <Ban className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          )}
          <div className="flex flex-col">
            <dt className="text-neutral-500">Interview</dt>
            <dd className="font-medium text-neutral-900">
              {WithType ? `With interview (${WithType.label})` : "No interview"}
            </dd>
          </div>
        </div>

        {item.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <div className="flex flex-col">
              <dt className="text-neutral-500">Location</dt>
              <dd className="font-medium text-neutral-900">{item.location}</dd>
            </div>
          </div>
        )}

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
              </dd>
            </div>
          </div>
        )}

        {item.notes && (
          <div className="flex items-start gap-2">
            <FileText
              className="mt-0.5 h-4 w-4 text-neutral-500"
              aria-hidden="true"
            />
            <div className="flex flex-col">
              <dt className="text-neutral-500">Notes</dt>
              <dd className="font-medium text-neutral-900 whitespace-pre-wrap">
                {item.notes}
              </dd>
            </div>
          </div>
        )}
      </dl>

      {/* Footer actions */}
      {item.url && (
        <div className="mt-4 flex items-center justify-end">
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
    </article>
  );
}
