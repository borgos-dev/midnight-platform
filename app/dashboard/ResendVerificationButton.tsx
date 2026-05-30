"use client";

import { useState, useTransition } from "react";
import { resendVerificationEmail } from "@/app/verify-email/actions";

type Props = {
  /** The signed-in user's email — passed in by the server so the user
   *  doesn't have to retype it. */
  email: string;
  /** Tier-tinted accent so the button feels native to whatever tier
   *  surface (gold / purple / rose / neutral) it sits on. */
  accentColor: string;
};

/**
 * Inline "Resend" button for the unverified-email banner on the dashboard.
 * Kept dumb on purpose:
 *   - Single button, calls the server action, swaps to a status message
 *   - 60-second client-side cooldown so the user can't spam clicks even
 *     if our server-side rate limiter is hot (gives nicer feedback)
 *
 * The actual rate-limit + token rotation lives server-side in
 * `resendVerificationEmail`. This is just UX padding.
 */
export function ResendVerificationButton({ email, accentColor }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);

  const handleClick = () => {
    if (isPending || cooldown) return;
    startTransition(async () => {
      const result = await resendVerificationEmail(email);
      setStatus(result.success ?? result.error ?? null);
      setCooldown(true);
      // 60s cooldown — matches the server-side window roughly so a second
      // click isn't immediately wasted on the rate-limit response.
      setTimeout(() => setCooldown(false), 60_000);
    });
  };

  // Once the action has resolved we show the status text inline and hide
  // the button — there's no use case for clicking twice in a row.
  if (status) {
    return (
      <span
        style={{
          fontSize: "12px",
          color: accentColor,
          fontFamily: "var(--font-dm-sans)",
          flexShrink: 0,
        }}
      >
        {status}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || cooldown}
      style={{
        padding: "6px 12px",
        borderRadius: "8px",
        border: `1px solid ${accentColor}66`,
        background: "transparent",
        color: accentColor,
        fontFamily: "var(--font-dm-mono)",
        fontSize: "10.5px",
        fontWeight: 800,
        letterSpacing: "0.10em",
        cursor: isPending ? "wait" : "pointer",
        opacity: isPending || cooldown ? 0.5 : 1,
        transition: "background 0.15s ease, border-color 0.15s ease",
        flexShrink: 0,
      }}
    >
      {isPending ? "SENDING…" : "RESEND"}
    </button>
  );
}
