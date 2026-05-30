// app/dashboard/DashboardShell.tsx
"use client";

import { useState } from "react";
import { AccessLevel } from "@prisma/client";
import { Mail } from "lucide-react";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { IntentGrid } from "../components/dashboard/sections/IntentGrid";
import { PerformanceChart } from "../components/dashboard/sections/PerformanceChart";
import { LiveActivity } from "../components/dashboard/sections/LiveActivity";
import { TopPerformingPosts } from "../components/dashboard/sections/TopPerformingPosts";
import { UpgradeIntelligence } from "../components/dashboard/sections/UpgradeIntelligence";
import {
  LinkPerformance,
  type LinkPerformanceRow,
} from "../components/dashboard/sections/LinkPerformance";
import { UpgradeDialog } from "./UpgradeDialog";
import { ResendVerificationButton } from "./ResendVerificationButton";
import { BoostStatusCard } from "./BoostStatusCard";

type TopPost = {
  id: number;
  title: string;
  accessLevel: string;
  thumbnail: string | null;
  mediaKind: string | null;
  likes: number;
};

export type AnalyticsPayload = {
  // Profile-view counts, computed live from AnalyticsEvent rows on the
  // server (see lib/analytics.ts). The names previously matched the now-
  // dropped creatorprofile.profileViews* columns; renamed because they're
  // no longer cached column reads — every value is a windowed count.
  viewsToday: number;
  viewsWeek: number;
  viewsMonth: number;
  clicksToday: number;
  clicksWeek: number;
  clicksMonth: number;
  conversionRate: number | null;
  cityRank: number | null;
  bestDay: string | null;
  bestTime: string | null;
  // Real per-day buckets, oldest-first, length 30 when fetched.
  // Empty array means the creator's tier doesn't have access to the chart.
  dailyViews: number[];
  dailyClicks: number[];
  totalTrendEvents: number;
};

/**
 * Per-creator setup-checklist status. Each flag is "true when the creator
 * has done that thing." When all four are true, the dashboard renders the
 * normal Conversion Rate tile; when any is false, the SetupChecklist tile
 * takes that slot to give brand-new creators something productive to do
 * instead of staring at an empty KPI.
 */
export type SetupStatus = {
  hasAvatar: boolean;
  hasWhatsApp: boolean;
  hasBio: boolean;
  hasFirstPost: boolean;
};

type DashboardShellProps = {
  tier: AccessLevel;
  name: string;
  avatarUrl?: string | null;
  location?: string | null;
  creatorId: number;
  analytics: AnalyticsPayload;
  topPosts: TopPost[];
  setupStatus: SetupStatus;
  emailVerified: boolean;
  /** The signed-in user's email. Used as the target for the "Resend" button
   *  inside the unverified banner so the user doesn't have to type it. */
  email: string;
  /** Current open boost (PENDING_PAYMENT / PENDING_REVIEW / ACTIVE) for the
   *  Regular-tier Boost CTA card. Null when there's no open order or the
   *  creator isn't Regular tier (we skip the fetch in page.tsx). */
  boost:
    | {
        status: "PENDING_PAYMENT" | "PENDING_REVIEW" | "ACTIVE";
        durationDays: number;
        amountCfa: number;
        endsAt: Date | null;
      }
    | null;
  /** Most recent EXPIRED boost in the last 14 days, used for the post-
   *  boost summary + "Boost again" renew CTA. Only set when there's no
   *  active boost (we don't show renew alongside an active spotlight). */
  expiredBoost:
    | {
        durationDays: number;
        amountCfa: number;
        endsAt: Date | null;
      }
    | null;
  /** Views + WhatsApp clicks during the boost window. Used by both the
   *  active-boost ROI panel and the post-boost summary. */
  boostPerformance: { views: number; clicks: number } | null;
  /** Per-external-link click counts (rolling 30 days) for VIP+ link
   *  performance panel. Empty array when the creator has no links or
   *  isn't VIP+ (we skip the query in page.tsx). */
  linkPerformance: LinkPerformanceRow[];
};

// Tier color tokens moved to app/lib/tier-tokens.ts so server pages can
// import them without crossing the "use client" boundary. Re-exported
// here so existing `import { TIER_TOKENS } from "@/app/dashboard/DashboardShell"`
// statements continue to work.
export { TIER_TOKENS } from "@/app/lib/tier-tokens";
import { TIER_TOKENS } from "@/app/lib/tier-tokens";

export function DashboardShell({
  tier,
  name,
  avatarUrl,
  location,
  creatorId,
  analytics,
  topPosts,
  setupStatus,
  emailVerified,
  email,
  boost,
  expiredBoost,
  boostPerformance,
  linkPerformance,
}: DashboardShellProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const openUpgrade = () => setUpgradeOpen(true);
  const tokens = TIER_TOKENS[tier];

  return (
    <div
      className="mn-dashboard-root"
      style={{
        minHeight: "100vh",
        background: tokens.bg,
        transition: "background 0.4s ease",
      }}
    >
      <div style={{
        maxWidth: "1100px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>

        {/* Email verification banner */}
        {!emailVerified && (
          <div style={{
            padding: "12px 16px",
            borderRadius: "10px",
            border: `1px solid ${tokens.accent}44`,
            background: tokens.accentSoft,
            fontSize: "13px",
            color: tokens.text,
            fontFamily: "var(--font-dm-sans)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}>
            <Mail size={16} style={{ flexShrink: 0, color: tokens.accent }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              Verify your email to unlock posting and upgrades
            </span>
            <ResendVerificationButton
              email={email}
              accentColor={tokens.accent}
            />
          </div>
        )}

        {/* Boost CTA / status — Regular tier only. Upper tiers don't see it.
            Three data inputs:
              - boost:           active or pending order (drives "X days left"
                                 + the optional performance row when active)
              - expiredBoost:    most recent boost that ended within 14 days
                                 (drives the "Your last boost drove N views,
                                 boost again?" renew card)
              - boostPerformance: views/clicks during the active OR recently
                                 expired window. Used by both surfaces above. */}
        {tier === "REGULAR" && (
          <BoostStatusCard
            boost={
              boost
                ? boost.status === "ACTIVE" && boost.endsAt
                  ? {
                      status: "ACTIVE",
                      durationDays: boost.durationDays,
                      endsAt: boost.endsAt,
                    }
                  : boost.status === "PENDING_PAYMENT" ||
                      boost.status === "PENDING_REVIEW"
                    ? {
                        status: boost.status,
                        durationDays: boost.durationDays,
                        amountCfa: boost.amountCfa,
                      }
                    : null
                : null
            }
            expiredBoost={expiredBoost}
            performance={boostPerformance}
          />
        )}

        {/* Row 1 — Identity */}
        <DashboardHeader
          avatarUrl={avatarUrl ?? null}
          name={name}
          location={location ?? null}
          tier={tier}
          creatorId={creatorId}
          tokens={tokens}
          analytics={analytics}
          onUpgradeClick={openUpgrade}
        />

        {/* Row 2 — Stats */}
        <IntentGrid
          tier={tier}
          analytics={analytics}
          tokens={tokens}
          setupStatus={setupStatus}
          onUpgradeClick={openUpgrade}
        />

        {/* Row 3 — Chart + Activity. Stacks on mobile so the chart isn't
            squashed into a third of a phone screen; splits to 3fr/2fr on
            tablets+ where the side-by-side reads. */}
        <div className="mn-dashboard-row3">
          <PerformanceChart
            tier={tier}
            analytics={analytics}
            tokens={tokens}
            onUpgradeClick={openUpgrade}
          />
          <LiveActivity
            tier={tier}
            creatorId={creatorId}
            tokens={tokens}
          />
        </div>

        {/* Row 4 — Top Posts */}
        <TopPerformingPosts
          posts={topPosts}
          tokens={tokens}
        />

        {/* Row 5 — Link Performance.
            Closes the loop on external links: a VIP+ creator who added
            Instagram / OnlyFans / etc. can see per-channel click counts
            here. Lower tiers see a locked tease with the upgrade nudge. */}
        <LinkPerformance
          tier={tier}
          rows={linkPerformance}
          tokens={tokens}
          onUpgradeClick={openUpgrade}
        />

        {/* Row 6 — Upgrade Intelligence */}
        <UpgradeIntelligence
          tier={tier}
          analytics={analytics}
          tokens={tokens}
          onUpgradeClick={openUpgrade}
        />

      </div>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
      />

      <style>{`
        /* Top padding used to clear the global Navbar (64px). The dashboard
           is now in NO_NAVBAR_PATHS, so the navbar doesn't render here and
           the previous 112–136px is wasted vertical space. Trimmed to a
           normal page-gutter top padding that just gives the first row
           some breathing room below the dashboard sidebar header. */
        .mn-dashboard-root {
          padding: 24px 16px 40px;
        }
        @media (min-width: 768px) {
          .mn-dashboard-root {
            padding: 32px 24px 48px;
          }
        }
        @media (min-width: 1024px) {
          .mn-dashboard-root {
            padding: 40px 32px 56px;
          }
        }

        /* Row 3: chart + activity. Single column on mobile, side-by-side
           from tablet up. Chart gets the larger share when split. */
        .mn-dashboard-row3 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .mn-dashboard-row3 {
            grid-template-columns: 3fr 2fr;
          }
        }
      `}</style>
    </div>
  );
}