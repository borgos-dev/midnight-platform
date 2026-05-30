"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Newspaper,
  Shield,
  FileText,
  Lock,
  Mail,
  LogIn,
} from "lucide-react";

type Props = {
  /** Comes from the root layout (server-side session check). Drives the
   *  right-slot button: LOGIN+JOIN for logged-out visitors, DASHBOARD for
   *  signed-in creators. */
  isLoggedIn: boolean;
};

/**
 * Routes where the global Navbar should not render. Two categories:
 *
 *   1. AuthCard-based pages (login, password reset, email verify,
 *      become-a-creator signup) — each carries its own centered Midnight
 *      logo + back-home link, so a separate navbar above them just
 *      duplicates the brand mark and offers nav targets that don't make
 *      sense in those flows (e.g. a "BECOME A CREATOR" CTA on
 *      `/become-a-member` itself).
 *
 *   2. Work surfaces with their own internal chrome (dashboard, admin) —
 *      each has a sidebar that already carries the Midnight logo + tier-
 *      aware navigation. Stacking the global navbar on top duplicates the
 *      brand mark, eats vertical space, and adds CTAs that compete with
 *      the page's own primary actions.
 *
 * Match is exact-path-or-prefixed-path, so subroutes like
 * `/reset-password/<token>`, `/dashboard/profile`, and `/admin/boosts`
 * are all covered by their parent entry.
 */
const NO_NAVBAR_PATHS = [
  // Auth flows
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/become-a-member",
  // Work surfaces with their own chrome
  "/dashboard",
  "/admin",
];

/**
 * Global navbar rendered on every route except the landing page (`/`),
 * which uses its own TopNav. Layout mirrors TopNav so visitors get the
 * same chrome treatment when they move between the landing page and the
 * rest of the app (login, dashboard, creator profiles, feed, etc.).
 *
 *   [☰]               [ LOGO ]              [LOGIN] [BECOME A CREATOR]
 *
 * Hamburger drawer carries secondary nav (Feed, Safety, Terms, Privacy,
 * Contact) — never the primary auth CTAs that are already visible.
 * Mobile gets an extra Login row in the drawer because the topbar only
 * shows JOIN at narrow widths.
 */
export default function Navbar({ isLoggedIn }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Conditional render — MUST be after all hooks so React sees the same
  // hook order on every render.
  //
  // Hidden on:
  //   - `/`              → LandingHome renders its own TopNav.
  //   - Auth-flow pages  → AuthCard already shows a centered Midnight
  //                        logo + back-home link, so the navbar above
  //                        would just be a second copy of the brand mark
  //                        with no useful nav targets in that context.
  if (pathname === "/") return null;
  if (
    NO_NAVBAR_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    return null;
  }

  return (
    <>
      <nav
        className="mn-navbar"
        style={{
          background: scrolled ? "rgba(10, 10, 18, 0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled
            ? "1px solid var(--border)"
            : "1px solid transparent",
        }}
      >
        <div className="mn-navbar__inner">
          {/* ── LEFT slot: hamburger ── */}
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mn-navbar-drawer"
            className="mn-navbar__hamburger"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* ── CENTER slot: brand logo ── */}
          <Link
            href="/"
            aria-label="Midnight — home"
            className="mn-navbar__brand"
          >
            <Image
              src="/Midnight-logo1.png"
              alt="Midnight"
              width={600}
              height={150}
              priority
              unoptimized
              className="mn-navbar__logo"
            />
          </Link>

          {/* ── RIGHT slot: auth buttons ── */}
          <div className="mn-navbar__auth">
            {isLoggedIn ? (
              <Link href="/dashboard" className="mn-navbar__cta">
                DASHBOARD
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="mn-navbar__login mn-navbar__login--desktop"
                >
                  LOGIN
                </Link>
                <Link href="/become-a-member" className="mn-navbar__cta">
                  <span className="mn-navbar__cta--full">BECOME A CREATOR</span>
                  <span className="mn-navbar__cta--short">JOIN</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Drawer ──
          Secondary navigation only — the primary auth CTAs are already
          visible in the topbar. Login appears here on mobile only (the
          mobile topbar shows JOIN but not LOGIN). */}
      {menuOpen && (
        <div
          id="mn-navbar-drawer"
          className="mn-navbar__drawer"
          role="menu"
          aria-label="Navigation"
        >
          <Link
            href="/feed"
            onClick={() => setMenuOpen(false)}
            className="mn-navbar__drawer-link"
            role="menuitem"
          >
            <Newspaper size={16} aria-hidden />
            <span>Feed</span>
          </Link>
          <Link
            href="/safety"
            onClick={() => setMenuOpen(false)}
            className="mn-navbar__drawer-link"
            role="menuitem"
          >
            <Shield size={16} aria-hidden />
            <span>Safety &amp; reporting</span>
          </Link>
          <Link
            href="/contact"
            onClick={() => setMenuOpen(false)}
            className="mn-navbar__drawer-link"
            role="menuitem"
          >
            <Mail size={16} aria-hidden />
            <span>Contact support</span>
          </Link>

          <div className="mn-navbar__drawer-divider" aria-hidden />

          <Link
            href="/terms"
            onClick={() => setMenuOpen(false)}
            className="mn-navbar__drawer-link"
            role="menuitem"
          >
            <FileText size={16} aria-hidden />
            <span>Terms of service</span>
          </Link>
          <Link
            href="/privacy"
            onClick={() => setMenuOpen(false)}
            className="mn-navbar__drawer-link"
            role="menuitem"
          >
            <Lock size={16} aria-hidden />
            <span>Privacy policy</span>
          </Link>

          {/* Mobile-only Login row — hidden on desktop where the topbar
              already has the LOGIN button. */}
          {!isLoggedIn && (
            <>
              <div
                className="mn-navbar__drawer-divider mn-navbar__drawer-divider--mobile-only"
                aria-hidden
              />
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="mn-navbar__drawer-link mn-navbar__drawer-link--mobile-only"
                role="menuitem"
              >
                <LogIn size={16} aria-hidden />
                <span>Login</span>
              </Link>
            </>
          )}
        </div>
      )}

      <style>{`
        .mn-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          /* Matches the landing TopNav (80px). Gives the brand mark
             enough vertical room to actually read on mobile. */
          height: 80px;
          display: flex;
          align-items: center;
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        .mn-navbar__inner {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 14px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 8px;
        }
        @media (min-width: 768px) {
          .mn-navbar__inner {
            padding: 0 24px;
            gap: 16px;
          }
        }

        .mn-navbar__hamburger {
          justify-self: start;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid var(--border-strong);
          background: rgba(10, 10, 18, 0.5);
          color: var(--text-secondary);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
        }
        .mn-navbar__hamburger:hover {
          border-color: var(--accent-purple);
          color: var(--text-primary);
          background: rgba(168, 85, 247, 0.06);
        }

        .mn-navbar__brand {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          line-height: 0;
        }
        .mn-navbar__logo {
          height: 56px;
          width: auto;
          display: block;
        }
        @media (min-width: 768px) {
          .mn-navbar__logo { height: 60px; }
        }
        @media (min-width: 1024px) {
          .mn-navbar__logo { height: 64px; }
        }

        .mn-navbar__auth {
          justify-self: end;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        @media (min-width: 768px) {
          .mn-navbar__auth { gap: 10px; }
        }

        .mn-navbar__login {
          padding: 9px 18px;
          border-radius: 10px;
          border: 1px solid var(--border-strong);
          color: var(--text-secondary);
          text-decoration: none;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          transition: border-color 0.2s ease, color 0.2s ease;
          white-space: nowrap;
        }
        .mn-navbar__login:hover {
          border-color: var(--accent-purple);
          color: var(--text-primary);
        }
        .mn-navbar__login--desktop {
          display: none;
        }
        @media (min-width: 768px) {
          .mn-navbar__login--desktop {
            display: inline-flex;
          }
        }

        .mn-navbar__cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 9px 16px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--accent-purple), #7c3aed);
          color: #fff;
          text-decoration: none;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          box-shadow: 0 0 18px rgba(168, 85, 247, 0.3);
          white-space: nowrap;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .mn-navbar__cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 24px rgba(168, 85, 247, 0.4);
        }
        @media (min-width: 768px) {
          .mn-navbar__cta { padding: 9px 20px; }
        }
        .mn-navbar__cta--full { display: none; }
        .mn-navbar__cta--short { display: inline; }
        @media (min-width: 768px) {
          .mn-navbar__cta--full { display: inline; }
          .mn-navbar__cta--short { display: none; }
        }

        .mn-navbar__drawer {
          position: fixed;
          top: 80px;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 99;
          background: var(--bg-primary);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          border-top: 1px solid var(--border);
          animation: mn-drawer-fade 180ms ease;
        }
        @keyframes mn-drawer-fade {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 768px) {
          .mn-navbar__drawer {
            right: auto;
            width: 320px;
            bottom: auto;
            min-height: 240px;
            border-right: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            border-bottom-right-radius: 16px;
            padding: 20px 16px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          }
        }

        .mn-navbar__drawer-link {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          color: var(--text-primary);
          text-decoration: none;
          font-family: var(--font-dm-sans);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.005em;
          transition: background 0.18s ease, color 0.18s ease;
        }
        .mn-navbar__drawer-link svg {
          color: var(--accent-purple);
          flex-shrink: 0;
        }
        .mn-navbar__drawer-link:hover {
          background: rgba(168, 85, 247, 0.08);
        }

        .mn-navbar__drawer-divider {
          height: 1px;
          background: var(--border);
          margin: 6px 4px;
        }

        .mn-navbar__drawer-link--mobile-only,
        .mn-navbar__drawer-divider--mobile-only {
          display: flex;
        }
        @media (min-width: 768px) {
          .mn-navbar__drawer-link--mobile-only,
          .mn-navbar__drawer-divider--mobile-only {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
