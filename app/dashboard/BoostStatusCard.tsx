import Link from "next/link";
import { TrendingUp, Sparkles, Eye, MessageCircle, RefreshCw } from "lucide-react";

type ActiveBoost = {
  status: "ACTIVE";
  durationDays: number;
  endsAt: Date;
};

type PendingBoost = {
  status: "PENDING_PAYMENT" | "PENDING_REVIEW";
  durationDays: number;
  amountCfa: number;
};

type ExpiredBoost = {
  durationDays: number;
  amountCfa: number;
  endsAt: Date | null;
};

type BoostPerformance = {
  views: number;
  clicks: number;
};

type Props = {
  /** The current open boost, if any. `null` means the creator has no
   *  active or in-progress order. */
  boost: ActiveBoost | PendingBoost | null;
  /** Most recent EXPIRED boost in the last 14 days. Only set when `boost`
   *  is null (no active spotlight to fight with for attention). Drives
   *  the "Your last boost drove N views, boost again?" summary card. */
  expiredBoost?: ExpiredBoost | null;
  /** Views + WhatsApp clicks racked up during the active OR most-recently-
   *  expired boost window. Used to fill the ROI row on the active card,
   *  and to populate the post-boost summary numbers. */
  performance?: BoostPerformance | null;
};

/**
 * Tier-tinted boost card shown on the Regular-tier dashboard. Five modes:
 *
 *   - No boost              → soft CTA ("Boost your profile for as little as 1,000 CFA")
 *   - PENDING_PAYMENT       → "Finish your payment" with /boost/proof link
 *   - PENDING_REVIEW        → "We're reviewing your payment, hang tight"
 *   - ACTIVE                → "N days left" + a small ROI row showing views/clicks
 *                             racked up since the boost started
 *   - Recently expired      → "Your last boost drove N views and N clicks" +
 *                             a "BOOST AGAIN" CTA. Skipped when there's an
 *                             active boost (don't compete with it).
 *
 * The ROI row + the post-boost summary are the same data shape (views/
 * clicks during the window) — they just render in slightly different
 * contexts. Both are filled by `performance` in props.
 */
export function BoostStatusCard({ boost, expiredBoost, performance }: Props) {
  if (boost && boost.status === "ACTIVE") {
    const daysLeft = Math.max(
      0,
      Math.ceil(
        (boost.endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      ),
    );
    return (
      <Card
        tone="active"
        icon={<Sparkles size={16} strokeWidth={2.4} />}
        eyebrow="BOOST ACTIVE"
        title={`${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your spotlight`}
        body={`Your ${boost.durationDays}-day boost is running. Visitors see you in the homepage sponsored slot.`}
        // Show the ROI row whenever performance data exists. Empty (0/0)
        // is still informative — tells the creator "the boost is live but
        // hasn't driven traffic yet". Better than hiding numbers.
        metrics={performance ?? undefined}
      />
    );
  }

  if (boost && boost.status === "PENDING_REVIEW") {
    return (
      <Card
        tone="pending"
        icon={<TrendingUp size={16} strokeWidth={2.4} />}
        eyebrow="BOOST · UNDER REVIEW"
        title="We're verifying your payment"
        body={`${boost.durationDays}-day boost · ${boost.amountCfa.toLocaleString()} CFA. Approval usually lands within 24 hours.`}
      />
    );
  }

  if (boost && boost.status === "PENDING_PAYMENT") {
    return (
      <Card
        tone="pending"
        icon={<TrendingUp size={16} strokeWidth={2.4} />}
        eyebrow="BOOST · ACTION REQUIRED"
        title="Send your payment proof"
        body={`${boost.durationDays}-day boost · ${boost.amountCfa.toLocaleString()} CFA. Finish in one step.`}
        cta={{ href: "/boost/proof", label: "CONTINUE" }}
      />
    );
  }

  // Post-boost summary — most recent boost expired in the last 14 days.
  // We show the actual numbers the boost drove (per `performance`) plus a
  // BOOST AGAIN button so the renew funnel is one tap. This is the
  // counter-bounce to the "creators boost once and never come back"
  // failure mode.
  if (expiredBoost && performance) {
    const totalEngagement = performance.views + performance.clicks;
    return (
      <Card
        tone="renew"
        icon={<RefreshCw size={16} strokeWidth={2.4} />}
        eyebrow="LAST BOOST · SUMMARY"
        title={
          totalEngagement > 0
            ? `Your ${expiredBoost.durationDays}-day boost drove ${performance.views.toLocaleString()} view${performance.views === 1 ? "" : "s"}`
            : "Your last boost ended"
        }
        body={
          totalEngagement > 0
            ? `${performance.clicks.toLocaleString()} WhatsApp click${performance.clicks === 1 ? "" : "s"} · spent ${expiredBoost.amountCfa.toLocaleString()} CFA. Run it again?`
            : `${expiredBoost.durationDays}-day boost · ${expiredBoost.amountCfa.toLocaleString()} CFA. Run it again to keep momentum?`
        }
        metrics={performance}
        cta={{ href: "/boost", label: "BOOST AGAIN" }}
      />
    );
  }

  // Default: no boost yet — soft CTA inviting purchase.
  return (
    <Card
      tone="cta"
      icon={<TrendingUp size={16} strokeWidth={2.4} />}
      eyebrow="BOOST"
      title="Get featured in homepage discovery"
      body="Stand out beyond your tier. From 1,000 CFA for 3 days."
      cta={{ href: "/boost", label: "BOOST MY PROFILE" }}
    />
  );
}

function Card({
  tone,
  icon,
  eyebrow,
  title,
  body,
  cta,
  metrics,
}: {
  tone: "cta" | "pending" | "active" | "renew";
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  cta?: { href: string; label: string };
  metrics?: BoostPerformance;
}) {
  const palette =
    tone === "active"
      ? {
          border: "rgba(92, 184, 138, 0.45)",
          bg: "rgba(92, 184, 138, 0.08)",
          accent: "#5CB88A",
        }
      : tone === "pending"
        ? {
            border: "rgba(230, 168, 23, 0.45)",
            bg: "rgba(230, 168, 23, 0.08)",
            accent: "#E6A817",
          }
        : tone === "renew"
          ? {
              // Soft purple — same hue as "boost" itself so the renew card
              // reads as a continuation of the spotlight story, not a new
              // type of card.
              border: "rgba(168, 85, 247, 0.45)",
              bg: "rgba(168, 85, 247, 0.10)",
              accent: "#a855f7",
            }
          : {
              border: "rgba(168, 85, 247, 0.40)",
              bg: "rgba(168, 85, 247, 0.07)",
              accent: "#a855f7",
            };

  return (
    <div
      className="mn-boost-card"
      style={{
        padding: "14px 16px",
        borderRadius: "12px",
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <style>{`
        .mn-boost-card-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .mn-boost-card-cta {
          display: block;
          width: 100%;
          text-align: center;
          padding: 10px 16px;
          border-radius: 10px;
          text-decoration: none;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.10em;
        }
        @media (min-width: 480px) {
          .mn-boost-card-cta {
            width: auto;
            display: inline-block;
          }
        }
      `}</style>

      {/* Top row: icon + text */}
      <div className="mn-boost-card-row">
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: palette.accent + "22",
            color: palette.accent,
            flexShrink: 0,
            marginTop: "2px",
          }}
          aria-hidden
        >
          {icon}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: palette.accent,
              marginBottom: "2px",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "18px",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: "4px",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "12.5px",
              lineHeight: 1.5,
              color: "var(--text-secondary)",
            }}
          >
            {body}
          </div>
        </div>
      </div>

      {/* CTA button — full width on mobile, auto on larger screens */}
      {cta && (
        <Link
          href={cta.href}
          className="mn-boost-card-cta"
          style={{
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.accent}cc)`,
            color: tone === "cta" || tone === "renew" ? "#fff" : "#1A1A1A",
            boxShadow: `0 4px 16px ${palette.accent}44`,
          }}
        >
          {cta.label}
        </Link>
      )}

      {/* Metrics row — views + WA clicks during the boost window */}
      {metrics && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            padding: "10px 12px",
            borderRadius: "10px",
            background: "rgba(0, 0, 0, 0.18)",
            border: `1px solid ${palette.accent}33`,
          }}
        >
          <MetricChip
            icon={<Eye size={12} strokeWidth={2.4} />}
            label="VIEWS"
            value={metrics.views}
            accent={palette.accent}
          />
          <span
            aria-hidden
            style={{ width: "1px", background: `${palette.accent}33` }}
          />
          <MetricChip
            icon={<MessageCircle size={12} strokeWidth={2.4} />}
            label="WA CLICKS"
            value={metrics.clicks}
            accent={palette.accent}
          />
        </div>
      )}
    </div>
  );
}

function MetricChip({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        minWidth: 0,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          fontFamily: "var(--font-dm-mono)",
          fontSize: "9.5px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: accent,
          opacity: 0.85,
        }}
      >
        {icon}
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "20px",
          fontWeight: 700,
          lineHeight: 1,
          color: "var(--text-primary)",
        }}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}
