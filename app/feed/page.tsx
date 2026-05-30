import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Image as ImageIcon, Video, Crown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { refreshExpiredSubscriptions } from "@/app/lib/subscription";
import { FeedTimeline } from "@/app/components/feed/FeedTimeline";
import { FeaturedStrip, type FeaturedFeedItem } from "@/app/components/feed/FeaturedStrip";
import type { ReelPost } from "@/app/components/feed/FeedReelViewer";
import type { AccessLevel } from "@prisma/client";

export const metadata: Metadata = {
  title: "Feed — Latest Creator Posts in Cameroon",
  description:
    "Browse the latest photos and videos from verified creators in Douala, Yaoundé and across Cameroon. Updated daily. 18+ only.",
  keywords: [
    "creator feed Cameroon",
    "photos filles Douala",
    "videos créatrices Yaoundé",
    "adult content Cameroon",
    "Midnight feed",
  ],
};

// Whitelist for the filter query param. An unknown value falls back to "all".
const FILTERS = ["all", "photos", "videos", "vipPlus"] as const;
type Filter = (typeof FILTERS)[number];

const FEED_PAGE_SIZE = 20;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const resolved = await searchParams;
  const raw = resolved?.filter ?? "all";
  const filter: Filter = (FILTERS as readonly string[]).includes(raw)
    ? (raw as Filter)
    : "all";

  await refreshExpiredSubscriptions();

  // Viewer context — used by FeedPost to render the right "locked" preview
  // when a Regular visitor lands on a VIP+-gated post.
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const viewerProfile = userId
    ? await prisma.creatorprofile.findFirst({
        where: { userId },
        select: { tier: true },
      })
    : null;
  const viewerTier: AccessLevel = (viewerProfile?.tier as AccessLevel) ?? "REGULAR";

  // Chronological feed. The previous tier-prioritized bucket logic gave
  // VIP+ posts permanent dominance — which sounded fair to paying creators
  // but actually killed the "what's happening tonight" feel a feed needs
  // to stay engaging. A stale VIP+ post above a fresh Regular post makes
  // the timeline read as dead.
  //
  // The compensating move is the FeaturedStrip rendered above the timeline
  // (Instagram-Stories pattern): VIP+ posts get a guaranteed pinned slot at
  // the top, the chronological timeline below stays fresh.
  const baseWhere = {
    postType: "FEED" as const,
    creatorprofile: { status: "APPROVED" as const },
    ...(filter === "vipPlus"
      ? { accessLevel: "VIP_PLUS" as const }
      : {}),
    ...(filter === "photos"
      ? { media: { some: { kind: "IMAGE" as const } } }
      : filter === "videos"
        ? { media: { some: { kind: "VIDEO" as const } } }
        : {}),
  };

  const FEATURED_LIMIT = 8;
  const showFeaturedStrip = filter === "all"; // hidden when filter narrows the feed

  // Two parallel queries: latest VIP+ posts for the pinned strip, and the
  // main chronological timeline. They share the postType + APPROVED guards
  // but diverge on tier-gating + access-level filtering.
  const [featuredRows, timelineRows] = await Promise.all([
    showFeaturedStrip
      ? prisma.post.findMany({
          where: {
            postType: "FEED",
            creatorprofile: { status: "APPROVED", tier: "VIP_PLUS" },
            accessLevel: "VIP_PLUS",
          },
          include: {
            creatorprofile: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                tier: true,
                userId: true,
              },
            },
            media: { take: 1 },
          },
          orderBy: { createdAt: "desc" },
          take: FEATURED_LIMIT,
        })
      : Promise.resolve([]),
    prisma.post.findMany({
      where: baseWhere,
      include: {
        creatorprofile: {
          select: {
            id: true,
            displayName: true,
            location: true,
            tier: true,
            avatarUrl: true,
            verified: true,
            userId: true,
            // Surfaced so the FeedPost lock overlay can deep-link straight
            // into a WhatsApp conversation with the creator (visitor doesn't
            // navigate to the profile first — fewer taps, higher conversion).
            whatsappNumber: true,
          },
        },
        media: { take: 1 },
        likes: userId
          ? { where: { userId }, take: 1 }
          : false,
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: "desc" },
      take: FEED_PAGE_SIZE,
    }),
  ]);

  const posts = timelineRows;

  // Shape FeaturedStrip data with access gating identical to the timeline:
  // VIP+ posts only render their media URL when the viewer has VIP+ access
  // (or is the creator themselves). Locked posts still appear in the strip
  // — they show the lock overlay instead of media, a teaser for upgrade.
  const featuredItems: FeaturedFeedItem[] = featuredRows.flatMap((post) => {
    const creator = post.creatorprofile;
    if (!creator) return [];
    const isOwner = userId !== null && userId === creator.userId;
    const hasAccess = isOwner || viewerTier === "VIP_PLUS";
    const firstMedia = post.media[0];
    return [{
      postId: post.id,
      hasAccess,
      mediaUrl: hasAccess ? (firstMedia?.filePath ?? null) : null,
      mediaKind: firstMedia?.kind === "VIDEO" ? "VIDEO" : firstMedia?.kind === "IMAGE" ? "IMAGE" : null,
      creator: {
        id: creator.id,
        name: creator.displayName,
        avatarUrl: creator.avatarUrl,
        tier: creator.tier as AccessLevel,
      },
    }];
  });

  // ── FILTER PILLS ─────────────────────────────────────────────
  const pills: { slug: Filter; label: string; icon: React.ReactNode }[] = [
    { slug: "all",     label: "All",      icon: <Newspaper size={12} strokeWidth={2.4} /> },
    { slug: "photos",  label: "Photos",   icon: <ImageIcon size={12} strokeWidth={2.4} /> },
    { slug: "videos",  label: "Videos",   icon: <Video size={12} strokeWidth={2.4} /> },
    { slug: "vipPlus", label: "VIP+",     icon: <Crown size={12} strokeWidth={2.4} /> },
  ];

  return (
    <main
      style={{
        background: "var(--bg-base)",
        minHeight: "100vh",
        padding: "120px 20px 80px",
      }}
    >
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              color: "var(--accent-purple)",
              marginBottom: "8px",
            }}
          >
            FEED
          </div>
          <h1
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "clamp(28px, 5vw, 38px)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Latest from creators
          </h1>
          <p
            style={{
              marginTop: "8px",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "13.5px",
              lineHeight: 1.55,
              color: "var(--text-secondary)",
              maxWidth: "500px",
            }}
          >
            What&apos;s new tonight — newest posts first across every tier.
            VIP+ creators pinned at the top.
          </p>
        </div>

        {/* Filter pills — server-rendered links so back/forward preserve
            URL state and the page works without JS. */}
        <div
          className="feed-pills"
          role="tablist"
          aria-label="Filter feed posts"
        >
          {pills.map((p) => {
            const active = p.slug === filter;
            const href = p.slug === "all" ? "/feed" : `/feed?filter=${p.slug}`;
            return (
              <Link
                key={p.slug}
                href={href}
                className={`feed-pill ${active ? "feed-pill--active" : ""}`}
                aria-current={active ? "true" : undefined}
              >
                <span className="feed-pill__icon" aria-hidden>
                  {p.icon}
                </span>
                {p.label}
              </Link>
            );
          })}
        </div>

        {/* Featured strip — pinned latest VIP+ posts at the top of the feed.
            Only rendered on the default "All" view; explicit filters
            (photos/videos/vipPlus) hide it because they'd either be redundant
            (vipPlus filter) or off-topic (photos/videos = different framing). */}
        {showFeaturedStrip && <FeaturedStrip items={featuredItems} />}

        {/* Posts or empty state */}
        {posts.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              borderRadius: "16px",
              border: "1px dashed var(--border-strong)",
              background: "rgba(255,255,255,0.015)",
              fontFamily: "var(--font-dm-sans)",
              color: "var(--text-muted)",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            <p style={{ margin: 0 }}>
              {filter === "all"
                ? "No posts yet. Check back soon."
                : `No ${filter === "vipPlus" ? "VIP+" : filter} posts right now. Try a different filter.`}
            </p>
            {filter !== "all" && (
              <Link
                href="/feed"
                style={{
                  display: "inline-block",
                  marginTop: "12px",
                  color: "var(--accent-purple)",
                  fontFamily: "var(--font-dm-mono)",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.10em",
                  textDecoration: "none",
                }}
              >
                ← SHOW ALL
              </Link>
            )}
          </div>
        ) : (
          // Shape DB rows into the ReelPost contract once, pass to the
          // client wrapper that renders both the timeline + the fullscreen
          // reel viewer. Tier-aware access control happens here on the
          // server so locked posts never leak their media URL into the
          // client bundle for non-eligible viewers.
          <FeedTimeline
            posts={(() => {
              const shaped: ReelPost[] = [];
              for (const post of posts) {
                const creator = post.creatorprofile;
                if (!creator) continue;
                const firstMedia = post.media[0];

                const isOwner =
                  userId !== null && userId === creator.userId;
                const accessLevel = post.accessLevel as AccessLevel;
                let hasAccess = isOwner;
                if (!hasAccess) {
                  if (accessLevel === "REGULAR") hasAccess = true;
                  else if (accessLevel === "VIP")
                    hasAccess =
                      viewerTier === "VIP" || viewerTier === "VIP_PLUS";
                  else if (accessLevel === "VIP_PLUS")
                    hasAccess = viewerTier === "VIP_PLUS";
                  else if (accessLevel === "PREMIUM")
                    hasAccess =
                      viewerTier === "PREMIUM" ||
                      viewerTier === "VIP" ||
                      viewerTier === "VIP_PLUS";
                }
                const isLocked = !hasAccess;

                shaped.push({
                  id: post.id,
                  title: isLocked ? "Premium content" : (post.title ?? ""),
                  // Security: only ship the real media URL when the viewer
                  // has access, OR when the post is an explicit teaser.
                  mediaUrl: hasAccess
                    ? (firstMedia?.filePath ?? null)
                    : post.blurred
                      ? (firstMedia?.filePath ?? null)
                      : null,
                  // Prisma enum value — uppercase. FeedPost / FeedReelViewer
                  // compare strictly to "VIDEO".
                  mediaKind: firstMedia?.kind ?? null,
                  blurred: isLocked,
                  accessLevel,
                  likes: post._count.likes,
                  isLiked:
                    Array.isArray(post.likes) && post.likes.length > 0,
                  creator: {
                    id: creator.id,
                    name: creator.displayName,
                    city: creator.location ?? "",
                    tier: creator.tier as AccessLevel,
                    avatarUrl: creator.avatarUrl,
                  },
                });
              }
              return shaped;
            })()}
          />
        )}
      </div>

      <style>{`
        .feed-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .feed-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-secondary);
          font-family: var(--font-dm-sans);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: -0.01em;
          text-decoration: none;
          transition: border-color 0.18s ease, background 0.18s ease,
            color 0.18s ease;
        }
        .feed-pill:hover {
          border-color: rgba(168, 85, 247, 0.4);
          color: var(--text-primary);
        }
        .feed-pill--active {
          border-color: var(--accent-purple);
          background: rgba(168, 85, 247, 0.12);
          color: var(--text-primary);
        }
        .feed-pill__icon {
          display: inline-flex;
          align-items: center;
          color: currentColor;
          opacity: 0.85;
        }
      `}</style>
    </main>
  );
}
