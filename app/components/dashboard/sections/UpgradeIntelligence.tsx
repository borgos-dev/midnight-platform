// app/components/dashboard/sections/UpgradeIntelligence.tsx
"use client";

import { AccessLevel } from "@prisma/client";
import type { AnalyticsPayload } from "@/app/dashboard/DashboardShell";

type UpgradeIntelligenceProps = {
  tier: AccessLevel;
  analytics?: AnalyticsPayload;
  onUpgradeClick?: () => void;
};

export function UpgradeIntelligence({
  tier,
  analytics,
  onUpgradeClick,
}: UpgradeIntelligenceProps) {
  // VIP_PLUS → real advanced insights card
  if (tier === "VIP_PLUS" && analytics) {
    return (
      <section className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-lg">👑</span>
          <h2 className="text-[13px] font-semibold text-amber-300">
            Elite Creator Insights
          </h2>
        </div>

        {/* Advanced analytics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <InsightCard
            label="Best Day"
            value={analytics.bestDay ?? "Not enough data"}
            icon="📅"
          />
          <InsightCard
            label="Best Time"
            value={analytics.bestTime ?? "Not enough data"}
            icon="⏰"
          />
          <InsightCard
            label="WhatsApp CTR"
            value={
              analytics.conversionRate !== null
                ? `${analytics.conversionRate.toFixed(1)}%`
                : "—"
            }
            icon="💬"
          />
          <InsightCard
            label="Monthly Views"
            value={analytics.profileViewsMonth.toLocaleString()}
            icon="👁"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            "Full analytics",
            "City ranking",
            "Conversion rate",
            "Best posting time",
            "Priority placement",
            "Blur preview feature",
          ].map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 text-[11px] text-amber-300/70"
            >
              <span className="text-[10px]">✓</span>
              {feature}
            </div>
          ))}
        </div>
      </section>
    );
  }

  // VIP → pitch VIP+
  if (tier === "VIP") {
    return (
      <section className="rounded-xl border border-white/[0.06] bg-[#0a0a12] p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-lg">⚡</span>
          <h2 className="text-[13px] font-semibold text-white/80">
            Unlock Full Power
          </h2>
        </div>
        <p className="text-[12px] text-white/40 leading-relaxed mb-4">
          You&apos;re getting more visibility with VIP. Go further with VIP+ to
          see exactly how your profile converts visitors into WhatsApp messages.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Unlocked VIP features */}
          {["WhatsApp clicks", "Better visibility", "Weekly chart"].map(
            (f) => (
              <div
                key={f}
                className="flex items-center gap-2 text-[11px] text-purple-300/70"
              >
                <span className="text-[10px]">✓</span>
                {f}
              </div>
            )
          )}
          {/* Locked VIP+ features */}
          {["Conversion rate", "City rank", "Best posting time"].map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 text-[11px] text-white/20"
            >
              <span className="text-[10px]">🔒</span>
              {f}
            </div>
          ))}
        </div>

        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="rounded-lg bg-purple-600 px-5 py-2.5 text-[12px] font-semibold text-white hover:bg-purple-500 transition"
          >
            Upgrade to VIP+
          </button>
        )}
      </section>
    );
  }

  // REGULAR → pitch VIP
  return (
    <section className="rounded-xl border border-white/[0.06] bg-[#0a0a12] p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg">🚀</span>
        <h2 className="text-[13px] font-semibold text-white/80">
          You&apos;re Being Seen — But Are You Being Chosen?
        </h2>
      </div>
      <p className="text-[12px] text-white/40 leading-relaxed mb-4">
        Your profile is live, but you&apos;re missing key insights. VIP creators
        see who&apos;s clicking their WhatsApp and get boosted in search
        results.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Locked VIP features */}
        {[
          "WhatsApp click analytics",
          "Visibility boost",
          "Weekly chart",
          "Priority placement",
        ].map((f) => (
          <div
            key={f}
            className="flex items-center gap-2 text-[11px] text-white/20"
          >
            <span className="text-[10px]">🔒</span>
            {f}
          </div>
        ))}
      </div>

      {onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className="rounded-lg bg-purple-600 px-5 py-2.5 text-[12px] font-semibold text-white hover:bg-purple-500 transition"
        >
          Upgrade to VIP
        </button>
      )}
    </section>
  );
}

/* ──────── Insight Card (VIP+ advanced) ──────── */

function InsightCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-lg border border-amber-400/10 bg-amber-400/[0.03] p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] text-amber-300/50 font-medium">
          {label}
        </span>
      </div>
      <p className="text-[13px] font-semibold text-amber-200 truncate">
        {value}
      </p>
    </div>
  );
}
