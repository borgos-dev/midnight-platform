"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { X, Check, Loader2, Eraser, Wand2 } from "lucide-react";

type Region = {
  id: number;
  /** Coordinates in source-pixel space. */
  x: number;
  y: number;
  w: number;
  h: number;
};

type DetectionSample = {
  /** Source-pixel bounding box of one detected face. */
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Per-timestamp face detections, keyed by sample index (timestamp / SAMPLE_MS). */
type DetectionMap = Map<number, DetectionSample[]>;

type Phase = "analyzing" | "ready" | "saving" | "error";

type Props = {
  file: File;
  onSave: (modified: File) => void;
  onCancel: () => void;
};

// ── Tunables ─────────────────────────────────────────────────────────
// Sample every 250ms — 4fps face detection. Faces don't move fast enough
// to need every frame, and lower sample rate is the difference between
// "30 seconds of analysis on a mid-range Android" and "60+ seconds".
const SAMPLE_MS = 250;

const INTENSITY_MIN = 4;
const INTENSITY_MAX = 40;
const INTENSITY_DEFAULT = 14;
const MIN_REGION_SIZE = 6;

// MediaPipe assets — official CDN paths, pinned to the major version we
// depend on. Loading from CDN keeps the WASM out of our bundle (~600KB
// only fetched on demand, when the editor opens).
const MEDIAPIPE_WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10/wasm";
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

function intensityLabel(value: number): string {
  if (value < 10) return "Light";
  if (value < 24) return "Medium";
  return "Strong";
}

/**
 * Apply the pixelation effect to one rectangle inside a 2D canvas context.
 * Shared between live preview rendering and the offscreen save loop so
 * "what the creator sees" exactly matches "what gets uploaded."
 */
function pixelateRegion(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  blockSize: number,
) {
  if (w <= 0 || h <= 0) return;
  const dsW = Math.max(1, Math.floor(w / blockSize));
  const dsH = Math.max(1, Math.floor(h / blockSize));
  const tile = document.createElement("canvas");
  tile.width = dsW;
  tile.height = dsH;
  const tctx = tile.getContext("2d");
  if (!tctx) return;
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(source, x, y, w, h, 0, 0, dsW, dsH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tile, 0, 0, dsW, dsH, x, y, w, h);
}

/**
 * Browser-side video privacy editor.
 *
 * Pipeline:
 *   1. ANALYZE — lazy-load MediaPipe, step through the video at 4fps,
 *      cache face bounding boxes by timestamp. Progress UI in the
 *      meantime so the wait feels intentional.
 *   2. READY — preview the video with auto-detected faces blurred. Creator
 *      can draw manual regions over anything else (tattoo, background,
 *      logo on a wall). Intensity slider controls block size globally.
 *   3. SAVING — play the source through, draw each frame to an offscreen
 *      canvas with the blurs baked in, MediaRecorder captures the canvas
 *      stream + the original audio track, output is a re-encoded webm
 *      blob ready to upload.
 *
 * Privacy guarantee: the un-blurred video never leaves the device.
 * MediaPipe runs locally; the re-encode runs locally; only the blurred
 * webm gets sent to Cloudinary.
 *
 * NOT in MVP scope:
 *   - Per-region time-windows (manual regions apply across the full clip)
 *   - Smoothing / interpolating face boxes between samples (mild flicker
 *     during fast head movement is acceptable)
 *   - Editing or deleting auto-detected boxes (creators can only add)
 */
export function VideoBlurEditor({ file, onSave, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The objectURL for the file; revoked on unmount.
  const [videoUrl] = useState(() => URL.createObjectURL(file));

  const [phase, setPhase] = useState<Phase>("analyzing");
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Native dimensions of the source video, populated once metadata loads.
  const [dims, setDims] = useState<{ w: number; h: number; duration: number }>({
    w: 0,
    h: 0,
    duration: 0,
  });
  // Per-sample face detections from MediaPipe. Read-only after analysis.
  const detectionsRef = useRef<DetectionMap>(new Map());

  // Manual regions drawn by the creator. Mirror of the image editor.
  const [manualRegions, setManualRegions] = useState<Region[]>([]);
  const [draft, setDraft] = useState<Region | null>(null);
  const [intensity, setIntensity] = useState(INTENSITY_DEFAULT);
  const nextId = useRef(1);

  // Viewport scale for the canvas → maps pointer events to source pixels
  // and keeps the live preview crisp on hi-DPI displays.
  const [view, setView] = useState<{ w: number; h: number; scale: number }>({
    w: 0,
    h: 0,
    scale: 1,
  });

  // Cleanup the objectURL when the modal unmounts so we don't leak the
  // (potentially huge) source video blob.
  useEffect(() => () => URL.revokeObjectURL(videoUrl), [videoUrl]);

  // Fit-to-container layout — recomputed on resize so phone rotation /
  // browser zoom doesn't desync canvas pointer math.
  useLayoutEffect(() => {
    if (!dims.w || !containerRef.current) return;
    const measure = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const ratio = Math.min(rect.width / dims.w, rect.height / dims.h, 1);
      setView({
        w: Math.round(dims.w * ratio),
        h: Math.round(dims.h * ratio),
        scale: ratio,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [dims]);

  // ── ANALYZE PHASE ──────────────────────────────────────────────
  // Loads MediaPipe + runs face detection across the video, sampling
  // every SAMPLE_MS. Stores results in detectionsRef (a ref, not state,
  // because we read them on every frame during preview without needing
  // a re-render trigger).
  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    async function run() {
      try {
        // Wait for metadata so we know duration + dimensions. We capture
        // the underlying MediaError code when possible — most "won't load"
        // failures on Windows browsers are HEVC/H.265 from iPhone recordings,
        // which Chrome can't decode without hardware acceleration. Telling
        // the creator that explicitly saves them a lot of guessing.
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => {
            const err = video.error;
            // MediaError codes: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
            let why = "Couldn't load video.";
            if (err) {
              if (err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                why =
                  "This video format isn't supported by your browser. " +
                  "iPhones often record in HEVC/H.265 which Chrome on Windows can't decode. " +
                  "Try converting to MP4 (H.264) or change your iPhone Camera setting to \"Most Compatible.\"";
              } else if (err.code === MediaError.MEDIA_ERR_DECODE) {
                why =
                  "The video data couldn't be decoded — the file may be corrupted " +
                  "or use a codec your browser doesn't support. Try re-exporting it as MP4.";
              } else if (err.code === MediaError.MEDIA_ERR_NETWORK) {
                why = "Network error while loading the video. Check your connection and try again.";
              }
            }
            reject(new Error(why));
          };
        });
        if (cancelled) return;
        setDims({
          w: video.videoWidth,
          h: video.videoHeight,
          duration: video.duration,
        });

        // Dynamic import keeps MediaPipe out of the main bundle until the
        // editor actually opens — chunky WASM payload only on demand.
        const { FaceDetector, FilesetResolver } = await import(
          "@mediapipe/tasks-vision"
        );
        if (cancelled) return;

        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: FACE_MODEL_URL,
            // GPU delegate is dramatically faster than CPU when WebGL is
            // available. Falls back gracefully on devices without it.
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
        });
        if (cancelled) return;

        const totalSamples = Math.ceil((video.duration * 1000) / SAMPLE_MS);
        const map: DetectionMap = new Map();

        // Step through the video by seeking. We could use
        // requestVideoFrameCallback for smoother sampling but seek-based
        // works on all browsers and is deterministic.
        for (let i = 0; i < totalSamples; i++) {
          if (cancelled) return;
          const t = (i * SAMPLE_MS) / 1000;
          // Clamp to just under duration so the final seek doesn't stall.
          const seekTo = Math.min(t, Math.max(0, video.duration - 0.01));
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              resolve();
            };
            video.addEventListener("seeked", onSeeked);
            video.currentTime = seekTo;
          });
          if (cancelled) return;

          const result = detector.detectForVideo(video, performance.now());
          const faces: DetectionSample[] = (result.detections ?? [])
            .map((d) => {
              const box = d.boundingBox;
              if (!box) return null;
              // MediaPipe normalizes to source-pixel space already.
              return {
                x: Math.max(0, box.originX),
                y: Math.max(0, box.originY),
                w: Math.min(box.width, video.videoWidth - box.originX),
                h: Math.min(box.height, video.videoHeight - box.originY),
              };
            })
            .filter((f): f is DetectionSample => f !== null);
          map.set(i, faces);

          setAnalyzeProgress(Math.round(((i + 1) / totalSamples) * 100));
        }

        detector.close();
        detectionsRef.current = map;
        if (!cancelled) setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Couldn't analyze video.";
        setErrorMsg(msg);
        setPhase("error");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [videoUrl]);

  // ── PREVIEW RENDERING ─────────────────────────────────────────
  // While in `ready` phase, draw the playing video to the canvas on every
  // frame and overlay the cached face detections + any manual regions.
  // Uses requestVideoFrameCallback when available (modern Chromium / Safari)
  // for tight sync; falls back to rAF on older browsers.
  useEffect(() => {
    if (phase !== "ready") return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stopped = false;
    let rafId = 0;

    const renderFrame = () => {
      if (stopped) return;
      // Bail if the video is not yet decoded.
      if (video.readyState < 2) {
        rafId = requestAnimationFrame(renderFrame);
        return;
      }
      ctx.drawImage(video, 0, 0, dims.w, dims.h);

      // Auto-detected faces from the nearest sample.
      const sampleIdx = Math.floor((video.currentTime * 1000) / SAMPLE_MS);
      const autoFaces = detectionsRef.current.get(sampleIdx) ?? [];
      const blockSize = Math.max(2, Math.floor(intensity));
      for (const f of autoFaces) {
        pixelateRegion(ctx, canvas, f.x, f.y, f.w, f.h, blockSize);
      }
      // Manual regions (apply to every frame).
      for (const r of manualRegions) {
        pixelateRegion(ctx, canvas, r.x, r.y, r.w, r.h, blockSize);
      }
      ctx.imageSmoothingEnabled = true;

      // Draft drag preview.
      if (draft && draft.w > 0 && draft.h > 0) {
        ctx.save();
        ctx.lineWidth = Math.max(2, Math.round(4 / view.scale));
        ctx.setLineDash([12 / view.scale, 8 / view.scale]);
        ctx.strokeStyle = "#a855f7";
        ctx.strokeRect(draft.x, draft.y, draft.w, draft.h);
        ctx.restore();
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
    };
  }, [phase, dims.w, dims.h, manualRegions, draft, view.scale, intensity]);

  // ── MANUAL REGION DRAG HANDLERS ──────────────────────────────
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const pointerToSource = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / view.scale,
      y: (e.clientY - rect.top) / view.scale,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "ready") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = pointerToSource(e);
    dragStart.current = pt;
    setDraft({ id: 0, x: pt.x, y: pt.y, w: 0, h: 0 });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart.current) return;
    const pt = pointerToSource(e);
    const x = Math.min(dragStart.current.x, pt.x);
    const y = Math.min(dragStart.current.y, pt.y);
    const w = Math.abs(pt.x - dragStart.current.x);
    const h = Math.abs(pt.y - dragStart.current.y);
    setDraft({
      id: 0,
      x: Math.max(0, x),
      y: Math.max(0, y),
      w: Math.min(w, dims.w - x),
      h: Math.min(h, dims.h - y),
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragStart.current = null;
    if (!draft || draft.w < MIN_REGION_SIZE || draft.h < MIN_REGION_SIZE) {
      setDraft(null);
      return;
    }
    setManualRegions((prev) => [...prev, { ...draft, id: nextId.current++ }]);
    setDraft(null);
  };

  // Delete-handle positions in CSS px (viewport-space), recomputed when
  // scale changes (resize / rotate).
  const deleteHandles = useMemo(
    () =>
      manualRegions.map((r) => ({
        id: r.id,
        left: r.x * view.scale,
        top: r.y * view.scale,
      })),
    [manualRegions, view.scale],
  );

  // ── SAVE — re-encode through MediaRecorder ────────────────────
  // Plays the video at 1× while drawing each frame (with blurs baked in)
  // to an offscreen canvas. MediaRecorder captures the canvas stream +
  // the original audio track. On video `ended`, stop the recorder and
  // hand the blob back to the parent as a File.
  async function handleSave() {
    const video = videoRef.current;
    if (!video) return;
    setPhase("saving");
    try {
      // Reset to start so the recording captures the whole clip.
      video.pause();
      video.currentTime = 0;
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          resolve();
        };
        video.addEventListener("seeked", onSeeked);
      });

      const out = document.createElement("canvas");
      out.width = dims.w;
      out.height = dims.h;
      const octx = out.getContext("2d");
      if (!octx) throw new Error("Canvas context unavailable.");

      // 30fps canvas stream — high enough for smooth playback, low enough
      // not to blow up file size during the re-encode.
      const canvasStream = out.captureStream(30);

      // Pull the audio track straight from the source video. `captureStream`
      // on HTMLVideoElement returns a MediaStream with audio + video tracks;
      // we only need the audio (our canvas already has the video).
      type VideoElementWithCapture = HTMLVideoElement & {
        captureStream?: () => MediaStream;
        mozCaptureStream?: () => MediaStream;
      };
      const ve = video as VideoElementWithCapture;
      const srcStream =
        ve.captureStream?.() ?? ve.mozCaptureStream?.() ?? null;
      const audioTracks = srcStream?.getAudioTracks() ?? [];
      for (const t of audioTracks) canvasStream.addTrack(t);

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm";

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      // Draw loop driven by rVFC where available, rAF as fallback. We need
      // to draw each frame BEFORE the recorder samples the stream, so we
      // can't piggyback on the preview render loop above (which paused
      // when we changed phase).
      let stopped = false;
      const drawNext = () => {
        if (stopped) return;
        octx.drawImage(video, 0, 0, dims.w, dims.h);
        const sampleIdx = Math.floor((video.currentTime * 1000) / SAMPLE_MS);
        const autoFaces = detectionsRef.current.get(sampleIdx) ?? [];
        const blockSize = Math.max(2, Math.floor(intensity));
        for (const f of autoFaces) {
          pixelateRegion(octx, out, f.x, f.y, f.w, f.h, blockSize);
        }
        for (const r of manualRegions) {
          pixelateRegion(octx, out, r.x, r.y, r.w, r.h, blockSize);
        }
        octx.imageSmoothingEnabled = true;
      };
      const ve2 = video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
      };
      let rafHandle = 0;
      const tick = () => {
        if (stopped) return;
        drawNext();
        if (ve2.requestVideoFrameCallback) {
          ve2.requestVideoFrameCallback(tick);
        } else {
          rafHandle = requestAnimationFrame(tick);
        }
      };
      tick();

      recorder.start();
      // Unmute is fine because the video element isn't on-screen during
      // recording (it stays mounted but we control its visibility / volume
      // via the preview canvas — see render).
      video.muted = false;
      video.volume = 1;
      await video.play();

      // Wait for end-of-stream or for the user to abort. `ended` is the
      // happy path.
      await new Promise<void>((resolve) => {
        const onEnded = () => {
          video.removeEventListener("ended", onEnded);
          resolve();
        };
        video.addEventListener("ended", onEnded);
      });

      stopped = true;
      if (rafHandle) cancelAnimationFrame(rafHandle);
      recorder.stop();
      await recordingDone;

      // Stop the canvas tracks so the browser doesn't keep them alive.
      for (const t of canvasStream.getTracks()) t.stop();

      const blob = new Blob(chunks, { type: "video/webm" });
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const outFile = new File([blob], `${baseName}.webm`, {
        type: "video/webm",
        lastModified: Date.now(),
      });
      onSave(outFile);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't save.";
      setErrorMsg(msg);
      setPhase("error");
    }
  }

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Video blur editor"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(6, 6, 12, 0.94)",
        backdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
        padding: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              color: "#a855f7",
            }}
          >
            VIDEO PRIVACY · FACE TRACKING
          </div>
          <div
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "20px",
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.1,
              marginTop: "2px",
            }}
          >
            {phase === "analyzing"
              ? "Detecting faces…"
              : phase === "saving"
                ? "Re-encoding your video…"
                : phase === "error"
                  ? "Something went wrong"
                  : "Drag over anything else to hide"}
          </div>
          {phase === "ready" && (
            <div
              style={{
                marginTop: "3px",
                fontSize: "12px",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              Faces are auto-blurred · {manualRegions.length} manual{" "}
              {manualRegions.length === 1 ? "region" : "regions"} · everything
              stays on your device until you save
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          disabled={phase === "saving"}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.85)",
            borderRadius: "10px",
            padding: "8px 10px",
            cursor: phase === "saving" ? "wait" : "pointer",
            opacity: phase === "saving" ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Intensity slider — visible once we're ready to preview */}
      {phase === "ready" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "10px 14px",
            marginBottom: "12px",
            borderRadius: "10px",
            background: "rgba(168, 85, 247, 0.08)",
            border: "1px solid rgba(168, 85, 247, 0.22)",
          }}
        >
          <label
            htmlFor="video-blur-intensity"
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.10em",
              color: "rgba(255,255,255,0.7)",
              flexShrink: 0,
            }}
          >
            INTENSITY
          </label>
          <input
            id="video-blur-intensity"
            type="range"
            min={INTENSITY_MIN}
            max={INTENSITY_MAX}
            step={1}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            aria-label="Blur intensity"
            style={{ flex: 1, minWidth: 0, accentColor: "#a855f7" }}
          />
          <span
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#a855f7",
              minWidth: "62px",
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {intensityLabel(intensity).toUpperCase()}
          </span>
        </div>
      )}

      {/* Canvas + video container — flex-1 to fill height */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Hidden video element — drives detection during analyze AND
            playback during preview/save. Kept off-screen so only the
            canvas is visible to the creator. */}
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          muted={phase !== "saving"}
          controls={phase === "ready"}
          style={{
            position: "absolute",
            opacity: phase === "ready" ? 1 : 0,
            // We render the video element transparent ON TOP of the canvas
            // when in ready phase so the native controls (play/scrub/mute)
            // are still operable, but the visible image is whatever the
            // canvas drew (with blurs applied).
            width: view.w || "auto",
            height: view.h || "auto",
            mixBlendMode: phase === "ready" ? "normal" : "normal",
            pointerEvents: phase === "ready" ? "auto" : "none",
            zIndex: 0,
          }}
        />

        {phase === "analyzing" && (
          <AnalyzeOverlay progress={analyzeProgress} />
        )}

        {phase === "error" && (
          <div
            style={{
              maxWidth: "380px",
              textAlign: "center",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "22px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Face tracking unavailable
            </div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>
              {errorMsg ?? "Unknown error."}
            </p>
            {/* Reassurance — most creators hit this on iPhone HEVC clips and
                think their VIP+ blur is broken. It isn't: that blur is
                applied at render time and doesn't depend on the in-browser
                face-tracking editor working. */}
            <div
              style={{
                marginTop: "16px",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "rgba(168, 85, 247, 0.08)",
                border: "1px solid rgba(168, 85, 247, 0.25)",
                textAlign: "left",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  color: "#c4a3ff",
                  marginBottom: "6px",
                }}
              >
                YOUR VIP+ TEASE BLUR STILL WORKS
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                Face tracking is a separate per-file privacy tool. The
                blur visitors see on your VIP+ post is set by the
                <strong style={{ color: "#fff" }}> Tease level </strong>
                slider in the form and applies automatically. Close this,
                submit, and your post goes live blurred.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              style={{
                marginTop: "16px",
                background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 22px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(168, 85, 247, 0.35)",
              }}
            >
              Close and continue uploading
            </button>
          </div>
        )}

        {phase === "saving" && <SavingOverlay />}

        {dims.w > 0 && (phase === "ready" || phase === "saving") && (
          <div
            style={{
              position: "relative",
              width: view.w,
              height: view.h,
            }}
          >
            <canvas
              ref={canvasRef}
              width={dims.w}
              height={dims.h}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                width: view.w,
                height: view.h,
                touchAction: "none",
                cursor: phase === "ready" ? "crosshair" : "default",
                borderRadius: "10px",
                boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
                display: "block",
                position: "relative",
                zIndex: 1,
              }}
            />
            {deleteHandles.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setManualRegions((prev) =>
                    prev.filter((r) => r.id !== h.id),
                  );
                }}
                aria-label="Remove this blur region"
                style={{
                  position: "absolute",
                  left: `${h.left - 10}px`,
                  top: `${h.top - 10}px`,
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: "#E8547A",
                  color: "#fff",
                  border: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
                  padding: 0,
                  zIndex: 2,
                }}
              >
                <X size={13} strokeWidth={3} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer toolbar */}
      {phase === "ready" && (
        <div
          style={{
            marginTop: "14px",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={() => setManualRegions([])}
            disabled={manualRegions.length === 0}
            style={{
              padding: "11px 16px",
              borderRadius: "10px",
              background: "transparent",
              color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.18)",
              fontFamily: "var(--font-dm-mono)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.10em",
              cursor: manualRegions.length ? "pointer" : "not-allowed",
              opacity: manualRegions.length ? 1 : 0.4,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Eraser size={14} strokeWidth={2.4} />
            CLEAR MANUAL
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.14)",
                fontFamily: "var(--font-dm-mono)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.10em",
                cursor: "pointer",
              }}
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: "11px 18px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                color: "#fff",
                border: "none",
                fontFamily: "var(--font-dm-mono)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.10em",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(168, 85, 247, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Check size={14} strokeWidth={3} />
              APPLY &amp; SAVE
            </button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "11px 18px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.14)",
              fontFamily: "var(--font-dm-mono)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.10em",
              cursor: "pointer",
            }}
          >
            CLOSE
          </button>
        </div>
      )}
    </div>
  );
}

function AnalyzeOverlay({ progress }: { progress: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        color: "rgba(255,255,255,0.85)",
      }}
    >
      <Loader2
        size={32}
        strokeWidth={1.8}
        style={{ animation: "spin 1.2s linear infinite", color: "#a855f7" }}
      />
      <div
        style={{
          fontFamily: "var(--font-dm-mono)",
          fontSize: "11px",
          letterSpacing: "0.10em",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        DETECTING FACES · {progress}%
      </div>
      <div
        style={{
          width: "240px",
          height: "4px",
          borderRadius: "999px",
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(135deg, #a855f7, #7c3aed)",
            transition: "width 0.2s ease",
          }}
        />
      </div>
      <p
        style={{
          maxWidth: "320px",
          textAlign: "center",
          fontFamily: "var(--font-dm-sans)",
          fontSize: "12px",
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.5,
        }}
      >
        Everything runs on your device. The video never leaves your phone
        until you tap save.
      </p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function SavingOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(6, 6, 12, 0.75)",
        backdropFilter: "blur(4px)",
        gap: "12px",
        zIndex: 5,
      }}
    >
      <Loader2
        size={32}
        strokeWidth={1.8}
        style={{ animation: "spin 1.2s linear infinite", color: "#a855f7" }}
      />
      <div
        style={{
          fontFamily: "var(--font-dm-mono)",
          fontSize: "11px",
          letterSpacing: "0.10em",
          color: "rgba(255,255,255,0.65)",
        }}
      >
        RE-ENCODING · TAKES ABOUT THE VIDEO LENGTH
      </div>
      <p
        style={{
          maxWidth: "300px",
          textAlign: "center",
          fontSize: "12px",
          color: "rgba(255,255,255,0.45)",
        }}
      >
        Don&apos;t close this window. We&apos;re burning the blur into the file.
      </p>
    </div>
  );
}

// Tells the typechecker we use Wand2 somewhere; keeps the import grouped
// alongside other lucide icons even though we only reference it in the
// upload form's "ADD BLUR" button (next chunk's wiring step).
void Wand2;
