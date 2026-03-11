// app/components/dashboard/sections/IntentGrid.tsx
"use client";

import { AccessLevel } from "@prisma/client";
import type { AnalyticsPayload } from "@/app/dashboard/DashboardShell";

type IntentGridProps = {
  tier: AccessLevel;
  analytics: AnalyticsPayload;
  onUpgradeClick?: () => void;
};

export function IntentGrid({
  tier,
  analytics,
  onUpgradeClick,
}: IntentGridProps) {
  const isVip = tier === "VIP" || tier === "VIP_PLUS";
  const isVipPlus = tier === "VIP_PLUS";

  const {
    profileViewsToday,
    profileViewsWeek,
    profileViewsMonth,
    whatsappClicksToday,
    whatsappClicksWeek,
    whatsappClicksMonth,
    conversionRate,
    cityRank,
  } = analytics;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-[13px] font-semibold text-white/80 tracking-tight">
          Performance Overview
        </h2>
        <p className="text-[11px] text-white/30 mt-0.5">
          Real analytics from your profile activity
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* ─── Card 1: Profile Views (ALL tiers) ─── */}
        <MetricCard
          label="Profile Views"
          value={profileViewsWeek.toLocaleString()}
          locked={false}
          accent="text-white"
          sublabel="Last 7 days"
          breakdown={[
            { label: "Today", value: profileViewsToday },
            { label: "This week", value: profileViewsWeek },
            { label: "This month", value: profileViewsMonth },
          ]}
        />

        {/* ─── Card 2: WhatsApp Clicks (VIP+) ─── */}
        <MetricCard
          label="WhatsApp Clicks"
          value={isVip ? whatsappClicksWeek.toLocaleString() : "•••"}
          sublabel="Last 7 days"
          hint={
            isVip ? undefined : "Unlock with VIP to see real click data"
          }
          accent={isVip ? "text-purple-400" : "text-white/20"}
          locked={!isVip}
          lockLabel="VIP"
          onUpgradeClick={onUpgradeClick}
          breakdown={
            isVip
              ? [
                  { label: "Today", value: whatsappClicksToday },
                  { label: "This week", value: whatsappClicksWeek },
                  { label: "This month", value: whatsappClicksMonth },
                ]
              : undefined
          }
        />

        {/* ─── Card 3: Conversion Rate (VIP+ only) ─── */}
        <MetricCard
          label="Conversion Rate"
          value={
            isVipPlus
              ? conversionRate !== null
                ? `${conversionRate.toFixed(1)}%`
                : "—"
              : "•••"
          }
          sublabel="Views → WhatsApp"
          hint={
            isVipPlus
              ? undefined
              : "Unlock with VIP+ for conversion insights"
          }
          accent={isVipPlus ? "text-amber-300" : "text-white/20"}
          locked={!isVipPlus}
          lockLabel="VIP+"
          onUpgradeClick={onUpgradeClick}
        />

        {/* ─── Card 4: City Rank (VIP+ only) ─── */}
        <MetricCard
          label="City Rank"
          value={
            isVipPlus
              ? cityRank !== null
                ? `#${cityRank}`
                : "—"
              : "•••"
          }
          sublabel="Your area"
          hint={
            isVipPlus
              ? undefined
              : "Unlock with VIP+ to see your city rank"
          }
          accent={isVipPlus ? "text-amber-300" : "text-white/20"}
          locked={!isVipPlus}
          lockLabel="VIP+"
          onUpgradeClick={onUpgradeClick}
        />
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════
   METRIC CARD
   ════════════════════════════════════════════ */

function MetricCard({
  label,
  value,
  sublabel,
  hint,
  accent,
  locked,
  lockLabel,
  onUpgradeClick,
  breakdown,
}: {
  label: string;
  value: string;
  sublabel: string;
  hint?: string;
  accent: string;
  locked: boolean;
  lockLabel?: string;
  onUpgradeClick?: () => void;
  breakdown?: { label: string; value: number }[];
}) {
  return (
    <div className="relative rounded-xl border border-white/[0.06] bg-[#0a0a12] p-4 overflow-hidden">
      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 z-10 rounded-xl bg-black/70 backdrop-blur-[6px] flex flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-[11px] font-semibold text-white/50">
            {label}
          </p>
          <p className="text-[10px] text-white/30 leading-snug">{hint}</p>
          {lockLabel && onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="mt-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[10px] font-medium text-purple-300 hover:bg-purple-500/20 transition"
            >
              Unlock with {lockLabel}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-white/40">{label}</p>
        {!locked && (
          <svg className="w-8 h-4 text-purple-500/40" viewBox="0 0 32 16">
            <polyline
              points="0,14 6,10 12,12 18,6 24,8 32,2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <span className={`text-2xl font-bold tracking-tight ${accent}`}>
        {value}
      </span>

      {/* Breakdown rows (today / week / month) */}
      {breakdown && !locked ? (
        <div className="mt-2 space-y-0.5">
          {breakdown.map((b) => (
            <div
              key={b.label}
              className="flex items-center justify-between text-[10px]"
            >
              <span className="text-white/25">{b.label}</span>
              <span className="text-white/50 font-medium tabular-nums">
                {b.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-[10px] text-white/20">{sublabel}</p>
      )}
    </div>
  );
}
