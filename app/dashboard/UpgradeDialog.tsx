// UpgradeDialog.tsx
"use client";

import Link from "next/link";
import { Button, buttonClasses } from "@/app/components/ui/Button";
import { PLANS, formatPriceCfa } from "@/app/lib/plans";

type UpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Quick-pick upgrade modal opened from the dashboard. Shows all three paid
 * tiers with a short bullet list each; the full comparison page lives at
 * /upgrade. Pricing comes from app/lib/plans.ts — never hardcoded here.
 */
export function UpgradeDialog({ open, onOpenChange }: UpgradeDialogProps) {
  if (!open) return null;

  const vipPlus = PLANS.VIP_PLUS;
  const vip = PLANS.VIP;
  const premium = PLANS.PREMIUM;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 border border-white/8">
        <h2 className="text-[15px] font-semibold text-white tracking-tight">
          Upgrade your visibility
        </h2>
        <p className="mt-1.5 text-[12px] text-white/40 leading-relaxed">
          Get noticed faster, unlock analytics, and convert visitors into real
          WhatsApp conversations.
        </p>

        <div className="mt-5 space-y-3">
          {/* VIP+ — gold (top tier, verified-only) */}
          <div className="rounded-xl border border-brand-gold/30 bg-brand-gold/4 p-4">
            <p className="text-[13px] font-semibold text-brand-gold">
              {vipPlus.label}
            </p>
            <ul className="mt-2.5 space-y-1.5 text-label text-white/50">
              {vipPlus.features.slice(0, 3).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] font-semibold text-white">
              {formatPriceCfa(vipPlus.priceCfa)} / {vipPlus.durationDays}d
            </p>
            <Link
              href={`/upgrade/checkout?plan=${vipPlus.code}`}
              className={`mt-3 ${buttonClasses("gold", "sm")}`}
            >
              Go {vipPlus.label}
            </Link>
          </div>

          {/* VIP — purple */}
          <div className="rounded-xl border border-brand-purple/30 bg-brand-purple/6 p-4">
            <p className="text-[13px] font-semibold text-brand-purple">
              {vip.label}
            </p>
            <ul className="mt-2.5 space-y-1.5 text-label text-white/50">
              {vip.features.slice(0, 3).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] font-semibold text-white">
              {formatPriceCfa(vip.priceCfa)} / {vip.durationDays}d
            </p>
            <Link
              href={`/upgrade/checkout?plan=${vip.code}`}
              className={`mt-3 ${buttonClasses("primary", "sm")}`}
            >
              Upgrade to {vip.label}
            </Link>
          </div>

          {/* PREMIUM — rose (first step above free) */}
          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: "rgba(232, 84, 122, 0.35)",
              background: "rgba(232, 84, 122, 0.05)",
            }}
          >
            <p
              className="text-[13px] font-semibold"
              style={{ color: "#E8547A" }}
            >
              {premium.label}
            </p>
            <ul className="mt-2.5 space-y-1.5 text-label text-white/50">
              {premium.features.slice(0, 3).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] font-semibold text-white">
              {formatPriceCfa(premium.priceCfa)} / {premium.durationDays}d
            </p>
            <Link
              href={`/upgrade/checkout?plan=${premium.code}`}
              className="mt-3 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
              style={{
                background:
                  "linear-gradient(135deg, #E8547A 0%, #B83A60 100%)",
              }}
            >
              Upgrade to {premium.label}
            </Link>
          </div>
        </div>

        <Link
          href="/upgrade"
          onClick={() => onOpenChange(false)}
          className="mt-5 block text-center text-[12px] font-semibold text-brand-purple hover:text-white transition"
        >
          Compare all plans →
        </Link>

        <p className="mt-3 text-center text-eyebrow text-white/25">
          No auto-renew. Each cycle is paid on purpose.
        </p>

        <div className="mt-4">
          <Button variant="ghost" fullWidth onClick={() => onOpenChange(false)}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
