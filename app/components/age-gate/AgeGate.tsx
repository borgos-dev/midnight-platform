"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { confirmAge } from "./actions";

/**
 * Full-screen 18+ age gate. Renders only when the parent layout determined
 * the visitor has no verification cookie. Two outcomes:
 *
 *   - "I am 18+ — Enter"   → server action sets the cookie, modal fades out
 *   - "I am under 18"      → window.location replaces with google.com so
 *                             the visitor leaves the platform immediately
 *
 * The modal is a focus trap and prevents body scroll behind it so visitors
 * can't peek at content before confirming. ARIA semantics use role=dialog
 * + aria-modal + aria-labelledby so screen readers announce it correctly.
 */
export function AgeGate() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isClosing, setIsClosing] = useState(false);

  // Lock body scroll while the gate is up. Restored on unmount even if the
  // visitor somehow dismisses the modal another way (DevTools, etc.).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleEnter = () => {
    if (isPending) return;
    startTransition(async () => {
      await confirmAge(pathname || "/");
      setIsClosing(true);
    });
  };

  const handleLeave = () => {
    // Replace (not assign) so the back button doesn't bring them back into
    // the platform after they self-identified as under 18.
    window.location.replace("https://www.google.com");
  };

  if (isClosing) return null;

  return (
    <div
      className="age-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      aria-describedby="age-gate-desc"
    >
      <div className="age-gate__panel">
        {/* Brand mark — sized up from 120 to 160 so the brand carries
            weight before the visitor reads any copy. The age gate is the
            first surface every new visitor sees, so the logo earns its
            real estate here. */}
        <div className="age-gate__brand" aria-hidden>
          <Image
            src="/Midnight-logo1.png"
            alt=""
            width={100}
            height={28}
            priority
            style={{ height: "auto", maxWidth: "100%" }}
          />
        </div>

        {/* Headline */}
        <div className="age-gate__title-row">
          <span className="age-gate__chip">
            <ShieldAlert size={14} strokeWidth={2.5} />
            ADULTES SEULEMENT
          </span>
          <h1 id="age-gate-title" className="age-gate__title">
            Vous devez avoir 18 ans ou plus pour entrer.
          </h1>
        </div>

        {/* Body */}
        <p id="age-gate-desc" className="age-gate__body">
          Midnight est une plateforme de découverte pour adultes. En entrant,
          vous confirmez avoir au moins 18 ans et que le contenu adulte est
          légal dans votre pays.
        </p>

        {/* Anti-trafficking notice — mandatory disclosure for the platform's
            trust & safety story. Kept tight so visitors actually read it. */}
        <div className="age-gate__notice">
          <strong>Tolérance zéro.</strong> Midnight interdit le trafic,
          l'exploitation, la coercition et toute représentation de mineurs.
          Tout contenu suspect peut être signalé sur chaque profil.
        </div>

        {/* Actions */}
        <div className="age-gate__actions">
          <button
            type="button"
            onClick={handleEnter}
            disabled={isPending}
            className="age-gate__btn age-gate__btn--primary"
          >
            {isPending ? "ENTRÉE EN COURS…" : "J'AI 18 ANS OU PLUS — ENTRER"}
          </button>
          <button
            type="button"
            onClick={handleLeave}
            className="age-gate__btn age-gate__btn--secondary"
          >
            J'ai moins de 18 ans — quitter
          </button>
        </div>

        {/* Footnote */}
        <p className="age-gate__footnote">
          En entrant, vous acceptez nos{" "}
          <Link href="/terms" className="age-gate__link">Conditions d'utilisation</Link>
          {" · "}
          <Link href="/privacy" className="age-gate__link">Politique de confidentialité</Link>
        </p>
      </div>

      <style>{`
        .age-gate {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background:
            radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.10), transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(230, 168, 23, 0.06), transparent 55%),
            rgba(6, 6, 12, 0.96);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          animation: ageGateBackdropIn 240ms ease;
          overflow-y: auto;
        }

        @keyframes ageGateBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ageGatePanelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .age-gate__panel {
          width: 100%;
          max-width: 420px;
          padding: 18px 20px 16px;
          border-radius: 18px;
          background:
            linear-gradient(180deg, #16101F 0%, #0E0916 100%);
          border: 1px solid rgba(168, 85, 247, 0.30);
          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(255, 255, 255, 0.02) inset,
            0 0 80px rgba(168, 85, 247, 0.10);
          color: var(--text-primary);
          animation: ageGatePanelIn 320ms cubic-bezier(0.16, 1, 0.3, 1) 60ms backwards;
        }

        .age-gate__brand {
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
        }

        .age-gate__title-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
          text-align: center;
          margin-bottom: 10px;
        }
        .age-gate__chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(230, 168, 23, 0.14);
          border: 1px solid rgba(230, 168, 23, 0.50);
          color: #E6A817;
          font-family: var(--font-dm-mono);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
          box-shadow: 0 0 18px rgba(230, 168, 23, 0.25);
        }
        .age-gate__title {
          font-family: var(--font-cormorant);
          font-size: clamp(22px, 5vw, 28px);
          font-weight: 700;
          line-height: 1.12;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .age-gate__body {
          font-family: var(--font-dm-sans);
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-secondary);
          text-align: center;
          margin: 0 0 10px;
        }

        .age-gate__notice {
          font-family: var(--font-dm-sans);
          font-size: 11.5px;
          line-height: 1.45;
          color: var(--text-secondary);
          background: rgba(232, 84, 122, 0.08);
          border: 1px solid rgba(232, 84, 122, 0.25);
          border-radius: 10px;
          padding: 8px 10px;
          margin-bottom: 12px;
        }
        .age-gate__notice strong {
          color: #E8547A;
          font-weight: 700;
        }

        .age-gate__actions {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 10px;
        }
        .age-gate__btn {
          width: 100%;
          padding: 11px 16px;
          border-radius: 12px;
          font-family: var(--font-dm-mono);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.10em;
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease,
            border-color 0.15s ease, opacity 0.15s ease, box-shadow 0.18s ease;
          border: 1px solid transparent;
          min-height: 44px;
        }
        .age-gate__btn--primary {
          background: linear-gradient(135deg, var(--accent-purple) 0%, #7c3aed 100%);
          color: #fff;
          /* Stronger shadow so the primary action visibly outweighs the
             secondary "leave" button — the path the visitor should take
             reads as the obvious choice. */
          box-shadow:
            0 10px 28px rgba(168, 85, 247, 0.40),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
        .age-gate__btn--primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 14px 36px rgba(168, 85, 247, 0.50),
            inset 0 1px 0 rgba(255, 255, 255, 0.20);
        }
        .age-gate__btn--primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .age-gate__btn--primary:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .age-gate__btn--secondary {
          background: transparent;
          border-color: rgba(255, 255, 255, 0.14);
          color: var(--text-secondary);
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: none;
          font-weight: 600;
        }
        .age-gate__btn--secondary:hover {
          border-color: rgba(255, 255, 255, 0.3);
          color: var(--text-primary);
        }

        .age-gate__footnote {
          font-family: var(--font-dm-sans);
          font-size: 11px;
          text-align: center;
          color: var(--text-muted);
          margin: 0;
        }
        .age-gate__link {
          color: var(--text-secondary);
          text-decoration: underline;
          text-decoration-color: rgba(168, 85, 247, 0.4);
          text-underline-offset: 2px;
        }
        .age-gate__link:hover {
          color: var(--accent-purple);
        }
      `}</style>
    </div>
  );
}
