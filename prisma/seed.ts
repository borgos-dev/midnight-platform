import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear old data (safe in development)
  await prisma.postlike.deleteMany();
  await prisma.post.deleteMany();
  await prisma.media.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.creatorprofile.deleteMany();
  await prisma.user.deleteMany();

  // =============================
  // 1️⃣ CREATE ADMIN ACCOUNT
  // =============================
  const adminPassword = await bcrypt.hash("@#$247Jr", 10);

  const admin = await prisma.user.create({
    data: {
      email: "midnightworldplatform@gmail.com",
      passwordHash: adminPassword,
      name: "Super Admin",
      role: "ADMIN",
    },
  });

  console.log("👑 Admin created:", admin.email);

  // =============================
  // 2️⃣ CREATE DEMO CREATOR
  // =============================
  const userPassword = await bcrypt.hash("password123", 10);

  const user = await prisma.user.create({
    data: {
      email: "luna@example.com",
      passwordHash: userPassword,
      name: "Luna",
      role: "CREATOR",
    },
  });

  const creator = await prisma.creatorprofile.create({
    data: {
      displayName: "Luna Sparks",
      bio: "Soft, classy and discreet ✨",
      avatarUrl: "/creator1.jpg",
      location: "Douala",
      whatsappNumber: "237600000000",
      tier: "VIP",
      status: "APPROVED",
      userId: user.id,
    },
  });

  // =============================
  // 3️⃣ CREATE POSTS
  // =============================
  const post1 = await prisma.post.create({
    data: {
      creatorId: creator.id,
      title: "Late night mood",
      content: "You're watching but not touching 😌",
    },
  });

  const post2 = await prisma.post.create({
    data: {
      creatorId: creator.id,
      title: "Say hi",
      content: "Say hi on WhatsApp 💋",
    },
  });

  console.log("✅ Seed complete");
  console.log("Creator:", creator.displayName);
  console.log("Posts created:", [post1.title, post2.title]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });