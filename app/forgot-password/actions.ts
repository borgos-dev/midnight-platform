"use server";

import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/app/lib/tokens";
import { sendPasswordResetEmail } from "@/app/lib/email";
import { forgotPasswordLimiter, getIP } from "@/app/lib/rate-limit";

const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes — short-lived reset window

export async function requestPasswordReset(formData: FormData) {
  // Rate limit: 3 requests per 60 s per IP
  const ip = await getIP();
  const { success } = await forgotPasswordLimiter.limit(ip);
  if (!success) return { error: "Too many requests. Please try again later." };

  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!email) return { error: "Email is required." };

  // Always return success to prevent email enumeration
  const successMsg =
    "If an account with that email exists, a reset link has been sent.";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: successMsg };

  // Delete any existing tokens for this user (prevent accumulation)
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  // Generate + hash token
  const rawToken = generateToken();
  const hashedToken = hashToken(rawToken);

  // Store hashed token
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      hashedToken,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
    },
  });

  // Send email with raw token in link
  try {
    await sendPasswordResetEmail(email, rawToken);
  } catch {
    return { error: "Failed to send email. Please try again later." };
  }

  return { success: successMsg };
}
