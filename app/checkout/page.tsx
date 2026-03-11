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

        const res = await fetch("/api/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                plan,
                provider,
                amountCfa: plan === "VIP" ? 5000 : 9000,
            }),
        });

        const data = await res.json();

        // later → redirect to real payment gateway
        router.push(`/checkout/pay/${data.id}`);
    }

    return (
        <div className="max-w-xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Checkout</h1>

            <PlanSelector value={plan} onChange={setPlan} />
            <PaymentSelector value={provider} onChange={setProvider} />

            <button
                onClick={handleCheckout}
                disabled={loading}
                className="mt-6 w-full bg-purple-600 text-white py-3 rounded-xl font-semibold"
            >
                {loading ? "Processing..." : "Continue to payment"}
            </button>

            <button
                onClick={() => router.back()}
                className="mt-4 w-full text-gray-500"
            >
                Cancel & go back
            </button>
        </div>
    );
}
