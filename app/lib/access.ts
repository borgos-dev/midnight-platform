import { AccessLevel } from "@prisma/client";

const tierRank: Record<AccessLevel, number> = {
  REGULAR: 0,
  VIP: 1,
  VIP_PLUS: 2,
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

  if (postTier === AccessLevel.VIP)
    return "Upgrade to VIP to unlock";

  if (postTier === AccessLevel.VIP_PLUS)
    return "Upgrade to VIP+ to unlock";

  return null;
}