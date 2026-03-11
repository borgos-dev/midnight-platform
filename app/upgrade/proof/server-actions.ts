"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_WHATSAPP = "+237694456905"; // ← put your real admin number

export async function savePhoneAndOpenWhatsApp(phone: string) {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Not authenticated");
  }

  // find latest pending subscription
  const sub = await prisma.subscription.findFirst({
    where: {
      creatorProfile: {
        user: { email: session.user.email },
      },
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) {
    throw new Error("No pending subscription found.");
  }

  // save phone number
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { phoneNumber: phone },
  });

  // prefilled WhatsApp message
  const message = encodeURIComponent(
    `Hello Admin, I just paid for ${sub.plan}.\nPhone used: ${phone}\nI am sending my screenshot now.`
  );

  return `https://wa.me/${ADMIN_WHATSAPP}?text=${message}`;
}