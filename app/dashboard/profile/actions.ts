// app/dashboard/profile/actions.ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = Number(session.user.id);

  const displayName = (formData.get("displayName") as string)?.trim();
  const bio = (formData.get("bio") as string)?.trim() || null;
  const location = (formData.get("location") as string)?.trim() || null;
  const whatsappNumber =
    (formData.get("whatsappNumber") as string)?.trim() || null;

  if (!displayName || displayName.length < 2) {
    throw new Error("Display name must be at least 2 characters.");
  }

  // Handle avatar upload
  const avatarFile = formData.get("avatar") as File | null;
  let avatarUrl: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 5 * 1024 * 1024) {
      throw new Error("Avatar must be under 5MB.");
    }

    const bytes = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public/uploads/avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = avatarFile.name.split(".").pop() ?? "jpg";
    const fileName = `avatar-${userId}-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, fileName), buffer);

    avatarUrl = `/uploads/avatars/${fileName}`;
  }

  await prisma.creatorprofile.update({
    where: { userId },
    data: {
      displayName,
      bio,
      location,
      whatsappNumber,
      ...(avatarUrl ? { avatarUrl } : {}),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
}
