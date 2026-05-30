"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, KeyRound } from "lucide-react";
import { resetPassword } from "./actions";
import { Button } from "@/app/components/ui/Button";
import { AuthCard, AuthDivider } from "@/app/components/ui/AuthCard";
import { getPrimaryButtonVariant } from "@/app/lib/ab";
import { PasswordStrengthMeter } from "@/app/components/auth/PasswordStrengthMeter";

// NOTE: Server-side passwords API requires MIN_PASSWORD_LENGTH=10. The
// old form said 6 and would have been rejected at submit. Aligning here.
const MIN_PASSWORD_LENGTH = 10;

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "11px 52px 11px 14px",
  borderRadius: "10px",
  border: "1px solid var(--border-strong)",
  background: "var(--bg-surface-alt)",
  color: "var(--text-primary)",
  fontSize: "14px",
  fontFamily: "var(--font-dm-sans)",
  outline: "none",
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

const showHideButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  fontSize: "11px",
  fontFamily: "var(--font-dm-mono)",
  color: "var(--accent-purple)",
  cursor: "pointer",
  letterSpacing: "0.06em",
  fontWeight: 700,
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  // Live password value for the strength meter. Kept as state instead of
  // reading from the input on every keystroke so React batches the updates.
  const [password, setPassword] = useState("");

  // On successful reset, sign the user out of any active session on this
  // device. The server side already wipes all reset tokens; this closes
  // the local browser session so the next visit goes through fresh login.
  // `redirect: false` keeps us on the success screen instead of bouncing
  // to NextAuth's default sign-out page.
  useEffect(() => {
    if (!success) return;
    signOut({ redirect: false }).catch(() => {});
  }, [success]);

  function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result.error) setError(result.error);
      if (result.success) {
        setMessage(result.success);
        setSuccess(true);
      }
    });
  }

  if (!token) {
    return (
      <AuthCard
        title="Invalid Reset Link"
        subtitle="This reset link is invalid or has expired. Please request a new one."
        icon={<AlertTriangle size={24} />}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link
            href="/forgot-password"
            className="block w-full text-center py-3 rounded-xl text-white font-bold no-underline transition shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40 bg-purple-600 hover:bg-purple-500"
            style={{
              fontSize: "13px",
              fontFamily: "var(--font-dm-mono)",
              letterSpacing: "0.08em",
            }}
          >
            REQUEST NEW LINK
          </Link>
          <Link
            href="/login"
            style={{
              display: "block",
              textAlign: "center",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid var(--border-strong)",
              color: "var(--text-muted)",
              textDecoration: "none",
              fontSize: "13px",
              fontFamily: "var(--font-dm-mono)",
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            ← BACK TO LOGIN
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (success) {
    return (
      <AuthCard
        title="Password Updated"
        subtitle="Your password has been reset successfully. You can now sign in with your new password."
        icon={<CheckCircle2 size={24} />}
      >
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
              marginBottom: "20px",
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
          SIGN IN NOW →
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Choose a strong new password for your Midnight account."
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
        <input type="hidden" name="token" value={token} />

        <div>
          <label htmlFor="reset-password" style={labelBase}>
            NEW PASSWORD
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="reset-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputBase}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={showHideButtonStyle}
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
          </div>

          {/* Live strength feedback — bars stay dim until the user types. */}
          <div style={{ marginTop: "8px" }}>
            <PasswordStrengthMeter password={password} />
          </div>
        </div>

        <div>
          <label htmlFor="reset-confirm" style={labelBase}>
            CONFIRM PASSWORD
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="reset-confirm"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••••"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              style={inputBase}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              style={showHideButtonStyle}
            >
              {showConfirm ? "HIDE" : "SHOW"}
            </button>
          </div>
        </div>

        <p
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-dm-sans)",
            margin: "-6px 0 0",
            lineHeight: 1.5,
          }}
        >
          Minimum {MIN_PASSWORD_LENGTH} characters. Use a mix of letters and numbers for security.
        </p>

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
          {pending ? "UPDATING..." : "UPDATE PASSWORD"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-primary)",
            padding: "136px 24px 24px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontFamily: "var(--font-dm-mono)",
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
            }}
          >
            LOADING...
          </p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
