import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/ad-click/[id]
//
// Records a click on an ad and 302-redirects to its destination.
// Works without JS so it survives crawlers and accessibility tools.
//
// For PROMOTED_CREATOR ads we ignore the stored ctaUrl and redirect to the
// boosted creator's profile so a misconfigured Ad row can't smuggle a click
// off-platform. For HOUSE ads we sanitize ctaUrl to allow only same-origin
// paths or whitelisted absolute URLs.

const ALLOWED_AD_HOSTS = new Set<string>([
  // Add external hosts here if/when we run cross-domain campaigns.
]);

function safeRedirectUrl(raw: string): string {
  // Same-origin path — always safe.
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const u = new URL(raw);
    if (u.protocol === "https:" && ALLOWED_AD_HOSTS.has(u.host)) {
      return u.toString();
    }
  } catch {
    /* fallthrough */
  }
  // Fallback: send the visitor home rather than to a sketchy URL.
  return "/";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const adId = Number.parseInt(id, 10);
  if (!Number.isInteger(adId) || adId <= 0) {
    return NextResponse.redirect(new URL("/", _req.url));
  }

  const ad = await prisma.ad.findUnique({
    where: { id: adId },
    select: {
      id: true,
      kind: true,
      status: true,
      ctaUrl: true,
      creatorprofileId: true,
    },
  });

  if (!ad || ad.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/", _req.url));
  }

  // Increment click counter. Fire-and-forget — even if this fails we still
  // want the redirect to happen so the visitor isn't punished by an analytics
  // hiccup.
  prisma.ad
    .update({ where: { id: ad.id }, data: { clicks: { increment: 1 } } })
    .catch(() => {});

  let destination = "/";
  if (ad.kind === "PROMOTED_CREATOR" && ad.creatorprofileId) {
    destination = `/creator/${ad.creatorprofileId}`;
  } else {
    destination = safeRedirectUrl(ad.ctaUrl);
  }

  return NextResponse.redirect(new URL(destination, _req.url));
}
