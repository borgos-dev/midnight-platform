// app/components/dashboard/sections/PerformanceChart.tsx
"use client";

import { AccessLevel } from "@prisma/client";
import { Lock, BarChart3 } from "lucide-react";
import type { AnalyticsPayload } from "@/app/dashboard/DashboardShell";
import type { TIER_TOKENS } from "@/app/dashboard/DashboardShell";

type Tokens = typeof TIER_TOKENS[AccessLevel];

type PerformanceChartProps = {
  tier: AccessLevel;
  analytics: AnalyticsPayload;
  tokens: Tokens;
  onUpgradeClick?: () => void;
};

function GridLines({ color }: { color: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      justifyContent: "space-between",
      pointerEvents: "none",
    }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          height: "0.5px",
          background: color,
          width: "100%",
          opacity: 0.4,
        }} />
      ))}
    </div>
  );
}

export function PerformanceChart({
  tier,
  analytics,
  tokens,
  onUpgradeClick,
}: PerformanceChartProps) {
  const isVip = tier === "VIP" || tier === "VIP_PLUS";
  const isVipPlus = tier === "VIP_PLUS";

  const {
    viewsToday,
    viewsWeek,
    viewsMonth,
    dailyViews,
    dailyClicks,
    totalTrendEvents,
  } = analytics;

  // Real per-day buckets, oldest-first. Empty/short arrays trigger the
  // honest empty state below — we no longer fabricate bars from aggregates.
  const viewBars = dailyViews ?? [];
  const clickBars = isVip ? (dailyClicks ?? []) : [];

  // Show an honest empty state until we have at least a few real events.
  // Same threshold as calculateBestDayAndTime so the dashboard reads as
  // coherent ("we have enough data" decisions are made once).
  const hasEnoughData = totalTrendEvents >= 5 && viewBars.length > 0;

  const maxVal = Math.max(
    ...viewBars,
    ...(isVip ? clickBars : []),
    1
  );

  const barH = (v: number) =>
    Math.max((v / maxVal) * 100, 3);

  // Trend direction — compare first half vs second half of the real window.
  const half = Math.floor(viewBars.length / 2);
  const firstHalf = viewBars.slice(0, half).reduce((a, b) => a + b, 0);
  const secondHalf = viewBars.slice(half).reduce((a, b) => a + b, 0);
  const isGrowing = secondHalf >= firstHalf;

  const PERIODS = ["Today", "This Week", "This Month"];
  const periodValues = [
    viewsToday,
    viewsWeek,
    viewsMonth,
  ];

  return (
    <div style={{
      padding: "18px",
      borderRadius: "14px",
      border: `0.5px solid ${tokens.borderStrong}`,
      background: tokens.surface,
      position: "relative",
      overflow: "hidden",
      height: "100%",
    }}>
      {/* Lock overlay for Regular */}
      {!isVip && (
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "14px",
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          zIndex: 10,
        }}>
          <Lock size={26} style={{ color: tokens.textMuted }} />
          <p style={{
            fontSize: "12px",
            fontFamily: "var(--font-dm-mono)",
            color: tokens.textMuted,
            letterSpacing: "0.06em",
            textAlign: "center",
          }}>VIP creators see their<br />30-day performance trends</p>
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              style={{
                marginTop: "4px",
                padding: "8px 20px",
                borderRadius: "8px",
                border: `0.5px solid ${tokens.accent}44`,
                background: tokens.accentSoft,
                color: tokens.accent,
                fontSize: "11px",
                fontFamily: "var(--font-dm-mono)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >UNLOCK WITH VIP →</button>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "16px",
      }}>
        <div>
          <div style={{
            fontSize: "10px",
            fontFamily: "var(--font-dm-mono)",
            color: tokens.textMuted,
            letterSpacing: "0.08em",
            marginBottom: "4px",
          }}>30-DAY PERFORMANCE</div>
          <div style={{
            fontSize: "11px",
            fontFamily: "var(--font-dm-mono)",
            color: hasEnoughData
              ? (isGrowing ? "#5CB88A" : "#E8547A")
              : tokens.textDim,
          }}>
            {hasEnoughData
              ? `${isGrowing ? "↑ Growing" : "↓ Declining"} trend`
              : "Building up history…"}
          </div>
        </div>

        {/* Legend */}
        <div style={{
          display: "flex", gap: "14px",
          alignItems: "center",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "5px",
          }}>
            <div style={{
              width: "8px", height: "8px",
              borderRadius: "2px",
              background: tokens.accent,
              opacity: 0.8,
            }} />
            <span style={{
              fontSize: "9px",
              fontFamily: "var(--font-dm-mono)",
              color: tokens.textMuted,
              letterSpacing: "0.06em",
            }}>Views</span>
          </div>
          {isVip && (
            <div style={{
              display: "flex", alignItems: "center", gap: "5px",
            }}>
              <div style={{
                width: "8px", height: "8px",
                borderRadius: "2px",
                background: "#5CB88A",
                opacity: 0.8,
              }} />
              <span style={{
                fontSize: "9px",
                fontFamily: "var(--font-dm-mono)",
                color: tokens.textMuted,
                letterSpacing: "0.06em",
              }}>WA Clicks</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart — only render real bars when we have enough events. */}
      {hasEnoughData ? (
        <>
          <div style={{ position: "relative", marginBottom: "10px" }}>
            <GridLines color={tokens.surfaceAlt} />
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "4px",
              height: "120px",
              padding: "0 2px",
              position: "relative",
              zIndex: 1,
            }}>
              {viewBars.map((v, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                    height: "100%",
                    justifyContent: "flex-end",
                  }}
                >
                  {/* Views bar */}
                  <div style={{
                    width: isVip ? "45%" : "70%",
                    height: `${barH(v)}%`,
                    borderRadius: "2px 2px 0 0",
                    background: tokens.accent,
                    opacity: 0.5 + (i / viewBars.length) * 0.5,
                    transition: "height 0.5s ease",
                  }} />

                  {/* Clicks bar */}
                  {isVip && clickBars[i] !== undefined && (
                    <div style={{
                      position: "absolute",
                      bottom: 0,
                      width: "45%",
                      marginLeft: "50%",
                      height: `${barH(clickBars[i])}%`,
                      borderRadius: "2px 2px 0 0",
                      background: "#5CB88A",
                      opacity: 0.4 + (i / clickBars.length) * 0.4,
                      transition: "height 0.5s ease",
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* X axis labels */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}>
            <span style={{
              fontSize: "9px",
              fontFamily: "var(--font-dm-mono)",
              color: tokens.textDim,
            }}>30 days ago</span>
            <span style={{
              fontSize: "9px",
              fontFamily: "var(--font-dm-mono)",
              color: tokens.accent,
              opacity: 0.7,
            }}>today {isGrowing ? "↑" : "↓"}</span>
          </div>
        </>
      ) : (
        // Honest empty state: no fabricated bars. Replaces the previous
        // sine-wave fill, which made every chart look like a real trend
        // even when zero events had been recorded.
        <div style={{
          height: "120px",
          marginBottom: "16px",
          borderRadius: "10px",
          border: `0.5px dashed ${tokens.border}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: "12px",
          textAlign: "center",
        }}>
          <BarChart3 size={22} style={{ color: tokens.textMuted, opacity: 0.6 }} />
          <p style={{
            fontSize: "11px",
            fontFamily: "var(--font-dm-mono)",
            color: tokens.textMuted,
            letterSpacing: "0.04em",
            lineHeight: 1.5,
            margin: 0,
            maxWidth: "260px",
          }}>
            Your daily trend appears here once you have a few days of activity.
          </p>
        </div>
      )}

      {/* Period summary */}
      <div style={{
        display: "flex",
        gap: "8px",
        paddingTop: "12px",
        borderTop: `0.5px solid ${tokens.border}`,
      }}>
        {PERIODS.map((period, i) => (
          <div
            key={period}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: "8px",
              background: tokens.surfaceAlt,
              border: `0.5px solid ${tokens.border}`,
              textAlign: "center",
            }}
          >
            <div style={{
              fontSize: "9px",
              fontFamily: "var(--font-dm-mono)",
              color: tokens.textDim,
              letterSpacing: "0.06em",
              marginBottom: "4px",
            }}>{period.toUpperCase()}</div>
            <div style={{
              fontSize: "16px",
              fontFamily: "var(--font-cormorant)",
              fontWeight: 500,
              color: tokens.accent,
              lineHeight: 1,
            }}>
              {periodValues[i].toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}