"use client";

import { useMemo, useState } from "react";
import { FeedPost } from "./FeedPost";
import { FeedReelViewer, type ReelPost } from "./FeedReelViewer";

type Props = {
  /** Already-shaped posts in the order they should appear. Server-rendered
   *  data — this client wrapper doesn't fetch; it just owns the
   *  "which post is the reel viewer showing" state. */
  posts: ReelPost[];
};

/**
 * Client wrapper around a list of FeedPost cards + the fullscreen
 * FeedReelViewer that opens when any of them are tapped.
 *
 * Lives in this file (not inline in /feed/page.tsx) so the homepage,
 * /feed, and creator-profile feed tab can all share the same "tap → reel"
 * behavior without each duplicating the state plumbing.
 *
 * State is intentionally local — no URL state, no history pushing. The
 * reel viewer is a transient UI surface; refreshing the page should
 * land you back on the timeline, not stuck in the viewer.
 */
export function FeedTimeline({ posts }: Props) {
  // Track which post the viewer is currently showing. `null` = closed.
  // We store the *id* rather than the *index* so reordering / refetching
  // doesn't accidentally point at the wrong post.
  const [openId, setOpenId] = useState<number | null>(null);

  // Resolve id → starting index lazily so we don't recompute on every
  // viewer re-render.
  const startIndex = useMemo(() => {
    if (openId === null) return 0;
    const idx = posts.findIndex((p) => p.id === openId);
    return idx >= 0 ? idx : 0;
  }, [openId, posts]);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {posts.map((post, index) => (
          <FeedPost
            key={post.id}
            index={index}
            post={post}
            onOpenReel={(postId) => setOpenId(postId)}
          />
        ))}
      </div>

      {openId !== null && (
        <FeedReelViewer
          posts={posts}
          startIndex={startIndex}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
