"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import {
  MIN_RATING,
  MAX_RATING,
  COMMENT_MAX_LENGTH,
} from "@/app/lib/reviews-config";

const VID_COOKIE_NAME = "vid";
const VID_MAX_AGE_SECONDS = 365 * 86_400;

/**
 * Submit OR update a visitor's review for a creator.
 *
 * Behavior:
 *   - Anonymous visitor identified by the `vid` cookie (same one used by
 *     likes + analytics). Created if missing.
 *   - One review per (creator, visitor). A second submit edits the existing
 *     review's rating + comment + status (resets moderation).
 *   - Rating clamped to [MIN_RATING, MAX_RATING] before write.
 *   - Comment trimmed; if empty, stored as null. If non-empty, status is
 *     LIVE (star shows) but the comment is held back until the
 *     admin moderates → COMMENT_APPROVED.
 *
 * Returns: { ok: true, status } on success, { ok: false, error } on validation
 * failure. Never throws — UI shows the error inline.
 */
type SubmitResult =
  | { ok: true; pendingComment: boolean }
  | { ok: false; error: string };

export async function submitReview(
  creatorprofileId: number,
  rating: number,
  rawComment: string,
): Promise<SubmitResult> {
  // 1. Validate creator exists + is APPROVED. Anonymous visitors should
  //    never be able to leave a review on a PENDING / REJECTED creator
  //    (they can't see the profile anyway, but defense in depth).
  if (!Number.isInteger(creatorprofileId) || creatorprofileId <= 0) {
    return { ok: false, error: "Invalid creator." };
  }
  const creator = await prisma.creatorprofile.findUnique({
    where: { id: creatorprofileId },
    select: { id: true, status: true },
  });
  if (!creator || creator.status !== "APPROVED") {
    return { ok: false, error: "Creator not found." };
  }

  // 2. Clamp rating. The form picker constrains visually but a forged
  //    request body could send anything.
  const clampedRating = Math.min(
    MAX_RATING,
    Math.max(MIN_RATING, Math.round(rating)),
  );

  // 3. Normalize comment. Empty / whitespace-only → null.
  const trimmed = String(rawComment ?? "").trim();
  if (trimmed.length > COMMENT_MAX_LENGTH) {
    return {
      ok: false,
      error: `Comment is too long (max ${COMMENT_MAX_LENGTH} characters).`,
    };
  }
  const comment = trimmed.length > 0 ? trimmed : null;

  // 4. Identify the actor. Prefer logged-in session userId for signed-in
  //    creators leaving reviews on peers (rare but possible); otherwise
  //    fall back to the visitor cookie and set it if missing.
  const session = await auth();
  const sessionUserId = session?.user
    ? Number((session.user as { id?: string }).id)
    : NaN;
  const isAuthed = Number.isInteger(sessionUserId);

  let visitorId: string;
  const cookieStore = await cookies();
  const existingVid = cookieStore.get(VID_COOKIE_NAME)?.value;
  if (isAuthed) {
    // Authed reviewer — use a stable prefix so peer reviews from creators
    // can be distinguished from visitor reviews if we ever need to.
    visitorId = `user:${sessionUserId}`;
  } else if (existingVid) {
    visitorId = existingVid;
  } else {
    visitorId = randomUUID();
    cookieStore.set(VID_COOKIE_NAME, visitorId, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VID_MAX_AGE_SECONDS,
    });
  }

  // 5. Self-review check. A creator viewing their own profile while signed
  //    in should not be allowed to inflate their own rating.
  if (isAuthed) {
    const ownProfile = await prisma.creatorprofile.findUnique({
      where: { id: creatorprofileId },
      select: { userId: true },
    });
    if (ownProfile?.userId === sessionUserId) {
      return {
        ok: false,
        error: "You can't review your own profile.",
      };
    }
  }

  // 6. Upsert. New submission OR edit by the same visitor. When the
  //    comment changes we reset status to LIVE so the moderator queue
  //    sees the new text (a previously-approved comment shouldn't ride
  //    through unmoderated edits).
  const hasComment = comment !== null;
  await prisma.review.upsert({
    where: {
      creatorprofileId_visitorId: {
        creatorprofileId,
        visitorId,
      },
    },
    create: {
      creatorprofileId,
      visitorId,
      rating: clampedRating,
      comment,
      status: "LIVE", // Star is live immediately; comment (if any) pending.
    },
    update: {
      rating: clampedRating,
      comment,
      status: "LIVE", // Edit resets moderation
      moderatedAt: null,
      moderatedByUserId: null,
    },
  });

  // 7. Bust the profile page cache so the rating updates on next view.
  revalidatePath(`/creator/${creatorprofileId}`);
  return { ok: true, pendingComment: hasComment };
}

/**
 * Look up the calling visitor's existing review for a creator, if any.
 * Used to pre-fill the review form on the profile page so a visitor can
 * see + edit their own past review.
 */
export async function getMyReviewForCreator(
  creatorprofileId: number,
): Promise<{
  rating: number;
  comment: string | null;
} | null> {
  const session = await auth();
  const sessionUserId = session?.user
    ? Number((session.user as { id?: string }).id)
    : NaN;
  const isAuthed = Number.isInteger(sessionUserId);

  let visitorId: string | null = null;
  if (isAuthed) {
    visitorId = `user:${sessionUserId}`;
  } else {
    const cookieStore = await cookies();
    visitorId = cookieStore.get(VID_COOKIE_NAME)?.value ?? null;
  }
  if (!visitorId) return null;

  const row = await prisma.review.findUnique({
    where: {
      creatorprofileId_visitorId: { creatorprofileId, visitorId },
    },
    select: { rating: true, comment: true },
  });
  return row;
}
