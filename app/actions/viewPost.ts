"use server";
import { prisma } from "@/lib/prisma";

export async function incrementPostView(postId: number): Promise<void> {
  await prisma.post.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
  });
}
