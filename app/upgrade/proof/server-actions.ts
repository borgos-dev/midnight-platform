"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentCreatorProfile } from "@/app/lib/auth-helpers";

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP_NUMBER ?? "+237694456905";

// E.164-ish: optional leading +, 7–15 digits, no other characters
const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

export async function savePhoneAndOpenWhatsApp(phone: string) {
  const trimmed = (phone ?? "").trim();
  if (!PHONE_RE.test(trimmed)) {
    throw new Error("Invalid phone number. Use international format, e.g. +237...");
  }

  const creator = await getCurrentCreatorProfile();
  if (!creator) {
    throw new Error("Not authenticated");
  }

  const sub = await prisma.subscription.findFirst({
    where: {
      creatorProfileId: creator.id,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) {
    throw new Error("No pending subscription found.");
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { phoneNumber: trimmed },
  });

  // encodeURIComponent on every interpolated value — never raw user input
  const message = encodeURIComponent(
    `Hello Admin, I just paid for ${sub.plan}.\nPhone used: ${trimmed}\nI am sending my screenshot now.`
  );
  const adminDigits = ADMIN_WHATSAPP.replace(/[^0-9]/g, "");
  return `https://wa.me/${encodeURIComponent(adminDigits)}?text=${message}`;
}
