// app/dashboard/profile/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import cloudinary from "@/lib/cloudinary";
import {
  buildUploadTransformations,
  readFaceBlurFlag,
} from "@/lib/cloudinary-transforms";
import { getCurrentUserId } from "@/app/lib/auth-helpers";
import { isValidCameroonCity } from "@/app/lib/cities";

const AVATAR_ALLOWED_MIME: Record<string, true> = {
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
};
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

// E.164-ish phone validation: optional leading +, 7–15 digits
const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

async function uploadAvatarToCloudinary(
  file: File,
  filters: { faceBlur?: boolean } = {},
): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  // Avatar pipeline is two-stage: (1) crop+resize to a 512² face-centered
  // square (the original deterministic-shape step), then (2) the shared
  // protection chain — face-blur (opt-in) followed by watermark. Order
  // matters: blur must run AFTER the face-centered crop so the pixelation
  // lands on the actual face, not empty corners.
  const protectionSteps =
    buildUploadTransformations(filters) as Array<Record<string, unknown>> | undefined;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "midnight/avatars",
    resource_type: "image",
    transformation: [
      { width: 512, height: 512, crop: "fill", gravity: "face" },
      ...(protectionSteps ?? []),
    ],
    overwrite: false,
    invalidate: true,
  });
  return result.secure_url;
}

export async function updateProfile(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const displayName = (formData.get("displayName") as string)?.trim();
  const bio = (formData.get("bio") as string)?.trim() || null;
  const location = (formData.get("location") as string)?.trim() || null;
  const neighborhood = (formData.get("neighborhood") as string)?.trim() || null;
  const whatsappRaw = (formData.get("whatsappNumber") as string)?.trim() || "";

  if (!displayName || displayName.length < 2) {
    throw new Error("Display name must be at least 2 characters.");
  }
  if (displayName.length > 80) {
    throw new Error("Display name must be at most 80 characters.");
  }
  if (bio && bio.length > 500) {
    throw new Error("Bio must be at most 500 characters.");
  }
  if (location && !isValidCameroonCity(location)) {
    // The profile editor renders city as a fixed dropdown; this catches
    // anyone bypassing the UI (e.g. crafting a request directly).
    throw new Error("Please pick a valid city from the list.");
  }
  if (neighborhood && neighborhood.length > 80) {
    throw new Error("Neighborhood must be at most 80 characters.");
  }

  let whatsappNumber: string | null = null;
  if (whatsappRaw) {
    if (!PHONE_RE.test(whatsappRaw)) {
      throw new Error("Invalid WhatsApp number. Use international format, e.g. +237...");
    }
    whatsappNumber = whatsappRaw;
  }

  // Avatar upload via Cloudinary (no local disk writes — eliminates path traversal + SVG XSS).
  // `avatarFaceBlur` is the per-upload privacy opt-in surfaced by the
  // profile form; universal across all tiers.
  const avatarFile = formData.get("avatar") as File | null;
  const avatarFaceBlur = readFaceBlurFlag(formData.get("avatarFaceBlur"));
  let avatarUrl: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    if (!AVATAR_ALLOWED_MIME[avatarFile.type]) {
      throw new Error("Avatar must be JPG, PNG, or WebP.");
    }
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      throw new Error("Avatar must be under 5MB.");
    }
    avatarUrl = await uploadAvatarToCloudinary(avatarFile, {
      faceBlur: avatarFaceBlur,
    });
  }

  // Resolve the creator's profile row up-front — we need the id for both
  // the scalar update and the category join rewrites below.
  const profile = await prisma.creatorprofile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) throw new Error("Profile not found.");

  // Category selection — submitted as multiple `categorySlugs` fields by the
  // CategoryPicker's hidden checkboxes. Validate against the live Category
  // table so a malicious client can't insert join rows for nonexistent
  // categories (FK constraint would also catch this, but we error nicely).
  const submittedSlugs = formData.getAll("categorySlugs") as string[];
  const MAX_CATEGORIES = 5;
  if (submittedSlugs.length > MAX_CATEGORIES) {
    throw new Error(`Pick at most ${MAX_CATEGORIES} categories.`);
  }
  const cleanedSlugs = Array.from(
    new Set(
      submittedSlugs.filter(
        (s): s is string => typeof s === "string" && s.length > 0 && s.length <= 64,
      ),
    ),
  );
  const validCategories = cleanedSlugs.length
    ? await prisma.category.findMany({
        where: { slug: { in: cleanedSlugs } },
        select: { id: true },
      })
    : [];

  // Custom free-text tags — visitor-facing chips on the public profile.
  // Capped server-side (10 tags, 30 chars each, deduped, trimmed) so a
  // tampered client can't spam the field. Stored as JSON because there's
  // no need to query / index them — they're decoration only.
  const MAX_TAGS = 10;
  const MAX_TAG_LEN = 30;
  const submittedTagsRaw = formData.getAll("customTags") as string[];
  const cleanedTags = Array.from(
    new Set(
      submittedTagsRaw
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter((t) => t.length > 0 && t.length <= MAX_TAG_LEN),
    ),
  ).slice(0, MAX_TAGS);

  // Apply everything in one transaction so a half-saved profile + half-saved
  // category list can't happen if one query fails.
  await prisma.$transaction([
    prisma.creatorprofile.update({
      where: { userId },
      data: {
        displayName,
        bio,
        location,
        neighborhood,
        whatsappNumber,
        customTags: cleanedTags.length > 0 ? cleanedTags : Prisma.DbNull,
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    }),
    prisma.creatorCategory.deleteMany({
      where: { creatorprofileId: profile.id },
    }),
    ...(validCategories.length > 0
      ? [
          prisma.creatorCategory.createMany({
            data: validCategories.map((c) => ({
              creatorprofileId: profile.id,
              categoryId: c.id,
            })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  // The public profile page renders the active filter pills based on this
  // creator's categories, so invalidate it too.
  revalidatePath(`/creator/${profile.id}`);
  // Homepage category counts include this creator — bust those caches.
  revalidatePath("/");
}
