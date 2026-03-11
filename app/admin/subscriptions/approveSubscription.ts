import { prisma } from "@/lib/prisma";
import { AccessLevel, CreatorStatus } from "@prisma/client";

function resolveTier(plan: AccessLevel): AccessLevel {
  if (plan === "VIP_PLUS" || plan === "VIP") {
    return plan;
  }
  return "REGULAR";
}

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

    if (subscription.status === "PAID") {
      return subscription;
    }

    if (!subscription.endsAt) {
      throw new Error("Subscription end date missing");
    }

    const updatedSubscription = await tx.subscription.update({
      where: { id },
      data: {
        status: "PAID",
        startsAt: subscription.startsAt ?? new Date(),
        endsAt: subscription.endsAt,
      },
    });

    await tx.creatorprofile.update({
      where: { id: subscription.creatorProfileId },
      data: {
        tier: resolveTier(subscription.plan),
        status: CreatorStatus.APPROVED,
        subscriptionEndsAt: subscription.endsAt,
      },
    });

    return updatedSubscription;
  });
}
