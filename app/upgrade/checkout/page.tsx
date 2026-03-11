"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import PlanSummary from "./PlanSummary";
import PaymentMethod from "./PaymentMethod";
import CheckoutCTA from "./CheckoutCta";

export default function CheckoutPage() {
  const searchParams = useSearchParams();

  // ✅ Detect plan from URL
  const plan =
    searchParams.get("plan") === "VIP_PLUS" ? "VIP_PLUS" : "VIP";

  const price = plan === "VIP_PLUS" ? 20000 : 10000;

  // ✅ Provider state (MTN default)
  const [provider, setProvider] =
    useState<"MTN_MOMO" | "ORANGE_MONEY">("MTN_MOMO");

  return (
    <div className="min-h-screen bg-[#0b1020] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-[#11172e] rounded-2xl shadow-lg p-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">
            Upgrade to {plan === "VIP_PLUS" ? "VIP+" : "VIP"}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Secure your upgrade and unlock premium features.
          </p>
        </div>

        {/* Plan summary */}
        <PlanSummary plan={plan} price={price} />

        {/* Payment method */}
        <PaymentMethod provider={provider} setProvider={setProvider} />

        {/* Payment instructions */}
        <div className="rounded-2xl border border-white/10 bg-gray-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Send payment to</h2>

          {/* MTN */}
          <div className="rounded-xl border border-yellow-500/30 px-4 py-3 space-y-1">
            <p className="font-medium">MTN Mobile Money</p>
            <p className="text-sm text-white/60">Name: Akiy Humphery</p>
            <p className="text-yellow-400 font-semibold">679 76 97 01</p>
          </div>

          {/* Orange */}
          <div className="rounded-xl border border-orange-500/30 px-4 py-3 space-y-1">
            <p className="font-medium">Orange Money</p>
            <p className="text-sm text-white/60">Name: Akiy Humphery</p>
            <p className="text-orange-400 font-semibold">694 45 69 05</p>
          </div>

          <p className="text-sm text-white/60">
            You are paying the <strong>official Midnight24/7 account</strong>.  
            Include your <strong>email address</strong> as the payment reference.
          </p>

          <p className="text-xs text-white/40">
            Approval usually takes 5–30 minutes after payment confirmation.
          </p>
        </div>

        {/* ✅ CTA now receives REAL values */}
        <CheckoutCTA plan={plan} provider={provider} />

      </div>
    </div>
  );
}