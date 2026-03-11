// app/components/dashboard/sections/TopPerformingPosts.tsx
"use client";

import Link from "next/link";

type TopPost = {
  id: number;
  title: string;
  accessLevel: string;
  thumbnail: string | null;
  mediaKind: string | null;
  likes: number;
};

type TopPerformingPostsProps = {
  posts: TopPost[];
};

export function TopPerformingPosts({ posts }: TopPerformingPostsProps) {
  if (posts.length === 0) {
    return (
      <section>
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Top Performing Posts
          </h2>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0a12] p-8 text-center">
          <p className="text-[12px] text-white/30">
            No posts yet. Create your first post from My Posts.
          </p>
          <Link
            href="/dashboard/media"
            className="inline-block mt-3 rounded-lg bg-purple-600 px-4 py-2 text-[12px] font-medium text-white hover:bg-purple-500 transition"
          >
            Go to My Posts
          </Link>
        </div>
      </section>
    );
  }

  // Already sorted by likes from server — take top 3
  const topPosts = posts.slice(0, 3);

  const rankColors = [
    "from-amber-400/20 to-amber-400/5 border-amber-400/20",  // #1
    "from-purple-500/15 to-purple-500/5 border-purple-500/20", // #2
    "from-white/[0.04] to-white/[0.01] border-white/[0.06]",  // #3
  ];

  const rankBadgeColors = [
    "text-amber-300 bg-amber-400/15 border-amber-400/30",
    "text-purple-300 bg-purple-500/15 border-purple-500/30",
    "text-white/50 bg-white/[0.06] border-white/10",
  ];

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-white tracking-tight">
          Top Performing Posts
        </h2>
        <Link
          href="/dashboard/media"
          className="text-[11px] text-purple-400 hover:text-purple-300 transition"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {topPosts.map((post, i) => (
          <div
            key={post.id}
            className={`rounded-xl border bg-gradient-to-b overflow-hidden group hover:border-purple-500/30 transition ${
              rankColors[i] ?? rankColors[2]
            }`}
          >
            {/* Rank badge + title */}
            <div className="px-4 pt-3 pb-2 flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  rankBadgeColors[i] ?? rankBadgeColors[2]
                }`}
              >
                #{i + 1}
              </span>
              <p className="text-[12px] font-semibold text-white/80 truncate">
                {post.title}
              </p>
            </div>

            {/* Thumbnail */}
            <div className="h-40 bg-white/[0.02] overflow-hidden">
              {post.thumbnail ? (
                post.mediaKind === "VIDEO" ? (
                  <video
                    src={post.thumbnail}
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <img
                    src={post.thumbnail}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className="text-white/10 text-3xl">▦</span>
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-red-400/80">♥</span>
                <span className="text-lg font-bold text-white tabular-nums">
                  {post.likes.toLocaleString()}
                </span>
                <span className="text-[11px] text-white/40">likes</span>
              </div>

              {/* Access level badge */}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  post.accessLevel === "VIP_PLUS"
                    ? "text-amber-300 border-amber-400/30 bg-amber-400/10"
                    : post.accessLevel === "VIP"
                    ? "text-purple-300 border-purple-500/30 bg-purple-500/10"
                    : "text-white/40 border-white/10 bg-white/[0.04]"
                }`}
              >
                {post.accessLevel === "VIP_PLUS"
                  ? "VIP+"
                  : post.accessLevel === "VIP"
                  ? "VIP"
                  : "Public"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
