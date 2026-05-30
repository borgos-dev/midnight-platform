/**
 * Demo seed for the BOOSTED homepage band.
 *
 * Standalone from `seed.ts` so it doesn't wipe your existing data. Run it
 * with `npm run prisma:seed:boosts`. Idempotent — running twice doesn't
 * create duplicate creators or stack boosts; existing ACTIVE boosts on
 * a demo creator are left alone so you can adjust dates manually if
 * you're debugging the lifecycle.
 *
 * What it creates:
 *   - 5 demo REGULAR-tier APPROVED creators across Douala / Yaoundé /
 *     Bafoussam so the band shows regardless of which city the auto-detector
 *     picks for your dev session.
 *   - 1 ACTIVE Boost per demo creator, endsAt = now + 7 days, so the
 *     query in page.tsx (status === "ACTIVE" AND endsAt > now) returns
 *     them immediately.
 *
 * Demo creators all share one bcrypt-hashed password ("boost-demo-2024")
 * so you can log in as them if needed. They never need to log in for the
 * BOOSTED band to render — that's a server-side query.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

// Spread across cities so the band shows regardless of which city the
// IP-geolocation picks for your dev session. Bonanjo/Bastos/Bonapriso etc.
// are real neighborhoods in those cities — matches the visual vocabulary
// of the CreatorTile location row ("Bonanjo, Douala").
const DEMO_BOOSTED = [
  { name: "Sophia",  city: "Douala",    neighborhood: "Bonanjo",     age: 24 },
  { name: "Aïcha",   city: "Yaoundé",   neighborhood: "Bastos",      age: 26 },
  { name: "Yara",    city: "Douala",    neighborhood: "Bonapriso",   age: 23 },
  { name: "Léa",     city: "Yaoundé",   neighborhood: "Mvog-Mbi",    age: 27 },
  { name: "Nadia",   city: "Bafoussam", neighborhood: "Centre",      age: 25 },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run seed-boosts.ts in production");
  }

  console.log("Seeding BOOSTED demo data...");

  const demoPasswordHash = await bcrypt.hash("boost-demo-2024", BCRYPT_ROUNDS);
  const now = new Date();
  const sevenDaysOut = new Date(Date.now() + 7 * 86_400_000);

  let creatorsTouched = 0;
  let boostsCreated = 0;
  let boostsSkipped = 0;

  for (const demo of DEMO_BOOSTED) {
    const email = `boost-demo-${demo.name.toLowerCase().replace(/[^a-z]/g, "")}@midnight.local`;

    // Upsert user — keep the password fresh on re-runs in case BCRYPT_ROUNDS
    // changed, but never overwrite an emailVerified=true flag.
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: demoPasswordHash },
      create: {
        email,
        passwordHash: demoPasswordHash,
        name: demo.name,
        role: "CREATOR",
        emailVerified: true,
      },
    });

    // Upsert creator profile — REGULAR tier (boost is REGULAR-only by
    // product design). The previous version of this script also wrote a
    // random profileViewsMonth number directly to the column. That column
    // has been dropped — views are computed from AnalyticsEvent now — so
    // we seed a handful of view events further below instead. Honest
    // demo data, exercises the real read path.
    const creator = await prisma.creatorprofile.upsert({
      where: { userId: user.id },
      update: {
        status: "APPROVED",
        tier: "REGULAR",
        location: demo.city,
        neighborhood: demo.neighborhood,
      },
      create: {
        userId: user.id,
        displayName: demo.name,
        bio: `${demo.name} — demo boosted creator`,
        location: demo.city,
        neighborhood: demo.neighborhood,
        // birthDate set so computeAge() in creator-shape.ts returns the
        // age that shows next to the name in CreatorTile.
        birthDate: new Date(now.getUTCFullYear() - demo.age, 0, 1),
        whatsappNumber: "+237600000000",
        tier: "REGULAR",
        status: "APPROVED",
        verified: true,
      },
    });
    creatorsTouched++;

    // Seed a small batch of profile_view AnalyticsEvent rows spread over
    // the last 30 days so the card shows non-zero eye-icon stats and the
    // creator appears in monthly-view sorts. 50–250 events per demo
    // creator — under the rough threshold that would land them in TOP 3,
    // so the boost demo doesn't accidentally hijack the trending podium.
    await prisma.analyticsEvent.deleteMany({
      where: {
        creatorId: creator.id,
        source: { startsWith: "seed-boost:" },
      },
    });
    const viewCount = Math.floor(Math.random() * 200) + 50;
    const eventRows: { creatorId: number; eventType: string; source: string; createdAt: Date }[] = [];
    const thirtyDaysMs = 30 * 86_400_000;
    for (let i = 0; i < viewCount; i++) {
      const r = Math.random();
      const offsetMs = Math.pow(r, 3) * thirtyDaysMs;
      eventRows.push({
        creatorId: creator.id,
        eventType: "profile_view",
        source: `seed-boost:${creator.id}:${i}`,
        createdAt: new Date(Date.now() - offsetMs),
      });
    }
    if (eventRows.length > 0) {
      await prisma.analyticsEvent.createMany({ data: eventRows });
    }

    // Skip if an active boost already covers this creator — lets you
    // re-run the script to add new demo creators without disturbing
    // existing boost flight windows.
    const existing = await prisma.boost.findFirst({
      where: {
        creatorprofileId: creator.id,
        status: "ACTIVE",
        endsAt: { gt: now },
      },
    });

    if (existing) {
      boostsSkipped++;
      continue;
    }

    await prisma.boost.create({
      data: {
        creatorprofileId: creator.id,
        durationDays: 7,
        amountCfa: 2500,
        provider: "MTN_MOMO",
        status: "ACTIVE",
        phoneNumber: "+237600000000",
        startsAt: now,
        endsAt: sevenDaysOut,
      },
    });
    boostsCreated++;
  }

  console.log(
    `✓ BOOSTED demo seed complete:\n` +
      `  - ${creatorsTouched} demo Regular creators upserted\n` +
      `  - ${boostsCreated} new ACTIVE boosts created\n` +
      `  - ${boostsSkipped} creators already had an active boost (left alone)\n` +
      `\nVisit / and the BOOSTED band should appear between TOP 3 and VIP+ SPOTLIGHT.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Boost seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
