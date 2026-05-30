// Shared Cloudinary upload transformation builder.
//
// Two protection features applied at upload time:
//
//   1. Watermark   — auto-applied to every image (bottom-left, YamoHub-style)
//                    and every video (top-right, away from player controls).
//                    Uses the brand-logo image hosted as a Cloudinary
//                    asset under public_id `midnight_watermark`. The
//                    image-overlay route replaces the previous text-only
//                    overlay so the watermark reads as the platform's
//                    real brand mark, not as a generic typographic stamp.
//   2. Face-blur   — opt-in per upload. Cloudinary's `e_pixelate_faces` add-on
//                    detects faces server-side and pixelates them. Works
//                    great on stills; not reliable on moving video subjects
//                    (handled by the upcoming MediaPipe browser pipeline).
//
// Why a single helper: every upload path (profile avatar, post gallery /
// feed, generic API, video uploads) needs the same protection contract,
// and without a shared builder they drift in subtle ways (different
// opacity, wrong gravity, missing pixelate step). One function, one
// config; callers just say "image" or "video" + face-blur flag.

import type { UploadApiOptions } from "cloudinary";

export type MediaKind = "IMAGE" | "VIDEO";

export type FilterOptions = {
  /** Whether the asset being uploaded is an image or a video. Drives
   *  watermark position + size + which optional steps are valid (face-
   *  blur is image-only). Defaults to IMAGE so existing image-upload
   *  callers don't need to change. */
  mediaKind?: MediaKind;
  /** When true, faces in the uploaded image are pixelated by Cloudinary
   *  before being stored. Ignored for videos (Cloudinary's image-face-
   *  detector doesn't track moving faces — the browser MediaPipe pipeline
   *  handles video face blur instead). */
  faceBlur?: boolean;
  /** Skip the watermark. Almost never used; reserved for system-owned
   *  uploads (admin tooling, seed assets) that already carry our brand. */
  skipWatermark?: boolean;
};

/**
 * Cloudinary public_id of the watermark asset.
 *
 * Setup (one-time, done in the Cloudinary console):
 *   1. Open Cloudinary → Media Library → Upload.
 *   2. Drop the new brand logo (PNG with a transparent background works
 *      best — strokes/gradients survive the resize Cloudinary applies
 *      when stamping it onto larger media).
 *   3. In the upload dialog, set the Public ID to exactly the string
 *      below, no folder prefix.
 *   4. Save.
 *
 * After that, every image + video uploaded through the app picks up
 * the watermark automatically. No app deploy needed for asset swaps —
 * re-upload to the same public_id in Cloudinary and new uploads use
 * the new mark on next stamp.
 */
const WATERMARK_PUBLIC_ID = "midnight_watermark";

/**
 * Image watermark — bottom-left, ~18% of the base image width, 50% opaque.
 *
 * Position matches the YamoHub watermark pattern the brief pointed at.
 * Bottom-left feels less "stamped" than bottom-right (which the eye
 * gravitates to when scanning a photo) and reads as a brand mark, not
 * as a copyright stamp.
 *
 * `flags: "relative"` makes the width be a fraction of the base image,
 * so the watermark scales naturally between tiny avatars and large
 * gallery posts without one of the two looking absurd.
 */
const IMAGE_WATERMARK_STEP = {
  overlay: WATERMARK_PUBLIC_ID,
  // 22% of base width — bigger strokes carry the dark-red color better
  // against any photo background. With light-coloured watermarks 18%
  // is plenty; with the brand's dark-red variant the larger footprint
  // is what gives the logo readable presence.
  width: "0.22",
  flags: "relative",
  // 100 because the watermark source is the brand mark as-is (dark red
  // on transparent) and the creator preferred keeping that colour. Dark
  // strokes need every percent of opacity to read on dark photos.
  opacity: 100,
  gravity: "south_west" as const,
  x: 16,
  y: 16,
} as const;

/**
 * Video watermark — top-right, ~14% of the base width, 45% opaque.
 *
 * Different corner than the image watermark for two reasons:
 *   1. Visual variety — visitors who see both images and videos in the
 *      same session learn "watermark = brand" no matter where it lands.
 *   2. Player UX — most video players overlay their controls (play, scrub,
 *      mute, full-screen) along the bottom edge. A bottom-corner watermark
 *      would either get visually clobbered by controls or have to dodge
 *      them. Top-right stays clear.
 *
 * Slightly smaller (14% vs 18%) and slightly more transparent (45% vs 50%)
 * than the image watermark because video frames carry motion, so a smaller
 * mark still reads — and a larger one would distract from the content the
 * visitor is actually trying to watch.
 */
const VIDEO_WATERMARK_STEP = {
  overlay: WATERMARK_PUBLIC_ID,
  // Slightly smaller than the image (0.18 vs 0.22) because video frames
  // carry motion that already draws the eye — but still bigger than the
  // original 0.14 so the dark-red watermark has enough surface to read.
  width: "0.18",
  flags: "relative",
  // 100 same as the image watermark — dark strokes on motion content
  // need the full opacity budget to be legible.
  opacity: 100,
  gravity: "north_east" as const,
  x: 16,
  y: 16,
} as const;

// Face-pixelate transformation step. `e_pixelate_faces:9` = pixelate
// detected faces at strength 9 (1-200, higher = more pixelated). 9 hides
// identity reliably without making the photo look broken to other viewers.
const FACE_PIXELATE_STEP = {
  effect: "pixelate_faces:9",
} as const;

/**
 * Build the `transformation` array for a Cloudinary upload call.
 *
 * Order matters: face-blur runs BEFORE watermark so the watermark sits on
 * top of the already-blurred face (looks intentional, not censored).
 *
 * Returns `undefined` when no transformations apply, so callers can spread
 * the result without writing an empty array.
 */
export function buildUploadTransformations(
  opts: FilterOptions = {},
): UploadApiOptions["transformation"] | undefined {
  const steps: Record<string, unknown>[] = [];
  const isVideo = opts.mediaKind === "VIDEO";

  // Cloudinary's e_pixelate_faces operates on still frames; it doesn't
  // track faces across video frames. Apply it on images only. Video face
  // blur is handled by the in-browser MediaPipe pipeline before upload.
  if (opts.faceBlur && !isVideo) {
    steps.push(FACE_PIXELATE_STEP);
  }
  if (!opts.skipWatermark) {
    steps.push(isVideo ? VIDEO_WATERMARK_STEP : IMAGE_WATERMARK_STEP);
  }

  return steps.length > 0 ? (steps as UploadApiOptions["transformation"]) : undefined;
}

/**
 * Parse the boolean opt-in from a FormData entry. Tolerates HTML checkbox
 * conventions ("on", "true", "1") so the form can use either Tailwind/HTML
 * checkboxes or hidden inputs without breaking.
 */
export function readFaceBlurFlag(formValue: FormDataEntryValue | null): boolean {
  if (typeof formValue !== "string") return false;
  return ["on", "true", "1", "yes"].includes(formValue.toLowerCase().trim());
}
