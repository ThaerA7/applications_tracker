/**
 * Withdrawn application type definitions
 */
import type { BaseEntity, InterviewType } from "./common";

/** Reason for withdrawing application */
export type WithdrawnReason =
  | "accepted-other-offer"
  | "salary-not-right"
  | "role-not-fit"
  | "location-commute"
  | "process-too-slow"
  | "personal-reasons"
  | "other";

/** Withdrawn application record */
export interface WithdrawnRecord extends BaseEntity {
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
  withdrawnReason?: WithdrawnReason;
  otherReasonText?: string;
}

/** Withdrawn reason display labels */
export const WITHDRAWN_REASON_LABELS: Record<WithdrawnReason, string> = {
  "accepted-other-offer": "Accepted another offer",
  "salary-not-right": "Salary / conditions not right",
  "role-not-fit": "Role not a good fit",
  "location-commute": "Location / commute issues",
  "process-too-slow": "Process took too long",
  "personal-reasons": "Personal reasons",
  other: "Other",
};
