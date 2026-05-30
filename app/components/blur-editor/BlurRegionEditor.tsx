"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { X, Check, Eraser, Loader2 } from "lucide-react";

type Region = {
  id: number;
  /** Coordinates are stored in the source image's native pixel space so
   *  the same regions render correctly at any preview size. */
  x: number;
  y: number;
  w: number;
  h: number;
};

type Props = {
  /** The image the creator just chose. Reading happens once; if the user
   *  closes + reopens we get a fresh prop. */
  file: File;
  /** Called when the creator finishes editing. Returns a File with the
   *  same name + a sensible MIME, ready to drop into FormData. */
  onSave: (modified: File) => void;
  /** Called when the creator backs out without saving. Caller decides
   *  whether to fall back to the original file or remove the upload. */
  onCancel: () => void;
};

// Pixelation tile size range. The slider exposes this so the creator
// dials in how "anonymous" the blur feels — lower = subtle obscuring,
// higher = unrecognizable mosaic. Defaults to 14 (medium).
const INTENSITY_MIN = 4;
const INTENSITY_MAX = 40;
const INTENSITY_DEFAULT = 14;

const MIN_REGION_SIZE = 6; // Reject drag rectangles smaller than this so a
// stray tap doesn't leave a dot on the photo.

/** Friendly label for the current intensity. Three bands so the slider
 *  doesn't feel like a math control. Boundaries match the slider's visual
 *  thirds. */
function intensityLabel(value: number): string {
  if (value < 10) return "Light";
  if (value < 24) return "Medium";
  return "Strong";
}

/**
 * Manual blur region editor. Opens as a full-screen modal over the upload
 * form. Creator drags rectangles over anything they want hidden; each
 * region is pixelated in real time so they see the final result before
 * the file ever leaves the device.
 *
 * Design choices:
 *   - All work happens client-side. The original un-blurred image never
 *     touches Cloudinary or our server — only the modified blob uploads.
 *     This is the privacy moat we picked over Sightengine for video.
 *   - Coordinates are stored in source-pixel space (not viewport space)
 *     so the same regions render correctly when the viewport resizes
 *     (e.g. phone rotates) AND when we render at full resolution on save.
 *   - Pointer events used instead of separate mouse/touch handlers so
 *     mobile + desktop share one drag path.
 *
 * NOT supported (intentional MVP scope):
 *   - Move/resize an existing region after drawing (delete + redraw)
 *   - Freeform / lasso shapes
 *   - Undo stack
 */
export function BlurRegionEditor({ file, onSave, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Cached source image — drawn into the visible canvas each time the
  // region list or viewport changes.
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  // The committed list of blur regions.
  const [regions, setRegions] = useState<Region[]>([]);
  // The in-flight rectangle while the user is mid-drag. Lives in state so
  // the canvas re-renders during the drag without throwing a ref.current
  // mutation into a useEffect.
  const [draft, setDraft] = useState<Region | null>(null);
  // Viewport sizing — recomputed on container resize. Used to map between
  // CSS px (what the pointer reports) and source px (what we store).
  const [view, setView] = useState<{ w: number; h: number; scale: number }>({
    w: 0,
    h: 0,
    scale: 1,
  });
  const [saving, setSaving] = useState(false);
  // Blur intensity (block size in source-pixel space). Lifted to state so
  // the slider can drive both the live preview and the saved-out file.
  // Applies globally to every region — per-region intensity would mean
  // managing selection state, which we keep out of MVP scope.
  const [intensity, setIntensity] = useState<number>(INTENSITY_DEFAULT);

  // Stable id generator so a deleted region's id isn't reused this session.
  const nextId = useRef(1);

  // Decode the file into an HTMLImageElement once. URL.createObjectURL is
  // cheaper than reading into a base64 data URI for big phone-camera images.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Fit the canvas into its container while preserving aspect ratio.
  // We render the canvas at the source's native pixel resolution and use
  // CSS to scale it down — keeps strokes crisp on high-DPI displays AND
  // means the saved-out file is full-quality.
  useLayoutEffect(() => {
    if (!image || !containerRef.current) return;
    const measure = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const maxW = rect.width;
      const maxH = rect.height;
      const ratio = Math.min(maxW / image.width, maxH / image.height, 1);
      setView({
        w: Math.round(image.width * ratio),
        h: Math.round(image.height * ratio),
        scale: ratio,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [image]);

  // ── Renderer ──────────────────────────────────────────────────────
  // Draws the image + applies the pixelation effect to every saved region
  // + outlines the in-flight draft rectangle. Pure function of (image,
  // regions, draft) — re-run whenever any of those change.
  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Base image (full source resolution, then CSS scales down).
    ctx.drawImage(image, 0, 0, image.width, image.height);

    // 2. Pixelate each committed region by downscaling + upscaling that
    //    sub-rectangle through the same context. Disabling smoothing is
    //    what produces the blocky look (instead of a soft blur). Block
    //    size is the slider-driven `intensity` value.
    ctx.imageSmoothingEnabled = false;
    for (const r of regions) {
      const blockSize = Math.max(2, Math.floor(intensity));
      const dsW = Math.max(1, Math.floor(r.w / blockSize));
      const dsH = Math.max(1, Math.floor(r.h / blockSize));
      // Downscale into a tiny offscreen tile, then upscale back into place.
      const tile = document.createElement("canvas");
      tile.width = dsW;
      tile.height = dsH;
      const tctx = tile.getContext("2d");
      if (!tctx) continue;
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(canvas, r.x, r.y, r.w, r.h, 0, 0, dsW, dsH);
      ctx.drawImage(tile, 0, 0, dsW, dsH, r.x, r.y, r.w, r.h);
    }
    ctx.imageSmoothingEnabled = true;

    // 3. Outline the in-flight drag (purple dashed) so the user sees what
    //    they're about to commit. Outlines drawn in source-pixel space.
    if (draft && draft.w > 0 && draft.h > 0) {
      ctx.save();
      ctx.lineWidth = Math.max(2, Math.round(4 / view.scale));
      ctx.setLineDash([12 / view.scale, 8 / view.scale]);
      ctx.strokeStyle = "#a855f7";
      ctx.strokeRect(draft.x, draft.y, draft.w, draft.h);
      ctx.restore();
    }
  }, [image, regions, draft, view.scale, intensity]);

  // Re-paint on every change to the inputs above.
  useEffect(() => {
    repaint();
  }, [repaint]);

  // ── Pointer drag handlers ────────────────────────────────────────
  // We capture the pointer so the drag continues even if the cursor
  // leaves the canvas (the user can finish a rectangle in the toolbar
  // area, which is normal selection UX).
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const pointerToSource = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    // CSS px relative to canvas, then divide by scale to get source px.
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    return {
      x: cssX / view.scale,
      y: cssY / view.scale,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = pointerToSource(e);
    dragStart.current = pt;
    setDraft({ id: 0, x: pt.x, y: pt.y, w: 0, h: 0 });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart.current || !image) return;
    const pt = pointerToSource(e);
    // Normalize so width/height stay positive even if the user drags up/left.
    const x = Math.min(dragStart.current.x, pt.x);
    const y = Math.min(dragStart.current.y, pt.y);
    const w = Math.abs(pt.x - dragStart.current.x);
    const h = Math.abs(pt.y - dragStart.current.y);
    setDraft({
      id: 0,
      x: Math.max(0, x),
      y: Math.max(0, y),
      w: Math.min(w, image.width - x),
      h: Math.min(h, image.height - y),
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
    setRegions((prev) => [...prev, { ...draft, id: nextId.current++ }]);
    setDraft(null);
  };

  // ── Delete-region overlay coordinates ────────────────────────────
  // Render an absolutely-positioned `×` button per committed region.
  // Calculated in CSS px (viewport space) so we don't need transforms.
  const deleteHandles = useMemo(
    () =>
      regions.map((r) => ({
        id: r.id,
        left: r.x * view.scale,
        top: r.y * view.scale,
      })),
    [regions, view.scale],
  );

  // ── Save ──────────────────────────────────────────────────────────
  // Re-render at source resolution (no preview scrim, no draft outline),
  // export as a JPEG blob, and hand back to the parent as a File. We keep
  // the original filename so server-side handlers don't have to special-case
  // edited uploads.
  async function handleSave() {
    if (!image) return;
    setSaving(true);
    try {
      const out = document.createElement("canvas");
      out.width = image.width;
      out.height = image.height;
      const octx = out.getContext("2d");
      if (!octx) throw new Error("Canvas unavailable.");

      octx.drawImage(image, 0, 0);
      octx.imageSmoothingEnabled = false;
      for (const r of regions) {
        // Save path uses the same intensity the preview is showing, so the
        // exported file matches what the creator sees on screen.
        const blockSize = Math.max(2, Math.floor(intensity));
        const dsW = Math.max(1, Math.floor(r.w / blockSize));
        const dsH = Math.max(1, Math.floor(r.h / blockSize));
        const tile = document.createElement("canvas");
        tile.width = dsW;
        tile.height = dsH;
        const tctx = tile.getContext("2d");
        if (!tctx) continue;
        tctx.imageSmoothingEnabled = false;
        tctx.drawImage(out, r.x, r.y, r.w, r.h, 0, 0, dsW, dsH);
        octx.drawImage(tile, 0, 0, dsW, dsH, r.x, r.y, r.w, r.h);
      }

      // Re-encode as JPEG. quality 0.92 ≈ visually lossless but ~3x smaller
      // than PNG for typical photos.
      const blob: Blob | null = await new Promise((resolve) =>
        out.toBlob((b) => resolve(b), "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("Failed to encode image.");

      // Preserve the original name, swap any extension for .jpg since we
      // re-encoded to JPEG. The server is content-type driven so this is
      // mostly cosmetic.
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const out_file = new File([blob], `${baseName}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      onSave(out_file);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Blur regions editor"
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
            PRIVACY · MANUAL REGIONS
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
            Drag over anything you want hidden
          </div>
          <div
            style={{
              marginTop: "3px",
              fontSize: "12px",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {regions.length} {regions.length === 1 ? "region" : "regions"} ·
            tap × to remove · everything stays on your device until you save
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel edits"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.85)",
            borderRadius: "10px",
            padding: "8px 10px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Intensity slider — drives the block size used by both the live
          preview and the saved-out file. Changes propagate instantly via
          the `intensity` dep on the repaint effect. */}
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
          htmlFor="blur-intensity"
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
          id="blur-intensity"
          type="range"
          min={INTENSITY_MIN}
          max={INTENSITY_MAX}
          step={1}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          aria-label="Blur intensity"
          style={{
            flex: 1,
            minWidth: 0,
            accentColor: "#a855f7",
          }}
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

      {/* Canvas container — flex-1 to fill available height */}
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
        {!image && (
          <div style={{ color: "rgba(255,255,255,0.5)", display: "flex", gap: "8px", alignItems: "center" }}>
            <Loader2 size={16} className="animate-spin" /> Loading image…
          </div>
        )}

        {image && (
          <div
            style={{
              position: "relative",
              width: view.w,
              height: view.h,
            }}
          >
            <canvas
              ref={canvasRef}
              width={image.width}
              height={image.height}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                width: view.w,
                height: view.h,
                touchAction: "none",
                cursor: "crosshair",
                borderRadius: "10px",
                boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
                display: "block",
              }}
            />

            {/* Per-region delete buttons. Layered above the canvas in CSS
                space so taps don't pass through to the canvas drag handler. */}
            {deleteHandles.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRegions((prev) => prev.filter((r) => r.id !== h.id));
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
                }}
              >
                <X size={13} strokeWidth={3} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer toolbar */}
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
          onClick={() => setRegions([])}
          disabled={regions.length === 0 || saving}
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
            cursor: regions.length ? "pointer" : "not-allowed",
            opacity: regions.length ? 1 : 0.4,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Eraser size={14} strokeWidth={2.4} />
          CLEAR ALL
        </button>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
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
            disabled={saving || !image}
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
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.6 : 1,
              boxShadow: "0 8px 20px rgba(168, 85, 247, 0.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                SAVING…
              </>
            ) : (
              <>
                <Check size={14} strokeWidth={3} />
                APPLY {regions.length > 0 ? `${regions.length} BLUR${regions.length > 1 ? "S" : ""}` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
