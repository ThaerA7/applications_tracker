/**
 * Interview-related type definitions
 */
import type { BaseEntity, Contact, InterviewType } from "./common";

export type { InterviewType };

/** Interview stage for UI display */
export type InterviewStage = "upcoming" | "past" | "done";

/** Interview record */
export interface Interview extends BaseEntity {
  company: string;
  role: string;
  location?: string;
  contact?: Contact;
  date: string; // ISO datetime string, e.g. 2025-11-12T14:00
  type: InterviewType;
  url?: string;
  logoUrl?: string;
  appliedOn?: string;
  employmentType?: string;
  notes?: string;
}

/** Interview with calculated stage for display */
export interface InterviewWithStage extends Interview {
  stage: InterviewStage;
}
