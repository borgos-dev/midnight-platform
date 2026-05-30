"use client";

import { useState } from "react";
import { saveBoostPhoneAndOpenWhatsApp } from "./server-actions";

type Props = {
  defaultPhone: string;
  /** True when the creator has already sent proof at least once. We still
   *  allow resubmits (typo fix), just nudge them with a softer message. */
  alreadySubmitted: boolean;
};

/**
 * Phone input + WhatsApp opener. Mirrors `/upgrade/proof` so creators see
 * the exact same flow regardless of whether they're subscribing or boosting.
 *
 * Reason we open WhatsApp instead of uploading the screenshot here:
 *   - Mobile Money in Cameroon is reconciled by humans. The admin reads
 *     the screenshot + matches it to the boost row inside the same
 *     conversation. No server-side image hosting bill for receipts.
 *   - Works on cheap phones with flaky data — opening a wa.me deeplink
 *     is more reliable than a multipart upload.
 */
export function BoostProofForm({ defaultPhone, alreadySubmitted }: Props) {
  const [phone, setPhone] = useState(defaultPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setError(null);
    if (!phone) {
      setError("Enter the phone number used to pay.");
      return;
    }
    setLoading(true);
    try {
      const whatsappUrl = await saveBoostPhoneAndOpenWhatsApp(phone);
      window.location.href = whatsappUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: "18px 18px 20px",
        borderRadius: "14px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-strong)",
      }}
    >
      <label
        htmlFor="boost-phone"
        style={{
          display: "block",
          fontFamily: "var(--font-dm-mono)",
          fontSize: "10.5px",
          letterSpacing: "0.10em",
          fontWeight: 800,
          color: "var(--text-muted)",
          marginBottom: "8px",
        }}
      >
        PHONE NUMBER USED TO PAY
      </label>
      <input
        id="boost-phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="e.g. +237670000000"
        autoComplete="tel"
        inputMode="tel"
        style={{
          width: "100%",
          padding: "11px 14px",
          borderRadius: "10px",
          border: "1px solid var(--border-strong)",
          background: "var(--bg-surface-alt)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-dm-sans)",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      {error && (
        <p
          role="alert"
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            borderRadius: "8px",
            background: "rgba(232,84,122,0.08)",
            border: "1px solid rgba(232,84,122,0.3)",
            fontSize: "12px",
            color: "#E8547A",
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={loading}
        style={{
          marginTop: "14px",
          width: "100%",
          padding: "14px 16px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #25D366, #128C7E)",
          color: "#fff",
          fontFamily: "var(--font-dm-mono)",
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.10em",
          border: "none",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.6 : 1,
          boxShadow: "0 8px 22px rgba(37, 211, 102, 0.35)",
        }}
      >
        {loading
          ? "OPENING WHATSAPP…"
          : alreadySubmitted
            ? "RESEND PROOF VIA WHATSAPP"
            : "SEND PROOF VIA WHATSAPP"}
      </button>

      {alreadySubmitted && (
        <p
          style={{
            marginTop: "12px",
            fontFamily: "var(--font-dm-sans)",
            fontSize: "12px",
            color: "var(--text-muted)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          You&apos;ve already sent proof. We&apos;ll review within 24 hours.
          Resend here only if you need to update your phone number.
        </p>
      )}
    </div>
  );
}
