import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/app/lib/tokens";
import { sendVerificationEmail } from "@/app/lib/email";
import { signupLimiter, getIPFromRequest } from "@/app/lib/rate-limit";
import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "@/app/lib/passwords";
import { validateBirthDate } from "@/app/lib/age-validation";

const signUpSchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(2).max(80).optional()
  ),
  email: z.string().email().max(254),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
  // We let the dedicated `validateBirthDate` helper do age + future-date
  // checks below — Zod just guarantees the field arrives as a string.
  birthDate: z.string().min(1, "Birth date is required."),
});

export async function POST(req: Request) {
  try {
    const ip = getIPFromRequest(req);
    const { success } = await signupLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const form = await req.formData();

    const parsed = signUpSchema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      birthDate: form.get("birthDate"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, password } = parsed.data;
    const email = parsed.data.email.toLowerCase().trim();

    // 18+ gate — same validator the client uses, run authoritatively on the
    // server so a tampered form can't bypass the check.
    const birthDateCheck = validateBirthDate(parsed.data.birthDate);
    if (!birthDateCheck.ok) {
      return NextResponse.json(
        { ok: false, error: birthDateCheck.error },
        { status: 400 },
      );
    }

    const [existing, banned] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.bannedEmail.findUnique({ where: { email } }),
    ]);
    if (existing || banned) {
      // Generic message — do NOT confirm registration / ban status
      return NextResponse.json(
        { ok: false, error: "Unable to create account with that email." },
        { status: 409 }
      );
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
        // Birth date is captured here once and read-only from the profile
        // editor afterward. Admins can correct it via Prisma Studio /
        // the future /admin/creators tool if needed.
        birthDate: birthDateCheck.date,
      },
    });

    try {
      const rawToken = generateToken();
      const hashedToken = hashToken(rawToken);
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          hashedToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      });
      await sendVerificationEmail(email, rawToken);
    } catch (err) {
      // Don't echo provider errors to the client (account-enumeration risk),
      // but log the full reason server-side so a missing RESEND_API_KEY,
      // sandbox-recipient restriction, or bad FROM_EMAIL is obvious in dev.
      console.error("[signup] verification email failed:", err);
    }

    return NextResponse.json({
      ok: true,
      // Carry the email forward so the post-signup banner on /login can
      // power its "Resend verification" button without making the user
      // retype the address they just submitted.
      redirect: `/login?created=1&verify=1&email=${encodeURIComponent(email)}`,
    });
  } catch (err) {
    console.error("[signup] unexpected error");
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
