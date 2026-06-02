"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  VolumeX,
  Lock,
  Maximize2,
  Heart,
  Eye,
  Crown,
  Sparkles,
  Star,
  MapPin,
  BadgeCheck,
} from "lucide-react";
import { AccessLevel } from "@prisma/client";
import { toggleLikeById } from "@/app/actions/likePost";
import { incrementPostView } from "@/app/actions/viewPost";

type FeedPostProps = {
  post: {
    id: number;
    title: string;
    mediaUrl: string | null;
    mediaKind: string | null;
    blurred: boolean;
    accessLevel: AccessLevel;
    /** VIP+ creator-controlled tease-blur strength, in CSS pixels (4..25).
     *  Default 8 keeps motion visible. Optional — older callers that
     *  don't pass it use the default. */
    blurIntensity?: number;
    /** Whether the WhatsApp lock overlay renders on top of the tease blur.
     *  Default true (preserves current behavior). Set false when the
     *  creator wants the blur alone — taps then route to the profile
     *  page instead of WhatsApp. Only meaningful when `blurred` is true. */
    showLock?: boolean;
    creator: {
      id: number;
      name: string;
      city: string;
      tier: AccessLevel;
      avatarUrl: string | null;
      verified?: boolean;
      /** Creator's WhatsApp number, used by the lock-overlay to send a
       *  visitor straight into a WhatsApp conversation. Optional — when
       *  missing the lock falls back to a "view profile" link. */
      whatsappNumber?: string | null;
    };
    likes: number;
    isLiked: boolean;
    /** Total view count for this post */
    views?: number;
  };
  index: number;
  /** When provided, tapping the media calls this and the post opens in a full-screen reel viewer. */
  onOpenReel?: (postId: number) => void;
};

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.floor(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

export function FeedPost({ post, index, onOpenReel }: FeedPostProps) {
  const [hovered, setHovered] = useState(false);
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [viewCount, setViewCount] = useState(post.views ?? 0);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVipPlus = post.creator.tier === "VIP_PLUS";
  const isVip = post.creator.tier === "VIP";
  const isPremium = post.creator.tier === "PREMIUM";
  const isLocked = post.blurred;
  // Lock overlay defaults to true to preserve current behavior. When the
  // creator opts out, isLocked stays true (blur still applies) but the
  // central lock + WhatsApp button is replaced by a profile-page tap link.
  const showLock = post.showLock !== false;
  const isVideo = post.mediaKind === "VIDEO";
  // Tease-blur intensity, clamped to match the server clamp (4..25). The
  // floor stays at 2 here as defense-in-depth — older posts saved before
  // the form's min could legally hold any positive integer, and we don't
  // want a stray 0 collapsing to "no blur." Default 8 keeps motion visible
  // at the sweet spot for posts that didn't set a value.
  const blurPx = Math.min(25, Math.max(2, post.blurIntensity ?? 8));

  // Pre-compose the WhatsApp link the lock overlay opens. We strip
  // non-digits + URL-encode a pre-filled message so the visitor's WA
  // conversation arrives already greeting the creator by name.
  const whatsappDeepLink = post.creator.whatsappNumber
    ? `https://wa.me/${encodeURIComponent(
        post.creator.whatsappNumber.replace(/[^0-9]/g, ""),
      )}?text=${encodeURIComponent(
        `Hi ${post.creator.name}, I saw your post on Midnight and want to see more.`,
      )}`
    : null;

  // Sync muted state to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  }

  function handleLoadedMetadata() {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current;
    if (!v || isLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
  }

  const [isPending, startTransition] = useTransition();

  function toggleLike() {
    // Optimistic update — UI responds instantly
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);

    startTransition(async () => {
      try {
        const result = await toggleLikeById(post.id);
        // Reconcile with server's authoritative count (e.g. another viewer liked too)
        setLiked(result.liked);
        setLikeCount(result.count);
      } catch (err) {
        // Roll back on failure (e.g. not logged in)
        setLiked(prevLiked);
        setLikeCount(prevCount);
        const msg = err instanceof Error ? err.message : "Failed to like";
        if (msg === "Unauthorized") {
          window.location.href = "/login";
        }
      }
    });
  }

  function handleViewIncrement() {
    setViewCount((prev) => prev + 1);
    incrementPostView(post.id).catch(() => {});
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div style={{
      width: "100%", maxWidth: "560px",
      margin: "0 auto",
      borderRadius: "20px", overflow: "hidden",
      border: isVipPlus
        ? "1px solid rgba(230,168,23,0.3)"
        : isVip
        ? "1px solid rgba(168,85,247,0.2)"
        : "1px solid var(--border)",
      background: "var(--bg-surface)",
      opacity: 0,
      animation: `fadeUp 0.5s ease forwards ${index * 0.08}s`,
    }}>

      {/* VIP+ gold top line */}
      {isVipPlus && (
        <div style={{
          height: "2px",
          background: "linear-gradient(90deg, transparent, rgba(230,168,23,0.8), transparent)",
        }} />
      )}

      {/* Creator header */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
      }}>
        <Link href={`/creator/${post.creator.id}`} style={{
          display: "flex", alignItems: "center",
          gap: "10px", textDecoration: "none",
        }}>
          {/* Avatar */}
          <div style={{
            width: "38px", height: "38px",
            borderRadius: "50%", overflow: "hidden",
            border: isVipPlus
              ? "2px solid rgba(230,168,23,0.5)"
              : isVip
              ? "2px solid rgba(168,85,247,0.4)"
              : "2px solid var(--border)",
            background: "var(--bg-surface-alt)",
            display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
          }}>
            {post.creator.avatarUrl ? (
              <img
                src={post.creator.avatarUrl}
                alt={post.creator.name}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <span style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "16px", fontWeight: 700,
                color: isVipPlus
                  ? "rgba(230,168,23,0.6)"
                  : "var(--text-muted)",
              }}>
                {post.creator.name.charAt(0)}
              </span>
            )}
          </div>

          {/* Name + location */}
          <div>
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              <span style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "15px", fontWeight: 700,
                color: "var(--text-primary)",
              }}>{post.creator.name}</span>

              {post.creator.verified && (
                <BadgeCheck
                  size={14}
                  color="#3b9eff"
                  aria-label="Verified"
                  style={{
                    filter: "drop-shadow(0 0 4px rgba(59,158,255,0.4))",
                    flexShrink: 0,
                  }}
                />
              )}

              {isVipPlus && (
                <span style={{
                  padding: "1px 7px", borderRadius: "10px",
                  background: "rgba(230,168,23,0.1)",
                  border: "1px solid rgba(230,168,23,0.35)",
                  color: "var(--accent-gold)",
                  fontSize: "9px",
                  fontFamily: "var(--font-dm-mono)",
                  fontWeight: 700, letterSpacing: "0.06em",
                  display: "inline-flex", alignItems: "center", gap: "3px",
                }}>
                  <Crown size={9} />
                  VIP+
                </span>
              )}
              {isVip && (
                <span style={{
                  padding: "1px 7px", borderRadius: "10px",
                  background: "rgba(168,85,247,0.1)",
                  border: "1px solid rgba(168,85,247,0.3)",
                  color: "var(--accent-purple)",
                  fontSize: "9px",
                  fontFamily: "var(--font-dm-mono)",
                  fontWeight: 700, letterSpacing: "0.06em",
                  display: "inline-flex", alignItems: "center", gap: "3px",
                }}>
                  <Sparkles size={9} />
                  VIP
                </span>
              )}
              {isPremium && (
                <span style={{
                  padding: "1px 7px", borderRadius: "10px",
                  background: "rgba(232,84,122,0.1)",
                  border: "1px solid rgba(232,84,122,0.3)",
                  color: "#E8547A",
                  fontSize: "9px",
                  fontFamily: "var(--font-dm-mono)",
                  fontWeight: 700, letterSpacing: "0.06em",
                  display: "inline-flex", alignItems: "center", gap: "3px",
                }}>
                  <Star size={9} />
                  PREMIUM
                </span>
              )}
            </div>
            <span style={{
              fontSize: "11px",
              fontFamily: "var(--font-dm-mono)",
              color: "var(--text-muted)",
              letterSpacing: "0.04em",
              display: "inline-flex", alignItems: "center", gap: "3px",
            }}>
              <MapPin size={10} />
              {post.creator.city || "—"}
            </span>
          </div>
        </Link>

        {/* View profile */}
        <Link href={`/creator/${post.creator.id}`} style={{
          fontSize: "10px",
          fontFamily: "var(--font-dm-mono)",
          color: "var(--accent-purple)",
          textDecoration: "none",
          letterSpacing: "0.08em",
          padding: "5px 12px", borderRadius: "8px",
          border: "1px solid rgba(168,85,247,0.2)",
          background: "var(--accent-purple-soft)",
          transition: "all 0.2s ease",
        }}>VIEW →</Link>
      </div>

      {/* Media */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleViewIncrement}
        style={{
          position: "relative", width: "100%",
          aspectRatio: "1/1", overflow: "hidden",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          cursor: "pointer",
        }}
      >
        {post.mediaUrl ? (
          isVideo ? (
            <video
              ref={videoRef}
              src={post.mediaUrl}
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                filter: isLocked ? `blur(${blurPx}px) brightness(0.85)` : "none",
                transform: hovered && !isLocked ? "scale(1.03)" : "scale(1)",
                transition: "transform 0.4s ease",
              }}
              muted
              loop
              autoPlay
              playsInline
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt={post.title}
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                filter: isLocked ? `blur(${blurPx}px) brightness(0.85)` : "none",
                transform: hovered && !isLocked ? "scale(1.03)" : "scale(1)",
                transition: "all 0.4s ease",
              }}
            />
          )
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-cormorant)",
            fontSize: "80px", fontWeight: 700,
            color: "rgba(168,85,247,0.1)",
          }}>
            {post.creator.name.charAt(0)}
          </div>
        )}

        {/* Tap-anywhere overlay: opens the fullscreen reel viewer when provided */}
        {onOpenReel && !isLocked && post.mediaUrl && (
          <button
            onClick={() => onOpenReel(post.id)}
            aria-label="Open in fullscreen"
            style={{
              position: "absolute",
              inset: 0,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              zIndex: 2,
            }}
          />
        )}

        {/* Mute / Unmute button — videos only, not locked */}
        {isVideo && !isLocked && post.mediaUrl && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setMuted((prev) => !prev);
            }}
            style={{
              position: "absolute", top: "10px", right: "10px",
              width: "36px", height: "36px",
              borderRadius: "12px",
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)",
              transition: "background 0.2s ease",
              zIndex: 5,
            }}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </motion.button>
        )}

        {/* Expand-to-fullscreen hint icon */}
        {onOpenReel && !isLocked && post.mediaUrl && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
              color: "#fff",
              opacity: 0.85,
              pointerEvents: "none",
              zIndex: 5,
            }}
            aria-hidden
          >
            <Maximize2 size={13} />
          </div>
        )}

        {/* Lock overlay (creator opted-in: blur AND showLock=true).
            The lock is the call to action. Tap → straight to WhatsApp
            with a pre-filled greeting (when the creator has a number set).
            Falls back to a "view profile" link otherwise.
            The visitor never has to register; the tease is the conversion
            funnel. */}
        {isLocked && showLock && (
          <a
            href={whatsappDeepLink ?? `/creator/${post.creator.id}`}
            target={whatsappDeepLink ? "_blank" : undefined}
            rel={whatsappDeepLink ? "noopener noreferrer" : undefined}
            aria-label={
              whatsappDeepLink
                ? `Open WhatsApp to ${post.creator.name}`
                : "View creator profile"
            }
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
              // Lighter scrim so the underlying motion still reads through
              // the blur — reinforces that there's something happening
              // worth tapping for.
              background: "rgba(0, 0, 0, 0.22)",
              textDecoration: "none",
              zIndex: 4,
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, rgba(168,85,247,0.30), rgba(124,58,237,0.35))",
                border: "1px solid rgba(255,255,255,0.30)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow:
                  "0 8px 32px rgba(168,85,247,0.45), inset 0 1px 0 rgba(255,255,255,0.20)",
                transition: "transform 0.2s ease",
              }}
            >
              <Lock size={26} strokeWidth={2.2} />
            </div>

            <p
              style={{
                fontSize: "13px",
                fontFamily: "var(--font-cormorant)",
                color: "#fff",
                letterSpacing: "0.04em",
                textAlign: "center",
                fontWeight: 700,
                margin: 0,
                textShadow: "0 2px 8px rgba(0,0,0,0.55)",
              }}
            >
              Tap to unlock
            </p>

            <span
              style={{
                padding: "9px 22px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #25D366, #128C7E)",
                color: "#fff",
                fontSize: "11px",
                fontFamily: "var(--font-dm-mono)",
                fontWeight: 800,
                letterSpacing: "0.10em",
                boxShadow: "0 6px 22px rgba(37, 211, 102, 0.45)",
                whiteSpace: "nowrap",
              }}
            >
              {whatsappDeepLink ? "OPEN WHATSAPP" : "VIEW PROFILE →"}
            </span>
          </a>
        )}

        {/* "Blur tease, no lock" path — the creator opted into blur but
            opted OUT of the WhatsApp lock overlay. We still need a tap
            target so the blur isn't a dead end; the whole area becomes a
            quiet link to the creator profile. No icons, no CTA chrome —
            keeps the aesthetic clean per the creator's preference. */}
        {isLocked && !showLock && (
          <a
            href={`/creator/${post.creator.id}`}
            aria-label={`View ${post.creator.name}'s profile`}
            style={{
              position: "absolute",
              inset: 0,
              display: "block",
              background: "rgba(0, 0, 0, 0.15)",
              textDecoration: "none",
              zIndex: 4,
            }}
          />
        )}

        {/* VIP+ shimmer top */}
        {isVipPlus && !isLocked && (
          <div style={{
            position: "absolute", top: 0,
            left: 0, right: 0, height: "2px",
            background: "linear-gradient(90deg, transparent, rgba(230,168,23,0.6), transparent)",
          }} />
        )}

        {/* Video progress bar — bottom of media */}
        {isVideo && !isLocked && post.mediaUrl && (
          <div
            onClick={handleSeek}
            style={{
              position: "absolute", bottom: 0,
              left: 0, right: 0,
              height: "3px",
              background: "rgba(255,255,255,0.15)",
              cursor: "pointer",
              zIndex: 4,
            }}
          >
            <div style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: isVipPlus
                ? "rgba(230,168,23,0.9)"
                : "rgba(168,85,247,0.9)",
              transition: "width 0.2s linear",
            }} />
          </div>
        )}
      </div>

      {/* Post footer */}
      <div style={{ padding: "12px 16px 14px" }}>
        {/* Title */}
        <p style={{
          fontSize: "13px",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-dm-sans)",
          lineHeight: 1.5, margin: "0 0 10px",
        }}>{post.title}</p>

        {/* Action row: like + views + video duration */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "14px",
          }}>
            {/* Like button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={toggleLike}
              disabled={isPending}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: "none", border: "none",
                cursor: isPending ? "wait" : "pointer",
                padding: "4px 0",
              }}
              aria-label={liked ? "Unlike" : "Like"}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={liked ? "liked" : "unliked"}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  style={{ display: "flex" }}
                >
                  <Heart
                    size={20}
                    fill={liked ? "#ef4444" : "transparent"}
                    color={liked ? "#ef4444" : "var(--text-muted)"}
                    strokeWidth={liked ? 0 : 1.8}
                  />
                </motion.span>
              </AnimatePresence>
              <span style={{
                fontSize: "12px",
                fontFamily: "var(--font-dm-mono)",
                color: liked ? "#ef4444" : "var(--text-muted)",
                transition: "color 0.2s ease",
                letterSpacing: "0.04em",
                minWidth: "10px",
              }}>
                {formatCount(likeCount)}
              </span>
            </motion.button>

            {/* Post view count */}
            <span style={{
              display: "flex", alignItems: "center", gap: "5px",
              fontSize: "11px",
              fontFamily: "var(--font-dm-mono)",
              color: "var(--text-muted)",
              letterSpacing: "0.04em",
            }}>
              <Eye size={14} />
              {formatCount(viewCount)}
            </span>
          </div>

          {/* Video duration */}
          {isVideo && duration > 0 && (
            <span style={{
              fontSize: "10px",
              fontFamily: "var(--font-dm-mono)",
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
            }}>
              {formatTime(progress * duration)} / {formatTime(duration)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}