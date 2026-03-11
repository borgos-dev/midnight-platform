import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UploadPostForm from "../components/UploadPostForm";
import PostManagementCard from "../components/PostManagementCard";
import type { ManagedPost } from "../components/PostManagementCard";
import Link from "next/link";

export default async function MyPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const creator = await prisma.creatorprofile.findFirst({
    where: { userId: Number(session.user.id) },
    include: {
      post: {
        include: { media: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!creator) {
    return <div className="text-white p-6">Creator profile not found.</div>;
  }

  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams?.tab ?? "all";
  const allPosts = creator.post;
  const galleryPosts = allPosts.filter((p) => p.postType === "GALLERY");
  const feedPosts = allPosts.filter((p) => p.postType === "FEED");
  const displayPosts = tab === "gallery" ? galleryPosts : tab === "feed" ? feedPosts : allPosts;

  // Serialize posts for the client component
  const serializedPosts: ManagedPost[] = displayPosts.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    accessLevel: p.accessLevel,
    blurred: p.blurred,
    postType: p.postType,
    createdAt: p.createdAt.toISOString(),
    media: p.media.map((m) => ({
      id: m.id,
      kind: m.kind,
      filePath: m.filePath,
    })),
  }));

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">My Posts</h1>
        <p className="text-[13px] text-white/40 mt-1">
          Create grid gallery posts and feed content. Manage all your uploads.
        </p>
      </div>

      <UploadPostForm />

      <div className="flex gap-2">
        {[
          { key: "all", label: `All (${allPosts.length})` },
          { key: "gallery", label: `Gallery (${galleryPosts.length})` },
          { key: "feed", label: `Feed (${feedPosts.length})` },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/media?tab=${t.key}`}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
              tab === t.key
                ? "bg-purple-600 text-white"
                : "bg-white/[0.04] text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {displayPosts.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0a12] p-8 text-center">
          <p className="text-[13px] text-white/30">
            No posts yet. Use the form above to create your first content.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {serializedPosts.map((post) => (
            <PostManagementCard
              key={post.id}
              post={post}
              creatorTier={creator.tier}
            />
          ))}
        </div>
      )}
    </div>
  );
}
