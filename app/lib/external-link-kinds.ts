import {
  Camera,
  AtSign,
  PlayCircle,
  Globe,
  Send,
  Ghost,
  Music,
  Heart,
  type LucideIcon,
} from "lucide-react";
import type { ExternalLinkKind } from "@prisma/client";

/**
 * Visual metadata for each ExternalLinkKind enum value. Kept in one file
 * so the dashboard editor + the public profile read the same label, icon,
 * and brand-tinted accent for each link kind.
 *
 * The project's pinned lucide-react (v1.16.x) doesn't ship brand glyphs
 * for Instagram / Twitter / YouTube, so each kind below uses a
 * semantically-close generic icon paired with the brand's primary color
 * to carry the recognition:
 *   - Camera for Instagram — Instagram is fundamentally a camera app.
 *   - Ghost for Snapchat — matches the brand's ghost mascot.
 *   - Heart for OnlyFans — fits the brand voice; warm + intimate.
 *   - Music for TikTok — short-form music/video is the platform.
 *   - Send (paper plane) for Telegram — matches their logo silhouette.
 *   - AtSign for Twitter/X — the @ handle is its iconic marker.
 *   - PlayCircle for YouTube — the play button silhouette is YouTube's
 *     recognizable visual.
 *   - Globe for personal websites.
 *
 * Each chip pairs the icon with the brand's hex (e.g. Instagram pink)
 * so a row of links still reads as "social channels" at a glance even
 * though the icons aren't the true brand glyphs.
 */
export type ExternalLinkKindMeta = {
  label: string;
  /** Lucide icon component — render as `<Icon size={N} />`. */
  icon: LucideIcon;
  /** Hex accent for borders + icon color. */
  accent: string;
  /** Hint string shown in the editor under the URL field. */
  hint: string;
};

export const EXTERNAL_LINK_KIND_META: Record<ExternalLinkKind, ExternalLinkKindMeta> = {
  INSTAGRAM: {
    label: "Instagram",
    icon: Camera,
    accent: "#E1306C",
    hint: "https://instagram.com/your-handle",
  },
  TIKTOK: {
    label: "TikTok",
    icon: Music,
    accent: "#FE2C55",
    hint: "https://tiktok.com/@your-handle",
  },
  SNAPCHAT: {
    label: "Snapchat",
    icon: Ghost,
    accent: "#FFFC00",
    hint: "https://snapchat.com/add/your-handle",
  },
  ONLYFANS: {
    label: "OnlyFans",
    icon: Heart,
    accent: "#00AFF0",
    hint: "https://onlyfans.com/your-handle",
  },
  TELEGRAM: {
    label: "Telegram",
    icon: Send,
    accent: "#26A5E4",
    hint: "https://t.me/your-handle",
  },
  TWITTER: {
    label: "Twitter / X",
    icon: AtSign,
    accent: "#1DA1F2",
    hint: "https://x.com/your-handle",
  },
  YOUTUBE: {
    label: "YouTube",
    icon: PlayCircle,
    accent: "#FF0000",
    hint: "https://youtube.com/@your-handle",
  },
  WEBSITE: {
    label: "Personal website",
    icon: Globe,
    accent: "#a855f7",
    hint: "https://your-domain.com",
  },
};

/**
 * Display order in the kind picker dropdown — most-likely-to-be-used first
 * for African creators (Instagram + Snapchat + WhatsApp-adjacent channels
 * lead; YouTube / Twitter trail).
 */
export const EXTERNAL_LINK_KIND_ORDER: ExternalLinkKind[] = [
  "INSTAGRAM",
  "SNAPCHAT",
  "ONLYFANS",
  "TELEGRAM",
  "TIKTOK",
  "TWITTER",
  "YOUTUBE",
  "WEBSITE",
];
