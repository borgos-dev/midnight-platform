import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getGeoFromRequest, getDeviceFromRequest } from "@/lib/geolocation";
import { createNotification } from "@/app/lib/notifications";
import { eventLimiter, getIPFromRequest } from "@/app/lib/rate-limit";
import { isSameOrigin, getCurrentCreatorProfile } from "@/app/lib/auth-helpers";

const VALID_EVENTS = [
  "profile_view",
  "whatsapp_click",
  // Click on a creator's external profile link (Instagram, OnlyFans, etc.).
  // Server-side this event is written by /api/link-click/[id] during the
  // 302-redirect; the whitelist entry here exists so a future direct call
  // from the client doesn't get rejected as "Invalid payload".
  "external_link_click",
  "search_appear",
  // A/B experiment events — exposure when the CTA renders, click when the
  // upgrade fallback is tapped. Conversion = clicks / exposures per arm.
  "cta_exposure",
  "upgrade_click",
] as const;

const VALID_VARIANTS = ["primary", "primary-lighter"] as const;

const eventSchema = z.object({
  creatorId: z.number().int().positive(),
  eventType: z.enum(VALID_EVENTS),
  source: z.string().max(64).optional(),
  variant: z.enum(VALID_VARIANTS).optional(),
});

const DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

function getVisitorId(req: NextRequest): string {
  return (
    req.cookies.get("vid")?.value ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anon"
  );
}

export async function POST(req: NextRequest) {
  try {
    // 1) CSRF: same-origin only
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) Per-IP rate limit
    const ip = getIPFromRequest(req);
    const { success } = await eventLimiter.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // 3) Validate body
    const body = await req.json().catch(() => null);
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }
    const { creatorId, eventType, variant } = parsed.data;

    // 4) Confirm the creator exists (avoid writing junk rows)
    const creatorExists = await prisma.creatorprofile.findUnique({
      where: { id: creatorId },
      select: { id: true },
    });
    if (!creatorExists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 5) Block self-events (creator inflating their own stats)
    const viewer = await getCurrentCreatorProfile();
    if (viewer?.id === creatorId) {
      return NextResponse.json({ ok: true, skipped: "self" });
    }

    // 6) Per-(visitor, creator, eventType) dedup within 30 min
    const visitorId = getVisitorId(req);
    const recent = await prisma.analyticsEvent.findFirst({
      where: {
        creatorId,
        eventType,
        source: visitorId,
        createdAt: { gte: new Date(Date.now() - DEDUP_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (recent) {
      return NextResponse.json({ ok: true, skipped: "deduped" });
    }

    const { country, city } = await getGeoFromRequest(req);
    const device = getDeviceFromRequest(req);

    // Source is server-derived (visitorId), NOT user-provided text
    const safeSource = visitorId.slice(0, 64);

    await prisma.analyticsEvent.create({
      data: {
        creatorId,
        eventType,
        country,
        city,
        device,
        source: safeSource,
        variant: variant ?? null,
      },
    });

    if (eventType === "profile_view") {
      await prisma.pageView.create({
        data: { creatorId, country, city, device, source: safeSource },
      });

      // The profileViewsToday/Week/Month columns were dropped in favor of
      // computing counts on demand from AnalyticsEvent (the row we just
      // wrote above). For the "every 5th view fires a notification" trigger
      // we count today's events instead — same effect, no stale column.
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const viewsToday = await prisma.analyticsEvent.count({
        where: {
          creatorId,
          eventType: "profile_view",
          createdAt: { gte: todayStart },
        },
      });
      if (viewsToday > 0 && viewsToday % 5 === 0) {
        await createNotification(creatorId, "profile_view", city ?? undefined);
      }
    }

    if (eventType === "whatsapp_click") {
      // No column increment — the AnalyticsEvent row written above is the
      // single source of truth. The notification fires on every click
      // because clicks are rarer than views; that matches the previous
      // behavior (no modulo gate was applied on this branch).
      await createNotification(creatorId, "whatsapp_click", city ?? undefined);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics event error:", error);
    return NextResponse.json(
      { error: "Failed to record event" },
      { status: 500 }
    );
  }
}
