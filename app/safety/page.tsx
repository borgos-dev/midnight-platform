import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/app/components/legal/LegalPage";
import { COMPANY_NAME, REPORT_EMAIL } from "@/app/lib/legal";

export const metadata: Metadata = {
  title: `Safety & Reporting — ${COMPANY_NAME}`,
  description: `How ${COMPANY_NAME} protects users and how to report harmful content.`,
  robots: { index: true, follow: true },
};

export default function SafetyPage() {
  return (
    <LegalPage
      title="Safety & Reporting"
      intro={`${COMPANY_NAME} exists to help adult creators be discovered. Anything that exploits, coerces, or endangers anyone has no place here — and we want your help keeping it that way.`}
    >
      <h2>Zero tolerance</h2>
      <p>
        We do not tolerate, under any circumstances:
      </p>
      <ul>
        <li>Any content depicting or appearing to depict a minor.</li>
        <li>Trafficking, coercion, or any non-consensual act.</li>
        <li>Threats, harassment, doxxing, or incitement of violence.</li>
        <li>Impersonation of another person or organization.</li>
        <li>Sale or solicitation of activity that is illegal in your jurisdiction.</li>
      </ul>
      <p>
        Accounts found to violate these rules are removed immediately and,
        where appropriate, reported to law enforcement.
      </p>

      <h2>How to report a profile</h2>
      <p>
        Every creator profile has a <strong>Report</strong> button next to
        the share controls. Tapping it opens your email client with a
        pre-filled message addressed to{" "}
        <a href={`mailto:${REPORT_EMAIL}`}>{REPORT_EMAIL}</a>. Please include
        anything you noticed — screenshots help.
      </p>
      <p>
        If you can&apos;t use the in-profile button, email us directly at{" "}
        <a href={`mailto:${REPORT_EMAIL}`}>{REPORT_EMAIL}</a> with:
      </p>
      <ul>
        <li>The creator&apos;s profile URL or ID</li>
        <li>What you observed</li>
        <li>Any supporting context (screenshots, dates)</li>
      </ul>

      <h2>What happens after you report</h2>
      <ol>
        <li>Our safety team reviews the report within 24 hours.</li>
        <li>If the profile clearly violates our rules it&apos;s removed immediately, and the account is suspended.</li>
        <li>If the report concerns a minor or trafficking, we preserve evidence and contact the relevant authorities.</li>
        <li>If we need more information from you we&apos;ll reach out via the email you used to report.</li>
      </ol>
      <p>
        Reporters remain anonymous to the reported creator. We never disclose
        who reported a profile.
      </p>

      <h2>Off-platform safety reminders</h2>
      <p>
        {COMPANY_NAME} facilitates discovery but does not broker, escrow, or
        guarantee any transaction. If you choose to meet a creator off-platform:
      </p>
      <ul>
        <li>Verify identity before sending money or meeting in person.</li>
        <li>Agree on terms in writing on WhatsApp before any deposit.</li>
        <li>Tell a trusted friend where and when you&apos;ll be.</li>
        <li>Use public meeting places for any first encounter.</li>
        <li>Never share government IDs, banking credentials, or passwords.</li>
      </ul>
      <p>
        See our <Link href="/terms">Terms of Service</Link> for the full
        rules and our <Link href="/privacy">Privacy Policy</Link> for how
        report data is handled.
      </p>
    </LegalPage>
  );
}
