"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/app/lib/audit";

// DB-checked admin gate so a stale JWT (from a role change made in
// Prisma Studio after the user signed in) doesn't 403. See the comment
// in app/admin/creators-pending/actions.ts for the full rationale.
async function getAdminId(): Promise<number | null> {
  const session = (await auth()) as { user?: { id?: string } };
  const rawId = session?.user?.id;
  if (!rawId) return null;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? id : null;
}

// Admin-only verified flag toggle. The verified state is the trust badge shown
// on the creator tile and required to upgrade to VIP+. Real-world process:
// admin reviews ID off-platform (WhatsApp/email), then flips this.
export async function toggleVerified(formData: FormData) {
  const adminId = await getAdminId();
  if (!adminId) throw new Error("Forbidden");

  const id = Number(formData.get("creatorId"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid creatorId");
  }

  const current = await prisma.creatorprofile.findUnique({
    where: { id },
    select: { verified: true },
  });
  if (!current) throw new Error("Creator not found");

  const nextVerified = !current.verified;

  await prisma.$transaction(async (tx) => {
    await tx.creatorprofile.update({
      where: { id },
      data: { verified: nextVerified },
    });
    await logAdminAction(tx, {
      adminUserId: adminId,
      action: nextVerified ? "CREATOR_VERIFIED" : "CREATOR_UNVERIFIED",
      targetType: "creatorprofile",
      targetId: id,
    });
  });

  revalidatePath("/admin/creators");
}

/**
 * Suspend or restore an approved creator. Suspended creators drop off the
 * public homepage / feed / search immediately (queries filter on
 * status="APPROVED"). The creator can still log in to their dashboard —
 * we just hide them from visitors. Use this when:
 *   - A report comes in that confirms a TOS violation
 *   - Fraud / chargeback signal needs a fast block
 *   - A creator self-pauses (future: creator-facing self-pause flow)
 *
 * Restoration flips status back to APPROVED. No data is lost either way.
 */
export async function toggleSuspended(formData: FormData) {
  const adminId = await getAdminId();
  if (!adminId) throw new Error("Forbidden");

  const id = Number(formData.get("creatorId"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid creatorId");
  }

  const current = await prisma.creatorprofile.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!current) throw new Error("Creator not found");

  // Only meaningful states are APPROVED <-> SUSPENDED. We refuse to touch
  // PENDING (use the approvals queue) or REJECTED (a separate decision).
  if (current.status !== "APPROVED" && current.status !== "SUSPENDED") {
    throw new Error(
      `Can't suspend a creator in status ${current.status}. Use the approvals queue instead.`,
    );
  }

  const nextStatus =
    current.status === "SUSPENDED" ? "APPROVED" : "SUSPENDED";

  await prisma.$transaction(async (tx) => {
    await tx.creatorprofile.update({
      where: { id },
      data: { status: nextStatus },
    });
    await logAdminAction(tx, {
      adminUserId: adminId,
      action:
        nextStatus === "SUSPENDED"
          ? "CREATOR_SUSPENDED"
          : "CREATOR_RESTORED",
      targetType: "creatorprofile",
      targetId: id,
    });
  });

  revalidatePath("/admin/creators");
  // Public pages cache creator visibility — bust them so suspended
  // creators drop off (or restored ones reappear) immediately.
  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath(`/creator/${id}`);
}
