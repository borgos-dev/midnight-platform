import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UploadPostForm from "../components/UploadPostForm";
import PostManagementCard from "../components/PostManagementCard";
import type { ManagedPost } from "../components/PostManagementCard";
import Link from "next/link";
import {
  getDailyPostQuota,
  getDailyVideoQuota,
  getPostRetentionDays,
} from "@/app/lib/plans";
import { startOfToday } from "@/lib/analytics";
import { expireOldPostsForCreator } from "@/app/lib/post-retention";
import { TIER_TOKENS } from "@/app/lib/tier-tokens";

export default async function MyPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Two-pass load: tier first (cheap), retention sweep, then the full
  // post list. The sweep can delete rows, so loading posts before it
  // would render stale content + give a wrong daily count.
  const creatorMeta = await prisma.creatorprofile.findFirst({
    where: { userId: Number(session.user.id) },
    select: { id: true, tier: true },
  });
  if (!creatorMeta) {
    return <div className="text-white p-6">Creator profile not found.</div>;
  }

  // Sweep is best-effort. If it fails (Cloudinary outage, env vars
  // missing in dev, etc.) we render the page with stale-but-correct
  // data rather than blanking the dashboard. The next visit retries.
  try {
    await expireOldPostsForCreator(creatorMeta.id, creatorMeta.tier);
  } catch (err) {
    console.error("[media] expireOldPostsForCreator failed:", err);
  }

  const creator = await prisma.creatorprofile.findUnique({
    where: { id: creatorMeta.id },
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

  // Quota readout for the upload form. Both counts use the same calendar
  // boundary the server action uses, so the displayed "remaining" matches
  // what the action will actually allow.
  const dailyCap = getDailyPostQuota(creator.tier);
  const videoCap = getDailyVideoQuota(creator.tier);
  const retentionDays = getPostRetentionDays(creator.tier);
  const dayStart = startOfToday();
  const todaysPosts = allPosts.filter((p) => p.createdAt >= dayStart);
  const postsToday = todaysPosts.length;
  const videosToday = todaysPosts.filter((p) =>
    p.media.some((m) => m.kind === "VIDEO"),
  ).length;

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

  const tokens = TIER_TOKENS[creator.tier];
  const TierIcon = tokens.icon;

  return (
    <div className="max-w-4xl space-y-8">
      {/* Tier-themed header — matches Edit Profile so the visual identity
          stays consistent everywhere the creator works. */}
      <div
        className="rounded-xl overflow-hidden border"
        style={{
          borderColor: tokens.borderStrong,
          background: tokens.surface,
        }}
      >
        <div
          style={{
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${tokens.accent}, transparent)`,
          }}
        />
        <div className="px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">My Posts</h1>
            <p className="text-[13px] text-white/40 mt-1">
              Create grid gallery posts and feed content. Manage all your uploads.
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.10em]"
            style={{
              background: tokens.badge.bg,
              border: `1px solid ${tokens.badge.border}`,
              color: tokens.badge.color,
            }}
          >
            <TierIcon size={11} strokeWidth={2.4} />
            {tokens.label.toUpperCase()}
          </span>
        </div>
      </div>

      <UploadPostForm
        creatorTier={creator.tier}
        postsToday={postsToday}
        dailyCap={dailyCap}
        videosToday={videosToday}
        videoCap={videoCap}
        retentionDays={retentionDays}
      />

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
                : "bg-white/4 text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {displayPosts.length === 0 ? (
        <div className="rounded-xl border border-white/6 bg-surface p-8 text-center">
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
