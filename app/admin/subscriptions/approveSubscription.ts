import { prisma } from "@/lib/prisma";
import { AccessLevel, CreatorStatus } from "@prisma/client";

function resolveTier(plan: AccessLevel): AccessLevel {
  if (plan === "VIP_PLUS" || plan === "VIP" || plan === "PREMIUM") return plan;
  return "REGULAR";
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function approveSubscriptionById(id: number) {
  if (!id || Number.isNaN(id)) {
    throw new Error("Invalid subscription id");
  }

  return prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Idempotent — already paid → return as-is
    if (subscription.status === "PAID") {
      return subscription;
    }

    // Recalculate dates at approval time — never trust the PENDING `endsAt`
    const now = new Date();
    const startsAt = now;
    const endsAt = new Date(
      now.getTime() + subscription.durationDays * DAY_MS
    );

    const updatedSubscription = await tx.subscription.update({
      where: { id },
      data: {
        status: "PAID",
        startsAt,
        endsAt,
      },
    });

    await tx.creatorprofile.update({
      where: { id: subscription.creatorProfileId },
      data: {
        tier: resolveTier(subscription.plan),
        status: CreatorStatus.APPROVED,
        subscriptionEndsAt: endsAt,
      },
    });

    return updatedSubscription;
  });
}
