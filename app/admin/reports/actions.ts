"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/app/lib/audit";

/**
 * Admin decisions on a report.
 *
 * Three outcomes:
 *   - RESOLVED_REMOVED   → policy violation confirmed. Optional `suspendCreator`
 *                          flag triggers a status flip on the underlying
 *                          creator so they immediately drop off public surfaces.
 *   - RESOLVED_NO_ACTION → admin reviewed; no violation. Report closed.
 *   - DISMISSED          → not a real report (spam, duplicate from same user).
 *
 * Each decision records the reviewing admin + timestamp + optional note
 * (visible only to admins). Note is required for the "removed" path so
 * future review knows WHY the action was taken — important for appeals.
 */

// DB-checked admin gate — see app/admin/creators-pending/actions.ts.
async function requireAdminId(): Promise<number> {
  const session = (await auth()) as { user?: { id?: string } };
  const rawId = session?.user?.id;
  if (!rawId) throw new Error("Forbidden");
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid admin session");
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Forbidden");
  return id;
}

function parseReportId(raw: FormDataEntryValue | null): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid reportId");
  return id;
}

export async function resolveReportRemoved(formData: FormData) {
  const adminId = await requireAdminId();
  const reportId = parseReportId(formData.get("reportId"));
  const note = ((formData.get("note") as string) ?? "").trim().slice(0, 500);
  const suspend = formData.get("suspendCreator") === "on";
  if (!note) {
    throw new Error("Add a short note explaining the violation.");
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { creatorprofileId: true, status: true },
  });
  if (!report) throw new Error("Report not found");
  if (report.status !== "PENDING_REVIEW") {
    throw new Error("This report is already resolved.");
  }

  // One transaction so partial state isn't possible if the creator
  // update fails. If `suspend` is off we skip the second write.
  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: reportId },
      data: {
        status: "RESOLVED_REMOVED",
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });
    if (suspend) {
      await tx.creatorprofile.update({
        where: { id: report.creatorprofileId },
        data: { status: "SUSPENDED" },
      });
    }
    await logAdminAction(tx, {
      adminUserId: adminId,
      action: "REPORT_RESOLVED_REMOVED",
      targetType: "report",
      targetId: reportId,
      note,
      metadata: {
        creatorprofileId: report.creatorprofileId,
        alsoSuspended: suspend,
      },
    });
  });

  revalidatePath("/admin/reports");
  revalidatePath("/admin/creators");
  // Suspended creator drops off the homepage + feed immediately.
  if (suspend) {
    revalidatePath("/");
    revalidatePath("/feed");
    revalidatePath(`/creator/${report.creatorprofileId}`);
  }
}

export async function resolveReportNoAction(formData: FormData) {
  const adminId = await requireAdminId();
  const reportId = parseReportId(formData.get("reportId"));
  const note = ((formData.get("note") as string) ?? "").trim().slice(0, 500);

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { status: true },
  });
  if (!report) throw new Error("Report not found");
  if (report.status !== "PENDING_REVIEW") {
    throw new Error("This report is already resolved.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: reportId },
      data: {
        status: "RESOLVED_NO_ACTION",
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: note || null,
      },
    });
    await logAdminAction(tx, {
      adminUserId: adminId,
      action: "REPORT_RESOLVED_NO_ACTION",
      targetType: "report",
      targetId: reportId,
      note: note || null,
    });
  });

  revalidatePath("/admin/reports");
}

export async function dismissReport(formData: FormData) {
  const adminId = await requireAdminId();
  const reportId = parseReportId(formData.get("reportId"));

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { status: true },
  });
  if (!report) throw new Error("Report not found");
  if (report.status !== "PENDING_REVIEW") {
    throw new Error("This report is already resolved.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: reportId },
      data: {
        status: "DISMISSED",
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });
    await logAdminAction(tx, {
      adminUserId: adminId,
      action: "REPORT_DISMISSED",
      targetType: "report",
      targetId: reportId,
    });
  });

  revalidatePath("/admin/reports");
}
