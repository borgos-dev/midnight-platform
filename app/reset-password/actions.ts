"use server";

import { prisma } from "@/lib/prisma";
import { hashToken } from "@/app/lib/tokens";
import { resetPasswordLimiter, getIP } from "@/app/lib/rate-limit";
import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  isStrongEnough,
} from "@/app/lib/passwords";

export async function resetPassword(formData: FormData) {
  const ip = await getIP();
  const { success } = await resetPasswordLimiter.limit(ip);
  if (!success) return { error: "Too many requests. Please try again later." };

  const rawToken = (formData.get("token") as string)?.trim();
  const password = (formData.get("password") as string) ?? "";
  const confirmPassword = (formData.get("confirmPassword") as string) ?? "";

  if (!rawToken) return { error: "Invalid or missing token." };

  const strengthError = isStrongEnough(password);
  if (strengthError) return { error: strengthError };
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }
  // Reference MIN_PASSWORD_LENGTH to surface if helper changes
  void MIN_PASSWORD_LENGTH;

  const hashedToken = hashToken(rawToken);

  const tokenRecord = await prisma.passwordResetToken.findFirst({
    where: { hashedToken },
  });

  if (!tokenRecord) return { error: "Invalid or expired reset link." };

  if (tokenRecord.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } });
    return { error: "Reset link has expired. Please request a new one." };
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash },
    }),
    // Single-use enforcement: delete this specific token
    prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } }),
    // Belt-and-braces: invalidate any other outstanding reset tokens for this user
    prisma.passwordResetToken.deleteMany({
      where: { userId: tokenRecord.userId },
    }),
  ]);

  return { success: "Password reset successfully. You can now log in." };
}
