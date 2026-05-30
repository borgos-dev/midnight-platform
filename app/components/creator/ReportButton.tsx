"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { ReportModal } from "./ReportModal";

type Props = {
  creatorId: number;
  creatorName?: string;
  /** "icon" sits in a tight share-row alongside ShareButton; "full" is the
   *  larger form used in places with more horizontal room (e.g. a future
   *  desktop sidebar). Default "icon". */
  variant?: "icon" | "full";
};

/**
 * Visitor-facing "Report this profile" affordance. Opens the in-app
 * ReportModal (since Chunk 18c) which submits to the moderation queue
 * via a server action.
 *
 * Replaces the old mailto-based flow:
 *   - Reports now live in the DB (admin can review at /admin/reports)
 *   - No email client required — works for visitors who don't have one set up
 *   - Better attribution (logged-in users are recorded; anonymous reports
 *     still allowed, with IP hashed for dogpile detection)
 *   - The visible UI here stays minimal — clicking opens the modal which
 *     carries the actual form.
 */
export function ReportButton({
  creatorId,
  creatorName,
  variant = "icon",
}: Props) {
  const [open, setOpen] = useState(false);

  const button =
    variant === "full" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="report-btn report-btn--full"
        aria-label="Report this profile"
      >
        <Flag size={14} strokeWidth={2.4} />
        Report
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="report-btn report-btn--icon"
        aria-label="Report this profile"
        title="Report this profile"
      >
        <Flag size={14} strokeWidth={2.4} />
      </button>
    );

  return (
    <>
      {button}
      {open && (
        <ReportModal
          creatorId={creatorId}
          creatorName={creatorName}
          onClose={() => setOpen(false)}
        />
      )}
      <style>{`
        .report-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          text-decoration: none;
          transition: color 0.15s ease, border-color 0.15s ease,
            background 0.15s ease;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          cursor: pointer;
        }
        .report-btn:hover {
          color: #E8547A;
          border-color: rgba(232, 84, 122, 0.45);
          background: rgba(232, 84, 122, 0.08);
        }
        .report-btn--icon {
          width: 36px;
          height: 36px;
          padding: 0;
        }
        .report-btn--full {
          padding: 8px 14px;
        }
      `}</style>
    </>
  );
}
