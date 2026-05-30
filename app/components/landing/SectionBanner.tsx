import type { ReactNode } from "react";

type Props = {
  /** Short eyebrow label, ALL CAPS (e.g. "VIP · FEATURED"). */
  label: string;
  /** Lucide icon or emoji span to render next to the label. */
  icon?: ReactNode;
  /** Accent color for the divider rules + label. Hex/var. */
  accent: string;
  /** Optional right-side affordance (usually a "VIEW ALL →" link). */
  trailing?: ReactNode;
};

/**
 * The thin band that separates tier sections on the landing page.
 *
 *   ──────────── 👑 VIP+ SPOTLIGHT ────────────
 *
 * Modeled on the YamoHub layout the project is trying to one-up: every tier
 * gets a clearly labeled band so visitors can scan ranking at a glance
 * instead of decoding badges on individual cards.
 *
 * Visually it's a centered eyebrow with two horizontal rules fading from the
 * accent color into transparent. The trailing slot exists for "VIEW ALL →"
 * links (already used by VipPlusSpotlight). Single render — no JS state.
 */
export function SectionBanner({ label, icon, accent, trailing }: Props) {
  return (
    <div className="mn-banner">
      <span
        className="mn-banner__rule mn-banner__rule--left"
        style={{
          background: `linear-gradient(to right, transparent, ${accent}55)`,
        }}
        aria-hidden
      />
      <span className="mn-banner__label" style={{ color: accent }}>
        {icon && <span className="mn-banner__icon" aria-hidden>{icon}</span>}
        {label}
      </span>
      <span
        className="mn-banner__rule mn-banner__rule--right"
        style={{
          background: `linear-gradient(to left, transparent, ${accent}55)`,
        }}
        aria-hidden
      />
      {trailing && <span className="mn-banner__trailing">{trailing}</span>}

      <style>{`
        .mn-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 20px 0;
          margin: 0 auto 20px;
          max-width: 1140px;
        }
        .mn-banner__rule {
          flex: 1;
          height: 1px;
          min-width: 0;
        }
        /* The right-side rule shrinks when a trailing slot (VIEW ALL link)
           is present, so the divider line still touches the label edge. */
        .mn-banner:has(.mn-banner__trailing) .mn-banner__rule--right {
          flex: 0 0 24px;
        }
        .mn-banner__label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .mn-banner__icon {
          display: inline-flex;
          align-items: center;
        }
        .mn-banner__trailing {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
