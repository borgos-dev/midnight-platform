"use client";

type Plan = "VIP" | "VIP_PLUS";

interface PlanSelectorProps {
    value: Plan;
    onChange: (plan: Plan) => void;
}

export default function PlanSelector({ value, onChange }: PlanSelectorProps) {
    return (
        <div className="mn-plan-selector">
            <h3 className="mn-plan-selector__heading">Choose a plan</h3>

            <button
                type="button"
                onClick={() => onChange("VIP")}
                className={`mn-plan-card ${value === "VIP" ? "mn-plan-card--active" : ""}`}
                aria-pressed={value === "VIP"}
            >
                <span className="mn-plan-card__title">VIP</span>
                <span className="mn-plan-card__sub">
                    Access premium creator content
                </span>
            </button>

            <button
                type="button"
                onClick={() => onChange("VIP_PLUS")}
                className={`mn-plan-card ${value === "VIP_PLUS" ? "mn-plan-card--active mn-plan-card--gold" : ""}`}
                aria-pressed={value === "VIP_PLUS"}
            >
                <span className="mn-plan-card__title">VIP+</span>
                <span className="mn-plan-card__sub">
                    Premium + exclusive bonuses
                </span>
            </button>

            <style>{`
                .mn-plan-selector {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .mn-plan-selector__heading {
                    font-family: var(--font-cormorant);
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0 0 4px;
                }
                .mn-plan-card {
                    width: 100%;
                    min-height: 64px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 4px;
                    padding: 14px 16px;
                    border-radius: 12px;
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    text-align: left;
                    cursor: pointer;
                    transition: border-color 0.18s ease, background 0.18s ease;
                }
                .mn-plan-card:hover {
                    border-color: rgba(168, 85, 247, 0.4);
                }
                .mn-plan-card--active {
                    border-color: var(--accent-purple);
                    background: rgba(168, 85, 247, 0.10);
                }
                .mn-plan-card--gold.mn-plan-card--active {
                    border-color: var(--accent-gold);
                    background: rgba(230, 168, 23, 0.10);
                }
                .mn-plan-card__title {
                    font-family: var(--font-dm-mono);
                    font-size: 13px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    color: var(--text-primary);
                }
                .mn-plan-card--gold.mn-plan-card--active .mn-plan-card__title {
                    color: var(--accent-gold);
                }
                .mn-plan-card--active:not(.mn-plan-card--gold) .mn-plan-card__title {
                    color: var(--accent-purple);
                }
                .mn-plan-card__sub {
                    font-family: var(--font-dm-sans);
                    font-size: 13px;
                    color: var(--text-secondary);
                    line-height: 1.4;
                }
            `}</style>
        </div>
    );
}
