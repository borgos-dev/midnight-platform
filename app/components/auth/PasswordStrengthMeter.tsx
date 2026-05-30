"use client";

// Import from passwords-rules (not passwords) so we don't drag bcrypt
// into the client bundle. See app/lib/passwords-rules.ts.
import { MIN_PASSWORD_LENGTH } from "@/app/lib/passwords-rules";

type Strength = {
  /** 0-4. 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong. */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
};

/**
 * Cheap, dependency-free password strength estimator. Not a substitute for
 * zxcvbn — it just rewards length + character-class diversity so visitors
 * get a useful nudge toward better passwords without a 100KB dictionary
 * bundle on the auth flow.
 *
 * Scoring (additive, capped at 4):
 *   - meets MIN_PASSWORD_LENGTH                 +1
 *   - >= 14 characters                          +1
 *   - mix of lower + upper                      +1
 *   - contains a digit                          +0.5
 *   - contains a symbol                         +0.5
 *
 * Below MIN_PASSWORD_LENGTH the meter caps at 1/weak so the user sees the
 * length floor before any class-diversity reward.
 */
function rate(password: string): Strength {
  if (!password) return { score: 0, label: "—", color: "rgba(255,255,255,0.12)" };

  let raw = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) raw += 1;
  if (password.length >= 14) raw += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) raw += 1;
  if (/\d/.test(password)) raw += 0.5;
  if (/[^a-zA-Z0-9]/.test(password)) raw += 0.5;

  if (password.length < MIN_PASSWORD_LENGTH) raw = Math.min(raw, 1);

  const score = Math.min(4, Math.round(raw)) as 0 | 1 | 2 | 3 | 4;
  const tier =
    score <= 1
      ? { label: "Weak", color: "#E8547A" }
      : score === 2
        ? { label: "Fair", color: "#E6A817" }
        : score === 3
          ? { label: "Good", color: "#86C2A8" }
          : { label: "Strong", color: "#5CB88A" };

  return { score, label: tier.label, color: tier.color };
}

type Props = {
  password: string;
};

/**
 * Visual strength meter rendered below the password field on the reset
 * form. Four segments fill in as the score rises; segments below the
 * current score get the strength's color, others stay dim. The label on
 * the right echoes the band ("Weak" / "Fair" / "Good" / "Strong").
 */
export function PasswordStrengthMeter({ password }: Props) {
  const { score, label, color } = rate(password);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginTop: "-4px",
      }}
      aria-live="polite"
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: "4px",
        }}
        aria-hidden
      >
        {[1, 2, 3, 4].map((seg) => (
          <span
            key={seg}
            style={{
              flex: 1,
              height: "4px",
              borderRadius: "999px",
              background:
                seg <= score ? color : "rgba(255, 255, 255, 0.06)",
              transition: "background 0.18s ease",
            }}
          />
        ))}
      </div>
      <span
        style={{
          minWidth: "44px",
          textAlign: "right",
          fontFamily: "var(--font-dm-mono)",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: password ? color : "var(--text-muted)",
          textTransform: "uppercase",
        }}
      >
        {password ? label : ""}
      </span>
    </div>
  );
}
