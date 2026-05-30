import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Diamond, Star, Circle, Check, TrendingUp, ShieldCheck } from "lucide-react";
import { PLANS, formatPriceCfa, type PaidPlanCode } from "@/app/lib/plans";

export const metadata: Metadata = {
  title: "Plans — Midnight",
  description:
    "Pick a plan and unlock visibility, analytics, and trust signals. VIP+, VIP, and Premium tiers — Regular stays free.",
};

// Per-tier visual identity. Colors mirror the existing landing-page tier
// bands (TierSection.tsx, CreatorTile.tsx) so a creator who's been on the
// homepage already recognizes "their" color when they land here.
type TierTheme = {
  accent: string;
  accentSoft: string;
  borderColor: string;
  ringColor: string;
  gradient: string;
  buttonGradient: string;
  buttonHoverShadow: string;
  Icon: typeof Crown;
};

const TIER_THEMES: Record<PaidPlanCode | "REGULAR", TierTheme> = {
  VIP_PLUS: {
    accent: "#E6A817",
    accentSoft: "rgba(230, 168, 23, 0.08)",
    borderColor: "rgba(230, 168, 23, 0.35)",
    ringColor: "rgba(230, 168, 23, 0.18)",
    gradient: "linear-gradient(135deg, #E6A817 0%, #F4C24A 50%, #E6A817 100%)",
    buttonGradient: "linear-gradient(135deg, #E6A817 0%, #C58E0F 100%)",
    buttonHoverShadow: "0 12px 28px rgba(230, 168, 23, 0.35)",
    Icon: Crown,
  },
  VIP: {
    accent: "#a855f7",
    accentSoft: "rgba(168, 85, 247, 0.08)",
    borderColor: "rgba(168, 85, 247, 0.35)",
    ringColor: "rgba(168, 85, 247, 0.18)",
    gradient: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
    buttonGradient: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
    buttonHoverShadow: "0 12px 28px rgba(168, 85, 247, 0.35)",
    Icon: Diamond,
  },
  PREMIUM: {
    accent: "#E8547A",
    accentSoft: "rgba(232, 84, 122, 0.08)",
    borderColor: "rgba(232, 84, 122, 0.35)",
    ringColor: "rgba(232, 84, 122, 0.18)",
    gradient: "linear-gradient(135deg, #E8547A 0%, #B83A60 100%)",
    buttonGradient: "linear-gradient(135deg, #E8547A 0%, #B83A60 100%)",
    buttonHoverShadow: "0 12px 28px rgba(232, 84, 122, 0.32)",
    Icon: Star,
  },
  REGULAR: {
    accent: "#6A6A9A",
    accentSoft: "rgba(106, 106, 154, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    ringColor: "rgba(255, 255, 255, 0.04)",
    gradient: "linear-gradient(135deg, #2A2A3A 0%, #1A1A26 100%)",
    buttonGradient: "linear-gradient(135deg, #2A2A3A 0%, #1A1A26 100%)",
    buttonHoverShadow: "0 12px 28px rgba(255, 255, 255, 0.06)",
    Icon: Circle,
  },
};

// Free-tier card content — REGULAR isn't in PLANS (PLANS is paid-only) so
// we keep its feature list here for the comparison card.
const REGULAR_FEATURES = [
  "3 image posts per day — galleries hold up to 6 photos each",
  "Posts stay live for 14 days",
  "Free profile with WhatsApp button",
  "Listed in the Regular section of your city",
  "Anonymous likes and ratings from visitors",
  "Optional Boost — buy a temporary spotlight without committing to a tier",
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#06060C] text-white">
      <section className="mx-auto max-w-6xl px-5 pt-24 pb-12 sm:pt-28">
        {/* Eyebrow + headline */}
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-[10px] font-bold tracking-[0.22em] text-white/40 mb-3">
            MIDNIGHT · PLANS
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-tight tracking-tight">
            Pick the visibility you want.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/55 max-w-xl mx-auto leading-relaxed">
            Every paid plan runs for 14 days. No subscriptions auto-renew —
            you pay each cycle on purpose. Regular stays free, forever.
          </p>
        </div>

        {/* Cards stack — single column on mobile, 2 cols at md, all 4
            side-by-side at xl. VIP+ first to anchor the visual hierarchy. */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <PlanCard code="VIP_PLUS" highlighted />
          <PlanCard code="VIP" />
          <PlanCard code="PREMIUM" />
          <RegularCard />
        </div>

        {/* Footer notes */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <FootCard
            icon={<ShieldCheck size={16} strokeWidth={2.2} />}
            title="Manual review"
            body="Payments are confirmed by a human within 5–30 minutes. No card data is ever stored on Midnight."
          />
          <FootCard
            icon={<TrendingUp size={16} strokeWidth={2.2} />}
            title="Want a quick visibility bump?"
            body="Boost any profile (including Regular) for 3, 7, or 14 days without changing your tier."
            href="/boost"
            cta="See boost options →"
          />
          <FootCard
            icon={<Check size={16} strokeWidth={2.2} />}
            title="Switch any time"
            body="Buy a higher plan even mid-cycle — the new tier takes effect the moment admin approves your payment."
          />
        </div>
      </section>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Paid plan card. Reads price + features straight from PLANS, so renaming
// or repricing happens in app/lib/plans.ts only.
// ─────────────────────────────────────────────────────────────────────────
function PlanCard({
  code,
  highlighted = false,
}: {
  code: PaidPlanCode;
  highlighted?: boolean;
}) {
  const plan = PLANS[code];
  const theme = TIER_THEMES[code];
  const Icon = theme.Icon;

  return (
    <article
      className="relative flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: "#0a0a14",
        border: `1px solid ${theme.borderColor}`,
        boxShadow: highlighted
          ? `0 0 0 1px ${theme.ringColor}, 0 24px 60px rgba(0, 0, 0, 0.5)`
          : "0 14px 40px rgba(0, 0, 0, 0.35)",
      }}
    >
      {/* Recommended ribbon — only on the highlighted card (VIP+). Yamohub's
          PREMIUM card uses a similar floating badge. */}
      {highlighted && (
        <div
          className="absolute top-3 right-3 z-10 rounded-full px-2.5 py-1 text-[9px] font-bold tracking-[0.14em]"
          style={{
            background: theme.gradient,
            color: "#0a0a14",
          }}
        >
          RECOMMENDED
        </div>
      )}

      {/* Header strip — full-width gradient with the tier icon + label +
          price. Mirrors the Yamohub PASS header treatment but uses
          Midnight tier colors. */}
      <header
        className="px-5 py-5"
        style={{ background: theme.gradient }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "rgba(0, 0, 0, 0.22)" }}
          >
            <Icon size={18} strokeWidth={2.3} className="text-white" />
          </span>
          <p className="text-sm font-bold tracking-[0.16em] text-white/95">
            {plan.label.toUpperCase()}
          </p>
        </div>
        <p className="text-[28px] sm:text-[32px] font-bold leading-none text-white drop-shadow-sm">
          {formatPriceCfa(plan.priceCfa)}
        </p>
        <p className="mt-1 text-[11px] font-bold tracking-[0.10em] text-white/85">
          / {plan.durationDays} JOURS
        </p>
      </header>

      {/* Body — tagline, features, CTA. Flex-col + flex-1 so the CTA always
          sits at the bottom even when card heights diverge. */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[13px] text-white/65 leading-relaxed mb-4">
          {plan.tagline}
        </p>

        <ul className="space-y-2.5 mb-5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <span
                className="mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                style={{ background: theme.accentSoft }}
              >
                <Check
                  size={10}
                  strokeWidth={3}
                  style={{ color: theme.accent }}
                />
              </span>
              <span className="text-[12.5px] text-white/80 leading-relaxed">
                {f}
              </span>
            </li>
          ))}
        </ul>

        {plan.requiresVerified && (
          <div
            className="mb-4 rounded-lg border px-3 py-2 text-[11px] leading-relaxed"
            style={{
              background: theme.accentSoft,
              borderColor: theme.borderColor,
              color: theme.accent,
            }}
          >
            <strong className="font-semibold">Verified-only.</strong>{" "}
            <span className="text-white/65">
              Contact support after upgrading to start the ID verification.
            </span>
          </div>
        )}

        <Link
          href={`/upgrade/checkout?plan=${plan.code}`}
          className="mt-auto block rounded-xl text-center py-3 text-[13px] font-semibold text-white transition-transform hover:scale-[1.02]"
          style={{
            background: theme.buttonGradient,
            boxShadow: theme.buttonHoverShadow,
          }}
        >
          Souscrire — {plan.label.toUpperCase()}
        </Link>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Free-tier card. Visually muted on purpose — it's the comparison anchor,
// not the desired destination. Its CTA points to signup, not checkout.
// ─────────────────────────────────────────────────────────────────────────
function RegularCard() {
  const theme = TIER_THEMES.REGULAR;
  const Icon = theme.Icon;

  return (
    <article
      className="relative flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: "#0a0a14",
        border: `1px solid ${theme.borderColor}`,
        boxShadow: "0 14px 40px rgba(0, 0, 0, 0.35)",
      }}
    >
      <header
        className="px-5 py-5"
        style={{ background: theme.gradient }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "rgba(255, 255, 255, 0.06)" }}
          >
            <Icon size={18} strokeWidth={2.3} className="text-white/85" />
          </span>
          <p className="text-sm font-bold tracking-[0.16em] text-white/90">
            REGULAR
          </p>
        </div>
        <p className="text-[28px] sm:text-[32px] font-bold leading-none text-white">
          Gratuit
        </p>
        <p className="mt-1 text-[11px] font-bold tracking-[0.10em] text-white/55">
          / TOUJOURS
        </p>
      </header>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[13px] text-white/65 leading-relaxed mb-4">
          The free starting point. Real profile, real WhatsApp, real reviews —
          you just don't get tier placement until you upgrade.
        </p>

        <ul className="space-y-2.5 mb-5">
          {REGULAR_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <span
                className="mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(255, 255, 255, 0.05)" }}
              >
                <Check
                  size={10}
                  strokeWidth={3}
                  className="text-white/55"
                />
              </span>
              <span className="text-[12.5px] text-white/75 leading-relaxed">
                {f}
              </span>
            </li>
          ))}
        </ul>

        <Link
          href="/become-a-member"
          className="mt-auto block rounded-xl text-center py-3 text-[13px] font-semibold text-white/80 transition border border-white/10 hover:bg-white/5 hover:text-white"
        >
          Start free
        </Link>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Footer-card primitive — three quick reassurance tiles under the pricing
// grid. Optional href makes the third one ("boost") clickable.
// ─────────────────────────────────────────────────────────────────────────
function FootCard({
  icon,
  title,
  body,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4 h-full">
      <div className="flex items-center gap-2 text-white/75 mb-1.5">
        {icon}
        <p className="text-[12px] font-bold tracking-[0.1em] uppercase">
          {title}
        </p>
      </div>
      <p className="text-[12.5px] text-white/55 leading-relaxed">{body}</p>
      {href && cta && (
        <p className="mt-2 text-[12px] font-semibold text-brand-purple">
          {cta}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {inner}
      </Link>
    );
  }
  return inner;
}
