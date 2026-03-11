import { prisma } from "@/lib/prisma";
import PostCard from "@/app/components/feed/PostCard";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { AccessLevel } from "@prisma/client";
import { refreshExpiredSubscriptions } from "@/app/lib/subscription";
import { CreatorProfileContent } from "@/app/components/creator/CreatorProfileContent";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const tierRank: Record<AccessLevel, number> = {
  REGULAR: 0,
  VIP: 1,
  VIP_PLUS: 2,
} as const;

export default async function CreatorProfilePage({ params }: Props) {
  const { id } = await params;
  await refreshExpiredSubscriptions();

  const session = (await auth()) as {
    user?: { id?: string; role?: string; email?: string; name?: string };
  };

  // Viewer tier
  let viewerTier: AccessLevel = "REGULAR";
  if (session?.user) {
    const viewerCreator = await prisma.creatorprofile.findUnique({
      where: { userId: Number(session.user.id) },
    });
    if (viewerCreator) viewerTier = viewerCreator.tier as typeof viewerTier;
  }

  const creatorId = Number(id);
  if (isNaN(creatorId)) return notFound();

  const creator = await prisma.creatorprofile.findUnique({
    where: { id: creatorId },
    include: {
      post: {
        include: { likes: true, media: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!creator) return notFound();

  const creatorTier = creator.tier as AccessLevel;

  const message = encodeURIComponent(
    `Hi ${creator.displayName}, I saw your profile on Midnight24/7 and I'd like to book you.`
  );
  const whatsappLink = creator.whatsappNumber
    ? `https://wa.me/${creator.whatsappNumber}?text=${message}`
    : "#";

  // Tier visual config
  const isVipPlus = creatorTier === "VIP_PLUS";
  const isVip = creatorTier === "VIP";

  const avatarRing = isVipPlus
    ? "ring-[3px] ring-amber-400/70"
    : isVip
    ? "ring-[3px] ring-purple-500/60"
    : "border border-white/10";

  const badgeEl = isVipPlus ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
      👑 Elite Creator
    </span>
  ) : isVip ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
      VIP
    </span>
  ) : null;

  return (
    <div className="max-w-xl mx-auto pb-20 text-white">
      {/* ─── HEADER ─── */}
      <div className="flex items-center gap-4 p-5">
        <img
          src={creator.avatarUrl ?? "/images(4).jpg"}
          alt={creator.displayName}
          className={`h-20 w-20 rounded-full object-cover ${avatarRing}`}
        />

        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight">
              {creator.displayName}
            </h1>
            {creator.status === "APPROVED" && (
              <span className="text-blue-400 text-sm">✔</span>
            )}
            {badgeEl}
          </div>
          {creator.location && (
            <p className="text-white/45 text-sm">{creator.location}</p>
          )}
        </div>
      </div>

      {/* ─── BIO ─── */}
      {creator.bio && (
        <p className="px-5 pb-4 text-white/60 text-sm leading-relaxed">
          {creator.bio}
        </p>
      )}

      {/* ─── WHATSAPP CTA ─── */}
      {creator.whatsappNumber && (
        <div className="px-5 pb-6">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`block text-center py-3 rounded-xl font-semibold transition ${
              isVipPlus
                ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black"
                : "bg-purple-600 hover:bg-purple-500 text-white"
            }`}
          >
            Contact on WhatsApp
          </a>
        </div>
      )}

      {/* ─── GALLERY + FEED ─── */}
      <CreatorProfileContent
        posts={creator.post.map((post) => {
          const firstMedia = post.media[0];
          const locked = tierRank[viewerTier] < tierRank[post.accessLevel];
          return {
            id: post.id,
            title: post.title,
            content: post.content,
            postType: post.postType,
            accessLevel: post.accessLevel,
            blurred: post.blurred,
            locked,
            likes: post.likes.length,
            media: post.media.map((m) => ({
              id: m.id,
              filePath: locked && !post.blurred ? "" : m.filePath,
              kind: m.kind,
            })),
          };
        })}
        creator={{
          id: String(creator.id),
          name: creator.displayName,
          city: creator.location ?? "",
          image: creator.avatarUrl ?? "/creator1.jpg",
          whatsapp: creator.whatsappNumber ?? "",
          verified: creator.status === "APPROVED",
        }}
      />
    </div>
  );
}