import { FeedPost } from "./FeedPost";
import { prisma } from "@/lib/prisma";
import { refreshExpiredSubscriptions } from "@/app/lib/subscription";
import { auth } from "@/auth";
import { browserSafeMediaUrl, lockedPreviewUrl } from "@/app/lib/media-url";

export default async function Feed() {
  const session = await auth();
  const userId = session?.user?.id;

  const viewerProfile = userId
    ? await prisma.creatorprofile.findFirst({
        where: { userId: parseInt(userId as string) },
        select: { tier: true },
      })
    : null;

  const userAccess = viewerProfile?.tier || "REGULAR";

  await refreshExpiredSubscriptions();

  const posts = await prisma.post.findMany({
    where: { postType: "FEED" },
    include: {
      creatorprofile: true,
      media: true,
      likes: {
        where: { userId: userId ? parseInt(userId as string) : 0 },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!posts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <i className="fa-regular fa-folder-open text-3xl text-white/10 mb-4"></i>
        <p className="text-gray-400 text-sm">
          No posts yet. Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post, index) => {
        const creator = post.creatorprofile;
        if (!creator) return null;

        const firstMedia = post.media[0];
        if (!firstMedia) return null;

        const creatorTier = creator.tier || "REGULAR";
        const isOwner = userId && parseInt(userId as string) === creator.userId;

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

        const isLocked = !hasAccess;

        return (
          <FeedPost
            key={post.id}
            post={{
              id: post.id,
              // Security: only pass media path if accessible OR explicitly blurred for preview.
              // browserSafeMediaUrl wraps the Cloudinary URL with f_mp4,vc_h264
              // on videos so iPhone HEVC clips actually play in Chrome on Windows.
              // Images pass through untouched.
              // Locked-but-blurred posts get a SERVER-blurred Cloudinary
              // derivative — never the original — so the protected media
              // can't be lifted from the DOM/network. Fully-locked posts
              // (no blur opt-in) get nothing.
              mediaUrl: hasAccess
                ? browserSafeMediaUrl(firstMedia.filePath, firstMedia.kind)
                : post.blurred
                  ? lockedPreviewUrl(firstMedia.filePath, firstMedia.kind)
                  : "",
              // Pass the Prisma enum value directly. FeedPost compares
              // strictly to "VIDEO" — lowercasing here would make every
              // post render as an <img>, which fails for actual videos.
              mediaKind: firstMedia.kind,
              // `blurred` here means "render this with the tease blur +
              // lock overlay." That's TRUE only when the viewer is locked
              // out AND the creator opted into the blur tease. Previously
              // this was `blurred: isLocked` which applied the blur to
              // every locked post regardless of the creator's choice —
              // wrong, and produced black tiles when the URL was empty.
              blurred: isLocked && post.blurred,
              // Per-post creator choice — when false, blur stays but the
              // WhatsApp lock CTA is replaced by a transparent tap target
              // that routes to the creator profile.
              showLock: post.showLock,
              // Creator-controlled tease level (4..16 px CSS blur).
              // Falls back to the column default if any older posts
              // exist that pre-date the migration.
              blurIntensity: post.blurIntensity,
              // Real post title (alt text + heading). Caption lives in
              // `content` and renders in the body of FeedPost, not in
              // the title slot.
              title: isLocked ? "Premium Content" : post.title,
              likes: post.likes.length,
              isLiked: post.likes.length > 0,
              views: post.viewCount,
              accessLevel: creatorTier,
              creator: {
                id: creator.id,
                name: creator.displayName,
                city: creator.location ?? "",
                tier: creator.tier,
                avatarUrl: creator.avatarUrl ?? "/creator1.jpg",
                verified: creator.verified,
                // WhatsApp number powers the lock overlay's deep-link.
                // When the creator hasn't set one, the overlay falls
                // back to a "view profile" link.
                whatsappNumber: creator.whatsappNumber,
              },
            }}
            index={index}
          />
        );
      })}
    </div>
  );
}