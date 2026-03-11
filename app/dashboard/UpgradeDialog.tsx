// UpgradeDialog.tsx
"use client";

import Link from "next/link";

type UpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UpgradeDialog({ open, onOpenChange }: UpgradeDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#0a0a12] p-6 border border-white/[0.08]">
        <h2 className="text-[15px] font-semibold text-white tracking-tight">
          Upgrade your visibility
        </h2>
        <p className="mt-1.5 text-[12px] text-white/40 leading-relaxed">
          Get noticed faster, unlock analytics, and convert visitors into real
          WhatsApp conversations.
        </p>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.06] p-4">
            <p className="text-[13px] font-semibold text-purple-300">
              VIP
            </p>
            <ul className="mt-2.5 space-y-1.5 text-[11px] text-white/50">
              <li>Higher placement in listings</li>
              <li>WhatsApp click analytics</li>
              <li>Weekly performance chart</li>
            </ul>
            <p className="mt-3 text-[13px] font-semibold text-white">
              10,000 CFA / month
            </p>
            <Link
              href="/upgrade/checkout?plan=VIP"
              className="mt-3 inline-block rounded-lg bg-purple-600 px-5 py-2 text-[12px] font-semibold text-white hover:bg-purple-500 transition"
            >
              Upgrade to VIP
            </Link>
          </div>

          <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
            <p className="text-[13px] font-semibold text-amber-300">
              VIP+
            </p>
            <ul className="mt-2.5 space-y-1.5 text-[11px] text-white/50">
              <li>Top placement across the platform</li>
              <li>Full analytics: conversion rate, city rank</li>
              <li>Priority visibility and blur preview</li>
            </ul>
            <p className="mt-3 text-[13px] font-semibold text-white">
              20,000 CFA / month
            </p>
            <Link
              href="/upgrade/checkout?plan=VIP_PLUS"
              className="mt-3 inline-block rounded-lg bg-amber-500 px-5 py-2 text-[12px] font-semibold text-black hover:bg-amber-400 transition"
            >
              Go VIP+
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] text-white/25">
          No contracts. Cancel anytime. Upgrade takes effect immediately.
        </p>

        <button
          onClick={() => onOpenChange(false)}
          className="mt-4 w-full rounded-lg border border-white/[0.08] px-4 py-2.5 text-[12px] text-white/50 hover:text-white hover:bg-white/[0.04] transition"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
