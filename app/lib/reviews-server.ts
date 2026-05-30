// Server-only helpers for the review system. Plain module (no "use server")
// because these are called directly from server components, not as RPC
// endpoints. Keeps the actions file (reviews.ts) pure async-function-only.

import { prisma } from "@/lib/prisma";
import {
  RATING_VISIBILITY_THRESHOLD,
  type CreatorRatingSummary,
  type PublicReviewRow,
} from "./reviews-config";

/**
 * Compute the average rating + review count for a creator.
 *
 * Only counts reviews where the star is publicly visible (status LIVE,
 * COMMENT_APPROVED, or COMMENT_REJECTED — the star always shows; only
 * fully HIDDEN reviews are excluded). Returns null when there are zero
 * non-hidden reviews so the caller can decide between "no reviews yet"
 * and "show count".
 */
export async function getCreatorRatingSummary(
  creatorprofileId: number,
): Promise<CreatorRatingSummary | null> {
  const agg = await prisma.review.aggregate({
    where: {
      creatorprofileId,
      status: { not: "HIDDEN" },
    },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const count = agg._count._all;
  const avg = agg._avg.rating;
  if (count === 0 || avg === null) return null;
  return { averageRating: avg, reviewCount: count };
}

/**
 * Same as getCreatorRatingSummary but only returns a summary when the
 * creator has crossed the visibility threshold (default 5). Used by the
 * homepage card renderer so a creator with one 5-star review doesn't
 * show as "5.0★ on Midnight" prematurely.
 */
export async function getCreatorRatingSummaryAboveThreshold(
  creatorprofileId: number,
): Promise<CreatorRatingSummary | null> {
  const summary = await getCreatorRatingSummary(creatorprofileId);
  if (!summary) return null;
  if (summary.reviewCount < RATING_VISIBILITY_THRESHOLD) return null;
  return summary;
}

/**
 * Batched version of getCreatorRatingSummaryAboveThreshold for the
 * homepage. One groupBy query covers every card. The map's keys are
 * the creator ids; entries are present only when the threshold is
 * crossed, so callers can do `summaries.get(id) ?? null` to decide.
 */
export async function getCreatorRatingSummariesAboveThreshold(
  creatorprofileIds: number[],
): Promise<Map<number, CreatorRatingSummary>> {
  if (creatorprofileIds.length === 0) return new Map();
  const rows = await prisma.review.groupBy({
    by: ["creatorprofileId"],
    where: {
      creatorprofileId: { in: creatorprofileIds },
      status: { not: "HIDDEN" },
    },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const map = new Map<number, CreatorRatingSummary>();
  for (const row of rows) {
    if (
      row._count._all >= RATING_VISIBILITY_THRESHOLD &&
      row._avg.rating !== null
    ) {
      map.set(row.creatorprofileId, {
        averageRating: row._avg.rating,
        reviewCount: row._count._all,
      });
    }
  }
  return map;
}

/**
 * List public reviews for a creator's profile page, newest first.
 *
 * Comment visibility rule:
 *   - status COMMENT_APPROVED   → show comment
 *   - status LIVE / REJECTED   → hide comment (star only)
 *   - status HIDDEN            → row excluded entirely
 */
export async function listPublicReviewsForCreator(
  creatorprofileId: number,
  limit: number = 20,
): Promise<PublicReviewRow[]> {
  const rows = await prisma.review.findMany({
    where: {
      creatorprofileId,
      status: { not: "HIDDEN" },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      rating: true,
      comment: true,
      status: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    // Strip the comment from the public payload unless the admin has
    // approved it. The server NEVER ships unmoderated text to the client.
    comment: r.status === "COMMENT_APPROVED" ? r.comment : null,
    status: r.status,
    createdAt: r.createdAt,
  }));
}
