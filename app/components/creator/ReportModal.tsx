"use client";

import { useState, useTransition } from "react";
import { Flag, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { submitReport } from "@/app/actions/submitReport";

type Category = {
  value: string;
  label: string;
  blurb?: string;
};

// Mirrors the Prisma enum exactly. Trafficking surfaces first since it's
// our highest-priority escalation path — putting it visually first sets
// expectations that this is a serious tool, not a "I don't like this"
// button.
const CATEGORIES: Category[] = [
  {
    value: "TRAFFICKING_OR_MINORS",
    label: "Trafficking or minors",
    blurb: "Suspected exploitation, coercion, or content involving anyone under 18",
  },
  {
    value: "IMPERSONATION",
    label: "Impersonation",
    blurb: "Pretending to be a real person without consent",
  },
  {
    value: "STOLEN_CONTENT",
    label: "Stolen content",
    blurb: "Using photos or videos that aren't theirs",
  },
  {
    value: "HARASSMENT",
    label: "Harassment",
    blurb: "Targeted abuse, threats, or doxxing",
  },
  {
    value: "ILLEGAL_SERVICES",
    label: "Illegal services",
    blurb: "Solicitation of acts that are illegal in your jurisdiction",
  },
  { value: "OTHER", label: "Something else" },
];

const MIN_LEN = 8;
const MAX_LEN = 2000;

type Props = {
  creatorId: number;
  creatorName?: string;
  onClose: () => void;
};

/**
 * Modal that replaces the old mailto Report flow. Submits to a server
 * action that writes a Report row into the moderation queue.
 *
 * UX rules:
 *   - Anonymous + logged-in both work (server attributes if it has a session).
 *   - Reason is required AND must clear MIN_LEN — a one-word report is
 *     almost always useless to the moderator. Encourages real context.
 *   - On success we swap to a Thank-You panel (the modal stays open until
 *     the visitor dismisses it). Important: we do NOT confirm whether the
 *     reported creator has been actioned. That's between admin and them.
 */
export function ReportModal({ creatorId, creatorName, onClose }: Props) {
  const [category, setCategory] = useState<string>(CATEGORIES[0].value);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending || sent) return;
    setError(null);

    if (reason.trim().length < MIN_LEN) {
      setError(
        `Please describe what you saw in at least ${MIN_LEN} characters so we can investigate.`,
      );
      return;
    }

    startTransition(async () => {
      const result = await submitReport({
        creatorprofileId: creatorId,
        category,
        reason,
      });
      if (result.ok) {
        setSent(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => {
        // Click outside the panel = close. Inner clicks bubble-stop.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0F0A18] p-5 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold tracking-[0.10em] text-rose-300">
              <Flag size={10} strokeWidth={2.5} />
              REPORT
            </div>
            <h2
              id="report-title"
              className="font-display text-xl font-bold mt-2 leading-tight"
            >
              {sent ? "Thank you for reporting" : `Report ${creatorName ?? "this profile"}`}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-white/10 p-1.5 text-white/70 hover:text-white hover:border-white/30 transition"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {sent ? (
          // ── Success state ──────────────────────────────────────
          <div>
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={20}
                className="text-emerald-400 mt-0.5 flex-shrink-0"
                strokeWidth={2.2}
              />
              <p className="text-sm text-white/80 leading-relaxed">
                Your report is in our moderation queue. We review every
                report within 24 hours and act on policy violations. You
                won&apos;t hear back unless we need more details from you.
              </p>
            </div>

            <p className="mt-4 text-xs text-white/45 leading-relaxed">
              For the creator&apos;s safety we never reveal who reported them.
              See our{" "}
              <a
                href="/safety"
                className="text-purple-300 underline underline-offset-2"
              >
                safety policy
              </a>{" "}
              for the full process.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-[13px] font-semibold transition"
            >
              Done
            </button>
          </div>
        ) : (
          // ── Form state ─────────────────────────────────────────
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-white/55 leading-relaxed">
              Help us keep Midnight safe. Tell us what you saw — only our
              moderators will see your report.
            </p>

            {/* Category radio group */}
            <div>
              <label className="block text-[11px] font-bold tracking-[0.10em] text-white/45 mb-2">
                WHAT&apos;S THE ISSUE?
              </label>
              <div className="space-y-1.5">
                {CATEGORIES.map((c) => {
                  const active = category === c.value;
                  return (
                    <label
                      key={c.value}
                      className={`flex items-start gap-2.5 rounded-lg px-3 py-2 cursor-pointer border text-sm transition ${
                        active
                          ? "border-purple-500/50 bg-purple-500/10"
                          : "border-white/10 bg-white/3 hover:border-white/25"
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={c.value}
                        checked={active}
                        onChange={() => setCategory(c.value)}
                        className="mt-0.5 accent-purple-600"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium">{c.label}</span>
                        {c.blurb && (
                          <span className="block text-[11px] text-white/45 leading-snug mt-0.5">
                            {c.blurb}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Reason textarea */}
            <div>
              <label
                htmlFor="report-reason"
                className="block text-[11px] font-bold tracking-[0.10em] text-white/45 mb-2"
              >
                WHAT DID YOU SEE?{" "}
                <span className="text-white/30 font-normal normal-case tracking-normal">
                  (required, {MIN_LEN}+ characters)
                </span>
              </label>
              <textarea
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={MAX_LEN}
                required
                placeholder="Describe what you observed — links, photo descriptions, dates if relevant."
                className="w-full rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-sm placeholder:text-white/25 focus:outline-none focus:border-purple-500/50 resize-none"
              />
              <p className="text-[10px] text-white/35 mt-1 text-right tabular-nums">
                {reason.length} / {MAX_LEN}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/8 p-2.5 text-xs text-rose-200"
              >
                <AlertTriangle
                  size={14}
                  strokeWidth={2.2}
                  className="text-rose-300 flex-shrink-0 mt-0.5"
                />
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 rounded-lg border border-white/15 hover:border-white/30 px-4 py-2.5 text-[13px] font-medium text-white/70 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-[13px] font-semibold transition disabled:opacity-50"
              >
                {isPending ? "Sending…" : "Submit report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
