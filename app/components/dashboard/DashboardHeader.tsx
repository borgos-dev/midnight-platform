// app/components/dashboard/DashboardHeader.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { AccessLevel } from "@prisma/client";

type DashboardHeaderProps = {
  avatarUrl?: string | null;
  name: string;
  location?: string | null;
  tier: AccessLevel;
  creatorId: number;
  onUpgradeClick?: () => void;
};

const tierMeta: Record<
  AccessLevel,
  { label: string; bg: string; text: string; border: string; ring: string }
> = {
  REGULAR: {
    label: "Regular",
    bg: "bg-white/[0.04]",
    text: "text-white/50",
    border: "border-white/10",
    ring: "",
  },
  VIP: {
    label: "VIP",
    bg: "bg-purple-500/10",
    text: "text-purple-300",
    border: "border-purple-500/30",
    ring: "ring-2 ring-purple-500/60",
  },
  VIP_PLUS: {
    label: "VIP+",
    bg: "bg-amber-400/10",
    text: "text-amber-300",
    border: "border-amber-400/30",
    ring: "ring-2 ring-amber-400/60",
  },
};

export function DashboardHeader({
  avatarUrl,
  name,
  location,
  tier,
  creatorId,
  onUpgradeClick,
}: DashboardHeaderProps) {
  const t = tierMeta[tier];
  const showUpgrade = tier !== "VIP_PLUS";

  return (
    <header className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#0a0a12] px-6 py-5">
      {/* Left: identity */}
      <div className="flex items-center gap-4">
        <div
          className={`h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white/5 ${t.ring}`}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white/30">
              {name?.charAt(0)?.toUpperCase() ?? "M"}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold text-white tracking-tight">
              {name}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${t.bg} ${t.text} ${t.border}`}
            >
              {t.label}
            </span>
          </div>

          {location && (
            <p className="text-[12px] text-white/35">{location}</p>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        <Link
          href={`/creator/${creatorId}`}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          View My Profile
        </Link>

        {showUpgrade && (
          <button
            type="button"
            onClick={onUpgradeClick}
            className="rounded-lg bg-purple-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-purple-500 transition-all"
          >
            {tier === "REGULAR" ? "Upgrade to VIP" : "Upgrade to VIP+"}
          </button>
        )}
      </div>
    </header>
  );
}