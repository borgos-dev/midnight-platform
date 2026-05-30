// app/components/dashboard/DashboardHeader.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { AccessLevel } from "@prisma/client";
import { Crown, MapPin } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import type { TIER_TOKENS } from "@/app/dashboard/DashboardShell";
import type { AnalyticsPayload } from "@/app/dashboard/DashboardShell";

type Tokens = typeof TIER_TOKENS[AccessLevel];

type DashboardHeaderProps = {
  avatarUrl: string | null;
  name: string;
  location: string | null;
  tier: AccessLevel;
  creatorId: number;
  tokens: Tokens;
  analytics: AnalyticsPayload;
  onUpgradeClick?: () => void;
};

export function DashboardHeader({
  avatarUrl,
  name,
  location,
  tier,
  creatorId,
  tokens,
  analytics,
  onUpgradeClick,
}: DashboardHeaderProps) {
  const isVip = tier === "VIP" || tier === "VIP_PLUS";
  const isVipPlus = tier === "VIP_PLUS";
  const showUpgrade = tier !== "VIP_PLUS";

  // Visibility score calculation
  const visibilityScore = isVipPlus
    ? Math.min(
        Math.round(
          20 +
          Math.min(analytics.viewsMonth / 50, 40) +
          Math.min(analytics.clicksMonth * 2, 30) +
          (analytics.conversionRate ? Math.min(analytics.conversionRate, 10) : 0)
        ),
        100
      )
    : isVip
    ? Math.min(
        Math.round(
          10 +
          Math.min(analytics.viewsMonth / 80, 30) +
          Math.min(analytics.clicksMonth * 1.5, 20)
        ),
        70
      )
    : Math.min(
        Math.round(5 + Math.min(analytics.viewsMonth / 100, 20)),
        30
      );

  return (
    <header style={{
      padding: "16px 20px",
      borderRadius: "14px",
      border: `1px solid ${tokens.borderStrong}`,
      background: tokens.surface,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* VIP+ top accent line */}
      {isVipPlus && (
        <div style={{
          position: "absolute", top: 0,
          left: "10%", right: "10%", height: "1px",
          background: `linear-gradient(90deg, transparent, ${tokens.accent}, transparent)`,
        }} />
      )}

      {/* VIP subtle top line */}
      {isVip && !isVipPlus && (
        <div style={{
          position: "absolute", top: 0,
          left: "20%", right: "20%", height: "1px",
          background: `linear-gradient(90deg, transparent, ${tokens.accent}88, transparent)`,
        }} />
      )}

      {/* Left — Identity */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: isVipPlus ? "50px" : "44px",
            height: isVipPlus ? "50px" : "44px",
            borderRadius: "50%",
            overflow: "hidden",
            border: `2px solid ${tokens.accent}`,
            background: tokens.surfaceAlt,
            display: "flex", alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name}
                width={50}
                height={50}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <span style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: isVipPlus ? "22px" : "18px",
                fontWeight: 700,
                color: tokens.accent,
              }}>
                {name?.charAt(0)?.toUpperCase() ?? "M"}
              </span>
            )}
          </div>

          {/* VIP+ crown dot */}
          {isVipPlus && (
            <div style={{
              position: "absolute", bottom: "-1px", right: "-1px",
              width: "16px", height: "16px", borderRadius: "50%",
              background: tokens.accent,
              border: `2px solid ${tokens.bg}`,
              display: "flex", alignItems: "center",
              justifyContent: "center",
              color: "#1a1000",
            }}>
              <Crown size={9} strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Name + tier */}
        <div>
          <div style={{
            display: "flex", alignItems: "center",
            gap: "8px", marginBottom: "4px",
          }}>
            <h1 style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: isVipPlus ? "20px" : "17px",
              fontWeight: 700,
              color: tokens.text,
              letterSpacing: "-0.01em",
              margin: 0,
            }}>{name}</h1>

            {/* Tier badge */}
            <span style={{
              fontSize: "10px", padding: "2px 9px",
              borderRadius: "20px",
              fontFamily: "var(--font-dm-mono)",
              fontWeight: 700, letterSpacing: "0.07em",
              background: tokens.badge.bg,
              border: `0.5px solid ${tokens.badge.border}`,
              color: tokens.badge.color,
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}>
              <tokens.icon size={10} />
              {tokens.label}
            </span>
          </div>

          <div style={{
            display: "flex", alignItems: "center",
            gap: "10px",
          }}>
            {location && (
              <span style={{
                fontSize: "11px",
                fontFamily: "var(--font-dm-mono)",
                color: tokens.textMuted,
                letterSpacing: "0.04em",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}>
                <MapPin size={11} />
                {location}
              </span>
            )}

            {/* City rank inline for VIP+ */}
            {isVipPlus && analytics.cityRank !== null && (
              <span style={{
                fontSize: "10px",
                fontFamily: "var(--font-dm-mono)",
                color: "#5CB88A",
                letterSpacing: "0.06em",
              }}>
                #{analytics.cityRank} in city
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center — Visibility score */}
      <div style={{
        textAlign: "center",
        padding: "10px 20px",
        borderRadius: "10px",
        border: `0.5px solid ${tokens.border}`,
        background: tokens.surfaceAlt,
      }}>
        <div style={{
          fontSize: "10px",
          fontFamily: "var(--font-dm-mono)",
          color: tokens.textMuted,
          letterSpacing: "0.08em",
          marginBottom: "4px",
        }}>VISIBILITY SCORE</div>
        <div style={{
          fontSize: "26px",
          fontWeight: 500,
          color: tokens.accent,
          lineHeight: 1,
          fontFamily: "var(--font-cormorant)",
        }}>
          {visibilityScore}
          <span style={{
            fontSize: "13px",
            color: tokens.textMuted,
          }}>/100</span>
        </div>
        {isVipPlus && (
          <div style={{
            fontSize: "9px",
            fontFamily: "var(--font-dm-mono)",
            color: "#5CB88A",
            letterSpacing: "0.06em",
            marginTop: "3px",
          }}>TOP 5% IN {(location ?? "YOUR CITY").toUpperCase()}</div>
        )}
      </div>

      {/* Right — Actions */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: "10px", flexShrink: 0,
      }}>
        {/* Notification bell */}
        <NotificationBell creatorId={creatorId} tokens={tokens} />

        {/* View profile */}
        <Link
          href={`/creator/${creatorId}`}
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-dm-mono)",
            color: tokens.textMuted,
            textDecoration: "none",
            padding: "8px 14px",
            borderRadius: "8px",
            border: `0.5px solid ${tokens.border}`,
            background: tokens.surfaceAlt,
            letterSpacing: "0.06em",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = tokens.text;
            (e.currentTarget as HTMLElement).style.borderColor = tokens.accent;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = tokens.textMuted;
            (e.currentTarget as HTMLElement).style.borderColor = tokens.border;
          }}
        >VIEW PROFILE</Link>

        {/* Upgrade button */}
        {showUpgrade && (
          <button
            onClick={onUpgradeClick}
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-dm-mono)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              padding: "8px 16px",
              borderRadius: "8px",
              border: `0.5px solid ${tokens.accent}88`,
              background: tokens.accentSoft,
              color: tokens.accent,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = tokens.accentSoft.replace("0.15", "0.25");
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = tokens.accentSoft;
            }}
          >
            {tier === "REGULAR" ? "UPGRADE TO VIP" : "UPGRADE TO VIP+"} →
          </button>
        )}
      </div>
    </header>
  );
}