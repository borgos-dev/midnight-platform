type GeoResult = {
  country: string | null;
  city: string | null;
};

const PRIVATE_IP_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|::1$|fc00:|fd00:)/;

/**
 * Best-effort visitor geolocation.
 *
 * Order of preference:
 *  1. Edge-platform headers (Vercel `x-vercel-ip-country` / Cloudflare `cf-ipcountry`)
 *     — no third-party call, no IP leak.
 *  2. ipapi.co over HTTPS as a fallback for self-hosted deployments.
 *
 * Never falls back to the plaintext `http://ip-api.com` service: that leaks
 * every visitor's IP to a third party and is open to MITM tampering.
 */
export async function getGeoFromRequest(req: Request): Promise<GeoResult> {
  try {
    // ── 1. Vercel edge headers
    const vCountry = req.headers.get("x-vercel-ip-country");
    const vCity = req.headers.get("x-vercel-ip-city");
    if (vCountry || vCity) {
      return {
        country: vCountry ?? null,
        city: vCity ? decodeURIComponent(vCity) : null,
      };
    }

    // ── 2. Cloudflare header
    const cfCountry = req.headers.get("cf-ipcountry");
    if (cfCountry && cfCountry !== "XX") {
      return { country: cfCountry, city: null };
    }

    // ── 3. HTTPS fallback (only if explicitly enabled)
    if (process.env.GEO_FALLBACK_ENABLED !== "true") {
      return { country: null, city: null };
    }

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? null;
    if (!ip || PRIVATE_IP_RE.test(ip)) {
      return { country: null, city: null };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    try {
      const res = await fetch(
        `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
        {
          signal: controller.signal,
          next: { revalidate: 3600 },
        }
      );
      if (!res.ok) return { country: null, city: null };
      const data = (await res.json()) as {
        country_name?: string;
        city?: string;
        error?: boolean;
      };
      if (data.error) return { country: null, city: null };
      return {
        country: data.country_name ?? null,
        city: data.city ?? null,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { country: null, city: null };
  }
}

export function getDeviceFromRequest(req: Request): string {
  const ua = req.headers.get("user-agent") ?? "";
  const isMobile = /mobile|android|iphone|ipad/i.test(ua);
  return isMobile ? "mobile" : "desktop";
}
