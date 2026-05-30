"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PlanSelector from "../components/checkout/PlanSelector";
import PaymentSelector from "../components/checkout/PaymentSelector";

export default function CheckoutPage() {
    const router = useRouter();

    const [plan, setPlan] = useState<"VIP" | "VIP_PLUS">("VIP");
    const [provider, setProvider] = useState<"MTN_MOMO" | "ORANGE_MONEY">("MTN_MOMO");
    const [loading, setLoading] = useState(false);

    async function handleCheckout() {
        setLoading(true);

        // amountCfa is set server-side from app/lib/plans.ts — never trust
        // a client-supplied price. Body carries plan + provider only.
        const res = await fetch("/api/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan, provider }),
        });

        const data = await res.json();

        // later → redirect to real payment gateway
        router.push(`/checkout/pay/${data.id}`);
    }

    return (
        <div
            className="mn-checkout-root"
            style={{ minHeight: "100vh", background: "var(--bg-primary)" }}
        >
            <div className="mn-checkout-shell">
                <h1
                    style={{
                        fontFamily: "var(--font-cormorant)",
                        fontSize: "clamp(28px, 5.5vw, 36px)",
                        fontWeight: 700,
                        lineHeight: 1.15,
                        letterSpacing: "-0.02em",
                        color: "var(--text-primary)",
                        margin: "0 0 24px",
                    }}
                >
                    Checkout
                </h1>

                <PlanSelector value={plan} onChange={setPlan} />
                <PaymentSelector value={provider} onChange={setProvider} />

                <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="mn-checkout-cta"
                >
                    {loading ? "Processing..." : "Continue to payment"}
                </button>

                <button
                    onClick={() => router.back()}
                    className="mn-checkout-cancel"
                >
                    Cancel & go back
                </button>
            </div>

            <style>{`
                /* Account for the fixed AnnouncementBar (36px) + Navbar (~57px)
                   so the heading isn't tucked under the chrome on any breakpoint. */
                .mn-checkout-root {
                    padding: 112px 16px 64px;
                }
                @media (min-width: 768px) {
                    .mn-checkout-root {
                        padding: 128px 24px 80px;
                    }
                }

                .mn-checkout-shell {
                    max-width: 560px;
                    margin: 0 auto;
                }

                /* Full-width on mobile, hits the 44px tap target floor. */
                .mn-checkout-cta {
                    margin-top: 24px;
                    width: 100%;
                    min-height: 48px;
                    padding: 14px 20px;
                    border: none;
                    border-radius: 12px;
                    background: linear-gradient(135deg, var(--accent-purple), #7c3aed);
                    color: #fff;
                    font-family: var(--font-dm-mono);
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 0.10em;
                    text-transform: uppercase;
                    cursor: pointer;
                    box-shadow: 0 8px 24px rgba(168, 85, 247, 0.35);
                    transition: transform 0.15s ease, opacity 0.15s ease;
                }
                .mn-checkout-cta:disabled {
                    opacity: 0.6;
                    cursor: wait;
                }
                .mn-checkout-cta:hover:not(:disabled) {
                    transform: translateY(-1px);
                }

                .mn-checkout-cancel {
                    margin-top: 12px;
                    width: 100%;
                    min-height: 44px;
                    padding: 12px 16px;
                    background: transparent;
                    border: 1px solid var(--border-strong);
                    border-radius: 12px;
                    color: var(--text-secondary);
                    font-family: var(--font-dm-mono);
                    font-size: 11px;
                    letter-spacing: 0.06em;
                    cursor: pointer;
                    transition: border-color 0.15s ease, color 0.15s ease;
                }
                .mn-checkout-cancel:hover {
                    border-color: rgba(255, 255, 255, 0.3);
                    color: var(--text-primary);
                }
            `}</style>
        </div>
    );
}
