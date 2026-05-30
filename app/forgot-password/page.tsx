"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, KeyRound, AlertTriangle } from "lucide-react";
import { requestPasswordReset } from "./actions";
import { Button } from "@/app/components/ui/Button";
import { AuthCard, AuthDivider } from "@/app/components/ui/AuthCard";
import { getPrimaryButtonVariant } from "@/app/lib/ab";

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "10px",
  background: "var(--bg-surface-alt)",
  color: "var(--text-primary)",
  fontSize: "14px",
  fontFamily: "var(--font-dm-sans)",
  outline: "none",
  border: "1px solid var(--border-strong)",
  transition: "border-color 0.2s ease",
  boxSizing: "border-box",
};

const labelBase: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontFamily: "var(--font-dm-mono)",
  color: "var(--text-muted)",
  letterSpacing: "0.08em",
  marginBottom: "6px",
};

export default function ForgotPasswordPage() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      if (result.error) setError(result.error);
      if (result.success) {
        setMessage(result.success);
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <AuthCard title="Check your email" icon={<Mail size={24} />}>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-dm-sans)",
            lineHeight: 1.6,
            margin: "0 0 24px",
            textAlign: "center",
          }}
        >
          We sent a password reset link to your email. The link expires in 1 hour.
        </p>

        {message && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(91,184,138,0.25)",
              background: "rgba(91,184,138,0.06)",
              fontSize: "12px",
              color: "#5CB88A",
              fontFamily: "var(--font-dm-sans)",
              marginBottom: "24px",
              lineHeight: 1.6,
            }}
          >
            {message}
          </div>
        )}

        <Link
          href="/login"
          className="block w-full text-center py-3 rounded-xl text-white font-bold no-underline transition shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40 bg-purple-600 hover:bg-purple-500"
          style={{
            fontSize: "13px",
            fontFamily: "var(--font-dm-mono)",
            letterSpacing: "0.08em",
          }}
        >
          BACK TO LOGIN
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot Password?"
      subtitle="No problem. Enter your email and we'll send you a secure reset link."
      icon={<KeyRound size={24} />}
      footer={
        <>
          <AuthDivider label="OR" />
          <Link
            href="/login"
            style={{
              display: "block",
              textAlign: "center",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid var(--border-strong)",
              background: "transparent",
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontSize: "13px",
              fontFamily: "var(--font-dm-mono)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-purple)";
              (e.currentTarget as HTMLElement).style.color = "var(--accent-purple)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            }}
          >
            ← BACK TO LOGIN
          </Link>
        </>
      }
    >
      <form
        action={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "14px" }}
      >
        <div>
          <label htmlFor="forgot-email" style={labelBase}>
            EMAIL ADDRESS
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            placeholder="your@email.com"
            required
            autoComplete="email"
            style={inputBase}
          />
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(232,84,122,0.3)",
              background: "rgba(232,84,122,0.08)",
              fontSize: "12px",
              color: "#E8547A",
              fontFamily: "var(--font-dm-sans)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant={getPrimaryButtonVariant()}
          size="lg"
          loading={pending}
          fullWidth
          className="mt-1 font-bold tracking-[0.08em] text-[13px] [font-family:var(--font-dm-mono)]"
        >
          {pending ? "SENDING..." : "SEND RESET LINK"}
        </Button>
      </form>
    </AuthCard>
  );
}
