"use server";

import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/app/lib/tokens";
import { sendVerificationEmail } from "@/app/lib/email";
import { resendVerificationLimiter, getIP } from "@/app/lib/rate-limit";

export async function verifyEmail(rawToken: string) {
  if (!rawToken) return { error: "Missing verification token." };

  const hashedToken = hashToken(rawToken);

  const tokenRecord = await prisma.emailVerificationToken.findFirst({
    where: { hashedToken },
  });

  if (!tokenRecord) return { error: "Invalid or expired verification link." };

  // Check expiry
  if (tokenRecord.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({
      where: { id: tokenRecord.id },
    });
    return { error: "Verification link has expired. Please sign up again." };
  }

  // Mark user as verified + delete token (prevent reuse)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.delete({ where: { id: tokenRecord.id } }),
  ]);

  return { success: "Email verified successfully! You can now log in." };
}

/**
 * Resends the verification email for the given address. Designed so callers
 * can safely surface it to unauthenticated users (signup landing, login
 * banner) AND to logged-in users (dashboard banner) without leaking which
 * emails exist in the database.
 *
 * Behavior:
 *   - Rate-limited per IP so the action can't be turned into a spam relay.
 *   - Returns the same `success` payload for "user not found", "user already
 *     verified", and "email actually sent" — so an attacker can't enumerate
 *     accounts by watching the response.
 *   - Wipes any pending tokens for the user before issuing a fresh one so
 *     re-clicking older email links fails cleanly after a resend.
 *   - 24-hour token expiry, matching the signup-time policy.
 */
export async function resendVerificationEmail(
  emailRaw: string,
): Promise<{ success?: string; error?: string }> {
  // Rate limit BEFORE any DB work so a flood can't pin Postgres.
  const ip = await getIP();
  const { success: allowed } = await resendVerificationLimiter.limit(ip);
  if (!allowed) {
    return {
      error: "Too many requests. Please wait a few minutes and try again.",
    };
  }

  // Light input validation — Zod would be overkill here, the only thing that
  // matters is preventing a giant string from hitting the DB.
  const email =
    typeof emailRaw === "string"
      ? emailRaw.toLowerCase().trim().slice(0, 254)
      : "";
  if (!email || !email.includes("@")) {
    return { success: "If that email is registered, a new link is on its way." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });

  // Don't reveal whether the email exists — always return the same success.
  // We just skip the actual send when there's no work to do.
  if (!user || user.emailVerified) {
    return { success: "If that email is registered, a new link is on its way." };
  }

  const rawToken = generateToken();
  const hashedToken = hashToken(rawToken);

  // Wipe old tokens so the previous email's link stops working — prevents
  // confusion when the user clicks an older email by mistake after resending.
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
    prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        hashedToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  try {
    await sendVerificationEmail(email, rawToken);
  } catch (err) {
    // Don't leak provider errors to the client; the rate-limited generic
    // success path is fine even on send failure since the user can retry.
    console.error("[resend-verify] email send failed:", err);
  }

  return { success: "If that email is registered, a new link is on its way." };
}
