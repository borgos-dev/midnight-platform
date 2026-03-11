"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Creator, Post } from "@/app/types/creator";
import { toggleLike } from "@/app/actions/likePost";
import PostCTA from "./PostCTA";

type Props = {
  post: Post;
  creator: Creator;
};

export default function PostCard({ post, creator }: Props) {
  if (!creator) return null;

  // content is blurred if the user hasn't unlocked it,
  // OR if the post itself is marked as explicitly blurred for previews.
  const shouldBlur = post.locked || post.blurred;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [animating, setAnimating] = useState(false);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-lg mb-6">
      <Link href={`/creator/${creator.id}`}>
        <div className="flex items-center gap-3 p-4 hover:bg-white/5 cursor-pointer">
          <img
            src={creator.image}
            alt={creator.name}
            className="h-10 w-10 rounded-full object-cover shadow-sm bg-black"
          />

          <div>
            <p className="text-sm font-semibold text-white flex items-center gap-1">
              {creator.name}
              {creator.verified && (
                <span className="text-blue-500 text-xs">✔</span>
              )}
            </p>

            <p className="text-xs text-white/60">{creator.city}</p>
          </div>
        </div>
      </Link>

      <div className="relative bg-black w-full overflow-hidden flex items-center justify-center">
        {!post.media ? (
          <div className="flex flex-col items-center gap-2 p-6 py-20 text-center">
            <i className="fa-solid fa-lock text-3xl text-yellow-500/50"></i>
            <p className="text-sm text-white/40 font-medium tracking-tight">
              LOCKED CONTENT
            </p>
          </div>
        ) : post.type === "image" ? (
          <img
            src={post.media}
            className={`w-full max-h-[520px] object-cover transition-all duration-700 ${
              shouldBlur ? "blur-[20px] scale-110 opacity-70" : ""
            }`}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              src={post.media}
              autoPlay
              muted
              loop
              playsInline
              className={`w-full max-h-[600px] object-contain transition-all duration-700 ${
                shouldBlur ? "blur-[20px] scale-110 opacity-70" : ""
              }`}
            />
            {!post.locked && (
              <button
                type="button"
                onClick={toggleMute}
                className="absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur-sm transition hover:bg-black/80 hover:text-white"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                <span className="text-sm">{isMuted ? "🔇" : "🔊"}</span>
              </button>
            )}
          </>
        )}

        {post.locked && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center" />
        )}
      </div>

      <div className="flex items-center gap-3 px-4 py-3 border-t border-white/5">
        <form
          action={async (formData) => {
            setLiked((prev) => !prev);
            setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
            setAnimating(true);
            setTimeout(() => setAnimating(false), 300);
            await toggleLike(formData);
          }}
        >
          <input type="hidden" name="postId" value={post.id} />

          <button type="submit" className="text-2xl transition-transform duration-200 ease-out active:scale-90">
            {liked ? (
              <i
                className={`fa-solid fa-heart text-red-500 transition-transform duration-300 ease-out ${
                  animating ? "scale-125" : "scale-100"
                }`}
              ></i>
            ) : (
              <i className="fa-regular fa-heart text-gray-300 transition-colors duration-200"></i>
            )}
          </button>
        </form>

        <span className="text-sm text-white/70">
          {likeCount} likes
        </span>
      </div>

      {post.caption && !post.locked && (
        <div className="px-4 pb-3">
          <p className="text-sm text-white/80 leading-relaxed">
            <span className="font-semibold text-white mr-1.5">{creator.name}</span>
            {post.caption}
          </p>
        </div>
      )}

      {post.locked && (
        <div className="px-4 pb-4">
          <PostCTA creator={creator} />
        </div>
      )}
    </div>
  );
}