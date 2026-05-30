import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { refreshExpiredSubscriptions } from "@/app/lib/subscription";
import { getCurrentUserId } from "@/app/lib/auth-helpers";
import { detectVisitorCity, rememberDetectedCity } from "@/app/lib/geolocation";
import {
  GRID_PAGE_SIZE,
  NEW_CREATOR_DAYS,
  buildCreatorFilter,
  creatorSelect,
  shapeCreator,
  type CreatorRow,
  type SortSlug,
} from "@/app/lib/creator-shape";
import {
  getViewCountsForCreators,
  startOfRollingWeek,
  startOfRollingMonth,
} from "@/lib/analytics";
import { getCreatorRatingSummariesAboveThreshold } from "./lib/reviews-server";
import { browserSafeMediaUrl, lockedPreviewUrl } from "./lib/media-url";
import { LandingHome } from "./components/landing/LandingHome";
import type { AdSlotData } from "./components/landing/AdSlot";
import type { LatestFeedItem } from "./components/landing/LatestFeedStrip";

// Public landing — single OG card on every share. Per-city OG would
// happen in a future /?city=X-aware generateMetadata when we want city
// pages to share with localized previews. For MVP one card is enough.
export const metadata: Metadata = {
  title: "Midnight — Découvrez les Meilleures Créatrices au Cameroun",
  description:
    "Parcourez les créatrices vérifiées à Douala, Yaoundé, Bafoussam, Kribi et partout au Cameroun. Contactez directement via WhatsApp. Discret. Anonyme. 18+ seulement.",
  keywords: [
    // How Cameroonians actually search (slang + everyday French)
    "plan Douala",
    "plan Yaoundé",
    "plan nuit Douala",
    "rencard Douala",
    "fille de nuit Douala",
    "fille de nuit Yaoundé",
    "numéro filles Douala WhatsApp",
    "bonne amie Yaoundé",
    "bonne amie Douala",
    "accompagnatrice Douala",
    "accompagnatrice Yaoundé",
    "sortie nuit Douala",
    "sortie nuit Yaoundé",
    "filles disponibles Douala",
    "filles disponibles Cameroun",
    "contact filles Douala",
    // City-level discovery
    "créatrices Douala",
    "créatrices Yaoundé",
    "créatrices Bafoussam",
    "créatrices Kribi",
    "créatrices Buea",
    "nuit Douala",
    "nuit Yaoundé",
    "nuit Cameroun",
    // Brand + platform
    "Midnight Cameroun",
    "midnight24",
    "midnight24.cam",
    "VIP creators Douala",
    "escort Douala",
    "escort Yaoundé",
    "adult creators Cameroon",
    "compagne Douala",
    "compagne Yaoundé",
  ],
  openGraph: {
    title: "Midnight — Discover Exclusive Creators in Cameroon",
    description:
      "Browse verified creators in Douala, Yaoundé and beyond. Connect via WhatsApp. Anonymous. 18+ only.",
    type: "website",
    images: ["/Midnight-logo1.png"],
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    city?: string;
    auto?: string;
    category?: string;
    sort?: string;
  }>;
}) {
  const resolved = await searchParams;
  const explicitCity = resolved?.city ?? "";
  const explicitCategory = resolved?.category ?? "";

  // Sort param — whitelist so a stray ?sort=foo just falls back to "all".
  const ALLOWED_SORTS: SortSlug[] = ["vipPlus", "vip", "premium", "verified", "new"];
  const rawSort = resolved?.sort ?? "";
  const explicitSort: SortSlug = (ALLOWED_SORTS as string[]).includes(rawSort)
    ? (rawSort as SortSlug)
    : "";

  await refreshExpiredSubscriptions();
  const viewerUserId = await getCurrentUserId();

  // Auto-detect the visitor's city on first visit. The new landing layout
  // will highlight the detected city inside the location-filter cards
  // (built in the next chunk), so we keep the redirect contract intact:
  //   /?city=X&auto=1  → pre-applied filter + visible "from your area" hint
  if (!explicitCity) {
    const detection = await detectVisitorCity();
    if (detection.city) {
      if (detection.source !== "cookie") {
        // Cookie writes are only allowed in Server Actions / Route Handlers
        // in Next.js 15+. Wrap in try/catch so a failed cookie set never
        // crashes the page — the redirect still fires and city detection
        // still works; the cookie just won't persist for the next visit.
        try {
          await rememberDetectedCity(detection.city);
        } catch {
          // silently skip
        }
      }
      redirect(`/?city=${encodeURIComponent(detection.city)}&auto=1`);
    }
  }

  // City counts for the location-filter section. Indexed groupBy — fast.
  // Cities with zero approved creators don't appear (groupBy omits them).
  const cityGroups = await prisma.creatorprofile.groupBy({
    by: ["location"],
    where: {
      status: "APPROVED",
      location: { not: null },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const cities = cityGroups
    .filter((g): g is typeof g & { location: string } => !!g.location)
    .map((g) => ({ name: g.location, count: g._count.id }));

  // Category pill row — same data shape as cities (slug + label + count).
  // Categories with zero approved creators in the current city filter are
  // hidden so visitors never tap a dead pill.
  const categories = await prisma.category.findMany({
    select: {
      slug: true,
      label: true,
      _count: {
        select: {
          creators: {
            where: {
              creatorprofile: {
                status: "APPROVED",
                ...(explicitCity ? { location: explicitCity } : {}),
              },
            },
          },
        },
      },
    },
    orderBy: { displayOrder: "asc" },
  });

  const categoryPills = categories
    .map((c) => ({ slug: c.slug, label: c.label, count: c._count.creators }))
    .filter((c) => c.count > 0);

  // Sort pill availability — count approved creators in each bucket, scoped
  // to the current city + category, so we can hide pills with zero matches
  // (otherwise a visitor taps "Premium" and lands on an empty grid).
  // 5 parallel COUNT queries — indexed on tier/verified/createdAt so cheap.
  const sortScope: Record<string, unknown> = { status: "APPROVED" };
  if (explicitCity) sortScope.location = explicitCity;
  if (explicitCategory) {
    sortScope.categories = {
      some: { category: { slug: explicitCategory } },
    };
  }
  const newCutoff = new Date(Date.now() - NEW_CREATOR_DAYS * 86_400_000);

  const [cVipPlus, cVip, cPremium, cVerified, cNew] = await Promise.all([
    prisma.creatorprofile.count({ where: { ...sortScope, tier: "VIP_PLUS" } }),
    prisma.creatorprofile.count({ where: { ...sortScope, tier: "VIP" } }),
    prisma.creatorprofile.count({ where: { ...sortScope, tier: "PREMIUM" } }),
    prisma.creatorprofile.count({ where: { ...sortScope, verified: true } }),
    prisma.creatorprofile.count({
      where: { ...sortScope, createdAt: { gte: newCutoff } },
    }),
  ]);

  const sortPills = [
    { slug: "vipPlus",  label: "VIP+",     count: cVipPlus },
    { slug: "vip",      label: "VIP",      count: cVip },
    { slug: "premium",  label: "Premium",  count: cPremium },
    { slug: "verified", label: "Verified", count: cVerified },
    { slug: "new",      label: "New",      count: cNew },
  ].filter((p) => p.count > 0);

  // Tiered layout. Two modes:
  //
  //   1. No sort filter selected (the default landing experience):
  //      - Top 3 by weekly views (across all tiers) for the "TOP 3 THIS WEEK"
  //        band at the top.
  //      - Each tier (VIP+ / VIP / Premium / Regular) queried separately so
  //        each gets its own labeled section. Top-3 creators are NOT removed
  //        from their tier section — they're re-marked with a TRENDING
  //        overlay (see TrendingWrapper) so the tier band still feels like
  //        a complete catalog.
  //
  //   2. A sort pill is active (?sort=vipPlus / vip / premium / verified / new):
  //      - Fall back to the original single-grid behavior so the existing
  //        CreatorGrid + Load More pagination still works. The tier-section
  //        layout would be redundant when the visitor has explicitly
  //        narrowed to one slice.
  const { where: baseWhere, tiersToQuery } = buildCreatorFilter(
    explicitCity,
    explicitCategory,
    explicitSort,
  );

  const SPOTLIGHT_LIMIT = 12;        // VIP+ carousel cap
  const TIER_SECTION_LIMIT = 12;     // VIP / Premium tier band caps (then VIEW ALL)
  const REGULAR_SECTION_LIMIT = 24;  // Regular band shows more since there's no VIEW ALL
  const BOOSTED_BAND_LIMIT = 8;      // Boosted band — keeps the top-of-page strip tight

  const isSectionedView = explicitSort === "";
  const nowDate = new Date();

  // ── Sectioned-view buckets (populated only when no sort filter) ──
  let topThreeCreators: ReturnType<typeof shapeCreator>[] = [];
  let spotlightCreators: ReturnType<typeof shapeCreator>[] = [];
  let vipCreators: ReturnType<typeof shapeCreator>[] = [];
  let premiumCreators: ReturnType<typeof shapeCreator>[] = [];
  let regularCreators: ReturnType<typeof shapeCreator>[] = [];
  let boostedCreators: ReturnType<typeof shapeCreator>[] = [];
  let boostedCreatorIds: number[] = [];

  // ── Sort-filter-view bucket (populated only when a sort pill is active) ──
  let initialCreators: ReturnType<typeof shapeCreator>[] = [];
  let initialHasMore = false;

  if (isSectionedView) {
    // Step 1 — Active boosts. Same query as before; we still need these
    // IDs to (a) feed the BOOSTED band and (b) float boosted Regular
    // creators to the front of the Regular tier section.
    const activeBoosts = await prisma.boost.findMany({
      where: {
        status: "ACTIVE",
        endsAt: { gt: nowDate },
        creatorprofile: {
          status: "APPROVED",
          ...(explicitCity ? { location: explicitCity } : {}),
          ...(explicitCategory
            ? {
                categories: {
                  some: { category: { slug: explicitCategory } },
                },
              }
            : {}),
        },
      },
      include: {
        creatorprofile: { select: { ...creatorSelect, tier: true } },
      },
      orderBy: { startsAt: "desc" },
      take: BOOSTED_BAND_LIMIT,
    });
    boostedCreatorIds = activeBoosts
      .map((b) => b.creatorprofile?.id ?? null)
      .filter((id): id is number => id !== null);

    // Step 2 — All approved creators matching the city/category filter.
    // One query covers every tier; we split + sort in JS below.
    //
    // Previously each tier was its own findMany with
    // `orderBy: profileViewsMonth desc`. With the column dropped we instead
    // fetch the candidate set first and rank from windowed AnalyticsEvent
    // counts (one groupBy per window, batched across every creator).
    //
    // Scale note: this fetches all approved creators in the city/category.
    // Fine at launch volume (hundreds, not thousands). If a city ever
    // grows past ~1000 creators we'd add a windowed materialized count
    // refreshed by cron and re-introduce orderBy at the DB layer.
    const eligibleCreators = (await prisma.creatorprofile.findMany({
      where: baseWhere,
      select: { ...creatorSelect, tier: true },
    })) as CreatorRow[];

    const eligibleIds = eligibleCreators.map((c) => c.id);

    // Step 3 — Batched windowed view counts + rating summaries. Three
    // queries cover the entire visible set; results plug into the JS
    // sort + card shaping below. See lib/analytics.ts and lib/reviews-
    // server.ts for the helpers. Ratings come back ONLY for creators
    // who've crossed the visibility threshold (default 5 reviews) so a
    // single 5-star outlier doesn't display as "5.0★" on the card.
    const [weeklyViews, monthlyViews, ratingSummaries] = await Promise.all([
      getViewCountsForCreators(eligibleIds, startOfRollingWeek()),
      getViewCountsForCreators(eligibleIds, startOfRollingMonth()),
      getCreatorRatingSummariesAboveThreshold(eligibleIds),
    ]);

    // `shapeCreator` takes the displayed view count + the optional rating.
    // We render the monthly view count when no rating is set, otherwise
    // the card prefers the rating chip (rating beats view count as a
    // decision signal for visitors).
    const shapeWithMonth = (c: CreatorRow) => {
      const summary = ratingSummaries.get(c.id);
      return shapeCreator(
        c,
        monthlyViews.get(c.id) ?? 0,
        summary
          ? { average: summary.averageRating, count: summary.reviewCount }
          : null,
      );
    };

    const byMonthDesc = (a: CreatorRow, b: CreatorRow) =>
      (monthlyViews.get(b.id) ?? 0) - (monthlyViews.get(a.id) ?? 0);

    // Step 4 — Top 3 across ALL tiers, ranked by weekly views.
    // Filter on "> 0" so a sleepy week (zero events anywhere) drops the
    // section entirely instead of showing arbitrary creators with a tie at 0.
    topThreeCreators = eligibleCreators
      .filter((c) => (weeklyViews.get(c.id) ?? 0) > 0)
      .sort(
        (a, b) =>
          (weeklyViews.get(b.id) ?? 0) - (weeklyViews.get(a.id) ?? 0),
      )
      .slice(0, 3)
      .map(shapeWithMonth);

    // Step 5 — Per-tier slices, each sorted by monthly views.
    spotlightCreators = eligibleCreators
      .filter((c) => c.tier === "VIP_PLUS")
      .sort(byMonthDesc)
      .slice(0, SPOTLIGHT_LIMIT)
      .map(shapeWithMonth);

    vipCreators = eligibleCreators
      .filter((c) => c.tier === "VIP")
      .sort(byMonthDesc)
      .slice(0, TIER_SECTION_LIMIT)
      .map(shapeWithMonth);

    premiumCreators = eligibleCreators
      .filter((c) => c.tier === "PREMIUM")
      .sort(byMonthDesc)
      .slice(0, TIER_SECTION_LIMIT)
      .map(shapeWithMonth);

    // Boosted Regular creators go to the front of the Regular section
    // (the "within-tier float" half of the boost placement). We shape
    // them from the same eligibleCreators array so they get the same
    // monthly view count as everyone else.
    const boostedIdSet = new Set(boostedCreatorIds);
    const boostedRegularShaped = eligibleCreators
      .filter((c) => c.tier === "REGULAR" && boostedIdSet.has(c.id))
      .map(shapeWithMonth);
    const otherRegular = eligibleCreators
      .filter((c) => c.tier === "REGULAR" && !boostedIdSet.has(c.id))
      .sort(byMonthDesc)
      .slice(0, REGULAR_SECTION_LIMIT)
      .map(shapeWithMonth);

    regularCreators = [...boostedRegularShaped, ...otherRegular];

    // Step 6 — BoostedSection data uses the same shaping path so the cards
    // there display the same monthly view count + rating chip visitors see
    // in the tier sections (no surprise number jumps when scrolling).
    boostedCreators = activeBoosts
      .map((b) => {
        if (!b.creatorprofile) return null;
        const row = b.creatorprofile as CreatorRow;
        return shapeWithMonth(row);
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  } else {
    // Sort filter active — single flat grid with pagination. Now driven by
    // batched windowed counts (same pattern as the sectioned-view branch
    // above) since orderBy: profileViewsMonth went away with the column.
    const wantsSpotlight = tiersToQuery.includes("VIP_PLUS");
    const mainTiers = tiersToQuery.filter((t) => t !== "VIP_PLUS");

    // Fetch all eligible creators for each tier we need. No orderBy at the
    // DB layer — we rank in JS from monthly view counts.
    const [spotlightRows, ...mainBuckets] = await Promise.all([
      wantsSpotlight
        ? prisma.creatorprofile.findMany({
            where: { ...baseWhere, tier: "VIP_PLUS" },
            select: creatorSelect,
          })
        : Promise.resolve([] as CreatorRow[]),
      ...mainTiers.map((tier) =>
        prisma.creatorprofile.findMany({
          where: { ...baseWhere, tier },
          select: creatorSelect,
        }),
      ),
    ]);

    const spotlightRaw = spotlightRows as CreatorRow[];
    const mainRaw = mainBuckets.flat() as CreatorRow[];
    const allRowIds = [
      ...spotlightRaw.map((c) => c.id),
      ...mainRaw.map((c) => c.id),
    ];
    const [monthlyViews, ratingSummaries] = await Promise.all([
      getViewCountsForCreators(allRowIds, startOfRollingMonth()),
      getCreatorRatingSummariesAboveThreshold(allRowIds),
    ]);

    const byMonthDesc = (a: CreatorRow, b: CreatorRow) =>
      (monthlyViews.get(b.id) ?? 0) - (monthlyViews.get(a.id) ?? 0);
    const shapeWithMonth = (c: CreatorRow) => {
      const summary = ratingSummaries.get(c.id);
      return shapeCreator(
        c,
        monthlyViews.get(c.id) ?? 0,
        summary
          ? { average: summary.averageRating, count: summary.reviewCount }
          : null,
      );
    };

    spotlightCreators = spotlightRaw
      .sort(byMonthDesc)
      .slice(0, SPOTLIGHT_LIMIT)
      .map(shapeWithMonth);

    // mainBuckets is per-tier; flatten then sort once. This preserves the
    // "spotlight at top, then the rest in monthly-view order" behavior the
    // previous implementation produced via tier-then-column ordering.
    const mainSorted = mainRaw.sort(byMonthDesc);
    initialCreators = mainSorted.slice(0, GRID_PAGE_SIZE).map(shapeWithMonth);
    initialHasMore = mainSorted.length > GRID_PAGE_SIZE;
  }

  // Latest feed posts — homepage discovery teaser for /feed. We pull a
  // single query of the 8 most recent feed posts from approved creators,
  // then shape them into the strip's data type. Locked posts (visitor's
  // tier < post.accessLevel) are surfaced with mediaUrl=null + locked=true
  // so the strip card renders a "PREMIUM" lock overlay without exposing
  // protected media. We scope to the explicitCity filter when active so
  // the strip stays consistent with the rest of the homepage.
  const recentFeedPosts = await prisma.post.findMany({
    where: {
      postType: "FEED",
      creatorprofile: {
        status: "APPROVED",
        ...(explicitCity ? { location: explicitCity } : {}),
      },
    },
    include: {
      creatorprofile: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          tier: true,
          verified: true,
        },
      },
      media: { take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  // Anonymous visitor = REGULAR-equivalent access for tier-gating purposes.
  // Real tiered access is enforced inside the creator profile feed tab.
  const latestFeedItems: LatestFeedItem[] = recentFeedPosts
    .map((p): LatestFeedItem | null => {
      const creator = p.creatorprofile;
      if (!creator) return null;
      const firstMedia = p.media[0];
      const accessLevel = p.accessLevel;
      const visitorHasAccess = accessLevel === "REGULAR";
      const mediaKind: "VIDEO" | "IMAGE" =
        firstMedia?.kind === "VIDEO" ? "VIDEO" : "IMAGE";
      // Entitled visitors get the real (browser-safe) asset. Locked-but-
      // blurred posts get a SERVER-blurred Cloudinary derivative so the
      // original never reaches the client. Fully-locked posts → null
      // (the strip renders a placeholder, no media).
      const mediaUrl = visitorHasAccess
        ? firstMedia?.filePath
          ? browserSafeMediaUrl(firstMedia.filePath, mediaKind)
          : null
        : p.blurred && firstMedia?.filePath
          ? lockedPreviewUrl(firstMedia.filePath, mediaKind)
          : null;
      return {
        id: p.id,
        title: p.title ?? null,
        mediaUrl,
        mediaKind,
        locked: !visitorHasAccess,
        // Pass through the creator's per-post blur + lock choices so the
        // strip card teases at the right intensity and only shows the
        // PREMIUM badge when the creator opted into a lock.
        blurIntensity: p.blurIntensity,
        showLock: p.showLock,
        creator: {
          id: creator.id,
          name: creator.displayName,
          avatarUrl: creator.avatarUrl,
          tier: creator.tier,
          verified: creator.verified,
        },
      } satisfies LatestFeedItem;
    })
    .filter((p): p is LatestFeedItem => p !== null);

  // Active ad — one per render, rotated by priority then most recent.
  // Geo-scope rule: city-specific ads only show when the visitor has
  // selected that city; ads with city=null show everywhere.
  const now = new Date();
  // HOUSE ads only. PROMOTED_CREATOR ads (auto-created when an admin
  // approves a Boost) are deliberately excluded here — those same creators
  // already appear in the BoostedSection band higher on the page plus get
  // floated to the top of the Regular tier section. Surfacing them in
  // AdSlot too would put a single paying creator on the page three times,
  // which reads as spam and devalues the boost product. AdSlot is now
  // reserved for Midnight's own promos (Become a creator, etc.).
  const adRow = await prisma.ad.findFirst({
    where: {
      status: "ACTIVE",
      kind: "HOUSE",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        explicitCity
          ? { OR: [{ city: null }, { city: explicitCity }] }
          : { city: null },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: {
      creatorprofile: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          tier: true,
          verified: true,
        },
      },
    },
  });

  let ad: AdSlotData | null = null;
  if (adRow) {
    // Fire-and-forget impression bump — never let an analytics write block
    // the page render. Without this, slow ad inserts would stall every visit.
    prisma.ad
      .update({ where: { id: adRow.id }, data: { impressions: { increment: 1 } } })
      .catch(() => {});

    ad = {
      id: adRow.id,
      kind: adRow.kind,
      title: adRow.title,
      body: adRow.body,
      imageUrl: adRow.imageUrl,
      ctaLabel: adRow.ctaLabel,
      ctaUrl: adRow.ctaUrl,
      creator: adRow.creatorprofile
        ? {
            id: adRow.creatorprofile.id,
            name: adRow.creatorprofile.displayName,
            avatarUrl: adRow.creatorprofile.avatarUrl,
            tier: adRow.creatorprofile.tier,
            verified: adRow.creatorprofile.verified,
          }
        : null,
    };
  }

  const isAutoDetected = resolved?.auto === "1";

  return (
    <LandingHome
      isLoggedIn={!!viewerUserId}
      cities={cities}
      categories={categoryPills}
      sortPills={sortPills}
      selectedCity={explicitCity}
      selectedCategory={explicitCategory}
      selectedSort={explicitSort}
      autoDetected={isAutoDetected && !!explicitCity}
      topThreeCreators={topThreeCreators}
      spotlightCreators={spotlightCreators}
      vipCreators={vipCreators}
      premiumCreators={premiumCreators}
      regularCreators={regularCreators}
      boostedCreators={boostedCreators}
      boostedCreatorIds={boostedCreatorIds}
      ad={ad}
      latestFeedItems={latestFeedItems}
      initialCreators={initialCreators}
      initialHasMore={initialHasMore}
    />
  );
}
