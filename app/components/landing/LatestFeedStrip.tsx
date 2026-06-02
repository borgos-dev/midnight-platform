import Image from "next/image";
import Link from "next/link";
import {
  Newspaper,
  Lock,
  Play,
  Crown,
  Sparkles,
  Star,
  ArrowRight,
} from "lucide-react";
import type { AccessLevel } from "@prisma/client";

export type LatestFeedItem = {
  id: number;
  title: string | null;
  /** Cloudinary URL of the first media in the post, when the visitor has
   *  access OR the post is a blurred-teaser. Null when fully locked. */
  mediaUrl: string | null;
  mediaKind: "IMAGE" | "VIDEO";
  /** True when the visitor lacks access to the underlying tier; the card
   *  renders a lock overlay and a "Premium" label. */
  locked: boolean;
  /** Creator-chosen tease-blur strength when the post is blurred (4..25).
   *  Default 8 if absent. Used by both image AND video locked tiles so
   *  the strip's tease feels consistent across media kinds. */
  blurIntensity?: number;
  /** Whether to render the "PREMIUM" lock chrome on the tile. When false
   *  the blur tease still applies but no lock badge appears — matches the
   *  creator's per-post choice in the upload form. Defaults to true. */
  showLock?: boolean;
  creator: {
    id: number;
    name: string;
    avatarUrl: string | null;
    tier: AccessLevel;
    verified: boolean;
  };
};

type Props = {
  items: LatestFeedItem[];
};

/**
 * Homepage discovery teaser for the /feed timeline.
 *
 * Why this exists: a dedicated /feed page is great for power browsers,
 * but most visitors land on the homepage and never see the Navbar's FEED
 * link (it's hidden on `/`). Without a homepage entry, feed content is
 * orphaned. This strip sits between the VIP+ spotlight and the Main Grid
 * so feed discovery happens in the visitor's natural path of attention.
 *
 * Layout: full-bleed horizontal scroller (same shape as VipPlusSpotlight)
 * with edge-fade and arrow buttons on desktop. Each card is ~140px wide
 * showing the media thumbnail + the creator avatar + a tier badge. Locked
 * cards show a lock overlay so visitors understand what's premium without
 * exposing the protected content itself.
 *
 * Returns null when no items — homepage stays clean when nobody has posted
 * yet. The /feed page itself shows the empty state in that case.
 */
export function LatestFeedStrip({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section
      className="latest-feed"
      aria-label="Latest posts from creators"
    >
      <div
        style={{
          maxWidth: "1140px",
          margin: "0 auto",
          padding: "0 20px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              color: "var(--accent-purple)",
              marginBottom: "6px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Newspaper size={12} strokeWidth={2.5} />
            LATEST POSTS
          </div>
          <h2
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "clamp(22px, 4vw, 28px)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Fresh from creators
          </h2>
        </div>

        <Link
          href="/feed"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "999px",
            background: "transparent",
            border: "1px solid var(--border-strong)",
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontFamily: "var(--font-dm-mono)",
            fontSize: "10.5px",
            fontWeight: 800,
            letterSpacing: "0.10em",
            flexShrink: 0,
            transition: "border-color 0.18s ease, color 0.18s ease",
          }}
        >
          VIEW ALL
          <ArrowRight size={12} strokeWidth={2.6} />
        </Link>
      </div>

      <div className="latest-feed__rail">
        <div
          className="latest-feed__scroller"
          role="list"
          tabIndex={0}
        >
          {items.map((item) => (
            <FeedStripCard key={item.id} item={item} />
          ))}
          <span className="latest-feed__spacer" aria-hidden />
        </div>
      </div>

      <style>{`
        .latest-feed {
          position: relative;
          background: var(--bg-base);
          padding: clamp(24px, 4vw, 36px) 0 0;
        }
        .latest-feed__rail {
          position: relative;
        }
        .latest-feed__rail::after {
          content: "";
          position: absolute;
          right: 0;
          top: 0;
          bottom: 12px;
          width: 36px;
          background: linear-gradient(
            to right,
            rgba(10, 10, 18, 0),
            var(--bg-base)
          );
          pointer-events: none;
        }

        .latest-feed__scroller {
          display: flex;
          flex-wrap: nowrap;
          gap: 12px;
          padding: 4px 20px 14px;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
        }
        .latest-feed__scroller::-webkit-scrollbar {
          display: none;
        }
        @media (min-width: 1140px) {
          .latest-feed__scroller {
            max-width: 1140px;
            margin: 0 auto;
          }
        }

        .latest-feed__spacer {
          flex-shrink: 0;
          width: 12px;
        }
      `}</style>
    </section>
  );
}

// ── Individual card ──────────────────────────────────────────────
// Self-contained so the parent stays a simple list mapper. Each card is
// a clickable Link to the creator profile (where the post lives on the
// "Feed" tab). We don't deep-link to a specific post id because we don't
// have per-post routes yet — sending to the profile is the closest
// equivalent.
function FeedStripCard({ item }: { item: LatestFeedItem }) {
  const tierBadge = TIER_BADGE_BY_TIER[item.creator.tier];
  // Tease-blur strength sourced from the creator's per-post choice (clamped
  // to the form's range). Applied to both image AND video locked tiles so
  // the tease reads the same regardless of media kind. Default 8 keeps
  // motion visible for older posts that pre-date blurIntensity.
  const blurPx = Math.min(25, Math.max(2, item.blurIntensity ?? 8));
  const lockedBlur = item.locked
    ? `blur(${blurPx}px) brightness(0.88)`
    : undefined;
  // Only render the "PREMIUM" badge chrome when the creator opted into a
  // lock for this post. Older posts without showLock fall through to true
  // (preserves current behavior).
  const showLockChrome = item.locked && item.showLock !== false;
  return (
    <Link
      href={`/creator/${item.creator.id}#feed`}
      role="listitem"
      className="feed-strip-card"
      aria-label={`Post by ${item.creator.name}`}
    >
      <div className="feed-strip-card__media">
        {item.mediaUrl ? (
          item.mediaKind === "VIDEO" ? (
            <>
              <video
                src={item.mediaUrl}
                muted
                playsInline
                preload="metadata"
                autoPlay={item.locked} // keeps the blur tease alive on locked clips
                loop={item.locked}
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: lockedBlur,
                  transform: item.locked ? "scale(1.06)" : undefined,
                }}
              />
              {!item.locked && (
                <span className="feed-strip-card__play" aria-hidden>
                  <Play size={16} strokeWidth={2.5} fill="#fff" />
                </span>
              )}
            </>
          ) : (
            <Image
              src={item.mediaUrl}
              alt=""
              fill
              sizes="180px"
              style={{
                objectFit: "cover",
                filter: lockedBlur,
                transform: item.locked ? "scale(1.06)" : undefined,
              }}
              unoptimized={!item.mediaUrl.startsWith("https://res.cloudinary.com")}
            />
          )
        ) : (
          // No media url — full lock; render a placeholder gradient.
          <div className="feed-strip-card__placeholder" aria-hidden />
        )}

        {showLockChrome && (
          <span className="feed-strip-card__lock" aria-label="Locked content">
            <Lock size={14} strokeWidth={2.4} />
            PREMIUM
          </span>
        )}

        {tierBadge && (
          <span
            className="feed-strip-card__tier"
            style={{
              background: tierBadge.bg,
              color: tierBadge.fg,
            }}
          >
            {tierBadge.icon}
            {tierBadge.label}
          </span>
        )}
      </div>

      <div className="feed-strip-card__footer">
        <div className="feed-strip-card__avatar" aria-hidden>
          {item.creator.avatarUrl ? (
            <Image
              src={item.creator.avatarUrl}
              alt=""
              fill
              sizes="24px"
              style={{ objectFit: "cover" }}
              unoptimized={!item.creator.avatarUrl.startsWith("https://res.cloudinary.com")}
            />
          ) : (
            <span className="feed-strip-card__avatar-fallback">
              {item.creator.name.charAt(0)}
            </span>
          )}
        </div>
        <span className="feed-strip-card__name">{item.creator.name}</span>
      </div>

      <style>{`
        .feed-strip-card {
          position: relative;
          flex: 0 0 min(46vw, 168px);
          scroll-snap-align: start;
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-decoration: none;
          color: inherit;
        }

        .feed-strip-card__media {
          position: relative;
          aspect-ratio: 4 / 5;
          border-radius: 12px;
          overflow: hidden;
          background: linear-gradient(135deg, #1a1a2e 0%, #0a0a14 100%);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .feed-strip-card:hover .feed-strip-card__media {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
        }

        .feed-strip-card__placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(
            135deg,
            rgba(168, 85, 247, 0.18),
            rgba(230, 168, 23, 0.06)
          );
        }

        .feed-strip-card__play {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.55);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }

        .feed-strip-card__lock {
          position: absolute;
          top: 8px;
          left: 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.55);
          color: #fff;
          font-family: var(--font-dm-mono);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.10em;
          backdrop-filter: blur(6px);
        }

        .feed-strip-card__tier {
          position: absolute;
          top: 8px;
          right: 8px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px 7px;
          border-radius: 999px;
          font-family: var(--font-dm-mono);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          line-height: 1;
        }

        .feed-strip-card__footer {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }
        .feed-strip-card__avatar {
          position: relative;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--bg-surface);
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .feed-strip-card__avatar-fallback {
          font-family: var(--font-cormorant);
          font-size: 12px;
          font-weight: 700;
          color: rgba(168, 85, 247, 0.6);
        }
        .feed-strip-card__name {
          font-family: var(--font-dm-sans);
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }
      `}</style>
    </Link>
  );
}

// Inline tier badge tokens — kept here (and not pulled from CreatorTile)
// because the strip's badges are smaller / glow-free so they don't fight
// the actual creator tile for visual weight.
const TIER_BADGE_BY_TIER: Partial<
  Record<AccessLevel, { label: string; bg: string; fg: string; icon: React.ReactNode }>
> = {
  VIP_PLUS: {
    label: "VIP+",
    bg: "linear-gradient(135deg, #E6A817 0%, #C28A0F 100%)",
    fg: "#1A0F00",
    icon: <Crown size={9} strokeWidth={2.4} />,
  },
  VIP: {
    label: "VIP",
    bg: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
    fg: "#fff",
    icon: <Sparkles size={9} strokeWidth={2.4} />,
  },
  PREMIUM: {
    label: "Prem",
    bg: "linear-gradient(135deg, #E8547A 0%, #C2335A 100%)",
    fg: "#fff",
    icon: <Star size={9} strokeWidth={2.4} />,
  },
};
