"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentCreatorProfile } from "@/app/lib/auth-helpers";

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP_NUMBER ?? "+237694456905";

// E.164-ish: optional leading +, 7–15 digits, no other characters.
const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

/**
 * Step 2 of the boost flow. The creator enters the MoMo phone number they
 * paid from; we save it on the open Boost row, mark it PENDING_REVIEW, and
 * return a wa.me link that pre-fills a message to the admin. The admin
 * then approves the boost via /admin/boosts.
 *
 * Mirrors `/upgrade/proof/server-actions.ts` so the two flows behave the
 * same way for creators and admins.
 */
export async function saveBoostPhoneAndOpenWhatsApp(phone: string): Promise<string> {
  const trimmed = (phone ?? "").trim();
  if (!PHONE_RE.test(trimmed)) {
    throw new Error("Invalid phone number. Use international format, e.g. +237...");
  }

  const creator = await getCurrentCreatorProfile();
  if (!creator) throw new Error("Not authenticated");

  // Match the most recent pre-proof boost. PENDING_REVIEW resubmissions
  // are allowed in case the creator typoed their first phone number.
  const boost = await prisma.boost.findFirst({
    where: {
      creatorprofileId: creator.id,
      status: { in: ["PENDING_PAYMENT", "PENDING_REVIEW"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!boost) {
    throw new Error("No pending boost found.");
  }

  await prisma.boost.update({
    where: { id: boost.id },
    data: { phoneNumber: trimmed, status: "PENDING_REVIEW" },
  });

  // encodeURIComponent on every interpolated value — never raw user input.
  const providerLabel =
    boost.provider === "MTN_MOMO" ? "MTN MoMo" : "Orange Money";
  const message = encodeURIComponent(
    `Hello Admin, I just paid for a ${boost.durationDays}-day BOOST` +
      ` (${boost.amountCfa} CFA via ${providerLabel}).\n` +
      `Phone used: ${trimmed}\n` +
      `I am sending my screenshot now.`,
  );
  const adminDigits = ADMIN_WHATSAPP.replace(/[^0-9]/g, "");
  return `https://wa.me/${encodeURIComponent(adminDigits)}?text=${message}`;
}
