"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import { MediaKind, PostType } from "@prisma/client";

const MAX_SIZE = 50 * 1024 * 1024;
const MAX_GALLERY_FILES = 6;

export async function uploadPost(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const creator = await prisma.creatorprofile.findFirst({
    where: { userId: Number(session.user.id) },
  });

  if (!creator) {
    throw new Error("Creator profile not found");
  }

  const title = formData.get("title") as string;
  const content = formData.get("content") as string | null;
  const accessLevel = formData.get("accessLevel") as
    | "REGULAR"
    | "VIP"
    | "VIP_PLUS";

  const blurred = formData.get("blurred") === "on";
  const postType = (formData.get("postType") as string) || "FEED";

  // Collect all files
  const files = formData.getAll("file") as File[];
  const validFiles = files.filter((f) => f && f.size > 0);

  if (validFiles.length === 0) throw new Error("At least one file is required");

  // Gallery: enforce 4-6 images only, no video
  if (postType === "GALLERY") {
    if (validFiles.length < 1 || validFiles.length > MAX_GALLERY_FILES) {
      throw new Error(`Gallery accepts 1 to ${MAX_GALLERY_FILES} images`);
    }
    for (const f of validFiles) {
      if (!f.type.startsWith("image/")) {
        throw new Error("Gallery only accepts images, not videos");
      }
    }
  }

  // Feed: single file (image or video)
  if (postType === "FEED" && validFiles.length > 1) {
    // Allow multi-image in feed too
  }

  // Validate all file sizes
  for (const f of validFiles) {
    if (f.size > MAX_SIZE) {
      throw new Error(`File "${f.name}" is too large (max 50MB)`);
    }
  }

  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Create the post
  const post = await prisma.post.create({
    data: {
      creatorId: creator.id,
      title,
      content,
      accessLevel,
      blurred: creator.tier === "VIP_PLUS" ? blurred : false,
      postType: postType as PostType,
    },
  });

  // Save all files as media
  for (const file of validFiles) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s/g, "_")}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;

    await prisma.media.create({
      data: {
        creatorId: creator.id,
        postId: post.id,
        kind: file.type.startsWith("video")
          ? MediaKind.VIDEO
          : MediaKind.IMAGE,
        filePath: publicUrl,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });
  }

  redirect("/dashboard/media");
}