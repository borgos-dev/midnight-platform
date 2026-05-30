import type { ReactNode } from "react";
import { Zap } from "lucide-react";

type Props = {
  isBoosted: boolean;
  children: ReactNode;
};

/**
 * Wraps a CreatorTile to overlay a "⚡ BOOSTED" pill in the top-right when
 * the creator currently has an ACTIVE Boost row.
 *
 * Visually a sibling of TrendingWrapper: same orange→rose gradient and
 * top-right positioning, different icon (Zap vs Flame) and label so visitors
 * learn two distinct signals without learning two new colour codes.
 *
 * Honest signaling: this is paid placement. The label is intentionally
 * "BOOSTED" (not "FEATURED") so visitors can't mistake it for an editorial
 * choice — that's the right product call per the boost-monetization
 * discussion. The within-tier float (boosted creators sorted to the top of
 * the Regular section) is what makes the badge worth its CFA — the band
 * at the top of the page (BoostedSection) does the heavy lifting.
 *
 * Like TrendingWrapper, the badge is `pointer-events: none` so taps still
 * hit the underlying CreatorTile link.
 */
export function BoostedWrapper({ isBoosted, children }: Props) {
  if (!isBoosted) {
    return <>{children}</>;
  }

  return (
    <div className="mn-boosted-wrap">
      {children}
      <span className="mn-boosted-badge" aria-label="Boosted creator">
        <Zap size={11} strokeWidth={2.5} />
        BOOSTED
      </span>

      <style>{`
        .mn-boosted-wrap {
          position: relative;
        }
        .mn-boosted-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 9px;
          border-radius: 999px;
          /* Same warm orange→rose gradient as TrendingWrapper — "things to
             pay attention to" share one colour. The label + icon do the
             differentiation. */
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
