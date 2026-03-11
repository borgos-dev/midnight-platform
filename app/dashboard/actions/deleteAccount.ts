"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function deleteAccount() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const userId = Number(session.user.id);

  // Double check user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Delete user (creatorprofile cascades automatically)
  await prisma.user.delete({
    where: { id: userId },
  });

  // Redirect to homepage after deletion
  redirect("/");
}