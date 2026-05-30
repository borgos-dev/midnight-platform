import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  getCurrentCreatorProfile,
  getCurrentUser,
} from "@/app/lib/auth-helpers";
import { expireDueBoosts } from "@/app/lib/boost-lifecycle";
import { BOOST_PLANS } from "@/app/lib/boost-pricing";
import { BoostPlanPicker } from "./BoostPlanPicker";

export const metadata: Metadata = {
  title: "Boost your profile — Midnight",
  description:
    "Get featured in the homepage discovery slot for 3, 7, or 14 days. Reach more visitors as a Regular-tier creator.",
};

export default async function BoostLandingPage() {
  // Lazy expiry — keep the dashboard / boost views accurate without a cron.
  await expireDueBoosts();

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/boost");

  const creator = await getCurrentCreatorProfile();
  if (!creator) redirect("/become-a-member");

  // Gate by tier. Higher tiers see an explainer rather than the picker.
  const isRegular = creator.tier === "REGULAR";

  // Surface any open boost so the creator doesn't get to double-buy.
  const openBoost = await prisma.boost.findFirst({
    where: {
      creatorprofileId: creator.id,
      status: { in: ["PENDING_PAYMENT", "PENDING_REVIEW", "ACTIVE"] },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main
      style={{
        background: "var(--bg-base)",
        minHeight: "100vh",
        padding: "120px 20px 80px",
      }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "11px",
              color: "var(--accent-gold)",
              letterSpacing: "0.14em",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            BOOST
          </div>
          <h1
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "clamp(32px, 5vw, 44px)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Get featured in discovery.
          </h1>
          <p
            style={{
              marginTop: "10px",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "14.5px",
              lineHeight: 1.55,
              color: "var(--text-secondary)",
              maxWidth: "560px",
            }}
          >
            Your profile appears in the homepage sponsored slot for the
            duration you choose. Pay with Mobile Money. Admin reviews
            within 24 hours, then the clock starts.
          </p>
        </div>

        {/* Open-boost banner (skip the picker if they have a live order) */}
        {openBoost && <OpenBoostBanner boost={openBoost} />}

        {/* Tier gate */}
        {!isRegular && !openBoost && <UpperTierExplainer tier={creator.tier} />}

        {/* The picker — only when eligible AND no open order */}
        {isRegular && !openBoost && (
          <BoostPlanPicker plans={BOOST_PLANS} />
        )}

        {/* What you get block */}
        <section
          style={{
            marginTop: "40px",
            padding: "20px 22px",
            borderRadius: "14px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              marginBottom: "12px",
            }}
          >
            WHAT YOU GET
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {[
              "A native promoted-creator card in the homepage discovery slot",
              "A `BOOSTED` tag so visitors know it's sponsored",
              "Clicks land directly on your profile — no middleman",
              "Pause-safe pricing — you pay once, no auto-renew",
            ].map((line) => (
              <li
                key={line}
                style={{
                  display: "flex",
                  gap: "10px",
                  fontSize: "13.5px",
                  fontFamily: "var(--font-dm-sans)",
                  color: "var(--text-secondary)",
                  lineHeight: 1.55,
                }}
              >
                <span
                  style={{
                    color: "var(--accent-purple)",
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  ✓
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <p
          style={{
            marginTop: "24px",
            fontSize: "12px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-dm-sans)",
            textAlign: "center",
          }}
        >
          Need help?{" "}
          <Link href="/safety" style={{ color: "var(--accent-purple)" }}>
            See our safety + support page
          </Link>
        </p>
      </div>
    </main>
  );
}

function OpenBoostBanner({
  boost,
}: {
  boost: {
    status: string;
    durationDays: number;
    amountCfa: number;
    endsAt: Date | null;
  };
}) {
  const label =
    boost.status === "ACTIVE"
      ? "You have an active boost"
      : boost.status === "PENDING_REVIEW"
        ? "We're reviewing your payment"
        : "Finish your boost payment";

  const cta =
    boost.status === "ACTIVE"
      ? null
      : { href: "/boost/proof", text: "CONTINUE →" };

  const daysLeft =
    boost.status === "ACTIVE" && boost.endsAt
      ? Math.max(
          0,
          Math.ceil(
            (boost.endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          ),
        )
      : null;

  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: "14px",
        border: "1px solid rgba(168,85,247,0.4)",
        background: "rgba(168,85,247,0.08)",
        marginBottom: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: "4px",
            fontFamily: "var(--font-dm-sans)",
            fontSize: "12.5px",
            color: "var(--text-secondary)",
          }}
        >
          {boost.durationDays}-day boost · {boost.amountCfa.toLocaleString()} CFA
          {daysLeft !== null && ` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
        </div>
      </div>
      {cta && (
        <Link
          href={cta.href}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, var(--accent-purple), #7c3aed)",
            color: "#fff",
            textDecoration: "none",
            fontFamily: "var(--font-dm-mono)",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.10em",
          }}
        >
          {cta.text}
        </Link>
      )}
    </div>
  );
}

function UpperTierExplainer({ tier }: { tier: string }) {
  const tierLabel =
    tier === "VIP_PLUS" ? "VIP+" : tier === "VIP" ? "VIP" : "Premium";
  return (
    <div
      style={{
        padding: "20px 22px",
        borderRadius: "14px",
        border: "1px solid var(--border-strong)",
        background: "var(--bg-surface)",
        marginBottom: "32px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "20px",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "0 0 8px",
        }}
      >
        You&apos;re already getting more visibility.
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-dm-sans)",
          fontSize: "13.5px",
          lineHeight: 1.6,
          color: "var(--text-secondary)",
        }}
      >
        Boosts are designed for Regular-tier creators. Your{" "}
        <strong style={{ color: "var(--text-primary)" }}>{tierLabel}</strong>{" "}
        plan already includes premium visibility — your card carries a
        tier badge and ranks above Regular creators in the homepage grid.
      </p>
      <p
        style={{
          marginTop: "12px",
          fontFamily: "var(--font-dm-sans)",
          fontSize: "12.5px",
          color: "var(--text-muted)",
        }}
      >
        Want even more visibility? Visit your{" "}
        <Link href="/dashboard" style={{ color: "var(--accent-purple)" }}>
          dashboard
        </Link>{" "}
        to see your stats and upgrade options.
      </p>
    </div>
  );
}
