import Link from "next/link";

/**
 * Landing-page hero.
 *
 * Copy (variant A — visitor-first, premium/sensual):
 *   Headline:  "The night is yours."
 *   Sub:       "Private connections. Premium experiences. Complete discretion."
 *   Primary:   BROWSE CREATORS  → scrolls to #creators (built in next chunk)
 *   Secondary: BECOME A CREATOR → /become-a-member
 *
 * Visual: dark base + two soft radial gradients (purple top-right, gold
 * bottom-left). No images — fast to load on Cameroon mobile data and the
 * brand reads premium without depending on photography we don't have yet.
 *
 * Layout: full-width section, content capped at 760px and centered.
 * Padding-top reserves space for the fixed TopNav (64px) so the headline
 * isn't hidden underneath it.
 */
export function Hero() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        // 64 (top nav) clearance + generous breathing room for the headline.
        paddingTop: "clamp(120px, 16vw, 180px)",
        paddingBottom: "clamp(80px, 12vw, 140px)",
        paddingLeft: "20px",
        paddingRight: "20px",
        background: "var(--bg-primary)",
      }}
    >
      {/* Radial glow backdrop — decorative, hidden from screen readers.
          One composite background-image keeps it a single GPU paint instead
          of two stacked filter:blur layers. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse 70vw 60vh at 80% 10%, rgba(168,85,247,0.18), transparent 60%), " +
            "radial-gradient(ellipse 60vw 50vh at 20% 90%, rgba(230,168,23,0.10), transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Subtle starfield: a single SVG noise overlay for texture.
          Adds depth without weighing the page down. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.4,
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(255,255,255,0.06) 0.5px, transparent 1.5px), " +
            "radial-gradient(circle at 78% 32%, rgba(255,255,255,0.05) 0.5px, transparent 1.5px), " +
            "radial-gradient(circle at 45% 78%, rgba(255,255,255,0.04) 0.5px, transparent 1.5px), " +
            "radial-gradient(circle at 88% 62%, rgba(255,255,255,0.05) 0.5px, transparent 1.5px)",
          backgroundSize: "300px 300px",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "760px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 14px",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.03)",
            fontSize: "10px",
            fontFamily: "var(--font-dm-mono)",
            color: "var(--text-muted)",
            letterSpacing: "0.14em",
            marginBottom: "32px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#E6A817",
              boxShadow: "0 0 6px rgba(230,168,23,0.6)",
            }}
            aria-hidden
          />
          18+ · CAMEROON · LIVE
        </div>

        {/* Headline — slightly larger, more breathing room below */}
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "clamp(44px, 9vw, 84px)",
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
            color: "var(--text-primary)",
            margin: "0 0 28px",
          }}
        >
          The night is yours.
        </h1>

        {/* Sub-headline — short, premium, looser line-height for breath */}
        <p
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "clamp(15px, 2.4vw, 18px)",
            lineHeight: 1.8,
            color: "var(--text-secondary)",
            maxWidth: "560px",
            margin: "0 auto 44px",
            fontWeight: 400,
          }}
        >
          Private connections. Premium experiences. Complete discretion.
        </p>

        {/* CTAs — flex-row on desktop, stacked tight on mobile via media query */}
        <div className="hero-cta-row">
          <a
            href="#creators"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 28px",
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, var(--accent-purple), #7c3aed)",
              color: "#fff",
              textDecoration: "none",
              fontFamily: "var(--font-dm-mono)",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.10em",
              boxShadow:
                "0 8px 32px rgba(168,85,247,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
              minWidth: "200px",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            BROWSE CREATORS
          </a>

          <Link
            href="/become-a-member"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 28px",
              borderRadius: "12px",
              border: "1px solid var(--border-strong)",
              background: "rgba(255,255,255,0.02)",
              color: "var(--text-primary)",
              textDecoration: "none",
              fontFamily: "var(--font-dm-mono)",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.10em",
              minWidth: "200px",
              transition: "border-color 0.2s ease, background 0.2s ease",
            }}
          >
            BECOME A CREATOR
          </Link>
        </div>

      </div>

      {/* Local styles for the CTA row: tight on mobile, loose on desktop.
          Inline `style` can't do media queries, so we use a scoped <style>. */}
      <style>{`
        .hero-cta-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: center;
          justify-content: center;
        }
        .hero-cta-row > a {
          width: 100%;
          max-width: 280px;
        }
        @media (min-width: 540px) {
          .hero-cta-row {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 14px;
          }
          .hero-cta-row > a {
            width: auto;
            max-width: none;
          }
        }
      `}</style>
    </section>
  );
}
