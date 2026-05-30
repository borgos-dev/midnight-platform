import Link from "next/link";
import { ChevronLeft, FileWarning } from "lucide-react";
import { LEGAL_EFFECTIVE_DATE } from "@/app/lib/legal";

type Props = {
  title: string;
  /** Short summary line shown under the H1. */
  intro?: string;
  children: React.ReactNode;
};

/**
 * Shared wrapper for all legal documents (/terms, /privacy, /safety).
 * Provides:
 *   - A "[DRAFT]" banner so visitors AND we ourselves never forget that
 *     the text is awaiting legal review before launch
 *   - Consistent typography (Cormorant H1 + Cormorant H2 + DM Sans body)
 *   - Effective-date stamp pulled from a single source
 *   - Back-to-home link at the top
 *
 * The body styles live here in a single <style> block so each individual
 * doc page can author content as plain JSX without re-doing typography.
 */
export function LegalPage({ title, intro, children }: Props) {
  return (
    <div
      style={{
        background: "var(--bg-base)",
        minHeight: "100vh",
        padding: "120px 20px 80px",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        {/* Back link */}
        <Link
          href="/"
          className="legal-back"
          aria-label="Back to home"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
          BACK
        </Link>

        {/* DRAFT banner — kept loud so we never forget to swap text */}
        <div className="legal-draft" role="status">
          <FileWarning size={16} strokeWidth={2.2} />
          <div>
            <strong>Draft document.</strong> This text is a working draft and
            has not yet been reviewed by counsel. Final clauses pending legal
            review before launch.
          </div>
        </div>

        {/* Heading */}
        <h1 className="legal-title">{title}</h1>
        {intro && <p className="legal-intro">{intro}</p>}
        <p className="legal-meta">Last updated: {LEGAL_EFFECTIVE_DATE}</p>

        {/* Body — children render as nested h2 / p / ul etc. */}
        <div className="legal-body">{children}</div>
      </div>

      <style>{`
        .legal-back {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-secondary);
          text-decoration: none;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.10em;
          margin-bottom: 24px;
        }
        .legal-back:hover {
          border-color: var(--accent-purple);
          color: var(--text-primary);
        }

        .legal-draft {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(230, 168, 23, 0.10);
          border: 1px solid rgba(230, 168, 23, 0.35);
          color: var(--text-secondary);
          font-family: var(--font-dm-sans);
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 32px;
        }
        .legal-draft strong {
          color: #E6A817;
          font-weight: 700;
        }
        .legal-draft svg {
          color: #E6A817;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .legal-title {
          font-family: var(--font-cormorant);
          font-size: clamp(32px, 5.5vw, 44px);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin: 0 0 12px;
        }
        .legal-intro {
          font-family: var(--font-dm-sans);
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-secondary);
          margin: 0 0 8px;
        }
        .legal-meta {
          font-family: var(--font-dm-mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin: 0 0 36px;
        }

        /* Body typography — applied via descendant selectors so doc pages
           write semantic JSX (h2, p, ul) without per-element class noise. */
        .legal-body h2 {
          font-family: var(--font-cormorant);
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 32px 0 12px;
          letter-spacing: -0.01em;
        }
        .legal-body h3 {
          font-family: var(--font-dm-sans);
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 22px 0 8px;
          text-transform: none;
        }
        .legal-body p {
          font-family: var(--font-dm-sans);
          font-size: 14.5px;
          line-height: 1.7;
          color: var(--text-secondary);
          margin: 0 0 14px;
        }
        .legal-body ul,
        .legal-body ol {
          margin: 0 0 14px;
          padding-left: 22px;
        }
        .legal-body li {
          font-family: var(--font-dm-sans);
          font-size: 14.5px;
          line-height: 1.7;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .legal-body a {
          color: var(--accent-purple);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .legal-body a:hover {
          color: #c184ff;
        }
        .legal-body strong {
          color: var(--text-primary);
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
