"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  getCurrentCreatorProfile,
  getCurrentUser,
} from "@/app/lib/auth-helpers";
import { PLANS, type PaidPlanCode } from "@/app/lib/plans";

const schema = z.object({
  plan: z.enum(["VIP_PLUS", "VIP", "PREMIUM"]),
  provider: z.enum(["MTN_MOMO", "ORANGE_MONEY"]),
});

export async function createPendingSubscription(
  plan: PaidPlanCode,
  provider: "MTN_MOMO" | "ORANGE_MONEY"
) {
  const parsed = schema.safeParse({ plan, provider });
  if (!parsed.success) throw new Error("Invalid plan or provider");

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) throw new Error("Verify your email before subscribing");

  const creator = await getCurrentCreatorProfile();
  if (!creator) redirect("/upgrade/proof");

  const def = PLANS[plan];

  // Verification gate — VIP+ requires an admin-verified profile. Verification
  // is a manual off-platform ID check. Other paid plans stay open.
  if (def.requiresVerified && !creator.verified) {
    throw new Error(
      `${def.label} requires a verified account. Contact support to start the verification process.`,
    );
  }

  const existing = await prisma.subscription.findFirst({
    where: { creatorProfileId: creator.id, status: "PENDING" },
  });
  if (existing) {
    redirect("/upgrade/proof");
  }

  const now = new Date();

  await prisma.subscription.create({
    data: {
      creatorProfileId: creator.id,
      plan,
      provider,
      status: "PENDING",
      amountCfa: def.priceCfa,
      startsAt: now,
      endsAt: now, // placeholder — admin approval recalculates
      durationDays: def.durationDays,
    },
  });

  redirect("/upgrade/proof");
}
