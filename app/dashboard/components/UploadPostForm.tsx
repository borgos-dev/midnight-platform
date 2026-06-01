"use client";

import { uploadPost } from "../actions/uploadsPost";
import { useTransition, useState, useRef } from "react";
import { Wand2 } from "lucide-react";
import type { AccessLevel } from "@prisma/client";
import { BlurRegionEditor } from "@/app/components/blur-editor/BlurRegionEditor";
import { VideoBlurEditor } from "@/app/components/blur-editor/VideoBlurEditor";
import {
  VIDEO_DURATION_LIMIT_SECONDS,
  videoLimitLabel,
} from "@/app/lib/video-limits";

const MAX_SIZE = 50 * 1024 * 1024;
const MAX_GALLERY = 6;

/**
 * Read the duration of a video file by loading it into a hidden <video>
 * element and waiting for the metadata event. Client-side only — used to
 * give the creator early feedback before they hit submit. The server
 * re-validates against Cloudinary's reported duration (the actual authority).
 */
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read video metadata."));
    };
    video.src = url;
  });
}

type PostMode = "GALLERY" | "FEED";

type UploadPostFormProps = {
  creatorTier?: string;
  /**
   * Posts the creator has already published today (calendar-day in the
   * server's local timezone). Used to render the daily-quota readout +
   * disable submit once the cap is hit. Server action re-checks before
   * persisting so a stale prop can't bypass the limit.
   */
  postsToday?: number;
  dailyCap?: number;
  /**
   * Video posts the creator has already published today, plus the tier's
   * daily video sub-cap. Drives the secondary meter + the "videos paid-
   * only" notice on Regular. videoCap === 0 means the tier can't post
   * videos at all (Regular today).
   */
  videosToday?: number;
  videoCap?: number;
  /**
   * Number of days a post lives before auto-deletion. Surfaced as a small
   * info line under the meter so creators understand why old posts vanish
   * — and that the longer windows are a real upgrade benefit.
   */
  retentionDays?: number;
};

export default function UploadPostForm({
  creatorTier,
  postsToday = 0,
  dailyCap,
  videosToday = 0,
  videoCap,
  retentionDays,
}: UploadPostFormProps) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<PostMode>("FEED");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  // Indices of files the browser couldn't decode (typically HEVC/H.265 from
  // iPhones on Windows Chrome). For these the ADD BLUR button is hidden +
  // a small hint surfaces — the file still uploads, just without client-side
  // face-blur protection. Cloudinary handles the codec server-side.
  const [blurUnavailable, setBlurUnavailable] = useState<Set<number>>(
    () => new Set(),
  );
  // Index of the file currently open in the BlurRegionEditor modal, or
  // null when the modal is closed. We index by position rather than by
  // file reference so swapping files (after save) doesn't lose state.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Form ref so the Cancel action can clear uncontrolled text inputs
  // (title + caption) which aren't tracked in component state.
  const formRef = useRef<HTMLFormElement>(null);

  // VIP+ "tease blur" controls. `blurEnabled` mirrors the checkbox state
  // so we can conditionally render the intensity slider only when blur
  // is on. `blurIntensity` is the px value applied to gated media in the
  // public renderer (range 4..16). Default 8 keeps motion visible while
  // obscuring detail — the sweet spot the creator can dial up or down
  // depending on how much they want to tease.
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [blurIntensity, setBlurIntensity] = useState(8);
  // Per-post lock-overlay toggle. Defaults to true (current behavior —
  // blur posts get the WhatsApp CTA). Creators can untick to keep the
  // blur tease but route visitor curiosity to the profile page on tap
  // instead of WhatsApp. Only relevant when blurEnabled.
  const [showLock, setShowLock] = useState(true);

  // Swap one entry in the files+previews arrays with the new (modified)
  // blob. Called by the editor's onSave. Revoking the old object URL
  // keeps us from leaking memory across many open/save cycles.
  function replaceFile(index: number, replacement: File) {
    setFiles((prev) => {
      const next = [...prev];
      next[index] = replacement;
      return next;
    });
    setPreviews((prev) => {
      const next = [...prev];
      const oldUrl = next[index];
      next[index] = URL.createObjectURL(replacement);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return next;
    });
    // Editor output is always a freshly-encoded JPEG or webm — both
    // decodable by every browser. Clear any prior "unavailable" mark on
    // this index so the UI reflects the new, supported file.
    setBlurUnavailable((prev) => {
      if (!prev.has(index)) return prev;
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }

  function handleModeSwitch(m: PostMode) {
    setMode(m);
    setFiles([]);
    setPreviews([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  /**
   * Cancel the in-progress post. Clears every piece of unsaved state:
   *   - files + their object-URL previews (with revoke to avoid memory leaks)
   *   - blur toggle + intensity (back to defaults)
   *   - any "blur unavailable" marks from prior file picks
   *   - the file input itself
   *   - the form's uncontrolled inputs (title, caption, access level, faceBlur)
   *
   * Mode (Gallery vs Feed) is intentionally preserved — the creator just
   * changed their mind about the content, not about which surface they're
   * posting to. If they want to switch surfaces they'll click the tab.
   */
  function handleCancel() {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setBlurEnabled(false);
    setBlurIntensity(8);
    setShowLock(true);
    setBlurUnavailable(new Set());
    setEditingIndex(null);
    if (fileRef.current) fileRef.current.value = "";
    formRef.current?.reset();
  }

  // Tier we resolve once per render so the limit lookup stays cheap.
  // Defaults to REGULAR if the prop is missing (e.g. server didn't pass it).
  const tier = (creatorTier as AccessLevel) ?? "REGULAR";
  const videoCapSeconds =
    VIDEO_DURATION_LIMIT_SECONDS[tier] ?? VIDEO_DURATION_LIMIT_SECONDS.REGULAR;

  // Quota readout. Server passes `dailyCap` so this matches whatever the
  // plans module says (no duplication). Remaining clamps to 0 — never
  // shows negative when the server count outpaced a slow client refresh.
  const quotaKnown = typeof dailyCap === "number";
  const remainingPosts = quotaKnown ? Math.max(0, dailyCap - postsToday) : null;
  const atCap = quotaKnown && remainingPosts === 0;

  // Video sub-cap state. Three modes:
  //   videoCap === 0   → tier is image-only (Regular). Show a paid-only notice.
  //   videoCap > 0     → paid tier with sub-cap. Show a secondary meter
  //                       and block uploads that contain video once hit.
  //   videoCap === undefined → no info; fall back to the existing UX.
  const videoCapKnown = typeof videoCap === "number";
  const videoBlocked = videoCapKnown && videoCap === 0;
  const remainingVideos =
    videoCapKnown && videoCap > 0 ? Math.max(0, videoCap - videosToday) : null;
  const videoAtCap = videoCapKnown && videoCap > 0 && remainingVideos === 0;

  // Does the current file selection include a video? Drives the
  // "selecting video while video-capped" message + disables submit so
  // the creator gets feedback before the server rejects them.
  const selectionHasVideo = files.some((f) => f.type.startsWith("video/"));
  const blockedBecauseVideo =
    selectionHasVideo && (videoBlocked || videoAtCap);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    // Validate file size
    for (const f of selected) {
      if (f.size > MAX_SIZE) {
        alert(`"${f.name}" is too large. Maximum is 50MB.`);
        e.target.value = "";
        return;
      }
    }

    // Early video gate — surface the tier rule before any decoding or
    // metadata work. The server enforces this too, but catching it here
    // saves the creator a confusing submit-then-error round trip.
    const pickedVideo = selected.find((f) => f.type.startsWith("video/"));
    if (pickedVideo && videoBlocked) {
      alert(
        "Videos are a paid feature. Upgrade to Premium or higher to post videos.",
      );
      e.target.value = "";
      return;
    }
    if (pickedVideo && videoAtCap) {
      alert(
        `You've used today's video quota (${videoCap} video${videoCap === 1 ? "" : "s"}). You can still upload images.`,
      );
      e.target.value = "";
      return;
    }

    if (mode === "GALLERY") {
      if (selected.length > MAX_GALLERY) {
        alert(`Gallery accepts max ${MAX_GALLERY} images.`);
        e.target.value = "";
        return;
      }
      for (const f of selected) {
        if (!f.type.startsWith("image/")) {
          alert("Gallery accepts images only — no videos.");
          e.target.value = "";
          return;
        }
      }
    }

    // Per-file checks for videos:
    //   1. Can the browser decode it? (HEVC/H.265 from iPhones fails on
    //      Windows Chrome). If not, the file still uploads but we hide its
    //      ADD BLUR button — Cloudinary will transcode server-side, but
    //      our client-side face-blur tool can't process undecodable files.
    //   2. Does it fit the tier's length cap? (0.5s tolerance matches the
    //      server-side `checkVideoDuration` helper.)
    const unavailable = new Set<number>();
    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];
      if (!f.type.startsWith("video/")) continue;
      let duration: number | null = null;
      try {
        duration = await readVideoDuration(f);
      } catch {
        // Metadata load failed — almost always means the browser can't
        // decode this codec. The file still uploads to Cloudinary (it
        // accepts and transcodes anything) but we mark blur unavailable
        // so the editor doesn't open and crash on this file.
        unavailable.add(i);
      }
      if (duration !== null && duration > videoCapSeconds + 0.5) {
        alert(
          `Your ${tier === "REGULAR" ? "Regular" : tier === "PREMIUM" ? "Premium" : tier === "VIP" ? "VIP" : "VIP+"} tier allows videos up to ${videoLimitLabel(tier)}. "${f.name}" is ${Math.ceil(duration)}s. Trim it or upgrade.`,
        );
        e.target.value = "";
        return;
      }
    }

    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
    setBlurUnavailable(unavailable);
  }

  function handleSubmit(formData: FormData) {
    if (!files.length) {
      alert("Select at least one file");
      return;
    }
    // Append files to formData (multi-file)
    formData.delete("file");
    for (const f of files) {
      formData.append("file", f);
    }
    formData.set("postType", mode);

    startTransition(() => uploadPost(formData));
  }

  return (
    <div className="rounded-xl border border-white/6 bg-surface overflow-hidden">
      {/* Daily quota meter — combined total + video sub-cap + retention
          note. Hidden entirely when the parent didn't pass `dailyCap` so
          this component stays compatible with older call sites. */}
      {quotaKnown && (
        <div
          className={`px-5 py-3 border-b border-white/6 flex flex-col gap-1.5 text-[12px] ${
            atCap || videoAtCap || videoBlocked
              ? "bg-rose-500/8"
              : "bg-white/3"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className={atCap ? "text-rose-200" : "text-white/60"}>
              {atCap ? (
                <>
                  <strong className="font-semibold">Daily limit reached.</strong>{" "}
                  Published {postsToday} of {dailyCap} posts today.
                </>
              ) : (
                <>
                  <strong className="font-semibold text-white/85">
                    {remainingPosts}
                  </strong>{" "}
                  of {dailyCap} post{dailyCap === 1 ? "" : "s"} left today
                </>
              )}
            </span>
            {(atCap || videoBlocked) && (
              <a
                href="/upgrade"
                className="font-semibold text-rose-200 underline-offset-2 hover:underline"
              >
                Upgrade →
              </a>
            )}
          </div>

          {/* Secondary line: video sub-cap or "videos paid-only" notice. */}
          {videoBlocked && (
            <span className="text-rose-200/85">
              Videos are a paid feature — your plan is image-only.
            </span>
          )}
          {videoCapKnown && videoCap! > 0 && (
            <span
              className={videoAtCap ? "text-rose-200" : "text-white/45"}
            >
              {videoAtCap ? (
                <>
                  Video limit reached — {videosToday} of {videoCap} videos
                  today. You can still post images.
                </>
              ) : (
                <>
                  {remainingVideos} of {videoCap} video
                  {videoCap === 1 ? "" : "s"} left today
                </>
              )}
            </span>
          )}

          {/* Gallery hint — biggest source of "1 post a day feels mean"
              confusion. A gallery is one post but holds up to 6 images,
              so creators can publish a lot of visuals inside their daily
              budget. Stated explicitly so it's not a hidden trick. */}
          <span className="text-white/35 text-[11px]">
            Tip — a gallery counts as 1 post and can hold up to{" "}
            {MAX_GALLERY} photos.
          </span>

          {/* Retention info — explains why old posts roll off and points
              to the upgrade benefit. */}
          {typeof retentionDays === "number" && (
            <span className="text-white/35 text-[11px]">
              Posts auto-delete after {retentionDays} days on your plan.
            </span>
          )}
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex border-b border-white/6">
        <button
          type="button"
          onClick={() => handleModeSwitch("GALLERY")}
          className={`flex-1 py-3 text-[13px] font-medium transition ${
            mode === "GALLERY"
              ? "text-purple-400 border-b-2 border-purple-500 bg-purple-500/4"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          Grid Gallery
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("FEED")}
          className={`flex-1 py-3 text-[13px] font-medium transition ${
            mode === "FEED"
              ? "text-purple-400 border-b-2 border-purple-500 bg-purple-500/4"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          Feed Post
        </button>
      </div>

      {/* Mode Description */}
      <div className="px-5 pt-4 pb-2">
        {mode === "GALLERY" ? (
          <p className="text-label text-white/35">
            Upload 1-{MAX_GALLERY} photos for your profile grid gallery —
            the whole gallery counts as 1 post toward today's quota. Images
            only.
          </p>
        ) : (
          <p className="text-label text-white/35">
            Share a photo or video to your feed. Supports image and video.
            <span className="block mt-1 text-purple-300/80">
              Video limit on your {tier === "REGULAR" ? "Regular" : tier === "PREMIUM" ? "Premium" : tier === "VIP" ? "VIP" : "VIP+"} tier:{" "}
              <strong className="text-purple-200">{videoLimitLabel(tier)}</strong>
              {tier !== "VIP_PLUS" && " · upgrade for longer clips"}
            </span>
            {/* iPhone HEVC compatibility hint. iPhone Camera defaults to
                "High Efficiency" (HEVC/H.265), which Chrome on Windows
                can't decode locally — meaning the face-blur editor can't
                open the file. Switching to "Most Compatible" records H.264
                MP4 which works everywhere. */}
            <span className="block mt-1.5 text-amber-300/65 text-[11px]">
              📱 iPhone? Set{" "}
              <strong className="text-amber-200">
                Settings → Camera → Formats → Most Compatible
              </strong>{" "}
              to use the privacy filter on your videos.
            </span>
          </p>
        )}
      </div>

      {/* Form */}
      <form
        ref={formRef}
        action={handleSubmit}
        className="space-y-4 p-5 pt-2"
      >
        <input
          name="title"
          placeholder="Post title"
          required
          className="w-full rounded-lg border border-white/6 bg-white/3 px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/40"
        />

        <textarea
          name="content"
          placeholder="Caption..."
          rows={2}
          className="w-full rounded-lg border border-white/6 bg-white/3 px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/40 resize-none"
        />

        <div className="flex gap-3">
          <select
            name="accessLevel"
            className="flex-1 rounded-lg border border-white/6 bg-white/3 px-3 py-2.5 text-[13px] text-white/70 focus:outline-none"
          >
            <option value="REGULAR">Public</option>
            <option value="VIP">VIP only</option>
            <option value="VIP_PLUS">VIP+ only</option>
          </select>

          {creatorTier === "VIP_PLUS" && (
            <label className="flex items-center gap-2 text-[12px] text-white/50 cursor-pointer">
              <input
                type="checkbox"
                name="blurred"
                checked={blurEnabled}
                onChange={(e) => setBlurEnabled(e.target.checked)}
                className="accent-purple-600"
              />
              Blur preview
            </label>
          )}
        </div>

        {/* Tease-blur intensity slider — VIP+ only, only when "Blur
            preview" is on. Lower values let more of the underlying
            content show through (motion stays visible); higher values
            obscure more detail. The default 8 is the recommended sweet
            spot. The hidden input below carries the value to the server
            so the post row gets the correct blurIntensity. */}
        {creatorTier === "VIP_PLUS" && blurEnabled && (
          <div className="rounded-lg border border-purple-500/25 bg-purple-500/5 px-3.5 py-3 space-y-2">
            {/* Disambiguation — creators often confuse this slider with the
                per-file "ADD BLUR" face-tracking editor and think their
                tease blur is broken when that editor fails on HEVC video.
                Explicit one-liner here prevents that confusion. */}
            <p className="text-[10.5px] text-purple-300/80 leading-relaxed">
              Applied automatically to everyone below VIP+ — works for
              both images and videos. Separate from the per-file
              <strong className="text-purple-200"> ADD BLUR </strong>
              button on each tile, which is a privacy face-tracking tool.
            </p>
            <div className="flex items-center justify-between">
              <label
                htmlFor="blur-intensity-slider"
                className="text-[12px] font-medium text-purple-200"
              >
                Tease level
              </label>
              <span className="font-mono text-[11px] text-purple-300/80">
                {blurIntensity}px
              </span>
            </div>

            {/* Live preview — shows the first selected file with the exact
                CSS blur the public renderer applies. The preview adapts to
                the file's kind:
                  - image  → <img> with the blur filter
                  - video  → autoplaying muted loop <video> so the creator
                             sees blur on actual motion (most important for
                             HEVC clips where the face-tracking editor can't
                             open — this is their only way to gauge intensity)
                  - none   → gradient placeholder
                The preview is full-width-on-its-own-row when there's any
                file selected (so video motion is legible); shrinks to a
                64×64 tile only for the placeholder case where there's
                nothing to show anyway. */}
            {(() => {
              const firstFile = files[0];
              const isVideo = firstFile?.type.startsWith("video/");
              const hasPreview = !!previews[0];
              const filter = `blur(${blurIntensity}px) brightness(0.85)`;

              return (
                <div className="space-y-2">
                  {hasPreview ? (
                    <div
                      className="relative w-full rounded-md overflow-hidden border border-purple-500/30"
                      style={{ aspectRatio: "16 / 9" }}
                      aria-hidden
                    >
                      {isVideo ? (
                        <video
                          src={previews[0]}
                          autoPlay
                          muted
                          loop
                          playsInline
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            filter,
                            transform: "scale(1.05)",
                          }}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previews[0]}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            filter,
                            transform: "scale(1.05)",
                          }}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="rounded-md px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-white/95"
                          style={{
                            background: "rgba(0, 0, 0, 0.4)",
                            backdropFilter: "blur(2px)",
                          }}
                        >
                          PREVIEW · WHAT VISITORS SEE
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="relative h-16 w-16 rounded-md overflow-hidden border border-purple-500/30"
                      aria-hidden
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background:
                            "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f59e0b 100%)",
                          filter,
                          transform: "scale(1.2)",
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] font-bold tracking-[0.14em] text-white/95 drop-shadow">
                          VIP+
                        </span>
                      </div>
                    </div>
                  )}
                  <input
                    id="blur-intensity-slider"
                    type="range"
                    min={4}
                    max={25}
                    step={1}
                    value={blurIntensity}
                    onChange={(e) =>
                      setBlurIntensity(Number(e.target.value))
                    }
                    className="w-full accent-purple-500"
                    aria-describedby="blur-intensity-hint"
                  />
                </div>
              );
            })()}

            {/* Hidden input so the value travels with the form submission. */}
            <input
              type="hidden"
              name="blurIntensity"
              value={blurIntensity}
            />
            <div
              id="blur-intensity-hint"
              className="flex items-center justify-between text-[10.5px] text-white/40"
            >
              <span>Light tease (motion visible)</span>
              <span>Heavy block</span>
            </div>

            {/* Per-post WhatsApp lock toggle. The blur is the tease; the
                lock is the conversion CTA. Decoupling them gives creators
                a quieter option: tease blur with no WhatsApp button, where
                visitors who tap land on the full profile page instead. */}
            <label
              className="flex items-start gap-2.5 mt-2 cursor-pointer"
              htmlFor="show-lock-toggle"
            >
              <input
                id="show-lock-toggle"
                type="checkbox"
                name="showLock"
                checked={showLock}
                onChange={(e) => setShowLock(e.target.checked)}
                className="mt-0.5 accent-purple-500"
              />
              <span className="flex-1">
                <span className="block text-[12px] font-medium text-purple-200">
                  Show WhatsApp lock on the blur
                </span>
                <span className="block text-[10.5px] text-white/45 leading-snug mt-0.5">
                  Centered lock + WhatsApp button overlaid on the blur — taps
                  open a WhatsApp DM. Untick to keep just the blur tease;
                  taps then route to your profile page instead.
                </span>
              </span>
            </label>
          </div>
        )}

        {/* Privacy filter — universal opt-in. Pixelates detected faces in
            uploaded photos before they leave Cloudinary. Distinct from the
            VIP+ "Blur preview" above (which fogs the entire image for
            non-VIP+ viewers). Video uploads currently pass through unchanged;
            the MediaPipe browser pipeline will handle moving subjects in 17b. */}
        <label className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/3 px-3 py-2.5 text-[13px] text-white/70 cursor-pointer hover:border-purple-500/40 transition">
          <input
            type="checkbox"
            name="faceBlur"
            className="mt-0.5 accent-purple-600"
          />
          <span className="flex-1">
            <span className="block text-white">Pixelate my face in photos</span>
            <span className="block text-[11px] text-white/40 leading-snug mt-0.5">
              Auto-detects and hides your face before upload. Photos only for
              now — video face protection arrives in the next update.
            </span>
          </span>
        </label>

        {/* Content rules + discretion tools — shown right before the file
            picker so creators see it the moment they're choosing what
            to upload. */}
        <div className="rounded-lg border border-white/8 bg-white/2 px-3.5 py-3 space-y-2">
          <p className="text-[11px] font-semibold text-white/70">
            Règles de la plateforme &amp; outils de discrétion
          </p>
          <p className="text-[10.5px] text-white/45 leading-relaxed">
            Seul le <strong className="text-white/60">contenu original</strong> est
            autorisé — aucune photo ou vidéo avec le filigrane d&apos;autres
            plateformes (Yamohub, Liabby, Jedolo, etc.). Tout contenu avec un
            filigrane externe sera supprimé.
          </p>
          <p className="text-[10.5px] text-white/45 leading-relaxed">
            Outils pour protéger ton identité :{" "}
            <strong className="text-white/60">Pixeliser mon visage</strong> (cache
            ton visage automatiquement avant l&apos;envoi) ·{" "}
            <strong className="text-white/60">ADD BLUR</strong> (floute
            manuellement n&apos;importe quelle zone d&apos;une photo ou vidéo)
            {creatorTier === "VIP_PLUS" && (
              <>
                {" "}·{" "}
                <strong className="text-amber-300/80">Aperçu flouté</strong> (floute
                ton contenu pour les non-abonnés afin de créer de l&apos;exclusivité)
              </>
            )}
          </p>
        </div>

        {/* File Input */}
        <div>
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept={mode === "GALLERY" ? "image/*" : "image/*,video/*"}
            multiple={mode === "GALLERY"}
            required
            onChange={handleFileChange}
            className="text-[12px] text-white/50 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[12px] file:font-medium file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/30 file:cursor-pointer"
          />
        </div>

        {/* Previews */}
        {previews.length > 0 && (
          <div
            className={`grid gap-2 ${
              previews.length === 1
                ? "grid-cols-1"
                : previews.length <= 4
                ? "grid-cols-2"
                : "grid-cols-3"
            }`}
          >
            {previews.map((src, i) => {
              const isVideo = files[i]?.type.startsWith("video");
              const noBlurForThisFile = blurUnavailable.has(i);
              return (
                <div
                  key={i}
                  className="relative h-28 rounded-lg overflow-hidden bg-white/2 group"
                >
                  {isVideo ? (
                    <video
                      src={src}
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute top-1 right-1 bg-black/60 text-eyebrow text-white/60 px-1.5 py-0.5 rounded">
                    {i + 1}
                  </span>

                  {/* Manual blur — same affordance for photos and videos.
                      The right editor opens automatically based on file
                      type (BlurRegionEditor for images, VideoBlurEditor
                      with MediaPipe face tracking for videos). Hidden when
                      the browser can't decode the file (HEVC on Windows
                      Chrome is the common case) — the upload still works
                      via Cloudinary's server-side transcode. */}
                  {noBlurForThisFile ? (
                    <span
                      className="absolute bottom-1.5 left-1.5 right-1.5 inline-flex items-center justify-center gap-1 rounded-md bg-amber-600/30 backdrop-blur-sm px-2 py-1 text-[9px] font-bold tracking-[0.08em] text-amber-200 border border-amber-500/40"
                      title="This video's codec can't be decoded by your browser. It will still upload, but the privacy filter is unavailable for this file."
                    >
                      PRIVACY FILTER UNAVAILABLE
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingIndex(i)}
                      aria-label={`Edit blur regions on ${isVideo ? "video" : "photo"} ${i + 1}`}
                      className="absolute bottom-1.5 left-1.5 right-1.5 inline-flex items-center justify-center gap-1.5 rounded-md bg-purple-600/85 hover:bg-purple-500 backdrop-blur-sm px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-white shadow-md transition"
                    >
                      <Wand2 size={11} strokeWidth={2.5} />
                      ADD BLUR
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Submit + Cancel. Cancel is only rendered when something has
            been picked or typed (no point offering it on an empty form).
            type="button" so the Cancel click never triggers form submit;
            handleCancel clears every piece of unsaved state. */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={
              pending || !files.length || atCap || blockedBecauseVideo
            }
            className="flex-1 rounded-lg bg-purple-600 py-2.5 text-[13px] font-semibold text-white hover:bg-purple-500 disabled:opacity-40 transition"
          >
            {pending
              ? "Uploading..."
              : atCap
              ? "Daily limit reached"
              : blockedBecauseVideo
              ? videoBlocked
                ? "Videos are paid-only"
                : "Video limit reached today"
              : mode === "GALLERY"
              ? `Upload ${files.length} Photo${files.length !== 1 ? "s" : ""} to Gallery`
              : "Post to Feed"}
          </button>
          {files.length > 0 && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={pending}
              className="rounded-lg border border-white/12 bg-white/4 px-4 py-2.5 text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/8 disabled:opacity-40 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Manual blur region editor — mounted at the form root so it can
          render as a full-screen modal without inheriting the form's
          padding/overflow. Index-based so we never confuse `editingIndex`
          with a file reference that may have just been replaced. The
          right editor opens based on file type: images use the lightweight
          canvas tool; videos use the MediaPipe-powered face-tracking
          pipeline. */}
      {editingIndex !== null && files[editingIndex] && (
        files[editingIndex].type.startsWith("video/") ? (
          <VideoBlurEditor
            file={files[editingIndex]}
            onSave={(modified) => {
              replaceFile(editingIndex, modified);
              setEditingIndex(null);
            }}
            onCancel={() => setEditingIndex(null)}
          />
        ) : (
          <BlurRegionEditor
            file={files[editingIndex]}
            onSave={(modified) => {
              replaceFile(editingIndex, modified);
              setEditingIndex(null);
            }}
            onCancel={() => setEditingIndex(null)}
          />
        )
      )}
    </div>
  );
}