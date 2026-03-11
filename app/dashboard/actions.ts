"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function upgradeTierAction(newTier: "VIP" | "VIP_PLUS") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const creator = await prisma.creatorprofile.findUnique({
    where: { userId: Number(session.user.id) },
  });

  if (!creator) throw new Error("Creator profile not found");

  const amountCfa = newTier === "VIP" ? 10000 : 20000;

  await prisma.subscription.create({
    data: {
      creatorProfileId: creator.id,
      plan: newTier,
      provider: "MTN_MOMO",
      status: "PENDING",
      durationDays: 30,
      amountCfa,
      startsAt: new Date(),
      endsAt: new Date(
        new Date().setDate(new Date().getDate() + 30)
      ),
    },
  });
}