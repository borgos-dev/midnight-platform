"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MediaKind, PostType } from "@prisma/client";
import cloudinary from "@/lib/cloudinary";
import {
  buildUploadTransformations,
  readFaceBlurFlag,
} from "@/lib/cloudinary-transforms";
import { enforceSubscriptionStatus } from "@/app/lib/subscription";
import { checkVideoDuration } from "@/app/lib/video-limits";
import { getDailyPostQuota, getDailyVideoQuota } from "@/app/lib/plans";
import { startOfToday } from "@/lib/analytics";
import { expireOldPostsForCreator } from "@/app/lib/post-retention";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_GALLERY_FILES = 6;

// Upload a single file to Cloudinary with the platform watermark + optional
// face pixelate. Videos skip face-blur for now — Cloudinary's video face
// effects are unreliable on moving subjects; the MediaPipe browser pipeline
// (Chunk 17b) takes over for videos.
async function uploadToCloudinary(
  file: File,
  folder: string,
  filters: { faceBlur?: boolean },
): Promise<{ url: string; publicId: string; duration?: number }> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  const isImage = file.type.startsWith("image/");
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "auto", // handles images and videos
    quality: "auto",       // auto optimize
    fetch_format: "auto",  // serve best format
    transformation: buildUploadTransformations({
      // mediaKind drives watermark position (image: bottom-left,
      // video: top-right).
      mediaKind: isImage ? "IMAGE" : "VIDEO",
      // Face-pixelate only applies to still images. The MediaPipe browser
      // pipeline (Chunk 17c) handles the un-blurred parts of video on the
      // creator's device, so by the time the file gets here the blur is
      // already baked in.
      faceBlur: filters.faceBlur && isImage,
    }),
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    // Cloudinary returns `duration` on video uploads only — the truth value
    // for tier-cap enforcement (clients can lie about durations).
    duration: typeof result.duration === "number" ? result.duration : undefined,
  };
}

export async function uploadPost(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = Number(session.user.id);

  // Check email verification
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    throw new Error("Account unavailable");
  }
  if (!user.emailVerified) {
    throw new Error("Verify your email before posting");
  }

  // Make tier reflect reality before any tier-gated decision (blur is VIP+)
  await enforceSubscriptionStatus(userId);

  // Get creator profile (userId is unique, use findUnique)
  const creator = await prisma.creatorprofile.findUnique({
    where: { userId },
  });

  if (!creator) {
    throw new Error("Creator profile not found");
  }

  const tierLabel =
    creator.tier === "VIP_PLUS"
      ? "VIP+"
      : creator.tier === "VIP"
        ? "VIP"
        : creator.tier === "PREMIUM"
          ? "Premium"
          : "Regular";

  // ── Retention sweep ────────────────────────────────────────────────────
  // Drop expired posts BEFORE counting today's usage so a creator who
  // returns after a long absence gets their old content rolled off and
  // their slate cleared. Cloudinary deletes happen here too. Best-effort:
  // if Cloudinary errors, the DB row still goes — see post-retention.ts.
  // Wrapped in try/catch so a sweep failure can't block the actual upload.
  try {
    await expireOldPostsForCreator(creator.id, creator.tier);
  } catch (err) {
    console.error("[upload] expireOldPostsForCreator failed:", err);
  }

  // ── Daily post quota ──────────────────────────────────────────────────
  // Cap is per `post` row — a gallery with 6 images counts as 1. Counter
  // is shared between GALLERY and FEED so the rule reads as "X posts a
  // day," not "X galleries + X feed posts." Check happens BEFORE any
  // Cloudinary work so a blocked upload doesn't waste storage + bandwidth.
  const dailyCap = getDailyPostQuota(creator.tier);
  const dayStart = startOfToday();
  const postsToday = await prisma.post.count({
    where: {
      // post.creatorId — schema-specific (not `creatorprofileId`).
      creatorId: creator.id,
      createdAt: { gte: dayStart },
    },
  });
  if (postsToday >= dailyCap) {
    throw new Error(
      `Daily limit reached — your ${tierLabel} plan allows ${dailyCap} post${dailyCap === 1 ? "" : "s"} per day. Upgrade for more, or come back tomorrow.`,
    );
  }

  // Get form fields
  const title = formData.get("title") as string;
  const content = formData.get("content") as string | null;
  const accessLevel = formData.get("accessLevel") as
    | "REGULAR"
    | "VIP"
    | "VIP_PLUS";
  const blurred = formData.get("blurred") === "on";
  // VIP+ tease-blur intensity (px applied by the public renderer when a
  // viewer is below the post's access level). Range 4..16. Clamped on
  // the server side because the slider is client-controlled and the
  // request body can be forged. Default 8 if missing/invalid.
  const rawBlurIntensity = Number(formData.get("blurIntensity"));
  // Range 4..25. Lower values let more motion show through (light tease);
  // upper bound was raised from 16 → 25 so creators can reach a near-opaque
  // block when they want maximum mystery. Default 8 keeps the sweet spot
  // for new posts that didn't set a value.
  const blurIntensity = Number.isFinite(rawBlurIntensity)
    ? Math.min(25, Math.max(4, Math.round(rawBlurIntensity)))
    : 8;
  // Per-post WhatsApp lock-overlay toggle. Only meaningful when the post
  // is blurred — for unblurred posts there's no preview to overlay anyway.
  // The form sends "on" when the box is ticked (browsers omit the field
  // when unchecked), and we treat any absent/false value as "no lock so
  // visitors tap to the profile instead of WhatsApp."
  const showLock = formData.get("showLock") === "on";
  // Privacy filter (per-upload opt-in). Distinct from `blurred` above:
  // - `blurred`     = tier-gated VIP+ "locked preview" effect on the whole post
  // - `faceBlur`    = creator-side privacy filter that pixelates the face in
  //                   each uploaded image. Universal — available to every tier.
  const faceBlur = readFaceBlurFlag(formData.get("faceBlur"));
  const postType = (formData.get("postType") as string) || "FEED";

  // Collect all files
  const files = formData.getAll("file") as File[];
  const validFiles = files.filter((f) => f && f.size > 0);

  if (validFiles.length === 0) {
    throw new Error("At least one file is required");
  }

  // ── Video gates ────────────────────────────────────────────────────────
  // Regular tier can't upload videos at all (storage protection — videos
  // are ~10-100x bigger than images). Paid tiers get a daily video
  // sub-cap inside the total post quota. Both checks happen before any
  // Cloudinary work for the same reason as the post-quota check above.
  const postContainsVideo = validFiles.some((f) =>
    f.type.startsWith("video/"),
  );
  if (postContainsVideo && creator.tier === "REGULAR") {
    throw new Error(
      "Videos are a paid feature — upgrade to Premium or higher to post videos.",
    );
  }
  if (postContainsVideo) {
    const videoCap = getDailyVideoQuota(creator.tier);
    const videosToday = await prisma.post.count({
      where: {
        // post.creatorId, not creatorprofileId — schema-specific.
        creatorId: creator.id,
        createdAt: { gte: dayStart },
        // A "video post" is a post that contains at least one video media
        // row. Matches how we count below — and matches the meter that
        // the upload UI shows the creator.
        media: { some: { kind: "VIDEO" } },
      },
    });
    if (videosToday >= videoCap) {
      throw new Error(
        `Video limit reached — your ${tierLabel} plan allows ${videoCap} video${videoCap === 1 ? "" : "s"} per day. You can still post images.`,
      );
    }
  }

  // Gallery validation
  if (postType === "GALLERY") {
    if (validFiles.length < 1 || validFiles.length > MAX_GALLERY_FILES) {
      throw new Error(`Gallery accepts 1 to ${MAX_GALLERY_FILES} images`);
    }
    for (const f of validFiles) {
      if (!f.type.startsWith("image/")) {
        throw new Error("Gallery only accepts images not videos");
      }
    }
  }

  // Validate file types and sizes
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
  ];

  for (const f of validFiles) {
    if (!validTypes.includes(f.type)) {
      throw new Error(
        `"${f.name}" is not supported. Use JPG, PNG, WebP, MP4 or MOV`
      );
    }

    const maxSize = f.type.startsWith("video")
      ? MAX_VIDEO_SIZE
      : MAX_IMAGE_SIZE;

    if (f.size > maxSize) {
      throw new Error(
        `"${f.name}" is too large. Max size is ${
          f.type.startsWith("video") ? "100MB" : "10MB"
        }`
      );
    }
  }

  // Create the post first
  const post = await prisma.post.create({
    data: {
      creatorId: creator.id,
      title,
      content,
      accessLevel,
      blurred: creator.tier === "VIP_PLUS" ? blurred : false,
      // Persist the creator-chosen tease level only when blur is actually
      // on AND the creator is VIP+; everyone else falls back to the DB
      // default. Storing it always (even for non-blurred posts) keeps the
      // column non-null and simplifies the render path which doesn't need
      // a special-case for missing values.
      blurIntensity:
        creator.tier === "VIP_PLUS" && blurred ? blurIntensity : 8,
      // Lock overlay is only meaningful when the post is actually blurred.
      // For non-blurred posts we store TRUE so a creator who later flips
      // `blurred` on (via the post-management toggle) gets the default
      // lock behavior; explicit opt-out only persists when blur is on.
      showLock:
        creator.tier === "VIP_PLUS" && blurred ? showLock : true,
      postType: postType as PostType,
    },
  });

  // Upload all files to Cloudinary and save to DB
  for (const file of validFiles) {
    try {
      // Upload to Cloudinary — every file carries the platform watermark,
      // and stills get face-pixelated when the creator opted in above.
      const { url, publicId, duration } = await uploadToCloudinary(
        file,
        "midnight/posts",
        { faceBlur },
      );

      // Tier cap on video duration. Cloudinary reports the authoritative
      // duration AFTER upload, so we check here and roll back if the
      // creator submitted a clip longer than their tier allows. Doing it
      // post-upload (vs. pre-upload client-side) means a tampered duration
      // header can't bypass the cap.
      if (file.type.startsWith("video") && typeof duration === "number") {
        const overshoot = checkVideoDuration(duration, creator.tier);
        if (overshoot) {
          await cloudinary.uploader
            .destroy(publicId, { resource_type: "video" })
            .catch(() => {});
          await prisma.post.delete({ where: { id: post.id } });
          throw new Error(overshoot);
        }
      }

      // Save media record with Cloudinary URL
      await prisma.media.create({
        data: {
          creatorId: creator.id,
          postId: post.id,
          kind: file.type.startsWith("video")
            ? MediaKind.VIDEO
            : MediaKind.IMAGE,
          filePath: url,       // Cloudinary URL
          mimeType: file.type,
          sizeBytes: file.size,
        },
      });

    } catch (uploadError) {
      // If upload fails delete the post and stop
      await prisma.post.delete({ where: { id: post.id } });
      const reason = uploadError instanceof Error ? uploadError.message : String(uploadError);
      throw new Error(
        `Failed to upload "${file.name}": ${reason}`
      );
    }
  }

  redirect("/dashboard/media");
}