"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import {
  deletePost,
  editPostCaption,
  editPostAccessLevel,
  togglePostBlur,
} from "../actions/managePosts";

/* ──────── Types ──────── */

type MediaItem = {
  id: number;
  kind: string;   // "IMAGE" | "VIDEO"
  filePath: string;
};

export type ManagedPost = {
  id: number;
  title: string;
  content: string | null;
  accessLevel: string;
  blurred: boolean;
  postType: string;
  createdAt: string;
  media: MediaItem[];
};

type Props = {
  post: ManagedPost;
  creatorTier: string;
};

/* ──────── Access-level styling helper ──────── */

const accessBadge = (level: string) => {
  if (level === "VIP_PLUS")
    return "text-amber-300 border-amber-400/30 bg-amber-400/10";
  if (level === "VIP")
    return "text-purple-300 border-purple-500/30 bg-purple-500/10";
  return "text-white/30 border-white/10 bg-white/[0.03]";
};

const accessLabel = (level: string) =>
  level === "VIP_PLUS" ? "VIP+" : level;

/* ════════════════════════════════════════════════
   PostManagementCard
   ════════════════════════════════════════════════ */

export default function PostManagementCard({ post, creatorTier }: Props) {
  /* ── transition state ── */
  const [pending, start] = useTransition();

  /* ── editing states ── */
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content ?? "");
  const [access, setAccess] = useState(post.accessLevel);
  const [blurred, setBlurred] = useState(post.blurred);

  /* ── confirm-delete flag ── */
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* ── video ref for autoplay ── */
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  /* ── Handlers ── */

  function handleSaveCaption() {
    start(async () => {
      await editPostCaption(post.id, title, content || null);
      setEditing(false);
    });
  }

  function handleAccessChange(val: string) {
    setAccess(val);
    start(async () => {
      await editPostAccessLevel(
        post.id,
        val as "REGULAR" | "VIP" | "VIP_PLUS"
      );
    });
  }

  function handleBlurToggle(val: boolean) {
    setBlurred(val);
    start(async () => {
      await togglePostBlur(post.id, val);
    });
  }

  function handleDelete() {
    start(async () => {
      await deletePost(post.id);
    });
  }

  /* ─── first media for preview ─── */
  const firstMedia = post.media[0] ?? null;

  return (
    <div
      className={`rounded-xl border bg-[#0a0a12] overflow-hidden transition ${
        pending
          ? "opacity-50 pointer-events-none border-white/[0.04]"
          : "border-white/[0.06] hover:border-purple-500/20"
      }`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* ─── MEDIA PREVIEW (left / top) ─── */}
        <div className="sm:w-48 sm:shrink-0 h-44 sm:h-auto bg-white/[0.02] relative overflow-hidden">
          {firstMedia ? (
            firstMedia.kind === "VIDEO" ? (
              <video
                ref={videoRef}
                src={firstMedia.filePath}
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={firstMedia.filePath}
                alt=""
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-white/10 text-4xl">
              ▦
            </div>
          )}

          {/* Blur overlay indicator */}
          {post.blurred && (
            <div className="absolute inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center">
              <span className="text-[10px] text-white/60 bg-black/50 px-2 py-1 rounded-lg font-medium">
                Blurred
              </span>
            </div>
          )}

          {/* Media count badge */}
          {post.media.length > 1 && (
            <span className="absolute top-2 right-2 bg-black/70 text-[10px] text-white/70 px-1.5 py-0.5 rounded-md font-medium">
              +{post.media.length - 1}
            </span>
          )}
        </div>

        {/* ─── DETAILS (right / bottom) ─── */}
        <div className="flex-1 p-4 flex flex-col gap-3 min-w-0">
          {/* Header row: badges + date */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  post.postType === "GALLERY"
                    ? "text-blue-300 border-blue-500/30 bg-blue-500/10"
                    : "text-green-300 border-green-500/30 bg-green-500/10"
                }`}
              >
                {post.postType}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${accessBadge(
                  access
                )}`}
              >
                {accessLabel(access)}
              </span>
              {blurred && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-pink-300 border-pink-500/30 bg-pink-500/10">
                  BLUR ON
                </span>
              )}
            </div>
            <span className="text-[11px] text-white/25 shrink-0">
              {new Date(post.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* ── EDIT MODE or DISPLAY MODE ── */}
          {editing ? (
            <div className="space-y-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
                placeholder="Post title"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 resize-none"
                placeholder="Caption..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveCaption}
                  disabled={pending}
                  className="rounded-lg bg-purple-600 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-purple-500 disabled:opacity-40 transition"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setTitle(post.title);
                    setContent(post.content ?? "");
                  }}
                  className="rounded-lg bg-white/[0.04] px-4 py-1.5 text-[12px] font-medium text-white/50 hover:text-white/70 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-[14px] font-semibold text-white truncate">
                {post.title}
              </h3>
              {post.content && (
                <p className="text-[12px] text-white/45 mt-0.5 line-clamp-2">
                  {post.content}
                </p>
              )}
            </div>
          )}

          {/* ── CONTROL ROW ── */}
          <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
            {/* Edit caption button */}
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/[0.08] transition"
              >
                ✎ Edit caption
              </button>
            )}

            {/* Access level select */}
            <select
              value={access}
              onChange={(e) => handleAccessChange(e.target.value)}
              className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/60 focus:outline-none hover:text-white transition cursor-pointer"
            >
              <option value="REGULAR">Public</option>
              <option value="VIP">VIP</option>
              <option value="VIP_PLUS">VIP+</option>
            </select>

            {/* Blur toggle (VIP_PLUS creators only) */}
            {creatorTier === "VIP_PLUS" && (
              <button
                type="button"
                onClick={() => handleBlurToggle(!blurred)}
                className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition ${
                  blurred
                    ? "border-pink-500/30 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20"
                    : "border-white/[0.06] bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {blurred ? "◉ Blur ON" : "○ Blur OFF"}
              </button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Delete */}
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-red-400/80">Delete?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg bg-red-600/20 border border-red-500/30 px-3 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-600/30 transition"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/40 hover:text-white/60 transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition"
              >
                🗑 Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
