"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

type Props = {
  imageUrl: string | null;
  videoUrl: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
};

/**
 * Cover thumbnail for a creator card. Bandwidth-conscious by default —
 * critical for the Cameroon mobile market where data is expensive.
 *
 * Strategy:
 *  - Always render a static poster first (zero video cost on initial paint).
 *  - Upgrade to autoplay video only when the Network Information API
 *    confirms a fast, non-saveData connection (4g/5g, saveData=false).
 *  - If the browser doesn't expose NIA (Safari, Firefox), default to
 *    static poster — safer for unknown conditions.
 *  - Show a play-icon overlay when the cover is a video that didn't autoplay,
 *    so users know there's motion content waiting.
 */
export default function CoverMedia({ imageUrl, videoUrl, alt, sizes, priority }: Props) {
  const [shouldAutoplay, setShouldAutoplay] = useState(false);

  useEffect(() => {
    if (!videoUrl) return;
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    // No Network Information API → don't gamble with the user's data.
    if (!conn) return;
    if (conn.saveData) return;
    if (conn.effectiveType !== "4g" && conn.effectiveType !== "5g") return;
    setShouldAutoplay(true);
  }, [videoUrl]);

  const posterUrl = imageUrl ?? cloudinaryVideoPoster(videoUrl);

  if (videoUrl && shouldAutoplay) {
    return (
      <video
        src={videoUrl}
        poster={posterUrl ?? undefined}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }

  if (!posterUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
        No photo
      </div>
    );
  }

  return (
    <>
      <Image
        src={posterUrl}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        unoptimized={!posterUrl.startsWith("https://res.cloudinary.com")}
      />
      {videoUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Play size={20} className="text-white" fill="white" />
          </div>
        </div>
      )}
    </>
  );
}

function cloudinaryVideoPoster(videoUrl: string | null): string | null {
  if (!videoUrl) return null;
  if (!videoUrl.includes("/video/upload/")) return null;
  return videoUrl
    .replace("/video/upload/", "/video/upload/so_0,f_auto,q_auto/")
    .replace(/\.(mp4|webm|mov)$/i, ".jpg");
}
