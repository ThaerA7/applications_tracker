/**
 * Common types used across the application
 */

/** Base entity with unique identifier */
export interface BaseEntity {
  id: string;
}

/** Contact information */
export interface Contact {
  name?: string;
  email?: string;
  phone?: string;
}

/** Employment type options */
export type EmploymentType =
  | "Full-time"
  | "Part-time"
  | "Internship"
  | "Working student"
  | "Contract"
  | "Temporary"
  | "Mini-job"
  | "Freelance";

export const EMPLOYMENT_OPTIONS: EmploymentType[] = [
  "Full-time",
  "Part-time",
  "Internship",
  "Working student",
  "Contract",
  "Temporary",
  "Mini-job",
  "Freelance",
];

/** Interview type options */
export type InterviewType = "phone" | "video" | "in-person";

/** Activity log types */
export type ActivityType =
  | "added"
  | "edited"
  | "deleted"
  | "moved_to_interviews"
  | "moved_to_rejected"
  | "moved_to_withdrawn";

/** Activity variants for different sections */
export type ActivityVariant =
  | "applied"
  | "interviews"
  | "rejected"
  | "withdrawn"
  | "offers";

/** Generic activity log item */
export interface ActivityItem {
  id: string;
  appId: string;
  type: ActivityType;
  timestamp: string;
  company: string;
  role?: string;
  location?: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  appliedOn?: string;
  offerReceivedDate?: string;
  offerAcceptedDate?: string;
  offerDeclinedDate?: string;
}
