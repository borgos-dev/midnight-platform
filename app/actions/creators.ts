"use server";

import { prisma } from "@/lib/prisma";
import {
  GRID_PAGE_SIZE,
  buildCreatorFilter,
  creatorSelect,
  shapeCreator,
  type CreatorRow,
  type SortSlug,
} from "@/app/lib/creator-shape";
import {
  getViewCountsForCreators,
  startOfRollingMonth,
} from "@/lib/analytics";
import { getCreatorRatingSummariesAboveThreshold } from "@/app/lib/reviews-server";
import type { CreatorTileData } from "@/app/components/landing/CreatorTile";

/**
 * Fetch one page of approved creators, prioritized by tier (VIP+ first)
 * and within each tier sorted by monthly views descending.
 *
 * Pagination strategy: we fetch the candidate set per tier, compute a
 * single batched windowed view-count aggregate for the union of IDs, then
 * sort and slice in JS. Mirrors page.tsx so Load More returns the same
 * order as the initial server render.
 *
 * Previously this used `orderBy: profileViewsMonth desc` at the DB layer.
 * That column was dropped because it never reset — the values were
 * effectively lifetime totals labeled as monthly. The new pattern relies
 * on AnalyticsEvent (the source of truth for visits) and a rolling-30-day
 * window so the sort is honestly "monthly" at any moment.
 */
// Server-action input arrives as a plain string — whitelist it so an unknown
// value can't slip past the type system and influence the where-clause.
const ALLOWED_SORTS = new Set<SortSlug>([
  "vipPlus",
  "vip",
  "premium",
  "verified",
  "new",
]);

export async function fetchMoreCreators(
  page: number,
  selectedCity: string,
  selectedCategory: string = "",
  selectedSort: string = "",
): Promise<{ creators: CreatorTileData[]; hasMore: boolean }> {
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * GRID_PAGE_SIZE;
  const safeSort: SortSlug = ALLOWED_SORTS.has(selectedSort as SortSlug)
    ? (selectedSort as SortSlug)
    : "";

  const { where: baseWhere, tiersToQuery } = buildCreatorFilter(
    selectedCity,
    selectedCategory,
    safeSort,
  );

  // VIP+ creators live in the non-paginated spotlight shelf rendered above the
  // main grid (see page.tsx), so Load More only ever fills in
  // VIP / PREMIUM / REGULAR. We exclude VIP_PLUS here unconditionally.
  const mainTiers = tiersToQuery.filter((t) => t !== "VIP_PLUS");

  // No orderBy at the DB layer — we rank in JS from windowed counts. We
  // also can't apply `take` here because the highest-view creators might
  // not be the most-recently-created ones; we'd skip them otherwise.
  const buckets = await Promise.all(
    mainTiers.map((tier) =>
      prisma.creatorprofile.findMany({
        where: { ...baseWhere, tier },
        select: creatorSelect,
      }),
    ),
  );
  const all = buckets.flat() as CreatorRow[];

  // Batched groupBys — one for monthly view counts, one for rating
  // summaries above the visibility threshold. Both keyed by creator id.
  const allIds = all.map((c) => c.id);
  const [monthlyViews, ratingSummaries] = await Promise.all([
    getViewCountsForCreators(allIds, startOfRollingMonth()),
    getCreatorRatingSummariesAboveThreshold(allIds),
  ]);

  const sorted = all.sort(
    (a, b) => (monthlyViews.get(b.id) ?? 0) - (monthlyViews.get(a.id) ?? 0),
  );

  const sliced = sorted.slice(offset, offset + GRID_PAGE_SIZE);
  const hasMore = sorted.length > offset + GRID_PAGE_SIZE;

  return {
    creators: sliced.map((c) => {
      const summary = ratingSummaries.get(c.id);
      return shapeCreator(
        c,
        monthlyViews.get(c.id) ?? 0,
        summary
          ? { average: summary.averageRating, count: summary.reviewCount }
          : null,
      );
    }),
    hasMore,
  };
}
