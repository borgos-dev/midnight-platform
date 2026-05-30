// Shared helpers for shaping a `creatorprofile` Prisma row into the data
// the CreatorTile component renders. Lives outside any "use server" file
// because Next.js only allows async function exports from those modules.

import { AccessLevel } from "@prisma/client";
import type { CreatorTileData } from "@/app/components/landing/CreatorTile";

export const GRID_PAGE_SIZE = 24;

// Explicit tier priority for the discovery grid:
//   VIP+ (gold) → VIP (purple) → Premium (rose) → Regular (last).
// Lives here (not in the "use server" actions file) because Next.js only
// allows async exports from those modules.
// We query each tier separately then concatenate — alphabetic-desc on the
// enum would put PREMIUM after REGULAR, which is wrong.
export const TIER_PRIORITY: AccessLevel[] = [
  "VIP_PLUS",
  "VIP",
  "PREMIUM",
  "REGULAR",
];

export const creatorSelect = {
  id: true,
  displayName: true,
  location: true,
  neighborhood: true,
  tier: true,
  avatarUrl: true,
  status: true,
  verified: true,
  birthDate: true,
  post: {
    where: { postType: "GALLERY" as const },
    include: { media: { take: 1 } },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
};

export type CreatorRow = {
  id: number;
  displayName: string;
  location: string | null;
  neighborhood: string | null;
  tier: AccessLevel;
  avatarUrl: string | null;
  status: string;
  verified: boolean;
  birthDate: Date | null;
  post: { media: { filePath: string; kind: string }[] }[];
};

// Whole years between birthDate and today. Returns null if birthDate is
// missing or in the future. Computed on the server so cards don't need
// client-side date math (and don't depend on visitor timezone).
export function computeAge(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

// Valid values for the `?sort=` URL param.
// vipPlus/vip/premium narrow to a single tier.
// verified narrows to `verified = true`.
// new narrows to creators created within the last 14 days.
export type SortSlug = "" | "vipPlus" | "vip" | "premium" | "verified" | "new";

export const NEW_CREATOR_DAYS = 14;

// Build the where-clause fragment that combines city + category + sort
// filters. Tier filtering is split out so the multi-tier bucket loop can
// query only the relevant tier(s).
export function buildCreatorFilter(
  selectedCity: string,
  selectedCategory: string,
  selectedSort: SortSlug,
): { where: Record<string, unknown>; tiersToQuery: AccessLevel[] } {
  const where: Record<string, unknown> = { status: "APPROVED" };

  if (selectedCity) where.location = selectedCity;
  if (selectedCategory) {
    where.categories = { some: { category: { slug: selectedCategory } } };
  }
  if (selectedSort === "verified") where.verified = true;
  if (selectedSort === "new") {
    const cutoff = new Date(Date.now() - NEW_CREATOR_DAYS * 86_400_000);
    where.createdAt = { gte: cutoff };
  }

  let tiersToQuery: AccessLevel[] = TIER_PRIORITY;
  if (selectedSort === "vipPlus") tiersToQuery = ["VIP_PLUS"];
  else if (selectedSort === "vip") tiersToQuery = ["VIP"];
  else if (selectedSort === "premium") tiersToQuery = ["PREMIUM"];

  return { where, tiersToQuery };
}

/**
 * Shape a creatorprofile row into the data the CreatorTile renders.
 *
 * `views` used to come from `creatorprofile.profileViewsMonth` — that column
 * was dropped along with its today/week siblings because it never reset. The
 * view count now arrives from a windowed AnalyticsEvent aggregate computed
 * by the caller (homepage `page.tsx` batches counts for all visible
 * creators in two queries; see `getViewCountsForCreators` in lib/analytics).
 * Defaults to 0 so callers that don't have a count yet still get a valid
 * tile (the Eye-icon row simply renders as hidden in that case).
 *
 * `rating` is an optional aggregate from the `Review` table — populated
 * only when the creator has crossed the visibility threshold (default 5).
 * Passed in by the caller, which batches the lookup for the whole page;
 * see `getCreatorRatingSummariesAboveThreshold` in lib/reviews-server.
 */
export function shapeCreator(
  c: CreatorRow,
  views: number = 0,
  rating: { average: number; count: number } | null = null,
): CreatorTileData {
  return {
    id: c.id,
    name: c.displayName,
    city: c.location ?? "",
    neighborhood: c.neighborhood,
    tier: c.tier,
    avatarUrl: c.avatarUrl ?? null,
    verified: c.verified,
    age: computeAge(c.birthDate),
    views,
    rating,
    mediaUrl: c.post[0]?.media[0]?.filePath ?? null,
    mediaKind: c.post[0]?.media[0]?.kind ?? null,
  };
}
