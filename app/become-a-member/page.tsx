"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { AuthCard, AuthDivider } from "@/app/components/ui/AuthCard";
import { getPrimaryButtonVariant } from "@/app/lib/ab";
import {
  MIN_AGE_YEARS,
  maxBirthDateForMinAge,
  validateBirthDate,
} from "@/app/lib/age-validation";

const MIN_PASSWORD_LENGTH = 10;

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  birthDate?: string;
};

function validateEmail(v: string): string | undefined {
  if (!v) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "That doesn't look like a valid email";
  return undefined;
}

function validatePassword(v: string): string | undefined {
  if (!v) return "Password is required";
  if (v.length < MIN_PASSWORD_LENGTH) {
    const remaining = MIN_PASSWORD_LENGTH - v.length;
    return `${remaining} more character${remaining === 1 ? "" : "s"} to go`;
  }
  return undefined;
}

function validateName(v: string): string | undefined {
  if (!v) return undefined; // optional
  if (v.trim().length < 2) return "At least 2 characters";
  return undefined;
}

// Reuse the server-side validator so the client and server share one rule.
// Returns undefined when valid so it slots into the FieldErrors map.
function validateBirthDateField(v: string): string | undefined {
  const result = validateBirthDate(v);
  return result.ok ? undefined : result.error;
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

function borderFor(error: string | undefined, touched: boolean, value: string) {
  if (error) return "1px solid #E8547A";
  if (touched && value) return "1px solid #34d399";
  return "1px solid var(--border-strong)";
}

export default function BecomeAMemberPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [touched, setTouched] = useState<{
    name: boolean;
    email: boolean;
    password: boolean;
    birthDate: boolean;
  }>({
    name: false,
    email: false,
    password: false,
    birthDate: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Computed once: the latest birth date the browser picker will allow.
  // Memoized so the value is stable across re-renders within a session,
  // even though it would only roll over at UTC midnight.
  const maxBirthDate = useMemo(() => maxBirthDateForMinAge(), []);

  const passwordOK = password.length >= MIN_PASSWORD_LENGTH;

  function onBlur(field: "name" | "email" | "password" | "birthDate") {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({
      ...e,
      ...(field === "name" && { name: validateName(name) }),
      ...(field === "email" && { email: validateEmail(email) }),
      ...(field === "password" && { password: validatePassword(password) }),
      ...(field === "birthDate" && {
        birthDate: validateBirthDateField(birthDate),
      }),
    }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const next: FieldErrors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      birthDate: validateBirthDateField(birthDate),
    };
    setErrors(next);
    setTouched({ name: true, email: true, password: true, birthDate: true });

    if (next.email || next.password || next.name || next.birthDate) return;

    setPending(true);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    fd.set("password", password);
    fd.set("birthDate", birthDate);

    const res = await fetch("/api/become-a-member", { method: "POST", body: fd });
    const data = await res.json();
    setPending(false);

    if (!res.ok) {
      setServerError(data?.error ?? "Failed to create account");
      return;
    }
    router.replace(data?.redirect ?? "/login");
  }

  const eyebrow = (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 10px",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.15)",
        background: "rgba(255,255,255,0.04)",
        fontSize: "10px",
        fontFamily: "var(--font-dm-mono)",
        color: "var(--text-muted)",
        letterSpacing: "0.1em",
      }}
    >
      <span style={{ color: "#E6A817" }}>●</span> 18+ ONLY
    </div>
  );

  const footer = (
    <>
      <p
        style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          fontFamily: "var(--font-dm-sans)",
          textAlign: "center",
          margin: "16px 0 0",
          lineHeight: 1.6,
        }}
      >
        By joining you agree to our{" "}
        <Link href="/terms" style={{ color: "var(--accent-purple)", textDecoration: "none" }}>
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" style={{ color: "var(--accent-purple)", textDecoration: "none" }}>
          Privacy Policy
        </Link>
        .
      </p>

      <AuthDivider label="ALREADY A MEMBER?" />

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
        SIGN IN →
      </Link>
    </>
  );

  return (
    <AuthCard
      title="Start earning from your audience"
      subtitle="Free to join. Upgrade when you're ready."
      eyebrow={eyebrow}
      footer={footer}
      maxWidth={440}
    >
      {/* Value bullets */}
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "0 0 24px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {[
          "Personal dashboard with views, clicks, and weekly stats",
          "Fans reach you directly on WhatsApp — no platform middleman",
          "Upgrade to VIP for tier-gated posts and advanced analytics",
        ].map((line) => (
          <li
            key={line}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              fontSize: "13px",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-dm-sans)",
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                color: "var(--accent-purple)",
                fontWeight: 700,
                flexShrink: 0,
                marginTop: "1px",
              }}
            >
              ✓
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {/* Form */}
      <form
        onSubmit={onSubmit}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: "14px" }}
      >
        {/* Name */}
        <div>
          <label htmlFor="name" style={labelBase}>
            DISPLAY NAME <span style={{ opacity: 0.5 }}>(optional)</span>
          </label>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => onBlur("name")}
            placeholder="How you'll appear on the platform"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-err" : undefined}
            style={{ ...inputBase, border: borderFor(errors.name, touched.name, name) }}
          />
          {errors.name && (
            <p
              id="name-err"
              style={{
                fontSize: "12px",
                color: "#E8547A",
                margin: "6px 0 0",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              {errors.name}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" style={labelBase}>
            EMAIL
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => onBlur("email")}
            placeholder="your@email.com"
            required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-err" : undefined}
            style={{ ...inputBase, border: borderFor(errors.email, touched.email, email) }}
          />
          {errors.email && (
            <p
              id="email-err"
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

        {/* Birth date — required for the 18+ gate AND for the age shown on
            cards. Locked after signup; only admin can correct it later. */}
        <div>
          <label htmlFor="birthDate" style={labelBase}>
            BIRTH DATE
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => {
              setBirthDate(e.target.value);
              if (errors.birthDate) {
                setErrors((prev) => ({
                  ...prev,
                  birthDate: validateBirthDateField(e.target.value),
                }));
              }
            }}
            onBlur={() => onBlur("birthDate")}
            max={maxBirthDate}
            required
            aria-invalid={!!errors.birthDate}
            aria-describedby={errors.birthDate ? "birthdate-err" : "birthdate-hint"}
            style={{
              ...inputBase,
              border: borderFor(errors.birthDate, touched.birthDate, birthDate),
              colorScheme: "dark",
            }}
          />
          {errors.birthDate ? (
            <p
              id="birthdate-err"
              style={{
                fontSize: "12px",
                color: "#E8547A",
                margin: "6px 0 0",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              {errors.birthDate}
            </p>
          ) : (
            <p
              id="birthdate-hint"
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-dm-sans)",
                margin: "6px 0 0",
              }}
            >
              You must be at least {MIN_AGE_YEARS}. Locked after signup —
              contact support to correct typos.
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" style={labelBase}>
            PASSWORD
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password && e.target.value.length >= MIN_PASSWORD_LENGTH) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              onBlur={() => onBlur("password")}
              placeholder="••••••••••"
              required
              minLength={MIN_PASSWORD_LENGTH}
              aria-invalid={!!errors.password}
              aria-describedby="password-hint"
              style={{
                ...inputBase,
                padding: "11px 56px 11px 14px",
                border: borderFor(errors.password, touched.password, password),
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
          <p
            id="password-hint"
            style={{
              fontSize: "11px",
              color: errors.password
                ? "#E8547A"
                : passwordOK
                  ? "#34d399"
                  : "var(--text-muted)",
              fontFamily: "var(--font-dm-sans)",
              margin: "6px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span aria-hidden>{passwordOK ? "✓" : "○"}</span>
            {passwordOK
              ? "Strong enough"
              : `At least ${MIN_PASSWORD_LENGTH} characters${
                  password ? ` — ${MIN_PASSWORD_LENGTH - password.length} to go` : ""
                }`}
          </p>
        </div>

        {/* Server error (taken email, rate limit, etc.) */}
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
          {pending ? "CREATING ACCOUNT..." : "CREATE FREE ACCOUNT"}
        </Button>
      </form>
    </AuthCard>
  );
}
