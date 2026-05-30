"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/app/lib/audit";
import { AccessLevel, CreatorStatus } from "@prisma/client";

/**
 * Founding-creator grant. Creates a $0 ACTIVE subscription so the creator
 * gets a paid tier for free during the launch period. Implementation reuses
 * the existing subscription flow end-to-end — the tier resolution, the
 * expiry sweep, and the auto-downgrade to Regular at endsAt all work
 * untouched. The amountCfa=0 row is the only marker that distinguishes a
 * promo grant from a normal paid one (plus the audit log entry below).
 *
 * Why not a separate "trial" model? Two sources of truth ("active sub" vs
 * "active trial") would drift out of sync. Reusing Subscription keeps the
 * tier resolver authoritative.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

type Result = { ok: true } | { ok: false; error: string };

const ALLOWED_PLANS = new Set<AccessLevel>(["PREMIUM", "VIP", "VIP_PLUS"]);
const MAX_DURATION_DAYS = 365; // sanity cap so a typo can't grant a decade

async function requireAdminUserId(): Promise<number> {
  const session = (await auth()) as { user?: { id?: string } };
  const userId = Number(session?.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Unauthorized");
  }
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") throw new Error("Forbidden");
  return userId;
}

export async function grantFoundingTier(formData: FormData): Promise<Result> {
  const adminId = await requireAdminUserId();

  const creatorprofileId = Number(formData.get("creatorprofileId"));
  const planRaw = String(formData.get("plan") ?? "");
  const durationRaw = Number(formData.get("durationDays"));
  const markVerified = formData.get("markVerified") === "on";

  if (!Number.isInteger(creatorprofileId) || creatorprofileId <= 0) {
    return { ok: false, error: "Invalid creator." };
  }
  if (!ALLOWED_PLANS.has(planRaw as AccessLevel)) {
    return { ok: false, error: "Invalid plan." };
  }
  const plan = planRaw as AccessLevel;
  if (
    !Number.isFinite(durationRaw) ||
    durationRaw < 1 ||
    durationRaw > MAX_DURATION_DAYS
  ) {
    return {
      ok: false,
      error: `Duration must be between 1 and ${MAX_DURATION_DAYS} days.`,
    };
  }
  const durationDays = Math.round(durationRaw);

  const creator = await prisma.creatorprofile.findUnique({
    where: { id: creatorprofileId },
    select: {
      id: true,
      userId: true,
      displayName: true,
      tier: true,
      verified: true,
      status: true,
      subscriptionEndsAt: true,
    },
  });
  if (!creator) return { ok: false, error: "Creator not found." };

  const now = new Date();

  // Refuse if there's already a live subscription. Prevents double-granting
  // and accidental clobbering of a creator who's paying. If you need to
  // extend or stack, cancel the existing row in /admin/subscriptions first.
  const liveSub = await prisma.subscription.findFirst({
    where: {
      creatorProfileId: creator.id,
      status: { in: ["PENDING", "PAID"] },
      endsAt: { gt: now },
    },
    orderBy: { endsAt: "desc" },
  });
  if (liveSub) {
    return {
      ok: false,
      error: `Creator already has an active subscription (${liveSub.plan}, ends ${liveSub.endsAt.toLocaleDateString()}). Cancel it first if you need to replace it.`,
    };
  }

  const startsAt = now;
  const endsAt = new Date(now.getTime() + durationDays * DAY_MS);

  // Both the subscription write + the creator-profile flip happen inside
  // a single transaction so a crash mid-grant can't leave us with a
  // subscription that says PAID but a creator still at REGULAR.
  await prisma.$transaction(async (tx) => {
    await tx.subscription.create({
      data: {
        creatorProfileId: creator.id,
        plan,
        provider: "MTN_MOMO", // schema enum has no PROMO; amountCfa=0 + audit log are the markers
        status: "PAID",
        amountCfa: 0,
        durationDays,
        startsAt,
        endsAt,
        // Stash a flag in phoneNumber (it's nullable + free-text) so future
        // analytics can filter founding grants without parsing audit logs.
        phoneNumber: "FOUNDING_GRANT",
      },
    });

    await tx.creatorprofile.update({
      where: { id: creator.id },
      data: {
        tier: plan,
        subscriptionEndsAt: endsAt,
        // Auto-approve if the creator was still PENDING — an invited
        // founding creator shouldn't have to wait in the approvals queue.
        status: CreatorStatus.APPROVED,
        // VIP+ requires verified=true on the checkout path. Admin grants
        // bypass that gate IF the admin explicitly attests via the checkbox.
        // The admin form auto-checks it for VIP+ to make this deliberate.
        ...(markVerified && !creator.verified ? { verified: true } : {}),
      },
    });
  });

  // SUBSCRIPTION_APPROVED is the closest existing enum value (we ARE
  // approving a subscription — just a free one). The metadata flag
  // `foundingGrant: true` is how downstream audit views distinguish
  // promo grants from real payments.
  await logAdminAction(prisma, {
    adminUserId: adminId,
    action: "SUBSCRIPTION_APPROVED",
    targetType: "creatorprofile",
    targetId: creator.id,
    note: `Founding ${plan} grant — ${durationDays} days`,
    metadata: {
      foundingGrant: true,
      plan,
      durationDays,
      endsAt: endsAt.toISOString(),
      markedVerified: markVerified && !creator.verified,
    },
  });

  revalidatePath("/admin/founding-creators");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Amendment actions — fix a grant that was made by mistake.
//
// Both operate on an existing founding-grant subscription (the
// phoneNumber="FOUNDING_GRANT" marker scopes them so a normal paid
// subscription can't accidentally be touched from this admin surface).
// ─────────────────────────────────────────────────────────────────────────

async function loadFoundingGrantOrFail(
  subscriptionId: number,
): Promise<
  | {
      ok: true;
      sub: {
        id: number;
        plan: AccessLevel;
        endsAt: Date;
        creatorProfileId: number;
      };
    }
  | { ok: false; error: string }
> {
  if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
    return { ok: false, error: "Invalid subscription id." };
  }
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      plan: true,
      endsAt: true,
      creatorProfileId: true,
      phoneNumber: true,
      amountCfa: true,
      status: true,
    },
  });
  if (!sub) return { ok: false, error: "Subscription not found." };

  // Guard against amending a real paid sub through this surface — the
  // founding-grant flag is the contract. A paying creator's tier should
  // be edited from /admin/subscriptions, not here.
  if (sub.phoneNumber !== "FOUNDING_GRANT" || sub.amountCfa !== 0) {
    return {
      ok: false,
      error:
        "Not a founding grant. Manage paid subscriptions from /admin/subscriptions instead.",
    };
  }
  if (sub.status !== "PAID") {
    return { ok: false, error: "This grant is already cancelled or expired." };
  }
  return {
    ok: true,
    sub: {
      id: sub.id,
      plan: sub.plan,
      endsAt: sub.endsAt,
      creatorProfileId: sub.creatorProfileId,
    },
  };
}

/**
 * Cancel a founding grant outright. Use when the creator was granted by
 * mistake or you want to end the trial early. Marks the subscription
 * CANCELLED, downgrades the creator to Regular, and clears the
 * subscriptionEndsAt pointer so the expiry sweep doesn't re-process it.
 *
 * Verified status is intentionally NOT reverted — verification represents
 * a real-world ID check that doesn't become untrue just because the trial
 * ended. If the admin needs to un-verify they can do it from the creator
 * admin page.
 */
export async function cancelFoundingGrant(
  formData: FormData,
): Promise<Result> {
  const adminId = await requireAdminUserId();
  const subscriptionId = Number(formData.get("subscriptionId"));
  const loaded = await loadFoundingGrantOrFail(subscriptionId);
  if (!loaded.ok) return loaded;
  const { sub } = loaded;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: sub.id },
      data: { status: "CANCELLED" },
    });
    await tx.creatorprofile.update({
      where: { id: sub.creatorProfileId },
      data: { tier: "REGULAR", subscriptionEndsAt: null },
    });
  });

  await logAdminAction(prisma, {
    adminUserId: adminId,
    action: "SUBSCRIPTION_APPROVED", // reused enum value; metadata distinguishes the op
    targetType: "creatorprofile",
    targetId: sub.creatorProfileId,
    note: `Founding ${sub.plan} grant cancelled`,
    metadata: {
      foundingGrant: true,
      operation: "cancel",
      subscriptionId: sub.id,
      previousPlan: sub.plan,
    },
  });

  revalidatePath("/admin/founding-creators");
  return { ok: true };
}

/**
 * Change the tier of an active founding grant in place. End date is
 * preserved — only the plan + creator.tier flip. Used when the right
 * creator got the wrong tier (e.g. VIP+ by mistake, meant VIP).
 *
 * If the new tier is VIP+ and the creator isn't verified, we auto-flip
 * verified=true since this admin action carries the same trust attestation
 * as the original grant flow.
 */
export async function changeFoundingGrantTier(
  formData: FormData,
): Promise<Result> {
  const adminId = await requireAdminUserId();
  const subscriptionId = Number(formData.get("subscriptionId"));
  const newPlanRaw = String(formData.get("plan") ?? "");

  if (!ALLOWED_PLANS.has(newPlanRaw as AccessLevel)) {
    return { ok: false, error: "Invalid tier." };
  }
  const newPlan = newPlanRaw as AccessLevel;

  const loaded = await loadFoundingGrantOrFail(subscriptionId);
  if (!loaded.ok) return loaded;
  const { sub } = loaded;

  if (sub.plan === newPlan) {
    return { ok: false, error: "Already on that tier." };
  }

  const creator = await prisma.creatorprofile.findUnique({
    where: { id: sub.creatorProfileId },
    select: { verified: true },
  });
  const needsVerifiedFlip =
    newPlan === "VIP_PLUS" && creator?.verified === false;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: sub.id },
      data: { plan: newPlan },
    });
    await tx.creatorprofile.update({
      where: { id: sub.creatorProfileId },
      data: {
        tier: newPlan,
        // endsAt is unchanged — same expiry window applies
        ...(needsVerifiedFlip ? { verified: true } : {}),
      },
    });
  });

  await logAdminAction(prisma, {
    adminUserId: adminId,
    action: "SUBSCRIPTION_APPROVED",
    targetType: "creatorprofile",
    targetId: sub.creatorProfileId,
    note: `Founding grant tier changed ${sub.plan} → ${newPlan}`,
    metadata: {
      foundingGrant: true,
      operation: "changeTier",
      subscriptionId: sub.id,
      previousPlan: sub.plan,
      newPlan,
      autoVerified: needsVerifiedFlip,
    },
  });

  revalidatePath("/admin/founding-creators");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Void-returning FormData wrappers for the inline <form action={...}>
// bindings on /admin/founding-creators/page.tsx.
//
// React's form-action type insists on `void | Promise<void>`, but the
// underlying actions return a Result object so the client GrantForm can
// surface success/error feedback. These wrappers swallow the return so the
// server-rendered page can bind them directly to a form without TypeScript
// complaining. Errors still propagate as thrown exceptions when something
// truly goes wrong (admin guard, validation) — the wrappers just discard
// the `{ ok: true | false }` discriminant the page doesn't read.
// ─────────────────────────────────────────────────────────────────────────

export async function cancelFoundingGrantForm(formData: FormData): Promise<void> {
  await cancelFoundingGrant(formData);
}

export async function changeFoundingGrantTierForm(formData: FormData): Promise<void> {
  await changeFoundingGrantTier(formData);
}
