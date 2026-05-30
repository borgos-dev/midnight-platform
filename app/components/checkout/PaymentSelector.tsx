"use client";

import Image from "next/image";

type Provider = "MTN_MOMO" | "ORANGE_MONEY";

interface PaymentSelectorProps {
    value: Provider;
    onChange: (p: Provider) => void;
}

export default function PaymentSelector({ value, onChange }: PaymentSelectorProps) {
    return (
        <div className="mn-payment-selector">
            <h2 className="mn-payment-selector__heading">Payment method</h2>

            <div className="mn-payment-grid">
                <button
                    type="button"
                    onClick={() => onChange("MTN_MOMO")}
                    className={`mn-payment-card ${value === "MTN_MOMO" ? "mn-payment-card--active mn-payment-card--mtn" : ""}`}
                    aria-pressed={value === "MTN_MOMO"}
                    aria-label="Pay with MTN Mobile Money"
                >
                    <Image
                        src="/payments/mtn-momo.svg"
                        alt="MTN MoMo"
                        width={80}
                        height={40}
                        style={{ height: "auto", maxWidth: "100%" }}
                    />
                </button>

                <button
                    type="button"
                    onClick={() => onChange("ORANGE_MONEY")}
                    className={`mn-payment-card ${value === "ORANGE_MONEY" ? "mn-payment-card--active mn-payment-card--orange" : ""}`}
                    aria-pressed={value === "ORANGE_MONEY"}
                    aria-label="Pay with Orange Money"
                >
                    <Image
                        src="/payments/orange-money.svg"
                        alt="Orange Money"
                        width={80}
                        height={40}
                        style={{ height: "auto", maxWidth: "100%" }}
                    />
                </button>
            </div>

            <style>{`
                .mn-payment-selector {
                    margin-top: 24px;
                }
                .mn-payment-selector__heading {
                    font-family: var(--font-cormorant);
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0 0 12px;
                }
                .mn-payment-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }
                .mn-payment-card {
                    min-height: 72px;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: border-color 0.18s ease, background 0.18s ease;
                }
                .mn-payment-card:hover {
                    border-color: var(--border-strong);
                }
                .mn-payment-card--active {
                    border-width: 2px;
                    padding: 15px;
                }
                .mn-payment-card--mtn.mn-payment-card--active {
                    border-color: #FFCC00;
                    background: rgba(255, 204, 0, 0.06);
                }
                .mn-payment-card--orange.mn-payment-card--active {
                    border-color: #FF7900;
                    background: rgba(255, 121, 0, 0.06);
                }
            `}</style>
        </div>
    );
}
