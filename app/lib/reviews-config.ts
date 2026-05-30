// Shared constants + types for the visitor-authored review system.
// Plain module (no "use server") so it can be imported from both server
// actions and client components without the "only async exports" rule.

import type { ReviewStatus } from "@prisma/client";

/**
 * Star rating bounds. The form's StarPicker constrains the UI; the server
 * action re-clamps as defense in depth (request body can be forged).
 */
export const MIN_RATING = 1;
export const MAX_RATING = 5;

/**
 * Free-text comment cap. Matches the schema's VarChar(800). 800 chars is
 * enough for a paragraph review — longer reviews tend to drift into
 * essays that nobody reads on a mobile creator card.
 */
export const COMMENT_MAX_LENGTH = 800;

/**
 * The platform's homepage card shows a creator's average rating + count
 * only when the creator has accumulated at least this many reviews. Below
 * the floor a single 1-star or 5-star outlier would mislead the average,
 * so we hide the badge until there's signal.
 */
export const RATING_VISIBILITY_THRESHOLD = 5;

/** Public-facing row shape. Used by the profile reviews list. */
export type PublicReviewRow = {
  id: number;
  rating: number;
  /** Null if not yet approved (in which case status is LIVE — comment
   *  hidden) OR if the comment was rejected (status COMMENT_REJECTED). */
  comment: string | null;
  status: ReviewStatus;
  createdAt: Date;
};

/** Aggregate for the badge / homepage card. */
export type CreatorRatingSummary = {
  averageRating: number;
  reviewCount: number;
};

/**
 * Standard "human" formatter for the average rating shown on a chip
 * (`4.7` not `4.72319`). Two decimals would feel pseudo-precise on a
 * social rating; one decimal reads as honest.
 */
export function formatAverageRating(avg: number): string {
  return avg.toFixed(1);
}
