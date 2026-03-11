import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@prisma/client";
import { refreshExpiredSubscriptions } from "@/app/lib/subscription";

export default async function CreatorGrid({
  selectedCity,
  currentPage = 1, // ✅ NEW: added currentPage
}: {
  selectedCity?: string;
  currentPage?: number; // ✅ NEW: added currentPage type
}) {
  await refreshExpiredSubscriptions();

  // ✅ NEW: pagination logic
  const PAGE_SIZE = 12;
  const skip = (currentPage - 1) * PAGE_SIZE;

  const creators = await prisma.creatorprofile.findMany({
    skip, // ✅ NEW
    take: PAGE_SIZE, // ✅ NEW
    where: {
      status: "APPROVED",
      ...(selectedCity
        ? {
            location: selectedCity,
          }
        : {}),
    },
    include: {
      post: {
        where: { postType: "GALLERY" },
        include: {
          media: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  // VIP sorting logic (unchanged)
  const tierRank: Record<AccessLevel, number> = {
    [AccessLevel.VIP_PLUS]: 3,
    [AccessLevel.VIP]: 2,
    [AccessLevel.REGULAR]: 1,
  };

  creators.sort((a, b) => {
    const rankA = tierRank[a.tier as AccessLevel] ?? 0;
    const rankB = tierRank[b.tier as AccessLevel] ?? 0;

    if (rankA !== rankB) {
      return rankB - rankA;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  if (!creators.length) {
    return (
      <p className="text-gray-400 text-sm">
        No creators available yet.
      </p>
    );
  }

  // ✅ CHANGED: wrapped everything in parent div
  return (
    <div>
      {/* ================= GRID ================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {creators.map((creator) => (
          <Link
            key={creator.id}
            href={`/creator/${creator.id}`}
            className={`group relative rounded-xl overflow-hidden transition
              ${
                creator.tier === "VIP_PLUS"
                  ? "border-2 border-purple-500 shadow-lg shadow-purple-500/30 scale-[1.02]"
                  : creator.tier === "VIP"
                  ? "border border-blue-500/40"
                  : "border border-white/10"
              }
            `}
          >
            {(() => {
              const latestPost = creator.post[0];
              const firstMedia = latestPost?.media[0];

              if (firstMedia) {
                if (firstMedia.kind === "VIDEO") {
                  return (
                    <video
                      src={firstMedia.filePath}
                      className="w-full h-64 object-cover group-hover:scale-105 transition duration-300"
                      muted
                      loop
                      autoPlay
                    />
                  );
                }

                return (
                  <img
                    src={firstMedia.filePath}
                    alt={creator.displayName}
                    className="w-full h-64 object-cover group-hover:scale-105 transition duration-300"
                  />
                );
              }

              return (
                <img
                  src={creator.avatarUrl ?? "/default-avatar.png"}
                  alt={creator.displayName}
                  className="w-full h-64 object-cover group-hover:scale-105 transition duration-300"
                />
              );
            })()}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Info */}
            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  {creator.displayName}
                </h3>

                {creator.tier === "VIP_PLUS" && (
                  <span className="text-xs bg-purple-600 px-2 py-1 rounded-full font-semibold shadow-md">
                    VIP+
                  </span>
                )}

                {creator.tier === "VIP" && (
                  <span className="text-xs bg-blue-600 px-2 py-1 rounded-full font-semibold">
                    VIP
                  </span>
                )}
              </div>

              <p className="text-xs text-white/70">
                {creator.location ?? ""}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* ================= PAGINATION ================= */}
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