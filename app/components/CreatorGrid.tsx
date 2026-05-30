import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@prisma/client";
import { refreshExpiredSubscriptions } from "@/app/lib/subscription";
import CreatorCard from "./CreatorCard";
import type { Creator } from "@/app/types/creator";

export default async function CreatorGrid({
  selectedCity,
  currentPage = 1,
}: {
  selectedCity?: string;
  currentPage?: number;
}) {
  await refreshExpiredSubscriptions();

  const PAGE_SIZE = 12;
  const skip = (currentPage - 1) * PAGE_SIZE;

  const creators = await prisma.creatorprofile.findMany({
    skip,
    take: PAGE_SIZE,
    where: {
      status: "APPROVED",
      ...(selectedCity ? { location: selectedCity } : {}),
    },
    include: {
      post: {
        where: { postType: "GALLERY" },
        include: { media: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const tierRank: Record<AccessLevel, number> = {
    [AccessLevel.VIP_PLUS]: 3,
    [AccessLevel.VIP]: 2,
    [AccessLevel.PREMIUM]: 1,
    [AccessLevel.REGULAR]: 0,
  };

  creators.sort((a, b) => {
    const rankA = tierRank[a.tier as AccessLevel] ?? 0;
    const rankB = tierRank[b.tier as AccessLevel] ?? 0;
    if (rankA !== rankB) return rankB - rankA;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  if (!creators.length) {
    return <p className="text-gray-400 text-sm">No creators available yet.</p>;
  }

  return (
    <div>
      {/* Mobile-first: 2-col, then scales up. Card height comes from CreatorCard (h-44),
          so two cards fit above the fold on a typical phone. */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {creators.map((creator, idx) => {
          const firstMedia = creator.post[0]?.media[0];
          const imageUrl =
            firstMedia?.kind === "IMAGE"
              ? firstMedia.filePath
              : creator.avatarUrl ?? null;
          const videoUrl =
            firstMedia?.kind === "VIDEO" ? firstMedia.filePath : null;

          const cardCreator: Creator = {
            id: String(creator.id),
            name: creator.displayName,
            city: creator.location ?? "",
            image: creator.avatarUrl ?? "",
            whatsapp: "",
            services: [],
            posts: [],
            tier: creator.tier as Creator["tier"],
            photos: imageUrl ? [imageUrl] : undefined,
            coverVideoUrl: videoUrl ?? undefined,
          };

          return (
            <CreatorCard
              key={creator.id}
              creator={cardCreator}
              priority={idx < 2}
            />
          );
        })}
      </div>

      <div className="mt-8 flex justify-center gap-4">
        {currentPage > 1 && (
          <Link
            href={`/?city=${selectedCity ?? ""}&page=${currentPage - 1}`}
            className="px-4 py-2 bg-black/40 border border-white/20 rounded-lg text-sm"
          >
            Previous
          </Link>
        )}

        {creators.length === PAGE_SIZE && (
          <Link
            href={`/?city=${selectedCity ?? ""}&page=${currentPage + 1}`}
            className="px-4 py-2 bg-black/40 border border-white/20 rounded-lg text-sm"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
