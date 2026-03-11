"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AccessLevel } from "@prisma/client";
import fs from "fs";
import path from "path";

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

async function getCreatorOwnedPost(postId: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const creator = await prisma.creatorprofile.findUnique({
    where: { userId: Number(session.user.id) },
  });
  if (!creator) throw new Error("Creator not found");

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { media: true },
  });
  if (!post || post.creatorId !== creator.id) {
    throw new Error("Post not found or access denied");
  }

  return { creator, post };
}

/* ──────────────────────────────────────────────
   DELETE POST  (post + media rows + files + likes)
   ────────────────────────────────────────────── */

export async function deletePost(postId: number) {
  const { post } = await getCreatorOwnedPost(postId);

  // Delete physical media files
  for (const m of post.media) {
    const abs = path.join(process.cwd(), "public", m.filePath);
    if (fs.existsSync(abs)) {
      try {
        fs.unlinkSync(abs);
      } catch {
        /* best-effort */
      }
    }
  }

  // Cascade deletes: post → media rows + likes (via onDelete: Cascade in schema)
  await prisma.post.delete({ where: { id: postId } });

  revalidatePath("/dashboard/media");
  revalidatePath("/dashboard");
}

/* ──────────────────────────────────────────────
   EDIT CAPTION  (title + content)
   ────────────────────────────────────────────── */

export async function editPostCaption(
  postId: number,
  title: string,
  content: string | null
) {
  await getCreatorOwnedPost(postId);

  const trimmedTitle = title.trim();
  if (!trimmedTitle || trimmedTitle.length < 1)
    throw new Error("Title is required");

  await prisma.post.update({
    where: { id: postId },
    data: { title: trimmedTitle, content: content?.trim() || null },
  });

  revalidatePath("/dashboard/media");
  revalidatePath("/dashboard");
}

/* ──────────────────────────────────────────────
   EDIT ACCESS LEVEL
   ────────────────────────────────────────────── */

export async function editPostAccessLevel(
  postId: number,
  accessLevel: AccessLevel
) {
  await getCreatorOwnedPost(postId);

  if (!["REGULAR", "VIP", "VIP_PLUS"].includes(accessLevel)) {
    throw new Error("Invalid access level");
  }

  await prisma.post.update({
    where: { id: postId },
    data: { accessLevel },
  });

  revalidatePath("/dashboard/media");
  revalidatePath("/dashboard");
}

/* ──────────────────────────────────────────────
   TOGGLE BLUR  (VIP_PLUS creators only)
   ────────────────────────────────────────────── */

export async function togglePostBlur(postId: number, blurred: boolean) {
  const { creator } = await getCreatorOwnedPost(postId);

  if (creator.tier !== "VIP_PLUS") {
    throw new Error("Blur is a VIP+ feature");
  }

  await prisma.post.update({
    where: { id: postId },
    data: { blurred },
  });

  revalidatePath("/dashboard/media");
  revalidatePath("/dashboard");
}
