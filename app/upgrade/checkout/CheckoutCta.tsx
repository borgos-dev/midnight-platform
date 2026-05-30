"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPendingSubscription } from "./actions";
import type { PaidPlanCode } from "@/app/lib/plans";

type Props = {
  plan: PaidPlanCode;
  provider: "MTN_MOMO" | "ORANGE_MONEY";
};

export default function CheckoutCta({ plan, provider }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleUpgrade = () => {
    startTransition(async () => {
      await createPendingSubscription(plan, provider);
      router.push("/upgrade/proof"); // ⭐ important navigation
    });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={pending}
        className="w-full bg-purple-600 hover:bg-purple-700 transition rounded-xl py-3 font-semibold disabled:opacity-60"
      >
        {pending ? "Processing..." : "Pay & Upgrade"}
      </button>

      <button
        onClick={() => router.back()}
        className="w-full text-sm text-gray-400 hover:text-white transition"
      >
        Cancel and go back
      </button>

      <p className="text-xs text-center text-gray-500">
        Payments are secure and encrypted.
      </p>
    </div>
  );
}