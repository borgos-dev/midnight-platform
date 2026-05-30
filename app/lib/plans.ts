// Central source of truth for paid-tier pricing.
//
// Three places used to define prices independently and they drifted out of
// sync (VIP was 5,000 in one file, 10,000 in another). Every surface that
// shows or charges for a tier now reads from PLANS here so a single edit
// re-prices the entire app.
//
// AccessLevel covers REGULAR / PREMIUM / VIP / VIP_PLUS. Only the three
// paid plans live here — REGULAR is the free baseline and never charges.

import type { AccessLevel } from "@prisma/client";

export type PaidPlanCode = "PREMIUM" | "VIP" | "VIP_PLUS";

export type PlanDef = {
  code: PaidPlanCode;
  /** Display label on cards + checkout. */
  label: string;
  /** One-line value prop used as the card subhead. */
  tagline: string;
  /** Price in CFA (whole francs — Cameroon doesn't use sub-units). */
  priceCfa: number;
  /** Length of one billing cycle. Subscriptions auto-expire at endsAt. */
  durationDays: number;
  /** Bullet list shown on the card. Plain strings; no inline formatting. */
  features: string[];
  /**
   * Whether the plan needs admin-verified status before purchase. VIP+ is
   * the trust top-tier; we manually verify the ID before we let a creator
   * pay for it. Checkout actions enforce this guard.
   */
  requiresVerified: boolean;
};

export const PLANS: Record<PaidPlanCode, PlanDef> = {
  VIP_PLUS: {
    code: "VIP_PLUS",
    label: "VIP+",
    tagline: "Top of every list. Verified-only. Maximum trust signal.",
    priceCfa: 30000,
    durationDays: 14,
    features: [
      "10 posts per day (up to 5 videos)",
      "Posts stay live for 90 days",
      "Top placement across the whole platform",
      "Verified badge — proven identity, harder to fake",
      "Full analytics: views, clicks, conversion",
      "Custom blur preview on locked posts",
      "Priority support",
    ],
    requiresVerified: true,
  },
  VIP: {
    code: "VIP",
    label: "VIP",
    tagline: "Higher visibility, deeper insight, stronger conversions.",
    priceCfa: 20000,
    durationDays: 14,
    features: [
      "7 posts per day (up to 3 videos)",
      "Posts stay live for 60 days",
      "Boosted placement above Premium and Regular",
      "WhatsApp click analytics",
      "Weekly performance chart",
      "Profile spotlight on the homepage tier band",
    ],
    requiresVerified: false,
  },
  PREMIUM: {
    code: "PREMIUM",
    label: "Premium",
    tagline: "First step above the free tier. Real placement, real metrics.",
    priceCfa: 15000,
    durationDays: 14,
    features: [
      "5 posts per day (up to 2 videos)",
      "Posts stay live for 30 days",
      "Section placement above Regular creators",
      "Basic analytics: profile views + WhatsApp clicks",
      "Better card prominence on category and city pages",
    ],
    requiresVerified: false,
  },
};

export const PAID_PLAN_CODES: PaidPlanCode[] = ["VIP_PLUS", "VIP", "PREMIUM"];

export function isPaidPlanCode(value: string): value is PaidPlanCode {
  return value === "VIP_PLUS" || value === "VIP" || value === "PREMIUM";
}

/**
 * Resolve a plan from a string that *might* be an AccessLevel. REGULAR is
 * the free tier so it returns null. Callers should treat null as "no paid
 * plan" — never as an error.
 */
export function getPlanForTier(tier: AccessLevel): PlanDef | null {
  if (tier === "REGULAR") return null;
  return PLANS[tier];
}

/**
 * 30,000 CFA → "30,000 CFA". Uses fr-FR grouping (space) — the rest of the
 * codebase mixes locale settings, so the formatter stays here so all plan
 * surfaces look identical.
 */
export function formatPriceCfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR").replace(/ /g, " ")} CFA`;
}

// ─────────────────────────────────────────────────────────────────────────
// Daily post quotas
//
// A post here means a single `post` row (a gallery containing 6 images
// still counts as one post). Gallery + feed posts share the same counter
// — the cap is "how many things you publish per day," not per surface.
//
// Reset cadence: calendar day in the server's local timezone (matches the
// existing `startOfToday()` helper in lib/analytics.ts). Marketing copy
// reads as "X par jour" so calendar-day reset aligns with what visitors
// expect; rolling 24h would let a creator post at 11:59pm and again at
// 12:01am, which would feel like a bug to most users.
//
// Numbers come from the /upgrade page bullets — keep them in sync.
// ─────────────────────────────────────────────────────────────────────────

export const DAILY_POST_QUOTA: Record<AccessLevel, number> = {
  REGULAR: 3,
  PREMIUM: 5,
  VIP: 7,
  VIP_PLUS: 10,
};

export function getDailyPostQuota(tier: AccessLevel): number {
  return DAILY_POST_QUOTA[tier];
}

// ─────────────────────────────────────────────────────────────────────────
// Daily video sub-cap
//
// Total post counter (DAILY_POST_QUOTA above) covers all uploads; this
// extra cap throttles videos *inside* that budget so creators can't burn
// a paid tier's storage budget by uploading nothing but 5MB+ clips. The
// numbers add up such that the total is always reachable with images:
//   PREMIUM   = 5 posts → max 2 videos + 3 images
//   VIP       = 7 posts → max 3 videos + 4 images
//   VIP_PLUS  = 10 posts → max 5 videos + 5 images
// REGULAR is image-only (videos blocked entirely) — see uploadsPost.ts.
// ─────────────────────────────────────────────────────────────────────────

export const DAILY_VIDEO_QUOTA: Record<AccessLevel, number> = {
  REGULAR: 0,
  PREMIUM: 2,
  VIP: 3,
  VIP_PLUS: 5,
};

export function getDailyVideoQuota(tier: AccessLevel): number {
  return DAILY_VIDEO_QUOTA[tier];
}

// ─────────────────────────────────────────────────────────────────────────
// Post retention
//
// How long a post lives before it auto-deletes from both the DB and
// Cloudinary. Caps storage growth without forcing creators to manage
// their own usage. Doubles as an upgrade lever — "your posts last
// longer on higher tiers."
//
// Sweep runs lazily per-creator on dashboard render + upload, so a
// returning creator's old content rolls off without a global cron.
// ─────────────────────────────────────────────────────────────────────────

export const POST_RETENTION_DAYS: Record<AccessLevel, number> = {
  REGULAR: 14,
  PREMIUM: 30,
  VIP: 60,
  VIP_PLUS: 90,
};

export function getPostRetentionDays(tier: AccessLevel): number {
  return POST_RETENTION_DAYS[tier];
}
