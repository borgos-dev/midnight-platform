import Link from "next/link";
import { Crown, Sparkles, Star, BadgeCheck, Flame } from "lucide-react";

type SortRow = { slug: string; label: string; count: number };

type Props = {
  pills: SortRow[];
  selectedSort: string;
  /** Preserved across pill clicks so changing sort keeps city + category. */
  selectedCity: string;
  selectedCategory: string;
};

// Builds the next URL when a sort pill is tapped, preserving city + category.
// An empty `sortSlug` means "All" (clears the sort param).
function buildHref(city: string, category: string, sortSlug: string): string {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (category) params.set("category", category);
  if (sortSlug) params.set("sort", sortSlug);
  const qs = params.toString();
  return qs ? `/?${qs}#creators` : "/#creators";
}

// Tier-tinted styling lifted from CreatorTile / DashboardShell tokens so the
// active pill carries the same color story as the badges and corner wedges.
const PILL_ACCENTS: Record<string, { border: string; bg: string; color: string }> = {
  vipPlus:  { border: "rgba(230,168,23,0.55)", bg: "rgba(230,168,23,0.14)", color: "#E6A817" },
  vip:      { border: "rgba(168,85,247,0.55)", bg: "rgba(168,85,247,0.14)", color: "#a855f7" },
  premium:  { border: "rgba(232,84,122,0.55)", bg: "rgba(232,84,122,0.14)", color: "#E8547A" },
  verified: { border: "rgba(59,158,255,0.55)",  bg: "rgba(59,158,255,0.14)",  color: "#3b9eff" },
  new:      { border: "rgba(255,140,90,0.55)",  bg: "rgba(255,140,90,0.14)",  color: "#ff8c5a" },
};

function iconForSlug(slug: string): React.ReactNode {
  switch (slug) {
    case "vipPlus":  return <Crown size={12} />;
    case "vip":      return <Sparkles size={12} />;
    case "premium":  return <Star size={12} />;
    case "verified": return <BadgeCheck size={12} />;
    case "new":      return <Flame size={12} />;
    default:         return null;
  }
}

/**
 * Quality / recency filter row. Sits directly below the category pills and
 * combines with city + category — all three axes intersect (a visitor can
 * narrow to "Douala · Escort · VIP+" simultaneously).
 *
 * Pills are server-rendered links so back/forward navigation and URL sharing
 * work without client JS.
 */
export function SortPills({ pills, selectedSort, selectedCity, selectedCategory }: Props) {
  if (pills.length === 0) return null;

  return (
    <section
      className="sort-section"
      aria-label="Sort creators by tier, verified status, or recency"
    >
      <div
        className="sort-pills"
        role="tablist"
        aria-label="Sort creators"
      >
        <Link
          href={buildHref(selectedCity, selectedCategory, "")}
          className={`sort-pill ${!selectedSort ? "sort-pill--active" : ""}`}
          aria-current={!selectedSort ? "true" : undefined}
        >
          All
        </Link>

        {pills.map((p) => {
          const active = p.slug === selectedSort;
          const accent = PILL_ACCENTS[p.slug];
          const style: React.CSSProperties | undefined =
            active && accent
              ? {
                  borderColor: accent.border,
                  background: accent.bg,
                  color: accent.color,
                }
              : undefined;
          return (
            <Link
              key={p.slug}
              href={buildHref(selectedCity, selectedCategory, p.slug)}
              className={`sort-pill ${active ? "sort-pill--active" : ""}`}
              aria-current={active ? "true" : undefined}
              style={style}
            >
              <span className="sort-pill__icon" aria-hidden>
                {iconForSlug(p.slug)}
              </span>
              <span>{p.label}</span>
              <span className="sort-pill__count">{p.count}</span>
            </Link>
          );
        })}
      </div>

      <style>{`
        .sort-section {
          background: var(--bg-base);
          padding: 0 20px 28px;
        }

        @media (min-width: 1140px) {
          .sort-section {
            max-width: 1140px;
            margin: 0 auto;
          }
        }

        .sort-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .sort-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-secondary);
          text-decoration: none;
          font-family: var(--font-dm-sans);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: -0.01em;
          white-space: nowrap;
          transition: border-color 0.18s ease, background 0.18s ease,
            color 0.18s ease;
        }
        .sort-pill:hover {
          border-color: var(--border-strong);
          color: var(--text-primary);
        }

        /* Default "All" pill active state — pulls the brand purple since it's
           the same neutral state used by the category All pill. */
        .sort-pill--active:not([style]) {
          border-color: var(--accent-purple);
          background: rgba(168, 85, 247, 0.12);
          color: var(--text-primary);
        }

        .sort-pill__icon {
          display: inline-flex;
          align-items: center;
          color: currentColor;
          opacity: 0.85;
        }

        .sort-pill__count {
          font-family: var(--font-dm-mono);
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }
        .sort-pill--active .sort-pill__count {
          color: currentColor;
          opacity: 0.85;
        }
      `}</style>
    </section>
  );
}
