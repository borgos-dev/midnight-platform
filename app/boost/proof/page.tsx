import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCreatorProfile } from "@/app/lib/auth-helpers";
import { expireDueBoosts } from "@/app/lib/boost-lifecycle";
import { BoostProofForm } from "./BoostProofForm";

export const metadata: Metadata = {
  title: "Send boost payment proof — Midnight",
};

export default async function BoostProofPage() {
  await expireDueBoosts();

  const creator = await getCurrentCreatorProfile();
  if (!creator) redirect("/login?next=/boost");

  // Pick the most recent boost the creator can still submit proof for.
  // PENDING_REVIEW is fair game in case they want to fix the phone number.
  const boost = await prisma.boost.findFirst({
    where: {
      creatorprofileId: creator.id,
      status: { in: ["PENDING_PAYMENT", "PENDING_REVIEW"] },
    },
    orderBy: { createdAt: "desc" },
  });

  // No open order? Send them back to /boost to start one.
  if (!boost) redirect("/boost");

  const providerLabel =
    boost.provider === "MTN_MOMO" ? "MTN MoMo" : "Orange Money";

  return (
    <main
      style={{
        background: "var(--bg-base)",
        minHeight: "100vh",
        padding: "120px 20px 80px",
      }}
    >
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px" }}>
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
            STEP 2 OF 2 · PAYMENT PROOF
          </div>
          <h1
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "clamp(28px, 5vw, 36px)",
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Send us your payment proof.
          </h1>
        </div>

        {/* Order summary */}
        <div
          style={{
            padding: "16px 18px",
            borderRadius: "12px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "13px",
              color: "var(--text-secondary)",
            }}
          >
            <span>Boost duration</span>
            <strong style={{ color: "var(--text-primary)" }}>
              {boost.durationDays} days
            </strong>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "6px",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "13px",
              color: "var(--text-secondary)",
            }}
          >
            <span>Amount</span>
            <strong style={{ color: "var(--accent-purple)" }}>
              {boost.amountCfa.toLocaleString()} CFA
            </strong>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "6px",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "13px",
              color: "var(--text-secondary)",
            }}
          >
            <span>Pay with</span>
            <strong style={{ color: "var(--text-primary)" }}>
              {providerLabel}
            </strong>
          </div>
        </div>

        {/* Instructions + form */}
        <p
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "13.5px",
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            margin: "0 0 20px",
          }}
        >
          After sending the payment via {providerLabel}, enter the phone
          number you used and tap the button. WhatsApp opens with a message
          pre-addressed to our admin — attach your payment screenshot there.
        </p>

        <BoostProofForm
          defaultPhone={boost.phoneNumber ?? ""}
          alreadySubmitted={boost.status === "PENDING_REVIEW"}
        />

        <p
          style={{
            marginTop: "28px",
            fontFamily: "var(--font-dm-sans)",
            fontSize: "12px",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          Need to change duration?{" "}
          <Link href="/dashboard" style={{ color: "var(--accent-purple)" }}>
            Back to dashboard
          </Link>{" "}
          and contact support.
        </p>
      </div>
    </main>
  );
}
