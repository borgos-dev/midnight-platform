// Per-creator post auto-expiry. Bounds Cloudinary storage growth without
// forcing creators to think about it — old posts simply roll off after
// the retention window defined in app/lib/plans.ts.
//
// Strategy: lazy sweep. We don't run a global cron; instead the dashboard
// upload action + media page call this for the current creator on every
// request. That way a creator's old posts are gone before they see their
// quota for the day, and inactive creators don't accumulate orphans
// indefinitely either (their content rolls off the moment they return).
//
// For Cloudinary deletion we need the publicId. The DB stores filePath as
// the full Cloudinary URL, so we extract the publicId via the canonical
// `/upload/v{n}/{publicId}.{ext}` URL shape Cloudinary has used since v1.

import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import type { AccessLevel } from "@prisma/client";
import { getPostRetentionDays } from "./plans";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Cloudinary URL → publicId. Returns null if the URL isn't a recognizable
 * Cloudinary path (e.g. legacy local-storage URLs from before the migration
 * to Cloudinary, or a manually-edited filePath). We treat null as "skip
 * Cloudinary delete; just remove the DB row" so a malformed URL doesn't
 * stop the sweep.
 *
 * The publicId includes the folder ("midnight/posts/abc123") and excludes
 * the file extension. Cloudinary's destroy() takes that shape directly.
 */
function publicIdFromCloudinaryUrl(url: string): string | null {
  // Anchors on "/upload/" (the canonical delivery path) and grabs
  // everything after the optional version segment, minus the final
  // extension. Matches both image and video URLs.
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
  return match ? match[1] : null;
}

/**
 * Delete every post (and its media + Cloudinary objects) for the given
 * creator that's older than their tier's retention window. Cloudinary
 * deletes are best-effort — if one fails we still drop the DB row so the
 * count is accurate. Cloudinary's own cleanup pass eventually catches
 * orphaned assets, and we'd rather have an extra unused asset than a
 * stuck post that should be gone.
 */
export async function expireOldPostsForCreator(
  creatorprofileId: number,
  tier: AccessLevel,
): Promise<{ deletedCount: number }> {
  const retentionDays = getPostRetentionDays(tier);
  const cutoff = new Date(Date.now() - retentionDays * MS_PER_DAY);

  const expired = await prisma.post.findMany({
    where: {
      // Post's FK to creatorprofile is named `creatorId` (the post model
      // pre-dates the codebase-wide `creatorprofileId` convention used on
      // newer tables like Review, Report, Boost). Keep this aligned with
      // the schema, not the convention.
      creatorId: creatorprofileId,
      createdAt: { lt: cutoff },
    },
    select: {
      id: true,
      media: {
        select: { kind: true, filePath: true },
      },
    },
  });

  if (expired.length === 0) return { deletedCount: 0 };

  // Delete Cloudinary assets first. Doing it before the DB delete means
  // a mid-sweep crash leaves us with an orphan in Cloudinary at worst —
  // never an orphan DB row pointing to a deleted asset.
  //
  // try/catch wraps the destroy() call because the Cloudinary SDK can
  // throw SYNCHRONOUSLY when config is missing (no env vars set), and a
  // bare .catch() chained on the promise wouldn't intercept that. We'd
  // rather log + continue than tank the page render.
  for (const post of expired) {
    for (const m of post.media) {
      const publicId = publicIdFromCloudinaryUrl(m.filePath);
      if (!publicId) continue;
      try {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: m.kind === "VIDEO" ? "video" : "image",
        });
      } catch {
        // Swallow — the DB row will still be removed below. Cloudinary
        // errors (missing config, asset already purged, network blip)
        // all land here and don't stop the sweep.
      }
    }
  }

  // Cascade in the schema drops the media rows when we delete the post.
  await prisma.post.deleteMany({
    where: { id: { in: expired.map((p) => p.id) } },
  });

  return { deletedCount: expired.length };
}
