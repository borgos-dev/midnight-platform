// Per-tier color + icon tokens used across the dashboard surfaces.
//
// Lives here (instead of inside DashboardShell.tsx) so server components on
// other pages — Edit Profile, My Posts, Subscription, etc. — can import the
// same token set without crossing the use-client boundary. Each tier gets
// its own background warmth, surface tint, accent color, and Lucide icon
// so a paid creator's "their world" continues to read the same way wherever
// they navigate in /dashboard.
//
// Accent colors are aligned with the brand palette in globals.css and with
// the public-facing CreatorTile / TierSection bands so the upgrade story
// reads consistently from landing → profile → dashboard.

import { Circle, Star, Sparkles, Crown, type LucideIcon } from "lucide-react";
import type { AccessLevel } from "@prisma/client";

export type TierTokens = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentSoft: string;
  text: string;
  textMuted: string;
  textDim: string;
  badge: { bg: string; border: string; color: string };
  label: string;
  icon: LucideIcon;
};

export const TIER_TOKENS: Record<AccessLevel, TierTokens> = {
  REGULAR: {
    bg: "#13131F",
    surface: "#1A1A2E",
    surfaceAlt: "#1E1E38",
    border: "#252540",
    borderStrong: "#2E2E4E",
    accent: "#6A6A9A",
    accentSoft: "rgba(90,90,138,0.1)",
    text: "#8A8AAA",
    textMuted: "#4A4A6A",
    textDim: "#2E2E4A",
    badge: { bg: "rgba(74,74,106,0.15)", border: "#2E2E4E", color: "#6A6A9A" },
    label: "Regular",
    icon: Circle,
  },
  PREMIUM: {
    bg: "#1A0C14",
    surface: "#22101A",
    surfaceAlt: "#2A1422",
    border: "#3A1D2C",
    borderStrong: "#4A273C",
    accent: "#E8547A",
    accentSoft: "rgba(232,84,122,0.15)",
    text: "#F0C5D2",
    textMuted: "#7A3A4C",
    textDim: "#3A1822",
    badge: {
      bg: "rgba(232,84,122,0.18)",
      border: "rgba(232,84,122,0.4)",
      color: "#E8547A",
    },
    label: "Premium",
    icon: Star,
  },
  VIP: {
    bg: "#110E1C",
    surface: "#180F2A",
    surfaceAlt: "#1E1438",
    border: "#2E2048",
    borderStrong: "#3E2E68",
    accent: "#a855f7",
    accentSoft: "rgba(168,85,247,0.15)",
    text: "#D8C5F0",
    textMuted: "#5A4A7A",
    textDim: "#2A1A42",
    badge: {
      bg: "rgba(168,85,247,0.18)",
      border: "rgba(168,85,247,0.4)",
      color: "#a855f7",
    },
    label: "VIP",
    icon: Sparkles,
  },
  VIP_PLUS: {
    bg: "#0F0D08",
    surface: "#181208",
    surfaceAlt: "#1C1608",
    border: "#3A2A12",
    borderStrong: "#4A3818",
    accent: "#E6A817",
    accentSoft: "rgba(230,168,23,0.15)",
    text: "#F0D58A",
    textMuted: "#6A5030",
    textDim: "#3A2810",
    badge: {
      bg: "rgba(230,168,23,0.18)",
      border: "rgba(230,168,23,0.45)",
      color: "#E6A817",
    },
    label: "VIP+",
    icon: Crown,
  },
};
