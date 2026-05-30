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
    <header className="mn-dash-header" style={{
      padding: "16px 20px",
      borderRadius: "14px",
      border: `1px solid ${tokens.borderStrong}`,
      background: tokens.surface,
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        /* 3-row stack on mobile:
           Row 1 — identity (avatar + name + tier + city), full width
           Row 2 — score strip, full width
           Row 3 — bell + action buttons, full width
           Tablet+: single horizontal row */
        .mn-dash-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        @media (min-width: 640px) {
          .mn-dash-header {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            flex-wrap: nowrap;
            gap: 16px;
          }
        }
        /* Row 1: avatar + text block */
        .mn-dash-header-top {
          display: flex;
          align-items: center;
          gap: 0;
          width: 100%;
        }
        .mn-dash-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }
        /* Row 2: score — horizontal compact strip */
        .mn-dash-header-score {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 10px;
          width: 100%;
          box-sizing: border-box;
        }
        .mn-dash-header-score-label {
          font-family: var(--font-dm-mono);
          font-size: 9px;
          letter-spacing: 0.08em;
          opacity: 0.7;
        }
        .mn-dash-header-score-value {
          font-family: var(--font-cormorant);
          font-size: 22px;
          font-weight: 700;
          line-height: 1;
        }
        @media (min-width: 640px) {
          .mn-dash-header-score {
            width: auto;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 10px 16px;
          }
        }
        /* Row 3: bell (compact) + text buttons (grow equally) */
        .mn-dash-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }
        .mn-dash-header-actions a {
          flex: 1;
          text-align: center;
          justify-content: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          font-size: 10px !important;
          padding: 8px 6px !important;
        }
        /* Bell stays icon-sized */
        .mn-dash-header-actions button {
          flex: none;
        }
        @media (min-width: 640px) {
          .mn-dash-header-actions {
            width: auto;
          }
          .mn-dash-header-actions a {
            flex: none;
          }
        }
      `}</style>
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

      {/* Top row: identity (left) + score (right) on mobile */}
      <div className="mn-dash-header-top">
      {/* Left — Identity */}
      <div className="mn-dash-header-left">
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
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            display: "flex", alignItems: "center",
            flexWrap: "wrap",
            gap: "8px", marginBottom: "4px",
          }}>
            <h1 style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: isVipPlus ? "20px" : "17px",
              fontWeight: 700,
              color: tokens.text,
              letterSpacing: "-0.01em",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
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

      {/* close mn-dash-header-top */}
      </div>

      {/* Row 2 — Score strip (full width, horizontal on mobile) */}
      <div className="mn-dash-header-score" style={{
        border: `0.5px solid ${tokens.border}`,
        background: tokens.surfaceAlt,
      }}>
        <span className="mn-dash-header-score-label" style={{ color: tokens.textMuted }}>
          SCORE DE VISIBILITÉ
        </span>
        <span className="mn-dash-header-score-value" style={{ color: tokens.accent }}>
          {visibilityScore}
          <span style={{ fontSize: "12px", color: tokens.textMuted }}>/100</span>
        </span>
        {isVipPlus && (
          <span style={{
            fontSize: "9px",
            fontFamily: "var(--font-dm-mono)",
            color: "#5CB88A",
            letterSpacing: "0.06em",
          }}>TOP 5% À {(location ?? "VOTRE VILLE").toUpperCase()}</span>
        )}
      </div>

      {/* Right — Actions */}
      <div className="mn-dash-header-actions">
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
        >VOIR MON PROFIL</Link>

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
            {tier === "REGULAR" ? "PASSER EN VIP" : "PASSER EN VIP+"} →
          </button>
        )}
      </div>
    </header>
  );
}