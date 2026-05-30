import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { refreshExpiredSubscriptions } from "@/app/lib/subscription";
import { getCurrentCreatorProfile } from "@/app/lib/auth-helpers";
import { browserSafeMediaUrl, lockedPreviewUrl } from "@/app/lib/media-url";

// Hard cap so this endpoint can never be used to dump the entire posts
// table in one request.
const MAX_POSTS = 60;

export async function GET() {
  // 1) Refresh expired subscriptions globally before reading tier
  await refreshExpiredSubscriptions();

  // 2) Derive viewer's tier from their creator profile (or REGULAR for guests)
  const viewer = await getCurrentCreatorProfile();
  const userAccess = viewer?.tier ?? "REGULAR";
  const viewerCreatorId = viewer?.id ?? null;
  const viewerUserId = viewer?.userId ?? null;

  // 3) Fetch posts with minimal includes; do NOT leak creator userId
  const posts = await prisma.post.findMany({
    include: {
      creatorprofile: {
        select: {
          id: true,
          tier: true,
          displayName: true,
        },
      },
      media: true,
      // Only check the current viewer's like (avoids the wasteful `userId: 0`)
      likes: viewerUserId
        ? { where: { userId: viewerUserId }, select: { userId: true } }
        : false,
    },
    orderBy: { createdAt: "desc" },
    take: MAX_POSTS,
  });

  const safePosts = posts.map((post) => {
    const creatorTier = post.creatorprofile?.tier || "REGULAR";
    const isOwner =
      viewerCreatorId !== null && post.creatorprofile?.id === viewerCreatorId;

    let hasAccess = false;
    if (isOwner) hasAccess = true;
    else if (creatorTier === "REGULAR") hasAccess = true;
    else if (creatorTier === "VIP")
      hasAccess = userAccess === "VIP" || userAccess === "VIP_PLUS";
    else if (creatorTier === "VIP_PLUS") hasAccess = userAccess === "VIP_PLUS";

    // Sanitize the media list per access. Previously the raw `post.media`
    // array (every filePath, mimeType, sizeBytes, creatorId) was returned
    // for EVERY post regardless of entitlement — a non-paying caller could
    // read the real Cloudinary URLs of fully-locked content straight out of
    // this JSON. Now:
    //   • entitled / owner → real (browser-safe) URLs
    //   • locked + blurred → server-blurred derivative only
    //   • fully locked     → no URL at all
    const safeMedia = post.media.map((m) => ({
      id: m.id,
      kind: m.kind,
      filePath: hasAccess
        ? browserSafeMediaUrl(m.filePath, m.kind)
        : post.blurred
        ? lockedPreviewUrl(m.filePath, m.kind)
        : "",
    }));
    const firstMediaPath = safeMedia[0]?.filePath || null;

    return {
      id: post.id,
      title: hasAccess ? post.title : "Premium Content",
      content: hasAccess ? post.content ?? "" : "Premium Content",
      accessLevel: post.accessLevel,
      blurred: post.blurred,
      postType: post.postType,
      createdAt: post.createdAt,
      creatorprofile: {
        id: post.creatorprofile?.id,
        tier: post.creatorprofile?.tier,
        displayName: post.creatorprofile?.displayName,
        // userId intentionally omitted — IDOR-prone
      },
      media: safeMedia,
      locked: !hasAccess,
      mediaUrl: firstMediaPath,
      caption: hasAccess ? post.content ?? "" : "Premium Content",
      isLiked: Array.isArray(post.likes) ? post.likes.length > 0 : false,
    };
  });

  return NextResponse.json(safePosts);
}
