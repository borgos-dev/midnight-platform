// app/components/dashboard/NotificationBell.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  User,
  MessageCircle,
  Star,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { TIER_TOKENS } from "@/app/dashboard/DashboardShell";
import { AccessLevel } from "@prisma/client";

type Tokens = typeof TIER_TOKENS[AccessLevel];

type Notification = {
  id: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type Props = {
  creatorId: number;
  tokens: Tokens;
};

const POLL_INTERVAL_MS = 30_000;

// Where each notification type takes the user when clicked. Falls through
// to /dashboard if the type isn't mapped — safer than a 404.
const ROUTE_FOR_TYPE: Record<string, string> = {
  profile_view: "/dashboard",
  whatsapp_click: "/dashboard",
  new_subscriber: "/dashboard",
  subscription_expiring: "/upgrade",
};

export function NotificationBell({ creatorId, tokens }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications`, { credentials: "same-origin" });
      const data = await res.json();
      const list: Notification[] = data.notifications ?? [];
      const count: number = data.unreadCount ?? 0;

      // Pulse when the unread count goes up (including 0 → N).
      if (count > prevUnreadRef.current) {
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
      }
      prevUnreadRef.current = count;

      setNotifications(list);
      setUnreadCount(count);
    } catch {
      // silent fail — we don't want to surface transient network errors here
    }
  }, []);

  // Poll while tab is visible; resume immediately on visibility change.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      fetchNotifications();
      timer = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        stop();
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchNotifications, creatorId]);

  // Close on outside click.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on ESC for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Click a single notification → optimistic mark-read, navigate, close.
  const handleNotificationClick = (n: Notification) => {
    if (!n.read) {
      // Optimistic update — UI reflects read state immediately.
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);

      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {});
    }

    setOpen(false);
    const dest = ROUTE_FOR_TYPE[n.type] ?? "/dashboard";
    router.push(dest);
  };

  // Explicit "Mark all read" — user agency, not a side effect of opening.
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    prevUnreadRef.current = 0;

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({}),
      });
    } catch {
      // silent — optimistic state already reflects intent
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const typeIcon: Record<string, LucideIcon> = {
    profile_view: User,
    whatsapp_click: MessageCircle,
    new_subscriber: Star,
    subscription_expiring: AlertTriangle,
  };

  const bellAriaLabel =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={bellAriaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "9px",
          border: `0.5px solid ${tokens.border}`,
          background: tokens.surfaceAlt,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = tokens.accent;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = tokens.border;
        }}
      >
        <Bell size={15} style={{ color: tokens.text }} aria-hidden />

        {/* Unread badge — pulses on count increase */}
        {unreadCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              background: tokens.accent,
              border: `2px solid ${tokens.bg}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "8px",
              fontFamily: "var(--font-dm-mono)",
              fontWeight: 700,
              color: tokens.bg,
              animation: pulse ? "notif-pulse 0.6s ease-out" : undefined,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {/* Inline keyframes — keeps the component self-contained */}
      <style jsx>{`
        @keyframes notif-pulse {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          style={{
            position: "absolute",
            right: 0,
            top: "44px",
            width: "min(320px, calc(100vw - 32px))",
            borderRadius: "14px",
            border: `0.5px solid ${tokens.borderStrong}`,
            background: tokens.surface,
            boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {/* Header — orientation + agency */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: `0.5px solid ${tokens.border}`,
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-dm-mono)",
                color: tokens.textMuted,
                letterSpacing: "0.08em",
              }}
            >
              {unreadCount > 0 ? `${unreadCount} NEW` : "ALL CAUGHT UP ✓"}
            </span>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-dm-mono)",
                  color: tokens.accent,
                  letterSpacing: "0.06em",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 4px",
                  borderRadius: "4px",
                }}
              >
                MARK ALL READ
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "32px 16px",
                  gap: "8px",
                }}
              >
                <Bell
                  size={24}
                  style={{ color: tokens.textDim, opacity: 0.7 }}
                  aria-hidden
                />
                <p
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-dm-mono)",
                    color: tokens.textDim,
                    textAlign: "center",
                    letterSpacing: "0.04em",
                    lineHeight: 1.6,
                  }}
                >
                  No notifications yet.
                  <br />
                  They appear as visitors
                  <br />
                  interact with your profile.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  role="menuitem"
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    width: "100%",
                    padding: "12px 16px 12px 13px", // -3px left to make room for the unread bar
                    borderBottom: `0.5px solid ${tokens.border}`,
                    borderLeft: !n.read
                      ? `3px solid ${tokens.accent}`
                      : "3px solid transparent",
                    background: !n.read ? tokens.accentSoft : "transparent",
                    transition: "background 0.2s ease",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "inherit",
                    font: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = n.read
                      ? tokens.surfaceAlt
                      : tokens.accentSoft;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = !n.read
                      ? tokens.accentSoft
                      : "transparent";
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "7px",
                      background: tokens.surfaceAlt,
                      border: `0.5px solid ${tokens.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: tokens.text,
                    }}
                    aria-hidden
                  >
                    {(() => {
                      const Icon = typeIcon[n.type] ?? Bell;
                      return <Icon size={14} />;
                    })()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "12px",
                        color: tokens.text,
                        fontFamily: "var(--font-dm-sans)",
                        lineHeight: 1.5,
                        margin: "0 0 3px",
                        // Triple-signal #3: bolder text for unread
                        fontWeight: !n.read ? 600 : 400,
                        opacity: !n.read ? 1 : 0.75,
                      }}
                    >
                      {n.message}
                    </p>
                    <p
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-dm-mono)",
                        color: tokens.textDim,
                        margin: 0,
                      }}
                    >
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              style={{
                padding: "10px 16px",
                borderTop: `0.5px solid ${tokens.border}`,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-dm-mono)",
                  color: tokens.textDim,
                  letterSpacing: "0.06em",
                }}
              >
                SHOWING LAST 20 NOTIFICATIONS
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
