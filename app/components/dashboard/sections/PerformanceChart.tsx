// app/components/dashboard/sections/PerformanceChart.tsx
"use client";

import { AccessLevel } from "@prisma/client";
import type { AnalyticsPayload } from "@/app/dashboard/DashboardShell";

type PerformanceChartProps = {
  tier: AccessLevel;
  analytics: AnalyticsPayload;
  onUpgradeClick?: () => void;
};

const PERIODS = ["Today", "This Week", "This Month"] as const;

export function PerformanceChart({
  tier,
  analytics,
  onUpgradeClick,
}: PerformanceChartProps) {
  const isVip = tier === "VIP" || tier === "VIP_PLUS";
  const isVipPlus = tier === "VIP_PLUS";

  // Real data points from DB columns
  const viewsData = [
    analytics.profileViewsToday,
    analytics.profileViewsWeek,
    analytics.profileViewsMonth,
  ];
  const clicksData = [
    analytics.whatsappClicksToday,
    analytics.whatsappClicksWeek,
    analytics.whatsappClicksMonth,
  ];

  const maxVal = Math.max(...viewsData, ...(isVipPlus ? clicksData : []), 1);

  // Bar height helper (percentage)
  const barH = (v: number) => Math.max((v / maxVal) * 100, 2);

  return (
    <section className="relative rounded-xl border border-white/[0.06] bg-[#0a0a12] p-5 overflow-hidden h-full">
      {/* Lock for REGULAR */}
      {!isVip && (
        <div className="absolute inset-0 z-10 rounded-xl bg-black/75 backdrop-blur-[8px] flex flex-col items-center justify-center gap-2 text-center px-6">
          <p className="text-[12px] font-semibold text-white/50">
            Performance Trends
          </p>
          <p className="text-[11px] text-white/30 max-w-[280px]">
            VIP creators can see how their profile views trend over time.
          </p>
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="mt-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-[11px] font-medium text-purple-300 hover:bg-purple-500/20 transition"
            >
              Unlock with VIP
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-white/80">
          Performance Trends
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <span className="text-[10px] text-white/40">Views</span>
          </div>
          {isVipPlus && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-[10px] text-white/40">Clicks</span>
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart */}
      <div className="flex items-end justify-around gap-4 h-[180px] px-2">
        {PERIODS.map((period, i) => (
          <div key={period} className="flex-1 flex flex-col items-center gap-2">
            {/* Bars */}
            <div className="flex items-end gap-1.5 h-[140px] w-full justify-center">
              {/* Views bar */}
              <div className="flex flex-col items-center gap-1 flex-1 max-w-[40px]">
                <span className="text-[10px] text-white/40 tabular-nums">
                  {viewsData[i].toLocaleString()}
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-purple-600/80 to-purple-400/60 transition-all duration-500"
                  style={{ height: `${barH(viewsData[i])}%` }}
                />
              </div>

              {/* Clicks bar (VIP+ only) */}
              {isVipPlus && (
                <div className="flex flex-col items-center gap-1 flex-1 max-w-[40px]">
                  <span className="text-[10px] text-white/40 tabular-nums">
                    {clicksData[i].toLocaleString()}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-amber-500/70 to-amber-300/50 transition-all duration-500"
                    style={{ height: `${barH(clicksData[i])}%` }}
                  />
                </div>
              )}
            </div>

            {/* Period label */}
            <span className="text-[10px] text-white/30 font-medium">
              {period}
            </span>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
        <div className="text-[11px] text-white/30">
          Month total:{" "}
          <span className="text-white/60 font-medium">
            {analytics.profileViewsMonth.toLocaleString()} views
          </span>
          {isVipPlus && (
            <>
              {" · "}
              <span className="text-amber-300/60 font-medium">
                {analytics.whatsappClicksMonth.toLocaleString()} clicks
              </span>
            </>
          )}
        </div>
        {isVipPlus && analytics.conversionRate !== null && (
          <span className="text-[11px] text-amber-300/70 font-medium">
            CTR: {analytics.conversionRate.toFixed(1)}%
          </span>
        )}
      </div>
    </section>
  );
}
