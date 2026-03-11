import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const signUpSchema = z.object({
  name: z
    .preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().min(2).optional()),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const parsed = signUpSchema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ ok: false, error: "Email already used" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({ data: { name, email, passwordHash } });

    await prisma.creatorprofile.create({ data: { userId: user.id, displayName: name ?? "New Creator", tier: "REGULAR", status: "PENDING" } });

    return NextResponse.json({ ok: true, redirect: "/login?created=1" });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}