import type { ReactNode } from "react";
import { Flame } from "lucide-react";

type Props = {
  isTrending: boolean;
  children: ReactNode;
};

/**
 * Wraps a CreatorTile to overlay a "🔥 TRENDING" pill in the top-right when
 * the creator is one of this week's Top 3.
 *
 * The wrapper is intentionally separate from CreatorTile so card styling
 * stays untouched — the tile renders the same way in every section; this
 * component only paints a non-interactive overlay on top of it. The badge
 * is `pointer-events: none` so taps still hit the underlying card link.
 *
 * Positioned top-right because CreatorTile already uses top-left for the
 * tier badge ("VIP+" / "VIP" / "Premium") and bottom-right for the "ID"
 * verified capsule. Top-right was the only free corner.
 */
export function TrendingWrapper({ isTrending, children }: Props) {
  if (!isTrending) {
    return <>{children}</>;
  }

  return (
    <div className="mn-trending-wrap">
      {children}
      <span className="mn-trending-badge" aria-label="Trending this week">
        <Flame size={11} strokeWidth={2.5} />
        TRENDING
      </span>

      <style>{`
        .mn-trending-wrap {
          position: relative;
        }
        .mn-trending-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 9px;
          border-radius: 999px;
          /* Warm orange/rose to feel "hot/new" without competing with the
             gold/purple/rose tier badges. */
          background: linear-gradient(135deg, #ff8c5a 0%, #f15a4a 100%);
          color: #fff;
          font-family: var(--font-dm-mono);
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          line-height: 1;
          box-shadow: 0 2px 10px rgba(241, 90, 74, 0.45);
          pointer-events: none;
          z-index: 2;
        }
      `}</style>
    </div>
  );
}
