import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: "threesome",  label: "Threesome",  displayOrder: 1 },
  { slug: "anal",       label: "Anal",       displayOrder: 2 },
  { slug: "couple",     label: "Couple",     displayOrder: 3 },
  { slug: "bdsm",       label: "BDSM",       displayOrder: 4 },
  { slug: "roleplay",   label: "Roleplay",   displayOrder: 5 },
  { slug: "massage",    label: "Massage",    displayOrder: 6 },
  { slug: "escort",     label: "Escort",     displayOrder: 7 },
  { slug: "webcam",     label: "Webcam",     displayOrder: 8 },
  { slug: "companion",  label: "Companion",  displayOrder: 9 },
];

async function main() {
  console.log("Seeding categories...");
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { label: cat.label, displayOrder: cat.displayOrder },
      create: cat,
    });
    console.log(`  ✓ ${cat.label}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
