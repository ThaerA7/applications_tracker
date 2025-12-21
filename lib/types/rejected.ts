/**
 * Rejection-related type definitions
 */
import type { BaseEntity } from "./common";

/** Type of rejection based on stage reached */
export type RejectionType =
  | "no-interview"
  | "after-phone-screening"
  | "after-first-interview"
  | "after-second-interview";

/** Rejection record */
export interface Rejection extends BaseEntity {
  company: string;
  role: string;
  reason: string;
  appliedDate?: string;
  decisionDate: string;
  rejectionType: RejectionType;
  phoneScreenDate?: string;
  firstInterviewDate?: string;
  secondInterviewDate?: string;
  employmentType?: string;
  location?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  url?: string;
  logoUrl?: string;
  notes?: string;
}

/** Rejection type display labels */
export const REJECTION_TYPE_LABELS: Record<RejectionType, string> = {
  "no-interview": "No interview",
  "after-phone-screening": "After phone screening",
  "after-first-interview": "After first interview",
  "after-second-interview": "After second interview",
};
