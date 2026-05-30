"use client";

import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Volume2,
  VolumeX,
  Heart,
  Pause,
  Play,
  Lock,
  Crown,
  Sparkles,
  MapPin,
  Eye,
} from "lucide-react";
import { AccessLevel } from "@prisma/client";
import { toggleLikeById } from "@/app/actions/likePost";

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.floor(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

function describeTier(tier: AccessLevel): string {
  if (tier === "VIP_PLUS") return "VIP plus creator";
  if (tier === "VIP") return "VIP creator";
  return "";
}

function describePost(post: ReelPost, index: number, total: number): string {
  const tier = describeTier(post.creator.tier);
  const parts = [
    `Post ${index + 1} of ${total}`,
    `by ${post.creator.name}`,
    tier,
    post.blurred
      ? "Locked exclusive content. Contact the creator to view."
      : post.title || "",
  ];
  return parts.filter(Boolean).join(". ");
}

const VISUALLY_HIDDEN: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

export type ReelPost = {
  id: number;
  title: string;
  mediaUrl: string | null;
  mediaKind: string | null;
  blurred: boolean;
  /** Creator-chosen tease-blur strength in CSS pixels (4..25). Optional —
   *  older callers fall back to the default 8 inside the renderer. */
  blurIntensity?: number;
  /** Whether the WhatsApp lock overlay sits on top of the blur tease.
   *  Default true. Forwarded to FeedPost which the reel viewer renders. */
  showLock?: boolean;
  accessLevel: AccessLevel;
  likes: number;
  isLiked: boolean;
  views?: number;
  creator: {
    id: number;
    name: string;
    city: string;
    tier: AccessLevel;
    avatarUrl: string | null;
  };
};

type Props = {
  posts: ReelPost[];
  startIndex: number;
  onClose: () => void;
};

/**
 * Full-screen, snap-scrolling vertical video viewer.
 *
 * Behavior:
 *  - Each post fills the viewport. CSS scroll-snap snaps one post per swipe.
 *  - Tap the video → toggles play/pause.
 *  - Drag/click on the progress bar at the bottom → scrubs the current video.
 *  - Only the post currently in view auto-plays; others pause.
 *  - Mute is a single global setting (toggling on one post applies to all).
 */
export function FeedReelViewer({ posts, startIndex, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [muted, setMuted] = useState(true);

  // Hide the global mute toggle when the active slide is a still image —
  // it would lie about doing anything (images have no audio to mute).
  // Recomputed per render based on the slide currently in view; cheap.
  const activePost = posts[activeIndex];
  const activeIsVideo = activePost?.mediaKind === "VIDEO";

  // Scroll to the starting post on mount (avoid scrollIntoView's animation
  // because we want the snap to land instantly).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: startIndex * el.clientHeight, behavior: "instant" as ScrollBehavior });
  }, [startIndex]);

  // Detect which post is currently in view → make it the active video.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        }
      },
      { root: el, threshold: [0.7] }
    );

    el.querySelectorAll<HTMLElement>("[data-idx]").forEach((node) =>
      observer.observe(node)
    );
    return () => observer.disconnect();
  }, [posts.length]);

  // Pause every video except the active one; play the active one.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      v.muted = muted;
      if (i === activeIndex) {
        v.play().catch(() => {});
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, [activeIndex, muted]);

  // Lock body scroll while viewer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC to close + Tab trap (keeps focus inside the modal while open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = rootRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus management — move focus into the modal on mount; restore on unmount
  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    // Focus the close button so screen readers announce the modal entry point
    closeBtnRef.current?.focus();
    return () => {
      prevFocusRef.current?.focus?.();
    };
  }, []);

  // Keyboard navigation between reels — Arrow/PageUp-Down, Home/End
  const onContainerKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const step = el.clientHeight;
    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
      e.preventDefault();
      el.scrollBy({ top: step, behavior: "smooth" });
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      el.scrollBy({ top: -step, behavior: "smooth" });
    } else if (e.key === "Home") {
      e.preventDefault();
      el.scrollTo({ top: 0, behavior: "smooth" });
    } else if (e.key === "End") {
      e.preventDefault();
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, []);

  return (
    <motion.div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Reels viewer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "#000",
      }}
    >
      {/* Live region for screen readers — announces the active post on snap */}
      <div aria-live="polite" aria-atomic="true" style={VISUALLY_HIDDEN}>
        {posts[activeIndex] && describePost(posts[activeIndex], activeIndex, posts.length)}
      </div>

      {/* Close button */}
      <motion.button
        ref={closeBtnRef}
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        aria-label="Close reels viewer"
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 12px)",
          left: "12px",
          zIndex: 10,
          width: "40px",
          height: "40px",
          borderRadius: "12px",
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <X size={18} />
      </motion.button>

      {/* Global mute — only when the slide in view actually has audio.
          Photos hide this button entirely so we don't expose a control
          that does nothing. */}
      {activeIsVideo && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute" : "Mute"}
          style={{
            position: "absolute",
            top: "calc(env(safe-area-inset-top, 0px) + 12px)",
            right: "12px",
            zIndex: 10,
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </motion.button>
      )}

      {/* Snap-scroll container — focusable + arrow-key navigable */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={`Reels gallery, ${posts.length} posts. Use arrow keys to navigate.`}
        onKeyDown={onContainerKey}
        style={{
          position: "absolute",
          inset: 0,
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          outline: "none",
        }}
      >
        {posts.map((post, i) => (
          <ReelItem
            key={post.id}
            post={post}
            index={i}
            total={posts.length}
            muted={muted}
            videoRef={(el) => {
              videoRefs.current[i] = el;
            }}
          />
        ))}
      </div>

      {/* Hint: only show when on first post */}
      {activeIndex === 0 && posts.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            position: "absolute",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
            left: 0,
            right: 0,
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 10,
            fontFamily: "var(--font-dm-mono)",
            fontSize: "10px",
            color: "rgba(255,255,255,0.8)",
            letterSpacing: "0.14em",
          }}
        >
          SWIPE UP FOR NEXT ↑
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   ReelItem — one full-viewport post
   ──────────────────────────────────────────── */

function ReelItem({
  post,
  index,
  total,
  muted,
  videoRef,
}: {
  post: ReelPost;
  index: number;
  total: number;
  muted: boolean;
  videoRef: (el: HTMLVideoElement | null) => void;
}) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPauseIcon, setShowPauseIcon] = useState(false);

  const isVideo = post.mediaKind === "VIDEO";
  const isLocked = post.blurred;
  const isVipPlus = post.creator.tier === "VIP_PLUS";
  const isVip = post.creator.tier === "VIP";

  const setRefs = useCallback(
    (el: HTMLVideoElement | null) => {
      localVideoRef.current = el;
      videoRef(el);
    },
    [videoRef]
  );

  const togglePlay = () => {
    const v = localVideoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
    // Brief icon flash
    setShowPauseIcon(true);
    setTimeout(() => setShowPauseIcon(false), 500);
  };

  const handleTimeUpdate = () => {
    const v = localVideoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  };

  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const v = localVideoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
    setProgress(ratio);
  };

  const canTogglePlay = isVideo && !isLocked;

  return (
    <section
      data-idx={index}
      aria-roledescription="reel"
      aria-label={describePost(post, index, total)}
      aria-posinset={index + 1}
      aria-setsize={total}
      style={{
        height: "100dvh",
        width: "100%",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        position: "relative",
        background: "#000",
      }}
    >
      {/* Media — wrapped in a button when the video is playable so keyboard
          users can pause/play with Space or Enter */}
      <div
        role={canTogglePlay ? "button" : undefined}
        tabIndex={canTogglePlay ? 0 : undefined}
        aria-label={canTogglePlay ? (paused ? "Play video" : "Pause video") : undefined}
        onClick={canTogglePlay ? togglePlay : undefined}
        onKeyDown={canTogglePlay
          ? (e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                togglePlay();
              }
            }
          : undefined}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isVideo ? "pointer" : "default",
          outline: "none",
        }}
      >
        {post.mediaUrl ? (
          isVideo ? (
            <video
              ref={setRefs}
              src={post.mediaUrl}
              muted={muted}
              loop
              playsInline
              autoPlay={index === 0}
              onTimeUpdate={handleTimeUpdate}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: isLocked ? "blur(28px) brightness(0.6)" : "none",
              }}
            />
          ) : (
            // Images viewport: contain instead of cover so the whole image
            // is visible (creators upload portrait + landscape mixes).
            // Wrapped in ZoomableImage so visitors can pinch-zoom on touch
            // devices and double-tap on any device to toggle a 2× zoom.
            // The zoom container's `touch-action: pinch-zoom` opts out of
            // the parent's vertical scroll-snap for two-finger gestures,
            // so pinching never accidentally swipes to the next reel.
            <ZoomableImage
              src={post.mediaUrl}
              alt={post.title}
              priority={index === 0}
              isLocked={isLocked}
            />
          )
        ) : (
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>
            No media
          </div>
        )}

        {/* Pause/play icon flash */}
        <AnimatePresence>
          {isVideo && !isLocked && showPauseIcon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.9, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18 }}
              style={{
                position: "absolute",
                width: "78px",
                height: "78px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                color: "#fff",
              }}
            >
              {paused ? <Play size={32} fill="#fff" /> : <Pause size={32} fill="#fff" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gradient at bottom for legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 12%, transparent 60%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Right rail: just like, for now. The previous "comment" and "share"
          icons were aspirational placeholders that didn't wire to anything —
          comment had no thread infrastructure, share had no onClick. Better
          to ship one working button than three lying ones. Re-add them
          when there's real functionality behind each. */}
      <div
        style={{
          position: "absolute",
          right: "12px",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 110px)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          alignItems: "center",
        }}
      >
        <LikeRailButton
          postId={post.id}
          initialLiked={post.isLiked}
          initialCount={post.likes}
        />
      </div>

      {/* Bottom: creator info + caption */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)",
          padding: "0 16px",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <Link
          href={`/creator/${post.creator.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            color: "#fff",
          }}
        >
          {post.creator.avatarUrl ? (
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                overflow: "hidden",
                border: isVipPlus
                  ? "2px solid rgba(230,168,23,0.6)"
                  : isVip
                  ? "2px solid rgba(168,85,247,0.45)"
                  : "1px solid rgba(255,255,255,0.2)",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <Image
                src={post.creator.avatarUrl}
                alt=""
                fill
                sizes="40px"
                unoptimized={
                  !post.creator.avatarUrl.startsWith("https://res.cloudinary.com")
                }
                style={{ objectFit: "cover" }}
              />
            </div>
          ) : (
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-cormorant)",
                fontSize: "18px",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {post.creator.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "15px",
                fontWeight: 700,
                fontFamily: "var(--font-cormorant)",
              }}
            >
              {post.creator.name}
              {isVipPlus && (
                <span role="img" aria-label="VIP plus creator" style={{ display: "inline-flex" }}>
                  <Crown size={13} color="var(--accent-gold)" aria-hidden />
                </span>
              )}
              {isVip && (
                <span role="img" aria-label="VIP creator" style={{ display: "inline-flex" }}>
                  <Sparkles size={13} color="var(--accent-purple)" aria-hidden />
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "11px",
                fontFamily: "var(--font-dm-mono)",
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.06em",
              }}
            >
              {post.creator.city && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={10} /> {post.creator.city}
                </span>
              )}
              {typeof post.views === "number" && post.views > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Eye size={11} /> {formatCount(post.views)}
                </span>
              )}
            </div>
          </div>
        </Link>

        {!isLocked && post.title && (
          <p
            style={{
              fontSize: "13px",
              fontFamily: "var(--font-dm-sans)",
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.5,
              margin: 0,
              maxWidth: "calc(100% - 60px)",
            }}
          >
            {post.title}
          </p>
        )}

        {isLocked && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 14px",
              borderRadius: "12px",
              background: "rgba(168,85,247,0.18)",
              border: "1px solid rgba(168,85,247,0.4)",
              alignSelf: "flex-start",
              fontSize: "12px",
              fontFamily: "var(--font-dm-mono)",
              letterSpacing: "0.06em",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            <Lock size={12} />
            Exclusive · Contact creator
          </div>
        )}
      </div>

      {/* Progress bar (videos only) — tap/click to scrub */}
      {isVideo && !isLocked && (
        <div
          onPointerDown={seek}
          onPointerMove={(e) => {
            if (e.buttons !== 1) return;
            seek(e);
          }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "16px", // taller hit target than visible bar
            display: "flex",
            alignItems: "flex-end",
            cursor: "pointer",
            touchAction: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "3px",
              background: "rgba(255,255,255,0.18)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${progress * 100}%`,
                background: isVipPlus
                  ? "var(--accent-gold)"
                  : "var(--accent-purple)",
                transition: "width 0.1s linear",
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

/* Like button on the right rail — real, persisted, with optimistic UI */
function LikeRailButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: number;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();
  const [burst, setBurst] = useState(0); // re-trigger key for the heart burst

  const onClick = () => {
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setBurst((b) => b + 1);

    startTransition(async () => {
      try {
        const result = await toggleLikeById(postId);
        setLiked(result.liked);
        setCount(result.count);
      } catch (err) {
        setLiked(prevLiked);
        setCount(prevCount);
        const msg = err instanceof Error ? err.message : "Failed";
        if (msg === "Unauthorized") {
          window.location.href = "/login";
        }
      }
    });
  };

  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      disabled={isPending}
      aria-label={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        background: "transparent",
        border: "none",
        color: "#fff",
        cursor: isPending ? "wait" : "pointer",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "14px",
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "visible",
        }}
      >
        <AnimatePresence>
          {liked && (
            <motion.span
              key={burst}
              initial={{ scale: 0.4, opacity: 0.6 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Heart size={32} fill="#ef4444" color="#ef4444" />
            </motion.span>
          )}
        </AnimatePresence>
        <motion.span
          animate={{ scale: liked ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          style={{ display: "flex" }}
        >
          <Heart
            size={26}
            fill={liked ? "#ef4444" : "transparent"}
            color={liked ? "#ef4444" : "#fff"}
            strokeWidth={liked ? 0 : 1.8}
          />
        </motion.span>
      </div>
      <span
        style={{
          fontSize: "11px",
          fontFamily: "var(--font-dm-mono)",
          color: "rgba(255,255,255,0.95)",
          letterSpacing: "0.04em",
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          minHeight: "13px",
        }}
      >
        {count > 0 ? formatCount(count) : ""}
      </span>
    </motion.button>
  );
}


/**
 * Touch-aware image viewer used by FeedReelViewer for image posts.
 *
 * Why we don't just use <Image fill> directly:
 *   - Mixed orientations: creators upload portrait + landscape images.
 *     `object-cover` would crop landscape into a portrait viewport;
 *     `object-contain` shows the whole frame with letterbox bars.
 *   - Pinch + double-tap: visitors expect to be able to zoom into details
 *     (faces, text on signs, etc.) without the parent scroll-snap
 *     hijacking the gesture.
 *
 * Implementation notes:
 *   - Native pinch via `touch-action: pinch-zoom` would work in isolation,
 *     but it conflicts with the parent's vertical `scroll-snap-type` —
 *     iOS treats pinch as a page-zoom and Android falls through to the
 *     snap container. So we implement pinch ourselves with pointer
 *     events, which gives consistent behavior across both.
 *   - Double-tap toggles between 1× and 2× zoom centered on the tap.
 *     Stops bubbling so the parent's "tap to pause video" handler
 *     doesn't fire (this is an image — there's nothing to pause).
 *   - Released zoom > 1 stays zoomed; visitors can drag to pan. Single
 *     tap (no drag, scale near 1) snaps back to 1× so they can swipe to
 *     the next reel without first un-zooming manually.
 */
function ZoomableImage({
  src,
  alt,
  priority,
  isLocked,
}: {
  src: string;
  alt: string;
  priority: boolean;
  isLocked: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Transform state. We update with state (not refs) so React re-renders
  // when zoom changes — kept simple even though it means a render per
  // pointermove. Volume is small and the transform is GPU-accelerated.
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // Pinch state lives in a ref so the pointermove handler doesn't
  // recreate itself every render.
  const pinch = useRef<{
    p1: { id: number; x: number; y: number };
    p2: { id: number; x: number; y: number };
    initialDist: number;
    initialScale: number;
    initialTx: number;
    initialTy: number;
  } | null>(null);

  const lastTap = useRef<number>(0);
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (isLocked) return;
    const t = Date.now();

    // Detect double-tap: two single-finger taps within 280ms.
    if (
      !pinch.current &&
      e.pointerType !== "mouse" &&
      t - lastTap.current < 280
    ) {
      // Toggle 2× zoom centered on the tap location relative to the wrapper.
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) {
        if (scale > 1) {
          setScale(1);
          setTx(0);
          setTy(0);
        } else {
          // Pan so the tap point ends up roughly centered after zooming.
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          setScale(2);
          setTx((cx - e.clientX) * 1);
          setTy((cy - e.clientY) * 1);
        }
      }
      lastTap.current = 0;
      e.stopPropagation();
      return;
    }
    lastTap.current = t;

    // Two-finger pinch entry: record the second pointer + initial distance.
    if (e.isPrimary === false && !pinch.current) {
      // Find the first active pointer from setPointerCapture in DOM —
      // we approximate with the current dragStart pointer if any.
      // Simpler: handle pinch in pointermove by tracking active pointers.
    }

    // Single-finger drag (only useful when already zoomed in).
    if (scale > 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, tx, ty };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (isLocked) return;

    // Drag-to-pan when zoomed.
    if (dragStart.current && scale > 1) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setTx(dragStart.current.tx + dx);
      setTy(dragStart.current.ty + dy);
    }
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current) {
      dragStart.current = null;
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  }

  // Pinch is implemented via the touchstart/touchmove API rather than
  // pointer events because pointer events don't give us the multi-touch
  // bookkeeping for free. Touch events are universally supported on the
  // devices our visitors actually use.
  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (isLocked) return;
    if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinch.current = {
        p1: { id: t1.identifier, x: t1.clientX, y: t1.clientY },
        p2: { id: t2.identifier, x: t2.clientX, y: t2.clientY },
        initialDist: dist,
        initialScale: scale,
        initialTx: tx,
        initialTy: ty,
      };
      e.preventDefault();
    }
  }

  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (isLocked || !pinch.current) return;
    if (e.touches.length < 2) return;
    const [t1, t2] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const ratio = dist / pinch.current.initialDist;
    // Clamp to [1, 4] — beyond 4× the image looks pixelated, below 1
    // we just snap back to fit.
    const nextScale = Math.min(4, Math.max(1, pinch.current.initialScale * ratio));
    setScale(nextScale);
    e.preventDefault();
  }

  function onTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length < 2) {
      pinch.current = null;
      // Snap back to no zoom if the user released near 1× — keeps the
      // image centered between reels without a manual reset.
      if (scale < 1.05) {
        setScale(1);
        setTx(0);
        setTy(0);
      }
    }
  }

  return (
    <div
      ref={wrapperRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        // Disable default browser pan + pinch on this element so we own
        // the gestures. Without `none`, iOS Safari's page-zoom kicks in
        // and conflicts with our scale state.
        touchAction: "none",
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
        unoptimized={!src.startsWith("https://res.cloudinary.com")}
        draggable={false}
        style={{
          objectFit: "contain",
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: pinch.current || dragStart.current
            ? "none"
            : "transform 0.18s ease",
          filter: isLocked ? "blur(28px) brightness(0.6)" : "none",
          // Prevent the browser-handled long-press menu on the image
          // (Android Chrome saves image, iOS shares — both disruptive
          // inside a reel viewer).
          WebkitUserSelect: "none",
          userSelect: "none",
          WebkitTouchCallout: "none",
        }}
      />
    </div>
  );
}
