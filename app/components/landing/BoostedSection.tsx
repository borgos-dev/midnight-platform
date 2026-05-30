import { Zap } from "lucide-react";
import { CreatorTile, type CreatorTileData } from "./CreatorTile";
import { SectionBanner } from "./SectionBanner";
import { BoostedWrapper } from "./BoostedWrapper";

type Props = {
  /** Creators with an ACTIVE Boost whose flight window covers `now`,
   *  ordered newest-bought first. Already filtered to the current
   *  city/category in page.tsx. */
  creators: CreatorTileData[];
};

/**
 * "BOOSTED" — the paid-placement band that sits high on the page (between
 * TOP 3 THIS WEEK and VIP+ Spotlight).
 *
 * Why this placement: boost is the platform's monetization lever for the
 * REGULAR tier. If creators pay CFA to be boosted and end up at the bottom
 * of the page (the YamoHub mistake), the boost product dies on its second
 * cohort — nobody renews after no traffic uplift. Boost only works as a
 * product if the boost is *visibly* worth what it costs. Placement here
 * gives boosted creators the visibility they paid for.
 *
 * Why "BOOSTED" (not "FEATURED" or "SPONSORED"): visitors need an honest
 * signal that this is paid placement so editorial trust (Top 3, tier
 * sections) stays intact. The same rule as Google sponsored / Instagram
 * sponsored — labeled, not disguised.
 *
 * Renders nothing when there are no active boosts in the current
 * city/category filter — keeps the page tight when boost inventory is
 * empty (e.g. new platform, niche city).
 */
export function BoostedSection({ creators }: Props) {
  if (creators.length === 0) return null;

  return (
    <section
      className="mn-boosted-section"
      aria-label="Boosted creators"
      style={{ padding: "clamp(40px, 6vw, 64px) 0 0" }}
    >
      <SectionBanner
        label="BOOSTED"
        icon={<Zap size={13} strokeWidth={2.5} />}
        accent="#ff8c5a"
      />

      <div className="mn-boosted-section__inner">
        <div className="mn-boosted-section__grid">
          {creators.map((c) => (
            <BoostedWrapper key={c.id} isBoosted>
              <CreatorTile creator={c} />
            </BoostedWrapper>
          ))}
        </div>
      </div>

      <style>{`
        .mn-boosted-section__inner {
          max-width: 1140px;
          margin: 0 auto;
          padding: 0 20px;
        }
        /* Same 2/3/4 cadence as the tier sections so cards stay visually
           consistent across the discovery surface. The band is capped at
           ~8 boosted creators in page.tsx so it doesn't crowd VIP+. */
        .mn-boosted-section__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 640px) {
          .mn-boosted-section__grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
        }
        @media (min-width: 1024px) {
          .mn-boosted-section__grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
          }
        }
      `}</style>
    </section>
  );
}
