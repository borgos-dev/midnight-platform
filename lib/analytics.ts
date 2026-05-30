import { prisma } from "@/lib/prisma";

// ────────────────────────────────────────────────────────────
// Time-window boundaries
//
// "Today" = midnight in the server's local time. We don't have per-visitor
// timezone here (the page is server-rendered and Africa/Douala is the only
// audience for now), so server-local midnight is a reasonable cutoff.
// "Week" = rolling 7 days (not calendar-week) because a calendar-week reset
// would create a mystery dip every Monday morning that creators would read
// as "my numbers tanked".
// "Month" = rolling 30 days for the same reason.
// ────────────────────────────────────────────────────────────

/** Midnight at the start of today, server-local. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 7 × 24h before now — rolling week, not calendar week. */
export function startOfRollingWeek(): Date {
  return new Date(Date.now() - 7 * 86_400_000);
}

/** 30 × 24h before now — rolling month, not calendar month. */
export function startOfRollingMonth(): Date {
  return new Date(Date.now() - 30 * 86_400_000);
}

/**
 * Batched view-count lookup. Given a list of creator IDs and a "since" date,
 * returns a Map<creatorId, viewCount>. Used for the homepage tier sorts and
 * the TOP 3 ranking — one groupBy query instead of N per-creator counts.
 *
 * Honors the AnalyticsEvent dedup window (same visitor + same creator within
 * 30 min counts once), because that's what writes the rows in the first place.
 */
export async function getViewCountsForCreators(
  creatorIds: number[],
  since: Date,
): Promise<Map<number, number>> {
  if (creatorIds.length === 0) return new Map();
  const counts = await prisma.analyticsEvent.groupBy({
    by: ["creatorId"],
    where: {
      creatorId: { in: creatorIds },
      eventType: "profile_view",
      createdAt: { gte: since },
    },
    _count: { _all: true },
  });
  return new Map(counts.map((c) => [c.creatorId, c._count._all]));
}

/**
 * Batched whatsapp-click-count lookup. Same shape as getViewCountsForCreators
 * but for the `whatsapp_click` event type. Used by the dashboard tiles.
 */
export async function getClickCountsForCreators(
  creatorIds: number[],
  since: Date,
): Promise<Map<number, number>> {
  if (creatorIds.length === 0) return new Map();
  const counts = await prisma.analyticsEvent.groupBy({
    by: ["creatorId"],
    where: {
      creatorId: { in: creatorIds },
      eventType: "whatsapp_click",
      createdAt: { gte: since },
    },
    _count: { _all: true },
  });
  return new Map(counts.map((c) => [c.creatorId, c._count._all]));
}

/**
 * Single-creator view count within a window. Thin wrapper over
 * getViewCountsForCreators for the common single-creator case (dashboard
 * tiles). Returns 0 (not null) when there are no events so callers don't
 * need defensive nullish-coalescing.
 */
export async function getViewCountForCreator(
  creatorId: number,
  since: Date,
): Promise<number> {
  const m = await getViewCountsForCreators([creatorId], since);
  return m.get(creatorId) ?? 0;
}

/** Single-creator click count, same pattern. */
export async function getClickCountForCreator(
  creatorId: number,
  since: Date,
): Promise<number> {
  const m = await getClickCountsForCreators([creatorId], since);
  return m.get(creatorId) ?? 0;
}


export async function calculateBestDayAndTime(creatorId: number) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const events = await prisma.analyticsEvent.findMany({
    where: {
      creatorId,
      eventType: "profile_view",
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { createdAt: true },
  });

  if (events.length < 5) {
    return { bestDay: null, bestTime: null };
  }

  // Count by day of week
  const dayCount: Record<string, number> = {};
  events.forEach(event => {
    const day = new Date(event.createdAt)
      .toLocaleDateString("en", { weekday: "long" });
    dayCount[day] = (dayCount[day] ?? 0) + 1;
  });

  // Count by hour
  const hourCount: Record<number, number> = {};
  events.forEach(event => {
    const hour = new Date(event.createdAt).getHours();
    hourCount[hour] = (hourCount[hour] ?? 0) + 1;
  });

  // Find best day
  const bestDay = Object.entries(dayCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Find best hour and format nicely
  const bestHourEntry = Object.entries(hourCount)
    .sort((a, b) => b[1] - a[1])[0];

  const bestHour = bestHourEntry 
    ? parseInt(bestHourEntry[0]) 
    : null;

  const bestTime = bestHour !== null
    ? `${bestHour}:00 – ${bestHour + 1}:00`
    : null;

  return { bestDay, bestTime };
}

export async function calculateConversionRate(
  creatorId: number
): Promise<number | null> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [views, clicks] = await Promise.all([
    prisma.analyticsEvent.count({
      where: {
        creatorId,
        eventType: "profile_view",
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        creatorId,
        eventType: "whatsapp_click",
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  if (views === 0) return null;
  return parseFloat(((clicks / views) * 100).toFixed(1));
}

/**
 * Real daily aggregation of profile_view (+ optional whatsapp_click) events
 * over the last `days` days. Returns one bucket per day, oldest-first.
 *
 * Replaces the previous sine-wave fabrication in PerformanceChart. The chart
 * now reflects real data; an empty/sparse return is the truthful state and
 * the UI shows an honest empty message in that case.
 */
export async function calculateDailyTrend(
  creatorId: number,
  days: number = 30,
  includeClicks: boolean = false,
): Promise<{
  views: number[];
  clicks: number[];
  totalEvents: number;
}> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const eventTypes = includeClicks
    ? ["profile_view", "whatsapp_click"]
    : ["profile_view"];

  const events = await prisma.analyticsEvent.findMany({
    where: {
      creatorId,
      eventType: { in: eventTypes },
      createdAt: { gte: since },
    },
    select: { eventType: true, createdAt: true },
  });

  // Pre-fill day buckets so missing days render as 0 instead of being skipped.
  const views: number[] = new Array(days).fill(0);
  const clicks: number[] = new Array(days).fill(0);
  const startMs = since.getTime();
  const dayMs = 86_400_000;

  for (const e of events) {
    const idx = Math.floor((e.createdAt.getTime() - startMs) / dayMs);
    if (idx < 0 || idx >= days) continue;
    if (e.eventType === "profile_view") views[idx]++;
    else if (e.eventType === "whatsapp_click") clicks[idx]++;
  }

  return { views, clicks, totalEvents: events.length };
}

export async function calculateCityRank(
  creatorId: number,
  location: string | null
): Promise<number | null> {
  if (!location) return null;

  // Pull all approved creators in the city, then rank them by their
  // rolling-30-day view count from AnalyticsEvent. This replaces the
  // previous column-based approach (which used the never-reset
  // profileViewsMonth column and effectively ranked by lifetime views).
  //
  // For a single city the candidate set is small (tens to a few hundred),
  // so the groupBy on AnalyticsEvent is cheap. If a city ever grows to
  // thousands of creators we can swap to a windowed materialized count
  // refreshed by cron.
  const cityCreators = await prisma.creatorprofile.findMany({
    where: { location, status: "APPROVED" },
    select: { id: true },
  });
  if (cityCreators.length === 0) return null;
  const ids = cityCreators.map((c) => c.id);

  // Make sure the target creator is actually in the city set.
  if (!ids.includes(creatorId)) return null;

  const counts = await getViewCountsForCreators(ids, startOfRollingMonth());
  const myCount = counts.get(creatorId) ?? 0;

  // Strictly-greater so ties don't bump the creator's rank.
  let ahead = 0;
  for (const id of ids) {
    if (id === creatorId) continue;
    const other = counts.get(id) ?? 0;
    if (other > myCount) ahead++;
  }
  return ahead + 1;
}