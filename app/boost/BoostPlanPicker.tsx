"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import type { BoostPlan } from "@/app/lib/boost-pricing";
import { formatCfa } from "@/app/lib/boost-pricing";
import { createPendingBoost } from "./actions";

type Props = {
  plans: BoostPlan[];
};

/**
 * Boost plan + provider picker. Two-step inline flow on the same page:
 *
 *   1. Tap a duration card — it becomes selected
 *   2. Tap a provider button — kicks the server action that mints the
 *      pending boost and redirects to /boost/proof
 *
 * Why one-page two-step (vs. wizard with /boost → /boost/checkout):
 *   - Total decision is small (one duration + one provider).
 *   - Reduces server round-trips: only the *commit* hits the server.
 *   - Mirrors how the upgrade flow makes the decision feel cohesive.
 */
export function BoostPlanPicker({ plans }: Props) {
  const [selectedDays, setSelectedDays] = useState<number>(
    plans.find((p) => p.popular)?.durationDays ?? plans[0].durationDays,
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedPlan =
    plans.find((p) => p.durationDays === selectedDays) ?? plans[0];

  function handleProvider(provider: "MTN_MOMO" | "ORANGE_MONEY") {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await createPendingBoost(selectedPlan.durationDays, provider);
      } catch (err: unknown) {
        // Server action throws on tier/email gate; surface the message.
        // `redirect()` from the action also lands here as a thrown signal
        // — Next handles the navigation despite our catch.
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
      }
    });
  }

  return (
    <div>
      {/* Duration cards */}
      <div className="boost-plans">
        {plans.map((plan) => {
          const active = plan.durationDays === selectedDays;
          return (
            <button
              key={plan.durationDays}
              type="button"
              onClick={() => setSelectedDays(plan.durationDays)}
              className={`boost-plan ${active ? "boost-plan--active" : ""}`}
              aria-pressed={active}
            >
              {plan.popular && (
                <span className="boost-plan__pop">MOST POPULAR</span>
              )}
              <div className="boost-plan__duration">{plan.label}</div>
              <div className="boost-plan__price">{formatCfa(plan.amountCfa)}</div>
              <div className="boost-plan__per">
                {(plan.amountCfa / plan.durationDays).toFixed(0)} CFA / day
              </div>
              {active && (
                <span className="boost-plan__check" aria-hidden>
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Provider row */}
      <div style={{ marginTop: "28px" }}>
        <div
          style={{
            fontFamily: "var(--font-dm-mono)",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: "var(--text-muted)",
            marginBottom: "10px",
          }}
        >
          PAY WITH
        </div>

        <div className="boost-providers">
          <button
            type="button"
            onClick={() => handleProvider("MTN_MOMO")}
            disabled={isPending}
            className="boost-provider boost-provider--mtn"
          >
            <span className="boost-provider__chip" style={{ background: "#FFCC00", color: "#1A1A1A" }}>MTN</span>
            <span>
              <span className="boost-provider__name">MTN MoMo</span>
              <span className="boost-provider__sub">
                Mobile Money
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleProvider("ORANGE_MONEY")}
            disabled={isPending}
            className="boost-provider boost-provider--orange"
          >
            <span className="boost-provider__chip" style={{ background: "#FF7900", color: "#fff" }}>O</span>
            <span>
              <span className="boost-provider__name">Orange Money</span>
              <span className="boost-provider__sub">
                Mobile Money
              </span>
            </span>
          </button>
        </div>

        {isPending && (
          <p
            style={{
              marginTop: "12px",
              fontFamily: "var(--font-dm-mono)",
              fontSize: "10.5px",
              letterSpacing: "0.08em",
              color: "var(--accent-purple)",
            }}
          >
            CREATING ORDER…
          </p>
        )}

        {error && (
          <p
            role="alert"
            style={{
              marginTop: "12px",
              padding: "10px 12px",
              borderRadius: "8px",
              background: "rgba(232,84,122,0.08)",
              border: "1px solid rgba(232,84,122,0.3)",
              fontSize: "12.5px",
              color: "#E8547A",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            {error}
          </p>
        )}
      </div>

      <style>{`
        .boost-plans {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .boost-plans {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .boost-plan {
          position: relative;
          padding: 18px 16px 16px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-primary);
          text-align: left;
          cursor: pointer;
          transition: border-color 0.18s ease, background 0.18s ease,
            transform 0.15s ease;
        }
        .boost-plan:hover {
          border-color: rgba(168, 85, 247, 0.4);
          transform: translateY(-2px);
        }
        .boost-plan--active {
          border-color: var(--accent-purple);
          background: rgba(168, 85, 247, 0.08);
        }

        .boost-plan__pop {
          position: absolute;
          top: -9px;
          left: 14px;
          padding: 3px 9px;
          border-radius: 999px;
          background: linear-gradient(135deg, #E6A817, #C28A0F);
          color: #1A0F00;
          font-family: var(--font-dm-mono);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .boost-plan__duration {
          font-family: var(--font-cormorant);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .boost-plan__price {
          margin-top: 4px;
          font-family: var(--font-dm-mono);
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: var(--accent-purple);
        }
        .boost-plan__per {
          margin-top: 2px;
          font-family: var(--font-dm-sans);
          font-size: 11.5px;
          color: var(--text-muted);
        }
        .boost-plan__check {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--accent-purple);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
        }

        .boost-providers {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 480px) {
          .boost-providers {
            grid-template-columns: 1fr 1fr;
          }
        }

        .boost-provider {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid var(--border-strong);
          background: var(--bg-surface);
          color: var(--text-primary);
          cursor: pointer;
          text-align: left;
          transition: border-color 0.18s ease, background 0.18s ease,
            transform 0.15s ease;
        }
        .boost-provider:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: var(--accent-purple);
        }
        .boost-provider:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .boost-provider__chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 9px;
          font-family: var(--font-dm-mono);
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }
        .boost-provider__name {
          display: block;
          font-family: var(--font-dm-sans);
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .boost-provider__sub {
          display: block;
          font-family: var(--font-dm-mono);
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
