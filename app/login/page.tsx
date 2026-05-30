// client/app/login/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Mail, AlertTriangle } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { AuthCard, AuthDivider } from "@/app/components/ui/AuthCard";
import { getPrimaryButtonVariant } from "@/app/lib/ab";
import { resendVerificationEmail } from "@/app/verify-email/actions";

type FieldErrors = {
  email?: string;
  password?: string;
};

function validateEmail(v: string): string | undefined {
  if (!v) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "That doesn't look like a valid email";
  return undefined;
}

function validatePassword(v: string): string | undefined {
  if (!v) return "Password is required";
  return undefined;
}

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "10px",
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

function borderFor(error: string | undefined, touched: boolean) {
  if (error && touched) return "1px solid #E8547A";
  return "1px solid var(--border-strong)";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showVerifyBanner = searchParams.get("verify") === "1";
  // Email forwarded from the signup redirect — used to pre-fill the form
  // AND to power the "Resend verification" button so the user doesn't have
  // to retype it.
  const prefilledEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Resend-flow state for the post-signup banner. Kept separate from the
  // login form's own state so neither flow interferes with the other.
  const [resendPending, setResendPending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  async function handleResend() {
    if (resendPending || !email) return;
    setResendPending(true);
    setResendStatus(null);
    const result = await resendVerificationEmail(email);
    setResendPending(false);
    setResendStatus(result.success ?? result.error ?? null);
  }

  function onBlur(field: "email" | "password") {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({
      ...e,
      ...(field === "email" && { email: validateEmail(email) }),
      ...(field === "password" && { password: validatePassword(password) }),
    }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const next: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(next);
    setTouched({ email: true, password: true });
    if (next.email || next.password) return;

    setPending(true);
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/dashboard",
    });
    setPending(false);

    if (result?.error) {
      setServerError("Invalid email or password.");
      return;
    }
    if (result?.url) {
      router.push(result.url);
    }
  }

  const footer = (
    <>
      <AuthDivider label="OR" />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-dm-sans)",
            margin: 0,
          }}
        >
          No account?{" "}
          <Link
            href="/become-a-member"
            style={{
              color: "var(--accent-purple)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Join free
          </Link>
        </p>
        <Link
          href="/forgot-password"
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            textDecoration: "none",
            fontFamily: "var(--font-dm-sans)",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
          }}
        >
          Forgot password?
        </Link>
      </div>
    </>
  );

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your creator account" footer={footer}>
      {showVerifyBanner && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(168,85,247,0.3)",
            background: "rgba(168,85,247,0.08)",
            fontSize: "13px",
            color: "var(--accent-purple)",
            fontFamily: "var(--font-dm-sans)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <Mail
              size={16}
              style={{ flexShrink: 0, marginTop: "2px" }}
              aria-hidden
            />
            <span style={{ flex: 1, lineHeight: 1.5 }}>
              Account created! We sent a verification link to
              {prefilledEmail ? (
                <>
                  {" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {prefilledEmail}
                  </strong>
                  .
                </>
              ) : (
                " your email."
              )}{" "}
              Click it to activate posting and upgrades.
            </span>
          </div>

          {/* Resend row — only when we have an email to send TO. If the user
              navigated to /login?verify=1 manually without an email param
              we hide the button rather than asking them to type it again. */}
          {prefilledEmail && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                paddingLeft: "26px",
                flexWrap: "wrap",
              }}
            >
              {resendStatus ? (
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-dm-sans)",
                  }}
                >
                  {resendStatus}
                </span>
              ) : (
                <>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Didn&apos;t get it?
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendPending}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(168,85,247,0.5)",
                      background: "transparent",
                      color: "var(--accent-purple)",
                      fontFamily: "var(--font-dm-mono)",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      letterSpacing: "0.10em",
                      cursor: resendPending ? "wait" : "pointer",
                      opacity: resendPending ? 0.5 : 1,
                    }}
                  >
                    {resendPending ? "SENDING…" : "RESEND"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        {/* Email */}
        <div>
          <label htmlFor="login-email" style={labelBase}>
            EMAIL
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => onBlur("email")}
            placeholder="your@email.com"
            required
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "login-email-err" : undefined}
            style={{ ...inputBase, border: borderFor(errors.email, touched.email) }}
          />
          {errors.email && touched.email && (
            <p
              id="login-email-err"
              style={{
                fontSize: "12px",
                color: "#E8547A",
                margin: "6px 0 0",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="login-password" style={labelBase}>
            PASSWORD
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => onBlur("password")}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "login-password-err" : undefined}
              style={{
                ...inputBase,
                padding: "11px 56px 11px 14px",
                border: borderFor(errors.password, touched.password),
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
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
              }}
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
          </div>
          {errors.password && touched.password && (
            <p
              id="login-password-err"
              style={{
                fontSize: "12px",
                color: "#E8547A",
                margin: "6px 0 0",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              {errors.password}
            </p>
          )}
        </div>

        {/* Server error (wrong credentials, etc.) */}
        {serverError && (
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
            {serverError}
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
          {pending ? "SIGNING IN..." : "SIGN IN"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
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
      <LoginForm />
    </Suspense>
  );
}
