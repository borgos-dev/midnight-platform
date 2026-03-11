import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { refreshExpiredSubscriptions } from "@/app/lib/subscription";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  // 1. Get current user's access level via their creator profile tier
  const viewerProfile = userId
    ? await prisma.creatorprofile.findFirst({
        where: { userId: parseInt(userId) },
        select: { tier: true },
      })
    : null;

  const userAccess = viewerProfile?.tier || "REGULAR";

  // 2. Refresh expiries globally
  await refreshExpiredSubscriptions();

  const posts = await prisma.post.findMany({
    include: {
      creatorprofile: {
        select: {
          tier: true,
          userId: true,
        },
      },
      media: true,
      likes: {
        where: { userId: userId ? parseInt(userId) : 0 },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const safePosts = posts.map((post) => {
    const creatorTier = post.creatorprofile?.tier || "REGULAR";
    const isOwner = userId && parseInt(userId) === post.creatorprofile?.userId;

    // Logic for Gating:
    // VIP posts require VIP or VIP_PLUS level.
    // VIP_PLUS posts require VIP_PLUS level.
    let hasAccess = false;
    if (isOwner) {
      hasAccess = true;
    } else if (creatorTier === "REGULAR") {
      hasAccess = true;
    } else if (creatorTier === "VIP") {
      hasAccess = userAccess === "VIP" || userAccess === "VIP_PLUS";
    } else if (creatorTier === "VIP_PLUS") {
      hasAccess = userAccess === "VIP_PLUS";
    }

    return {
      ...post,
      locked: !hasAccess,
      // If locked AND blurred=true, we might show a blurred version (handled in UI)
      // but for security, we strip the real mediaUrl if they have zero access.
      mediaUrl: hasAccess
        ? (post.media[0]?.filePath ?? null)
        : (post.blurred ? (post.media[0]?.filePath ?? null) : null),
      caption: hasAccess ? (post.content ?? "") : "Premium Content",
      isLiked: post.likes.length > 0,
    };
  });

  return NextResponse.json(safePosts);
}
