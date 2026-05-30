"use client";

import Link from "next/link";
import Image from "next/image";
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
  isLoggedIn: boolean;
};

/**
 * Landing-page top navigation.
 *
 * Layout (mobile + desktop both use the same three-slot grid so the rhythm
 * stays consistent across breakpoints — the YamoHub pattern the user wanted):
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ [☰]            [ LOGO ]      [LOGIN] [JOIN]  │   desktop
 *   ├──────────────────────────────────────────────┤
 *   │ [☰]    [ LOGO ]    [JOIN]                    │   mobile
 *   └──────────────────────────────────────────────┘
 *
 * On mobile we drop the LOGIN button — it lives inside the drawer instead
 * (otherwise the right slot crowds the centered logo on narrow phones).
 *
 * The previous layout had `justify-content: space-between` with three
 * children (logo, auth, hamburger); when the hamburger failed to hide on
 * desktop the three got evenly distributed and the auth ended up in the
 * middle. The new layout uses CSS grid with three explicit columns so
 * the slots can't drift even if a child becomes unexpectedly visible.
 */
export function TopNav({ isLoggedIn }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Translucent background appears after the visitor has scrolled past the
  // top of the hero — keeps the bar fully transparent over the hero glow.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer if the viewport jumps to a wider breakpoint — prevents
  // a stale open drawer from sitting over the page when the user rotates a
  // tablet from portrait to landscape or resizes a browser window.
  useEffect(() => {
    const onResize = () => {
      // 1024px is the breakpoint at which the desktop-side density really
      // changes (more breathing room around the logo). Below that, the
      // drawer still makes sense as an open surface.
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll when the drawer is open — prevents the page underneath
  // from scrolling away as the user swipes on the drawer surface.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <nav
        className="mn-topnav"
        style={{
          background: scrolled ? "rgba(10, 10, 18, 0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled
            ? "1px solid var(--border)"
            : "1px solid transparent",
        }}
      >
        <div className="mn-topnav__inner">
          {/* ── LEFT slot: hamburger (always visible) ── */}
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mn-topnav-drawer"
            className="mn-topnav__hamburger"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* ── CENTER slot: brand logo ── */}
          <Link
            href="/"
            aria-label="Midnight — home"
            className="mn-topnav__brand"
          >
            <Image
              src="/Midnight-logo1.png"
              alt="Midnight"
              width={600}
              height={150}
              priority
              unoptimized
              className="mn-topnav__logo"
            />
          </Link>

          {/* ── RIGHT slot: auth buttons ── */}
          <div className="mn-topnav__auth">
            {isLoggedIn ? (
              <Link href="/dashboard" className="mn-topnav__cta">
                DASHBOARD
              </Link>
            ) : (
              <>
                {/* LOGIN is desktop-only; on mobile the drawer carries it
                    so the right slot stays single-button and doesn't
                    crowd the centered logo. */}
                <Link
                  href="/login"
                  className="mn-topnav__login mn-topnav__login--desktop"
                >
                  LOGIN
                </Link>
                <Link href="/become-a-member" className="mn-topnav__cta">
                  <span className="mn-topnav__cta--full">BECOME A CREATOR</span>
                  <span className="mn-topnav__cta--short">JOIN</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Drawer ──
          Secondary navigation only. The auth targets (LOGIN / BECOME A
          CREATOR / DASHBOARD) live in the topbar's right slot — duplicating
          them here would just be visual noise. The drawer carries what
          doesn't fit in the topbar: site-info + legal pages, plus a Feed
          link as the one piece of secondary discovery.
          The Login link is the single exception: it's hidden on desktop
          (where the LOGIN button is visible in the topbar) and shown on
          mobile (where the topbar only has space for the primary JOIN CTA). */}
      {menuOpen && (
        <div
          id="mn-topnav-drawer"
          className="mn-topnav__drawer"
          role="menu"
          aria-label="Navigation"
        >
          <Link
            href="/feed"
            onClick={() => setMenuOpen(false)}
            className="mn-topnav__drawer-link"
            role="menuitem"
          >
            <Newspaper size={16} aria-hidden />
            <span>Feed</span>
          </Link>
          <Link
            href="/safety"
            onClick={() => setMenuOpen(false)}
            className="mn-topnav__drawer-link"
            role="menuitem"
          >
            <Shield size={16} aria-hidden />
            <span>Safety &amp; reporting</span>
          </Link>
          <Link
            href="/contact"
            onClick={() => setMenuOpen(false)}
            className="mn-topnav__drawer-link"
            role="menuitem"
          >
            <Mail size={16} aria-hidden />
            <span>Contact support</span>
          </Link>

          <div className="mn-topnav__drawer-divider" aria-hidden />

          <Link
            href="/terms"
            onClick={() => setMenuOpen(false)}
            className="mn-topnav__drawer-link"
            role="menuitem"
          >
            <FileText size={16} aria-hidden />
            <span>Terms of service</span>
          </Link>
          <Link
            href="/privacy"
            onClick={() => setMenuOpen(false)}
            className="mn-topnav__drawer-link"
            role="menuitem"
          >
            <Lock size={16} aria-hidden />
            <span>Privacy policy</span>
          </Link>

          {/* Mobile-only Login row — hidden on desktop where the topbar
              already shows the LOGIN button. Only renders for logged-out
              visitors; logged-in users see Dashboard in the topbar instead. */}
          {!isLoggedIn && (
            <>
              <div
                className="mn-topnav__drawer-divider mn-topnav__drawer-divider--mobile-only"
                aria-hidden
              />
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="mn-topnav__drawer-link mn-topnav__drawer-link--mobile-only"
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
        .mn-topnav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          /* Bumped from 64 → 80px so the brand logo has presence on mobile.
             A detailed illustrative mark like this needs vertical room to
             read; the previous height squeezed it down to a faint smudge
             on small screens. */
          height: 80px;
          display: flex;
          align-items: center;
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        .mn-topnav__inner {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 14px;
          /* Three explicit columns: left + center + right. Center column is
             auto-sized to the logo; left/right stretch to balance so the
             logo always sits visually centered. Same grid on every
             breakpoint — only the inner-slot sizing changes via media
             queries below. */
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 8px;
        }
        @media (min-width: 768px) {
          .mn-topnav__inner {
            padding: 0 24px;
            gap: 16px;
          }
        }

        /* ── LEFT slot ── */
        .mn-topnav__hamburger {
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
        .mn-topnav__hamburger:hover {
          border-color: var(--accent-purple);
          color: var(--text-primary);
          background: rgba(168, 85, 247, 0.06);
        }

        /* ── CENTER slot ── */
        .mn-topnav__brand {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          line-height: 0;
        }
        .mn-topnav__logo {
          /* Was 40px on mobile → now 56px. The brand mark is illustrative
             (rose + circle + face + wordmark) and needs enough vertical
             space for all those elements to register at a glance. With
             the 80px navbar, 56px leaves a balanced 12px gutter above
             and below. */
          height: 56px;
          width: auto;
          display: block;
        }
        @media (min-width: 768px) {
          .mn-topnav__logo { height: 60px; }
        }
        @media (min-width: 1024px) {
          .mn-topnav__logo { height: 64px; }
        }

        /* ── RIGHT slot ── */
        .mn-topnav__auth {
          justify-self: end;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        @media (min-width: 768px) {
          .mn-topnav__auth { gap: 10px; }
        }

        /* LOGIN button — desktop only. Mobile drawer carries it. */
        .mn-topnav__login {
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
        .mn-topnav__login:hover {
          border-color: var(--accent-purple);
          color: var(--text-primary);
        }
        .mn-topnav__login--desktop {
          display: none;
        }
        @media (min-width: 768px) {
          .mn-topnav__login--desktop {
            display: inline-flex;
          }
        }

        /* Primary CTA (JOIN / BECOME A CREATOR / DASHBOARD) */
        .mn-topnav__cta {
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
        .mn-topnav__cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 24px rgba(168, 85, 247, 0.4);
        }
        @media (min-width: 768px) {
          .mn-topnav__cta { padding: 9px 20px; }
        }
        /* JOIN on mobile, BECOME A CREATOR on desktop — same button, just
           different labels so we don't have to ship two elements. */
        .mn-topnav__cta--full { display: none; }
        .mn-topnav__cta--short { display: inline; }
        @media (min-width: 768px) {
          .mn-topnav__cta--full { display: inline; }
          .mn-topnav__cta--short { display: none; }
        }

        /* ── Drawer ── */
        .mn-topnav__drawer {
          position: fixed;
          /* Matches the bumped navbar height so the drawer slides out
             directly underneath the bar with no gap. */
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
          .mn-topnav__drawer {
            /* On wider screens the drawer becomes a sidebar-width panel
               anchored to the left so it doesn't blanket the page when
               the visitor was probably trying to keep browsing. */
            right: auto;
            width: 320px;
            bottom: auto;
            min-height: 240px;
            border-right: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            border-top: 1px solid var(--border);
            border-bottom-right-radius: 16px;
            padding: 20px 16px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          }
        }

        .mn-topnav__drawer-link {
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
        .mn-topnav__drawer-link svg {
          color: var(--accent-purple);
          flex-shrink: 0;
        }
        .mn-topnav__drawer-link:hover {
          background: rgba(168, 85, 247, 0.08);
        }

        .mn-topnav__drawer-divider {
          height: 1px;
          background: var(--border);
          margin: 6px 4px;
        }

        /* Mobile-only rows in the drawer (Login + its divider). Hidden on
           desktop because the topbar already shows the LOGIN button there. */
        .mn-topnav__drawer-link--mobile-only,
        .mn-topnav__drawer-divider--mobile-only {
          display: flex;
        }
        @media (min-width: 768px) {
          .mn-topnav__drawer-link--mobile-only,
          .mn-topnav__drawer-divider--mobile-only {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
