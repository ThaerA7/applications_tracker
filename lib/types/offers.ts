/**
 * Offer-related type definitions
 */
import type { BaseEntity } from "./common";

/** Offer record */
export interface Offer extends BaseEntity {
  company: string;
  role: string;
  location?: string;
  startDate?: string;
  salary?: string;
  url?: string;
  logoUrl?: string;
  notes?: string;
  appliedOn?: string;
  employmentType?: string;
  /** Legacy decision date field */
  decisionDate?: string;
  /** When offer was received */
  offerReceivedDate?: string;
  /** When offer was accepted */
  offerAcceptedDate?: string;
  /** When offer was declined */
  offerDeclinedDate?: string;
  /** Legacy boolean for accepted status */
  taken?: boolean;
}

/** View filters for offers page */
export type OffersView = "received" | "declined" | "accepted";

/** Helper functions for offer status */
export const isAcceptedOffer = (offer: Offer): boolean =>
  Boolean(offer.offerAcceptedDate) || Boolean(offer.taken);

export const isDeclinedOffer = (offer: Offer): boolean =>
  Boolean(offer.offerDeclinedDate);

export const isPendingOffer = (offer: Offer): boolean =>
  !isAcceptedOffer(offer) && !isDeclinedOffer(offer);
