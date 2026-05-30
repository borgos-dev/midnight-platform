// app/components/dashboard/sections/LinkPerformance.tsx
"use client";

import { AccessLevel } from "@prisma/client";
import { ExternalLink, Lock } from "lucide-react";
import type { ExternalLinkKind } from "@prisma/client";
import { EXTERNAL_LINK_KIND_META } from "@/app/lib/external-link-kinds";
import type { TIER_TOKENS } from "@/app/dashboard/DashboardShell";

type Tokens = typeof TIER_TOKENS[AccessLevel];

export type LinkPerformanceRow = {
  id: number;
  kind: ExternalLinkKind;
  /** Rolling-30-day click count from AnalyticsEvent. */
  clicks: number;
};

type Props = {
  tier: AccessLevel;
  rows: LinkPerformanceRow[];
  tokens: Tokens;
  onUpgradeClick?: () => void;
};

/**
 * VIP+ panel showing per-link click counts for the creator's external
 * profile links (Instagram, OnlyFans, Telegram, etc.) over the rolling
 * 30-day window.
 *
 * Closes the loop on the external-links feature: creators add links →
 * visitors click them → server records `external_link_click` events with
 * `source: "link:<id>:..."` → this panel surfaces the per-link totals so
 * a VIP+ creator can see which channel is actually driving traffic.
 *
 * Empty states:
 *   - No links at all → an empty-state CTA pointing to /dashboard/profile
 *     where the editor lives.
 *   - Links exist but zero clicks → renders the rows with `0` so the
 *     creator can compare which kinds tend to drive engagement vs not.
 *
 * Lock state:
 *   - Renders for VIP+ only. Lower tiers see a locked card with a tier
 *     upgrade nudge, matching the pattern used by the rest of the
 *     dashboard's tier-gated sections.
 */
export function LinkPerformance({ tier, rows, tokens, onUpgradeClick }: Props) {
  const isVipPlus = tier === "VIP_PLUS";

  if (!isVipPlus) {
    return (
      <section
        style={{
          padding: "18px",
          borderRadius: "14px",
          border: `0.5px solid ${tokens.borderStrong}`,
          background: tokens.surface,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <Lock size={14} style={{ color: tokens.textMuted }} />
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-dm-mono)",
                  color: tokens.textMuted,
                  letterSpacing: "0.08em",
                }}
              >
                LINK PERFORMANCE · VIP+ ONLY
              </div>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: tokens.textMuted,
                fontFamily: "var(--font-dm-sans)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              See which of your external links visitors actually click —
              Instagram, OnlyFans, Telegram, all broken down by channel.
              Unlocks at VIP+.
            </p>
          </div>
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: `0.5px solid ${tokens.accent}66`,
                background: tokens.accentSoft,
                color: tokens.accent,
                fontSize: "11px",
                fontFamily: "var(--font-dm-mono)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              UPGRADE →
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        padding: "18px",
        borderRadius: "14px",
        border: `0.5px solid ${tokens.borderStrong}`,
        background: tokens.surface,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        <ExternalLink size={14} style={{ color: tokens.accent }} />
        <div>
          <div
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-dm-mono)",
              color: tokens.accent,
              letterSpacing: "0.08em",
              marginBottom: "2px",
            }}
          >
            LINK PERFORMANCE · 30 DAYS
          </div>
          <div
            style={{
              fontSize: "12px",
              color: tokens.textMuted,
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            Clicks per external link in the rolling window
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            borderRadius: "10px",
            border: `1px dashed ${tokens.border}`,
            background: tokens.surfaceAlt,
          }}
        >
          <p
            style={{
              fontSize: "12.5px",
              color: tokens.textMuted,
              fontFamily: "var(--font-dm-sans)",
              margin: "0 0 8px",
            }}
          >
            You haven&apos;t added any external links yet.
          </p>
          <a
            href="/dashboard/profile"
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-dm-mono)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: tokens.accent,
              textDecoration: "none",
            }}
          >
            ADD LINKS →
          </a>
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {rows.map((row) => {
            const meta = EXTERNAL_LINK_KIND_META[row.kind];
            const Icon = meta.icon;
            return (
              <li
                key={row.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: `0.5px solid ${tokens.border}`,
                  background: tokens.surfaceAlt,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: `${meta.accent}22`,
                    color: meta.accent,
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  <Icon size={14} strokeWidth={2.2} />
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: "13px",
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 600,
                    color: tokens.text,
                  }}
                >
                  {meta.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontSize: "20px",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: tokens.accent,
                  }}
                >
                  {row.clicks.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
