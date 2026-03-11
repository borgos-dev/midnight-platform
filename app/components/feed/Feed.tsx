import PostCard from "./PostCard";
import { prisma } from "@/lib/prisma";
import { refreshExpiredSubscriptions } from "@/app/lib/subscription";
import { auth } from "@/auth";

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
      {posts.map((post) => {
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
          <PostCard
            key={post.id}
            post={{
              id: String(post.id),
              // Security: only pass media path if accessible OR explicitly blurred for preview
              media: hasAccess ? firstMedia.filePath : (post.blurred ? firstMedia.filePath : ""),
              type: firstMedia.kind === "VIDEO" ? "video" : "image",
              locked: isLocked,
              blurred: post.blurred,
              caption: isLocked ? "Premium Content" : post.content ?? "",
              likes: post.likes.length,
              isLiked: post.likes.length > 0,
            }}
            creator={{
              id: String(creator.id),
              name: creator.displayName,
              city: creator.location ?? "",
              image: creator.avatarUrl ?? "/creator1.jpg",
              whatsapp: creator.whatsappNumber ?? "",
              services: [],
              posts: [],
              verified: creator.status === "APPROVED",
            }}
          />
        );
      })}
    </div>
  );
}