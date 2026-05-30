"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { approveSubscriptionById } from "./approveSubscription";
import { logAdminAction } from "@/app/lib/audit";

export async function approveSubscription(formData: FormData) {
  const session = (await auth()) as { user?: { id?: string } };
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  const adminId = Number(session.user.id);
  if (!Number.isInteger(adminId) || adminId <= 0) {
    throw new Error("Invalid admin session");
  }

  // DB-checked role — survives a stale JWT after a role change in
  // Prisma Studio. See app/admin/creators-pending/actions.ts.
  const me = await prisma.user.findUnique({
    where: { id: adminId },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const id = Number(formData.get("subscriptionId"));
  if (!id) throw new Error("Invalid subscription ID");

  // Snapshot plan + creator before approving so the audit row captures
  // what was decided, even if downstream tables change later.
  const sub = await prisma.subscription.findUnique({
    where: { id },
    select: { plan: true, creatorProfileId: true },
  });

  await approveSubscriptionById(id);

  // Log AFTER the approval (which lives in approveSubscriptionById and is
  // its own transaction). Not perfectly atomic with the approval, but the
  // alternative — refactoring approveSubscriptionById to accept a tx — is
  // a bigger change than this audit chunk warrants.
  if (sub) {
    await logAdminAction(prisma, {
      adminUserId: adminId,
      action: "SUBSCRIPTION_APPROVED",
      targetType: "subscription",
      targetId: id,
      metadata: { plan: sub.plan, creatorprofileId: sub.creatorProfileId },
    });
  }

  revalidatePath("/admin/subscriptions");
}