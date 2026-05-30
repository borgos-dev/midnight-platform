/**
 * A/B test scaffolding for the primary CTA color.
 *
 * Background: the design defense for purple-600 as the primary CTA color
 * acknowledged a real contrast trade-off — purple-600 vs. our near-black
 * background sits at ~3.7:1, just above the WCAG 3:1 minimum for non-text
 * UI components. A lighter purple (purple-500) gives ~5.0:1 against the
 * background but drops white-text-on-button contrast below AA. By switching
 * to off-white text (purple-50) on the lighter button we keep label
 * contrast above AA while improving button-vs-bg.
 *
 * This module decides per-user which arm is shown.
 *
 * Override (overrides the bucket for ALL users):
 *   NEXT_PUBLIC_PRIMARY_VARIANT="primary"          → all users see control
 *   NEXT_PUBLIC_PRIMARY_VARIANT="primary-lighter"  → all users see treatment
 *   (unset / anything else)                        → 50/50 bucket by userId
 *
 * Anonymous users (signup, logged-out browsing) always see control unless
 * the env override is set. Bucketing anonymous traffic would require a
 * cookie-based assigner, which is a follow-up.
 */

import type { ButtonVariant } from "@/app/components/ui/Button";

export type PrimaryVariant = "primary" | "primary-lighter";

const OVERRIDE = process.env.NEXT_PUBLIC_PRIMARY_VARIANT;

/**
 * Resolve the active primary button variant for a given viewer.
 * Pass the viewer's userId for stable per-user bucketing; omit for
 * anonymous traffic.
 */
export function getPrimaryButtonVariant(
  opts: { userId?: number | null } = {},
): PrimaryVariant {
  if (OVERRIDE === "primary" || OVERRIDE === "primary-lighter") {
    return OVERRIDE;
  }

  const { userId } = opts;
  if (userId == null) return "primary"; // anonymous → control

  // Deterministic 50/50 split. For sequential auto-increment IDs the
  // odd/even split is uniform enough; if we later move to UUIDs we'll
  // swap this for a real hash (e.g. murmur).
  return userId % 2 === 0 ? "primary" : "primary-lighter";
}

/**
 * Convenience: returns the variant typed as the Button system's
 * ButtonVariant. Use this when you need to pass directly to <Button> /
 * buttonClasses(); the narrower PrimaryVariant doesn't widen automatically
 * past the function boundary in some call sites.
 */
export function getPrimaryButtonVariantAsButtonVariant(
  opts: { userId?: number | null } = {},
): ButtonVariant {
  return getPrimaryButtonVariant(opts);
}

/**
 * Record a CTA exposure for the A/B test. Fires a fire-and-forget POST
 * to /api/analytics/event with eventType="cta_exposure" + variant.
 *
 * The server enforces a 30-minute per-(visitor, creator, eventType) dedup
 * window, so calling this on every page render is safe — repeat exposures
 * within the window are silently skipped server-side. No need for client
 * dedup.
 *
 * Self-events (creator viewing their own profile) are also blocked
 * server-side, so we don't pollute their own bucket.
 */
export function recordVariantExposure(
  creatorId: number,
  variant: PrimaryVariant,
): void {
  if (typeof window === "undefined") return; // SSR safety

  // Client-side dedup. The CTA renders in two DOM positions per page
  // (sidebar + mobile sticky bar) and both mount, so without this check
  // we'd fire the exposure POST twice per page view. The server enforces
  // a 30-min dedup window on row writes, but the network round-trip
  // itself is still wasteful — and on Cameroon mobile, wasteful matters.
  try {
    const key = `cta_exposure:${creatorId}:${variant}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage can throw in private-mode Safari; fall through and
    // let the server-side dedup do its job.
  }

  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      creatorId,
      eventType: "cta_exposure",
      variant,
    }),
  }).catch(() => {
    // Best-effort — analytics failures must never affect the user's flow
  });
}

/**
 * Record a CTA click (whatsapp_click or upgrade_click) tagged with the
 * A/B arm the user was bucketed into. Conversion rate per arm =
 * count(eventType=click) / count(eventType=cta_exposure) at the same variant.
 */
export function recordVariantClick(
  creatorId: number,
  eventType: "whatsapp_click" | "upgrade_click",
  variant: PrimaryVariant,
): void {
  if (typeof window === "undefined") return;
  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      creatorId,
      eventType,
      variant,
    }),
  }).catch(() => {});
}
