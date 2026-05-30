"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

type Props = {
  url: string;
  title: string;
  text?: string;
};

/**
 * Share affordance for a creator profile.
 *
 * - Mobile: native Web Share API (one tap → WhatsApp, SMS, etc.)
 * - Desktop / Safari without Web Share: clipboard fallback with a brief
 *   checkmark confirmation, so users have visible feedback that the action
 *   actually did something.
 */
export function ShareButton({ url, title, text }: Props) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    // Try the native sheet first — best UX on mobile, especially Cameroon
    // where WhatsApp share-to-contact is the primary growth lever.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url, title, text });
        return;
      } catch {
        // User cancelled the share sheet → fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Silently fail — nothing useful to surface to the user here
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={copied ? "Link copied" : "Share profile"}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {copied ? <Check size={16} /> : <Share2 size={16} />}
    </button>
  );
}
