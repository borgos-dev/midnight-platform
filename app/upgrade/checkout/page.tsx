"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import PlanSummary from "./PlanSummary";
import PaymentMethod from "./PaymentMethod";
import CheckoutCTA from "./CheckoutCta";
import { PLANS, isPaidPlanCode, type PaidPlanCode } from "@/app/lib/plans";

export default function CheckoutPage() {
  const searchParams = useSearchParams();

  // Whitelist the URL plan param so a stray ?plan=foo falls back to VIP
  // (the most common upgrade path) rather than crashing on an undefined
  // PLANS[plan] lookup downstream.
  const raw = searchParams.get("plan") ?? "";
  const plan: PaidPlanCode = isPaidPlanCode(raw) ? raw : "VIP";
  const def = PLANS[plan];

  const [provider, setProvider] =
    useState<"MTN_MOMO" | "ORANGE_MONEY">("MTN_MOMO");

  return (
    <div className="min-h-screen bg-[#0b1020] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-[#11172e] rounded-2xl shadow-lg p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Upgrade to {def.label}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Secure your upgrade and unlock {def.label} features for{" "}
            {def.durationDays} days.
          </p>
        </div>

        <PlanSummary plan={plan} />

        <PaymentMethod provider={provider} setProvider={setProvider} />

        <div className="rounded-2xl border border-white/10 bg-gray-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Send payment to</h2>

          <div className="rounded-xl border border-yellow-500/30 px-4 py-3 space-y-1">
            <p className="font-medium">MTN Mobile Money</p>
            <p className="text-sm text-white/60">Name: Akiy Humphery</p>
            <p className="text-yellow-400 font-semibold">679 76 97 01</p>
          </div>

          <div className="rounded-xl border border-orange-500/30 px-4 py-3 space-y-1">
            <p className="font-medium">Orange Money</p>
            <p className="text-sm text-white/60">Name: Akiy Humphery</p>
            <p className="text-orange-400 font-semibold">694 45 69 05</p>
          </div>

          <p className="text-sm text-white/60">
            You are paying the <strong>official Midnight account</strong>.
            Include your <strong>email address</strong> as the payment reference.
          </p>

          <p className="text-xs text-white/40">
            Approval usually takes 5–30 minutes after payment confirmation.
          </p>
        </div>

        <CheckoutCTA plan={plan} provider={provider} />
      </div>
    </div>
  );
}
