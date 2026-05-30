// app/lib/geolocation.ts
//
// Detect a visitor's city for the homepage auto-filter.
//
// Three layers, cheapest first:
//   1. Cookie cache  — `mn_geo_city` set after first detection, 7-day TTL.
//                      Zero network calls on subsequent visits.
//   2. Edge headers  — `x-vercel-ip-city` (Vercel) or `cf-ipcity` (Cloudflare).
//                      Free, instant, set by the CDN before our code runs.
//   3. ipapi.co      — universal fallback. Free 1k req/day, no key needed.
//                      Only hit for visitors not behind a geo-aware CDN.
//
// The function *only* returns a city that exists in our database. If the
// IP resolves to "Limbe" but no Midnight creators are in Limbe, we return
// null — better to show all creators than auto-filter to an empty page.

import "server-only";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "mn_geo_city";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// `mn_geo_optout` records that the visitor explicitly chose "show all" or
// switched to a different city. We respect that choice and skip detection
// on subsequent visits until the cookie expires.
const OPTOUT_COOKIE = "mn_geo_optout";

type DetectionResult = {
  city: string | null;
  /** "cookie" | "edge" | "ipapi" | "none" — useful for the banner copy. */
  source: "cookie" | "edge" | "ipapi" | "none";
};

/**
 * Read the visitor's city if we can detect one that matches a creator
 * city in our database. Returns null when no match (so the caller falls
 * back to the unfiltered grid).
 *
 * Always safe to call from server components — never throws.
 */
export async function detectVisitorCity(): Promise<DetectionResult> {
  try {
    const cookieJar = await cookies();

    // The visitor explicitly opted out (chose "Show all" or switched
    // cities manually). Respect that — no detection until the cookie
    // expires.
    if (cookieJar.get(OPTOUT_COOKIE)?.value === "1") {
      return { city: null, source: "none" };
    }

    // 1. Cookie cache
    const cached = cookieJar.get(COOKIE_NAME)?.value;
    if (cached) {
      const match = await matchKnownCity(cached);
      if (match) return { city: match, source: "cookie" };
    }

    // 2. Edge headers — set by Vercel / Cloudflare before our code runs.
    const h = await headers();
    const edgeCity =
      h.get("x-vercel-ip-city") ??
      h.get("cf-ipcity") ??
      null;
    if (edgeCity) {
      const decoded = safeDecode(edgeCity);
      const match = await matchKnownCity(decoded);
      if (match) return { city: match, source: "edge" };
    }

    // 3. ipapi.co fallback. We need the visitor's IP — read it from the
    // standard forwarded headers (Vercel, most reverse proxies set these).
    const ip =
      firstIp(h.get("x-forwarded-for")) ??
      h.get("x-real-ip") ??
      null;

    // Skip the API call for localhost / private IPs — they always return
    // garbage and waste our free-tier quota.
    if (!ip || isPrivateIp(ip)) {
      return { city: null, source: "none" };
    }

    const ipapiCity = await fetchIpapiCity(ip);
    if (ipapiCity) {
      const match = await matchKnownCity(ipapiCity);
      if (match) return { city: match, source: "ipapi" };
    }

    return { city: null, source: "none" };
  } catch {
    // Any error → fail open, render the unfiltered homepage.
    return { city: null, source: "none" };
  }
}

/**
 * Persist a detected city to the cookie cache so subsequent visits skip
 * the lookup. Called from a server action when we want to remember the
 * visitor's city.
 */
export async function rememberDetectedCity(city: string) {
  const cookieJar = await cookies();
  cookieJar.set(COOKIE_NAME, city, {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
}

/**
 * Mark the visitor as opted-out of auto-detection. Called when they pick
 * "Show all" or manually choose a city different from the detected one.
 */
export async function setGeoOptOut() {
  const cookieJar = await cookies();
  cookieJar.set(OPTOUT_COOKIE, "1", {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Case-insensitive match of a detected city name against the set of
 * cities that actually have approved creators. Returns the canonical
 * spelling from the database (so the URL query param matches the
 * filter exactly).
 */
async function matchKnownCity(detected: string): Promise<string | null> {
  if (!detected) return null;
  const normalized = detected.trim().toLowerCase();
  if (!normalized) return null;

  const rows = await prisma.creatorprofile.findMany({
    where: { status: "APPROVED" },
    select: { location: true },
    distinct: ["location"],
  });

  for (const r of rows) {
    if (r.location && r.location.toLowerCase() === normalized) {
      return r.location;
    }
  }
  return null;
}

function firstIp(forwardedFor: string | null): string | null {
  if (!forwardedFor) return null;
  return forwardedFor.split(",")[0]?.trim() || null;
}

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  // 172.16.0.0 – 172.31.255.255
  const m = ip.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Call ipapi.co with a 1500ms timeout. Free tier returns JSON with a
 * `city` field. Anything other than a clean string returns null.
 */
async function fetchIpapiCity(ip: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: controller.signal,
      // Cache on Next's data cache: same IP → one call per day max.
      next: { revalidate: 60 * 60 * 24 },
      headers: { "User-Agent": "Midnight/1.0" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { city?: string; error?: boolean };
    if (data.error) return null;
    if (typeof data.city !== "string" || !data.city.trim()) return null;
    return data.city.trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
