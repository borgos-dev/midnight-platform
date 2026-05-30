import { Crown } from "lucide-react";
import { CreatorTile, type CreatorTileData } from "./CreatorTile";
import { SectionBanner } from "./SectionBanner";

type Props = {
  creators: CreatorTileData[];
};

/**
 * "TOP 3 THIS WEEK" — the top-of-page band that surfaces the three creators
 * with the highest weekly view count across all tiers.
 *
 * Single horizontal row of three tiles (the YamoHub "Reine de la semaine"
 * pattern but with three slots instead of one). The same creators also
 * appear in their tier section below, marked with a TRENDING badge so the
 * visitor recognizes them — see TrendingWrapper. We don't repeat the
 * TRENDING badge here because the section heading already conveys it.
 *
 * Renders nothing when the creators array is empty (zero-view week, fresh
 * platform, or current city/category filter has no qualifying creators).
 */
export function TopThreeSection({ creators }: Props) {
  if (creators.length === 0) return null;

  return (
    <section
      className="mn-top3"
      aria-label="Top three creators this week"
      style={{ padding: "clamp(40px, 6vw, 64px) 0 0" }}
    >
      <SectionBanner
        label="TOP 3 THIS WEEK"
        icon={<Crown size={13} strokeWidth={2.5} />}
        accent="#E6A817"
      />

      <div className="mn-top3__inner">
        <div className="mn-top3__grid">
          {creators.map((c, idx) => (
            <div key={c.id} className="mn-top3__cell">
              {/* Rank chip — #1 / #2 / #3. Decorative; the tier badge inside
                  CreatorTile carries the tier story. Rank is a separate
                  layer so the underlying card stays untouched. */}
              <span
                className={`mn-top3__rank mn-top3__rank--${idx + 1}`}
                aria-hidden
              >
                #{idx + 1}
              </span>
              <CreatorTile creator={c} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .mn-top3__inner {
          max-width: 1140px;
          margin: 0 auto;
          padding: 0 20px;
        }
        /* Always 3 columns — Top 3 should be visible at a glance on every
           breakpoint. The cards get smaller on phones but the rank chips
           and tier badges keep them readable. The tier sections below use
           2 cols at the same width, so Top 3 visibly differs (denser row =
           "podium" feel) without changing the card itself. */
        .mn-top3__grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        @media (min-width: 640px) {
          .mn-top3__grid {
            gap: 12px;
          }
        }
        @media (min-width: 1024px) {
          .mn-top3__grid {
            gap: 16px;
          }
        }

        /* ── Border-tracing light beam ──
           Each Top 3 card gets a thin animated border. The technique:
             1. The cell has 1.5 px of padding and a slightly larger
                border-radius than the CreatorTile inside (16 vs 14 px) —
                this creates a 1.5 px "moat" around the tile.
             2. A pseudo-element behind the tile carries a conic-gradient
                that's mostly transparent with one short arc of gold →
                purple. As the gradient rotates, that arc travels around
                the cell's perimeter; overflow:hidden clips it to the
                rounded shape so only a thin moving ring is visible.
             3. The CreatorTile (with its own opaque background) covers
                the inner area, leaving only the 1.5 px moat as the
                visible border-light.
           Reduced-motion users are opted out by the global rule in
           globals.css. */
        .mn-top3__cell {
          position: relative;
          min-width: 0;
          border-radius: 16px;
          padding: 1.5px;
          overflow: hidden;
          isolation: isolate;
        }

        .mn-top3__cell::before {
          content: "";
          position: absolute;
          /* inset:-50% gives the pseudo-element a 2× canvas so its rotation
             always covers the cell's corners — no transparent gaps when the
             gradient is mid-rotation. */
          inset: -50%;
          z-index: -1;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 320deg,
            rgba(230, 168, 23, 0.50) 332deg,
            #E6A817 348deg,
            #a855f7 360deg
          );
          animation: mn-top3-spin 3.2s linear infinite;
        }
        /* Stagger so the three beams sit at different points around their
           cards instead of marching in lockstep — reads as a wave moving
           across the podium. */
        .mn-top3__cell:nth-child(2)::before { animation-delay: -1.07s; }
        .mn-top3__cell:nth-child(3)::before { animation-delay: -2.13s; }

        @keyframes mn-top3-spin {
          to { transform: rotate(360deg); }
        }
        /* Rank chip sits in the top-right corner of the media square.
           Smaller on phones so it can coexist with a wide tier badge
           (e.g. "Premium" at top-left) on a ~106px card without overlap. */
        .mn-top3__rank {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 2;
          pointer-events: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          font-family: var(--font-dm-mono);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.02em;
          line-height: 1;
          color: #1A0F00;
        }
        @media (min-width: 640px) {
          .mn-top3__rank {
            top: 10px;
            right: 10px;
            min-width: 28px;
            height: 22px;
            padding: 0 8px;
            font-size: 11px;
            letter-spacing: 0.04em;
          }
        }
        .mn-top3__rank--1 {
          background: linear-gradient(135deg, #FFD877 0%, #E6A817 100%);
          box-shadow: 0 4px 14px rgba(230, 168, 23, 0.55);
        }
        .mn-top3__rank--2 {
          background: linear-gradient(135deg, #E8E8E8 0%, #B0B0B0 100%);
          box-shadow: 0 4px 12px rgba(180, 180, 180, 0.40);
        }
        .mn-top3__rank--3 {
          background: linear-gradient(135deg, #E8A87C 0%, #B5704A 100%);
          color: #1A0F00;
          box-shadow: 0 4px 12px rgba(181, 112, 74, 0.45);
        }
      `}</style>
    </section>
  );
}
