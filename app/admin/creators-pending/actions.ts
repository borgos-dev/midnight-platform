"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/app/lib/audit";

/**
 * Approval queue actions.
 *
 * Why two distinct actions instead of one with a "decision" param:
 *   - Approve has no extra payload — atomic decision, can be a one-button
 *     submit with just the creatorId.
 *   - Reject takes a reason that the creator may eventually be shown
 *     ("Your profile photo violates ID requirements") and needs a small
 *     text input. Splitting keeps the form schemas clean.
 *
 * Audit pattern:
 *   - Each decision records (approvedBy/At) or (rejectedBy/At + reason).
 *   - The opposing field is reset to null so a reversed decision doesn't
 *     leave stale data. Useful for the "applied wrong" flow if we ever
 *     add an "undo" button.
 *
 * Reuse hook for Phase 2:
 *   - When payment APIs replace the manual subscription-approval queue,
 *     those actions can write to the same `approvedBy/At` columns,
 *     leaving `approvedBy = null` (system-approved) and a sentinel value
 *     like `approvedAt = now()`.
 */

/**
 * Admin gate that validates against the DB, not the session token.
 *
 * Why DB-side: NextAuth's JWT is signed at login and frozen — if an
 * admin's role changed in the DB AFTER they signed in (e.g. you flip
 * `role` to ADMIN in Prisma Studio), the token still carries the OLD
 * role until they log out and back in. The /admin layout already does
 * a DB lookup, so admin pages render correctly — but actions that
 * trusted the token would 403 even though the user is a real admin.
 *
 * Re-checking the DB on every action costs one indexed `user.role` lookup
 * (~1ms). Cheap, and makes the system pleasant to use during dev.
 */
async function requireAdminId(): Promise<number> {
  const session = (await auth()) as { user?: { id?: string } };
  const rawId = session?.user?.id;
  if (!rawId) throw new Error("Forbidden");

  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid admin session");
  }

  // Authoritative role check — survives a stale JWT.
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Forbidden");

  return id;
}

function parseCreatorId(raw: FormDataEntryValue | null): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid creatorId");
  }
  return id;
}

export async function approveCreator(formData: FormData) {
  const adminId = await requireAdminId();
  const creatorId = parseCreatorId(formData.get("creatorId"));

  const existing = await prisma.creatorprofile.findUnique({
    where: { id: creatorId },
    select: { status: true },
  });
  if (!existing) throw new Error("Creator not found");
  // Idempotent — re-approving an already-approved creator is a no-op
  // rather than an error. Keeps double-click safe.
  if (existing.status === "APPROVED") {
    revalidatePath("/admin/creators-pending");
    return;
  }

  // Atomic: status flip + audit row in one transaction so the log is
  // always in sync with reality. Same pattern across every admin action.
  await prisma.$transaction(async (tx) => {
    await tx.creatorprofile.update({
      where: { id: creatorId },
      data: {
        status: "APPROVED",
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
      },
    });
    await logAdminAction(tx, {
      adminUserId: adminId,
      action: "CREATOR_APPROVED",
      targetType: "creatorprofile",
      targetId: creatorId,
    });
  });

  revalidatePath("/admin/creators-pending");
  // The newly-approved creator will now show up on public surfaces — bust
  // homepage + feed caches so admin sees their work reflected immediately.
  revalidatePath("/");
  revalidatePath("/feed");
}

export async function rejectCreator(formData: FormData) {
  const adminId = await requireAdminId();
  const creatorId = parseCreatorId(formData.get("creatorId"));
  const reasonRaw = (formData.get("reason") as string | null) ?? "";
  const reason = reasonRaw.trim().slice(0, 500);
  if (!reason) {
    throw new Error("Rejection reason is required.");
  }

  const existing = await prisma.creatorprofile.findUnique({
    where: { id: creatorId },
    select: { status: true },
  });
  if (!existing) throw new Error("Creator not found");

  await prisma.$transaction(async (tx) => {
    await tx.creatorprofile.update({
      where: { id: creatorId },
      data: {
        status: "REJECTED",
        rejectedBy: adminId,
        rejectedAt: new Date(),
        rejectionReason: reason,
        // Clear approval audit if this is reversing a previous mistake.
        approvedBy: null,
        approvedAt: null,
      },
    });
    await logAdminAction(tx, {
      adminUserId: adminId,
      action: "CREATOR_REJECTED",
      targetType: "creatorprofile",
      targetId: creatorId,
      note: reason,
    });
  });

  revalidatePath("/admin/creators-pending");
}
