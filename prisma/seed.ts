import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

/**
 * Read a required env var or throw — so production seeds never silently
 * use a placeholder password and so secrets stay out of source control.
 */
function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `Missing required env var ${name}. ` +
        `Seed aborted to avoid creating an account with a placeholder password.`
    );
  }
  return v;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run seed.ts in production");
  }

  // Clear old data (dev only)
  await prisma.postlike.deleteMany();
  await prisma.post.deleteMany();
  await prisma.media.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.creatorprofile.deleteMany();
  await prisma.user.deleteMany();

  // ── 1) Admin account — credentials from env, never hard-coded ──
  const adminEmail = requiredEnv("SEED_ADMIN_EMAIL");
  const adminPasswordRaw = requiredEnv("SEED_ADMIN_PASSWORD");
  const adminPassword = await bcrypt.hash(adminPasswordRaw, BCRYPT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase().trim(),
      passwordHash: adminPassword,
      name: "Super Admin",
      role: "ADMIN",
      emailVerified: true,
    },
  });

  // ── 2) Demo creator — credentials from env ──
  const userEmail = requiredEnv("SEED_USER_EMAIL");
  const userPasswordRaw = requiredEnv("SEED_USER_PASSWORD");
  const userPassword = await bcrypt.hash(userPasswordRaw, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: userEmail.toLowerCase().trim(),
      passwordHash: userPassword,
      name: "Luna",
      role: "CREATOR",
      emailVerified: true,
    },
  });

  const creator = await prisma.creatorprofile.create({
    data: {
      displayName: "Luna Sparks",
      bio: "Soft, classy and discreet",
      avatarUrl: "/creator1.jpg",
      location: "Douala",
      whatsappNumber: "+237600000000",
      tier: "VIP",
      status: "APPROVED",
      userId: user.id,
    },
  });

  await prisma.post.create({
    data: {
      creatorId: creator.id,
      title: "Late night mood",
      content: "You're watching but not touching",
    },
  });

  await prisma.post.create({
    data: {
      creatorId: creator.id,
      title: "Say hi",
      content: "Say hi on WhatsApp",
    },
  });

  console.log(`Seed complete — admin ${admin.email}, creator ${user.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
