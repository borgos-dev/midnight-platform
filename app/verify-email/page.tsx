"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  ArrowRight,
} from "lucide-react";
import { verifyEmail, resendVerificationEmail } from "./actions";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  // Resend-flow state — separate from the verify state so the user can
  // request a fresh link without losing the original error context.
  const [resendEmail, setResendEmail] = useState("");
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(
        "No verification token in the link. If you typed the URL manually, request a new email below.",
      );
      return;
    }

    verifyEmail(token).then((result) => {
      if (result.error) {
        setStatus("error");
        setMessage(result.error);
      } else if (result.success) {
        setStatus("success");
        setMessage(result.success);
      }
    });
  }, [token]);

  async function handleResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (resendPending) return;
    setResendPending(true);
    setResendMessage(null);
    const result = await resendVerificationEmail(resendEmail);
    setResendPending(false);
    setResendMessage(result.error ?? result.success ?? null);
  }

  return (
    <div className="ve-shell">
      <div className="ve-card">
        {status === "loading" && (
          <div className="ve-state ve-state--loading">
            <Loader2 className="ve-icon ve-icon--spin" size={36} strokeWidth={2} />
            <h1 className="ve-title">Verifying your email…</h1>
            <p className="ve-body">Hold on a moment, this only takes a second.</p>
          </div>
        )}

        {status === "success" && (
          <div className="ve-state ve-state--success">
            <CheckCircle2
              className="ve-icon ve-icon--success"
              size={44}
              strokeWidth={2}
            />
            <h1 className="ve-title">Email verified</h1>
            <p className="ve-body">{message}</p>
            <Link href="/login" className="ve-btn ve-btn--primary">
              SIGN IN
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="ve-state ve-state--error">
            <XCircle
              className="ve-icon ve-icon--error"
              size={44}
              strokeWidth={2}
            />
            <h1 className="ve-title">Verification failed</h1>
            <p className="ve-body">{message}</p>

            {/* Resend mini-form — only shown on error since success doesn't
                need a fresh link. */}
            <form onSubmit={handleResend} className="ve-resend" noValidate>
              <label htmlFor="ve-email" className="ve-label">
                <Mail size={13} strokeWidth={2.4} />
                Send a fresh verification link
              </label>
              <div className="ve-resend-row">
                <input
                  id="ve-email"
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="ve-input"
                  disabled={resendPending}
                />
                <button
                  type="submit"
                  className="ve-btn ve-btn--primary ve-btn--compact"
                  disabled={resendPending || !resendEmail.includes("@")}
                >
                  {resendPending ? "SENDING…" : "RESEND"}
                </button>
              </div>
              {resendMessage && (
                <p className="ve-resend-status" role="status">
                  {resendMessage}
                </p>
              )}
            </form>

            <Link href="/login" className="ve-link">
              Back to sign in
            </Link>
          </div>
        )}
      </div>

      <style>{`
        .ve-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 100px 20px 60px;
          background:
            radial-gradient(circle at 30% 20%, rgba(168, 85, 247, 0.10), transparent 55%),
            radial-gradient(circle at 70% 80%, rgba(230, 168, 23, 0.05), transparent 55%),
            var(--bg-base);
        }
        .ve-card {
          width: 100%;
          max-width: 440px;
          padding: 36px 28px 28px;
          border-radius: 18px;
          background: var(--bg-surface);
          border: 1px solid rgba(168, 85, 247, 0.22);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
        }

        .ve-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
        }

        .ve-icon {
          margin-bottom: 4px;
        }
        .ve-icon--success { color: #5cb88a; }
        .ve-icon--error { color: #E8547A; }
        .ve-icon--spin {
          color: var(--accent-purple);
          animation: ve-spin 1s linear infinite;
        }
        @keyframes ve-spin {
          to { transform: rotate(360deg); }
        }

        .ve-title {
          font-family: var(--font-cormorant);
          font-size: 26px;
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin: 0;
        }
        .ve-body {
          font-family: var(--font-dm-sans);
          font-size: 14px;
          line-height: 1.55;
          color: var(--text-secondary);
          margin: 0;
          max-width: 340px;
        }

        .ve-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 11px 22px;
          border-radius: 10px;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.10em;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid transparent;
          transition: transform 0.15s ease, background 0.15s ease,
            opacity 0.15s ease;
          margin-top: 8px;
        }
        .ve-btn--primary {
          background: linear-gradient(135deg, var(--accent-purple), #7c3aed);
          color: #fff;
          box-shadow: 0 8px 22px rgba(168, 85, 247, 0.32);
        }
        .ve-btn--primary:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .ve-btn--primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .ve-btn--compact {
          padding: 11px 16px;
          margin-top: 0;
          flex-shrink: 0;
        }

        .ve-link {
          font-family: var(--font-dm-sans);
          font-size: 13px;
          color: var(--text-muted);
          text-decoration: none;
          margin-top: 6px;
        }
        .ve-link:hover {
          color: var(--text-primary);
        }

        /* Resend form */
        .ve-resend {
          width: 100%;
          margin-top: 14px;
          padding: 16px 14px 14px;
          border-radius: 12px;
          background: rgba(168, 85, 247, 0.06);
          border: 1px solid rgba(168, 85, 247, 0.22);
          display: flex;
          flex-direction: column;
          gap: 10px;
          text-align: left;
        }
        .ve-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-dm-mono);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.10em;
          color: var(--text-secondary);
          text-transform: uppercase;
        }
        .ve-label svg {
          color: var(--accent-purple);
        }
        .ve-resend-row {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        .ve-input {
          flex: 1;
          min-width: 0;
          padding: 11px 12px;
          border-radius: 10px;
          border: 1px solid var(--border-strong);
          background: var(--bg-surface-alt);
          color: var(--text-primary);
          font-family: var(--font-dm-sans);
          font-size: 13.5px;
          outline: none;
        }
        .ve-input:focus {
          border-color: var(--accent-purple);
        }
        .ve-resend-status {
          margin: 0;
          font-family: var(--font-dm-sans);
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-base)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "11px",
              color: "var(--text-muted)",
              letterSpacing: "0.10em",
            }}
          >
            LOADING…
          </p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
