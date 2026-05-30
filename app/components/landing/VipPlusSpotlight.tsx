"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Crown, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { CreatorTile, type CreatorTileData } from "./CreatorTile";
import { TrendingWrapper } from "./TrendingWrapper";

type Props = {
  creators: CreatorTileData[];
  /** IDs of creators that should get a TRENDING overlay (this week's Top 3).
   *  Defaults to an empty set so existing callers that don't pass it still
   *  work — the carousel just renders without any trending badges. */
  trendingIds?: Set<number>;
};

/**
 * VIP+ featured shelf — horizontal scroll carousel.
 *
 * Why a carousel (not a static grid):
 *   - Saves vertical space; the main grid stays visible above the fold.
 *   - "Featured row" mental model lifted from Netflix / Spotify — the
 *     premium tier feels showcased without dominating the page.
 *   - Native swipe on mobile, arrow buttons on desktop, scrollbar on
 *     all platforms. Fully accessible and works without JS for the swipe
 *     case (arrows just won't appear if React isn't hydrated).
 *
 * Why no auto-rotation:
 *   - Auto-rotating carousels are one of the most-disliked UI patterns in
 *     usability research (NN/g). They feel like ads, frustrate readers,
 *     and create accessibility burdens (pause controls, prefers-reduced
 *     -motion, screen-reader churn). Visitors who want to browse will
 *     scroll. Visitors who want to read a single card will stop on it.
 */
export function VipPlusSpotlight({ creators, trendingIds }: Props) {
  const trending = trendingIds ?? new Set<number>();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Re-evaluate which arrows are enabled whenever the row scrolls or the
  // viewport resizes. Tolerance lets us treat ~1px subpixel drift as
  // "at the edge" so the arrow doesn't flicker.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft < max - 2);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [creators.length]);

  const scrollByOne = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Step by the first card's width + the row gap so the next card
    // snaps into place. Reading from a real DOM node keeps this in sync
    // with the CSS card width (which is responsive via min()).
    const firstCard = el.querySelector<HTMLElement>(".spotlight-card");
    const gap = 14;
    const step = firstCard ? firstCard.offsetWidth + gap : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (creators.length === 0) return null;

  return (
    <section
      className="vip-spotlight"
      style={{
        background: "var(--bg-base)",
        padding: "clamp(36px, 5vw, 56px) 0 0",
      }}
      aria-label="VIP Plus featured creators"
    >
      <div
        style={{
          maxWidth: "1140px",
          margin: "0 auto",
          padding: "0 20px",
        }}
      >
        {/* Shelf header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #E6A817, #C28A0F)",
              color: "#1A0F00",
              boxShadow: "0 4px 14px rgba(230, 168, 23, 0.45)",
              flexShrink: 0,
            }}
            aria-hidden
          >
            <Crown size={16} strokeWidth={2.5} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-dm-mono)",
                fontSize: "11px",
                color: "#E6A817",
                letterSpacing: "0.14em",
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              VIP+ SPOTLIGHT
            </div>
            <div
              style={{
                marginTop: "4px",
                fontFamily: "var(--font-dm-sans)",
                fontSize: "12px",
                color: "var(--text-muted)",
                lineHeight: 1,
              }}
            >
              Verified · top tier · featured tonight
            </div>
          </div>

          {/* Escape hatch: visitors who want to browse all VIP+ creators
              jump straight to the grid pre-filtered by ?sort=vipPlus.
              This is what makes the carousel feel like a curated showcase
              instead of a hidden subset — they can always see the rest. */}
          <Link
            href="/?sort=vipPlus#creators"
            className="vip-spotlight__view-all"
            aria-label="View all VIP+ creators"
          >
            <span>VIEW ALL</span>
            <ArrowRight size={12} strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      {/* Carousel rail — full-bleed so the right-edge fade aligns with
          the viewport, not the content column. */}
      <div className="vip-spotlight__rail">
        <div
          className="vip-spotlight__scroller"
          ref={scrollerRef}
          role="region"
          aria-label="VIP Plus creators carousel"
          tabIndex={0}
        >
          {creators.map((c) => (
            <div key={c.id} className="spotlight-card">
              <TrendingWrapper isTrending={trending.has(c.id)}>
                <CreatorTile creator={c} />
              </TrendingWrapper>
            </div>
          ))}
          <span className="spotlight-spacer" aria-hidden />
        </div>

        {/* Arrow buttons — show only when the row can scroll in that
            direction. Desktop-only visually, but the buttons render on
            all sizes so keyboard users on touch laptops can still use them. */}
        <button
          type="button"
          className="spotlight-arrow spotlight-arrow--left"
          onClick={() => scrollByOne(-1)}
          aria-label="Scroll carousel left"
          disabled={!canScrollLeft}
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="spotlight-arrow spotlight-arrow--right"
          onClick={() => scrollByOne(1)}
          aria-label="Scroll carousel right"
          disabled={!canScrollRight}
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      </div>

      <style>{`
        .vip-spotlight__view-all {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid rgba(230, 168, 23, 0.35);
          background: rgba(230, 168, 23, 0.08);
          color: #E6A817;
          text-decoration: none;
          font-family: var(--font-dm-mono);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.10em;
          white-space: nowrap;
          flex-shrink: 0;
          transition: border-color 0.18s ease, background 0.18s ease;
        }
        .vip-spotlight__view-all:hover {
          border-color: rgba(230, 168, 23, 0.65);
          background: rgba(230, 168, 23, 0.14);
        }

        .vip-spotlight__rail {
          position: relative;
        }

        .vip-spotlight__scroller {
          display: flex;
          gap: 14px;
          padding: 4px 20px 12px;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }
        .vip-spotlight__scroller::-webkit-scrollbar {
          display: none;
        }
        .vip-spotlight__scroller:focus-visible {
          outline: 2px solid var(--accent-purple);
          outline-offset: -4px;
        }

        @media (min-width: 1140px) {
          .vip-spotlight__scroller {
            max-width: 1140px;
            margin: 0 auto;
          }
        }

        .spotlight-card {
          /* Width scales with viewport but caps so desktop cards don't go
             huge. On mobile ~78vw lets the next card peek in, hinting at
             scrollability without an arrow. */
          flex: 0 0 min(78vw, 320px);
          scroll-snap-align: start;
        }

        /* Tiny trailing spacer so the last card has room past the right-edge
           fade and arrow button when scrolled to the end. */
        .spotlight-spacer {
          flex-shrink: 0;
          width: 12px;
        }

        /* ── Arrow buttons ── */
        .spotlight-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(20, 20, 30, 0.85);
          color: #fff;
          display: none; /* hidden on touch by default; shown on desktop */
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          transition: background 0.18s ease, transform 0.15s ease,
            opacity 0.18s ease;
          z-index: 2;
        }
        .spotlight-arrow:hover {
          background: rgba(230, 168, 23, 0.18);
          border-color: rgba(230, 168, 23, 0.55);
          transform: translateY(-50%) scale(1.05);
        }
        .spotlight-arrow:disabled {
          opacity: 0;
          pointer-events: none;
        }
        .spotlight-arrow--left {
          left: 8px;
        }
        .spotlight-arrow--right {
          right: 8px;
        }
        @media (min-width: 1024px) {
          .spotlight-arrow {
            display: inline-flex;
          }
        }

        /* ── Right-edge fade hint (mobile + tablet — desktop has arrows) ── */
        .vip-spotlight__rail::after {
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
        @media (min-width: 1024px) {
          .vip-spotlight__rail::after {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
