// Centralized constants for legal pages, footer, and reporting flows.
// Update these when company details change so we don't grep the codebase.

export const COMPANY_NAME = "Midnight";
export const COMPANY_LEGAL_NAME = "Midnight"; // TODO: replace with registered entity after incorporation
export const COMPANY_JURISDICTION = "Cameroon";
export const COMPANY_CITY = "Douala, Cameroon";

// Effective date for current legal documents. Bump whenever Terms / Privacy
// receive a substantive change.
export const LEGAL_EFFECTIVE_DATE = "2026-05-23";

// Reporting + support emails. Use placeholder addresses for development —
// swap to real addresses on the verified production domain before launch.
export const REPORT_EMAIL = "report@midnight.cm";
export const SUPPORT_EMAIL = "support@midnight.cm";
export const PRIVACY_EMAIL = "privacy@midnight.cm";

/**
 * Build a `mailto:` link for reporting a creator profile. The subject and
 * body are pre-filled so the report lands in the inbox already structured.
 * Keeps URL length manageable so the user's mail client (Gmail web,
 * Outlook, etc.) doesn't truncate.
 */
export function buildReportMailto(creatorId: number, creatorName?: string): string {
  const subject = `Report creator #${creatorId}${creatorName ? ` (${creatorName})` : ""}`;
  const lines = [
    `I'd like to report the following creator profile on Midnight:`,
    ``,
    `Creator ID: ${creatorId}`,
    creatorName ? `Display name: ${creatorName}` : null,
    `URL: https://midnight.cm/creator/${creatorId}`,
    ``,
    `Reason (please describe what you observed):`,
    ``,
    `---`,
    `Midnight safety policy: https://midnight.cm/safety`,
  ].filter(Boolean);
  const body = lines.join("\n");
  const params = new URLSearchParams({ subject, body });
  return `mailto:${REPORT_EMAIL}?${params.toString()}`;
}
