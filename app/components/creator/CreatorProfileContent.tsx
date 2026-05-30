"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { LayoutGrid, Lock } from "lucide-react";
import { FeedPost } from "@/app/components/feed/FeedPost";
import {
  FeedReelViewer,
  type ReelPost,
} from "@/app/components/feed/FeedReelViewer";
import { AccessLevel } from "@prisma/client";
import { browserSafeMediaUrl } from "@/app/lib/media-url";

type MediaItem = {
  id: number;
  filePath: string;
  kind: string;
};

type ProfilePost = {
  id: number;
  title: string;
  content: string | null;
  postType: string;
  accessLevel: string;
  blurred: boolean;
  /** Creator-chosen tease-blur strength (4..25). Optional — falls back to
   *  the schema default if older rows pre-date the column. */
  blurIntensity?: number;
  /** Whether to render the WhatsApp lock overlay on the tease blur. Default
   *  true; creators set false per-post to keep blur but route to profile. */
  showLock?: boolean;
  locked: boolean;
  likes: number;
  media: MediaItem[];
};

type CreatorInfo = {
  id: string;
  name: string;
  city: string;
  image: string;
  whatsapp: string;
  verified: boolean;
  tier: AccessLevel;
};

type Props = {
  posts: ProfilePost[];
  creator: CreatorInfo;
  viewerTier: AccessLevel;
};

export function CreatorProfileContent({ posts, creator, viewerTier }: Props) {
  const [tab, setTab] = useState<"gallery" | "feed">("gallery");

  const galleryPosts = posts.filter((p) => p.postType === "GALLERY");
  const feedPosts = posts.filter((p) => p.postType === "FEED");

  // Reel viewer state. Two modes — "feed" scrolls through this creator's
  // feed posts (one slide per post); "gallery" scrolls through every
  // individual photo across all of this creator's gallery posts (one
  // slide per media item, since gallery posts can have multiple photos).
  //
  // `openReelId` identifies the specific slide that should be visible
  // when the viewer opens. For feed slides we use post.id; for gallery
  // slides we use media.id. They live in different reel arrays so id
  // collisions across the two namespaces are impossible.
  const [openReel, setOpenReel] = useState<
    { kind: "feed" | "gallery"; id: number } | null
  >(null);

  // Feed reels: one slide per feed post (first media item of each post).
  // Visitors swiping vertically inside the viewer see this creator's
  // other feed posts only — never jump to other creators.
  const feedReelPosts = useMemo<ReelPost[]>(
    () =>
      feedPosts
        // Explicit `ReelPost | null` so the .filter() predicate narrows
        // back to ReelPost[]. Without the annotation TS infers the map
        // result as the object-literal type, and the `(p): p is ReelPost`
        // predicate below can't bridge to ReelPost.
        .map((post): ReelPost | null => {
          const firstMedia = post.media[0];
          if (!firstMedia) return null;
          return {
            id: post.id,
            title: post.locked ? "Premium Content" : post.title,
            // Force browser-safe H.264 on Cloudinary video URLs so iPhone
            // HEVC clips play in Chrome on Windows. Images pass through.
            mediaUrl: browserSafeMediaUrl(
              firstMedia.filePath,
              firstMedia.kind as "VIDEO" | "IMAGE",
            ),
            mediaKind: firstMedia.kind,
            blurred: post.locked,
            blurIntensity: post.blurIntensity,
            showLock: post.showLock,
            accessLevel: post.accessLevel as AccessLevel,
            likes: post.likes,
            isLiked: false,
            creator: {
              id: Number(creator.id),
              name: creator.name,
              city: creator.city,
              tier: creator.tier,
              avatarUrl: creator.image,
            },
          } satisfies ReelPost;
        })
        .filter((p): p is ReelPost => p !== null),
    [feedPosts, creator],
  );

  // Gallery reels: one slide PER MEDIA ITEM (a single gallery post can
  // carry up to MAX_GALLERY photos — Chunk 6 capped at 6). Flatmapping
  // means tapping the 3rd thumbnail opens the viewer on the 3rd image,
  // and swiping continues through the rest of the creator's gallery.
  // ReelPost.id is set to media.id (not post.id) so each slide has a
  // stable, unique identifier.
  const galleryReelPosts = useMemo<ReelPost[]>(
    () =>
      galleryPosts.flatMap((post) =>
        post.media.map(
          (m) =>
            ({
              id: m.id,
              title: post.locked ? "Premium Content" : post.title,
              mediaUrl: m.filePath,
              // Gallery is image-only — Chunk 6 enforces this in the
              // upload flow — but we honor whatever the DB says.
              mediaKind: m.kind,
              blurred: post.locked,
              blurIntensity: post.blurIntensity,
              showLock: post.showLock,
              accessLevel: post.accessLevel as AccessLevel,
              likes: post.likes,
              isLiked: false,
              creator: {
                id: Number(creator.id),
                name: creator.name,
                city: creator.city,
                tier: creator.tier,
                avatarUrl: creator.image,
              },
            }) satisfies ReelPost,
        ),
      ),
    [galleryPosts, creator],
  );

  // Resolve the open reel id → starting index inside whichever array
  // we're playing. Lifted into useMemo so the viewer doesn't re-find
  // on every parent re-render.
  const activeReelPosts =
    openReel?.kind === "gallery" ? galleryReelPosts : feedReelPosts;
  const reelStartIndex = useMemo(() => {
    if (!openReel) return 0;
    const idx = activeReelPosts.findIndex((p) => p.id === openReel.id);
    return idx >= 0 ? idx : 0;
  }, [openReel, activeReelPosts]);

  // "M of N visible" — total count includes locked items the viewer hasn't
  // unlocked, while M counts only those the viewer can actually view.
  // For the owner / VIP+ viewer, visible === total, so we collapse to a
  // single number.
  const visibleGalleryCount = galleryPosts.filter((p) => !p.locked).length;
  const visibleFeedCount = feedPosts.filter((p) => !p.locked).length;
  const galleryLabel =
    visibleGalleryCount === galleryPosts.length
      ? `${galleryPosts.length}`
      : `${visibleGalleryCount} of ${galleryPosts.length}`;
  const feedLabel =
    visibleFeedCount === feedPosts.length
      ? `${feedPosts.length}`
      : `${visibleFeedCount} of ${feedPosts.length}`;

  return (
    <div className="px-5">
      {/* Tabs — inactive bumped from white/40 → white/60 for readability */}
      <div className="flex border-b border-white/10 mb-5">
        <button
          onClick={() => setTab("gallery")}
          className={`flex-1 py-3 text-[13px] font-medium transition ${
            tab === "gallery"
              ? "text-purple-400 border-b-2 border-purple-500"
              : "text-white/60 hover:text-white/80"
          }`}
        >
          Gallery ({galleryLabel})
        </button>
        <button
          onClick={() => setTab("feed")}
          className={`flex-1 py-3 text-[13px] font-medium transition ${
            tab === "feed"
              ? "text-purple-400 border-b-2 border-purple-500"
              : "text-white/60 hover:text-white/80"
          }`}
        >
          Feed ({feedLabel})
        </button>
      </div>

      {/* Gallery Grid */}
      {tab === "gallery" && (
        <div>
          {galleryPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-14 px-4">
              <div className="w-12 h-12 rounded-2xl border border-white/10 bg-white/3 flex items-center justify-center mb-3">
                <LayoutGrid size={22} className="text-white/50" aria-hidden />
              </div>
              <p className="text-sm text-white/55 font-medium">
                No gallery yet
              </p>
              <p className="text-eyebrow text-white/35 mt-1 tracking-[0.04em] max-w-prose">
                Gallery posts will appear here when this creator publishes them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-1 xl:gap-2">
              {galleryPosts.flatMap((post) =>
                post.media.map((m) => {
                  // Locked tiles can't be tapped into a fullscreen view —
                  // we render them as a static div (no click handler) so
                  // the visitor sees the blur + "VIP+" overlay and that's
                  // it. Unlocked tiles become a button that opens the
                  // reel viewer at this specific photo.
                  const clickable =
                    !post.locked && Boolean(m.filePath);

                  const inner = (
                    <>
                      {m.filePath ? (
                        <Image
                          src={m.filePath}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 33vw, (max-width: 1280px) 25vw, 200px"
                          loading="lazy"
                          unoptimized={!m.filePath.startsWith("https://res.cloudinary.com")}
                          className={`object-cover ${
                            post.locked || post.blurred
                              ? "blur-[20px] scale-110 opacity-70"
                              : ""
                          }`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Lock size={22} className="text-white/15" />
                        </div>
                      )}

                      {post.locked && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white/50 text-xs font-semibold">
                            {post.accessLevel === "VIP_PLUS" ? "VIP+" : "VIP"}
                          </span>
                        </div>
                      )}
                    </>
                  );

                  if (!clickable) {
                    return (
                      <div
                        key={m.id}
                        className="relative aspect-square overflow-hidden bg-white/2"
                      >
                        {inner}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setOpenReel({ kind: "gallery", id: m.id })
                      }
                      aria-label="View photo"
                      className="relative aspect-square overflow-hidden bg-white/2 border-0 p-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition hover:opacity-90"
                    >
                      {inner}
                    </button>
                  );
                }),
              )}
            </div>
          )}
        </div>
      )}

      {/* Feed Posts */}
      {tab === "feed" && (
        <div className="space-y-6">
          {feedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-14 px-4">
              <div className="w-12 h-12 rounded-2xl border border-white/10 bg-white/3 flex items-center justify-center mb-3">
                <span className="text-2xl opacity-50" aria-hidden>
                  ◫
                </span>
              </div>
              <p className="text-sm text-white/55 font-medium">No feed yet</p>
              <p className="text-eyebrow text-white/35 mt-1 tracking-[0.04em] max-w-prose">
                When this creator posts new content, it&apos;ll show up here.
              </p>
            </div>
          ) : (
            feedPosts.map((post) => {
              const firstMedia = post.media[0];
              if (!firstMedia) return null;

              return (
                <FeedPost
                  key={post.id}
                  post={{
                    id: post.id,
                    // Title goes to alt-text + heading. The visible
                    // caption (post.content) belongs in FeedPost's body,
                    // not in the title slot — otherwise the caption ended
                    // up rendered as the <img alt> on a broken image
                    // (which is what made "like wat you see" appear in
                    // place of the media).
                    title: post.locked ? "Premium Content" : post.title,
                    // Force browser-safe H.264 on Cloudinary video URLs so
                    // iPhone HEVC clips play in Chrome on Windows.
                    mediaUrl: browserSafeMediaUrl(
                      firstMedia.filePath,
                      firstMedia.kind as "VIDEO" | "IMAGE",
                    ),
                    // Pass the Prisma enum value directly — uppercase
                    // "IMAGE" / "VIDEO". FeedPost compares strictly:
                    //   const isVideo = post.mediaKind === "VIDEO";
                    // The earlier lowercase mapping ("video" / "image")
                    // silently made every post render as an <img>, which
                    // failed to decode the actual video file.
                    mediaKind: firstMedia.kind,
                    blurred: post.locked,
                    blurIntensity: post.blurIntensity,
                    showLock: post.showLock,
                    accessLevel: post.accessLevel as AccessLevel,
                    creator: {
                      id: Number(creator.id),
                      name: creator.name,
                      city: creator.city,
                      // Pass the real creator tier through instead of the
                      // hardcoded "REGULAR" placeholder that previously lived
                      // here. Now FeedPost can render the correct tier badge.
                      tier: creator.tier,
                      avatarUrl: creator.image,
                      verified: creator.verified,
                    },
                    likes: post.likes,
                    isLiked: false,
                  }}
                  index={0}
                  // Tap the media (or its overlay) → open the fullscreen
                  // reel viewer starting on THIS post. Viewer is scoped
                  // to this creator's feed posts only — visitors swipe
                  // vertically through the same creator, not jumping to
                  // unrelated creators (that's what /feed is for).
                  onOpenReel={(postId) =>
                    setOpenReel({ kind: "feed", id: postId })
                  }
                />
              );
            })
          )}
        </div>
      )}

      {/* Fullscreen TikTok-style viewer. One component drives both modes:
          gallery (one slide per photo) and feed (one slide per post).
          Hidden when `openReel` is null so video elements don't stay
          hot in memory between sessions. */}
      {openReel && activeReelPosts.length > 0 && (
        <FeedReelViewer
          posts={activeReelPosts}
          startIndex={reelStartIndex}
          onClose={() => setOpenReel(null)}
        />
      )}
    </div>
  );
}
