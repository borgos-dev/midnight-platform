import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ShieldAlert, KeyRound, Flag, LifeBuoy } from "lucide-react";
import {
  COMPANY_NAME,
  SUPPORT_EMAIL,
  PRIVACY_EMAIL,
} from "@/app/lib/legal";

export const metadata: Metadata = {
  title: `Contact support — ${COMPANY_NAME}`,
  description: `Get in touch with the ${COMPANY_NAME} team. Right routes for support, safety, and privacy questions.`,
  robots: { index: true, follow: true },
};

/**
 * Contact + help directory.
 *
 * We don't ship a contact form here on purpose:
 *   - We already have purpose-built flows for the most common reasons
 *     someone contacts us (Report button on creator profiles, password
 *     reset, signup verification). A generic form would just become a
 *     low-signal trickle of "I forgot my password" emails.
 *   - For everything else, a direct mailto routes the message to the
 *     right inbox with minimum friction — and the visitor's mail client
 *     gives them a copy of what they sent.
 *
 * If demand for a contact form grows later we can add it without
 * removing this page — it's just a list of "where to go" routes.
 */
export default function ContactPage() {
  const routes: {
    title: string;
    blurb: string;
    icon: React.ReactNode;
    accent: string;
    cta: { label: string; href: string };
  }[] = [
    {
      title: "Report a creator or content",
      blurb:
        "Suspected trafficking, impersonation, stolen content, harassment, or anything that violates our rules.",
      icon: <ShieldAlert size={18} strokeWidth={2.2} />,
      accent: "#E8547A",
      cta: { label: "How to report", href: "/safety" },
    },
    {
      title: "Account & access",
      blurb:
        "Can't log in, password reset, email verification not arriving, profile or upload issues.",
      icon: <KeyRound size={18} strokeWidth={2.2} />,
      accent: "#a855f7",
      cta: { label: `Email ${SUPPORT_EMAIL}`, href: `mailto:${SUPPORT_EMAIL}` },
    },
    {
      title: "Subscriptions, boosts & payments",
      blurb:
        "Payment didn't credit your account, refund request, tier downgrade, or MoMo / Orange Money receipt questions.",
      icon: <LifeBuoy size={18} strokeWidth={2.2} />,
      accent: "#E6A817",
      cta: { label: `Email ${SUPPORT_EMAIL}`, href: `mailto:${SUPPORT_EMAIL}` },
    },
    {
      title: "Privacy & data requests",
      blurb:
        "Data access, export, or deletion requests. Anything covered by your rights under our Privacy Policy.",
      icon: <Mail size={18} strokeWidth={2.2} />,
      accent: "#3b9eff",
      cta: { label: `Email ${PRIVACY_EMAIL}`, href: `mailto:${PRIVACY_EMAIL}` },
    },
  ];

  return (
    <main
      style={{
        background: "var(--bg-base)",
        minHeight: "100vh",
        padding: "120px 20px 80px",
      }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        {/* Header */}
        <header style={{ marginBottom: "32px" }}>
          <div
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              color: "var(--accent-purple)",
              marginBottom: "8px",
            }}
          >
            CONTACT
          </div>
          <h1
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "clamp(32px, 5.5vw, 44px)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Get in touch.
          </h1>
          <p
            style={{
              marginTop: "10px",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "14.5px",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              maxWidth: "560px",
            }}
          >
            Pick the path that matches what you need. We respond to all
            requests within 48 hours, faster for safety-related issues.
          </p>
        </header>

        {/* Routes */}
        <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {routes.map((r) => (
            <a
              key={r.title}
              href={r.cta.href}
              style={{
                display: "flex",
                gap: "16px",
                padding: "18px",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.18s ease, transform 0.15s ease",
              }}
              className="contact-route"
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: `${r.accent}22`,
                  color: r.accent,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                {r.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontSize: "19px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                    lineHeight: 1.15,
                  }}
                >
                  {r.title}
                </div>
                <p
                  style={{
                    margin: "4px 0 8px",
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: "13.5px",
                    lineHeight: 1.5,
                    color: "var(--text-secondary)",
                  }}
                >
                  {r.blurb}
                </p>
                <span
                  style={{
                    fontFamily: "var(--font-dm-mono)",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    letterSpacing: "0.10em",
                    color: r.accent,
                  }}
                >
                  {r.cta.label} →
                </span>
              </div>
            </a>
          ))}
        </section>

        {/* Per-profile reporting reminder */}
        <section
          style={{
            marginTop: "32px",
            padding: "16px 18px",
            borderRadius: "12px",
            background: "rgba(232, 84, 122, 0.06)",
            border: "1px solid rgba(232, 84, 122, 0.25)",
            display: "flex",
            gap: "12px",
          }}
        >
          <Flag
            size={18}
            strokeWidth={2.2}
            style={{ color: "#E8547A", flexShrink: 0, marginTop: "2px" }}
          />
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-dm-sans)",
                fontSize: "13.5px",
                lineHeight: 1.55,
                color: "var(--text-primary)",
              }}
            >
              <strong>Faster reporting:</strong> every creator profile has a
              Report button next to the share controls. Use it instead of
              email so we can act on the specific profile in one click.
            </p>
            <Link
              href="/safety"
              style={{
                display: "inline-block",
                marginTop: "6px",
                fontFamily: "var(--font-dm-mono)",
                fontSize: "10.5px",
                fontWeight: 800,
                letterSpacing: "0.10em",
                color: "#E8547A",
                textDecoration: "none",
              }}
            >
              SEE THE FULL SAFETY POLICY →
            </Link>
          </div>
        </section>

        {/* Direct email fallback */}
        <p
          style={{
            marginTop: "32px",
            fontFamily: "var(--font-dm-sans)",
            fontSize: "12.5px",
            color: "var(--text-muted)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          For anything else not covered above, you can email us directly at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{
              color: "var(--accent-purple)",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
          >
            {SUPPORT_EMAIL}
          </a>
          . We reply within 48 hours.
        </p>
      </div>

      <style>{`
        .contact-route:hover {
          border-color: var(--accent-purple) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </main>
  );
}
