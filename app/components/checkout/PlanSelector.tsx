"use client";

type Plan = "VIP" | "VIP_PLUS";

interface PlanSelectorProps {
    value: Plan;
    onChange: (plan: Plan) => void;
}

export default function PlanSelector({ value, onChange }: PlanSelectorProps) {
    return (
        <div className="space-y-3">
            <h3 className="text-lg font-semibold">Choose a plan</h3>

            {/* VIP */}
            <button
                onClick={() => onChange("VIP")}
                className={`w-full border rounded-lg p-4 text-left transition ${value === "VIP"
                        ? "border-purple-600 bg-purple-50"
                        : "border-gray-300 hover:border-purple-400"
                    }`}
            >
                <p className="font-medium">VIP</p>
                <p className="text-sm text-gray-600">
                    Access premium creator content
                </p>
            </button>

            {/* VIP PLUS */}
            <button
                onClick={() => onChange("VIP_PLUS")}
                className={`w-full border rounded-lg p-4 text-left transition ${value === "VIP_PLUS"
                        ? "border-purple-600 bg-purple-50"
                        : "border-gray-300 hover:border-purple-400"
                    }`}
            >
                <p className="font-medium">VIP PLUS</p>
                <p className="text-sm text-gray-600">
                    Premium + exclusive bonuses
                </p>
            </button>
        </div>
    );
}
