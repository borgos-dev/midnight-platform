// app/dashboard/DashboardShell.tsx
"use client";

import { useState } from "react";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { IntentGrid } from "../components/dashboard/sections/IntentGrid";
import { PerformanceChart } from "../components/dashboard/sections/PerformanceChart";
import { LiveActivity } from "../components/dashboard/sections/LiveActivity";
import { TopPerformingPosts } from "../components/dashboard/sections/TopPerformingPosts";
import { UpgradeIntelligence } from "../components/dashboard/sections/UpgradeIntelligence";
import { UpgradeDialog } from "./UpgradeDialog";
import { AccessLevel } from "@prisma/client";

type TopPost = {
  id: number;
  title: string;
  accessLevel: string;
  thumbnail: string | null;
  mediaKind: string | null;
  likes: number;
};

export type AnalyticsPayload = {
  profileViewsToday: number;
  profileViewsWeek: number;
  profileViewsMonth: number;
  whatsappClicksToday: number;
  whatsappClicksWeek: number;
  whatsappClicksMonth: number;
  conversionRate: number | null;
  cityRank: number | null;
  bestDay: string | null;
  bestTime: string | null;
};

type DashboardShellProps = {
  tier: AccessLevel;
  name: string;
  avatarUrl?: string | null;
  location?: string | null;
  creatorId: number;
  analytics: AnalyticsPayload;
  topPosts: TopPost[];
};

export function DashboardShell({
  tier,
  name,
  avatarUrl,
  location,
  creatorId,
  analytics,
  topPosts,
}: DashboardShellProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const openUpgrade = () => setUpgradeOpen(true);

  return (
    <div className="space-y-6">
      {/* ───── ROW 1: IDENTITY STRIP ───── */}
      <DashboardHeader
        avatarUrl={avatarUrl ?? null}
        name={name}
        location={location ?? null}
        tier={tier}
        creatorId={creatorId}
        onUpgradeClick={openUpgrade}
      />

      {/* ───── ROW 2: PERFORMANCE OVERVIEW (4 analytics cards) ───── */}
      <IntentGrid
        tier={tier}
        analytics={analytics}
        onUpgradeClick={openUpgrade}
      />

      {/* ───── ROW 3: PERFORMANCE CHART + LIVE ACTIVITY ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <PerformanceChart
            tier={tier}
            analytics={analytics}
            onUpgradeClick={openUpgrade}
          />
        </div>
        <div className="lg:col-span-2">
          <LiveActivity tier={tier} location={location} />
        </div>
      </div>

      {/* ───── ROW 4: TOP PERFORMING POSTS ───── */}
      <TopPerformingPosts posts={topPosts} />

      {/* ───── ROW 5: UPGRADE INTELLIGENCE (only non-VIP+) ───── */}
      {tier !== "VIP_PLUS" ? (
        <UpgradeIntelligence tier={tier} onUpgradeClick={openUpgrade} />
      ) : (
        <UpgradeIntelligence
          tier={tier}
          analytics={analytics}
          onUpgradeClick={openUpgrade}
        />
      )}

      {/* UPGRADE DIALOG */}
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}