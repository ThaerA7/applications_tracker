// components/MoveApplicationDialog.tsx
'use client';

import { useState, type FC } from 'react';
import { CalendarDays, MapPin, X } from 'lucide-react';
import ScheduleInterviewDialog, {
  type Interview,
} from './ScheduleInterviewDialog';

type MoveApplicationDialogProps = {
  open: boolean;
  application:
    | {
        id: string;
        company: string;
        role?: string;
        location?: string;
        status: string;
        appliedOn: string;
        // optional fields so we can prefill the schedule dialog
        contactPerson?: string;
        contactEmail?: string;
        contactPhone?: string;
        offerUrl?: string;
        logoUrl?: string;
      }
    | null;
  onClose: () => void;
  onMoveToInterviews: (interview: Interview) => void;
  onMoveToRejected: () => void;
  onMoveToWithdrawn: () => void;
  fmtDate: (date: string) => string;
  statusClasses: (status: string) => string;
};

const MoveApplicationDialog: FC<MoveApplicationDialogProps> = ({
  open,
  application,
  onClose,
  onMoveToInterviews,
  onMoveToRejected,
  onMoveToWithdrawn,
  fmtDate,
  statusClasses,
}) => {
  const [scheduleOpen, setScheduleOpen] = useState(false);

  if (!open || !application) return null;

  return (
    <>
      <div className="fixed inset-y-0 right-0 left-64 z-[11000] flex items-center justify-center px-4 py-8">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-neutral-900/40"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Dialog panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="move-application-title"
          className={[
            'relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200/80',
            'bg-gradient-to-br from-sky-50 via-white to-emerald-50',
            'shadow-2xl backdrop-blur-sm',
          ].join(' ')}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-neutral-200/70 px-5 py-4">
            <div className="flex items-center gap-3">
              <img
                src="/icons/move.png"
                alt="Move icon"
                className="h-9 w-9 md:h-10 md:w-10 object-contain"
              />
              <div>
                <h2
                  id="move-application-title"
                  className="text-sm font-semibold text-neutral-900"
                >
                  Move application
                </h2>
                <p className="mt-0.5 text-xs text-neutral-600">
                  Choose the next stage for this application.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/80 text-neutral-500 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              aria-label="Close move dialog"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {/* Application summary card */}
            <div className="rounded-xl border border-neutral-200/80 bg-white/90 p-3 text-xs text-neutral-800 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-neutral-900">
                    {application.role || 'Role not set'}
                  </div>
                  <div className="text-neutral-600">{application.company}</div>
                </div>
                {application.status && (
                  <span
                    className={[
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                      statusClasses(application.status),
                    ].join(' ')}
                  >
                    {application.status}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-600">
                {application.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin
                      className="h-3.5 w-3.5 text-neutral-400"
                      aria-hidden="true"
                    />
                    {application.location}
                  </span>
                )}
                {application.appliedOn && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays
                      className="h-3.5 w-3.5 text-neutral-400"
                      aria-hidden="true"
                    />
                    Applied {fmtDate(application.appliedOn)}
                  </span>
                )}
              </div>
            </div>

            {/* Section subtitle */}
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-neutral-500">
              <span className="font-semibold">Select destination</span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                3 options
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              {/* Interviews */}
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className={[
                  'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium',
                  'border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-sky-50',
                  'shadow-sm hover:from-sky-100 hover:to-sky-50',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300',
                  'transition-colors',
                ].join(' ')}
              >
                <img
                  src="/icons/interview.png"
                  alt="Interview stage"
                  className="h-7 w-7 md:h-8 md:w-8 object-contain"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-sky-900">
                    Move to interviews section
                  </span>
                  <span className="text-[11px] font-normal text-sky-900/80">
                    When you&apos;ve been invited to a phone screen or any interview round.
                  </span>
                </div>
              </button>

              {/* Rejected */}
              <button
                type="button"
                onClick={onMoveToRejected}
                className={[
                  'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium',
                  'border border-rose-200/80 bg-gradient-to-r from-rose-50 via-white to-rose-50',
                  'shadow-sm hover:from-rose-100 hover:to-rose-50',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300',
                  'transition-colors',
                ].join(' ')}
              >
                <img
                  src="/icons/cancel.png"
                  alt="Rejected stage"
                  className="h-7 w-7 md:h-8 md:w-8 object-contain"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-rose-900">
                    Move to the rejected section
                  </span>
                  <span className="text-[11px] font-normal text-rose-900/80">
                    When the company declines or clearly rejects your application.
                  </span>
                </div>
              </button>

              {/* Withdrawn */}
              <button
                type="button"
                onClick={onMoveToWithdrawn}
                className={[
                  'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium',
                  'border border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-amber-50',
                  'shadow-sm hover:from-amber-100 hover:to-amber-50',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300',
                  'transition-colors',
                ].join(' ')}
              >
                <img
                  src="/icons/withdrawn.png"
                  alt="Withdrawn stage"
                  className="h-7 w-7 md:h-8 md:w-8 object-contain"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-amber-900">
                    Move to withdrawn section
                  </span>
                  <span className="text-[11px] font-normal text-amber-900/80">
                    When you decide to withdraw your application yourself.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center border-t border-neutral-200/70 bg-white/70 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className={[
                'flex w-full items-center justify-center gap-1 rounded-2xl px-4 py-3 text-sm font-medium',
                'border border-neutral-200/80 bg-gradient-to-r from-neutral-50 via-white to-neutral-50',
                'text-neutral-800 shadow-sm hover:from-neutral-100 hover:to-neutral-50',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300',
              ].join(' ')}
            >
              <X className="h-5 w-5 text-neutral-500" aria-hidden="true" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Second dialog: schedule interview details */}
      <ScheduleInterviewDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        application={{
          id: application.id,
          company: application.company,
          role: application.role,
          location: application.location,
          contactPerson: application.contactPerson,
          contactEmail: application.contactEmail,
          contactPhone: application.contactPhone,
          offerUrl: application.offerUrl,
          logoUrl: application.logoUrl,
          appliedOn: application.appliedOn,
        }}
        onInterviewCreated={(interview) => {
          onMoveToInterviews(interview);
          setScheduleOpen(false);
          onClose();
        }}
      />
    </>
  );
};

export default MoveApplicationDialog;