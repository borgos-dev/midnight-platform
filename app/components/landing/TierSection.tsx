import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Sparkles, Star, Circle, type LucideIcon } from "lucide-react";
import { AccessLevel } from "@prisma/client";
import { CreatorTile, type CreatorTileData } from "./CreatorTile";
import { SectionBanner } from "./SectionBanner";
import { TrendingWrapper } from "./TrendingWrapper";
import { BoostedWrapper } from "./BoostedWrapper";

type Props = {
  /** Which tier this section renders — drives label, accent, icon, sort link. */
  tier: Extract<AccessLevel, "VIP" | "PREMIUM" | "REGULAR">;
  creators: CreatorTileData[];
  /** IDs of creators that should get a TRENDING overlay (the week's Top 3). */
  trendingIds: Set<number>;
  /** IDs of creators that currently have an ACTIVE Boost. In the Regular
   *  section these are already floated to the top (page.tsx prepends them).
   *  We use the IDs here to paint the BOOSTED badge on the right cards. */
  boostedIds?: Set<number>;
  /** When set, renders a "VIEW ALL →" link in the banner trailing slot. */
  viewAllHref?: string;
};

type TierMeta = {
  label: string;
  accent: string;
  icon: LucideIcon;
};

const TIER_META: Record<Props["tier"], TierMeta> = {
  VIP: {
    label: "VIP · FEATURED",
    accent: "#a855f7",
    icon: Sparkles,
  },
  PREMIUM: {
    label: "PREMIUM",
    accent: "#E8547A",
    icon: Star,
  },
  REGULAR: {
    // "ALL CREATORS" reads better than "REGULAR" — the underlying tier is a
    // billing/access concept, not a label visitors should see.
    label: "ALL CREATORS",
    accent: "#6A6A9A",
    icon: Circle,
  },
};

/**
 * Tiered creator grid section. Renders one band per tier (VIP, Premium,
 * Regular) — VIP+ keeps its existing carousel treatment in VipPlusSpotlight
 * because the curated horizontal shelf is a deliberate premium signal.
 *
 * Layout: SectionBanner header + 2/3/4-column responsive grid sharing the
 * same breakpoints as CreatorGrid (640/1024) so card sizes stay visually
 * consistent across the page.
 *
 * Creators in `trendingIds` (this week's Top 3) get a TRENDING overlay so
 * they remain recognizable inside their tier band — see TrendingWrapper.
 *
 * Renders nothing when `creators` is empty. That keeps the homepage clean
 * when a city/category filter has no creators in a given tier.
 */
export function TierSection({
  tier,
  creators,
  trendingIds,
  boostedIds,
  viewAllHref,
}: Props) {
  if (creators.length === 0) return null;

  const meta = TIER_META[tier];
  const Icon = meta.icon;
  const boosted = boostedIds ?? new Set<number>();

  const trailing: ReactNode = viewAllHref ? (
    <Link
      href={viewAllHref}
      className="mn-tier-section__view-all"
      style={{
        // Tier-tinted border + color, picked from the section accent so
        // each band's VIEW ALL feels like part of that tier's visual world.
        borderColor: `${meta.accent}59`,
        background: `${meta.accent}14`,
        color: meta.accent,
      }}
      aria-label={`View all ${meta.label.toLowerCase()} creators`}
    >
      <span>VIEW ALL</span>
      <ArrowRight size={12} strokeWidth={2.5} />
    </Link>
  ) : null;

  return (
    <section
      className="mn-tier-section"
      aria-label={`${meta.label} creators`}
      style={{ padding: "clamp(40px, 6vw, 64px) 0 0" }}
    >
      <SectionBanner
        label={meta.label}
        icon={<Icon size={13} strokeWidth={2.5} />}
        accent={meta.accent}
        trailing={trailing}
      />

      <div className="mn-tier-section__inner">
        <div className="mn-tier-section__grid">
          {creators.map((c) => {
            // Badge precedence rule (Regular section is the only place both
            // signals can collide, since boost is REGULAR-only today):
            //   - If the creator is BOOSTED → show BOOSTED badge (paid signal
            //     wins in context, and the boost is what's funding their
            //     top-of-section placement).
            //   - Else if the creator is TRENDING → show TRENDING badge.
            //   - Else no badge.
            // Avoids stacking two pills in the same top-right slot.
            const isBoosted = boosted.has(c.id);
            const isTrending = !isBoosted && trendingIds.has(c.id);
            return (
              <BoostedWrapper key={c.id} isBoosted={isBoosted}>
                <TrendingWrapper isTrending={isTrending}>
                  <CreatorTile creator={c} />
                </TrendingWrapper>
              </BoostedWrapper>
            );
          })}
        </div>
      </div>

      <style>{`
        .mn-tier-section__inner {
          max-width: 1140px;
          margin: 0 auto;
          padding: 0 20px;
        }
        /* Same grid as CreatorGrid (2 → 3 → 4 cols at 640/1024) so the card
           sizes match the rest of the discovery surface — visitors don't
           experience a jarring rescale when crossing tier bands. */
        .mn-tier-section__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 640px) {
          .mn-tier-section__grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
        }
        @media (min-width: 1024px) {
          .mn-tier-section__grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
          }
        }

        .mn-tier-section__view-all {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid;
          text-decoration: none;
          font-family: var(--font-dm-mono);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.10em;
          white-space: nowrap;
          transition: filter 0.18s ease;
        }
        .mn-tier-section__view-all:hover {
          filter: brightness(1.15);
        }
      `}</style>
    </section>
  );
}
