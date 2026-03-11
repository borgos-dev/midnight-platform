"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { approveSubscriptionById } from "./approveSubscription";

export async function approveSubscription(formData: FormData) {
  const session = (await auth()) as {
      user?: {
        id?: string;
        role?: string;
        email?: string;
        name?: string;
      };
    };

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const id = Number(formData.get("subscriptionId"));
  if (!id) throw new Error("Invalid subscription ID");

  await approveSubscriptionById(id);

  revalidatePath("/admin/subscriptions");
}