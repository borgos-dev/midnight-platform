import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getCurrentCreatorProfile,
  getCurrentUser,
  isSameOrigin,
} from "@/app/lib/auth-helpers";
import {
  subscriptionCreateLimiter,
  getIPFromRequest,
} from "@/app/lib/rate-limit";
import { PLANS } from "@/app/lib/plans";

// Pricing comes from app/lib/plans.ts — never duplicated here.

const schema = z.object({
  plan: z.enum(["VIP_PLUS", "VIP", "PREMIUM"]),
  provider: z.enum(["MTN_MOMO", "ORANGE_MONEY"]),
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getIPFromRequest(req);
  const { success } = await subscriptionCreateLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Verify your email before subscribing" },
      { status: 403 }
    );
  }

  const creator = await getCurrentCreatorProfile();
  if (!creator) {
    return NextResponse.json(
      { error: "Creator profile not found" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { plan, provider } = parsed.data;
  const def = PLANS[plan];

  // VIP+ requires an admin-verified profile. Block forged client calls
  // even though the UI hides the option for unverified creators.
  if (def.requiresVerified && !creator.verified) {
    return NextResponse.json(
      { error: `${def.label} requires a verified account.` },
      { status: 403 },
    );
  }

  // Idempotency: one PENDING subscription per creator
  const existingPending = await prisma.subscription.findFirst({
    where: { creatorProfileId: creator.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (existingPending) {
    return NextResponse.json(existingPending, { status: 200 });
  }

  // Do NOT set endsAt at create-time — that happens at admin approval.
  const now = new Date();
  const subscription = await prisma.subscription.create({
    data: {
      creatorProfileId: creator.id,
      plan,
      provider,
      amountCfa: def.priceCfa,
      durationDays: def.durationDays,
      startsAt: now,
      endsAt: now, // placeholder; admin approval recalculates
    },
  });

  return NextResponse.json(subscription, { status: 201 });
}
