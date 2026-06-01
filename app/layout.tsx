import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, DM_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Navbar from "./components/Navbar";
import { Footer } from "./components/Footer";
import { GlobalProviders } from "./components/GlobalProviders";
import { AgeGate } from "./components/age-gate/AgeGate";
import { isAgeVerified } from "./lib/age-gate";
import { getCurrentUserId } from "./lib/auth-helpers";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Midnight — The Night is Yours.",
    template: "%s — Midnight",
  },
  description:
    "Midnight est la plateforme exclusive de découverte de créatrices au Cameroun. Trouvez des profils vérifiés à Douala, Yaoundé, Bafoussam et plus encore. Contactez via WhatsApp. 18+ seulement.",
  keywords: [
    "Midnight Cameroon",
    "créatrices Cameroun",
    "adult creators Cameroon",
    "Douala creators",
    "Yaoundé creators",
    "escort Douala",
    "escort Yaoundé",
    "compagne Douala",
    "compagne Yaoundé",
    "nuit Douala",
    "nuit Cameroun",
    "filles Douala",
    "filles Yaoundé",
    "rencontres Cameroun",
    "midnight24",
    "midnight24.cam",
    "VIP creators Cameroon",
    "premium creators Douala",
    "WhatsApp creators Cameroon",
    "adult entertainment Cameroon",
    // Anglophone Cameroon (Southwest / Northwest regions)
    "girls Buea",
    "girls Limbe",
    "girls Bamenda",
    "escort Buea",
    "escort Limbe",
    "hookup Cameroon",
    "nightlife Cameroon",
    "meet girls Cameroon",
    "Cameroon adult platform",
  ],
  authors: [{ name: "Midnight", url: "https://midnight24.cam" }],
  creator: "Midnight",
  publisher: "Midnight",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/Midnight-logo1.png",
    apple: "/Midnight-logo1.png",
  },
  openGraph: {
    type: "website",
    siteName: "Midnight",
    title: "Midnight — The Night is Yours.",
    description:
      "Cameroon's exclusive creator discovery platform. Browse verified creators in Douala, Yaoundé and beyond.",
    images: [
      {
        url: "/Midnight-logo1.png",
        width: 1200,
        height: 630,
        alt: "Midnight — Cameroon Creator Discovery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Midnight — The Night is Yours.",
    description:
      "Cameroon's exclusive creator discovery platform. Browse verified creators in Douala, Yaoundé and beyond.",
    images: ["/Midnight-logo1.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side cookie check. When the visitor lacks the verification
  // cookie, we render the gate alongside the (still-rendered) page so the
  // gate can dismiss client-side after the server action sets the cookie.
  // Body content stays behind the gate but is visually + scroll-blocked.
  //
  // We also pull the auth state in this same pass so the global Navbar
  // can render the right CTA (LOGIN+JOIN vs DASHBOARD) without each page
  // having to repeat the session lookup.
  const [ageVerified, userId] = await Promise.all([
    isAgeVerified(),
    getCurrentUserId(),
  ]);
  const isLoggedIn = !!userId;

  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`
          ${cormorant.variable}
          ${dmSans.variable}
          ${dmMono.variable}
          font-sans min-h-screen
        `}
      >
        {/* Skip link — keyboard users only, surfaces on focus */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>

        <GlobalProviders>
          <Navbar isLoggedIn={isLoggedIn} />

          {/* Skip-link target. Uses div (not <main>) because individual
              pages render their own <main>; nesting two would be invalid HTML.
              tabIndex=-1 so the skip link can move focus here. */}
          <div id="main-content" tabIndex={-1} style={{ outline: "none" }}>
            {children}
          </div>
          <Footer />
        </GlobalProviders>

        {!ageVerified && <AgeGate />}
        <SpeedInsights />
      </body>
    </html>
  );
}
