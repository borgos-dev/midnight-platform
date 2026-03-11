import { prisma } from "@/lib/prisma";

export async function refreshExpiredSubscriptions() {
  const now = new Date();

  await prisma.creatorprofile.updateMany({
    where: {
      subscriptionEndsAt: {
        not: null,
        lt: now,
      },
      tier: {
        in: ["VIP", "VIP_PLUS"],
      },
    },
    data: {
      tier: "REGULAR",
      subscriptionEndsAt: null,
    },
  });
}

export async function enforceSubscriptionStatus(userId: number) {
  const creator = await prisma.creatorprofile.findUnique({
    where: { userId },
  });

  if (!creator) return;

  // No subscription → ensure REGULAR
  if (!creator.subscriptionEndsAt) {
    if (creator.tier !== "REGULAR") {
      await prisma.creatorprofile.update({
        where: { id: creator.id },
        data: { tier: "REGULAR" },
      });
    }
    return;
  }

  const now = new Date();

  if (creator.subscriptionEndsAt < now) {
    await prisma.creatorprofile.update({
      where: { id: creator.id },
      data: {
        tier: "REGULAR",
        subscriptionEndsAt: null,
      },
    });
  }
}