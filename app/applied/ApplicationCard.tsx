'use client';

import {
  Briefcase,
  MapPin,
  CalendarDays,
  ExternalLink,
  Phone,
  Mail,
  Building2,
  Tag,
  Banknote,
  Trash2,
  MoveRight,
  Pencil,
  FileText,
  Link as LinkIcon,
  CheckCircle2, // ⬅️ new icon for the stamp
} from 'lucide-react';

import type { AppliedApplication } from '../../lib/types';

// Keep old export name so the rest of your app doesn't break
export type Application = AppliedApplication;

type ApplicationCardProps = {
  app: Application;
  onEdit: (app: Application) => void;
  onMove: (app: Application) => void;
  onDelete: (app: Application) => void;
  fmtDate: (d: string) => string;
};

export default function ApplicationCard({
  app,
  onEdit,
  onMove,
  onDelete,
  fmtDate,
}: ApplicationCardProps) {
  return (
    <article
      id={`application-card-${app.id}`}
      className={[
        'relative group rounded-xl border border-neutral-200/80 shadow-sm transition-all',
        'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70',
        'hover:-translate-y-0.5 hover:shadow-md',
        'before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl',
        'before:bg-gradient-to-b before:from-sky-500 before:via-fuchsia-500 before:to-amber-500',
        'before:opacity-90',
        'flex h-full flex-col',
      ].join(' ')}
    >
      {/* Big "Applied" stamp overlay – centered, slanted, subtle */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center z-0"
        aria-hidden="true"
      >
        <div
          className={[
            'select-none rounded-2xl border-[5px] px-6 py-3',
            'text-lg sm:text-xl font-extrabold uppercase tracking-[0.35em]',
            'shadow-[0_0_0_1px_rgba(255,255,255,0.7),_0_10px_26px_rgba(0,0,0,0.08)]',
            'backdrop-blur-sm',
            'opacity-10 mix-blend-multiply',
            'border-sky-500/80 text-sky-800 bg-sky-50/70',
            'rotate-[-8deg]',
          ].join(' ')}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <span>Applied</span>
          </span>
        </div>
      </div>

      {/* Inner padding container for main content */}
      <div className="relative z-10 flex-1 px-5 pt-3 pb-6">
        {/* Header with square logo + company/role + actions (same layout as InterviewCard) */}
        <div className="relative flex items-start gap-3 pr-32 sm:pr-36">
          {/* Logo */}
          {app.logoUrl?.trim() ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ring-1 ring-white/60">
              <img
                src={app.logoUrl}
                alt={`${app.company} logo`}
                className="h-full w-full object-contain p-1.5"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="100%" height="100%" rx="12" fill="%23e0f2fe"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="11" fill="%230375f5">Logo</text></svg>';
                }}
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500">
              <Building2 className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">{app.company}</span>
            </div>
          )}

          {/* Company / role (exact style as InterviewCard: company, then role line) */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-neutral-900">
                {app.company}
              </h2>
            </div>

            {app.role && (
              <p className="mt-0.5 flex items-center gap-1 min-w-0 text-sm text-neutral-600">
                <Briefcase
                  className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <span className="truncate" title={app.role}>
                  {app.role}
                </span>
              </p>
            )}
          </div>

          {/* Actions – same style group as InterviewCard */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
              {/* Edit */}
              <button
                type="button"
                onClick={() => onEdit(app)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                aria-label="Edit application"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Move */}
              <button
                type="button"
                onClick={() => onMove(app)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                aria-label="Move application"
              >
                <MoveRight className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => onDelete(app)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                aria-label="Delete application"
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

        {/* Details – mirror InterviewCard's <dl> layout, but for application info */}
        <dl
          className="relative mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-neutral-200/70 before:content-['']"
        >
          {/* Applied date */}
          <div className="flex items-center gap-2">
            <CalendarDays
              className="h-4 w-4 text-neutral-500"
              aria-hidden="true"
            />
            <div className="flex flex-col">
              <dt className="text-neutral-500">Applied</dt>
              <dd className="font-medium text-neutral-900">
                {fmtDate(app.appliedOn)}
              </dd>
            </div>
          </div>

          {/* Start date */}
          {app.startDate && (
            <div className="flex items-center gap-2">
              <CalendarDays
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Start date</dt>
                <dd className="font-medium text-neutral-900">
                  {fmtDate(app.startDate)}
                </dd>
              </div>
            </div>
          )}

          {/* Location */}
          {app.location && (
            <div className="flex items-center gap-2">
              <MapPin
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Location</dt>
                <dd className="font-medium text-neutral-900">
                  {app.location}
                </dd>
              </div>
            </div>
          )}

          {/* Employment type */}
          {app.employmentType && (
            <div className="flex items-center gap-2">
              <Briefcase
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Employment</dt>
                <dd className="font-medium text-neutral-900">
                  {app.employmentType}
                </dd>
              </div>
            </div>
          )}

          {/* Salary */}
          {app.salary && (
            <div className="flex items-center gap-2">
              <Banknote
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Salary / range</dt>
                <dd className="font-medium text-neutral-900">
                  {app.salary}
                </dd>
              </div>
            </div>
          )}

          {/* Source */}
          {app.source && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Source</dt>
                <dd className="font-medium text-neutral-900">
                  {app.source}
                </dd>
              </div>
            </div>
          )}

          {/* Contact name */}
          {app.contactPerson && (
            <div className="flex items-center gap-2">
              <Building2
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Contact person</dt>
                <dd className="font-medium text-neutral-900">
                  {app.contactPerson}
                </dd>
              </div>
            </div>
          )}

          {/* Contact email */}
          {app.contactEmail && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Contact email</dt>
                <dd className="font-medium text-neutral-900">
                  <a
                    href={`mailto:${app.contactEmail}`}
                    className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                  >
                    {app.contactEmail}
                  </a>
                </dd>
              </div>
            </div>
          )}

          {/* Contact phone */}
          {app.contactPhone && (
            <div className="flex items-center gap-2">
              <Phone
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Contact phone</dt>
                <dd className="font-medium text-neutral-900">
                  <a
                    href={`tel:${app.contactPhone}`}
                    className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                  >
                    {app.contactPhone}
                  </a>
                </dd>
              </div>
            </div>
          )}

          {/* Company website */}
          {app.website && (
            <div className="flex items-center gap-2">
              <ExternalLink
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <dt className="text-neutral-500">Company site</dt>
                <dd className="font-medium text-neutral-900">
                  <a
                    href={app.website}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-700"
                  >
                    Open website
                  </a>
                </dd>
              </div>
            </div>
          )}
        </dl>

        {/* Notes – same feel as InterviewCard */}
        {app.notes && (
          <div className="mt-4 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 px-3 py-2">
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              <FileText className="h-3 w-3" aria-hidden="true" />
              <span>Notes</span>
            </div>
            <p className="mt-1 text-xs text-neutral-800 whitespace-pre-line">
              {app.notes}
            </p>
          </div>
        )}

        {/* Footer – Job posting shortcut like InterviewCard footer */}
        {app.offerUrl && (
          <div className="mt-4 flex justify-end">
            <a
              href={app.offerUrl}
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
