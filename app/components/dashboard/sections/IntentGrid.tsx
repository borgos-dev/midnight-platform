// app/components/dashboard/sections/IntentGrid.tsx
"use client";

import Link from "next/link";
import { AccessLevel } from "@prisma/client";
import { Lock, Check, Circle as CircleIcon, ArrowRight } from "lucide-react";
import type {
  AnalyticsPayload,
  SetupStatus,
} from "@/app/dashboard/DashboardShell";
import type { TIER_TOKENS } from "@/app/dashboard/DashboardShell";

type Tokens = typeof TIER_TOKENS[AccessLevel];

type IntentGridProps = {
  tier: AccessLevel;
  analytics: AnalyticsPayload;
  tokens: Tokens;
  setupStatus: SetupStatus;
  onUpgradeClick?: () => void;
};

function Sparkline({
  data,
  color,
}: {
  data: number[];
  color: string;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 48;
  const h = 20;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 3) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const isUp = data[data.length - 1] >= data[0];

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: "block" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? color : "#E8547A"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

function StatCard({
  label,
  value,
  sub,
  subColor,
  locked,
  lockTier,
  accent,
  accentSoft,
  border,
  borderStrong,
  surface,
  textMuted,
  textDim,
  sparklineData,
  onUpgradeClick,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  locked: boolean;
  lockTier?: string;
  accent: string;
  accentSoft: string;
  border: string;
  borderStrong: string;
  surface: string;
  textMuted: string;
  textDim: string;
  sparklineData?: number[];
  onUpgradeClick?: () => void;
}) {
  return (
    <div style={{
      padding: "16px",
      borderRadius: "14px",
      border: `0.5px solid ${locked ? border : borderStrong}`,
      background: surface,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top accent line for unlocked cards */}
      {!locked && sparklineData && (
        <div style={{
          position: "absolute", top: 0,
          left: 0, right: 0, height: "1px",
          background: `linear-gradient(90deg, transparent, ${accent}66, transparent)`,
        }} />
      )}

      {/* Lock overlay */}
      {locked && (
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "14px",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          zIndex: 2,
        }}>
          <Lock size={20} style={{ color: textDim }} />
          <span style={{
            fontSize: "9px",
            fontFamily: "var(--font-dm-mono)",
            color: textDim,
            letterSpacing: "0.08em",
          }}>{lockTier} ONLY</span>
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              style={{
                marginTop: "4px",
                fontSize: "9px",
                fontFamily: "var(--font-dm-mono)",
                color: accent,
                background: accentSoft,
                border: `0.5px solid ${accent}44`,
                borderRadius: "6px",
                padding: "4px 10px",
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
            >UNLOCK →</button>
          )}
        </div>
      )}

      {/* Label + sparkline */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "10px",
      }}>
        <div style={{
          fontSize: "10px",
          fontFamily: "var(--font-dm-mono)",
          color: locked ? textDim : textMuted,
          letterSpacing: "0.07em",
        }}>{label}</div>
        {!locked && sparklineData && (
          <Sparkline data={sparklineData} color={accent} />
        )}
      </div>

      {/* Value */}
      <div style={{
        fontSize: "28px",
        fontWeight: 500,
        color: locked ? textDim : accent,
        fontFamily: "var(--font-cormorant)",
        letterSpacing: "-0.02em",
        lineHeight: 1,
        marginBottom: "6px",
      }}>{locked ? "---" : value}</div>

      {/* Sub label */}
      {sub && !locked && (
        <div style={{
          fontSize: "10px",
          color: subColor ?? textMuted,
          fontFamily: "var(--font-dm-sans)",
        }}>{sub}</div>
      )}
    </div>
  );
}

/**
 * Empty-state replacement for the Conversion Rate card. Renders only while
 * the creator still has at least one incomplete setup step; once all four
 * flip true the normal KPI tile returns. Designed to occupy the same grid
 * slot (same border, surface, padding) so the row visually stays put.
 *
 * Why this tile exists: a brand-new VIP+ creator who's just paid 30,000
 * CFA lands on a dashboard of zeros and risks immediate buyer's remorse.
 * Giving them four concrete actions (and a progress count) reframes the
 * empty state from "nothing happening" to "here's how to get started."
 */
function SetupChecklistCard({
  setupStatus,
  accent,
  border,
  borderStrong,
  surface,
  textMuted,
  textDim,
}: {
  setupStatus: SetupStatus;
  accent: string;
  border: string;
  borderStrong: string;
  surface: string;
  textMuted: string;
  textDim: string;
}) {
  const items: { label: string; done: boolean; href: string }[] = [
    {
      label: "Add profile photo",
      done: setupStatus.hasAvatar,
      href: "/dashboard/profile",
    },
    {
      label: "Add WhatsApp number",
      done: setupStatus.hasWhatsApp,
      href: "/dashboard/profile",
    },
    {
      label: "Write a short bio",
      done: setupStatus.hasBio,
      href: "/dashboard/profile",
    },
    {
      label: "Upload first post",
      done: setupStatus.hasFirstPost,
      href: "/dashboard/media",
    },
  ];
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "14px",
        border: `0.5px solid ${borderStrong}`,
        background: surface,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top accent line — same treatment as unlocked StatCards so the
          checklist visually belongs to the row instead of looking grafted on. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: `linear-gradient(90deg, transparent, ${accent}66, transparent)`,
        }}
      />

      {/* Header — label + progress count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-dm-mono)",
            color: textMuted,
            letterSpacing: "0.07em",
          }}
        >
          PROFILE SETUP
        </div>
        <div
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-dm-mono)",
            color: accent,
            letterSpacing: "0.07em",
          }}
        >
          {doneCount}/{total}
        </div>
      </div>

      {/* Checklist rows — done items render in muted strikethrough so the
          eye lands on what's left to do, not what's already done. */}
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {items.map((item) => (
          <li key={item.label}>
            {item.done ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "11px",
                  fontFamily: "var(--font-dm-sans)",
                  color: textDim,
                  textDecoration: "line-through",
                  textDecorationColor: `${textDim}88`,
                }}
              >
                <Check
                  size={12}
                  strokeWidth={2.4}
                  style={{ color: accent, flexShrink: 0 }}
                />
                <span>{item.label}</span>
              </div>
            ) : (
              <Link
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "11px",
                  fontFamily: "var(--font-dm-sans)",
                  color: "rgba(255,255,255,0.78)",
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                }}
              >
                <CircleIcon
                  size={12}
                  strokeWidth={2}
                  style={{ color: textMuted, flexShrink: 0 }}
                />
                <span style={{ flex: 1 }}>{item.label}</span>
                <ArrowRight
                  size={11}
                  strokeWidth={2.2}
                  style={{ color: accent, opacity: 0.7 }}
                />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IntentGrid({
  tier,
  analytics,
  tokens,
  setupStatus,
  onUpgradeClick,
}: IntentGridProps) {
  const isVip = tier === "VIP" || tier === "VIP_PLUS";
  const isVipPlus = tier === "VIP_PLUS";
  // Premium is the first paid tier — it unlocks the WhatsApp clicks tile so
  // the upgrade from Regular has an immediately visible benefit. Conversion
  // rate, the 30-day chart, and the live activity feed stay VIP+ only —
  // those are the higher-tier reasons to keep climbing.
  const hasClicksAccess = tier === "PREMIUM" || isVip;

  const {
    viewsToday,
    viewsWeek,
    viewsMonth,
    clicksToday,
    clicksWeek,
    clicksMonth,
    conversionRate,
    cityRank,
  } = analytics;

  // Sparkline data from real values
  const viewsSparkline = [
    viewsToday,
    Math.round(viewsWeek / 4),
    Math.round(viewsWeek / 2),
    viewsWeek,
    viewsMonth,
  ];

  const clicksSparkline = [
    clicksToday,
    Math.round(clicksWeek / 4),
    Math.round(clicksWeek / 2),
    clicksWeek,
    clicksMonth,
  ];

  // Conversion context
  const ctrContext =
    conversionRate === null
      ? null
      : conversionRate >= 15
      ? "Above average ✦"
      : conversionRate >= 8
      ? "Average — room to grow"
      : "Below average";

  const ctrColor =
    conversionRate === null
      ? tokens.textMuted
      : conversionRate >= 15
      ? "#5CB88A"
      : conversionRate >= 8
      ? tokens.accent
      : "#E8547A";

  // Setup-checklist swap trigger. Any incomplete step means the new
  // creator gets the actionable checklist tile in place of the conversion-
  // rate KPI; once they finish all four the normal KPI returns. We don't
  // gate this on tier — even a Regular creator benefits from seeing the
  // setup items (their slot 3 was just a locked tile anyway).
  const setupIncomplete =
    !setupStatus.hasAvatar ||
    !setupStatus.hasWhatsApp ||
    !setupStatus.hasBio ||
    !setupStatus.hasFirstPost;

  return (
    <section>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "10px",
      }}>
        {/* Card 1 — Profile Views (all tiers) */}
        <StatCard
          label="PROFILE VIEWS"
          value={viewsWeek.toLocaleString()}
          sub={`+${viewsMonth.toLocaleString()} this month`}
          subColor={tokens.textMuted}
          locked={false}
          accent={tokens.accent}
          accentSoft={tokens.accentSoft}
          border={tokens.border}
          borderStrong={tokens.borderStrong}
          surface={tokens.surface}
          textMuted={tokens.textMuted}
          textDim={tokens.textDim}
          sparklineData={viewsSparkline}
        />

        {/* Card 2 — WhatsApp Clicks (Premium+).
            Previously gated to VIP+; opened to Premium so the Regular →
            Premium upgrade has a visible analytics benefit. The lock
            label shows "Premium" so a Regular creator sees the right
            upgrade target, not "VIP". */}
        <StatCard
          label="WA CLICKS"
          value={clicksWeek.toLocaleString()}
          sub={`+${clicksMonth} this month`}
          subColor="#5CB88A"
          locked={!hasClicksAccess}
          lockTier="Premium"
          accent={tokens.accent}
          accentSoft={tokens.accentSoft}
          border={tokens.border}
          borderStrong={tokens.borderStrong}
          surface={tokens.surface}
          textMuted={tokens.textMuted}
          textDim={tokens.textDim}
          sparklineData={hasClicksAccess ? clicksSparkline : undefined}
          onUpgradeClick={onUpgradeClick}
        />

        {/* Card 3 — Conversion Rate, OR Setup Checklist while the creator
            still has incomplete profile work. The checklist takes priority
            over the KPI because a brand-new VIP+ creator landing on four
            zeros without guidance is a real churn moment — see the empty-
            state notes on SetupChecklistCard above. */}
        {setupIncomplete ? (
          <SetupChecklistCard
            setupStatus={setupStatus}
            accent={tokens.accent}
            border={tokens.border}
            borderStrong={tokens.borderStrong}
            surface={tokens.surface}
            textMuted={tokens.textMuted}
            textDim={tokens.textDim}
          />
        ) : (
          <StatCard
            label="CONVERSION RATE"
            value={
              conversionRate !== null
                ? `${conversionRate.toFixed(1)}%`
                : "—"
            }
            sub={ctrContext ?? undefined}
            subColor={ctrColor}
            locked={!isVipPlus}
            lockTier="VIP+"
            accent={tokens.accent}
            accentSoft={tokens.accentSoft}
            border={tokens.border}
            borderStrong={tokens.borderStrong}
            surface={tokens.surface}
            textMuted={tokens.textMuted}
            textDim={tokens.textDim}
            onUpgradeClick={onUpgradeClick}
          />
        )}

        {/* Card 4 — City Rank (VIP+ only) */}
        <StatCard
          label="CITY RANK"
          value={cityRank !== null ? `#${cityRank}` : "—"}
          sub={
            // Was "Top creator in 3 in your city" — grammar bug. The
            // numeric rank already shows in the value above; here we
            // surface the qualitative position.
            cityRank !== null
              ? cityRank === 1
                ? "Top creator in your city"
                : cityRank <= 3
                  ? `Top ${cityRank} in your city`
                  : `Ranked #${cityRank} in your city`
              : "Not enough data yet"
          }
          subColor={tokens.textMuted}
          locked={!isVipPlus}
          lockTier="VIP+"
          accent={tokens.accent}
          accentSoft={tokens.accentSoft}
          border={tokens.border}
          borderStrong={tokens.borderStrong}
          surface={tokens.surface}
          textMuted={tokens.textMuted}
          textDim={tokens.textDim}
          onUpgradeClick={onUpgradeClick}
        />
      </div>
    </section>
  );
}