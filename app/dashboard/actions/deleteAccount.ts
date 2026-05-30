"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth-helpers";

export async function deleteAccount() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Soft delete + reserve the email so a banned user can't re-register.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        // Invalidate sessions on next request — the authorize() callback
        // rejects users with deletedAt set, but we also scramble the password
        // hash so any leaked credential can't ever log this account in.
        passwordHash: "deleted-account",
      },
    }),
    // Wipe any outstanding reset / verification tokens
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
  ]);

  redirect("/");
}
