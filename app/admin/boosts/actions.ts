"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/app/lib/audit";

// DB-checked admin gate — see app/admin/creators-pending/actions.ts.
async function getAdminId(): Promise<number | null> {
  const session = (await auth()) as { user?: { id?: string } };
  const rawId = session?.user?.id;
  if (!rawId) return null;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? id : null;
}

/**
 * Admin-only approval action. Flips a boost from PENDING_REVIEW to ACTIVE,
 * creates the Ad row that will appear on the homepage, and links them so
 * the boost-expiry cron can pause the ad later.
 *
 * Wrapped in a single transaction so we never end up with an ACTIVE boost
 * that points at no ad (or worse, an ad that no boost owns).
 */
export async function approveBoost(formData: FormData) {
  const adminId = await getAdminId();
  if (!adminId) throw new Error("Forbidden");

  const id = Number(formData.get("boostId"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid boostId");
  }

  const boost = await prisma.boost.findUnique({
    where: { id },
    include: {
      creatorprofile: { select: { id: true, displayName: true, location: true } },
    },
  });
  if (!boost) throw new Error("Boost not found");
  if (boost.status !== "PENDING_REVIEW") {
    throw new Error(
      `Can only approve PENDING_REVIEW boosts. Current status: ${boost.status}`,
    );
  }

  const startsAt = new Date();
  const endsAt = new Date(
    startsAt.getTime() + boost.durationDays * 24 * 60 * 60 * 1000,
  );

  // Create the Ad row + flip the boost in one go. Priority 7 sits below
  // house ads (priority 10 in our seed) but above unprioritized creator
  // ads, so paying boosts get reliable rotation without crowding out the
  // platform's own promos.
  await prisma.$transaction(async (tx) => {
    const ad = await tx.ad.create({
      data: {
        kind: "PROMOTED_CREATOR",
        status: "ACTIVE",
        priority: 7,
        title: `Featured: ${boost.creatorprofile.displayName}`,
        body: "Boosted creator. Tap to view their gallery + WhatsApp.",
        ctaLabel: "VIEW PROFILE",
        ctaUrl: `/creator/${boost.creatorprofile.id}`,
        creatorprofileId: boost.creatorprofile.id,
        startsAt,
        endsAt,
        // Leave `city` null for now — boost shows globally. A future
        // enhancement could let creators target their home city.
      },
    });

    await tx.boost.update({
      where: { id: boost.id },
      data: {
        status: "ACTIVE",
        startsAt,
        endsAt,
        adId: ad.id,
      },
    });
    await logAdminAction(tx, {
      adminUserId: adminId,
      action: "BOOST_APPROVED",
      targetType: "boost",
      targetId: boost.id,
      metadata: {
        durationDays: boost.durationDays,
        amountCfa: boost.amountCfa,
        creatorprofileId: boost.creatorprofile.id,
        adId: ad.id,
      },
    });
  });

  revalidatePath("/admin/boosts");
  // The homepage shows the new boosted slot — bust its cache.
  revalidatePath("/");
}

/**
 * Admin rejection. Flips PENDING_REVIEW → REJECTED. No Ad row is created.
 * Reason: payment didn't go through, fraud signal, etc.
 */
export async function rejectBoost(formData: FormData) {
  const adminId = await getAdminId();
  if (!adminId) throw new Error("Forbidden");

  const id = Number(formData.get("boostId"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid boostId");
  }

  await prisma.$transaction(async (tx) => {
    await tx.boost.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    await logAdminAction(tx, {
      adminUserId: adminId,
      action: "BOOST_REJECTED",
      targetType: "boost",
      targetId: id,
    });
  });

  revalidatePath("/admin/boosts");
}
