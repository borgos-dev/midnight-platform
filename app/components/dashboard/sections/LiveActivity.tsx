// app/components/dashboard/sections/LiveActivity.tsx
"use client";

import { useEffect, useState } from "react";
import { AccessLevel } from "@prisma/client";
import {
  Smartphone,
  Monitor,
  Search,
  Eye,
  Lock,
  type LucideIcon,
} from "lucide-react";
import type { TIER_TOKENS } from "@/app/dashboard/DashboardShell";

type Tokens = typeof TIER_TOKENS[AccessLevel];

type Event = {
  id: number;
  eventType: string;
  country: string | null;
  city: string | null;
  device: string | null;
  createdAt: string;
};

type LiveActivityProps = {
  tier: AccessLevel;
  creatorId: number;
  tokens: Tokens;
};

export function LiveActivity({
  tier,
  creatorId,
  tokens,
}: LiveActivityProps) {
  const isVip = tier === "VIP" || tier === "VIP_PLUS";
  const isVipPlus = tier === "VIP_PLUS";
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real events
  useEffect(() => {
    fetch(`/api/analytics/live`, { credentials: "same-origin" })
      .then(res => res.json())
      .then(data => {
        setEvents(data.events ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetch(`/api/analytics/live`, { credentials: "same-origin" })
        .then(res => res.json())
        .then(data => setEvents(data.events ?? []))
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [creatorId]);

  // Time ago helper
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Format event — `DeviceIcon` is a Lucide component reference picked per
  // event so the activity feed renders consistent vector icons instead of
  // OS-rendered emoji.
  const formatEvent = (
    event: Event,
  ): {
    dot: string;
    dotOpacity: number;
    text: string;
    DeviceIcon: LucideIcon;
    show: boolean;
  } | null => {
    const place = event.city ?? event.country ?? "somewhere";
    const DeviceIcon: LucideIcon =
      event.device === "mobile" ? Smartphone : Monitor;

    switch (event.eventType) {
      case "profile_view":
        return {
          dot: tokens.accent,
          dotOpacity: 0.7,
          text: `${place} viewed your profile`,
          DeviceIcon,
          show: true,
        };
      case "whatsapp_click":
        if (!isVip) return null;
        return {
          dot: "#5CB88A",
          dotOpacity: 1,
          text: `${place} clicked WhatsApp`,
          DeviceIcon,
          show: true,
        };
      case "search_appear":
        if (!isVipPlus) return null;
        return {
          dot: tokens.accent,
          dotOpacity: 0.5,
          text: "Appeared in search results",
          DeviceIcon: Search,
          show: true,
        };
      default:
        return null;
    }
  };

  const visibleEvents = events
    .map(e => ({ event: e, formatted: formatEvent(e) }))
    .filter(e => e.formatted?.show);

  return (
    <div style={{
      padding: "18px",
      borderRadius: "14px",
      border: `0.5px solid ${tokens.borderStrong}`,
      background: tokens.surface,
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "16px",
      }}>
        <div style={{
          fontSize: "10px",
          fontFamily: "var(--font-dm-mono)",
          color: tokens.textMuted,
          letterSpacing: "0.08em",
        }}>LIVE ACTIVITY</div>

        {/* Live pulse */}
        <div style={{
          display: "flex", alignItems: "center", gap: "5px",
        }}>
          <div style={{
            width: "6px", height: "6px",
            borderRadius: "50%",
            background: "#5CB88A",
            animation: "pulse 2s infinite",
          }} />
          <span style={{
            fontSize: "9px",
            fontFamily: "var(--font-dm-mono)",
            color: tokens.textDim,
            letterSpacing: "0.06em",
          }}>LIVE</span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "0px",
      }}>
        {/* Loading skeleton */}
        {loading && (
          [1, 2, 3].map(i => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 0",
              borderBottom: `0.5px solid ${tokens.border}`,
              opacity: 0.4,
            }}>
              <div style={{
                width: "6px", height: "6px",
                borderRadius: "50%",
                background: tokens.border,
                flexShrink: 0,
              }} />
              <div style={{
                flex: 1,
                height: "10px",
                borderRadius: "4px",
                background: tokens.border,
              }} />
              <div style={{
                width: "28px", height: "10px",
                borderRadius: "4px",
                background: tokens.border,
              }} />
            </div>
          ))
        )}

        {/* Empty state */}
        {!loading && visibleEvents.length === 0 && (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "20px 0",
          }}>
            <Eye size={26} style={{ color: tokens.textDim, opacity: 0.6 }} />
            <p style={{
              fontSize: "11px",
              fontFamily: "var(--font-dm-mono)",
              color: tokens.textDim,
              textAlign: "center",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
            }}>
              Activity appears here<br />
              once visitors find you
            </p>
          </div>
        )}

        {/* Real events */}
        {!loading && visibleEvents.length > 0 && (
          visibleEvents.map(({ event, formatted }, i) => {
            const DeviceIcon = formatted!.DeviceIcon;
            return (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 0",
                  borderBottom: i < visibleEvents.length - 1
                    ? `0.5px solid ${tokens.border}`
                    : "none",
                }}
              >
                {/* Dot */}
                <div style={{
                  width: "6px", height: "6px",
                  borderRadius: "50%",
                  background: formatted!.dot,
                  opacity: formatted!.dotOpacity,
                  flexShrink: 0,
                }} />

                {/* Device icon */}
                <DeviceIcon
                  size={12}
                  style={{ color: tokens.textMuted, flexShrink: 0 }}
                />

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "12px",
                    color: tokens.text,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    opacity: 0.8,
                  }}>
                    {formatted!.text}
                  </div>
                </div>

                {/* Time */}
                <div style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-dm-mono)",
                  color: tokens.textDim,
                  flexShrink: 0,
                }}>
                  {timeAgo(event.createdAt)}
                </div>
              </div>
            );
          })
        )}

        {/* Locked hints for non VIP */}
        {!isVip && (
          <div style={{
            padding: "10px 0",
            borderTop: `0.5px solid ${tokens.border}`,
            marginTop: "auto",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              opacity: 0.4,
              marginBottom: "6px",
            }}>
              <Lock size={12} style={{ color: tokens.textDim, flexShrink: 0 }} />
              <span style={{
                fontSize: "11px",
                color: tokens.textDim,
                fontFamily: "var(--font-dm-sans)",
              }}>WA clicks — VIP only</span>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              opacity: 0.4,
            }}>
              <Lock size={12} style={{ color: tokens.textDim, flexShrink: 0 }} />
              <span style={{
                fontSize: "11px",
                color: tokens.textDim,
                fontFamily: "var(--font-dm-sans)",
              }}>Search appears — VIP+ only</span>
            </div>
          </div>
        )}

        {!isVipPlus && isVip && (
          <div style={{
            padding: "10px 0",
            borderTop: `0.5px solid ${tokens.border}`,
            marginTop: "auto",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              opacity: 0.4,
            }}>
              <Lock size={12} style={{ color: tokens.textDim, flexShrink: 0 }} />
              <span style={{
                fontSize: "11px",
                color: tokens.textDim,
                fontFamily: "var(--font-dm-sans)",
              }}>Search appearances — VIP+ only</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}