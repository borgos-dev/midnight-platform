import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/app/components/legal/LegalPage";
import {
  COMPANY_NAME,
  COMPANY_LEGAL_NAME,
  COMPANY_JURISDICTION,
  SUPPORT_EMAIL,
} from "@/app/lib/legal";

export const metadata: Metadata = {
  title: `Terms of Service — ${COMPANY_NAME}`,
  description: `Terms governing the use of ${COMPANY_NAME}.`,
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These Terms govern your use of ${COMPANY_NAME} — please read them carefully. By using the platform you agree to be bound by them.`}
    >
      <h2>1. Eligibility</h2>
      <p>
        You must be at least <strong>18 years of age</strong> to access or use{" "}
        {COMPANY_NAME}. By creating an account or browsing the platform you
        represent and warrant that you are of legal age in your jurisdiction
        and that adult content is lawful where you reside.
      </p>
      <p>
        Accounts may be terminated without notice if we have reasonable
        grounds to believe an account holder is under 18, has misrepresented
        their identity, or has violated these Terms.
      </p>

      <h2>2. Account &amp; creator obligations</h2>
      <p>By creating a creator account on {COMPANY_NAME} you agree that:</p>
      <ul>
        <li>You are the sole person depicted in any photos or video you upload, or you possess written consent from every identifiable person.</li>
        <li>You will provide accurate identification when requested for verification.</li>
        <li>You will not impersonate another person, brand, or platform.</li>
        <li>One natural person may operate only one creator profile. Duplicate accounts may be merged or removed at our sole discretion.</li>
        <li>You retain ownership of content you upload but grant {COMPANY_NAME} a worldwide, royalty-free license to display it on the platform.</li>
      </ul>

      <h2>3. Prohibited content &amp; conduct</h2>
      <p>You may not upload, post, or solicit content that:</p>
      <ul>
        <li>Depicts or appears to depict a minor in any sexualized context.</li>
        <li>Depicts non-consensual acts, coercion, trafficking, or any form of exploitation.</li>
        <li>Promotes violence, hate, or discrimination on the basis of race, religion, gender, sexual orientation, or national origin.</li>
        <li>Infringes the intellectual property or privacy rights of any third party.</li>
        <li>Solicits goods or services that are illegal in your jurisdiction.</li>
      </ul>
      <p>
        We operate a <strong>zero-tolerance policy</strong> on trafficking and
        the exploitation of minors. Suspected violations are reported to the
        relevant authorities, with content preserved for investigation.
      </p>

      <h2>4. Off-platform contact (WhatsApp)</h2>
      <p>
        {COMPANY_NAME} facilitates discovery but does <strong>not</strong>{" "}
        broker, escrow, or guarantee any transaction. Once a visitor contacts
        a creator via WhatsApp or any other off-platform channel, the
        arrangement is solely between those two parties. We are not
        responsible for the conduct, safety, or outcome of any meeting,
        service, or payment that occurs off-platform.
      </p>

      <h2>5. Paid tiers &amp; subscriptions</h2>
      <p>
        Creators may upgrade to Premium, VIP, or VIP+ tiers via Mobile Money
        providers. Subscription fees are non-refundable except where required
        by law. Tier benefits — including visibility boosts and the spotlight
        shelf — are subject to change with reasonable notice.
      </p>

      <h2>6. Advertisements</h2>
      <p>
        The platform may display sponsored placements clearly labeled
        &quot;SPONSORED.&quot; Sponsored placements are subject to the same
        prohibited-content rules as any other content on the platform.
      </p>

      <h2>7. Termination</h2>
      <p>
        We may suspend or terminate any account at our discretion for breach
        of these Terms, suspected fraud, or to comply with the law. You may
        delete your own account at any time from your dashboard; deletion
        removes your profile from public view immediately and erases
        associated data within 30 days, subject to legal retention
        requirements.
      </p>

      <h2>8. Disclaimers &amp; liability</h2>
      <p>
        The platform is provided <strong>&quot;as is&quot;</strong>{" "}
        without warranties of any kind. To the maximum extent permitted by
        law, {COMPANY_LEGAL_NAME} shall not be liable for any indirect,
        incidental, consequential, or punitive damages arising from your use
        of the platform, including but not limited to interactions with
        other users on or off the platform.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These Terms are governed by the laws of {COMPANY_JURISDICTION}. Any
        disputes shall be resolved in the competent courts of{" "}
        {COMPANY_JURISDICTION}.
      </p>

      <h2>10. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be
        announced via a banner on the homepage and an email to registered
        users where applicable. Continued use of the platform after a change
        constitutes acceptance.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these Terms can be sent to{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. See also our{" "}
        <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/safety">Safety &amp; Reporting</Link> pages.
      </p>
    </LegalPage>
  );
}
