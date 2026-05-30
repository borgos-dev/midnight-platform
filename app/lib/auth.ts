// app/lib/auth.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { enforceSubscriptionStatus } from "@/app/lib/subscription";

export async function getCurrentCreator() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const userId = Number((session.user as { id?: string }).id);

  // Make tier reflect reality before returning the row to a caller that
  // is almost certainly about to make a tier-gated decision.
  await enforceSubscriptionStatus(userId);

  const creator = await prisma.creatorprofile.findUnique({
    where: { userId },
  });

  if (!creator) {
    throw new Error("Creator profile not found");
  }

  return creator;
}
