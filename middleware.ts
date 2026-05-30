import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ─── Env guard (edge-compatible) ───────────────────────────
const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN &&
  process.env.UPSTASH_REDIS_REST_URL.startsWith("https://");

const loginLimiter = hasUpstash
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "rl:login",
      analytics: true,
    })
  : null;

// Content-Security-Policy.
//
// Scoped deliberately to directives that harden the app WITHOUT breaking it:
// the UI mixes Tailwind with inline <style> blocks and inline style={} props,
// and Next.js injects inline bootstrap scripts. A nonce-per-render strict
// script-src/style-src is the proper long-term fix (tracked in
// SECURITY_AUDIT.md); for now we explicitly allow inline styles + scripts
// because shipping a CSP that blocks both turns the whole UI into raw HTML.
//
// The directives below close real attack surface even with 'unsafe-inline':
//   • frame-ancestors 'none'  → clickjacking defense (belt-and-braces w/ XFO)
//   • object-src 'none'       → blocks <object>/<embed> plugin injection
//   • base-uri 'self'         → stops <base> tag href hijacking
//   • form-action             → forms can only post to us / WhatsApp
//   • img/media-src           → media may only load from us + Cloudinary
//   • script-src              → scripts only from us + inline (no remote CDN)
//   • style-src               → styles only from us + inline + Google Fonts
//   • upgrade-insecure-requests in prod
//
// 'unsafe-eval' is included in script-src because Next.js dev mode (Turbopack)
// uses eval for fast refresh. Strip it on production builds — see the
// NODE_ENV check in applySecurityHeaders below.
const SCRIPT_SRC_DEV =
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
const SCRIPT_SRC_PROD = "script-src 'self' 'unsafe-inline'";

const CSP_BASE_DIRECTIVES = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // picsum.photos hosts the seeded demo creator avatars. Safe to whitelist
  // (read-only image CDN). Long-term these should be migrated to Cloudinary
  // and this entry dropped.
  "img-src 'self' https://res.cloudinary.com https://picsum.photos data: blob:",
  "media-src 'self' https://res.cloudinary.com blob:",
  "connect-src 'self' https://res.cloudinary.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://wa.me",
];

function buildCsp(): string {
  const isProd = process.env.NODE_ENV === "production";
  const directives = [
    ...CSP_BASE_DIRECTIVES,
    isProd ? SCRIPT_SRC_PROD : SCRIPT_SRC_DEV,
  ];
  return directives.join("; ");
}

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  const csp = buildCsp();
  res.headers.set(
    "Content-Security-Policy",
    process.env.NODE_ENV === "production"
      ? `${csp}; upgrade-insecure-requests`
      : csp
  );
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate-limit only the NextAuth credentials callback POST
  if (
    pathname === "/api/auth/callback/credentials" &&
    req.method === "POST" &&
    loginLimiter
  ) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    try {
      const { success } = await Promise.race([
        loginLimiter.limit(ip),
        new Promise<{ success: true }>((resolve) =>
          setTimeout(() => resolve({ success: true }), 5_000)
        ),
      ]);

      if (!success) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: "Too many login attempts. Please try again later." },
            { status: 429 }
          )
        );
      }
    } catch {
      // Redis error — fail open
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    // Apply to all pages + API except static assets / public uploads
    "/((?!_next/static|_next/image|favicon.ico|images|uploads).*)",
  ],
};
