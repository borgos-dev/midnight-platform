"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { CreatorTile, type CreatorTileData } from "./CreatorTile";
import { fetchMoreCreators } from "@/app/actions/creators";

type Props = {
  initialCreators: CreatorTileData[];
  selectedCity: string;
  selectedCategory: string;
  selectedSort: string;
  initialHasMore: boolean;
  /** True when a VIP+ spotlight shelf is being rendered above us. When set,
   *  the heading shifts from "All Creators" → "More Creators" so it doesn't
   *  read as if VIP+ are missing. */
  hideHeadingWhenSpotlight?: boolean;
};

/**
 * The landing-page creator grid.
 *
 * Initial render comes from the server (page.tsx fetches the first
 * GRID_PAGE_SIZE). Subsequent pages load via a server action; this
 * component keeps an accumulating list in client state.
 *
 * The grid + "Load more" button sits inside an <section id="creators">
 * so the hero's BROWSE CREATORS CTA and the LocationFilters city cards
 * (which link with #creators hash) scroll-snap to this section.
 */
export function CreatorGrid({
  initialCreators,
  selectedCity,
  selectedCategory,
  selectedSort,
  initialHasMore,
  hideHeadingWhenSpotlight = false,
}: Props) {
  const [creators, setCreators] = useState(initialCreators);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  // When the city / category / sort filter changes (URL params), the server
  // re-renders the page and passes new initialCreators — sync local state.
  useEffect(() => {
    setCreators(initialCreators);
    setPage(1);
    setHasMore(initialHasMore);
  }, [
    initialCreators,
    initialHasMore,
    selectedCity,
    selectedCategory,
    selectedSort,
  ]);

  const loadMore = () => {
    if (isPending || !hasMore) return;
    const nextPage = page + 1;
    startTransition(async () => {
      const result = await fetchMoreCreators(
        nextPage,
        selectedCity,
        selectedCategory,
        selectedSort,
      );
      setCreators((prev) => [...prev, ...result.creators]);
      setPage(nextPage);
      setHasMore(result.hasMore);
    });
  };

  return (
    <section
      style={{
        background: "var(--bg-base)",
        padding: "clamp(40px, 6vw, 64px) 20px 80px",
        scrollMarginTop: "80px",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Section heading */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "11px",
              color: "var(--accent-gold)",
              letterSpacing: "0.14em",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            {hideHeadingWhenSpotlight
              ? "MORE CREATORS"
              : selectedCity
                ? `CREATORS IN ${selectedCity.toUpperCase()}`
                : "ALL CREATORS"}
          </div>
          <h2
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "clamp(26px, 4.5vw, 36px)",
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Discover who&apos;s waiting tonight
          </h2>
        </div>

        {/* Grid OR empty state */}
        {creators.length === 0 ? (
          <EmptyState selectedCity={selectedCity} />
        ) : (
          <>
            <div className="cg-grid">
              {creators.map((c) => (
                <CreatorTile key={c.id} creator={c} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "32px",
                }}
              >
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isPending}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "200px",
                    padding: "14px 28px",
                    borderRadius: "12px",
                    border: "1px solid var(--border-strong)",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-dm-mono)",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.10em",
                    cursor: isPending ? "wait" : "pointer",
                    opacity: isPending ? 0.6 : 1,
                    transition: "border-color 0.2s ease, background 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isPending) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "var(--accent-purple)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "var(--border-strong)";
                  }}
                >
                  {isPending ? "LOADING…" : "LOAD MORE"}
                </button>
              </div>
            )}

            {/* End-of-list signal (when no more pages) */}
            {!hasMore && creators.length > GRID_PAGE_SIZE_HINT && (
              <p
                style={{
                  textAlign: "center",
                  marginTop: "32px",
                  fontFamily: "var(--font-dm-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  color: "var(--text-muted)",
                  opacity: 0.6,
                }}
              >
                — END —
              </p>
            )}
          </>
        )}
      </div>

      <style>{`
        .cg-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 640px) {
          .cg-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
        }
        @media (min-width: 1024px) {
          .cg-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
          }
        }
      `}</style>
    </section>
  );
}

// Used only for the optional "— END —" hint at the bottom. Kept loose
// (no need to import the server-side constant just for this signal).
const GRID_PAGE_SIZE_HINT = 23;

function EmptyState({ selectedCity }: { selectedCity: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "64px 24px",
        borderRadius: "16px",
        border: "1px dashed var(--border-strong)",
        background: "rgba(255,255,255,0.015)",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "rgba(168,85,247,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Users size={24} color="var(--accent-purple)" />
      </div>
      <p
        style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "20px",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        {selectedCity
          ? `No creators in ${selectedCity} yet`
          : "No creators yet — be the first"}
      </p>
      <p
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          fontFamily: "var(--font-dm-sans)",
          margin: 0,
          maxWidth: "360px",
          lineHeight: 1.6,
        }}
      >
        {selectedCity
          ? "Try another city — or be the first creator here."
          : "Sign up as a creator and start earning from your audience."}
      </p>
      <Link
        href="/become-a-member"
        style={{
          marginTop: "8px",
          display: "inline-flex",
          alignItems: "center",
          padding: "12px 24px",
          borderRadius: "10px",
          background: "linear-gradient(135deg, var(--accent-purple), #7c3aed)",
          color: "#fff",
          textDecoration: "none",
          fontFamily: "var(--font-dm-mono)",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.10em",
          boxShadow: "0 0 18px rgba(168,85,247,0.3)",
        }}
      >
        BECOME A CREATOR
      </Link>
    </div>
  );
}
