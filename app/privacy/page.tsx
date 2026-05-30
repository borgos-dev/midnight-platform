import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/app/components/legal/LegalPage";
import {
  COMPANY_NAME,
  COMPANY_JURISDICTION,
  PRIVACY_EMAIL,
} from "@/app/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy — ${COMPANY_NAME}`,
  description: `How ${COMPANY_NAME} collects, uses, and protects your data.`,
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`This Privacy Policy explains what information ${COMPANY_NAME} collects, why we collect it, and how you control it.`}
    >
      <h2>1. Visitor privacy (no account)</h2>
      <p>
        Visitors can browse {COMPANY_NAME} without creating an account. When
        you visit the platform anonymously we record only the minimum needed
        to render the site and to compute aggregate counts (e.g. a creator&apos;s
        monthly profile-view total):
      </p>
      <ul>
        <li>An IP address (used to detect your nearest city, then discarded — see below)</li>
        <li>A randomly-generated anonymous session identifier</li>
        <li>Page-view timestamps</li>
        <li>An age-verification cookie that records your 18+ confirmation for 30 days</li>
      </ul>
      <p>
        We do <strong>not</strong> place advertising trackers, social-media
        pixels, or any third-party fingerprinting code on visitor pages.
      </p>

      <h2>2. IP-based city detection</h2>
      <p>
        On your first visit we may call a geolocation provider to convert
        your IP address to a city name. Only the city name is stored (in a
        cookie on your device). Your IP address itself is not retained by us
        once the lookup completes.
      </p>

      <h2>3. Account data (creators &amp; admins)</h2>
      <p>When you create an account we store:</p>
      <ul>
        <li>Email address and a securely hashed password</li>
        <li>Display name, bio, avatar, city, neighborhood, age (birth date), and tier</li>
        <li>WhatsApp number, if provided</li>
        <li>Any media you upload (photos, video)</li>
        <li>Subscription status and payment-provider transaction references (we never see card or Mobile Money credentials)</li>
      </ul>

      <h2>4. Verification data</h2>
      <p>
        If you submit identity documents for verification, those documents
        are reviewed by our team and then permanently deleted within 30 days
        of the decision. We retain only a boolean flag indicating that
        verification was completed and the date.
      </p>

      <h2>5. How we use your data</h2>
      <ul>
        <li>To render your profile and let visitors discover it</li>
        <li>To compute your dashboard analytics</li>
        <li>To process subscription payments and tier upgrades</li>
        <li>To prevent fraud, abuse, and trafficking</li>
        <li>To respond when you contact us</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your personal data. We do not
        share account data with advertisers. We share data with third parties
        only as described in section 6.
      </p>

      <h2>6. Third parties we use</h2>
      <ul>
        <li><strong>Cloudinary</strong> — image and video hosting</li>
        <li><strong>Mobile Money providers (MTN, Orange)</strong> — subscription payment processing</li>
        <li><strong>Email delivery provider</strong> — transactional emails (verification, receipts)</li>
        <li><strong>Geolocation provider</strong> — IP-to-city lookup on first visit</li>
      </ul>

      <h2>7. Cookies</h2>
      <ul>
        <li><code>mn_age_verified</code> — your 18+ confirmation, kept 30 days</li>
        <li><code>mn_city</code> — detected city, kept 30 days</li>
        <li>Session cookie — keeps you logged in, deleted when you sign out</li>
      </ul>

      <h2>8. Your rights</h2>
      <p>You may at any time:</p>
      <ul>
        <li>Access and edit your profile data from your dashboard</li>
        <li>Delete individual posts or media</li>
        <li>Delete your account entirely — this removes your public profile within minutes and erases account data within 30 days, subject to any legal retention requirements</li>
        <li>Request a copy of your data by emailing <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a></li>
      </ul>

      <h2>9. Data retention</h2>
      <p>
        Active account data is kept for as long as your account exists.
        Deleted-account data is permanently removed within 30 days, except
        where retention is required by law (for example, payment records
        retained for tax purposes).
      </p>

      <h2>10. Children</h2>
      <p>
        {COMPANY_NAME} is strictly for users aged 18 or older. We do not
        knowingly collect data from anyone under 18. If we discover such
        data we delete it immediately and terminate the associated account.
      </p>

      <h2>11. International data &amp; jurisdiction</h2>
      <p>
        Data may be processed on infrastructure located outside{" "}
        {COMPANY_JURISDICTION}. We choose providers with strong security
        practices and contractual data-protection terms.
      </p>

      <h2>12. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. Material changes will
        be announced via a banner on the homepage and an email to registered
        users where applicable.
      </p>

      <h2>13. Contact</h2>
      <p>
        Privacy questions and data-access requests can be sent to{" "}
        <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. See also our{" "}
        <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/safety">Safety &amp; Reporting</Link> pages.
      </p>
    </LegalPage>
  );
}
