// Shape a Cloudinary delivery URL so it plays in every browser.
//
// Background: the upload action sends `fetch_format: "auto"` to Cloudinary,
// but that flag only applies to *delivery* URLs — the stored asset is the
// original codec. iPhones default to HEVC/H.265, which Chrome on Windows
// can't decode, so a `<video src=...mov>` from such a post renders as a
// silent black box.
//
// The fix is purely URL-level: insert `f_mp4,vc_h264` between `/upload/`
// and the asset path. Cloudinary transcodes on first request and caches.
// No re-upload, no schema change, works for every existing post.

const CLOUDINARY_UPLOAD_TOKEN = "/upload/";

/**
 * Force a browser-safe codec on Cloudinary video URLs. No-op for images
 * (their `fetch_format=auto` on delivery already handles WebP/AVIF/JPEG
 * fallback at the browser level) and no-op for non-Cloudinary URLs so a
 * stray external URL passes through untouched.
 */
export function browserSafeMediaUrl(
  url: string | null | undefined,
  kind: "VIDEO" | "IMAGE" | null | undefined,
): string {
  if (!url) return "";
  if (kind !== "VIDEO") return url;
  if (!url.includes(CLOUDINARY_UPLOAD_TOKEN)) return url;
  // Don't double-stamp if a transform already exists at the head of the
  // path (Cloudinary URLs put delivery transforms right after /upload/).
  if (url.includes("/upload/f_mp4") || url.includes("/upload/vc_h264")) {
    return url;
  }
  return url.replace(CLOUDINARY_UPLOAD_TOKEN, `${CLOUDINARY_UPLOAD_TOKEN}f_mp4,vc_h264/`);
}

/**
 * Server-side protection for LOCKED / blurred-tease media.
 *
 * The old behaviour shipped the original Cloudinary URL to non-entitled
 * visitors and relied on a CSS `blur()` filter to hide the content. That is
 * cosmetic only — anyone could open the URL (or read it from the DOM /
 * network tab) and get the full-resolution original. This rewrites the
 * delivery URL so Cloudinary bakes a heavy, destructive Gaussian blur +
 * heavy downscale + quality drop into the *delivered bytes*, so the file the
 * browser receives genuinely contains no recoverable detail. The CSS blur in
 * the renderer stays on top as the visual tease.
 *
 * IMPORTANT (residual risk / required config): Cloudinary URLs are
 * predictable — an attacker who sees the blurred derivative URL can strip the
 * `e_blur:.../` transform segment and request the untransformed original
 * UNLESS the account is locked down. To make this protection complete you
 * MUST enable, in the Cloudinary console:
 *   • Settings → Security → "Strict transformations" (block un-allowed
 *     derived URLs), and deliver locked media via signed URLs; OR
 *   • mark the originals as `access_mode: authenticated` and only ever serve
 *     signed, transformed derivatives.
 * This helper raises the bar from "trivial" to "needs deliberate effort";
 * the console setting closes it entirely. See SECURITY_AUDIT.md.
 */
export function lockedPreviewUrl(
  url: string | null | undefined,
  kind: "VIDEO" | "IMAGE" | null | undefined,
): string {
  if (!url) return "";
  // Can only transform Cloudinary-delivered assets. A non-Cloudinary URL
  // can't be protected at this layer — callers must gate it some other way.
  if (!url.includes(CLOUDINARY_UPLOAD_TOKEN)) return "";
  // Already protected — don't double-stamp.
  if (url.includes("/upload/e_blur")) return url;
  // e_blur:2000 is Cloudinary's maximum Gaussian blur; w_400 throws away
  // resolution; q_auto:low crushes quality. The combination makes the
  // delivered derivative useless for reconstructing the original while still
  // conveying "there is content here" for the tease.
  const transform = "e_blur:2000,q_auto:low,w_400";
  const out = url.replace(
    CLOUDINARY_UPLOAD_TOKEN,
    `${CLOUDINARY_UPLOAD_TOKEN}${transform}/`,
  );
  // Compose with the browser-safe codec rewrite for videos so HEVC still
  // plays. (browserSafeMediaUrl is a no-op for images.)
  return browserSafeMediaUrl(out, kind);
}
