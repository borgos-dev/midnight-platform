// app/components/creator/CreatorProfileContent.tsx
"use client";

import { useState } from "react";
import PostCard from "@/app/components/feed/PostCard";

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
};

type Props = {
  posts: ProfilePost[];
  creator: CreatorInfo;
};

export function CreatorProfileContent({ posts, creator }: Props) {
  const [tab, setTab] = useState<"gallery" | "feed">("gallery");

  const galleryPosts = posts.filter((p) => p.postType === "GALLERY");
  const feedPosts = posts.filter((p) => p.postType === "FEED");

  return (
    <div className="px-5">
      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] mb-5">
        <button
          onClick={() => setTab("gallery")}
          className={`flex-1 py-3 text-[13px] font-medium transition ${
            tab === "gallery"
              ? "text-purple-400 border-b-2 border-purple-500"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          Gallery ({galleryPosts.length})
        </button>
        <button
          onClick={() => setTab("feed")}
          className={`flex-1 py-3 text-[13px] font-medium transition ${
            tab === "feed"
              ? "text-purple-400 border-b-2 border-purple-500"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          Feed ({feedPosts.length})
        </button>
      </div>

      {/* Gallery Grid */}
      {tab === "gallery" && (
        <div>
          {galleryPosts.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-8">
              No gallery posts yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {galleryPosts.flatMap((post) =>
                post.media.map((m) => (
                  <div
                    key={m.id}
                    className="relative aspect-square overflow-hidden bg-white/[0.02]"
                  >
                    {m.filePath ? (
                      <img
                        src={m.filePath}
                        alt=""
                        className={`w-full h-full object-cover ${
                          post.locked || post.blurred
                            ? "blur-[20px] scale-110 opacity-70"
                            : ""
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white/10 text-2xl">🔒</span>
                      </div>
                    )}

                    {post.locked && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white/50 text-xs font-semibold">
                          {post.accessLevel === "VIP_PLUS" ? "VIP+" : "VIP"}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Feed Posts */}
      {tab === "feed" && (
        <div className="space-y-6">
          {feedPosts.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-8">
              No feed posts yet.
            </p>
          ) : (
            feedPosts.map((post) => {
              const firstMedia = post.media[0];
              if (!firstMedia) return null;

              return (
                <PostCard
                  key={post.id}
                  post={{
                    id: String(post.id),
                    media: firstMedia.filePath,
                    type: firstMedia.kind === "VIDEO" ? "video" : "image",
                    locked: post.locked,
                    blurred: post.blurred,
                    caption: post.locked
                      ? "Premium Content"
                      : post.content ?? "",
                    likes: post.likes,
                    isLiked: false,
                  }}
                  creator={{
                    id: creator.id,
                    name: creator.name,
                    city: creator.city,
                    image: creator.image,
                    whatsapp: creator.whatsapp,
                    services: [],
                    posts: [],
                    verified: creator.verified,
                  }}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
