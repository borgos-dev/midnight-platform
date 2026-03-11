"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function toggleLike(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const postId = Number(formData.get("postId"));
  if (!postId) {
    throw new Error("Invalid post ID");
  }

  const userId = Number(session.user.id);

  const existing = await prisma.postlike.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
  });

  if (existing) {
    await prisma.postlike.delete({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });
  } else {
    await prisma.postlike.create({
      data: {
        postId,
        userId,
      },
    });
  }

  revalidatePath("/");
}