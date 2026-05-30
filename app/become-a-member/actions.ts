"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { generateToken, hashToken } from "@/app/lib/tokens";
import { sendVerificationEmail } from "@/app/lib/email";
import { signupLimiter, getIP } from "@/app/lib/rate-limit";
import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "@/app/lib/passwords";

const signUpSchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(2).max(80).optional()
  ),
  email: z.string().email().max(254),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});

export async function createCreatorAccount(
  _prevState: string | undefined,
  formData: FormData
) {
  const ip = await getIP();
  const { success } = await signupLimiter.limit(ip);
  if (!success) return "Too many requests. Please try again later.";

  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  const [existing, banned] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.bannedEmail.findUnique({ where: { email } }),
  ]);
  if (existing || banned) {
    // Generic message — no email enumeration, no ban disclosure
    return "Unable to create account with that email.";
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  await prisma.creatorprofile.create({
    data: {
      userId: user.id,
      displayName: name ?? "New Creator",
      tier: "REGULAR",
      status: "PENDING",
    },
  });

  try {
    const rawToken = generateToken();
    const hashedToken = hashToken(rawToken);
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        hashedToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    await sendVerificationEmail(email, rawToken);
  } catch (err) {
    console.error("[signup-action] verification email failed");
  }

  redirect("/dashboard");
}
