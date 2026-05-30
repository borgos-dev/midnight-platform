import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGeoFromRequest, getDeviceFromRequest } from "@/lib/geolocation";
import { getCurrentCreatorProfile } from "@/app/lib/auth-helpers";

/**
 * GET /api/link-click/[id]
 *
 * Records a click on a creator's external link and 302-redirects to the
 * destination URL. Mirrors the ad-click pattern: works without JS so it
 * survives crawlers, screen readers, and visitors with extensions that
 * block beacons. Same-origin redirects to "/" on any failure so a missing
 * row never leaves the visitor stranded.
 *
 * The destination URL is whatever the creator stored when they added the
 * link. We re-validate https-only here (defense in depth) — the action
 * already validates on write but a future migration could in theory slip
 * a non-https URL into the column.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const linkId = Number.parseInt(id, 10);
  if (!Number.isInteger(linkId) || linkId <= 0) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const link = await prisma.creatorExternalLink.findUnique({
    where: { id: linkId },
    select: {
      id: true,
      url: true,
      kind: true,
      creatorprofileId: true,
    },
  });

  if (!link) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Defense in depth — refuse to redirect to anything that isn't a valid
  // https URL even if the row somehow ended up with a different shape.
  let destination: URL;
  try {
    destination = new URL(link.url);
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (destination.protocol !== "https:") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Block self-clicks the same way the analytics-event route does: a
  // creator clicking their own link shouldn't pad their numbers.
  const viewer = await getCurrentCreatorProfile();
  const isSelf = viewer?.id === link.creatorprofileId;

  if (!isSelf) {
    const { country, city } = await getGeoFromRequest(req);
    const device = getDeviceFromRequest(req);
    const visitorId =
      req.cookies.get("vid")?.value ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "anon";

    // Fire-and-forget — even if the event write fails we want the redirect
    // to happen. Same pattern as ad-click. The dashboard reads click totals
    // from AnalyticsEvent (windowed groupBy), so a missed row only costs
    // one event in the count, not a broken page.
    //
    // The `source` field carries the link id so the dashboard can later
    // bucket events per-link without joining on something fragile.
    void prisma.analyticsEvent
      .create({
        data: {
          creatorId: link.creatorprofileId,
          eventType: "external_link_click",
          country,
          city,
          device,
          source: `link:${link.id}:${visitorId.slice(0, 40)}`,
        },
      })
      .catch(() => {});

    // Cached aggregate on the row itself — informational, not load-bearing.
    void prisma.creatorExternalLink
      .update({
        where: { id: link.id },
        data: { totalClicks: { increment: 1 } },
      })
      .catch(() => {});
  }

  return NextResponse.redirect(destination.toString());
}
