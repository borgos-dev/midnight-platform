"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getIP } from "@/app/lib/rate-limit";

// Categories the modal exposes — kept in sync with the Prisma enum so a
// crafted form value can't sneak through. Whitelisted on the server.
const ALLOWED_CATEGORIES = [
  "TRAFFICKING_OR_MINORS",
  "IMPERSONATION",
  "STOLEN_CONTENT",
  "HARASSMENT",
  "ILLEGAL_SERVICES",
  "OTHER",
] as const;

const REASON_MIN_LEN = 8;
const REASON_MAX_LEN = 2000;

// Salt used to one-way hash the reporter IP. We never store the raw IP —
// hashing it lets admins still spot dogpile patterns (same hash repeating)
// without us holding IPs verbatim if the column ever leaks.
const IP_SALT = process.env.REPORT_IP_SALT ?? "midnight-report-default-salt";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`${IP_SALT}:${ip}`).digest("hex");
}

/**
 * Submit a content report against a creator.
 *
 * Lives at `app/actions/submitReport.ts` (not inside /creator/[id]) so it
 * can be imported from anywhere we might surface a Report flow later —
 * e.g. a "Report this post" button on FeedPost.
 *
 * Behavior:
 *   - Anonymous visitors can submit (reporterUserId null).
 *   - Logged-in users are attributed so admins can see repeat reporters.
 *   - Reporter's IP is one-way hashed for dogpile detection without storing
 *     raw IPs.
 *   - Loose self-duplicate protection: if the same user (or same IP-hash)
 *     already filed a PENDING_REVIEW report against the same creator in
 *     the past hour, we acknowledge but skip creating a duplicate row.
 *   - Returns a discriminated union so the client can render the right
 *     thank-you / error state without throwing.
 */
export async function submitReport(input: {
  creatorprofileId: number;
  category: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // Whitelist + light validation
  if (
    !Number.isInteger(input.creatorprofileId) ||
    input.creatorprofileId <= 0
  ) {
    return { ok: false, error: "Invalid creator." };
  }
  const category = ALLOWED_CATEGORIES.includes(
    input.category as (typeof ALLOWED_CATEGORIES)[number],
  )
    ? (input.category as (typeof ALLOWED_CATEGORIES)[number])
    : "OTHER";

  const reason = (input.reason ?? "").trim().slice(0, REASON_MAX_LEN);
  if (reason.length < REASON_MIN_LEN) {
    return {
      ok: false,
      error: `Please describe what you saw in at least ${REASON_MIN_LEN} characters so we can investigate.`,
    };
  }

  // Confirm the target creator exists. Don't leak whether they're
  // approved / suspended — any existing row can be reported on.
  const target = await prisma.creatorprofile.findUnique({
    where: { id: input.creatorprofileId },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "That creator no longer exists." };

  // Reporter context
  const session = (await auth()) as { user?: { id?: string } } | null;
  const reporterUserId =
    session?.user?.id && /^\d+$/.test(session.user.id)
      ? Number(session.user.id)
      : null;
  const ip = await getIP();
  const ipHash = ip ? hashIp(ip) : null;

  // Soft self-dedupe: if the same user (or same anonymous IP-hash) has
  // already filed a still-pending report against this creator within the
  // last hour, we don't create another row. Admin sees one report per
  // session per creator, not a flood.
  const recentCutoff = new Date(Date.now() - 60 * 60 * 1000);
  const dupe = await prisma.report.findFirst({
    where: {
      creatorprofileId: target.id,
      status: "PENDING_REVIEW",
      createdAt: { gte: recentCutoff },
      OR: [
        reporterUserId ? { reporterUserId } : { id: -1 },
        ipHash ? { reporterIpHash: ipHash } : { id: -1 },
      ],
    },
    select: { id: true },
  });
  if (dupe) {
    return { ok: true };
  }

  await prisma.report.create({
    data: {
      creatorprofileId: target.id,
      reporterUserId,
      reason,
      category,
      reporterIpHash: ipHash,
    },
  });

  return { ok: true };
}
