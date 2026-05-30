import Link from "next/link";

type CategoryRow = { slug: string; label: string; count: number };

type Props = {
  categories: CategoryRow[];
  selectedCategory: string;
  /** Preserved across pill clicks so changing category doesn't lose the city filter. */
  selectedCity: string;
};

// Builds the next URL when a pill is tapped, preserving the city filter.
// An empty `categorySlug` means "All" (clears the category param).
function buildHref(selectedCity: string, categorySlug: string): string {
  const params = new URLSearchParams();
  if (selectedCity) params.set("city", selectedCity);
  if (categorySlug) params.set("category", categorySlug);
  const qs = params.toString();
  return qs ? `/?${qs}#creators` : "/#creators";
}

/**
 * Horizontal pill row for filtering the grid by category. Sits between the
 * LocationFilters section and the CreatorGrid. Server-rendered — each pill
 * is a Link so back/forward navigation just works and URLs are shareable.
 *
 * Categories with zero matching creators (after the city filter is applied)
 * are hidden upstream in app/page.tsx, so visitors never tap a dead pill.
 */
export function CategoryPills({ categories, selectedCategory, selectedCity }: Props) {
  // If there are no categories at all (e.g. seed never ran), hide the whole
  // section so the page doesn't get an empty band.
  if (categories.length === 0) return null;

  return (
    <section
      className="category-section"
      aria-label="Filter creators by category"
    >
      {/* Pills wrap so every category is visible — filters need to be
          ambient and discoverable. A horizontal-scroll row would hide
          options behind the right-edge fade, and a category nobody sees
          is a category nobody taps. */}
      <div
        className="category-pills"
        role="tablist"
        aria-label="Filter creators by category"
      >
        <Link
          href={buildHref(selectedCity, "")}
          className={`category-pill ${!selectedCategory ? "category-pill--active" : ""}`}
          aria-current={!selectedCategory ? "true" : undefined}
        >
          All
        </Link>

        {categories.map((c) => {
          const active = c.slug === selectedCategory;
          return (
            <Link
              key={c.slug}
              href={buildHref(selectedCity, c.slug)}
              className={`category-pill ${active ? "category-pill--active" : ""}`}
              aria-current={active ? "true" : undefined}
            >
              <span>{c.label}</span>
              <span className="category-pill__count">{c.count}</span>
            </Link>
          );
        })}
      </div>

      <style>{`
        .category-section {
          background: var(--bg-base);
          padding: 0 20px 24px;
        }

        @media (min-width: 1140px) {
          .category-section {
            max-width: 1140px;
            margin: 0 auto;
          }
        }

        .category-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .category-pill {
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
        .category-pill:hover {
          border-color: rgba(168, 85, 247, 0.4);
          color: var(--text-primary);
        }

        .category-pill--active {
          border-color: var(--accent-purple);
          background: rgba(168, 85, 247, 0.12);
          color: var(--text-primary);
        }

        .category-pill__count {
          font-family: var(--font-dm-mono);
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }
        .category-pill--active .category-pill__count {
          color: var(--accent-purple);
        }
      `}</style>
    </section>
  );
}
