import { prisma } from "@/lib/prisma";

/**
 * Bulk-downgrade any creator whose subscriptionEndsAt has passed. Atomic — a
 * single UPDATE … WHERE so concurrent approvals can't race a stale read/write
 * pair into clobbering a fresh subscription.
 */
// Paid tiers — kept in one constant so the expiry / repair queries here
// stay in sync if a future tier gets added (or PREMIUM gets removed).
const PAID_TIERS = ["PREMIUM", "VIP", "VIP_PLUS"] as const;

export async function refreshExpiredSubscriptions() {
  const now = new Date();

  await prisma.creatorprofile.updateMany({
    where: {
      subscriptionEndsAt: { not: null, lt: now },
      tier: { in: [...PAID_TIERS] },
    },
    data: {
      tier: "REGULAR",
      subscriptionEndsAt: null,
    },
  });
}

/**
 * Ensure a single creator's tier reflects current reality. Single atomic
 * updateMany — safe to run concurrently with admin approval; whichever update
 * is freshest wins by row state, never by JS-side state.
 */
export async function enforceSubscriptionStatus(userId: number) {
  const now = new Date();

  // Downgrade if expired
  await prisma.creatorprofile.updateMany({
    where: {
      userId,
      subscriptionEndsAt: { not: null, lt: now },
      tier: { in: [...PAID_TIERS] },
    },
    data: { tier: "REGULAR", subscriptionEndsAt: null },
  });

  // Repair any creator marked at a paid tier but with no end date.
  // Founding-creator grants always set subscriptionEndsAt, so this only
  // catches genuinely orphaned tier flags (manual edits, old data).
  await prisma.creatorprofile.updateMany({
    where: {
      userId,
      subscriptionEndsAt: null,
      tier: { in: [...PAID_TIERS] },
    },
    data: { tier: "REGULAR" },
  });
}
