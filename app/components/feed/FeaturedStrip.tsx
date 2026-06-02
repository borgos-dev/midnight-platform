"use client";

import Link from "next/link";
import Image from "next/image";
import { Crown, Lock } from "lucide-react";
import type { AccessLevel } from "@prisma/client";

export type FeaturedFeedItem = {
  postId: number;
  /** When false → render the lock overlay instead of the media so non-VIP+
   *  viewers see the strip but can't preview gated content. */
  hasAccess: boolean;
  /** Already access-gated server-side: null when the viewer shouldn't see
   *  the media at all. Blurred teasers pass the URL through and the caller
   *  decides whether to render with a blur filter. */
  mediaUrl: string | null;
  mediaKind: "IMAGE" | "VIDEO" | null;
  creator: {
    id: number;
    name: string;
    avatarUrl: string | null;
    tier: AccessLevel;
  };
};

type Props = {
  items: FeaturedFeedItem[];
};

/**
 * "FEATURED TONIGHT" — story-style horizontal strip at the top of the feed
 * that pins the latest VIP+ posts.
 *
 * Why this exists: the main feed switched from tier-prioritized buckets
 * (VIP+ posts dominated) to strict chronological ordering, because feeds
 * need freshness to feel alive. The trade-off is that paying VIP+
 * creators lose the "always at the top" guarantee. This strip restores
 * their visibility without sacrificing the timeline's freshness — same
 * pattern Instagram uses with Stories above the feed.
 *
 * Each card links to the creator's profile (not the post) so the strip
 * stays compact and the locked-content access logic isn't a concern —
 * the visitor reaches the creator's profile feed where the existing
 * tier-gated viewer takes over. Locked posts show a Lock overlay instead
 * of the media as a tease toward subscribing.
 *
 * Renders nothing when there are no VIP+ posts to show.
 */
export function FeaturedStrip({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section
      className="mn-featured-strip"
      aria-label="Featured VIP Plus posts"
    >
      <div className="mn-featured-strip__header">
        <span className="mn-featured-strip__crown" aria-hidden>
          <Crown size={11} strokeWidth={2.5} />
        </span>
        <span className="mn-featured-strip__label">FEATURED TONIGHT</span>
        <span className="mn-featured-strip__divider" aria-hidden />
        <span className="mn-featured-strip__sub">Latest from VIP+</span>
      </div>

      <div className="mn-featured-strip__scroller" role="list">
        {items.map((it) => (
          <Link
            key={it.postId}
            href={`/creator/${it.creator.id}`}
            className="mn-featured-card"
            role="listitem"
            aria-label={`Open ${it.creator.name}'s profile`}
          >
            <div className="mn-featured-card__media">
              {it.hasAccess && it.mediaUrl ? (
                it.mediaKind === "VIDEO" ? (
                  <video
                    src={it.mediaUrl}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    muted
                    loop
                    autoPlay
                    playsInline
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <Image
                    src={it.mediaUrl}
                    alt=""
                    fill
                    sizes="120px"
                    style={{ objectFit: "cover" }}
                    unoptimized={!it.mediaUrl.startsWith("https://res.cloudinary.com")}
                  />
                )
              ) : it.creator.avatarUrl ? (
                <Image
                  src={it.creator.avatarUrl}
                  alt=""
                  fill
                  sizes="120px"
                  style={{ objectFit: "cover" }}
                  unoptimized={!it.creator.avatarUrl.startsWith("https://res.cloudinary.com")}
                />
              ) : (
                <div className="mn-featured-card__fallback" aria-hidden>
                  {it.creator.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Bottom gradient — keeps the crown badge + name readable
                  whether the underlying media is bright or dark. */}
              <span className="mn-featured-card__scrim" aria-hidden />

              {/* Lock overlay for visitors who don't have VIP+ access. The
                  card still shows (creator avatar + name), just gated. */}
              {!it.hasAccess && (
                <span className="mn-featured-card__lock" aria-hidden>
                  <Lock size={14} strokeWidth={2.5} />
                </span>
              )}

              {/* VIP+ crown wedge — same gold visual language used in the
                  CreatorTile so visitors learn one tier vocabulary. */}
              <span className="mn-featured-card__crown" aria-hidden>
                <Crown size={10} strokeWidth={2.5} />
              </span>
            </div>

            <div className="mn-featured-card__name">{it.creator.name}</div>
          </Link>
        ))}
        {/* Trailing spacer so the last card can clear the right-edge fade. */}
        <span className="mn-featured-card__spacer" aria-hidden />
      </div>

      <style>{`
        .mn-featured-strip {
          position: relative;
          margin-bottom: 24px;
        }

        .mn-featured-strip__header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 4px 12px;
        }
        .mn-featured-strip__crown {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 6px;
          background: linear-gradient(135deg, #E6A817, #C28A0F);
          color: #1A0F00;
          flex-shrink: 0;
        }
        .mn-featured-strip__label {
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #E6A817;
        }
        .mn-featured-strip__divider {
          width: 1px;
          height: 12px;
          background: var(--border-strong);
        }
        .mn-featured-strip__sub {
          font-family: var(--font-dm-sans);
          font-size: 12px;
          color: var(--text-muted);
        }

        /* Horizontal scroll — story-strip pattern. Right-edge fade hints at
           more cards off-screen; scroll-snap keeps swipes feeling discrete. */
        .mn-featured-strip__scroller {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
        }
        .mn-featured-strip__scroller::-webkit-scrollbar {
          display: none;
        }

        /* Right-edge fade hint */
        .mn-featured-strip::after {
          content: "";
          position: absolute;
          right: 0;
          top: 32px;        /* below the header row */
          bottom: 32px;     /* above the trailing name labels gutter */
          width: 28px;
          background: linear-gradient(
            to right,
            rgba(10, 10, 18, 0),
            var(--bg-base)
          );
          pointer-events: none;
        }

        .mn-featured-card {
          flex-shrink: 0;
          scroll-snap-align: start;
          width: 110px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-decoration: none;
          color: inherit;
        }
        @media (min-width: 640px) {
          .mn-featured-card { width: 120px; }
        }

        .mn-featured-card__media {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 14px;
          overflow: hidden;
          background: var(--bg-surface);
          /* Gold ring matches the VIP+ tier badge across the rest of the
             platform — visually consistent "VIP+" signal. */
          box-shadow: inset 0 0 0 2px rgba(230, 168, 23, 0.55);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .mn-featured-card:hover .mn-featured-card__media {
          transform: translateY(-2px);
          box-shadow: inset 0 0 0 2px rgba(230, 168, 23, 0.85),
                      0 8px 22px rgba(230, 168, 23, 0.18);
        }
        .mn-featured-card:active .mn-featured-card__media {
          transform: translateY(-1px);
        }

        .mn-featured-card__fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-cormorant);
          font-size: 40px;
          font-weight: 700;
          color: rgba(230, 168, 23, 0.35);
        }

        .mn-featured-card__scrim {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0) 55%,
            rgba(0, 0, 0, 0.55) 100%
          );
        }

        .mn-featured-card__crown {
          position: absolute;
          top: 6px;
          left: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #E6A817, #C28A0F);
          color: #1A0F00;
          box-shadow: 0 2px 8px rgba(230, 168, 23, 0.45);
          pointer-events: none;
        }

        /* Lock overlay for non-VIP+ viewers — sits center, soft backdrop blur
           so the visitor sees there's something gated worth subscribing for. */
        .mn-featured-card__lock {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(6, 6, 12, 0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          color: rgba(255, 255, 255, 0.85);
          pointer-events: none;
        }

        .mn-featured-card__name {
          font-family: var(--font-cormorant);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.01em;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 0 2px;
        }

        .mn-featured-card__spacer {
          flex-shrink: 0;
          width: 8px;
        }
      `}</style>
    </section>
  );
}
