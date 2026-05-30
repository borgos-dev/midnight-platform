// app/components/dashboard/sections/RecentPosts.tsx
import Link from "next/link";

type RecentPost = {
  id: number;
  title: string;
  content: string | null;
  accessLevel: string;
  createdAt: string;
  thumbnail: string | null;
  mediaKind: string | null;
};

type RecentPostsProps = {
  posts: RecentPost[];
};

export function RecentPosts({ posts }: RecentPostsProps) {
  if (posts.length === 0) {
    return (
      <section>
        <div className="mb-4">
          <h2 className="text-[13px] font-semibold text-white/80 tracking-tight">
            Recent Posts
          </h2>
        </div>
        <div className="rounded-xl border border-white/6 bg-surface p-8 text-center">
          <p className="text-[12px] text-white/30">
            You haven&apos;t posted anything yet.
          </p>
          <Link
            href="/dashboard/media"
            className="inline-block mt-3 rounded-lg bg-purple-600 px-4 py-2 text-[12px] font-medium text-white hover:bg-purple-500 transition"
          >
            Create your first post
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-semibold text-white/80 tracking-tight">
          Recent Posts
        </h2>
        <Link
          href="/dashboard/media"
          className="text-label text-purple-400 hover:text-purple-300 transition"
        >
          View all â†’
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="rounded-xl border border-white/6 bg-surface overflow-hidden"
          >
            {/* Thumbnail */}
            <div className="h-36 bg-white/2 flex items-center justify-center">
              {post.thumbnail ? (
                post.mediaKind === "VIDEO" ? (
                  <video
                    src={post.thumbnail}
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={post.thumbnail}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <span className="text-white/10 text-2xl">â–¦</span>
              )}
            </div>

            {/* Meta */}
            <div className="p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-white/70 truncate">
                  {post.title}
                </p>
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                    post.accessLevel === "VIP_PLUS"
                      ? "text-amber-300 border-amber-400/30 bg-amber-400/10"
                      : post.accessLevel === "VIP"
                      ? "text-purple-300 border-purple-500/30 bg-purple-500/10"
                      : "text-white/30 border-white/10 bg-white/3"
                  }`}
                >
                  {post.accessLevel === "VIP_PLUS"
                    ? "VIP+"
                    : post.accessLevel}
                </span>
              </div>

              <p className="text-eyebrow text-white/25">
                {new Date(post.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
