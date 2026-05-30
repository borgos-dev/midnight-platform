"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

/**
 * Admin-only review-moderation actions. Three operations:
 *
 *   - approveReviewComment(id) → COMMENT_APPROVED  (comment goes live)
 *   - rejectReviewComment(id)  → COMMENT_REJECTED  (star stays, comment hidden)
 *   - hideReview(id)           → HIDDEN            (whole review excluded
 *                                                    from average + list)
 *
 * Every call funnels through requireAdmin() which throws if the caller
 * isn't an admin session. The revalidatePath bust hits both the public
 * profile page AND the admin reviews queue so both update in one tick.
 */

async function requireAdminUserId(): Promise<number> {
  const session = await auth();
  const userId = session?.user
    ? Number((session.user as { id?: string }).id)
    : NaN;
  if (!Number.isInteger(userId)) {
    throw new Error("Unauthorized");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return userId;
}

type Result = { ok: true } | { ok: false; error: string };

async function moderateInternal(
  reviewId: number,
  newStatus: "COMMENT_APPROVED" | "COMMENT_REJECTED" | "HIDDEN",
): Promise<Result> {
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return { ok: false, error: "Invalid review id." };
  }
  const adminId = await requireAdminUserId();

  const existing = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, creatorprofileId: true },
  });
  if (!existing) return { ok: false, error: "Review not found." };

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: newStatus,
      moderatedAt: new Date(),
      moderatedByUserId: adminId,
    },
  });

  revalidatePath("/admin/reviews");
  revalidatePath(`/creator/${existing.creatorprofileId}`);
  return { ok: true };
}

export async function approveReviewComment(reviewId: number) {
  return moderateInternal(reviewId, "COMMENT_APPROVED");
}

export async function rejectReviewComment(reviewId: number) {
  return moderateInternal(reviewId, "COMMENT_REJECTED");
}

export async function hideReview(reviewId: number) {
  return moderateInternal(reviewId, "HIDDEN");
}

// FormData wrappers — let the admin queue page bind these directly to
// `action={...}` on a <form> without needing a client component or extra
// glue. Hidden input name="reviewId" carries the row id.
function parseReviewId(formData: FormData): number {
  const raw = formData.get("reviewId");
  const id = Number(raw);
  return Number.isInteger(id) ? id : NaN;
}

// Form-binding wrappers must resolve to void per React's <form action>
// contract. We swallow the Result discriminant here; the admin queue
// re-renders via revalidatePath inside moderateInternal so success/error
// state is reflected by the page reload, not by reading a return value.
export async function approveReviewCommentForm(formData: FormData): Promise<void> {
  await moderateInternal(parseReviewId(formData), "COMMENT_APPROVED");
}

export async function rejectReviewCommentForm(formData: FormData): Promise<void> {
  await moderateInternal(parseReviewId(formData), "COMMENT_REJECTED");
}

export async function hideReviewForm(formData: FormData): Promise<void> {
  await moderateInternal(parseReviewId(formData), "HIDDEN");
}
