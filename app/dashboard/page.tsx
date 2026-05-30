// app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "./DashboardShell";
import { enforceSubscriptionStatus } from "@/app/lib/subscription";
import { expireDueBoosts } from "@/app/lib/boost-lifecycle";
import { AccessLevel } from "@prisma/client";
import {
  calculateBestDayAndTime,
  calculateConversionRate,
  calculateCityRank,
  calculateDailyTrend,
  getViewCountForCreator,
  getClickCountForCreator,
  startOfToday,
  startOfRollingWeek,
  startOfRollingMonth,
} from "@/lib/analytics";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = Number(session.user.id);

  // Fetch email verification status + email (needed for the "Resend"
  // button on the dashboard verify banner when emailVerified is false)
  // PLUS the role so we can bounce admins to /admin instead of forcing
  // them through the creator dashboard. Same row, one query.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, email: true, role: true },
  });

  // Role-aware redirect — admins land here after login (the login form
  // sets callbackUrl=/dashboard) and immediately bounce to the admin
  // dashboard. Admins who genuinely want to see their creator profile
  // can navigate to /creator/<id> directly; this redirect only intercepts
  // the post-login default path, not deliberate navigation to /dashboard.
  if (user?.role === "ADMIN") {
    redirect("/admin");
  }

  // 1. Enforce subscription expiry + flip any over-due boosts to EXPIRED
  //    (lazy lifecycle — no cron needed). Runs in parallel.
  await Promise.all([
    enforceSubscriptionStatus(userId),
    expireDueBoosts(),
  ]);

  // 2. Fetch creator with recent posts + media + likes
  const creator = await prisma.creatorprofile.findUnique({
    where: { userId },
    include: {
      post: {
        include: { media: true, likes: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!creator) {
    redirect("/");
  }

  const tier = creator.tier as AccessLevel;

  // 3. Windowed analytics from AnalyticsEvent — zero fake numbers AND
  //    zero stale columns. Six parallel groupBy counts cover the three
  //    rolling windows (today / week / month) for both event types.
  //    Previously these read from accumulating columns on creatorprofile
  //    that never reset, so the labels lied about the time window. See
  //    lib/analytics.ts for the helpers.
  const [
    viewsToday,
    viewsWeek,
    viewsMonth,
    clicksToday,
    clicksWeek,
    clicksMonth,
  ] = await Promise.all([
    getViewCountForCreator(creator.id, startOfToday()),
    getViewCountForCreator(creator.id, startOfRollingWeek()),
    getViewCountForCreator(creator.id, startOfRollingMonth()),
    getClickCountForCreator(creator.id, startOfToday()),
    getClickCountForCreator(creator.id, startOfRollingWeek()),
    getClickCountForCreator(creator.id, startOfRollingMonth()),
  ]);

// Run all calculations in parallel — faster than one by one
const [
  { bestDay, bestTime },
  conversionRate,
  cityRank,
  dailyTrend,
] = await Promise.all([
  // bestDay and bestTime from real AnalyticsEvent history
  tier === "VIP_PLUS"
    ? calculateBestDayAndTime(creator.id)
    : Promise.resolve({ bestDay: null, bestTime: null }),

  // Conversion rate from real event counts
  tier === "VIP" || tier === "VIP_PLUS"
    ? calculateConversionRate(creator.id)
    : Promise.resolve(null),

  // City rank from real weekly views
  tier === "VIP_PLUS"
    ? calculateCityRank(creator.id, creator.location)
    : Promise.resolve(null),

  // Real per-day buckets for the 30-day performance chart.
  // Regular creators get the locked overlay so we skip the query entirely.
  tier === "VIP" || tier === "VIP_PLUS"
    ? calculateDailyTrend(creator.id, 30, tier === "VIP" || tier === "VIP_PLUS")
    : Promise.resolve({ views: [], clicks: [], totalEvents: 0 }),
]);

const analytics = {
  viewsToday,
  viewsWeek,
  viewsMonth,
  clicksToday,
  clicksWeek,
  clicksMonth,
  conversionRate,
  cityRank,
  bestDay,
  bestTime,
  dailyViews: dailyTrend.views,
  dailyClicks: dailyTrend.clicks,
  totalTrendEvents: dailyTrend.totalEvents,
};

  // 3b. Link performance — VIP+ only. Per-link click counts in the rolling
  //     30-day window. Closes the loop on the external-links feature:
  //     server-side we record `external_link_click` events tagged with
  //     `source: "link:<id>:..."`, and here we count them grouped by link.
  //     The query strategy is two-step: pull the creator's links first,
  //     then groupBy AnalyticsEvent.source filtered to those link ids.
  type LinkPerfRow = {
    id: number;
    kind: import("@prisma/client").ExternalLinkKind;
    clicks: number;
  };
  let linkPerformance: LinkPerfRow[] = [];
  if (tier === "VIP_PLUS") {
    const links = await prisma.creatorExternalLink.findMany({
      where: { creatorprofileId: creator.id },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      select: { id: true, kind: true },
    });
    if (links.length > 0) {
      const since = new Date(Date.now() - 30 * 86_400_000);
      // Pre-compute the source-prefix strings the click endpoint writes
      // (`link:<id>:<visitor>`). We can't use `IN` here because the
      // visitor suffix varies per row; instead we fan out per link and
      // count rows starting with the right prefix.
      const counts = await Promise.all(
        links.map((l) =>
          prisma.analyticsEvent.count({
            where: {
              creatorId: creator.id,
              eventType: "external_link_click",
              createdAt: { gte: since },
              source: { startsWith: `link:${l.id}:` },
            },
          }),
        ),
      );
      linkPerformance = links.map((l, i) => ({
        id: l.id,
        kind: l.kind,
        clicks: counts[i],
      }));
    }
  }

  // 4. Shape top posts — sorted by real likes count, no random numbers
  const topPosts = creator.post
    .map((p) => {
      const firstMedia = p.media[0];
      return {
        id: p.id,
        title: p.title,
        accessLevel: p.accessLevel,
        thumbnail: firstMedia?.filePath ?? null,
        mediaKind: firstMedia?.kind ?? null,
        likes: p.likes.length,
      };
    })
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 3);

  // 5. Open boost (PENDING_PAYMENT / PENDING_REVIEW / ACTIVE) for the
  //    Regular-tier card. Only fetched for REGULAR creators — upper tiers
  //    don't see the boost card so we skip the query. `startsAt` is now
  //    included in the select because the active-boost panel shows the
  //    views/clicks racked up since that timestamp.
  const openBoost =
    tier === "REGULAR"
      ? await prisma.boost.findFirst({
          where: {
            creatorprofileId: creator.id,
            status: {
              in: ["PENDING_PAYMENT", "PENDING_REVIEW", "ACTIVE"],
            },
          },
          orderBy: { createdAt: "desc" },
          select: {
            status: true,
            durationDays: true,
            amountCfa: true,
            startsAt: true,
            endsAt: true,
          },
        })
      : null;

  // 5b. Most recent boost that EXPIRED in the last 14 days, used to drive
  //     the post-boost summary + "Boost again" CTA. Skipped when an open
  //     boost exists (don't show a renew CTA over an active spotlight).
  const recentExpiredBoost =
    tier === "REGULAR" && !openBoost
      ? await prisma.boost.findFirst({
          where: {
            creatorprofileId: creator.id,
            status: "EXPIRED",
            endsAt: { gte: new Date(Date.now() - 14 * 86_400_000) },
          },
          orderBy: { endsAt: "desc" },
          select: {
            durationDays: true,
            amountCfa: true,
            startsAt: true,
            endsAt: true,
          },
        })
      : null;

  // 5c. Boost performance — views + WhatsApp clicks during the boost
  //     window. Used by the active-boost ROI panel AND the post-boost
  //     summary. Calculated from AnalyticsEvent rows (the only source of
  //     truth for visits + clicks since the column counters were dropped).
  let boostPerformance: { views: number; clicks: number } | null = null;
  const perfBoost =
    openBoost?.status === "ACTIVE" && openBoost.startsAt
      ? { startsAt: openBoost.startsAt, endsAt: null as Date | null }
      : recentExpiredBoost?.startsAt && recentExpiredBoost.endsAt
        ? {
            startsAt: recentExpiredBoost.startsAt,
            endsAt: recentExpiredBoost.endsAt,
          }
        : null;
  if (perfBoost) {
    const [bv, bc] = await Promise.all([
      prisma.analyticsEvent.count({
        where: {
          creatorId: creator.id,
          eventType: "profile_view",
          createdAt: {
            gte: perfBoost.startsAt,
            ...(perfBoost.endsAt ? { lte: perfBoost.endsAt } : {}),
          },
        },
      }),
      prisma.analyticsEvent.count({
        where: {
          creatorId: creator.id,
          eventType: "whatsapp_click",
          createdAt: {
            gte: perfBoost.startsAt,
            ...(perfBoost.endsAt ? { lte: perfBoost.endsAt } : {}),
          },
        },
      }),
    ]);
    boostPerformance = { views: bv, clicks: bc };
  }

  // 6. Setup checklist — drives the empty-state tile that replaces the
  //    Conversion Rate card while the creator still has incomplete profile
  //    work. Each item is true when the creator has done that step; once
  //    all four flip true the tile disappears and the normal KPI returns.
  //    Keeping this server-side means a creator who completes a step + soft-
  //    reloads sees the tile state update without a stale client cache.
  const setupStatus = {
    hasAvatar: !!creator.avatarUrl,
    hasWhatsApp:
      typeof creator.whatsappNumber === "string" &&
      creator.whatsappNumber.trim().length > 0,
    hasBio:
      typeof creator.bio === "string" && creator.bio.trim().length > 0,
    hasFirstPost: creator.post.length > 0,
  };

  return (
    <DashboardShell
      tier={tier}
      name={creator.displayName ?? "Creator"}
      avatarUrl={creator.avatarUrl ?? null}
      location={creator.location ?? null}
      creatorId={creator.id}
      analytics={analytics}
      topPosts={topPosts}
      setupStatus={setupStatus}
      emailVerified={user?.emailVerified ?? false}
      email={user?.email ?? ""}
      boost={
        openBoost
          ? {
              // The query filters to these three statuses; TS doesn't
              // narrow enum types from where-clause args so we cast.
              status: openBoost.status as
                "PENDING_PAYMENT" | "PENDING_REVIEW" | "ACTIVE",
              durationDays: openBoost.durationDays,
              amountCfa: openBoost.amountCfa,
              endsAt: openBoost.endsAt,
            }
          : null
      }
      expiredBoost={
        recentExpiredBoost
          ? {
              durationDays: recentExpiredBoost.durationDays,
              amountCfa: recentExpiredBoost.amountCfa,
              endsAt: recentExpiredBoost.endsAt,
            }
          : null
      }
      boostPerformance={boostPerformance}
      linkPerformance={linkPerformance}
    />
  );
}