import Image from "next/image";
import Link from "next/link";
import { AccessLevel } from "@prisma/client";
import { MapPin, Eye, ShieldCheck, Star } from "lucide-react";

export type CreatorTileData = {
  id: number;
  name: string;
  city: string;
  neighborhood: string | null;
  tier: AccessLevel;
  avatarUrl: string | null;
  verified: boolean;
  age: number | null;
  views: number;
  mediaUrl: string | null;
  mediaKind: string | null;
  /** Aggregated rating from `Review` rows. Populated only when the
   *  creator has crossed the visibility threshold (default 5 reviews).
   *  Below that threshold a single outlier (5-star troll review,
   *  1-star spite review) would mislead so we hide it. */
  rating?: {
    average: number;
    count: number;
  } | null;
};

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.floor(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

/**
 * Creator card for the landing-page grid (Chunk 8 polish).
 *
 * Visual layers (top to bottom of the photo square):
 *   - Solid tier badge top-left:   gold "VIP+" / purple "VIP" / rose "Premium"
 *                                   (Regular gets no badge — neutral by default)
 *   - "ID ✓" capsule bottom-right: blue ShieldCheck pill, signals identity
 *                                   verification (distinct from yamohub's
 *                                   generic checkmark — emphasizes the trust
 *                                   & safety story behind the platform)
 *   - Bottom gradient overlay:     improves badge legibility on bright photos
 *
 * Footer row:  "Sophia, 24" / 📍 Bonapriso, Douala · 👁 2.8k
 */
export function CreatorTile({ creator }: { creator: CreatorTileData }) {
  const tier = TIER_BADGE[creator.tier];

  const locationLine =
    creator.neighborhood && creator.city
      ? `${creator.neighborhood}, ${creator.city}`
      : creator.city || "—";

  return (
    <Link
      href={`/creator/${creator.id}`}
      className={`creator-tile creator-tile--${creator.tier.toLowerCase()}`}
      style={{
        borderColor: tier ? tier.borderColor : "var(--border)",
      }}
    >
      {/* Media square */}
      <div className="creator-tile__media">
        {creator.mediaUrl ? (
          creator.mediaKind === "VIDEO" ? (
            <video
              src={creator.mediaUrl}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            <Image
              src={creator.mediaUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              style={{ objectFit: "cover" }}
              unoptimized={!creator.mediaUrl.startsWith("https://res.cloudinary.com")}
            />
          )
        ) : creator.avatarUrl ? (
          <Image
            src={creator.avatarUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            style={{ objectFit: "cover" }}
            unoptimized={!creator.avatarUrl.startsWith("https://res.cloudinary.com")}
          />
        ) : (
          <div className="creator-tile__fallback" aria-hidden>
            {creator.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Bottom gradient — keeps badges/text readable over any photo */}
        <span className="creator-tile__scrim" aria-hidden />

        {/* Tier badge (top-left). Skipped entirely for Regular. */}
        {tier && (
          <span
            className="creator-tile__tier-badge"
            style={{
              background: tier.bg,
              color: tier.fg,
              boxShadow: `0 4px 16px ${tier.glow}`,
            }}
          >
            {tier.label}
          </span>
        )}

        {/* Identity-verified capsule (bottom-right). The "ID" text is the
            key differentiator vs a generic checkmark — it tells visitors
            this person's identity was reviewed, not just that they exist. */}
        {creator.verified && (
          <span className="creator-tile__verified-capsule" aria-label="Identity verified">
            <ShieldCheck size={12} strokeWidth={2.5} />
            ID
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="creator-tile__footer">
        <div className="creator-tile__name-row">
          <span className="creator-tile__name">
            {creator.name}
            {creator.age != null && (
              <span className="creator-tile__age">, {creator.age}</span>
            )}
          </span>
        </div>

        <div className="creator-tile__meta-row">
          <span className="creator-tile__location">
            <MapPin size={11} strokeWidth={2} />
            <span className="creator-tile__location-text">{locationLine}</span>
          </span>

          {/* Rating chip takes precedence over the view count when present.
              Rating is a higher-signal decision input for visitors than
              raw view count, and the right-side meta slot only has room
              for one. The chip itself shows the average + a tiny count
              suffix so visitors can tell "4.8 from 200" vs "4.8 from 5". */}
          {creator.rating ? (
            <span
              className="creator-tile__rating"
              title={`${creator.rating.average.toFixed(1)} out of 5 from ${creator.rating.count} reviews`}
              aria-label={`${creator.rating.average.toFixed(1)} out of 5 stars from ${creator.rating.count} reviews`}
            >
              <Star size={11} strokeWidth={2} fill="#E6A817" color="#E6A817" />
              {creator.rating.average.toFixed(1)}
              <span className="creator-tile__rating-count">
                ({formatCount(creator.rating.count)})
              </span>
            </span>
          ) : creator.views > 0 ? (
            <span
              className="creator-tile__views"
              title={`${creator.views.toLocaleString()} profile views in the last 30 days`}
              aria-label={`${creator.views.toLocaleString()} profile views in the last 30 days`}
            >
              <Eye size={11} strokeWidth={2} />
              {formatCount(creator.views)}
            </span>
          ) : null}
        </div>
      </div>

      <style>{`
        .creator-tile {
          position: relative;
          display: block;
          border-radius: 14px;
          overflow: hidden;
          background: var(--bg-surface);
          text-decoration: none;
          color: inherit;
          border: 1px solid var(--border);
          transition: transform 0.18s ease, border-color 0.18s ease,
            box-shadow 0.18s ease;
        }
        .creator-tile:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
        }
        .creator-tile:active {
          transform: translateY(-1px);
        }

        /* Tier-tinted hover glows — layered on top of the base lift shadow.
           Cards at rest look uniform (the badge does the work); the glow
           only appears on hover so the grid never feels noisy. Regular
           creators have no glow class and just get the neutral lift above. */
        .creator-tile--vip_plus:hover {
          box-shadow:
            0 12px 28px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(230, 168, 23, 0.55),
            0 0 24px rgba(230, 168, 23, 0.22);
        }
        .creator-tile--vip:hover {
          box-shadow:
            0 12px 28px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(168, 85, 247, 0.55),
            0 0 24px rgba(168, 85, 247, 0.22);
        }
        .creator-tile--premium:hover {
          box-shadow:
            0 12px 28px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(232, 84, 122, 0.50),
            0 0 24px rgba(232, 84, 122, 0.20);
        }

        .creator-tile__media {
          position: relative;
          aspect-ratio: 1 / 1;
          background: #0a0a12;
          overflow: hidden;
        }

        .creator-tile__fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-cormorant);
          font-size: 56px;
          font-weight: 700;
          color: rgba(168, 85, 247, 0.30);
        }

        .creator-tile__scrim {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.18) 0%,
            rgba(0, 0, 0, 0) 30%,
            rgba(0, 0, 0, 0) 65%,
            rgba(0, 0, 0, 0.55) 100%
          );
        }

        /* ── Tier badge (solid pill, top-left) ── */
        .creator-tile__tier-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 5px 10px;
          border-radius: 999px;
          font-family: var(--font-dm-mono);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          line-height: 1;
          white-space: nowrap;
          pointer-events: none;
        }

        /* ── Identity-verified capsule (blue, bottom-right) ── */
        .creator-tile__verified-capsule {
          position: absolute;
          bottom: 10px;
          right: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 9px;
          border-radius: 999px;
          background: linear-gradient(135deg, #3b9eff 0%, #2480e8 100%);
          color: #fff;
          font-family: var(--font-dm-mono);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          line-height: 1;
          box-shadow: 0 2px 10px rgba(59, 158, 255, 0.45);
          pointer-events: none;
        }

        /* ── Footer ── */
        .creator-tile__footer {
          padding: 11px 13px 13px;
        }

        .creator-tile__name-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .creator-tile__name {
          flex: 1;
          min-width: 0;
          font-family: var(--font-cormorant);
          font-size: 17px;
          font-weight: 700;
          line-height: 1.1;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .creator-tile__age {
          color: var(--text-secondary);
          font-weight: 600;
        }

        .creator-tile__meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 5px;
        }
        .creator-tile__location {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          min-width: 0;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          color: var(--text-secondary);
          letter-spacing: 0.01em;
        }
        .creator-tile__location-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .creator-tile__views {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .creator-tile__rating {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 700;
          color: #E6A817;
          flex-shrink: 0;
          letter-spacing: 0.01em;
        }
        .creator-tile__rating-count {
          color: var(--text-muted);
          font-weight: 500;
          margin-left: 2px;
        }
      `}</style>
    </Link>
  );
}

// ── Tier badge tokens ─────────────────────────────────────────
// Each token bundles the badge fill + text color + glow color, plus the
// border tint applied to the card itself. Regular has no token — Regular
// cards stay neutral with no overlay badge.
type TierBadge = {
  label: string;
  bg: string;
  fg: string;
  glow: string;
  borderColor: string;
};

const TIER_BADGE: Partial<Record<AccessLevel, TierBadge>> = {
  VIP_PLUS: {
    label: "VIP+",
    bg: "linear-gradient(135deg, #E6A817 0%, #C28A0F 100%)",
    fg: "#1A0F00",
    glow: "rgba(230, 168, 23, 0.45)",
    borderColor: "rgba(230, 168, 23, 0.40)",
  },
  VIP: {
    label: "VIP",
    bg: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
    fg: "#fff",
    glow: "rgba(168, 85, 247, 0.45)",
    borderColor: "rgba(168, 85, 247, 0.32)",
  },
  PREMIUM: {
    label: "Premium",
    bg: "linear-gradient(135deg, #E8547A 0%, #C2335A 100%)",
    fg: "#fff",
    glow: "rgba(232, 84, 122, 0.45)",
    borderColor: "rgba(232, 84, 122, 0.30)",
  },
};
