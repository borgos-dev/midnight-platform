import { prisma } from "@/lib/prisma";

/**
 * Lazily expire boosts whose `endsAt` has passed.
 *
 * Called on a few hot paths (dashboard load, /boost page, admin queue) so
 * the system stays correct without a cron. Each call is two indexed writes
 * at most — cheap.
 *
 * Behavior:
 *   - Flip every ACTIVE boost whose endsAt <= now to EXPIRED.
 *   - Pause the linked Ad rows in the same step so they stop being served
 *     on the homepage. (The homepage's ad query already filters by
 *     `endsAt`, so this is belt-and-braces — but keeping Ad.status
 *     consistent makes the admin views readable.)
 */
export async function expireDueBoosts(): Promise<void> {
  const now = new Date();

  const due = await prisma.boost.findMany({
    where: { status: "ACTIVE", endsAt: { lte: now } },
    select: { id: true, adId: true },
  });
  if (due.length === 0) return;

  const adIds = due
    .map((b) => b.adId)
    .filter((id): id is number => typeof id === "number");

  await prisma.$transaction([
    prisma.boost.updateMany({
      where: { id: { in: due.map((b) => b.id) } },
      data: { status: "EXPIRED" },
    }),
    ...(adIds.length > 0
      ? [
          prisma.ad.updateMany({
            where: { id: { in: adIds } },
            data: { status: "PAUSED" },
          }),
        ]
      : []),
  ]);
}
