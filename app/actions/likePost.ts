"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

/**
 * Toggle a "like" on a post.
 *
 * Works for both signed-in users AND anonymous visitors — the platform's
 * business model treats visitors as first-class engagement (no account
 * required to like, contact, or browse). Before this change the action
 * threw "Unauthorized" without a session, forcing a /login redirect at
 * the exact moment the visitor expressed interest. Now:
 *
 *   - Signed-in caller  → identified by session.user.id (existing behavior).
 *   - Anonymous caller  → identified by the `vid` cookie that already
 *                         tracks visitor analytics. If the cookie isn't
 *                         set yet (first like of the session), we
 *                         generate one and persist it for a year.
 *
 * Dedup is enforced at the DB layer via the partial unique indexes on
 * (postId, userId) and (postId, visitorId) — same constraint as before
 * for users, equivalent constraint for anonymous likes.
 */
const VID_COOKIE_NAME = "vid";
const VID_MAX_AGE_SECONDS = 365 * 86_400;

type ToggleResult = { liked: boolean; count: number };

export async function toggleLikeById(postId: number): Promise<ToggleResult> {
  if (!Number.isInteger(postId) || postId <= 0) {
    throw new Error("Invalid post ID");
  }

  // Verify the post exists upfront — avoids FK errors on bad input and
  // gives a clean error message we can log instead of a Prisma surface.
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });
  if (!post) throw new Error("Post not found");

  // Identify the actor. Prefer session userId when present; otherwise fall
  // back to the visitor cookie. If neither exists, we set the cookie now
  // so the like → unlike round-trip is consistent on next call.
  const session = await auth();
  const sessionUserId = session?.user
    ? Number((session.user as { id?: string }).id)
    : NaN;
  const userId = Number.isInteger(sessionUserId) ? sessionUserId : null;

  let visitorId: string | null = null;
  if (userId === null) {
    const cookieStore = await cookies();
    visitorId = cookieStore.get(VID_COOKIE_NAME)?.value ?? null;
    if (!visitorId) {
      // First-touch — generate a stable cookie value and persist it. The
      // cookie is intentionally not httpOnly so the same value is readable
      // by any client analytics that might want to attribute behavior to
      // the same visitor later. SameSite=Lax stops cross-site CSRF.
      visitorId = randomUUID();
      cookieStore.set(VID_COOKIE_NAME, visitorId, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: VID_MAX_AGE_SECONDS,
      });
    }
  }

  // Find the actor's existing like row, if any. Two separate lookups
  // because Prisma's compound `findUnique` won't match when one of the
  // columns is null (which is the common case for visitor likes).
  let existing: { id: number } | null = null;
  if (userId !== null) {
    existing = await prisma.postlike.findFirst({
      where: { postId, userId },
      select: { id: true },
    });
  } else if (visitorId) {
    existing = await prisma.postlike.findFirst({
      where: { postId, visitorId, userId: null },
      select: { id: true },
    });
  }

  if (existing) {
    await prisma.postlike.delete({ where: { id: existing.id } });
  } else {
    await prisma.postlike.create({
      data: {
        postId,
        userId,
        visitorId,
      },
    });
  }

  const count = await prisma.postlike.count({ where: { postId } });

  // Bust the homepage cache so the LatestFeedStrip's like counts stay in
  // sync. Per-post cache busting would be more surgical but feed posts
  // surface in multiple places.
  revalidatePath("/");
  return { liked: !existing, count };
}

/**
 * Backwards-compatible FormData entrypoint (kept for any <form action={...}>
 * usages elsewhere in the app).
 */
export async function toggleLike(formData: FormData) {
  const postId = Number(formData.get("postId"));
  await toggleLikeById(postId);
}
