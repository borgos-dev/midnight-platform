import Link from "next/link";
import { MapPin, X } from "lucide-react";

type CityRow = { name: string; count: number };

type Props = {
  cities: CityRow[];
  selectedCity: string;
  /** When true, the matching city card gets a "● Your area" marker. */
  autoDetected: boolean;
};

/**
 * Landing-page location filter.
 *
 * Section structure:
 *   [eyebrow]   BROWSE BY CITY
 *   [heading]   Find your night
 *   [clear]     (only when a city is selected) × Show all cities
 *   [grid]      city cards (2/3/4 cols responsive)
 *
 * Each card links to /?city=<name>#creators — the URL hash triggers a
 * smooth scroll to the creator grid (built in chunk 3). When chunk 3
 * isn't there yet the hash still works, it just scrolls to the empty
 * anchor placeholder in LandingHome.
 */
export function LocationFilters({ cities, selectedCity, autoDetected }: Props) {
  if (cities.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        background: "var(--bg-base)",
        padding: "clamp(56px, 9vw, 96px) 20px",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header row: eyebrow + heading + (optional) clear */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "28px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-dm-mono)",
                fontSize: "11px",
                color: "var(--accent-purple)",
                letterSpacing: "0.14em",
                fontWeight: 700,
                marginBottom: "10px",
              }}
            >
              BROWSE BY CITY
            </div>
            <h2
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "clamp(28px, 5vw, 40px)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Find your night
            </h2>
          </div>

          {selectedCity && (
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "20px",
                border: "1px solid var(--border-strong)",
                background: "transparent",
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontFamily: "var(--font-dm-mono)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                whiteSpace: "nowrap",
                transition: "border-color 0.2s ease, color 0.2s ease",
              }}
            >
              <X size={12} />
              SHOW ALL
            </Link>
          )}
        </div>

        {/* City card grid */}
        <div className="city-grid">
          {cities.map((c) => {
            const isActive = c.name === selectedCity;
            const isYourArea = autoDetected && isActive;
            return (
              <Link
                key={c.name}
                href={`/?city=${encodeURIComponent(c.name)}#creators`}
                className={`city-card ${isActive ? "city-card--active" : ""}`}
                aria-current={isActive ? "true" : undefined}
              >
                <span className="city-card__pin" aria-hidden>
                  <MapPin size={14} />
                </span>
                <span className="city-card__name">{c.name}</span>
                <span className="city-card__count">
                  {c.count.toLocaleString()}
                </span>
                {isYourArea && (
                  <span className="city-card__hint" aria-label="From your area">
                    <span className="city-card__dot" aria-hidden />
                    Your area
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Scoped styles — inline `style` can't do media queries or pseudo-states. */}
      <style>{`
        .city-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 640px) {
          .city-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
        }
        @media (min-width: 1024px) {
          .city-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
          }
        }

        .city-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-primary);
          text-decoration: none;
          font-family: var(--font-dm-sans);
          transition: border-color 0.2s ease, background 0.2s ease,
            transform 0.15s ease;
        }
        .city-card:hover {
          border-color: rgba(168, 85, 247, 0.4);
          background: rgba(168, 85, 247, 0.04);
          transform: translateY(-1px);
        }

        .city-card--active {
          border-color: var(--accent-purple);
          background: rgba(168, 85, 247, 0.08);
        }
        .city-card--active:hover {
          border-color: var(--accent-purple);
          background: rgba(168, 85, 247, 0.12);
        }

        .city-card__pin {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-purple);
          flex-shrink: 0;
        }

        .city-card__name {
          flex: 1;
          min-width: 0;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .city-card__count {
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .city-card--active .city-card__count {
          color: var(--accent-purple);
        }

        /* "Your area" hint sits in the top-right corner of the active card */
        .city-card__hint {
          position: absolute;
          top: -8px;
          right: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 12px;
          background: linear-gradient(135deg, #5cb88a, #3a8862);
          color: #fff;
          font-family: var(--font-dm-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow: 0 0 10px rgba(92, 184, 138, 0.3);
          white-space: nowrap;
        }
        .city-card__dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #fff;
        }
      `}</style>
    </section>
  );
}
