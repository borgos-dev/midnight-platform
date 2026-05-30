import { AccessLevel } from "@prisma/client";

// Must list EVERY AccessLevel enum member. PREMIUM was missing, which made
// `tierRank["PREMIUM"]` undefined → canViewPost() comparisons against a
// PREMIUM post resolved to NaN/false (mis-gating). Keep ordered by privilege.
const tierRank: Record<AccessLevel, number> = {
  REGULAR: 0,
  PREMIUM: 1,
  VIP: 2,
  VIP_PLUS: 3,
};

export function canViewPost(
  userTier: AccessLevel,
  postTier: AccessLevel
) {
  return tierRank[userTier] >= tierRank[postTier];
}

export function getCTA(
  userTier: AccessLevel,
  postTier: AccessLevel
) {
  if (canViewPost(userTier, postTier)) return null;

  if (postTier === AccessLevel.PREMIUM)
    return "Upgrade to Premium to unlock";

  if (postTier === AccessLevel.VIP)
    return "Upgrade to VIP to unlock";

  if (postTier === AccessLevel.VIP_PLUS)
    return "Upgrade to VIP+ to unlock";

  return null;
}