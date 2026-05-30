"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/app/lib/audit";

/**
 * Ad management actions for the homepage sponsored slot.
 *
 * Scope:
 *   - HOUSE ads are admin-created via this UI (title/body/image URL/CTA).
 *   - PROMOTED_CREATOR ads are managed by the boost lifecycle — we expose
 *     them as read-only here but the only mutation path is pausing them
 *     (e.g. if a boost gets caught violating rules mid-flight).
 *
 * No editing for MVP — admin deletes and recreates if they want changes.
 * Keeps the form surface small and the audit trail unambiguous.
 *
 * Image upload is by URL only — paste a Cloudinary URL (or any URL on the
 * allowed hosts list in next.config). A future iteration can add a real
 * upload widget, but the URL-paste path covers the immediate need.
 */

// DB-checked admin gate — see app/admin/creators-pending/actions.ts.
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

const createSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().max(300).optional().nullable(),
  imageUrl: z
    .string()
    .url()
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("")),
  ctaLabel: z.string().min(2).max(40),
  ctaUrl: z.string().max(500), // relative paths allowed — no URL parser here
  priority: z.coerce.number().int().min(0).max(100),
  city: z.string().max(80).optional().nullable(),
});

export async function createHouseAd(formData: FormData) {
  const adminId = await getAdminId();
  if (!adminId) throw new Error("Forbidden");

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") || null,
    imageUrl: formData.get("imageUrl") || null,
    ctaLabel: formData.get("ctaLabel"),
    ctaUrl: formData.get("ctaUrl"),
    priority: formData.get("priority") ?? 10,
    city: formData.get("city") || null,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const data = parsed.data;

  // Same-origin requirement for ctaUrl — defends against admin-driven
  // open-redirect through the /api/ad-click handler.
  const ctaUrl = data.ctaUrl.trim();
  if (!ctaUrl.startsWith("/") || ctaUrl.startsWith("//")) {
    throw new Error("CTA URL must be a same-origin path like /become-a-member");
  }

  // No return value — server actions bound to <form action={...}> must
  // resolve to void per React's form-action type. The newly-created ad id
  // is logged to the audit trail inside the transaction; nothing else
  // consumes it on the client.
  await prisma.$transaction(async (tx) => {
    const created = await tx.ad.create({
      data: {
        kind: "HOUSE",
        status: "ACTIVE",
        priority: data.priority,
        title: data.title.trim(),
        body: data.body?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        ctaLabel: data.ctaLabel.trim(),
        ctaUrl,
        city: data.city?.trim() || null,
      },
    });
    await logAdminAction(tx, {
      adminUserId: adminId,
      action: "AD_CREATED",
      targetType: "ad",
      targetId: created.id,
      note: created.title,
      metadata: { kind: "HOUSE", priority: created.priority },
    });
  });

  revalidatePath("/admin/ads");
  revalidatePath("/");
}

async function setAdStatus(
  adId: number,
  next: "ACTIVE" | "PAUSED",
  action: "AD_PAUSED" | "AD_RESUMED",
) {
  const adminId = await getAdminId();
  if (!adminId) throw new Error("Forbidden");
  if (!Number.isInteger(adId) || adId <= 0) throw new Error("Invalid adId");

  await prisma.$transaction(async (tx) => {
    const current = await tx.ad.findUnique({
      where: { id: adId },
      select: { status: true },
    });
    if (!current) throw new Error("Ad not found");
    // Idempotent: re-pausing a paused ad is a no-op
    if (current.status === next) return;
    await tx.ad.update({ where: { id: adId }, data: { status: next } });
    await logAdminAction(tx, {
      adminUserId: adminId,
      action,
      targetType: "ad",
      targetId: adId,
    });
  });

  revalidatePath("/admin/ads");
  revalidatePath("/");
}

export async function pauseAd(formData: FormData) {
  await setAdStatus(Number(formData.get("adId")), "PAUSED", "AD_PAUSED");
}

export async function resumeAd(formData: FormData) {
  await setAdStatus(Number(formData.get("adId")), "ACTIVE", "AD_RESUMED");
}

export async function deleteAd(formData: FormData) {
  const adminId = await getAdminId();
  if (!adminId) throw new Error("Forbidden");

  const adId = Number(formData.get("adId"));
  if (!Number.isInteger(adId) || adId <= 0) throw new Error("Invalid adId");

  // Disallow deletion if the ad is currently funding an active boost —
  // boost approval set adId on the Boost row; deleting the Ad would
  // orphan that link. Pause the boost first instead.
  const linkedBoost = await prisma.boost.findFirst({
    where: { adId, status: "ACTIVE" },
    select: { id: true },
  });
  if (linkedBoost) {
    throw new Error(
      "This ad funds an active boost. End the boost first before deleting.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.ad.findUnique({
      where: { id: adId },
      select: { title: true },
    });
    if (!existing) throw new Error("Ad not found");
    await tx.ad.delete({ where: { id: adId } });
    await logAdminAction(tx, {
      adminUserId: adminId,
      action: "AD_DELETED",
      targetType: "ad",
      targetId: adId,
      note: existing.title,
    });
  });

  revalidatePath("/admin/ads");
  revalidatePath("/");
}
