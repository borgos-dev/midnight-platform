// app/components/dashboard/sections/UpgradeIntelligence.tsx
"use client";

import { AccessLevel } from "@prisma/client";
import {
  Crown,
  Calendar,
  Clock,
  MessageCircle,
  Eye,
  Lightbulb,
  Zap,
  Rocket,
  Check,
  Circle,
  type LucideIcon,
} from "lucide-react";
import type { AnalyticsPayload } from "@/app/dashboard/DashboardShell";
import type { TIER_TOKENS } from "@/app/dashboard/DashboardShell";

type Tokens = typeof TIER_TOKENS[AccessLevel];

type UpgradeIntelligenceProps = {
  tier: AccessLevel;
  analytics?: AnalyticsPayload;
  tokens: Tokens;
  onUpgradeClick?: () => void;
};

function InsightCard({
  label,
  value,
  Icon,
  tokens,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
  tokens: Tokens;
}) {
  return (
    <div style={{
      padding: "14px",
      borderRadius: "10px",
      border: `0.5px solid ${tokens.borderStrong}`,
      background: tokens.surfaceAlt,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "8px",
      }}>
        <Icon size={13} style={{ color: tokens.accent }} />
        <span style={{
          fontSize: "9px",
          fontFamily: "var(--font-dm-mono)",
          color: tokens.textMuted,
          letterSpacing: "0.08em",
        }}>{label}</span>
      </div>
      <div style={{
        fontSize: "16px",
        fontFamily: "var(--font-cormorant)",
        fontWeight: 500,
        color: tokens.accent,
        letterSpacing: "-0.01em",
      }}>{value}</div>
    </div>
  );
}

function FeatureRow({
  label,
  locked,
  tokens,
}: {
  label: string;
  locked: boolean;
  tokens: Tokens;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "12px",
      color: locked ? tokens.textDim : tokens.textMuted,
      fontFamily: "var(--font-dm-sans)",
    }}>
      {locked ? (
        <Circle size={10} style={{ color: tokens.textDim, flexShrink: 0 }} />
      ) : (
        <Check
          size={12}
          strokeWidth={2.5}
          style={{ color: tokens.accent, flexShrink: 0 }}
        />
      )}
      {label}
    </div>
  );
}

export function UpgradeIntelligence({
  tier,
  analytics,
  tokens,
  onUpgradeClick,
}: UpgradeIntelligenceProps) {

  // ── VIP+ — Elite insights ──
  if (tier === "VIP_PLUS" && analytics) {
    return (
      <section style={{
        padding: "18px",
        borderRadius: "14px",
        border: `0.5px solid ${tokens.borderStrong}`,
        background: tokens.surface,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Top accent */}
        <div style={{
          position: "absolute", top: 0,
          left: "10%", right: "10%", height: "1px",
          background: `linear-gradient(90deg, transparent, ${tokens.accent}, transparent)`,
        }} />

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
        }}>
          <Crown size={16} style={{ color: tokens.accent, flexShrink: 0 }} />
          <div>
            <div style={{
              fontSize: "10px",
              fontFamily: "var(--font-dm-mono)",
              color: tokens.accent,
              letterSpacing: "0.08em",
              marginBottom: "2px",
            }}>ELITE CREATOR INSIGHTS</div>
            <div style={{
              fontSize: "12px",
              color: tokens.textMuted,
              fontFamily: "var(--font-dm-sans)",
            }}>
              Your performance data for the last 30 days
            </div>
          </div>
        </div>

        {/* Insights grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          marginBottom: "16px",
        }}>
          <InsightCard
            label="BEST DAY"
            value={analytics.bestDay ?? "Not enough data"}
            Icon={Calendar}
            tokens={tokens}
          />
          <InsightCard
            label="PEAK TIME"
            value={analytics.bestTime ?? "Not enough data"}
            Icon={Clock}
            tokens={tokens}
          />
          <InsightCard
            label="CONVERSION"
            value={
              analytics.conversionRate !== null
                ? `${analytics.conversionRate.toFixed(1)}%`
                : "—"
            }
            Icon={MessageCircle}
            tokens={tokens}
          />
          <InsightCard
            label="MONTHLY VIEWS"
            value={analytics.viewsMonth.toLocaleString()}
            Icon={Eye}
            tokens={tokens}
          />
        </div>

        {/* Pro tip */}
        {analytics.bestDay && analytics.bestTime && (
          <div style={{
            padding: "12px 16px",
            borderRadius: "10px",
            border: `0.5px solid ${tokens.accent}33`,
            background: tokens.accentSoft,
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}>
            <Lightbulb size={18} style={{ color: tokens.accent, flexShrink: 0 }} />
            <div>
              <div style={{
                fontSize: "10px",
                fontFamily: "var(--font-dm-mono)",
                color: tokens.accent,
                letterSpacing: "0.08em",
                marginBottom: "3px",
              }}>PRO TIP — BASED ON YOUR DATA</div>
              <div style={{
                fontSize: "12px",
                color: tokens.textMuted,
                fontFamily: "var(--font-dm-sans)",
                lineHeight: 1.6,
              }}>
                Post on <strong style={{ color: tokens.text }}>
                  {analytics.bestDay}
                </strong> before{" "}
                <strong style={{ color: tokens.text }}>
                  {analytics.bestTime}
                </strong>{" "}
                for maximum visibility. Your data shows this is when
                your audience is most active.
              </div>
            </div>
          </div>
        )}

        {/* Active features */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          marginTop: "16px",
          paddingTop: "16px",
          borderTop: `0.5px solid ${tokens.border}`,
        }}>
          {[
            "Full analytics",
            "City ranking",
            "Conversion rate",
            "Best posting time",
            "Priority placement",
            "Elite badge",
          ].map(f => (
            <FeatureRow
              key={f}
              label={f}
              locked={false}
              tokens={tokens}
            />
          ))}
        </div>
      </section>
    );
  }

  // ── Premium — pitch VIP ──
  // Previously fell through to the Regular branch, which incorrectly
  // pitched Premium creators on "upgrade to VIP" via Regular's copy
  // ("you're being seen — but are you being chosen?"). Premium creators
  // *are* being seen above Regulars; the right pitch is the next jump up
  // the ladder (VIP) with VIP's specific unlocks (chart + conversion +
  // best-day-time) called out as what they're still missing.
  if (tier === "PREMIUM") {
    return (
      <section style={{
        padding: "18px",
        borderRadius: "14px",
        border: `0.5px solid ${tokens.borderStrong}`,
        background: tokens.surface,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}>
              <Zap size={16} style={{ color: tokens.accent, flexShrink: 0 }} />
              <div style={{
                fontSize: "10px",
                fontFamily: "var(--font-dm-mono)",
                color: tokens.accent,
                letterSpacing: "0.08em",
              }}>SEE WHAT IS WORKING — UPGRADE TO VIP</div>
            </div>
            <p style={{
              fontSize: "12px",
              color: tokens.textMuted,
              fontFamily: "var(--font-dm-sans)",
              lineHeight: 1.7,
              margin: "0 0 14px",
            }}>
              You can see WhatsApp clicks now — that&apos;s half the story.
              VIP unlocks the 30-day performance chart, your live conversion
              rate, and the live visitor feed so you know exactly which
              days drive traffic.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
            }}>
              {[
                { label: "Premium badge", locked: false },
                { label: "WhatsApp clicks tile", locked: false },
                { label: "Performance chart", locked: true },
                { label: "Conversion rate", locked: true },
                { label: "Live activity feed", locked: true },
                { label: "Best posting time", locked: true },
              ].map(f => (
                <FeatureRow
                  key={f.label}
                  label={f.label}
                  locked={f.locked}
                  tokens={tokens}
                />
              ))}
            </div>
          </div>

          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              style={{
                padding: "12px 24px",
                borderRadius: "10px",
                border: `0.5px solid ${tokens.accent}66`,
                background: tokens.accentSoft,
                color: tokens.accent,
                fontSize: "12px",
                fontFamily: "var(--font-dm-mono)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >UPGRADE TO VIP →</button>
          )}
        </div>
      </section>
    );
  }

  // ── VIP — pitch VIP+ ──
  if (tier === "VIP") {
    return (
      <section style={{
        padding: "18px",
        borderRadius: "14px",
        border: `0.5px solid ${tokens.borderStrong}`,
        background: tokens.surface,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}>
              <Zap size={16} style={{ color: tokens.accent, flexShrink: 0 }} />
              <div style={{
                fontSize: "10px",
                fontFamily: "var(--font-dm-mono)",
                color: tokens.accent,
                letterSpacing: "0.08em",
              }}>UNLOCK FULL POWER</div>
            </div>
            <p style={{
              fontSize: "12px",
              color: tokens.textMuted,
              fontFamily: "var(--font-dm-sans)",
              lineHeight: 1.7,
              margin: "0 0 14px",
            }}>
              You are getting more visibility with VIP. Go further
              with VIP+ to see exactly how your profile converts
              visitors into WhatsApp contacts.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
            }}>
              {[
                { label: "WhatsApp click tracking", locked: false },
                { label: "Enhanced visibility", locked: false },
                { label: "Performance chart", locked: false },
                { label: "Conversion rate", locked: true },
                { label: "City rank", locked: true },
                { label: "Best posting time", locked: true },
              ].map(f => (
                <FeatureRow
                  key={f.label}
                  label={f.label}
                  locked={f.locked}
                  tokens={tokens}
                />
              ))}
            </div>
          </div>

          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              style={{
                padding: "12px 24px",
                borderRadius: "10px",
                border: `0.5px solid ${tokens.accent}66`,
                background: tokens.accentSoft,
                color: tokens.accent,
                fontSize: "12px",
                fontFamily: "var(--font-dm-mono)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >UPGRADE TO VIP+ →</button>
          )}
        </div>
      </section>
    );
  }

  // ── Regular — pitch Premium ──
  // Previously pitched VIP directly (a 4-tier jump collapsed to 2). The
  // closer upgrade target is Premium, which now unlocks the WhatsApp
  // clicks tile. Showing the smallest reachable rung makes the upgrade
  // funnel feel like an attainable step instead of "subscribe to the
  // expensive tier".
  return (
    <section style={{
      padding: "18px",
      borderRadius: "14px",
      border: `0.5px solid ${tokens.borderStrong}`,
      background: tokens.surface,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px",
      }}>
        <div style={{ flex: 1, minWidth: "240px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "8px",
          }}>
            <Rocket size={16} style={{ color: tokens.accent, flexShrink: 0 }} />
            <div style={{
              fontSize: "10px",
              fontFamily: "var(--font-dm-mono)",
              color: tokens.accent,
              letterSpacing: "0.08em",
            }}>YOU ARE BEING SEEN — BUT WHO IS REACHING OUT?</div>
          </div>
          <p style={{
            fontSize: "12px",
            color: tokens.textMuted,
            fontFamily: "var(--font-dm-sans)",
            lineHeight: 1.7,
            margin: "0 0 14px",
          }}>
            Your profile is live. Premium unlocks the WhatsApp clicks
            tile so you can see how many visitors actually reach out
            — plus a Premium badge that lifts you above Regular
            creators in the category grid.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
          }}>
            {[
              "WhatsApp clicks tile",
              "Premium badge on profile",
              "Category-grid priority",
              "Visibility lift",
            ].map(f => (
              <FeatureRow
                key={f}
                label={f}
                locked={true}
                tokens={tokens}
              />
            ))}
          </div>
        </div>

        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              border: `0.5px solid ${tokens.accent}66`,
              background: tokens.accentSoft,
              color: tokens.accent,
              fontSize: "12px",
              fontFamily: "var(--font-dm-mono)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >UPGRADE TO PREMIUM →</button>
        )}
      </div>
    </section>
  );
}