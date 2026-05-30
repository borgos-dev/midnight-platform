import Image from "next/image";
import Link from "next/link";
import { Megaphone, ArrowRight, BadgeCheck, Crown, Sparkles, Star } from "lucide-react";
import type { AccessLevel } from "@prisma/client";

export type AdSlotData = {
  id: number;
  kind: "HOUSE" | "PROMOTED_CREATOR";
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string;
  // For HOUSE ads, this is the actual destination. For PROMOTED_CREATOR ads
  // we ignore it and route to /creator/<id> via the creator field below.
  ctaUrl: string;
  creator: {
    id: number;
    name: string;
    avatarUrl: string | null;
    tier: AccessLevel;
    verified: boolean;
  } | null;
};

type Props = {
  ad: AdSlotData;
};

// The slot links through /api/ad-click/[id] so the click is recorded
// server-side (counter incremented, then 302 redirect). Works without JS.
function adClickHref(adId: number): string {
  return `/api/ad-click/${adId}`;
}

/**
 * Sponsored ad slot for the homepage. Two visual variants share the same
 * surface so visitors learn a single mental model:
 *
 *   - HOUSE             → brand promo (gold/purple gradient, no creator chip)
 *   - PROMOTED_CREATOR  → live data from the boosted creator's profile,
 *                         with a small `BOOSTED` tag distinguishing it
 *                         from a regular grid card
 *
 * Always carries a `SPONSORED` eyebrow so visitors aren't deceived into
 * thinking it's organic discovery content — same disclosure pattern as
 * Instagram/yamohub.
 */
export function AdSlot({ ad }: Props) {
  const isPromoted = ad.kind === "PROMOTED_CREATOR" && ad.creator;

  return (
    <section
      style={{
        background: "var(--bg-base)",
        padding: "clamp(28px, 4vw, 40px) 20px",
      }}
      aria-label="Sponsored content"
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {isPromoted ? (
          <PromotedCreatorAd ad={ad} />
        ) : (
          <HouseAd ad={ad} />
        )}
      </div>

      {/* Shared "SPONSORED" eyebrow style — kept on the wrapper so both
          variants below can use the same .ad-eyebrow class. */}
      <style>{`
        .ad-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-dm-mono);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: var(--text-muted);
          text-transform: uppercase;
        }
      `}</style>
    </section>
  );
}

// ── House ad variant ──
// Used for Midnight's own promos (Become a Creator, Upgrade to VIP+, etc.).
// Gradient brand background, big CTA. Optional image floats to the right.
function HouseAd({ ad }: { ad: AdSlotData }) {
  return (
    <Link
      href={adClickHref(ad.id)}
      className="ad-house"
      aria-label={ad.title}
    >
      <div className="ad-house__copy">
        <span className="ad-eyebrow">
          <Megaphone size={11} strokeWidth={2.5} />
          SPONSORED
        </span>
        <h3 className="ad-house__title">{ad.title}</h3>
        {ad.body && <p className="ad-house__body">{ad.body}</p>}
        <span className="ad-house__cta">
          {ad.ctaLabel}
          <ArrowRight size={14} strokeWidth={2.5} />
        </span>
      </div>

      {ad.imageUrl && (
        <div className="ad-house__media" aria-hidden>
          <Image
            src={ad.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            unoptimized={!ad.imageUrl.startsWith("https://res.cloudinary.com")}
            style={{ objectFit: "cover" }}
          />
        </div>
      )}

      <style>{`
        .ad-house {
          position: relative;
          display: flex;
          gap: 20px;
          align-items: stretch;
          border-radius: 16px;
          overflow: hidden;
          padding: 22px 24px;
          background:
            radial-gradient(circle at 0% 0%, rgba(230, 168, 23, 0.18), transparent 55%),
            radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.22), transparent 55%),
            linear-gradient(135deg, #1A1230 0%, #110A22 100%);
          border: 1px solid rgba(168, 85, 247, 0.28);
          text-decoration: none;
          color: inherit;
          transition: transform 0.18s ease, border-color 0.18s ease,
            box-shadow 0.18s ease;
        }
        .ad-house:hover {
          transform: translateY(-2px);
          border-color: rgba(230, 168, 23, 0.45);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4),
            0 0 24px rgba(230, 168, 23, 0.12);
        }

        .ad-house__copy {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 1;
        }
        .ad-house__title {
          font-family: var(--font-cormorant);
          font-size: clamp(22px, 3.5vw, 28px);
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin: 0;
        }
        .ad-house__body {
          font-family: var(--font-dm-sans);
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-secondary);
          margin: 0;
          max-width: 460px;
        }
        .ad-house__cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
          padding: 10px 18px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--accent-purple), #7c3aed);
          color: #fff;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.10em;
          align-self: flex-start;
          box-shadow: 0 4px 16px rgba(168, 85, 247, 0.35);
          transition: transform 0.15s ease;
        }
        .ad-house:hover .ad-house__cta {
          transform: translateX(2px);
        }

        .ad-house__media {
          position: relative;
          flex: 0 0 160px;
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          overflow: hidden;
          align-self: center;
        }

        @media (max-width: 640px) {
          .ad-house {
            flex-direction: column;
            padding: 18px 18px 20px;
          }
          .ad-house__media {
            order: -1;
            flex-basis: auto;
            width: 100%;
            aspect-ratio: 16 / 9;
          }
        }
      `}</style>
    </Link>
  );
}

// ── Promoted creator variant ──
// A paid placement that pulls live data from the creator. Looks adjacent
// to a normal tile but with extra signaling (BOOSTED tag, sponsored eyebrow)
// so visitors can tell it's paid placement.
function PromotedCreatorAd({ ad }: { ad: AdSlotData }) {
  if (!ad.creator) return null;
  const c = ad.creator;
  const tierLabel: Partial<Record<AccessLevel, string>> = {
    VIP_PLUS: "VIP+",
    VIP: "VIP",
    PREMIUM: "Premium",
  };
  const tierIcon = (() => {
    if (c.tier === "VIP_PLUS") return <Crown size={11} strokeWidth={2.5} />;
    if (c.tier === "VIP") return <Sparkles size={11} strokeWidth={2.5} />;
    if (c.tier === "PREMIUM") return <Star size={11} strokeWidth={2.5} />;
    return null;
  })();

  return (
    <Link
      href={adClickHref(ad.id)}
      className="ad-promo"
      aria-label={`Sponsored: ${ad.title}`}
    >
      <div className="ad-promo__media" aria-hidden>
        {ad.imageUrl ? (
          <Image
            src={ad.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 220px"
            unoptimized={!ad.imageUrl.startsWith("https://res.cloudinary.com")}
            style={{ objectFit: "cover" }}
          />
        ) : c.avatarUrl ? (
          <Image
            src={c.avatarUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 220px"
            unoptimized={!c.avatarUrl.startsWith("https://res.cloudinary.com")}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className="ad-promo__fallback">{c.name.charAt(0)}</span>
        )}
        <span className="ad-promo__boost-tag">BOOSTED</span>
      </div>

      <div className="ad-promo__copy">
        <span className="ad-eyebrow">
          <Megaphone size={11} strokeWidth={2.5} />
          SPONSORED
        </span>

        <div className="ad-promo__name-row">
          <span className="ad-promo__name">{c.name}</span>
          {c.verified && (
            <BadgeCheck size={15} className="ad-promo__verified" />
          )}
          {tierLabel[c.tier] && (
            <span
              className={`ad-promo__tier ad-promo__tier--${c.tier.toLowerCase()}`}
            >
              {tierIcon}
              {tierLabel[c.tier]}
            </span>
          )}
        </div>

        <h3 className="ad-promo__title">{ad.title}</h3>
        {ad.body && <p className="ad-promo__body">{ad.body}</p>}

        <span className="ad-promo__cta">
          {ad.ctaLabel}
          <ArrowRight size={14} strokeWidth={2.5} />
        </span>
      </div>

      <style>{`
        .ad-promo {
          display: flex;
          gap: 18px;
          align-items: stretch;
          border-radius: 16px;
          overflow: hidden;
          padding: 16px;
          background: var(--bg-surface);
          border: 1px solid rgba(168, 85, 247, 0.22);
          text-decoration: none;
          color: inherit;
          transition: transform 0.18s ease, border-color 0.18s ease,
            box-shadow 0.18s ease;
        }
        .ad-promo:hover {
          transform: translateY(-2px);
          border-color: rgba(168, 85, 247, 0.45);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
        }

        .ad-promo__media {
          position: relative;
          flex: 0 0 200px;
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          overflow: hidden;
          background: #0a0a12;
        }
        .ad-promo__fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-cormorant);
          font-size: 56px;
          font-weight: 700;
          color: rgba(168, 85, 247, 0.35);
        }
        .ad-promo__boost-tag {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 4px 9px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.55);
          color: #fff;
          font-family: var(--font-dm-mono);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.10em;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        .ad-promo__copy {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 4px 4px 4px 0;
        }
        .ad-promo__name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ad-promo__name {
          font-family: var(--font-cormorant);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }
        .ad-promo__verified {
          color: #3b9eff;
          flex-shrink: 0;
        }
        .ad-promo__tier {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 999px;
          font-family: var(--font-dm-mono);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #fff;
        }
        .ad-promo__tier--vip_plus {
          background: linear-gradient(135deg, #E6A817, #C28A0F);
          color: #1A0F00;
        }
        .ad-promo__tier--vip {
          background: linear-gradient(135deg, #a855f7, #7c3aed);
        }
        .ad-promo__tier--premium {
          background: linear-gradient(135deg, #E8547A, #C2335A);
        }

        .ad-promo__title {
          font-family: var(--font-dm-sans);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          margin: 4px 0 0;
        }
        .ad-promo__body {
          font-family: var(--font-dm-sans);
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
        }

        .ad-promo__cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(168, 85, 247, 0.16);
          border: 1px solid rgba(168, 85, 247, 0.4);
          color: var(--accent-purple);
          font-family: var(--font-dm-mono);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.10em;
          align-self: flex-start;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .ad-promo:hover .ad-promo__cta {
          background: rgba(168, 85, 247, 0.25);
          transform: translateX(2px);
        }

        @media (max-width: 640px) {
          .ad-promo {
            flex-direction: column;
            padding: 12px;
          }
          .ad-promo__media {
            flex-basis: auto;
            width: 100%;
            aspect-ratio: 16 / 10;
          }
        }
      `}</style>
    </Link>
  );
}

