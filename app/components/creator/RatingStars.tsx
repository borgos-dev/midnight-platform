import { Star } from "lucide-react";

type Props = {
  /** Average rating in the 1..5 range. */
  rating: number;
  /** Icon size in pixels. */
  size?: number;
  /** Show the numeric value (e.g. "4.7") next to the stars. */
  showValue?: boolean;
  /** Optional review count, appended in parens after the value. */
  count?: number;
};

/**
 * Compact, non-interactive star display used on creator cards + at the
 * top of the public profile. Stars partially fill via a clip-path so an
 * average of 4.3 actually looks 4.3, not "4 or 5".
 *
 * Renders as a flex row of five gold stars. The fill comes from a single
 * absolutely-positioned gradient layer clipped to the rating width — one
 * SVG layer instead of five computed-fill icons, so we don't ship a tiny
 * SVG per percentage point.
 */
export function RatingStars({
  rating,
  size = 13,
  showValue = false,
  count,
}: Props) {
  const clamped = Math.max(0, Math.min(5, rating));
  const fillPct = (clamped / 5) * 100;

  return (
    <span
      className="mn-rating-stars"
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5${count !== undefined ? ` from ${count} reviews` : ""}`}
    >
      <span className="mn-rating-stars__track" aria-hidden>
        {/* Background row — empty outlines. */}
        <span className="mn-rating-stars__bg">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              size={size}
              strokeWidth={1.6}
              style={{
                color: "rgba(255, 255, 255, 0.18)",
                fill: "transparent",
              }}
            />
          ))}
        </span>
        {/* Foreground row — solid gold, clipped to the rating width.
            Same five icons stacked over the background, then the
            containing span clips horizontally so partial stars are
            sliced precisely. */}
        <span
          className="mn-rating-stars__fg"
          style={{ width: `${fillPct}%` }}
          aria-hidden
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              size={size}
              strokeWidth={1.6}
              style={{
                color: "#E6A817",
                fill: "#E6A817",
              }}
            />
          ))}
        </span>
      </span>

      {showValue && (
        <span className="mn-rating-stars__value">
          {clamped.toFixed(1)}
          {count !== undefined && (
            <span className="mn-rating-stars__count"> ({count})</span>
          )}
        </span>
      )}

      <style>{`
        .mn-rating-stars {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          line-height: 1;
        }
        .mn-rating-stars__track {
          position: relative;
          display: inline-flex;
          /* Match the icon size so the partial-fill clipping aligns
             with the stroke caps. */
          align-items: center;
        }
        .mn-rating-stars__bg,
        .mn-rating-stars__fg {
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        .mn-rating-stars__fg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          white-space: nowrap;
        }
        .mn-rating-stars__value {
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.04em;
        }
        .mn-rating-stars__count {
          color: var(--text-muted);
          font-weight: 500;
        }
      `}</style>
    </span>
  );
}
