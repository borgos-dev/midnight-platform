import type { AccessLevel } from "@prisma/client";

// Maximum video duration in seconds, per creator tier. Real product paywall
// (not a privacy paywall) — longer videos cost more browser CPU to process
// and more storage, so paid tiers get more headroom. Privacy features
// themselves stay universal across every tier.
//
// Numbers chosen to match social-platform norms creators already know
// (Instagram Reels = 60s, Stories = 15s, TikTok Free ~60s).

export const VIDEO_DURATION_LIMIT_SECONDS: Record<AccessLevel, number> = {
  REGULAR: 15,
  PREMIUM: 30,
  VIP: 60,
  VIP_PLUS: 120,
};

/** Friendly label for the limit, used in UI hints + error messages. */
export function videoLimitLabel(tier: AccessLevel): string {
  const seconds = VIDEO_DURATION_LIMIT_SECONDS[tier];
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m${seconds % 60 ? ` ${seconds % 60}s` : ""}`;
}

/**
 * Validate a video's duration against the creator's tier cap.
 * Server-side authority — never trust a client-reported duration alone.
 * Returns null when within limits, or an error message describing the cap
 * AND the actual length so the creator knows by how much they overshot.
 */
export function checkVideoDuration(
  durationSeconds: number,
  tier: AccessLevel,
): string | null {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return "Couldn't read the video duration. Try re-exporting the clip.";
  }
  const cap = VIDEO_DURATION_LIMIT_SECONDS[tier];
  // 0.5s tolerance — file containers often report a hair over the actual
  // playback length and we don't want to reject a 30.1s clip on the 30s plan.
  if (durationSeconds > cap + 0.5) {
    const overshot = Math.ceil(durationSeconds - cap);
    return `Your ${tier === "REGULAR" ? "Regular" : tier === "PREMIUM" ? "Premium" : tier === "VIP" ? "VIP" : "VIP+"} tier allows up to ${videoLimitLabel(tier)}. This clip is ${overshot}s too long — trim it or upgrade your tier.`;
  }
  return null;
}
