import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

type Props = {
  /** Title shown in display font */
  title: string;
  /** Optional subtitle under the title */
  subtitle?: string;
  /** Optional eyebrow chip above the title (e.g. "18+ ONLY") */
  eyebrow?: ReactNode;
  /** Optional icon shown in a soft circle above the title */
  icon?: ReactNode;
  /** Whether to render the centered Midnight logo block above the title */
  showLogo?: boolean;
  /** Form / content inside the card */
  children: ReactNode;
  /** Footer area below the form (terms note, alt-action link, etc.) */
  footer?: ReactNode;
  /** Card max-width override. Defaults to 420px which fits 3-field forms. */
  maxWidth?: number;
};

/**
 * Shared shell for /login, /become-a-member, /forgot-password,
 * /reset-password and any future auth-style page.
 *
 * Before this component existed each page duplicated ~100 lines of
 * inline-styled chrome (glow orbs, centered card, logo block, padding
 * clamps). The variation between pages was minor and the divergence was
 * accidental.
 *
 * Glow orbs are deliberately suppressed for users with
 * prefers-reduced-motion since the orbs combined with the fade-up entry
 * animation are a real vestibular trigger.
 */
export function AuthCard({
  title,
  subtitle,
  eyebrow,
  icon,
  showLogo = true,
  children,
  footer,
  maxWidth = 420,
}: Props) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(80px, 14vw, 136px) 16px 24px",
        background: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow — single fixed gradient over the viewport.
          Decorative; hidden from screen readers.
          Replaced the previous two-orb pattern (each was 300-400px with
          filter: blur(80px), an extremely expensive paint on low-end
          Android devices common in the Cameroon market). This produces
          the same soft purple+gold haze using native radial-gradients
          composed in a single background-image declaration. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse 60vw 60vh at 70% 30%, rgba(168,85,247,0.10), transparent 70%), " +
            "radial-gradient(ellipse 50vw 50vh at 30% 70%, rgba(230,168,23,0.06), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: `${maxWidth}px`,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "clamp(24px, 5vw, 40px) clamp(20px, 5vw, 36px)",
          position: "relative",
          zIndex: 1,
          animation: "fadeUp 0.5s ease forwards",
        }}
      >
        {showLogo && <AuthCardLogo />}

        {/* Title block — eyebrow, icon, title, subtitle */}
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          {eyebrow && <div style={{ marginBottom: "12px" }}>{eyebrow}</div>}
          {icon && (
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "var(--accent-purple-soft)",
                border: "1px solid rgba(168,85,247,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                margin: "0 auto 16px",
              }}
            >
              {icon}
            </div>
          )}
          <h1
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "28px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              margin: "0 0 6px",
              lineHeight: 1.15,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-dm-sans)",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {children}

        {footer}
      </div>
    </main>
  );
}

function AuthCardLogo() {
  // The previous version of this component was an inline gradient M
  // square + "Midnight" wordmark drawn entirely in CSS. That diverged
  // visually from the navbar's logo and the homepage TopNav's logo,
  // which both render `/Midnight-logo1.png`. One canonical brand mark
  // across the app reads as one product; three subtly different ones
  // read as a half-finished site. The image is the same asset used
  // everywhere else.
  //
  // The logo is also the back-to-home affordance on auth pages (the
  // global Navbar is hidden there). A subtle hover/active treatment
  // signals that it's interactive so visitors don't mistake it for
  // decoration — important on touch where the cursor:pointer hint
  // doesn't exist.
  return (
    <Link
      href="/"
      aria-label="Midnight — back to homepage"
      className="mn-auth-card__logo-link"
    >
      <Image
        src="/Midnight-logo1.png"
        alt="Midnight"
        width={600}
        height={150}
        priority
        unoptimized
        style={{
          height: "64px",
          width: "auto",
          display: "block",
        }}
      />
      <style>{`
        .mn-auth-card__logo-link {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          text-decoration: none;
          line-height: 0;
          /* Slightly dimmed at rest so the lift on hover is visible — a
             dead-flat 1.0 opacity would have nowhere to brighten to. */
          opacity: 0.92;
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .mn-auth-card__logo-link:hover {
          opacity: 1;
          transform: translateY(-1px);
        }
        .mn-auth-card__logo-link:active {
          transform: translateY(0);
        }
        .mn-auth-card__logo-link:focus-visible {
          outline: 2px solid var(--accent-purple);
          outline-offset: 4px;
          border-radius: 6px;
        }
      `}</style>
    </Link>
  );
}

/** Small horizontal divider with optional centered label (e.g. "OR"). */
export function AuthDivider({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      {label && (
        <span
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-dm-mono)",
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
    </div>
  );
}
