import Image from "next/image";
import Link from "next/link";
import { Flag } from "lucide-react";
import {
  COMPANY_NAME,
  LEGAL_EFFECTIVE_DATE,
} from "@/app/lib/legal";

/**
 * Global footer rendered at the bottom of every route via the root layout.
 *
 * Kept minimal on purpose:
 *   - Brand mark + tagline
 *   - Three short columns: Platform / Legal / Support
 *   - Bottom rail: copyright + 18+ disclaimer
 *
 * No social-media icons yet — we'll add them when there are real accounts
 * to link to. Empty social rows on a footer signal a half-built product.
 */
export function Footer() {
  const year = new Date().getUTCFullYear();
  return (
    <footer className="mn-footer" aria-label="Site footer">
      <div className="mn-footer__inner">
        {/* Brand column */}
        <div className="mn-footer__brand">
          <Link href="/" aria-label={`${COMPANY_NAME} home`}>
            <Image
              src="/Midnight-logo1.png"
              alt={COMPANY_NAME}
              width={104}
              height={28}
              style={{ height: "auto" }}
            />
          </Link>
          <p className="mn-footer__tagline">
            Private connections.<br />
            Premium experiences.<br />
            Complete discretion.
          </p>
        </div>

        {/* Link columns */}
        <nav className="mn-footer__cols" aria-label="Footer navigation">
          <div className="mn-footer__col">
            <h2 className="mn-footer__heading">Platform</h2>
            <ul>
              <li><Link href="/#creators">Browse creators</Link></li>
              <li><Link href="/become-a-member">Become a creator</Link></li>
              <li><Link href="/login">Sign in</Link></li>
            </ul>
          </div>

          <div className="mn-footer__col">
            <h2 className="mn-footer__heading">Legal</h2>
            <ul>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/safety">Safety &amp; Reporting</Link></li>
            </ul>
          </div>

          <div className="mn-footer__col">
            <h2 className="mn-footer__heading">Support</h2>
            <ul>
              {/* Footer "Report a profile" links to the Safety page rather
                  than opening a mailto — the page explains how the in-app
                  Report button (on every creator profile) works, which is
                  the real moderation path now. Keeps the visitor inside
                  the platform and stops the email-client roulette. */}
              <li>
                <Link href="/safety" className="mn-footer__report">
                  <Flag size={11} strokeWidth={2.4} />
                  Report a profile
                </Link>
              </li>
              <li><Link href="/contact">Contact support</Link></li>
            </ul>
          </div>
        </nav>
      </div>

      {/* Bottom rail */}
      <div className="mn-footer__rail">
        <div className="mn-footer__rail-inner">
          <div className="mn-footer__copy">
            © {year} {COMPANY_NAME}. All rights reserved. ·{" "}
            <span className="mn-footer__updated">
              Legal updated {LEGAL_EFFECTIVE_DATE}
            </span>
          </div>
          <div className="mn-footer__chip" aria-label="Age restriction">
            <span>18+</span> Adults only
          </div>
        </div>
      </div>

      <style>{`
        .mn-footer {
          margin-top: 64px;
          background:
            linear-gradient(180deg, rgba(168, 85, 247, 0.04) 0%, transparent 28%),
            #0A0A14;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
        }
        .mn-footer__inner {
          display: grid;
          grid-template-columns: 1fr;
          gap: 36px;
          max-width: 1100px;
          margin: 0 auto;
          padding: 48px 20px 36px;
        }
        @media (min-width: 768px) {
          .mn-footer__inner {
            grid-template-columns: 1.1fr 2fr;
            gap: 48px;
          }
        }

        .mn-footer__tagline {
          margin: 16px 0 0;
          font-family: var(--font-dm-sans);
          font-size: 12.5px;
          line-height: 1.55;
          color: var(--text-muted);
        }

        .mn-footer__cols {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 480px) {
          .mn-footer__cols {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .mn-footer__heading {
          margin: 0 0 12px;
          font-family: var(--font-dm-mono);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .mn-footer__col ul {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .mn-footer__col a {
          font-family: var(--font-dm-sans);
          font-size: 13px;
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .mn-footer__col a:hover {
          color: var(--accent-purple);
        }

        .mn-footer__report {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .mn-footer__report svg {
          color: #E8547A;
        }

        .mn-footer__rail {
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          background: rgba(0, 0, 0, 0.25);
        }
        .mn-footer__rail-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 16px 20px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .mn-footer__copy {
          font-family: var(--font-dm-mono);
          font-size: 10.5px;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }
        .mn-footer__updated {
          opacity: 0.7;
        }
        .mn-footer__chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(232, 84, 122, 0.10);
          border: 1px solid rgba(232, 84, 122, 0.32);
          color: #E8547A;
          font-family: var(--font-dm-mono);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.10em;
        }
        .mn-footer__chip span {
          padding: 1px 5px;
          border-radius: 4px;
          background: #E8547A;
          color: #fff;
        }
      `}</style>
    </footer>
  );
}
