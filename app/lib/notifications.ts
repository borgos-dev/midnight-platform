import { prisma } from "@/lib/prisma";

type NotificationType =
  | "profile_view"
  | "whatsapp_click"
  | "new_subscriber"
  | "subscription_expiring";

const messages: Record<NotificationType, (meta?: string) => string> = {
  profile_view: (city) =>
    city
      ? `Someone from ${city} viewed your profile`
      : "Someone viewed your profile",
  whatsapp_click: (city) =>
    city
      ? `A visitor from ${city} clicked your WhatsApp`
      : "A visitor clicked your WhatsApp",
  new_subscriber: (plan) =>
    plan
      ? `You have a new ${plan} subscriber`
      : "You have a new subscriber",
  subscription_expiring: () =>
    "Your VIP subscription expires in 3 days — renew to keep your benefits",
};

export async function createNotification(
  creatorId: number,
  type: NotificationType,
  meta?: string
) {
  try {
    const message = messages[type](meta);

    await prisma.notification.create({
      data: {
        creatorId,
        type,
        message,
      },
    });
  } catch (error) {
    // Never let notification creation break the main flow
    console.error("Failed to create notification:", error);
  }
}