// app/components/dashboard/sections/TopPerformingPosts.tsx
"use client";

import type { TIER_TOKENS } from "@/app/dashboard/DashboardShell";
import { AccessLevel } from "@prisma/client";

type Tokens = typeof TIER_TOKENS[AccessLevel];

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
  tokens: Tokens;
};

export function TopPerformingPosts({
  posts,
  tokens,
}: TopPerformingPostsProps) {
  if (posts.length === 0) return null;

  const rankColors = [
    tokens.accent,
    tokens.textMuted,
    tokens.textDim,
  ];

  const rankLabels = ["#1", "#2", "#3"];

  const tierLabel: Record<string, string> = {
    REGULAR: "Free",
    VIP: "VIP",
    VIP_PLUS: "VIP+",
  };

  return (
    <section style={{
      padding: "18px",
      borderRadius: "14px",
      border: `0.5px solid ${tokens.border}`,
      background: tokens.surface,
    }}>
      {/* Header */}
      <div style={{
        fontSize: "10px",
        fontFamily: "var(--font-dm-mono)",
        color: tokens.textMuted,
        letterSpacing: "0.08em",
        marginBottom: "14px",
      }}>TOP PERFORMING POSTS</div>

      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${posts.length}, 1fr)`,
        gap: "10px",
      }}>
        {posts.map((post, i) => (
          <div
            key={post.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: tokens.surfaceAlt,
              border: `0.5px solid ${
                i === 0 ? tokens.borderStrong : tokens.border
              }`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top accent for #1 */}
            {i === 0 && (
              <div style={{
                position: "absolute", top: 0,
                left: 0, right: 0, height: "1px",
                background: `linear-gradient(90deg, transparent, ${tokens.accent}66, transparent)`,
              }} />
            )}

            {/* Thumbnail or placeholder */}
            <div style={{
              width: "40px", height: "40px",
              borderRadius: "8px",
              background: tokens.surface,
              border: `0.5px solid ${tokens.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
              overflow: "hidden",
            }}>
              {post.thumbnail ? (
                <img
                  src={post.thumbnail}
                  alt={post.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "8px",
                  }}
                />
              ) : (
                post.mediaKind === "VIDEO" ? "🎬" : "🖼"
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: "12px",
                color: tokens.text,
                fontFamily: "var(--font-dm-sans)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginBottom: "4px",
                opacity: 0.9,
              }}>{post.title}</div>

              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <span style={{
                  fontSize: "10px",
                  color: tokens.textDim,
                  fontFamily: "var(--font-dm-mono)",
                }}>
                  {post.likes} likes
                </span>
                <span style={{
                  fontSize: "9px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: tokens.accentSoft,
                  color: tokens.accent,
                  fontFamily: "var(--font-dm-mono)",
                  letterSpacing: "0.04em",
                  border: `0.5px solid ${tokens.accent}33`,
                }}>
                  {tierLabel[post.accessLevel] ?? post.accessLevel}
                </span>
              </div>
            </div>

            {/* Rank */}
            <div style={{
              fontSize: "14px",
              fontFamily: "var(--font-cormorant)",
              fontWeight: 700,
              color: rankColors[i] ?? tokens.textDim,
              flexShrink: 0,
              opacity: i === 0 ? 1 : 0.6,
            }}>
              {rankLabels[i]}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}