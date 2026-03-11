"use server";

import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const signUpSchema = z.object({
  name: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().min(2).optional()
    ),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function createCreatorAccount(
  _prevState: string | undefined,
  formData: FormData
) {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  const { name, email, password } = parsed.data;

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "Email already used. Please login instead.";

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  // 🔥 AUTO-CREATE CREATOR PROFILE
  await prisma.creatorprofile.create({
    data: {
      userId: user.id,
      displayName: name ?? "New Creator",
      tier: "REGULAR",
      status: "PENDING",
    },
  });

  // Redirect to dashboard
  redirect("/dashboard");
}
