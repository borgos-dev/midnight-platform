"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 200,
      height: "36px",
      display: "flex", alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      background: "linear-gradient(90deg, rgba(108,15,212,0.95), rgba(168,85,247,0.95), rgba(230,168,23,0.95))",
      backdropFilter: "blur(10px)",
    }}>
      {/* Content. Short copy on phones (truncating the long phrase used to
          eat the tagline entirely on 375px screens), full copy from 640+. */}
      <div className="mn-announcement-content">
        <div style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: "#5CB88A",
          animation: "pulse 2s infinite",
          flexShrink: 0,
        }} />
        <span className="mn-announcement-text mn-announcement-text--short">
          LIVE · THE NIGHT IS YOURS.
        </span>
        <span className="mn-announcement-text mn-announcement-text--long">
          LIVE · AFRICA&apos;S PREMIUM CREATOR PLATFORM · THE NIGHT IS YOURS.
        </span>
      </div>

      <style>{`
        .mn-announcement-content {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          overflow: hidden;
          padding-left: 16px;
          padding-right: 40px;
        }
        @media (min-width: 640px) {
          .mn-announcement-content {
            padding-left: 40px;
          }
        }
        .mn-announcement-text {
          font-family: var(--font-dm-mono);
          font-size: 10.5px;
          color: #fff;
          letter-spacing: 0.10em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (min-width: 640px) {
          .mn-announcement-text {
            font-size: 11px;
            letter-spacing: 0.12em;
          }
        }
        .mn-announcement-text--long { display: none; }
        @media (min-width: 640px) {
          .mn-announcement-text--short { display: none; }
          .mn-announcement-text--long { display: inline; }
        }
      `}</style>

      {/* Close button */}
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss announcement"
        style={{
          position: "absolute", right: "16px",
          background: "none", border: "none",
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          lineHeight: 0, padding: "4px",
          display: "flex", alignItems: "center",
          transition: "color 0.2s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color = "#fff";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)";
        }}
      ><X size={14} /></button>
    </div>
  );
}