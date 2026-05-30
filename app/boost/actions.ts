"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getCurrentCreatorProfile,
  getCurrentUser,
} from "@/app/lib/auth-helpers";
import { findBoostPlan } from "@/app/lib/boost-pricing";

const schema = z.object({
  durationDays: z.coerce.number().int().positive(),
  provider: z.enum(["MTN_MOMO", "ORANGE_MONEY"]),
});

/**
 * Step 1 of the boost flow. Creator picks a duration + provider on /boost;
 * we mint a Boost row in PENDING_PAYMENT, then redirect them to
 * /boost/proof where they submit their MoMo phone number and ping the
 * admin on WhatsApp.
 *
 * Guardrails:
 *   - Must be signed in with an email-verified account.
 *   - Must have a creatorprofile.
 *   - Must currently be REGULAR tier — upper tiers already get visibility
 *     through their tier; selling them boosts would muddy the value ladder.
 *   - One open boost per creator at a time (PENDING_PAYMENT / PENDING_REVIEW /
 *     ACTIVE). If one exists we send them straight to /boost/proof.
 */
export async function createPendingBoost(
  durationDays: number,
  provider: "MTN_MOMO" | "ORANGE_MONEY",
) {
  const parsed = schema.safeParse({ durationDays, provider });
  if (!parsed.success) {
    throw new Error("Invalid boost configuration.");
  }

  const plan = findBoostPlan(parsed.data.durationDays);
  if (!plan) throw new Error("That boost plan isn't available.");

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) {
    throw new Error("Please verify your email before purchasing a boost.");
  }

  const creator = await getCurrentCreatorProfile();
  if (!creator) redirect("/become-a-member");

  if (creator.tier !== "REGULAR") {
    throw new Error(
      "Boosts are available to Regular-tier creators. Higher tiers already include visibility.",
    );
  }
  if (creator.status !== "APPROVED") {
    throw new Error(
      "Your profile must be approved before you can buy a boost.",
    );
  }

  const existing = await prisma.boost.findFirst({
    where: {
      creatorprofileId: creator.id,
      status: { in: ["PENDING_PAYMENT", "PENDING_REVIEW", "ACTIVE"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    // Don't create a duplicate. If they had drifted away mid-flow, send
    // them back to finish the existing order.
    redirect("/boost/proof");
  }

  await prisma.boost.create({
    data: {
      creatorprofileId: creator.id,
      durationDays: plan.durationDays,
      amountCfa: plan.amountCfa,
      provider: parsed.data.provider,
      status: "PENDING_PAYMENT",
    },
  });

  redirect("/boost/proof");
}
