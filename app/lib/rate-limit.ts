import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

// ─── Env guard ─────────────────────────────────────────────
// Placeholder values like "your_url_here" are NOT valid Upstash URLs.
const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN &&
  process.env.UPSTASH_REDIS_REST_URL.startsWith("https://");

if (!hasUpstash && process.env.NODE_ENV === "development") {
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL / TOKEN not set — rate limiting disabled"
  );
}

/** Allow-all response shape */
const ALLOW = {
  success: true as const,
  limit: 0,
  remaining: 0,
  reset: 0,
  pending: Promise.resolve(),
};

/** Allow-all stub that matches the Ratelimit.limit() return shape */
const allowAll = {
  limit: async (_id: string) => ALLOW,
} as unknown as Ratelimit;

/**
 * Wraps a real Ratelimit so that .limit() can never hang or crash the app.
 * - 5 s timeout → fail open (allow)
 * - Any thrown error → fail open (allow)
 */
function makeSafe(rl: Ratelimit): Ratelimit {
  return {
    limit: async (id: string) => {
      try {
        return await Promise.race([
          rl.limit(id),
          new Promise<typeof ALLOW>((resolve) =>
            setTimeout(() => resolve(ALLOW), 5_000)
          ),
        ]);
      } catch {
        return ALLOW;
      }
    },
  } as unknown as Ratelimit;
}

/**
 * Shared Upstash Redis instance (only created when env vars exist).
 */
const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : (undefined as unknown as Redis);

// ─── Limiters ──────────────────────────────────────────────
// Each limiter has its own prefix so counters don't collide.

/** Login: 5 attempts per 60 s per IP */
export const loginLimiter = hasUpstash
  ? makeSafe(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        prefix: "rl:login",
        analytics: true,
      })
    )
  : allowAll;

/** Signup: 5 attempts per 60 s per IP */
export const signupLimiter = hasUpstash
  ? makeSafe(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        prefix: "rl:signup",
        analytics: true,
      })
    )
  : allowAll;

/** Forgot password: 3 attempts per 60 s per IP */
export const forgotPasswordLimiter = hasUpstash
  ? makeSafe(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "60 s"),
        prefix: "rl:forgot",
        analytics: true,
      })
    )
  : allowAll;

/** Reset password: 5 attempts per 60 s per IP */
export const resetPasswordLimiter = hasUpstash
  ? makeSafe(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        prefix: "rl:reset",
        analytics: true,
      })
    )
  : allowAll;

/** Analytics events: 30 per minute per IP (well above legit user pace) */
export const eventLimiter = hasUpstash
  ? makeSafe(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "60 s"),
        prefix: "rl:event",
        analytics: false,
      })
    )
  : allowAll;

/** Subscription create: 5 per hour per IP */
export const subscriptionCreateLimiter = hasUpstash
  ? makeSafe(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "3600 s"),
        prefix: "rl:sub-create",
        analytics: false,
      })
    )
  : allowAll;

/** Media upload: 20 per 10 min per IP. Generous for a real creator filling
 *  out a gallery, but stops an authenticated account from being used to
 *  hammer Cloudinary (storage/bandwidth cost + abuse). */
export const uploadLimiter = hasUpstash
  ? makeSafe(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "600 s"),
        prefix: "rl:upload",
        analytics: false,
      })
    )
  : allowAll;

/** Resend verification email: 3 per 10 min per IP — tight cap so the action
 *  can't be turned into a spam relay against arbitrary email addresses. */
export const resendVerificationLimiter = hasUpstash
  ? makeSafe(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "600 s"),
        prefix: "rl:resend-verify",
        analytics: false,
      })
    )
  : allowAll;

// ─── Helpers ───────────────────────────────────────────────

/**
 * Extract client IP from request headers (server actions).
 * Falls back to "unknown" if header is missing.
 */
export async function getIP(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Extract client IP from a raw Request (API routes / middleware).
 */
export function getIPFromRequest(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
