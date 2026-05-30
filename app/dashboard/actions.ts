"use server";

import { prisma } from "@/lib/prisma";
import {
  getCurrentCreatorProfile,
  getCurrentUser,
} from "@/app/lib/auth-helpers";
import { PLANS, type PaidPlanCode } from "@/app/lib/plans";

export async function upgradeTierAction(newTier: PaidPlanCode) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!user.emailVerified) throw new Error("Verify your email before subscribing");

  const creator = await getCurrentCreatorProfile();
  if (!creator) throw new Error("Creator profile not found");

  const def = PLANS[newTier];
  if (def.requiresVerified && !creator.verified) {
    throw new Error(
      `${def.label} requires a verified account. Contact support to start verification.`,
    );
  }

  // Idempotency — one PENDING per creator. Returns the existing row so
  // callers can route the visitor straight to /upgrade/proof.
  const existing = await prisma.subscription.findFirst({
    where: { creatorProfileId: creator.id, status: "PENDING" },
  });
  if (existing) return existing;

  const now = new Date();

  return prisma.subscription.create({
    data: {
      creatorProfileId: creator.id,
      plan: newTier,
      provider: "MTN_MOMO",
      status: "PENDING",
      durationDays: def.durationDays,
      amountCfa: def.priceCfa,
      startsAt: now,
      endsAt: now, // placeholder — admin approval recalculates
    },
  });
}
