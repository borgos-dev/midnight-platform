// app/lib/auth.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function getCurrentCreator() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const creator = await prisma.creatorprofile.findUnique({
    where: {
      userId: Number(session.user.id),
    },
  });

  if (!creator) {
    throw new Error("Creator profile not found");
  }

  return creator;
}
