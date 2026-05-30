import { TopNav } from "./TopNav";
import { Hero } from "./Hero";
import { LocationFilters } from "./LocationFilters";
import { CategoryPills } from "./CategoryPills";
import { SortPills } from "./SortPills";
import { TopThreeSection } from "./TopThreeSection";
import { BoostedSection } from "./BoostedSection";
import { VipPlusSpotlight } from "./VipPlusSpotlight";
import { TierSection } from "./TierSection";
import { AdSlot, type AdSlotData } from "./AdSlot";
import { LatestFeedStrip, type LatestFeedItem } from "./LatestFeedStrip";
import { CreatorGrid } from "./CreatorGrid";
import type { CreatorTileData } from "./CreatorTile";

type Props = {
  isLoggedIn: boolean;
  cities: { name: string; count: number }[];
  categories: { slug: string; label: string; count: number }[];
  sortPills: { slug: string; label: string; count: number }[];
  selectedCity: string;
  selectedCategory: string;
  selectedSort: string;
  autoDetected: boolean;

  // ── Sectioned-view data (populated when selectedSort === "") ──
  /** Top 3 creators by weekly views, across all tiers. Shown in the
   *  "TOP 3 THIS WEEK" band above the tier sections. */
  topThreeCreators: CreatorTileData[];
  /** VIP+ creators for the existing carousel shelf. */
  spotlightCreators: CreatorTileData[];
  /** VIP creators for the dedicated VIP band. */
  vipCreators: CreatorTileData[];
  /** Premium creators for the dedicated Premium band. */
  premiumCreators: CreatorTileData[];
  /** Regular creators for the dedicated "All creators" band. Boosted
   *  Regular creators are prepended in page.tsx so they float to the top. */
  regularCreators: CreatorTileData[];
  /** Creators with an ACTIVE Boost — rendered in the top-of-page BOOSTED
   *  band. Same list (or its REGULAR subset) is prepended to the Regular
   *  tier section by page.tsx; we don't re-prepend here. */
  boostedCreators: CreatorTileData[];
  /** IDs of boosted creators. Used to paint the BOOSTED badge on the
   *  floated-to-top cards inside the Regular tier section. */
  boostedCreatorIds: number[];

  ad: AdSlotData | null;
  latestFeedItems: LatestFeedItem[];

  // ── Sort-filter-view data (populated when a sort pill is active) ──
  /** Flat list of creators across the queried tier(s) — used by CreatorGrid
   *  with Load More pagination when the visitor has narrowed via ?sort=. */
  initialCreators: CreatorTileData[];
  initialHasMore: boolean;
};

/**
 * Landing-page shell.
 *
 * Two rendering modes branch on `selectedSort`:
 *
 *   - **Sectioned (default)**: TOP 3 THIS WEEK → VIP+ Spotlight (carousel)
 *     → VIP → Premium → Regular. Each tier band uses a SectionBanner
 *     divider and 2/3/4-column responsive grid. Top-3 creators carry a
 *     TRENDING overlay inside their tier section so visitors recognize
 *     them across bands without the tier section feeling incomplete.
 *
 *   - **Filtered**: when a sort pill is active (?sort=vipPlus / vip /
 *     premium / verified / new) we fall back to the original single
 *     CreatorGrid with Load More pagination. Tier sectioning would be
 *     redundant when the visitor has already narrowed to one slice.
 *
 * The hero, location filters, category pills, and sort pills always render
 * — they're the navigation chrome that drives both modes.
 */
export function LandingHome({
  isLoggedIn,
  cities,
  categories,
  sortPills,
  selectedCity,
  selectedCategory,
  selectedSort,
  autoDetected,
  topThreeCreators,
  spotlightCreators,
  vipCreators,
  premiumCreators,
  regularCreators,
  boostedCreators,
  boostedCreatorIds,
  ad,
  latestFeedItems,
  initialCreators,
  initialHasMore,
}: Props) {
  const isSectionedView = selectedSort === "";

  // Set of IDs that should get the TRENDING overlay inside their tier band.
  // Top 3 creators appear in both the top-3 row AND their tier section —
  // they're not removed from the tier (otherwise tier sections feel
  // artificially empty), they're re-marked so visitors can spot them.
  const trendingIds = new Set(topThreeCreators.map((c) => c.id));

  // Set of IDs that currently have an ACTIVE Boost. Used only by the
  // Regular TierSection — boost is REGULAR-only today, and the BOOSTED
  // band at the top of the page already shows them prominently. The
  // within-tier float (page.tsx prepends them to regularCreators) plus
  // this badge set together implement the "B + A combined" placement
  // from the boost-monetization discussion.
  const boostedIds = new Set(boostedCreatorIds);

  // Skip-the-grid guard for the sort-filter mode: when the spotlight has
  // VIP+ creators but the rest of the filter yields nothing, we don't
  // want to render an empty "no creators" card under it.
  const hasSpotlight = spotlightCreators.length > 0;
  const showSortFilterGrid =
    !isSectionedView && (initialCreators.length > 0 || !hasSpotlight);

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
      <TopNav isLoggedIn={isLoggedIn} />
      <Hero />
      <LocationFilters
        cities={cities}
        selectedCity={selectedCity}
        autoDetected={autoDetected}
      />
      <CategoryPills
        categories={categories}
        selectedCategory={selectedCategory}
        selectedCity={selectedCity}
      />
      <SortPills
        pills={sortPills}
        selectedSort={selectedSort}
        selectedCity={selectedCity}
        selectedCategory={selectedCategory}
      />

      {/* `#creators` anchor wraps everything below the filters so the hero
          CTA and city cards scroll-snap to the same starting point in
          both rendering modes. */}
      <div id="creators" style={{ scrollMarginTop: "80px" }}>
        {isSectionedView ? (
          <>
            {/* Top 3 band — appears first when present. Drops off entirely
                if the current city/category filter has no qualifying
                creators (zero weekly views or zero matches). */}
            <TopThreeSection creators={topThreeCreators} />

            {/* BOOSTED band — sits high on the page (between Top 3 and the
                VIP+ Spotlight) so creators paying for boost get visible
                lift, not a buried section at the bottom of the page. Drops
                off entirely when no active boosts match the current city
                /category filter. The same creators (REGULAR subset) are
                also floated to the top of the Regular tier section below
                so the boost lifts visibility in both browsing modes. */}
            <BoostedSection creators={boostedCreators} />

            {/* VIP+ carousel — existing styling preserved. Top-3 creators
                that happen to be VIP+ get a TRENDING overlay here too. */}
            <VipPlusSpotlight
              creators={spotlightCreators}
              trendingIds={trendingIds}
            />

            {/* Latest feed teaser + active ad sit between VIP+ and VIP so
                the upper-tier showcase isn't interrupted but the lower
                tiers still get exposure to feed/ad surfaces. */}
            <LatestFeedStrip items={latestFeedItems} />
            {ad && <AdSlot ad={ad} />}

            <TierSection
              tier="VIP"
              creators={vipCreators}
              trendingIds={trendingIds}
              viewAllHref="/?sort=vip#creators"
            />
            <TierSection
              tier="PREMIUM"
              creators={premiumCreators}
              trendingIds={trendingIds}
              viewAllHref="/?sort=premium#creators"
            />
            {/* Regular has no VIEW ALL because there's no /?sort=regular
                route — it's the default "everyone else" pool. We bumped
                its cap to 24 in page.tsx so the band feels generous.
                boostedIds is passed only here because boost is REGULAR-only
                today; boosted creators were already prepended to the
                regularCreators array server-side, this just paints the
                BOOSTED badge on the right cards. */}
            <TierSection
              tier="REGULAR"
              creators={regularCreators}
              trendingIds={trendingIds}
              boostedIds={boostedIds}
            />
          </>
        ) : (
          <>
            {/* Sort filter active. When the filter is `?sort=vipPlus` we
                still render the carousel (it's the natural VIP+ surface).
                For other sort filters the spotlight bucket is empty and
                this component just no-ops. */}
            <VipPlusSpotlight creators={spotlightCreators} />

            <LatestFeedStrip items={latestFeedItems} />
            {ad && <AdSlot ad={ad} />}

            {showSortFilterGrid && (
              <CreatorGrid
                initialCreators={initialCreators}
                selectedCity={selectedCity}
                selectedCategory={selectedCategory}
                selectedSort={selectedSort}
                initialHasMore={initialHasMore}
                hideHeadingWhenSpotlight={hasSpotlight}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
